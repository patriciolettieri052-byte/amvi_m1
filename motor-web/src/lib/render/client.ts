import { supabase, getSupabaseServerClient } from '../supabase';
import { ArtResponse, CopyResponse } from '../types';

export function runBackgroundJob(taskPromise: Promise<any>) {
  try {
    const { waitUntil } = require('@vercel/functions');
    waitUntil(taskPromise);
  } catch (e) {
    taskPromise.catch((err) => console.error('Error en tarea en segundo plano:', err));
  }
}

// Disparar Renderizado Asíncrono en Railway (Railway asume la renderización, subida a Storage y actualización de la DB)
export async function triggerRailwayAsyncRender(params: {
  piezaId: string;
  tenantId: string;
  vertical: string;
  art: ArtResponse;
  copy: CopyResponse;
  identidad: any;
}): Promise<boolean> {
  const renderServiceUrl = process.env.RENDER_SERVICE_URL || 'http://localhost:3001';
  
  let foto_url = '';
  if (params.vertical === 'veterinaria') {
    foto_url = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1080&auto=format&fit=crop';
  } else if (params.vertical === 'inmobiliaria') {
    foto_url = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&auto=format&fit=crop';
  } else {
    foto_url = 'http://localhost:3000/crochet.webp';
  }

  const renderJobPayload = {
    pieza_id: params.piezaId,
    tenant_id: params.tenantId,
    template: params.art.template,
    bg: params.art.bg,
    text_color: params.art.text_color,
    accent_color: params.art.accent_color,
    title_size: params.art.title_size,
    logo_position: params.art.logo_position,
    highlight_words: params.art.highlight_words,
    foto_url: foto_url,
    copy: {
      titulo: params.copy.titulo,
      subtitulo: params.copy.subtitulo,
      cta: params.copy.cta
    },
    logo_url: params.identidad?.logo_url || 'https://placehold.co/400x400/111827/ffffff?text=AMVI',
    font: params.identidad?.typography || 'var(--font-quicksand)'
  };

  try {
    const response = await fetch(`${renderServiceUrl}/render-async`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renderJobPayload)
    });
    return response.ok;
  } catch (err) {
    console.error('Fallo al invocar /render-async en Railway:', err);
    return false;
  }
}

// Fallback Renderizado Síncrono Tradicional
export async function renderGraphicAndUpload(params: {
  piezaId: string;
  tenantId: string;
  vertical: string;
  art: ArtResponse;
  copy: CopyResponse;
  identidad: any;
  token?: string;
}): Promise<string> {
  const renderServiceUrl = process.env.RENDER_SERVICE_URL || 'http://localhost:3001';
  
  let foto_url = '';
  if (params.vertical === 'veterinaria') {
    foto_url = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1080&auto=format&fit=crop';
  } else if (params.vertical === 'inmobiliaria') {
    foto_url = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&auto=format&fit=crop';
  } else {
    foto_url = 'http://localhost:3000/crochet.webp';
  }

  const renderJobPayload = {
    template: params.art.template,
    bg: params.art.bg,
    text_color: params.art.text_color,
    accent_color: params.art.accent_color,
    title_size: params.art.title_size,
    logo_position: params.art.logo_position,
    highlight_words: params.art.highlight_words,
    foto_url: foto_url,
    copy: {
      titulo: params.copy.titulo,
      subtitulo: params.copy.subtitulo,
      cta: params.copy.cta
    },
    logo_url: params.identidad?.logo_url || 'https://placehold.co/400x400/111827/ffffff?text=AMVI',
    font: params.identidad?.typography || 'var(--font-quicksand)'
  };

  const response = await fetch(`${renderServiceUrl}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(renderJobPayload)
  });

  if (!response.ok) {
    throw new Error(`El servicio de renderizado falló: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const client = params.token ? getSupabaseServerClient(params.token) : supabase;
  const storagePath = `tenants/${params.tenantId}/${params.piezaId}.png`;

  const { error: uploadErr } = await client.storage
    .from('piezas-bucket')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadErr) {
    console.error('Error al subir PNG a Storage piezas-bucket:', uploadErr);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  const { data: publicUrlData } = client.storage
    .from('piezas-bucket')
    .getPublicUrl(storagePath);

  return publicUrlData?.publicUrl || `data:image/png;base64,${buffer.toString('base64')}`;
}
