import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/runner';

export async function POST(request: Request) {
  try {
    const { tenant_id, pedido } = await request.json();

    if (!tenant_id || !pedido) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios: tenant_id y pedido' },
        { status: 400 }
      );
    }

    const result = await runPipeline(tenant_id, pedido);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en API pipeline:', error);
    return NextResponse.json(
      { error: 'Error al procesar el pipeline', details: error.message },
      { status: 500 }
    );
  }
}
