'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ADNs de respaldo por defecto para colores/tipografía según rubro
const DEFAULT_ADN: Record<string, any> = {
  veterinaria: {
    palette: { primary: '#004d40', secondary: '#80cbc4', accent: '#ffab00' },
    typography: 'var(--font-nunito)',
    restrictions: ['no usar lenguaje médico complejo', 'no mostrar imágenes sensibles']
  },
  inmobiliaria: {
    palette: { primary: '#1a237e', secondary: '#9fa8da', accent: '#ffd54f' },
    typography: 'var(--font-cormorant)',
    restrictions: ['no usar lenguaje informal o jerga', 'nunca usar signos de exclamación exagerados']
  },
  crochet: {
    palette: { primary: '#f48fb1', secondary: '#f8bbd0', accent: '#ec407a' },
    typography: 'var(--font-quicksand)',
    restrictions: ['evitar palabras de producción industrial', 'no presionar a la venta dura']
  },
  otro: {
    palette: { primary: '#111827', secondary: '#4B5563', accent: '#E05638' },
    typography: 'var(--font-quicksand)',
    restrictions: []
  }
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Estados del Formulario de Onboarding
  const [brandName, setBrandName] = useState('');
  const [descNegocio, setDescNegocio] = useState('');
  const [rubroDetected, setRubroDetected] = useState<'veterinaria' | 'inmobiliaria' | 'crochet' | 'otro'>('otro');
  const [rubroConfianza, setRubroConfianza] = useState<'alta' | 'baja'>('baja');
  const [rubroConfirmado, setRubroConfirmado] = useState<string>('otro');

  // Colores y Tipografía
  const [colorMode, setColorMode] = useState<'recommend' | 'custom'>('recommend');
  const [customColors, setCustomColors] = useState({ primary: '#004d40', secondary: '#80cbc4', accent: '#ffab00' });
  
  const [fontMode, setFontMode] = useState<'recommend' | 'custom'>('recommend');
  const [customFont, setCustomFont] = useState('var(--font-quicksand)');

  // Logo
  const [logoOption, setLogoOption] = useState<'later' | 'url'>('later');
  const [logoUrl, setLogoUrl] = useState('');

  // Tono / Personalidad
  const [descPersonalidad, setDescPersonalidad] = useState('');
  const [toneInferred, setToneInferred] = useState<any>({
    cercania: 'cercano',
    energia: 'equilibrado',
    estilo: 'didactico',
    resumen_tono: 'Tono cercano, empático y profesional'
  });

  // Audiencia
  const [publicoObjetivo, setPublicoObjetivo] = useState('');

  // Verificar autenticación al montar
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
    });
  }, [router]);

  // Paso 2 -> 3: Llamada IA #1 (Detección de Rubro)
  const handleAnalyzeNegocio = async () => {
    if (!descNegocio.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/onboarding/rubro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: descNegocio })
      });
      const data = await res.json();

      if (data.brand_name_sugerido) {
        setBrandName(data.brand_name_sugerido);
      }
      setRubroDetected(data.rubro || 'otro');
      setRubroConfianza(data.confianza || 'baja');
      setRubroConfirmado(data.rubro || 'otro');
      setStep(3);
    } catch (err) {
      console.error('Error analizando rubro:', err);
      setRubroConfirmado('otro');
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  // Paso 7 -> 8: Llamada IA #2 (Inferencia de Tono)
  const handleAnalyzePersonalidad = async () => {
    if (!descPersonalidad.trim()) {
      setStep(8);
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/onboarding/tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: descPersonalidad })
      });
      const data = await res.json();
      setToneInferred(data);
      setStep(8);
    } catch (err) {
      console.error('Error infiriendo tono:', err);
      setStep(8);
    } finally {
      setLoading(false);
    }
  };

  // Paso 9: Guardar la Bóveda en Supabase y Finalizar
  const handleFinishOnboarding = async () => {
    if (!user) return;
    setLoading(true);

    const activeAdn = DEFAULT_ADN[rubroConfirmado] || DEFAULT_ADN.otro;
    const finalPalette = colorMode === 'recommend' ? activeAdn.palette : customColors;
    const finalFont = fontMode === 'recommend' ? activeAdn.typography : customFont;
    const finalLogo = logoOption === 'url' && logoUrl ? logoUrl : `https://placehold.co/400x400/111827/ffffff?text=${encodeURIComponent(brandName.slice(0, 2).toUpperCase() || 'AM')}`;

    try {
      const { error } = await supabase
        .from('marcas_boveda')
        .upsert({
          tenant_id: user.id,
          vertical: rubroConfirmado,
          identidad: {
            brand_name: brandName || 'Mi Marca',
            logo_url: finalLogo,
            palette: finalPalette,
            typography: finalFont,
            tone: [toneInferred.cercania, toneInferred.energia, toneInferred.estilo],
            restrictions: activeAdn.restrictions
          },
          conversacion: toneInferred,
          audiencia: { publico_objetivo: publicoObjetivo },
          aprendizaje: { approved: [], rejected: [], notes: [] },
          onboarding_completo: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
      router.push('/app');
    } catch (err: any) {
      alert('Error guardando tu Bóveda: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '24px' }}>
      {/* Indicador de Progreso (Pasos 1 a 9) */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color, #E05638)' }}>Paso {step} de 9</span>
        <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', margin: '0 12px' }}>
          <div style={{ width: `${(step / 9) * 100}%`, height: '100%', background: 'var(--accent-color, #E05638)', borderRadius: '3px', transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        {/* PANTALLA 1: Bienvenida */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-quicksand)', fontSize: '2rem', color: '#111827', marginBottom: '16px' }}>¡Bienvenido a AMVI! 🚀</h1>
            <p style={{ color: '#4B5563', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '32px' }}>
              En solo 2 minutos voy a conocer tu marca para empezar a crear contenido ajustado a tu estilo e identidad.
            </p>
            <button
              onClick={() => setStep(2)}
              style={{ width: '100%', padding: '16px', background: 'var(--accent-color, #E05638)', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Empecemos
            </button>
          </div>
        )}

        {/* PANTALLA 2: Contame de tu negocio */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>Contame de tu negocio</h2>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '16px' }}>
              ¿De qué se trata tu emprendimiento? Contanos en una frase.<br/>
              <em>Ej: "Tengo una clínica veterinaria en Salto" o "Vendo carteras tejidas a mano en crochet".</em>
            </p>

            <textarea
              rows={4}
              placeholder="Escribí acá..."
              value={descNegocio}
              onChange={(e) => setDescNegocio(e.target.value)}
              style={{ width: '100%', padding: '14px', background: 'var(--input-bg, #F7F6F2)', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '1rem', marginBottom: '20px', outline: 'none' }}
            />

            <button
              onClick={handleAnalyzeNegocio}
              disabled={loading || !descNegocio.trim()}
              style={{ width: '100%', padding: '14px', background: 'var(--accent-color, #E05638)', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? 'Analizando tu negocio…' : 'Siguiente'}
            </button>
          </div>
        )}

        {/* PANTALLA 3: Confirmar Rubro */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '12px' }}>Confirmemos tu rubro</h2>

            {rubroConfianza === 'alta' && rubroDetected !== 'otro' ? (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '20px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
                <p style={{ fontSize: '1.1rem', color: '#166534', margin: '0 0 16px 0' }}>
                  ¡Genial! Detectamos que tu negocio es de <strong>{rubroDetected.toUpperCase()}</strong>. ¿Es así?
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => { setRubroConfirmado(rubroDetected); setStep(4); }}
                    style={{ flex: 1, padding: '12px', background: '#166534', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Sí, exacto
                  </button>
                  <button
                    onClick={() => setRubroConfianza('baja')}
                    style={{ flex: 1, padding: '12px', background: '#E5E7EB', color: '#374151', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    No, es otro
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: '#4B5563', marginBottom: '16px' }}>Seleccioná la categoría que mejor representa a tu marca:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { key: 'veterinaria', label: '🐾 Veterinaria / Mascotas' },
                    { key: 'inmobiliaria', label: '🏠 Inmobiliaria / Propiedades' },
                    { key: 'crochet', label: '🧶 Crochet / Artesanías' },
                    { key: 'otro', label: '✨ Otro rubro' }
                  ].map((r) => (
                    <button
                      key={r.key}
                      onClick={() => { setRubroConfirmado(r.key); setStep(4); }}
                      style={{ padding: '14px', background: rubroConfirmado === r.key ? '#FEF2F2' : '#FFFFFF', border: `2px solid ${rubroConfirmado === r.key ? '#E05638' : '#E5E7EB'}`, borderRadius: '10px', textAlign: 'left', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANTALLA 4: Colores */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>Colores de tu marca</h2>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>
              ¿Tenés colores definidos o preferís que te recomendemos según tu rubro?
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => setColorMode('recommend')}
                style={{ flex: 1, padding: '14px', background: colorMode === 'recommend' ? '#FEF2F2' : '#FFF', border: `2px solid ${colorMode === 'recommend' ? '#E05638' : '#E5E7EB'}`, borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
              >
                Recomendame ✨
              </button>
              <button
                onClick={() => setColorMode('custom')}
                style={{ flex: 1, padding: '14px', background: colorMode === 'custom' ? '#FEF2F2' : '#FFF', border: `2px solid ${colorMode === 'custom' ? '#E05638' : '#E5E7EB'}`, borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
              >
                Tengo mis colores
              </button>
            </div>

            {colorMode === 'custom' && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Principal</label>
                  <input type="color" value={customColors.primary} onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })} style={{ width: '100%', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Secundario</label>
                  <input type="color" value={customColors.secondary} onChange={(e) => setCustomColors({ ...customColors, secondary: e.target.value })} style={{ width: '100%', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Acento</label>
                  <input type="color" value={customColors.accent} onChange={(e) => setCustomColors({ ...customColors, accent: e.target.value })} style={{ width: '100%', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                </div>
              </div>
            )}

            <button onClick={() => setStep(5)} style={{ width: '100%', padding: '14px', background: 'var(--accent-color, #E05638)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Siguiente
            </button>
          </div>
        )}

        {/* PANTALLA 5: Tipografía */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>Tipografía</h2>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>
              Seleccioná el estilo de fuente para tus piezas:
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setFontMode('recommend')} style={{ flex: 1, padding: '14px', background: fontMode === 'recommend' ? '#FEF2F2' : '#FFF', border: `2px solid ${fontMode === 'recommend' ? '#E05638' : '#E5E7EB'}`, borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                Recomendame ✨
              </button>
              <button onClick={() => setFontMode('custom')} style={{ flex: 1, padding: '14px', background: fontMode === 'custom' ? '#FEF2F2' : '#FFF', border: `2px solid ${fontMode === 'custom' ? '#E05638' : '#E5E7EB'}`, borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                Elegir fuente
              </button>
            </div>

            {fontMode === 'custom' && (
              <select value={customFont} onChange={(e) => setCustomFont(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E5E7EB', marginBottom: '20px', fontSize: '1rem' }}>
                <option value="var(--font-quicksand)">Quicksand (Amigable y Cálida)</option>
                <option value="var(--font-nunito)">Nunito (Moderna y Redondeada)</option>
                <option value="var(--font-cormorant)">Cormorant (Elegante y Editorial)</option>
              </select>
            )}

            <button onClick={() => setStep(6)} style={{ width: '100%', padding: '14px', background: 'var(--accent-color, #E05638)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Siguiente
            </button>
          </div>
        )}

        {/* PANTALLA 6: Logo */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>Logo de tu marca</h2>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>
              ¿Tenés tu logo a mano? Podés poner el enlace ahora o agregarlo después.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setLogoOption('later')} style={{ flex: 1, padding: '14px', background: logoOption === 'later' ? '#FEF2F2' : '#FFF', border: `2px solid ${logoOption === 'later' ? '#E05638' : '#E5E7EB'}`, borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                Lo subo después
              </button>
              <button onClick={() => setLogoOption('url')} style={{ flex: 1, padding: '14px', background: logoOption === 'url' ? '#FEF2F2' : '#FFF', border: `2px solid ${logoOption === 'url' ? '#E05638' : '#E5E7EB'}`, borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                Poner URL del Logo
              </button>
            </div>

            {logoOption === 'url' && (
              <input type="url" placeholder="https://tu-sitio.com/logo.png" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E5E7EB', marginBottom: '20px' }} />
            )}

            <button onClick={() => setStep(7)} style={{ width: '100%', padding: '14px', background: 'var(--accent-color, #E05638)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Siguiente
            </button>
          </div>
        )}

        {/* PANTALLA 7: Personalidad del Negocio */}
        {step === 7 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>Personalidad de tu marca</h2>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '16px' }}>
              ¿Cómo describirías la personalidad de tu negocio? Contanos como si fuera una persona.<br/>
              <em>Ej: "Somos cercanos y relajados, tratamos a cada cliente como a un amigo" o "Somos muy profesionales y formales".</em>
            </p>

            <textarea
              rows={4}
              placeholder="Describí tu tono acá..."
              value={descPersonalidad}
              onChange={(e) => setDescPersonalidad(e.target.value)}
              style={{ width: '100%', padding: '14px', background: 'var(--input-bg, #F7F6F2)', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '1rem', marginBottom: '20px', outline: 'none' }}
            />

            <button onClick={handleAnalyzePersonalidad} disabled={loading} style={{ width: '100%', padding: '14px', background: 'var(--accent-color, #E05638)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Infiriendo personalidad…' : 'Siguiente'}
            </button>
          </div>
        )}

        {/* PANTALLA 8: A quién le vendés */}
        {step === 8 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>¿A quién le vendés?</h2>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '16px' }}>
              ¿Quiénes son tus clientes principales?<br/>
              <em>Ej: "Familias con mascotas", "Jóvenes buscando su primer departamento", "Mamás buscando regalos tejidos".</em>
            </p>

            <input
              type="text"
              placeholder="Ej. Familias con mascotas en la zona..."
              value={publicoObjetivo}
              onChange={(e) => setPublicoObjetivo(e.target.value)}
              style={{ width: '100%', padding: '14px', background: 'var(--input-bg, #F7F6F2)', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '1rem', marginBottom: '20px', outline: 'none' }}
            />

            <button onClick={() => setStep(9)} style={{ width: '100%', padding: '14px', background: 'var(--accent-color, #E05638)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Ver Resumen
            </button>
          </div>
        )}

        {/* PANTALLA 9: Resumen y Confirmación */}
        {step === 9 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>¡Todo listo! Confirmemos tu Bóveda</h2>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>Esto es lo que aprendimos de tu negocio:</p>

            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '24px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Marca:</strong> {brandName || 'Mi Marca'}</div>
              <div><strong>Rubro:</strong> {rubroConfirmado.toUpperCase()}</div>
              <div><strong>Colores:</strong> {colorMode === 'recommend' ? 'Recomendados por ADN' : 'Personalizados'}</div>
              <div><strong>Fuente:</strong> {fontMode === 'recommend' ? 'Recomendada por ADN' : 'Personalizada'}</div>
              <div><strong>Tono entendido:</strong> {toneInferred.resumen_tono}</div>
              <div><strong>Público objetivo:</strong> {publicoObjetivo || 'General'}</div>
            </div>

            <button
              onClick={handleFinishOnboarding}
              disabled={loading}
              style={{ width: '100%', padding: '16px', background: 'var(--accent-color, #E05638)', color: '#FFF', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? 'Guardando tu Bóveda…' : 'Confirmar y Empezar 🚀'}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
