import { getBoveda } from './boveda';
import { getVerticalAdn } from './adn/loader';
import { synthesizeBrandDirectives } from './memory/compressor';
import { runCopyAgent } from './agents/copy';
import { runArtAgent } from './agents/arte';
import { renderGraphicAndUpload } from './render/client';
import { getSupabaseServerClient, supabase } from './supabase';
import { PipelineResult } from './types';

// Generar Concepto en Texto (Etapa 1 del Flujo en 2 Etapas)
export async function generateConceptText(params: {
  tenantId: string;
  pedido?: string;
  tipo?: string;
  token?: string;
}) {
  const boveda = await getBoveda(params.tenantId, params.token);
  const directivas = await synthesizeBrandDirectives(boveda.aprendizaje);

  let vertical = boveda.vertical || 'veterinaria';
  const adn = getVerticalAdn(vertical, params.tipo || 'educativo');

  const copy = await runCopyAgent({
    adn,
    identidad: boveda.identidad,
    directivas,
    pedido: params.pedido,
    tipo: params.tipo || 'educativo'
  });

  return {
    concepto: `${copy.titulo}: ${copy.subtitulo}`,
    copy,
    tipo: params.tipo || 'educativo'
  };
}

// Ejecutar Diseño y Renderizado Asíncrono (Etapa 2 del Flujo en 2 Etapas)
export async function processPieceDesignAsync(params: {
  piezaId: string;
  tenantId: string;
  token?: string;
}) {
  const client = params.token ? getSupabaseServerClient(params.token) : supabase;

  // 1. Obtener fila de la pieza y Bóveda
  const { data: pieza, error: piezaErr } = await client
    .from('piezas')
    .select('*')
    .eq('id', params.piezaId)
    .single();

  if (piezaErr || !pieza) {
    throw new Error(`Pieza ${params.piezaId} no encontrada`);
  }

  const boveda = await getBoveda(params.tenantId, params.token);
  const directivas = await synthesizeBrandDirectives(boveda.aprendizaje);

  let vertical = boveda.vertical || 'veterinaria';
  const tipo = pieza.tipo || 'educativo';
  const adn = getVerticalAdn(vertical, tipo);

  // 2. Si no tenía copy generado, llamar Agente Copy
  let copyJSON = pieza.copy_json;
  if (!copyJSON || !copyJSON.titulo) {
    copyJSON = await runCopyAgent({
      adn,
      identidad: boveda.identidad,
      directivas,
      pedido: pieza.pedido || pieza.concepto,
      concepto: pieza.concepto,
      tipo
    });
  }

  // 3. Llamar Agente Arte
  const artJSON = await runArtAgent({
    adn,
    identidad: boveda.identidad,
    directivas,
    copy: copyJSON,
    tipo
  });

  // 4. Intentar delegar el renderizado asíncrono directamente al worker de Railway (Railway actualiza DB y Storage sin timeout en Vercel)
  const { triggerRailwayAsyncRender } = await import('./render/client');
  const triggered = await triggerRailwayAsyncRender({
    piezaId: params.piezaId,
    tenantId: params.tenantId,
    vertical,
    art: artJSON,
    copy: copyJSON,
    identidad: boveda.identidad
  });

  if (triggered) {
    // Railway asumió la tarea y actualizará la DB a 'disenada' cuando termine
    await client
      .from('piezas')
      .update({ copy_json: copyJSON, arte_json: artJSON })
      .eq('id', params.piezaId);

    return { pieza_id: params.piezaId, status: 'processing_in_railway' };
  }

  // Fallback local/directo si Railway no está disponible
  const cdnUrl = await renderGraphicAndUpload({
    piezaId: params.piezaId,
    tenantId: params.tenantId,
    vertical,
    art: artJSON,
    copy: copyJSON,
    identidad: boveda.identidad,
    token: params.token
  });

  await client
    .from('piezas')
    .update({
      copy_json: copyJSON,
      arte_json: artJSON,
      imagen_url: cdnUrl,
      estado: 'disenada'
    })
    .eq('id', params.piezaId);

  return {
    pieza_id: params.piezaId,
    imagen_url: cdnUrl,
    copy: copyJSON,
    art: artJSON
  };
}

// Orquestador Principal (Compatibilidad del Pipeline)
export async function runPipeline(tenantId: string, pedido: string, token?: string): Promise<PipelineResult> {
  const boveda = await getBoveda(tenantId, token);
  const directivas = await synthesizeBrandDirectives(boveda.aprendizaje);

  let vertical = boveda.vertical || 'veterinaria';
  const adn = getVerticalAdn(vertical, 'educativo');

  const copyJSON = await runCopyAgent({
    adn,
    identidad: boveda.identidad,
    directivas,
    pedido,
    tipo: 'educativo'
  });

  const artJSON = await runArtAgent({
    adn,
    identidad: boveda.identidad,
    directivas,
    copy: copyJSON,
    tipo: 'educativo'
  });

  const tempPieceId = crypto.randomUUID();
  const cdnUrl = await renderGraphicAndUpload({
    piezaId: tempPieceId,
    tenantId,
    vertical,
    art: artJSON,
    copy: copyJSON,
    identidad: boveda.identidad,
    token
  });

  return {
    png_url: cdnUrl,
    copy: copyJSON,
    art: artJSON,
    caption: copyJSON.caption
  };
}
