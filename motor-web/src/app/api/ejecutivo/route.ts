import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase';
import { getBoveda } from '@/lib/boveda';
import { getVerticalAdn } from '@/lib/adn/loader';
import { synthesizeBrandDirectives } from '@/lib/memory/compressor';
import { callLLM } from '@/lib/llm/client';
import { z } from 'zod';

const ExecutiveResponseSchema = z.object({
  respuesta: z.string().min(1, 'La respuesta es requerida'),
  conceptos_sugeridos: z.array(z.object({
    concepto: z.string(),
    tipo: z.enum(['educativo', 'promo', 'novedad'])
  })).nullable().optional()
});

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

    const { mensaje } = await request.json();

    if (!mensaje || typeof mensaje !== 'string') {
      return NextResponse.json(
        { error: 'El parámetro "mensaje" es obligatorio' },
        { status: 400 }
      );
    }

    // 1. Cargar Bóveda, Directivas Sintetizadas y ADN
    const boveda = await getBoveda(user.id, token);
    const directivas = await synthesizeBrandDirectives(boveda.aprendizaje);
    const verticalKey = boveda.vertical || 'veterinaria';
    const adn = getVerticalAdn(verticalKey);

    // 2. Ejecutar Agente Ejecutivo
    const systemPrompt = `Eres el Agente Ejecutivo / Director de Cuenta de AMVI para la marca "${boveda.identidad?.brand_name || 'del cliente'}".
Tu rol es asesorar estratégicamente al dueño del negocio sobre qué comunicar y publicar, basándote en:
1. El rubro y su estacionalidad (${verticalKey.toUpperCase()})
2. La identidad y público objetivo de la Bóveda
3. Las directivas aprendidas de marca

Devuelve un JSON estrictamente en este formato:
{
  "respuesta": "tu asesoria clara, empática y profesional de 2 a 4 párrafos",
  "conceptos_sugeridos": [
    {
      "concepto": "idea concreta para una pieza gráfica",
      "tipo": "educativo | promo | novedad"
    }
  ]
}

Reglas:
- Si el usuario te pide sugerencias o qué publicar, incluye de 1 a 3 "conceptos_sugeridos" concretos.
- Respeta estrictamente las directivas sintetizadas del cliente.`;

    const inputData = JSON.stringify({
      adn,
      identidad: boveda.identidad,
      audiencia: boveda.audiencia,
      directivas_sintetizadas: directivas,
      pregunta_cliente: mensaje
    }, null, 2);

    const raw = await callLLM(systemPrompt, inputData);
    const parsed = ExecutiveResponseSchema.parse(JSON.parse(raw));

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error('Error en API ejecutivo:', error);
    return NextResponse.json(
      { error: 'Error al consultar al Agente Ejecutivo', details: error.message },
      { status: 500 }
    );
  }
}
