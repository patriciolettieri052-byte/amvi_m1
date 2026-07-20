import fs from 'fs';
import path from 'path';
import { supabase, getSupabaseServerClient } from './supabase';
import {
  CopyResponseSchema,
  ArtResponseSchema,
  RubroDetectionSchema,
  ToneInferenceSchema,
  CopyResponse,
  ArtResponse,
  RubroDetectionResponse,
  ToneInferenceResponse,
  PipelineResult,
  Boveda
} from './types';

// Cargar ADN y prompts desde los archivos de recursos
function loadResourceFile(...relativePaths: string[]): string {
  try {
    const localPath = path.join(process.cwd(), 'recursos', ...relativePaths);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath, 'utf8');
    }
    throw new Error(`Archivo no encontrado: ${localPath}`);
  } catch (err: any) {
    console.error(`Error al cargar recurso ${relativePaths.join('/')}:`, err.message);
    throw err;
  }
}

// Cargar ADNs de los verticales
export function getVerticalAdn(vertical: string): any {
  const adnsContent = loadResourceFile('adns', 'adn_verticales.json');
  if (!adnsContent) return null;
  const adns = JSON.parse(adnsContent);
  return adns[vertical] || adns[vertical.toLowerCase()] || null;
}

// Obtener datos de la Bóveda de Supabase
export async function getBoveda(tenantIdOrKey: string, token?: string): Promise<Boveda> {
  const client = token ? getSupabaseServerClient(token) : supabase;
  const { data, error } = await client
    .from('marcas_boveda')
    .select('*')
    .eq('tenant_id', tenantIdOrKey)
    .single();

  if (error || !data) {
    throw new Error(`No se encontró tenant ${tenantIdOrKey} en Supabase o error de conexión: ${error?.message}`);
  }

  return {
    tenant_id: data.tenant_id,
    vertical: data.vertical || null,
    identidad: data.identidad || {},
    conversacion: data.conversacion || {},
    audiencia: data.audiencia || {},
    aprendizaje: data.aprendizaje || { approved: [], rejected: [], notes: [] },
    onboarding_completo: data.onboarding_completo || false
  };
}

// Llamada a la API de IA (Gemini o OpenAI)
async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    // Usar Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\nEntrada del Trabajo:\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  } else if (openaiKey) {
    // Usar OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '{}';
  }

  // Si no hay API keys, lanzar un error para caer en el mock del runner
  throw new Error('No API Keys configured');
}

export async function detectRubro(userText: string): Promise<RubroDetectionResponse> {
  const systemPrompt = `Eres un asistente de onboarding para AMVI. Analiza el texto del negocio del usuario y detecta el rubro principal.
Devuelve un JSON estrictamente en este formato:
{
  "rubro": "veterinaria | inmobiliaria | crochet | otro",
  "brand_name_sugerido": "nombre de la marca si aparece en el texto, o null",
  "detalle": "ubicación o detalles extra si aparecen, o null",
  "confianza": "alta | baja"
}
Reglas:
- Si el texto se refiere a mascotas, animales, clínica veterinaria -> rubro: "veterinaria" (confianza "alta").
- Si se refiere a venta/alquiler de casas, departamentos, propiedades, penthouse -> rubro: "inmobiliaria" (confianza "alta").
- Si se refiere a tejido, crochet, lana, amigurumis, artesanías en hilo -> rubro: "crochet" (confianza "alta").
- Si es vago o ambiguo -> confianza: "baja".
- Si no pertenece a estos 3 rubros conocidos -> rubro: "otro".`;

  const raw = await callLLM(systemPrompt, userText);
  return RubroDetectionSchema.parse(JSON.parse(raw));
}

export async function inferTone(userText: string): Promise<ToneInferenceResponse> {
  const systemPrompt = `Eres un experto en personalidad de marca de AMVI. Analiza la descripción del tono/persona del negocio del usuario y clasifícalo en 3 ejes acotados.
Devuelve un JSON estrictamente en este formato:
{
  "cercania": "cercano | equilibrado | profesional",
  "energia": "alegre | equilibrado | sereno",
  "estilo": "didactico | equilibrado | directo",
  "resumen_tono": "frase corta y legible resumida para el dueño"
}
Reglas:
- NUNCA devuelvas valores fuera de los permitidos por el esquema.
- "resumen_tono" debe ser una frase amable y síntesis de 5-10 palabras (ej. "Tono cercano, cálido y profesional").`;

  const raw = await callLLM(systemPrompt, userText);
  return ToneInferenceSchema.parse(JSON.parse(raw));
}

