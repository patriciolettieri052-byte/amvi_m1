'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function EnginePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // Tab activo: 'creacion' | 'contenidos' | 'boveda'
  const [activeTab, setActiveTab] = useState<'creacion' | 'contenidos' | 'boveda'>('creacion');
  const [screenState, setScreenState] = useState<'idle' | 'loading' | 'result'>('idle');

  // Bóveda y Piezas
  const [brandData, setBrandData] = useState<any>(null);
  const [piecesList, setPiecesList] = useState<any[]>([]);

  // Estados del Chat y Generación
  const [pedidoInput, setPedidoInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'me'; text: string }>>([]);
  const [genStepText, setGenStepText] = useState('Pensando el ángulo…');
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  // Feedback Modal & Toast
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Cargar Sesión, Bóveda e Historial al montar
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setSession(session);

      // Cargar Bóveda
      try {
        const res = await fetch('/api/boveda', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (!res.ok) {
          router.push('/onboarding');
          return;
        }

        const bData = await res.json();
        if (!bData.onboarding_completo) {
          router.push('/onboarding');
          return;
        }

        setBrandData(bData);

        // Inicializar mensaje de bienvenida
        const brandName = bData?.identidad?.brand_name || 'tu marca';
        setMessages([
          {
            sender: 'ai',
            text: `¡Hola! Tu Bóveda de ${brandName} está activa. ¿Qué querés publicar hoy?`
          }
        ]);

        // Cargar historial de piezas
        const { data: pList } = await supabase
          .from('piezas')
          .select('*')
          .eq('tenant_id', session.user.id)
          .order('created_at', { ascending: false });

        setPiecesList(pList || []);

      } catch (err) {
        console.error(err);
        router.push('/login');
      } finally {
        setLoadingAuth(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Ejecutar el Pipeline de Generación
  const runGenerationPipeline = async (pedidoText: string) => {
    if (piecesList.length >= 5) {
      triggerToast('Has alcanzado el límite máximo de 5 piezas de la versión Beta.');
      return;
    }

    setScreenState('loading');
    setGenStepText('Pensando el ángulo…');

    const steps = [
      'Pensando el ángulo…',
      'Redactando el copy con tu tono…',
      'Diseñando con tus colores…',
      'Maquetando la pieza en HD…'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setGenStepText(steps[currentStep]);
      } else {
        clearInterval(interval);
      }
    }, 800);

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ pedido: pedidoText })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error en el pipeline de generación');
      }

      const result = await res.json();

      // Esperar animación de maquetado (3.2s)
      await new Promise((resolve) => setTimeout(resolve, 3200));

      setPipelineResult(result);
      setScreenState('result');

      // Recargar lista de piezas
      const { data: updatedList } = await supabase
        .from('piezas')
        .select('*')
        .eq('tenant_id', session.user.id)
        .order('created_at', { ascending: false });

      setPiecesList(updatedList || []);

    } catch (err: any) {
      console.error(err);
      triggerToast('Error: ' + err.message);
      setScreenState('idle');
    } finally {
      clearInterval(interval);
    }
  };

  const handleSendMessage = () => {
    if (!pedidoInput.trim()) return;
    const text = pedidoInput;
    setMessages((prev) => [...prev, { sender: 'me', text }]);
    setPedidoInput('');
    runGenerationPipeline(text);
  };

  // Feedback: Aprobar
  const handleApprove = async () => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'approved',
          copy: pipelineResult.copy,
          art: pipelineResult.art
        })
      });
      triggerToast('Pieza aprobada y guardada en tu historial');
    } catch (err) {
      console.error(err);
    }
  };

  // Feedback: Rechazar con nota
  const handleSendFeedbackNote = async () => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'rejected',
          note: feedbackNote,
          copy: pipelineResult.copy,
          art: pipelineResult.art
        })
      });
      setShowFeedbackModal(false);
      triggerToast('Gracias. Guardamos tu nota para futuras iteraciones.');
      setScreenState('idle');
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingAuth) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-quicksand)', color: '#6B7280' }}>Cargando AMVI…</p>
      </div>
    );
  }

  const identidad = brandData?.identidad || {};

  return (
    <main className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '16px 16px 72px 16px', position: 'relative' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div className="toast" style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#FFF', padding: '12px 20px', borderRadius: '30px', fontSize: '0.875rem', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast}
        </div>
      )}

      {/* Header Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #E5E7EB', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontFamily: 'var(--font-quicksand)', fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>AMVI</h1>
          <span style={{ fontSize: '0.75rem', background: '#FFF0F2', color: 'var(--coral, #E94560)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>BETA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: piecesList.length >= 5 ? '#991B1B' : '#4B5563', fontWeight: 600 }}>
            Piezas: {piecesList.length}/5
          </span>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none' }}>
            Salir
          </button>
        </div>
      </header>

      {/* CONTENIDO TAB 1: CREACIÓN (CHAT & GENERACIÓN) */}
      {activeTab === 'creacion' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {screenState === 'idle' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: m.sender === 'me' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: m.sender === 'me' ? 'var(--coral, #E94560)' : '#F3F4F6',
                      color: m.sender === 'me' ? '#FFFFFF' : '#111827',
                      fontSize: '0.95rem',
                      lineHeight: '1.5'
                    }}
                  >
                    {m.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={piecesList.length >= 5 ? 'Límite de 5 piezas alcanzado' : 'Escribí tu pedido de pieza...'}
                  disabled={piecesList.length >= 5}
                  value={pedidoInput}
                  onChange={(e) => setPedidoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  style={{ flex: 1, padding: '14px', background: 'var(--input-bg, #F7F6F2)', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '0.95rem', outline: 'none' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={piecesList.length >= 5 || !pedidoInput.trim()}
                  style={{ padding: '14px 20px', background: 'var(--coral, #E94560)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Enviar
                </button>
              </div>
            </div>
          )}

          {screenState === 'loading' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ width: '50px', height: '50px', border: '4px solid #E5E7EB', borderTopColor: 'var(--coral, #E94560)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
              <h2 style={{ fontSize: '1.2rem', color: '#111827', marginBottom: '8px' }}>{genStepText}</h2>
              <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>Procesando con Agente Copy y Agente Arte</p>
            </div>
          )}

          {screenState === 'result' && pipelineResult && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                <img src={pipelineResult.png_url} alt="Pieza Generada" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '12px', marginBottom: '16px' }} />
                
                <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: '#374151', textAlign: 'left', marginBottom: '16px' }}>
                  <strong>Caption Sugerido:</strong>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{pipelineResult.caption}</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleApprove} style={{ flex: 1, padding: '12px', background: '#166534', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                    Aprobar y Guardar
                  </button>
                  <button onClick={() => setShowFeedbackModal(true)} style={{ flex: 1, padding: '12px', background: '#E5E7EB', color: '#374151', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                    Pedir Cambios
                  </button>
                </div>
              </div>

              <button onClick={() => setScreenState('idle')} style={{ padding: '12px', background: 'none', border: '1px solid #E5E7EB', borderRadius: '10px', color: '#4B5563', fontWeight: 600, cursor: 'pointer' }}>
                Crear otra pieza
              </button>
            </div>
          )}

        </div>
      )}

      {/* CONTENIDO TAB 2: PIEZAS / CONTENIDOS */}
      {activeTab === 'contenidos' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#111827', marginBottom: '16px' }}>Historial de Piezas Generadas</h2>

          {piecesList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
              <p>Aún no generaste piezas.</p>
              <button onClick={() => setActiveTab('creacion')} style={{ marginTop: '12px', padding: '10px 20px', background: 'var(--coral, #E94560)', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Crear mi primera pieza
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {piecesList.map((p) => (
                <div key={p.id} style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <img src={p.imagen_url} alt="Pieza" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{p.pedido}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO TAB 3: BÓVEDA DE MARCA */}
      {activeTab === 'boveda' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <img src={identidad.logo_url} alt="Logo" style={{ width: '54px', height: '54px', borderRadius: '12px', objectFit: 'cover' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#111827' }}>{identidad.brand_name || 'Mi Marca'}</h2>
                <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Rubro: {(brandData?.vertical || 'General').toUpperCase()}</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Paleta de Colores</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: identidad.palette?.primary || '#111827' }} />
                <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: identidad.palette?.secondary || '#4B5563' }} />
                <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: identidad.palette?.accent || '#E94560' }} />
              </div>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: '#374151' }}>
              <strong>Tipografía:</strong> {identidad.typography || 'Quicksand'}
            </div>

            <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: '#374151' }}>
              <strong>Tono Entendido:</strong> {identidad.tone?.join(', ') || 'Profesional'}
            </div>

            <div style={{ fontSize: '0.85rem', color: '#374151' }}>
              <strong>Público Objetivo:</strong> {brandData?.audiencia?.publico_objetivo || 'General'}
            </div>
          </div>
        </div>
      )}

      {/* BARRA NAVEGACIÓN INFERIOR (NAVBAR TABS) */}
      <nav className="navbar">
        <button
          className={activeTab === 'creacion' ? 'on' : ''}
          onClick={() => { setActiveTab('creacion'); setScreenState('idle'); }}
        >
          <span className="ic">✎</span>
          <span>Creación</span>
        </button>

        <button
          className={activeTab === 'contenidos' ? 'on' : ''}
          onClick={() => setActiveTab('contenidos')}
        >
          <span className="ic">▦</span>
          <span>Contenidos</span>
        </button>

        <button
          className={activeTab === 'boveda' ? 'on' : ''}
          onClick={() => setActiveTab('boveda')}
        >
          <span className="ic">⚙</span>
          <span>Bóveda</span>
        </button>
      </nav>

      {/* Modal de Pedir Cambios */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 2000 }}>
          <div style={{ background: '#FFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Pedir Cambios</h3>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '16px' }}>
              ¿Qué no te gustó o qué querés ajustar para la próxima?
            </p>
            <textarea
              rows={4}
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Ej: Prefiero textos más cortos o colores más claros..."
              style={{ width: '100%', padding: '12px', background: 'var(--input-bg, #F7F6F2)', border: '1px solid #E5E7EB', borderRadius: '10px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSendFeedbackNote} style={{ flex: 1, padding: '12px', background: 'var(--coral, #E94560)', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 600 }}>
                Guardar Nota
              </button>
              <button onClick={() => setShowFeedbackModal(false)} style={{ padding: '12px', background: '#E5E7EB', border: 'none', borderRadius: '8px', fontWeight: 600 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
