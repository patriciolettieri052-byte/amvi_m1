import { NextResponse } from 'next/server';
import { getAuthUser, getSupabaseServerClient } from '@/lib/supabase';
import { generateConceptText } from '@/lib/pipeline';

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

    const { pedido, tipo, fecha_programada } = await request.json().catch(() => ({}));

    // Generar concepto en texto (1 llamada rápida de LLM)
    const result = await generateConceptText({
      tenantId: user.id,
      pedido,
      tipo: tipo || 'educativo',
      token
    });

    const client = getSupabaseServerClient(token);

    // Guardar en tabla piezas en estado 'concepto_pendiente'
    const { data: newPiece, error } = await client
      .from('piezas')
      .insert({
        tenant_id: user.id,
        pedido: pedido || result.concepto,
        concepto: result.concepto,
        tipo: result.tipo,
        copy_json: result.copy,
        estado: 'concepto_pendiente',
        fecha_programada: fecha_programada || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, pieza: newPiece });

  } catch (error: any) {
    console.error('Error en API pipeline/concepto:', error);
    return NextResponse.json(
      { error: 'Error al generar concepto', details: error.message },
      { status: 500 }
    );
  }
}
