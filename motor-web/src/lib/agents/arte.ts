import { callLLM } from '../llm/client';
import { loadResourceFile } from '../llm/prompts';
import { ArtResponseSchema, ArtResponse, CopyResponse } from '../types';

export async function runArtAgent(params: {
  adn: any;
  identidad: any;
  directivas: string[];
  copy: CopyResponse;
  tipo?: string;
}): Promise<ArtResponse> {
  const promptArteSystem = loadResourceFile('prompts', 'prompt_arte.md');

  const inputArte = JSON.stringify({
    adn: params.adn,
    identidad: params.identidad,
    directivas_de_marca: params.directivas,
    tipo_pieza: params.tipo || 'educativo',
    copy: {
      titulo: params.copy.titulo,
      subtitulo: params.copy.subtitulo,
      cta: params.copy.cta
    },
    templates_disponibles: params.adn.templates_recomendados
  }, null, 2);

  const raw = await callLLM(promptArteSystem, inputArte);
  return ArtResponseSchema.parse(JSON.parse(raw));
}
