import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import {
  CopyResponseSchema,
  ArtResponseSchema,
  CopyResponse,
  ArtResponse,
  PipelineResult,
  Boveda
} from './types';

// Marcas mock por defecto (si Supabase no está configurado o falla)
const MOCK_BRANDS: Record<string, any> = {
  vet: {
    brand_name: "VetCare (Veterinaria)",
    logo_url: "https://placehold.co/400x400/004d40/ffffff?text=VetCare",
    palette: { primary: "#004d40", secondary: "#80cbc4", accent: "#ffab00" },
    typography: "Inter",
    tone: ["cálido", "profesional", "empático"],
    restrictions: ["no usar lenguaje médico complejo", "no mostrar imágenes sensibles"]
  },
  croc: {
    brand_name: "Knit & Purl (Crochet)",
    logo_url: "https://placehold.co/400x400/f48fb1/ffffff?text=KnitPurl",
    palette: { primary: "#f48fb1", secondary: "#f8bbd0", accent: "#ec407a" },
    typography: "Outfit",
    tone: ["cercano", "artesanal", "inspirador"],
    restrictions: ["evitar palabras de producción industrial", "no presionar a la venta dura"]
  },
  inmo: {
    brand_name: "Prime Properties (Inmobiliaria)",
    logo_url: "https://placehold.co/400x400/1a237e/ffffff?text=Prime",
    palette: { primary: "#1a237e", secondary: "#9fa8da", accent: "#ffd54f" },
    typography: "Roboto",
    tone: ["formal", "exclusivo", "confiable"],
    restrictions: ["no usar lenguaje informal o jerga", "nunca usar signos de exclamación exagerados"]
  }
};

// Cargar ADN y prompts desde los archivos de recursos
function loadResourceFile(...relativePaths: string[]): string {
  try {
    // Intentar buscar en la carpeta superior '../recursos'
    const fullPath = path.join(process.cwd(), '..', 'recursos', ...relativePaths);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
    
    // Fallback: buscar localmente si se copiaron al proyecto
    const localPath = path.join(process.cwd(), 'recursos', ...relativePaths);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath, 'utf8');
    }

    throw new Error(`Archivo no encontrado en ${fullPath} ni en ${localPath}`);
  } catch (err: any) {
    console.error(`Error al cargar recurso ${relativePaths.join('/')}:`, err.message);
    return '';
  }
}

// Cargar ADNs de los verticales
export function getVerticalAdn(vertical: string): any {
  const adnsContent = loadResourceFile('adns', 'adn_verticales.json');
  if (!adnsContent) return null;
  const adns = JSON.parse(adnsContent);
  return adns[vertical] || adns[vertical.toLowerCase()] || null;
}

