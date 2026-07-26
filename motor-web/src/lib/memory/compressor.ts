import { callLLM } from '../llm/client';

export interface DirectivasResultado {
  directivas: string[];
  piezas_analizadas: number;
  actualizado: string;
}

export async function synthesizeBrandDirectives(aprendizaje: any): Promise<string[]> {
  const approved = aprendizaje?.approved || [];
  const rejected = aprendizaje?.rejected || [];
  const notes = aprendizaje?.notes || [];

  const totalSenales = approved.length + rejected.length + notes.length;

  // Si hay menos de 3 señales, devuelve array vacío (no incluye sección en el prompt)
  if (totalSenales < 3) {
    return [];
  }

  // Si ya existen directivas calculadas previamente y no han cambiado las señales, retornarlas
  if (aprendizaje?.directivas && Array.isArray(aprendizaje.directivas) && aprendizaje.directivas.length > 0) {
    // Si no hubo nuevo feedback, retornar caché
    if (aprendizaje.total_senales_procesadas === totalSenales) {
      return aprendizaje.directivas.slice(0, 5);
    }
  }

  const systemPrompt = `Eres el Agente Director de Cuenta de AMVI. Analiza el historial de piezas aprobadas, rechazadas y notas de feedback del cliente para sintetizar DIRECTIVAS EJECUTIVAS DE MARCA.
Devuelve un JSON estrictamente en este formato:
{
  "directivas": [
    "frase de directiva 1",
    "frase de directiva 2"
  ]
}
REGLAS ESTRICTAS:
1. Genera de 3 a MÁXIMO 5 directivas en texto corto y claro en tercera persona (ej. "Prefiere tono didáctico sobre promocional", "Rechaza llamados a la acción agresivos").
2. NUNCA devuelvas más de 5 directivas bajo ninguna circunstancia. Es un tope duro.
3. Concéntrate en patrones repetidos de preferencia visual, tono o contenido.`;

  const inputData = JSON.stringify({ approved, rejected, notes }, null, 2);

  try {
    const raw = await callLLM(systemPrompt, inputData);
    const parsed = JSON.parse(raw);
    const directivas = Array.isArray(parsed.directivas) ? parsed.directivas.slice(0, 5) : [];
    return directivas;
  } catch (err) {
    console.error('Error al sintetizar directivas de marca:', err);
    return [];
  }
}
