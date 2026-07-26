export { callLLM } from './llm/client';
export { loadResourceFile } from './llm/prompts';
export { getBoveda } from './boveda';
export { getVerticalAdn } from './adn/loader';
export { synthesizeBrandDirectives } from './memory/compressor';
export { processBrandLogo } from './logo';
export { runCopyAgent } from './agents/copy';
export { runArtAgent } from './agents/arte';
export { renderGraphicAndUpload } from './render/client';
export { generateConceptText, processPieceDesignAsync, runPipeline } from './pipeline';

export async function detectRubro(userText: string) {
  const { callLLM } = await import('./llm/client');
  const { RubroDetectionSchema } = await import('./types');
  const systemPrompt = `Eres un asistente de onboarding para AMVI. Analiza el texto del negocio del usuario y detecta el rubro principal.
Devuelve un JSON estrictamente en este formato:
{
  "rubro": "veterinaria | inmobiliaria | crochet | otro",
  "brand_name_sugerido": "nombre de la marca si aparece en el texto, o null",
  "detalle": "ubicación o detalles extra si aparecen, o null",
  "confianza": "alta | baja"
}`;
  const raw = await callLLM(systemPrompt, userText);
  return RubroDetectionSchema.parse(JSON.parse(raw));
}

export async function inferTone(userText: string) {
  const { callLLM } = await import('./llm/client');
  const { ToneInferenceSchema } = await import('./types');
  const systemPrompt = `Eres un experto en personalidad de marca de AMVI. Analiza la descripción del tono/persona del negocio del usuario y clasifícalo en 3 ejes acotados.
Devuelve un JSON estrictamente en este formato:
{
  "cercania": "cercano | equilibrado | profesional",
  "energia": "alegre | equilibrado | sereno",
  "estilo": "didactico | equilibrado | directo",
  "resumen_tono": "frase corta y legible resumida para el dueño"
}`;
  const raw = await callLLM(systemPrompt, userText);
  return ToneInferenceSchema.parse(JSON.parse(raw));
}
