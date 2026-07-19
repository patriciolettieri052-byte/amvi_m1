import { NextResponse } from 'next/server';
import { getBoveda } from '@/lib/runner';
import { getAuthUser } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Iniciá sesión nuevamente.' },
        { status: 401 }
      );
    }

    const boveda = await getBoveda(user.id);
    return NextResponse.json(boveda);
  } catch (error: any) {
    console.error('Error en API boveda:', error);
    return NextResponse.json(
      { error: 'Error al obtener la bóveda', details: error.message },
      { status: 500 }
    );
  }
}