// Orquestador principal (Pipeline Runner)
export async function runPipeline(tenantId: string, pedido: string, token?: string): Promise<PipelineResult> {
  // 1. Obtener Bóveda
  const boveda = await getBoveda(tenantId, token);
  const identidad = boveda.identidad;
  const aprendizaje = boveda.aprendizaje;

  // Determinar el vertical (veterinaria, crochet o inmobiliaria)
  let vertical = boveda.vertical || 'veterinaria';
  if (vertical === 'otro' || !['veterinaria', 'inmobiliaria', 'crochet'].includes(vertical)) {
    const brandNameLower = (identidad.brand_name || '').toLowerCase();
    if (brandNameLower.includes('inmobiliaria') || brandNameLower.includes('properties') || brandNameLower.includes('prime')) {
      vertical = 'inmobiliaria';
    } else if (brandNameLower.includes('crochet') || brandNameLower.includes('knit') || brandNameLower.includes('purl')) {
      vertical = 'crochet';
    } else {
      vertical = 'veterinaria';
    }
  }

  // 2. Obtener ADN del vertical
  const adn = getVerticalAdn(vertical);
  if (!adn) {
    throw new Error(`No se encontró el ADN del vertical para: ${vertical}`);
  }

  let copyJSON: CopyResponse;
  let artJSON: ArtResponse;
  let usingMockAI = false;

  try {
    // Cargar prompts del sistema
    const promptCopySystem = loadResourceFile('prompts', 'prompt_copy.md');
    const promptArteSystem = loadResourceFile('prompts', 'prompt_arte.md');

    if (!promptCopySystem || !promptArteSystem) {
      throw new Error('Faltan archivos de prompt de sistema');
    }

    // 3. Ejecutar Agente Copy
    const inputCopy = JSON.stringify({ adn, identidad, aprendizaje, pedido }, null, 2);
    const rawCopyResponse = await callLLM(promptCopySystem, inputCopy);
    copyJSON = CopyResponseSchema.parse(JSON.parse(rawCopyResponse));

    // 4. Ejecutar Agente Arte (le pasa también el resultado del copy)
    const inputArte = JSON.stringify({
      adn,
      identidad,
      aprendizaje,
      copy: {
        titulo: copyJSON.titulo,
        subtitulo: copyJSON.subtitulo,
        cta: copyJSON.cta
      },
      templates_disponibles: adn.templates_recomendados
    }, null, 2);
    const rawArtResponse = await callLLM(promptArteSystem, inputArte);
    artJSON = ArtResponseSchema.parse(JSON.parse(rawArtResponse));

  } catch (err: any) {
    console.error('Llamada a IA falló.', err.message);
    throw err;
  }

  // 5. Ensamblar RenderJob y llamar al servicio de renderizado de Puppeteer
  const renderServiceUrl = process.env.RENDER_SERVICE_URL || 'http://localhost:3001';
  
  let foto_url = '';
  if (vertical === 'veterinaria') {
    foto_url = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1080&auto=format&fit=crop';
  } else if (vertical === 'inmobiliaria') {
    foto_url = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&auto=format&fit=crop';
  } else {
    foto_url = 'http://localhost:3000/crochet.webp';
  }

  const renderJobPayload = {
    template: artJSON.template,
    bg: artJSON.bg,
    text_color: artJSON.text_color,
    accent_color: artJSON.accent_color,
    title_size: artJSON.title_size,
    logo_position: artJSON.logo_position,
    highlight_words: artJSON.highlight_words,
    foto_url: foto_url,
    copy: {
      titulo: copyJSON.titulo,
      subtitulo: copyJSON.subtitulo,
      cta: copyJSON.cta
    },
    logo_url: identidad.logo_url || 'https://placehold.co/400x400/111827/ffffff?text=AMVI',
    font: identidad.typography || 'var(--font-quicksand)'
  };

  try {
    const response = await fetch(`${renderServiceUrl}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renderJobPayload)
    });

    if (!response.ok) {
      throw new Error(`El servicio de renderizado falló: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    return {
      png_url: `data:image/png;base64,${base64Image}`,
      copy: copyJSON,
      art: artJSON,
      caption: copyJSON.caption
    };
  } catch (err: any) {
    console.error('Error al llamar al servicio de renderizado Puppeteer:', err.message);
    throw err;
  }
}
