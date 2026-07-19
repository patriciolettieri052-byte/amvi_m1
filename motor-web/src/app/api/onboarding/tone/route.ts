import { NextResponse } from 'next/server';
import { inferTone } from '@/lib/runner';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'El parámetro "text" es requerido' },
        { status: 400 }
      );
    }

    const result = await inferTone(text);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en API onboarding/tone:', error);
    return NextResponse.json(
      { error: 'Error al inferir el tono', details: error.message },
      { status: 500 }
    );
  }
}
