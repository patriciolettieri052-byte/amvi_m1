const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Mapear plantilla a su nombre de archivo físico
const TEMPLATES_DIR = path.join(__dirname, 'templates');

app.post('/render', async (req, res) => {
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
    } = req.body;

    // Validación básica
    if (!template || !copy) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios: template y copy' });
    }

    const { titulo = '', subtitulo = '', cta = '' } = copy;

    // 1. Cargar archivo HTML de plantilla
    // Soportar tanto nombres con extensión como alias sin extensión
    const templateName = template.endsWith('.html') ? template : `${template}.html`;
    const templatePath = path.join(TEMPLATES_DIR, templateName);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: `La plantilla ${templateName} no existe` });
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    // 2. Procesar highlight_words en el título
    let processedTitle = titulo;
    if (highlight_words && highlight_words.length > 0) {
      highlight_words.forEach(word => {
        if (!word) return;
        // Reemplazar la palabra con la clase highlight (insensible a mayúsculas/minúsculas)
        const regex = new RegExp(`\\b(${escapeRegExp(word)})\\b`, 'gi');
        processedTitle = processedTitle.replace(regex, '<span class="highlight">$1</span>');
      });
    }

    // 3. Determinar imagen por defecto (si no viene FOTO_URL en el body)
    // Se usa un Unsplash representativo según la plantilla/vertical
    let fotoUrl = req.body.image_url || req.body.foto_url;
    if (!fotoUrl) {
      if (template.includes('vet')) {
        fotoUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1080&auto=format&fit=crop';
      } else if (template.includes('inmo')) {
        fotoUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&auto=format&fit=crop';
      } else {
        fotoUrl = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1080&auto=format&fit=crop';
      }
    }

    // 4. Reemplazar placeholders en el HTML
    // Soporta {{BG}} {{TEXT_COLOR}} {{ACCENT}} {{FONT}} {{TITULO}} {{SUBTITULO}} {{CTA}} {{FOTO_URL}} {{LOGO_URL}}
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

    // 5. Inyectar anulaciones CSS dinámicas (logo_position, title_size y highlight class color)
    let styleOverrides = `
      <style>
        .highlight {
          color: ${accent_color || '#E94560'} !important;
        }
    `;

    if (title_size) {
      let sizePx = '82px';
      if (title_size === 'sm') sizePx = '48px';
      else if (title_size === 'md') sizePx = '64px';
      else if (title_size === 'lg') sizePx = '82px';
      else if (title_size === 'xl') sizePx = '96px';
      
      styleOverrides += `
        .titulo {
          font-size: ${sizePx} !important;
        }
      `;
    }

    if (logo_position && logo_position !== 'none') {
      styleOverrides += `
        .logo {
          position: absolute !important;
          width: auto !important;
          height: 60px !important;
          z-index: 999 !important;
          transform: none !important;
          margin: 0 !important;
        }
      `;

      switch (logo_position) {
        case 'top-left':
          styleOverrides += `.logo { top: 50px !important; left: 50px !important; right: auto !important; bottom: auto !important; }`;
          break;
        case 'top-right':
          styleOverrides += `.logo { top: 50px !important; right: 50px !important; left: auto !important; bottom: auto !important; }`;
          break;
        case 'bottom-left':
          styleOverrides += `.logo { bottom: 50px !important; left: 50px !important; top: auto !important; right: auto !important; }`;
          break;
        case 'bottom-right':
          styleOverrides += `.logo { bottom: 50px !important; right: 50px !important; top: auto !important; left: auto !important; }`;
          break;
      }
    }

    styleOverrides += `</style>`;

    // Insertar las anulaciones de estilo justo antes del cierre de head
    html = html.replace('</head>', `${styleOverrides}</head>`);

    // 6. Lanzar Puppeteer para renderizar
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080 });

    // Setear contenido HTML
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Esperar unos ms adicionales por si acaso las imágenes tardan en dibujarse
    await page.evaluate(async () => {
      // Forzar que carguen las fuentes web de Google Fonts si se agregaron
      await document.fonts.ready;
    });

    const buffer = await page.screenshot({ type: 'png' });
    
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);

  } catch (error) {
    console.error('Error durante el renderizado:', error);
    res.status(500).json({ error: 'Error al renderizar el post a PNG', details: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Helper para escapar caracteres regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.listen(PORT, () => {
  console.log(`Servicio de Renderizado escuchando en el puerto ${PORT}`);
});
