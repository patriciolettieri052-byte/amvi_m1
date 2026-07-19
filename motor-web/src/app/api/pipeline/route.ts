import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/runner';
import { getAuthUser, supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Iniciá sesión nuevamente.' },
        { status: 401 }
      );
    }

    const { pedido } = await request.json();

    if (!pedido || typeof pedido !== 'string') {
      return NextResponse.json(
        { error: 'El parámetro "pedido" es obligatorio' },
        { status: 400 }
      );
    }

    // B09: Validar tope de 5 piezas por usuario
    const { count, error: countErr } = await supabase
      .from('piezas')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.id);

    if (countErr) {
      console.error('Error contando piezas:', countErr);
    }

    if (count !== null && count >= 5) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite máximo de 5 piezas de la versión Beta.' },
        { status: 429 }
      );
    }

    // Ejecutar Pipeline Runner con el ID seguro del usuario
    const result = await runPipeline(user.id, pedido);

    // Registrar la pieza generada en la tabla `piezas`
    await supabase
      .from('piezas')
      .insert({
        tenant_id: user.id,
        pedido: pedido,
        copy_json: result.copy,
        arte_json: result.art,
        imagen_url: result.png_url,
        aprobada: false
      });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en API pipeline:', error);
    return NextResponse.json(
      { error: 'Error al procesar el pipeline', details: error.message },
      { status: 500 }
    );
  }
}
