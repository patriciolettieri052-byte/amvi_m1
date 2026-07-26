import { NextResponse } from 'next/server';
import { getAuthUser, getSupabaseServerClient } from '@/lib/supabase';
import { processPieceDesignAsync } from '@/lib/pipeline';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const user = await getAuthUser(request);

    if (!user || !token) {
      return NextResponse.json(
        { error: 'No autorizado. Iniciá sesión nuevamente.' },
        { status: 401 }
      );
    }

    const { pieza_id } = await request.json();

    if (!pieza_id || typeof pieza_id !== 'string') {
      return NextResponse.json(
        { error: 'El parámetro "pieza_id" es obligatorio' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient(token);

    // 1. Actualizar estado a 'disenando'
    await client
      .from('piezas')
      .update({ estado: 'disenando' })
      .eq('id', pieza_id)
      .eq('tenant_id', user.id);

    // 2. Disparar el proceso asíncrono usando el helper serverless-safe
    const { runBackgroundJob } = await import('@/lib/render/client');
    runBackgroundJob(
      processPieceDesignAsync({
        piezaId: pieza_id,
        tenantId: user.id,
        token
      })
    );

    // 3. Responder de inmediato (< 1s)
    return NextResponse.json({
      success: true,
      status: 'disenando',
      pieza_id
    });

  } catch (error: any) {
    console.error('Error en API pipeline/diseno:', error);
    return NextResponse.json(
      { error: 'Error al iniciar diseño', details: error.message },
      { status: 500 }
    );
  }
}
