import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/runner';
import { getAuthUser, getSupabaseServerClient } from '@/lib/supabase';

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

    const { pedido } = await request.json();

    if (!pedido || typeof pedido !== 'string') {
      return NextResponse.json(
        { error: 'El parámetro "pedido" es obligatorio' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient(token);

    // Ejecutar Pipeline Runner con el ID seguro del usuario y el token de sesión
    const result = await runPipeline(user.id, pedido, token);

    // Registrar la pieza generada en la tabla `piezas`
    await client
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
