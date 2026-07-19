import { NextResponse } from 'next/server';
import { detectRubro } from '@/lib/runner';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'El parámetro "text" es requerido' },
        { status: 400 }
      );
    }

    const result = await detectRubro(text);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en API onboarding/rubro:', error);
    return NextResponse.json(
      { error: 'Error al detectar el rubro', details: error.message },
      { status: 500 }
    );
  }
}
