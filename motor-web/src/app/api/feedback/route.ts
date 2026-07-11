import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getBoveda } from '@/lib/runner';

export async function POST(request: Request) {
  try {
    const { tenant_id, action, note, copy, art } = await request.json();

    if (!tenant_id || !action || !copy || !art) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios: tenant_id, action, copy y art' },
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

    // Si es un ID mock ('vet', 'croc', 'inmo'), no actualizamos base de datos real
    if (['vet', 'croc', 'inmo'].includes(tenant_id)) {
      console.log(`[MOCK FEEDBACK] Guardada señal para ${tenant_id}:`, signal);
      return NextResponse.json({ success: true, piece_id, signal });
    }

    // 1. Obtener la bóveda actual
    const boveda = await getBoveda(tenant_id);
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
      .update({ aprendizaje })
      .eq('tenant_id', tenant_id);

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
