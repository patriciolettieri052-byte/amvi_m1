import { callLLM } from '../llm/client';
import { loadResourceFile } from '../llm/prompts';
import { CopyResponseSchema, CopyResponse } from '../types';

export async function runCopyAgent(params: {
  adn: any;
  identidad: any;
  directivas: string[];
  pedido?: string;
  concepto?: string;
  tipo?: string;
}): Promise<CopyResponse> {
  const promptCopySystem = loadResourceFile('prompts', 'prompt_copy.md');

  const inputCopy = JSON.stringify({
    adn: params.adn,
    identidad: params.identidad,
    directivas_de_marca: params.directivas,
    tipo_pieza: params.tipo || 'educativo',
    concepto: params.concepto || params.pedido || 'Novedades y valor para el cliente',
    pedido: params.pedido || null
  }, null, 2);

  const raw = await callLLM(promptCopySystem, inputCopy);
  return CopyResponseSchema.parse(JSON.parse(raw));
}
