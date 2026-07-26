import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase';
import { processBrandLogo } from '@/lib/logo';

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se adjuntó ningún archivo de imagen' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await processBrandLogo(
      user.id,
      buffer,
      file.name || 'logo.png',
      file.type || 'image/png',
      token
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en API onboarding/logo:', error);
    return NextResponse.json(
      { error: 'Error al procesar el logo', details: error.message },
      { status: 500 }
    );
  }
}
