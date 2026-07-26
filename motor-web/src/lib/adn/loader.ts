import { loadResourceFile } from '../llm/prompts';

export function getVerticalAdn(vertical: string, tipo?: string): any {
  const adnsContent = loadResourceFile('adns', 'adn_verticales.json');
  if (!adnsContent) return null;
  const adns = JSON.parse(adnsContent);

  const verticalKey = vertical?.toLowerCase() || 'otro';
  const baseAdn = adns[verticalKey] || adns.otro;

  if (!baseAdn) return null;

  // Si se especifica un tipo (sub-adn)
  if (tipo && baseAdn.tipos && baseAdn.tipos[tipo]) {
    const subAdn = baseAdn.tipos[tipo];
    return {
      ...baseAdn,
      tipo_seleccionado: tipo,
      sub_adn: subAdn,
      templates_recomendados: subAdn.template_preferido 
        ? [subAdn.template_preferido, ...baseAdn.templates_recomendados] 
        : baseAdn.templates_recomendados,
      anti_patterns: [
        ...(baseAdn.anti_patterns || []),
        ...(subAdn.anti_patterns_extra || [])
      ]
    };
  }

  return baseAdn;
}
