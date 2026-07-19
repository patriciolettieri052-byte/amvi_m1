import { NextResponse } from 'next/server';
import { supabase, getAuthUser } from '@/lib/supabase';
import { getBoveda } from '@/lib/runner';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Iniciá sesión nuevamente.' },
        { status: 401 }
      );
    }

    const { action, note, copy, art } = await request.json();

    if (!action || !copy || !art) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios: action, copy y art' },
        { status: 400 }
      );
    }

    const piece_id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const signal = {
      piece_id,
      action,
      note: note || null,
      copy,
      art,
      timestamp
    };

    // 1. Obtener la bóveda actual del usuario autenticado
    const boveda = await getBoveda(user.id);
    const aprendizaje = boveda.aprendizaje || { approved: [], rejected: [], notes: [] };

    // 2. Insertar en el historial
    if (action === 'approved') {
      aprendizaje.approved = aprendizaje.approved || [];
      aprendizaje.approved.push(signal);
    } else if (action === 'rejected') {
      aprendizaje.rejected = aprendizaje.rejected || [];
      aprendizaje.rejected.push(signal);
      if (note) {
        aprendizaje.notes = aprendizaje.notes || [];
        aprendizaje.notes.push(note);
      }
    }

    // 3. Actualizar en Supabase
    const { error } = await supabase
      .from('marcas_boveda')
      .update({ aprendizaje, updated_at: timestamp })
      .eq('tenant_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, piece_id, signal });

  } catch (error: any) {
    console.error('Error en API feedback:', error);
    return NextResponse.json(
      { error: 'Error al registrar el aprendizaje', details: error.message },
      { status: 500 }
    );
  }
}
