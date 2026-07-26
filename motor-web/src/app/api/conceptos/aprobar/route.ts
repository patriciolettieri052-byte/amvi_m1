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

    const { pieza_ids } = await request.json();

    if (!pieza_ids || !Array.isArray(pieza_ids) || pieza_ids.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar un array "pieza_ids" con al menos un ID' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient(token);

    // 1. Pasar piezas a estado 'concepto_aprobado'
    await client
      .from('piezas')
      .update({ estado: 'concepto_aprobado' })
      .in('id', pieza_ids)
      .eq('tenant_id', user.id);

    // 2. Disparar el diseño y renderizado asíncrono para cada pieza
    pieza_ids.forEach((id: string) => {
      processPieceDesignAsync({
        piezaId: id,
        tenantId: user.id,
        token
      }).catch((err) => {
        console.error(`Error en render asíncrono de pieza ${id}:`, err);
      });
    });

    return NextResponse.json({
      success: true,
      mensaje: `${pieza_ids.length} concepto(s) aprobado(s) y enviados a diseño`,
      pieza_ids
    });

  } catch (error: any) {
    console.error('Error en API conceptos/aprobar:', error);
    return NextResponse.json(
      { error: 'Error al aprobar conceptos', details: error.message },
      { status: 500 }
    );
  }
}
