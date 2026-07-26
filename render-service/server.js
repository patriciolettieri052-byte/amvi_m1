const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const TEMPLATES_DIR = path.join(__dirname, 'templates');

// Core Render Helper
async function generatePngBuffer(reqBody) {
  let browser = null;
  try {
    const {
      template,
      bg,
      text_color,
      accent_color,
      title_size,
      logo_position,
      highlight_words = [],
      copy,
      logo_url,
      font = 'Quicksand'
    } = reqBody;

    if (!template || !copy) {
      throw new Error('Faltan parámetros obligatorios: template y copy');
    }

    const { titulo = '', subtitulo = '', cta = '' } = copy;
    const templateName = template.endsWith('.html') ? template : `${template}.html`;
    const templatePath = path.join(TEMPLATES_DIR, templateName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`La plantilla ${templateName} no existe`);
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    let processedTitle = titulo;
    if (highlight_words && highlight_words.length > 0) {
      highlight_words.forEach(word => {
        if (!word) return;
        const regex = new RegExp(`\\b(${escapeRegExp(word)})\\b`, 'gi');
        processedTitle = processedTitle.replace(regex, '<span class="highlight">$1</span>');
      });
    }

    let fotoUrl = reqBody.image_url || reqBody.foto_url;
    if (!fotoUrl) {
      if (template.includes('vet')) {
        fotoUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1080&auto=format&fit=crop';
      } else if (template.includes('inmo')) {
        fotoUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&auto=format&fit=crop';
      } else {
        fotoUrl = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1080&auto=format&fit=crop';
      }
    }

    html = html
      .replace(/\{\{BG\}\}/g, bg || '#FFFFFF')
      .replace(/\{\{TEXT_COLOR\}\}/g, text_color || '#1A1A1A')
      .replace(/\{\{ACCENT\}\}/g, accent_color || '#E94560')
      .replace(/\{\{FONT\}\}/g, font)
      .replace(/\{\{TITULO\}\}/g, processedTitle)
      .replace(/\{\{SUBTITULO\}\}/g, subtitulo)
      .replace(/\{\{CTA\}\}/g, cta)
      .replace(/\{\{FOTO_URL\}\}/g, fotoUrl)
      .replace(/\{\{LOGO_URL\}\}/g, logo_url || 'https://placehold.co/200x200/png?text=LOGO');

    let styleOverrides = `
      <style>
        .highlight { color: ${accent_color || '#E94560'} !important; }
    `;

    if (title_size) {
      let sizePx = '82px';
      if (title_size === 'sm') sizePx = '48px';
      else if (title_size === 'md') sizePx = '64px';
      else if (title_size === 'lg') sizePx = '82px';
      else if (title_size === 'xl') sizePx = '96px';
      
      styleOverrides += `.titulo { font-size: ${sizePx} !important; }`;
    }

    if (logo_position && logo_position !== 'none') {
      styleOverrides += `
        .logo {
          position: absolute !important; width: auto !important; height: 60px !important; z-index: 999 !important; transform: none !important; margin: 0 !important;
        }
      `;
      switch (logo_position) {
        case 'top-left': styleOverrides += `.logo { top: 50px !important; left: 50px !important; }`; break;
        case 'top-right': styleOverrides += `.logo { top: 50px !important; right: 50px !important; }`; break;
        case 'bottom-left': styleOverrides += `.logo { bottom: 50px !important; left: 50px !important; }`; break;
        case 'bottom-right': styleOverrides += `.logo { bottom: 50px !important; right: 50px !important; }`; break;
      }
    }

    styleOverrides += `</style>`;
    html = html.replace('</head>', `${styleOverrides}</head>`);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => { await document.fonts.ready; });

    const buffer = await page.screenshot({ type: 'png' });
    return buffer;

  } finally {
    if (browser) await browser.close();
  }
}

// Endpoint Síncrono Tradicional
app.post('/render', async (req, res) => {
  try {
    const buffer = await generatePngBuffer(req.body);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (error) {
    console.error('Error durante el renderizado:', error);
    res.status(500).json({ error: 'Error al renderizar el post a PNG', details: error.message });
  }
});

// Endpoint Asíncrono Desacoplado: Railway renderiza, sube a Supabase Storage y actualiza DB directamente
app.post('/render-async', async (req, res) => {
  const { pieza_id, tenant_id } = req.body;

  if (!pieza_id || !tenant_id) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios: pieza_id y tenant_id' });
  }

  // Responder 200 inmediatamente a Vercel/Next.js (< 50ms)
  res.json({ success: true, status: 'processing', pieza_id });

  // Procesamiento en background en Railway
  (async () => {
    try {
      const buffer = await generatePngBuffer(req.body);

      if (supabase) {
        const storagePath = `tenants/${tenant_id}/${pieza_id}.png`;

        // Subir PNG a Supabase Storage
        const { error: uploadErr } = await supabase.storage
          .from('piezas-bucket')
          .upload(storagePath, buffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadErr) console.error('Error subiendo a Storage desde Railway:', uploadErr);

        const { data: publicUrlData } = supabase.storage
          .from('piezas-bucket')
          .getPublicUrl(storagePath);

        const cdnUrl = publicUrlData?.publicUrl || `data:image/png;base64,${buffer.toString('base64')}`;

        // Actualizar fila en DB public.piezas
        await supabase
          .from('piezas')
          .update({
            imagen_url: cdnUrl,
            estado: 'disenada'
          })
          .eq('id', pieza_id);

        console.log(`[Railway Render] Pieza ${pieza_id} renderizada y actualizada a 'disenada' exitosamente.`);
      }
    } catch (err) {
      console.error(`[Railway Render Error] Error procesando pieza ${pieza_id}:`, err);
      if (supabase) {
        await supabase.from('piezas').update({ estado: 'error' }).eq('id', pieza_id);
      }
    }
  })();
});

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.listen(PORT, () => {
  console.log(`Servicio de Renderizado escuchando en el puerto ${PORT}`);
});
