import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateConceptText } from '@/lib/pipeline';
import { loadResourceFile } from '@/lib/llm/prompts';

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado para ejecutar el cron' },
        { status: 401 }
      );
    }

    // 1. Obtener usuarios activos con onboarding_completo = true
    const { data: usuarios, error } = await supabase
      .from('marcas_boveda')
      .select('tenant_id, vertical, identidad')
      .eq('onboarding_completo', true);

    if (error || !usuarios) {
      throw new Error(`Error obteniendo marcas activas: ${error?.message}`);
    }

    let generadas = 0;
    const currentMonth = new Date().getMonth() + 1; // 1-12

    for (const u of usuarios) {
      // Verificar si ya tiene conceptos pendientes sin resolver
      const { count } = await supabase
        .from('piezas')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', u.tenant_id)
        .eq('estado', 'concepto_pendiente');

      if (count && count >= 3) {
        continue; // Omitir si ya tiene 3 o más pendientes sin revisar
      }

      const verticalKey = u.vertical || 'veterinaria';

      // Cargar temario de la tabla o fallback
      const { data: temarioDb } = await supabase
        .from('temarios')
        .select('temas')
        .eq('vertical', verticalKey)
        .single();

      let temasList = temarioDb?.temas?.temas || [];

      if (temasList.length === 0) {
        temasList = [
          { tema: 'Consejo y cuidado especial de temporada', tipo: 'educativo' },
          { tema: 'Beneficio exclusivo para clientes', tipo: 'promo' },
          { tema: 'Novedad y anuncio del negocio', tipo: 'novedad' }
        ];
      }

      // Generar 3 conceptos para la semana
      const diasProximos = [1, 3, 5]; // Lunes, Miércoles, Viernes
      for (let i = 0; i < 3; i++) {
        const itemTema = temasList[i % temasList.length];
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + (diasProximos[i] || (i + 1)));

        const result = await generateConceptText({
          tenantId: u.tenant_id,
          pedido: itemTema.tema,
          tipo: itemTema.tipo || 'educativo'
        });

        await supabase
          .from('piezas')
          .insert({
            tenant_id: u.tenant_id,
            pedido: itemTema.tema,
            concepto: result.concepto,
            tipo: result.tipo,
            copy_json: result.copy,
            estado: 'concepto_pendiente',
            fecha_programada: fecha.toISOString()
          });

        generadas++;
      }
    }

    return NextResponse.json({
      success: true,
      usuarios_procesados: usuarios.length,
      conceptos_generados: generadas
    });

  } catch (err: any) {
    console.error('Error en Cron Semanal:', err);
    return NextResponse.json(
      { error: 'Error ejecutando cron semanal', details: err.message },
      { status: 500 }
    );
  }
}
