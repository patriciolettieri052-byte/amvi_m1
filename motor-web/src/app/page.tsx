'use client';

import { useState, useEffect, useRef } from 'react';

// Estructura de marcas locales para demo inmediata
const BRANDS_CONFIG: Record<string, any> = {
  vet: {
    key: 'vet',
    name: 'VetCare',
    handle: '@vetcare',
    rub: 'Veterinaria',
    ini: 'VC',
    font: 'var(--font-nunito)',
    colors: ['#004d40', '#80cbc4', '#ffab00'], // Primary, Secondary, Accent
    tone: ['cálido', 'profesional', 'empático'],
    no: ['lenguaje médico complejo', 'imágenes sensibles'],
    placeholder_ask: 'Publicación para la jornada de castración gratuita de perros y gatos de este sábado',
    ana: [
      ['Detectando colores…', 'verde pino + verde agua'],
      ['Leyendo tu tono…', 'cálido, empático'],
      ['Armando tu Bóveda…', 'casi listo']
    ],
    // Render local HTML como fallback
    render_fallback: (copy: any, art: any, logo: string) => {
      const isHighlighted = (word: string) => {
        return art.highlight_words?.some((w: string) => word.toLowerCase().includes(w.toLowerCase()));
      };
      
      const processTitle = (title: string) => {
        if (!art.highlight_words || art.highlight_words.length === 0) return title;
        let t = title;
        art.highlight_words.forEach((w: string) => {
          const regex = new RegExp(`\\b(${w})\\b`, 'gi');
          t = t.replace(regex, `<span class="hl" style="background:${art.accent_color || '#ffab00'};color:#fff">$1</span>`);
        });
        return <span dangerouslySetInnerHTML={{ __html: t }} />;
      };

      return (
        <div className="p-vet" style={{ background: art.bg || '#004d40', color: art.text_color || '#ffffff', fontFamily: 'var(--font-nunito)' }}>
          <img className="ph" src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop" alt="Pet" />
          <div className="blk" style={{ background: art.accent_color || '#ffab00', color: art.text_color || '#ffffff' }}>
            <div className="ti">{processTitle(copy.titulo || 'Castrar es amor')}</div>
            <div className="su">{copy.subtitulo || 'Turnos protegidos este sábado'}</div>
          </div>
        </div>
      );
    }
  },
  inmo: {
    key: 'inmo',
    name: 'Prime Properties',
    handle: '@primeproperties',
    rub: 'Inmobiliaria',
    ini: 'PP',
    font: 'var(--font-cormorant)',
    colors: ['#1a237e', '#9fa8da', '#ffd54f'],
    tone: ['formal', 'exclusivo', 'confiable'],
    no: ['lenguaje informal o jerga', 'exclamaciones exageradas'],
    placeholder_ask: 'Post para presentar el penthouse de lujo con terraza y vista al mar en Provence',
    ana: [
      ['Detectando estética…', 'editorial, sobria'],
      ['Leyendo tu tono…', 'formal, exclusivo'],
      ['Armando tu Bóveda…', 'casi listo']
    ],
    render_fallback: (copy: any, art: any) => {
      return (
        <div className="p-inmo" style={{ background: '#e8e2d5', color: '#1a1a1a', fontFamily: 'var(--font-cormorant)' }}>
          <img className="ph" src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&auto=format&fit=crop" alt="Luxury Property" />
          <div className="ct">
            <div className="dv" style={{ borderColor: art.accent_color || '#ffd54f' }}></div>
            <div className="ti" style={{ color: art.text_color || '#1a1a1a' }}>{copy.titulo || 'Villa Lumiere'}</div>
            <div className="su" style={{ color: art.text_color || '#1a1a1a' }}>{copy.subtitulo}</div>
            <div className="cta" style={{ color: art.accent_color || '#ffd54f', borderColor: art.accent_color || '#ffd54f' }}>
              {copy.cta || 'Consultar'}
            </div>
          </div>
        </div>
      );
    }
  },
  croc: {
    key: 'croc',
    name: 'Knit & Purl',
    handle: '@knitandpurl',
    rub: 'Crochet',
    ini: 'KP',
    font: 'var(--font-quicksand)',
    colors: ['#f48fb1', '#f8bbd0', '#ec407a'],
    tone: ['cercano', 'artesanal', 'inspirador'],
    no: ['palabras de producción industrial', 'venta dura'],
    placeholder_ask: 'Presentar el nuevo muñeco de lana tejido a crochet (amigurumi)',
    ana: [
      ['Detectando colores…', 'pasteles + terracota'],
      ['Leyendo tu tono…', 'cercano, artesanal'],
      ['Armando tu Bóveda…', 'casi listo']
    ],
    render_fallback: (copy: any, art: any, logo: string) => {
      return (
        <div className="p-croc" style={{ background: '#F9F6F0', color: art.text_color || '#f48fb1', fontFamily: 'var(--font-quicksand)' }}>
          <div className="lg">Knit &amp; Purl</div>
          <div className="ti" style={{ color: art.text_color || '#f48fb1' }}>{copy.titulo || 'Hecho con cariño'}</div>
          <div className="su" style={{ color: art.accent_color || '#ec407a' }}>{copy.subtitulo}</div>
          <img className="ph" src="/crochet.webp" alt="Crochet Toy" />
          <div className="cta" style={{ background: art.accent_color || '#ec407a', color: '#fff' }}>
            {copy.cta || 'Ver colección'}
          </div>
        </div>
      );
    }
  }
};