// Obtener datos de la Bóveda de Supabase (o mock si falla)
export async function getBoveda(tenantIdOrKey: string): Promise<Boveda> {
  // Si parece una clave mock ('vet', 'inmo', 'croc') o Supabase no está conectado
  if (MOCK_BRANDS[tenantIdOrKey]) {
    return {
      tenant_id: tenantIdOrKey,
      identidad: MOCK_BRANDS[tenantIdOrKey],
      aprendizaje: { approved: [], rejected: [], notes: [] }
    };
  }

  try {
    const { data, error } = await supabase
      .from('marcas_boveda')
      .select('*')
      .eq('tenant_id', tenantIdOrKey)
      .single();

    if (error || !data) {
      console.warn(`No se encontró tenant ${tenantIdOrKey} en Supabase. Usando fallback mock.`);
      // Buscar coincidencia parcial con las claves mock
      const matchedKey = Object.keys(MOCK_BRANDS).find(k => tenantIdOrKey.toLowerCase().includes(k)) || 'vet';
      return {
        tenant_id: tenantIdOrKey,
        identidad: MOCK_BRANDS[matchedKey],
        aprendizaje: { approved: [], rejected: [], notes: [] }
      };
    }

    return {
      tenant_id: data.tenant_id,
      identidad: data.identidad,
      aprendizaje: data.aprendizaje || { approved: [], rejected: [], notes: [] }
    };
  } catch (err) {
    console.error('Error al conectar con Supabase:', err);
    return {
      tenant_id: tenantIdOrKey,
      identidad: MOCK_BRANDS.vet,
      aprendizaje: { approved: [], rejected: [], notes: [] }
    };
  }
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

// Orquestador principal (Pipeline Runner)
export async function runPipeline(tenantId: string, pedido: string): Promise<PipelineResult> {
  // 1. Obtener Bóveda
  const boveda = await getBoveda(tenantId);
  const identidad = boveda.identidad;
  const aprendizaje = boveda.aprendizaje;

  // Determinar el vertical (veterinaria, crochet o inmobiliaria)
  let vertical = 'veterinaria';
  const brandNameLower = identidad.brand_name.toLowerCase();
  if (brandNameLower.includes('inmobiliaria') || brandNameLower.includes('properties') || brandNameLower.includes('prime')) {
    vertical = 'inmobiliaria';
  } else if (brandNameLower.includes('crochet') || brandNameLower.includes('knit') || brandNameLower.includes('purl')) {
    vertical = 'crochet';
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
    console.warn('Llamada a IA falló o no está configurada. Usando generación simulada inteligente.', err.message);
    usingMockAI = true;

    // Simulación inteligente de Copy y Arte basada en el rubro
    if (vertical === 'veterinaria') {
      copyJSON = {
        titulo: 'CASTRAR ES CUIDAR',
        subtitulo: 'Este sábado, jornada con turnos protegidos.',
        cta: 'Reservar Lugar',
        caption: `Cuidar a quien te cuida también es quererlo 🐾 Este sábado, jornada especial de castración con atención súper cálida. Escríbinos al link de la bio. #VetCare #MascotasSanas`
      };
      artJSON = {
        template: 'template_foto_recortada_bloque',
        bg: identidad.palette.primary, // Usar colores reales de la boveda
        text_color: '#ffffff',
        accent_color: identidad.palette.secondary,
        title_size: 'lg',
        layout: 'foto de mascota recortada con bloque verde a la derecha',
        logo_position: 'top-right',
        highlight_words: ['Castrar']
      };
    } else if (vertical === 'inmobiliaria') {
      copyJSON = {
        titulo: 'Villa Lumière',
        subtitulo: 'Una villa privada rodeada de viñedos y olivos.',
        cta: 'Consultar',
        caption: `Provence, 2026. Una propiedad de ensueño diseñada para integrarse en la naturaleza. Ventanales de piso a techo y terminaciones en madera noble. #PrimeProperties #Provence`
      };
      artJSON = {
        template: 'template_foto_full_texto_minimo',
        bg: '#F5F5F5',
        text_color: identidad.palette.primary,
        accent_color: identidad.palette.accent,
        title_size: 'lg',
        layout: 'foto amplia superior, espacio vacio con tipografia editorial abajo',
        logo_position: 'none',
        highlight_words: []
      };
    } else {
      // Crochet
      copyJSON = {
        titulo: 'Hecho con cariño',
        subtitulo: 'Presentamos nuestro nuevo amigurumi tejido.',
        cta: 'Ver Detalles',
        caption: `Cada punto lleva horas de cariño y dedicación 🧶 Nuevo muñeco de apego tejido en hilo de algodón peinado. Edición súper limitada. #KnitAndPurl #Amigurumi`
      };
      artJSON = {
        template: 'template_producto_centrado_crema',
        bg: '#F9F6F0', // Tono crema cálido
        text_color: identidad.palette.primary,
        accent_color: identidad.palette.accent,
        title_size: 'lg',
        layout: 'producto centrado con marco y textos curvados',
        logo_position: 'top-left',
        highlight_words: ['hecho', 'alma']
      };
    }
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
    logo_url: identidad.logo_url,
    font: identidad.typography
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
    
    // Si falla el servicio de renderizado Puppeteer y no tenemos servidor corriendo,
    // devolvemos una simulación de imagen (usamos placeholders del frontend del mockup)
    // para asegurar que la demo siempre pueda mostrar algo.
    return {
      png_url: 'MOCK_HTML_INJECTION', // Señal para que el frontend dibuje el render local en HTML
      copy: copyJSON,
      art: artJSON,
      caption: copyJSON.caption
    };
  }
}