export default function Home() {
  const [screen, setScreen] = useState<'login' | 'analyze' | 'boveda' | 'pedido' | 'gen' | 'result'>('login');
  const [selectedBrand, setSelectedBrand] = useState<'vet' | 'inmo' | 'croc'>('vet');
  
  // Login form state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  // Estados para simulación de loaders
  const [analyzeStepText, setAnalyzeStepText] = useState('Mirando tu perfil…');
  const [analyzeSmallText, setAnalyzeSmallText] = useState('');
  
  const [genStepText, setGenStepText] = useState('Pensando el ángulo…');
  const [genProgress, setGenProgress] = useState(0);

  // Datos de la bóveda cargados
  const [brandData, setBrandData] = useState<any>(null);
  
  // Mensajes de Chat (S3)
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'me'; text: string }>>([]);
  const [pedidoInput, setPedidoInput] = useState('');
  
  // Resultado del pipeline
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  
  // Feedback note (Pedir cambios)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mostrar toast por 2 segundos
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleLogin = () => {
    const u = loginUser.toLowerCase().trim();
    if (u === 'vetcare' && loginPass === '1234') {
      handleSelectBrand('vet');
    } else if (u === 'prime' && loginPass === '1234') {
      handleSelectBrand('inmo');
    } else if (u === 'knit' && loginPass === '1234') {
      handleSelectBrand('croc');
    } else {
      triggerToast('Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    setLoginUser('');
    setLoginPass('');
    setBrandData(null);
    setPipelineResult(null);
    setMessages([]);
    setScreen('login');
  };

  // Iniciar la carga del perfil (S1)
  const handleSelectBrand = (brandKey: 'vet' | 'inmo' | 'croc') => {
    setSelectedBrand(brandKey);
    const config = BRANDS_CONFIG[brandKey];
    setScreen('analyze');
    setAnalyzeStepText('Mirando tu perfil…');
    setAnalyzeSmallText(config.handle);

    // Secuencia de loadings de Análisis (Premium: ~4 segundos totales)
    const steps = [
      ['Mirando tu perfil…', config.handle],
      ...config.ana
    ];
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps.length) {
        clearInterval(interval);
        
        // Simular que cargamos la bóveda (T02)
        // Intentar obtenerla por tenant_id ('vet', 'inmo', 'croc' cargará las dummies mockeadas)
        fetchBovedaData(brandKey);
      } else {
        setAnalyzeStepText(steps[currentStep][0]);
        setAnalyzeSmallText(steps[currentStep][1]);
      }
    }, 1000);
  };

  const fetchBovedaData = async (brandKey: string) => {
    try {
      // Intentar pegarle a un endpoint local o usar fallback
      const bData = BRANDS_CONFIG[brandKey];
      setBrandData({
        tenant_id: brandKey,
        identidad: {
          brand_name: bData.name,
          logo_url: `https://placehold.co/200x200?text=${bData.ini}`,
          palette: {
            primary: bData.colors[0],
            secondary: bData.colors[1],
            accent: bData.colors[2]
          },
          typography: bData.font,
          tone: bData.tone,
          restrictions: bData.no
        }
      });
      setScreen('boveda');
    } catch (err) {
      console.error(err);
    }
  };

  // Activar Bóveda (pasa a S3 Pedido Chat)
  const handleActivateBoveda = () => {
    const config = BRANDS_CONFIG[selectedBrand];
    
    // Resetear chat y agregar mensaje inicial del Ejecutivo de Cuentas
    setMessages([
      { sender: 'ai', text: `¡Hola! Ya tengo la identidad de ${config.name} cargada en La Bóveda. ¿Qué pieza necesitás que preparemos hoy?` }
    ]);
    
    // Sugerencia de pedido precargado en el input
    setPedidoInput(config.placeholder_ask);
    setScreen('pedido');
  };

  // Enviar Pedido e iniciar generación (S4)
  const handleSendPedido = async () => {
    if (!pedidoInput.trim()) return;

    const userText = pedidoInput;
    setMessages(prev => [...prev, { sender: 'me', text: userText }]);
    setPedidoInput('');

    // Respuesta del Ejecutivo
    setTimeout(() => {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Entendido. Comienzo a orquestar el diseño y el copy con tus pautas.' }]);
      
      // Pasar a cargando generación (S4) después de la confirmación
      setTimeout(() => {
        setScreen('gen');
        runGenerationPipeline(userText);
      }, 1000);
    }, 800);
  };

  // Orquestación de loaders del Pipeline Runner (S4)
  const runGenerationPipeline = async (pedido: string) => {
    const steps = [
      'Pensando el ángulo…',
      'Redactando el copy con tu tono…',
      'Diseñando con tus colores…',
      'Maquetando la pieza…'
    ];

    setGenStepText(steps[0]);
    setGenProgress(10);

    // Iniciar llamada real al pipeline en paralelo
    let pipelinePromise = fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: selectedBrand,
        pedido: pedido
      })
    }).then(res => {
      if (!res.ok) throw new Error('Render fail');
      return res.json();
    }).catch(err => {
      console.warn('API error, using mock preview generator', err);
      // Fallback local mock para no trancar la demo
      return new Promise((resolve) => {
        setTimeout(() => {
          const config = BRANDS_CONFIG[selectedBrand];
          let copy, art;
          if (selectedBrand === 'vet') {
            copy = { titulo: 'CASTRAR ES CUIDAR', subtitulo: 'Este sábado, turnos protegidos', cta: 'Reservar Lugar', caption: 'Una mascota sana es una mascota feliz. Agendá su turno para este sábado. #VetCare' };
            art = { template: 'template_foto_recortada_bloque', bg: config.colors[0], text_color: '#ffffff', accent_color: config.colors[1], title_size: 'lg', layout: 'vertical', logo_position: 'top-right', highlight_words: ['Castrar'] };
          } else if (selectedBrand === 'inmo') {
            copy = { titulo: 'Villa Lumière', subtitulo: 'Secluded villa surrounded by vineyards', cta: 'Consultar', caption: 'Provence, Francia. Un espacio exclusivo para respirar aire puro. #PrimeProperties' };
            art = { template: 'template_foto_full_texto_minimo', bg: '#e8e2d5', text_color: '#1a1a1a', accent_color: config.colors[2], title_size: 'lg', layout: 'editorial', logo_position: 'none', highlight_words: [] };
          } else {
            copy = { titulo: 'Hecho con cariño', subtitulo: 'Nuevo amigurumi tejido.', cta: 'Ver Detalles', caption: 'Cada punto tejido lleva dedicación y amor. Hilo 100% natural. #KnitAndPurl' };
            art = { template: 'template_producto_centrado_crema', bg: '#f5efe0', text_color: config.colors[0], accent_color: config.colors[2], title_size: 'lg', layout: 'centrado', logo_position: 'top-left', highlight_words: ['cariño'] };
          }
          resolve({
            png_url: 'MOCK_HTML_INJECTION',
            copy,
            art,
            caption: copy.caption
          });
        }, 1500);
      });
    });

    // Secuencia visual de loaders (Premium: mínimo 3.2 segundos totales)
    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setGenStepText(steps[stepIdx]);
        setGenProgress((stepIdx + 1) * 25);
      } else {
        clearInterval(progressInterval);
      }
    }, 800);

    // Esperar a que se completen tanto los loaders mínimos como la promesa del pipeline
    const [result] = await Promise.all([
      pipelinePromise,
      new Promise(resolve => setTimeout(resolve, 3200)) // Esperar a que los loaders completen la animación
    ]);

    setPipelineResult(result);
    setScreen('result');
  };

  // Registrar Aprendizaje: Aprobar y Descargar (T09/T10)
  const handleApprove = async () => {
    triggerToast('Aprobado y Descargado ✓');
    
    // Registrar señal de aprobación en Supabase (T10)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedBrand,
          action: 'approved',
          copy: pipelineResult.copy,
          art: pipelineResult.art
        })
      });
    } catch (err) {
      console.error('Error al registrar aprobación:', err);
    }
  };

  // Registrar Aprendizaje: Rechazar / Pedir Cambios (T09/T10)
  const handleSendFeedback = async () => {
    if (!feedbackNote.trim()) return;

    triggerToast('Feedback guardado ✓');
    setShowFeedbackModal(false);

    // Registrar señal de rechazo en Supabase (T10)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedBrand,
          action: 'rejected',
          note: feedbackNote,
          copy: pipelineResult.copy,
          art: pipelineResult.art
        })
      });
    } catch (err) {
      console.error('Error al registrar rechazo:', err);
    }

    setFeedbackNote('');

    // El ticket T09 indica: "Pedir cambios: en M1 NO regenera. Abre modal, guarda nota y cierra."
    // Adicionalmente, podemos enviar al usuario de vuelta al chat con un mensaje de confirmación.
    setScreen('pedido');
    setMessages(prev => [
      ...prev,
      { sender: 'me', text: `Feedback enviado: "${feedbackNote}"` },
      { sender: 'ai', text: 'Entendido, guardé las notas de ajuste en La Bóveda para la próxima generación. ¿Querés probar redactando otro pedido?' }
    ]);
  };

  return (
    <main className="app-container">

        {/* S0: Login Real (T03) */}
        <section className={`screen nonav ${screen === 'login' ? 'active' : ''}`} id="s-login">
          <div className="body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <div className="login-logo" style={{ marginBottom: 10 }}>AM<b>VI</b></div>
            <div className="login-sub" style={{ marginBottom: 30 }}>Iniciá sesión en tu cuenta</div>
            
            <div className="fakelog" style={{ display: 'flex', flexDirection: 'column' }}>
              <input 
                className="input" 
                placeholder="Usuario (ej. vetcare)" 
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                style={{ marginBottom: 12 }} 
              />
              <input 
                className="input" 
                type="password" 
                placeholder="Contraseña" 
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                style={{ marginBottom: 20 }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button className="btn green" onClick={handleLogin}>
                Ingresar
              </button>
              
              <div className="hint" style={{ marginTop: 25, lineHeight: '1.6' }}>
                <b>Cuentas de prueba:</b><br/>
                Usuario: <b>vetcare</b> | Pass: <b>1234</b><br/>
                Usuario: <b>prime</b> | Pass: <b>1234</b><br/>
                Usuario: <b>knit</b> | Pass: <b>1234</b>
              </div>
            </div>
          </div>
        </section>

        {/* S1: Análisis Animado / Inferencia Simulada (T04) */}
        <section className={`screen nonav ${screen === 'analyze' ? 'active' : ''}`} id="s-analyze">
          <div className="analyze">
            <div 
              className="pulse" 
              style={{ 
                background: BRANDS_CONFIG[selectedBrand].colors[0],
                color: '#fff' 
              }}
            >
              AI
            </div>
            <div>
              <div className="astep">{analyzeStepText}</div>
              <div className="asmall">{analyzeSmallText}</div>
            </div>
          </div>
        </section>

        {/* S2: Bóveda Pre-llena (T04) */}
        <section className={`screen ${screen === 'boveda' ? 'active' : ''}`} id="s-boveda">
          <div className="topbar">
            <span className="logo">Tu Bóveda</span>
            <span className="spacer"></span>
            <span onClick={handleLogout} style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontWeight: 600 }}>Salir</span>
          </div>
          {brandData && (
            <div className="body">
              <span className="inferred">✓ Inferido de {BRANDS_CONFIG[selectedBrand].handle}</span>
              <h2 className="t">Esto encontré de {brandData.identidad.brand_name}</h2>
              <p className="s">Revisá y ajustá lo que quieras. Esto queda como tu identidad.</p>
              
              <div className="bcard">
                <div className="brow">
                  <span className="bk">Logo</span>
                  <div className="lb" style={{ background: brandData.identidad.palette.primary }}>
                    {BRANDS_CONFIG[selectedBrand].ini}
                  </div>
                </div>
                <div className="brow">
                  <span className="bk">Colores</span>
                  <div className="sw">
                    <i style={{ background: brandData.identidad.palette.primary }}></i>
                    <i style={{ background: brandData.identidad.palette.secondary }}></i>
                    <i style={{ background: brandData.identidad.palette.accent }}></i>
                  </div>
                </div>
                <div className="brow">
                  <span className="bk">Tipografía</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-quicksand)' }}>
                    {brandData.identidad.typography.replace('var(--font-', '').replace(')', '')}
                  </span>
                </div>
              </div>

              <div className="bcard">
                <div className="bk" style={{ marginBottom: 10 }}>Tono</div>
                {brandData.identidad.tone.map((t: string) => (
                  <span key={t} className="chip">{t}</span>
                ))}
                <div className="bk" style={{ margin: '13px 0 10px' }}>No comunicar</div>
                {brandData.identidad.restrictions.map((r: string) => (
                  <span key={r} className="chip">{r}</span>
                ))}
              </div>

              <button className="btn green" onClick={handleActivateBoveda}>
                Está perfecto, activar
              </button>
              <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => triggerToast('Edición manual disponible próximamente')}>
                Ajustar algo
              </button>
            </div>
          )}
        </section>

        {/* S3: Pedido Chat (Ejecutivo de Cuentas) */}
        <section className={`screen ${screen === 'pedido' ? 'active' : ''}`} id="s-pedido">
          <div className="topbar">
            <span className="logo">AM<b>VI</b></span>
            <span className="spacer"></span>
            {brandData && (
              <span className="brandchip" style={{ marginRight: 10 }}>
                <span className="av" style={{ background: brandData.identidad.palette.primary }}>
                  {BRANDS_CONFIG[selectedBrand].ini}
                </span>
                {brandData.identidad.brand_name}
              </span>
            )}
            <span onClick={handleLogout} style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontWeight: 600 }}>Salir</span>
          </div>
          <div className="body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div id="pedido-chat">
              {messages.map((m, idx) => (
                <div key={idx} className={`msg ${m.sender}`}>
                  {m.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="composer">
              <input 
                id="pedido-input" 
                value={pedidoInput} 
                onChange={(e) => setPedidoInput(e.target.value)}
                placeholder="Escribí tu pedido…" 
                onKeyDown={(e) => e.key === 'Enter' && handleSendPedido()}
              />
              <button onClick={handleSendPedido}>↑</button>
            </div>
            <div className="hint">Pedí en lenguaje natural, como a un empleado</div>
          </div>
        </section>

        {/* S4: Generando (T06.5 / Loading Secuencial) */}
        <section className={`screen nonav ${screen === 'gen' ? 'active' : ''}`} id="s-gen">
          <div className="gen">
            <div className="pulse" style={{ color: '#E94560', background: '#E94560' }}>✦</div>
            <div className="genstep">{genStepText}</div>
            <div className="genbar">
              <i style={{ width: `${genProgress}%` }}></i>
            </div>
            <div className="asmall">Aplicando los colores y el tono de tu Bóveda</div>
          </div>
        </section>

        {/* S5: Resultado Mockup Feed (T09) */}
        <section className={`screen ${screen === 'result' ? 'active' : ''}`} id="s-result">
          <div className="topbar">
            <span className="back" onClick={() => setScreen('pedido')}>‹</span>
            <span className="logo">Listo para vos</span>
          </div>
          {pipelineResult && brandData && (
            <div className="body">
              <h2 className="t" style={{ fontSize: 19 }}>Tu pieza con la marca de {brandData.identidad.brand_name}</h2>
              <p className="s">Revisá, descargá o pedí cambios.</p>
              
              <div className="ig">
                <div className="ig-head">
                  <div className="ig-av" style={{ background: brandData.identidad.palette.primary }}>
                    {BRANDS_CONFIG[selectedBrand].ini}
                  </div>
                  <div className="ig-nm">
                    {BRANDS_CONFIG[selectedBrand].handle.replace('@', '')}
                    <span>Patrocinado</span>
                  </div>
                  <div className="ig-dots">⋯</div>
                </div>

                <div className="ig-canvas">
                  {/* Si el render Puppeteer falló o está en offline mock, usamos fallback local HTML */}
                  {pipelineResult.png_url === 'MOCK_HTML_INJECTION' ? (
                    BRANDS_CONFIG[selectedBrand].render_fallback(
                      pipelineResult.copy,
                      pipelineResult.art,
                      brandData.identidad.logo_url
                    )
                  ) : (
                    <img 
                      src={pipelineResult.png_url} 
                      alt="Post Generado" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  )}
                </div>

                <div className="ig-acts">♡ &nbsp; ◇ &nbsp; ⤴</div>
                <div className="ig-cap">
                  <b>{BRANDS_CONFIG[selectedBrand].handle.replace('@', '')}</b> {pipelineResult.caption}
                </div>
              </div>

              <div className="btn-row">
                <button className="btn ghost" onClick={() => setShowFeedbackModal(true)}>
                  Pedir cambios
                </button>
                <button className="btn green" onClick={handleApprove}>
                  Aprobar y descargar
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Barra de Navegación Inferior (Activa en Bóveda, Pedido y Resultado) */}
        {['boveda', 'pedido', 'result'].includes(screen) && (
          <div className="navbar" id="navbar">
            <button 
              className={screen === 'pedido' ? 'on' : ''} 
              onClick={() => setScreen('pedido')}
            >
              <span className="ic">✦</span>Crear
            </button>
            <button 
              className={screen === 'result' ? 'on' : ''} 
              disabled={!pipelineResult}
              onClick={() => pipelineResult && setScreen('result')}
            >
              <span className="ic">▦</span>Piezas
            </button>
            <button 
              className={screen === 'boveda' ? 'on' : ''} 
              onClick={() => setScreen('boveda')}
            >
              <span className="ic">◈</span>Bóveda
            </button>
          </div>
        )}

        {/* Modal de Pedir Cambios / Feedback (T09/T10) */}
        {showFeedbackModal && (
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <div 
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 20,
                width: '100%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>¿Qué cambios te gustaría hacer?</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 15 }}>
                Tu nota se guardará en La Bóveda como aprendizaje de estilo para las próximas piezas.
              </p>
              <textarea
                style={{
                  width: '100%',
                  height: 100,
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--line)',
                  borderRadius: 12,
                  padding: 10,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'none',
                  marginBottom: 15
                }}
                placeholder="Ej. 'Evitá usar fondos oscuros' o 'Hacé el título más corto'..."
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
              />
              <div className="btn-row">
                <button className="btn ghost" onClick={() => setShowFeedbackModal(false)}>
                  Cancelar
                </button>
                <button className="btn" onClick={handleSendFeedback}>
                  Guardar Nota
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="toast show" id="toast">
            {toast}
          </div>
        )}
    </main>
  );
}
