'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function EnginePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [screen, setScreen] = useState<'boveda' | 'pedido' | 'loading' | 'result'>('boveda');

  // Bóveda y Piezas
  const [brandData, setBrandData] = useState<any>(null);
  const [piecesUsed, setPiecesUsed] = useState(0);

  // Estados del Chat y Generación
  const [pedidoInput, setPedidoInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'me'; text: string }>>([]);
  const [genStepText, setGenStepText] = useState('Pensando el ángulo…');
  const [genProgress, setGenProgress] = useState(0);
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

  // 1. Cargar Sesión y Bóveda al montar
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setSession(session);

      // Cargar Bóveda y Estado de Onboarding
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

        // Cargar piezas usadas
        const { count } = await supabase
          .from('piezas')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', session.user.id);

        setPiecesUsed(count || 0);
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

  // Iniciar la sesión de chat tras ver la Bóveda
  const handleActivateBoveda = () => {
    const brandName = brandData?.identidad?.brand_name || 'tu marca';
    setMessages([
      {
        sender: 'ai',
        text: `¡Hola! Soy AMVI. Tu Bóveda de **${brandName}** está activa. ¿Qué querés publicar hoy?`
      }
    ]);
    setScreen('pedido');
  };

  // Ejecutar el Pipeline de Generación
  const runGenerationPipeline = async (pedidoText: string) => {
    if (piecesUsed >= 5) {
      triggerToast('Has alcanzado el límite máximo de 5 piezas de la versión Beta.');
      return;
    }

    setScreen('loading');
    setGenStepText('Pensando el ángulo…');
    setGenProgress(10);

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
        setGenProgress((currentStep + 1) * 25);
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

      // Esperar la animación mínima de loading (3.2s)
      await new Promise((resolve) => setTimeout(resolve, 3200));

      setPipelineResult(result);
      setPiecesUsed((prev) => prev + 1);
      setScreen('result');
    } catch (err: any) {
      console.error(err);
      triggerToast('Error: ' + err.message);
      setScreen('pedido');
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
      triggerToast('¡Pieza aprobada y guardada en tu historial!');
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
      triggerToast('Gracias. Guardamos tu nota para ajustar las futuras piezas.');
      setScreen('pedido');
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingAuth) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-quicksand)', color: '#6B7280' }}>Cargando tu sesión…</p>
      </div>
    );
  }

  const identidad = brandData?.identidad || {};

  return (
    <main className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '16px' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#FFF', padding: '12px 20px', borderRadius: '30px', fontSize: '0.875rem', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast}
        </div>
      )}

      {/* Header Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #E5E7EB', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontFamily: 'var(--font-quicksand)', fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>AMVI</h1>
          <span style={{ fontSize: '0.75rem', background: '#FEF2F2', color: '#E05638', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>BETA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: piecesUsed >= 5 ? '#991B1B' : '#4B5563', fontWeight: 600 }}>
            Piezas: {piecesUsed}/5
          </span>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none' }}>
            Salir
          </button>
        </div>
      </header>

      {/* PANTALLA: Bóveda Cargada */}
      {screen === 'boveda' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <img src={identidad.logo_url} alt="Logo" style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{identidad.brand_name}</h2>
                <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Bóveda Activa</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: identidad.palette?.primary }} />
              <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: identidad.palette?.secondary }} />
              <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: identidad.palette?.accent }} />
            </div>

            <div style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '20px' }}>
              <strong>Tono:</strong> {identidad.tone?.join(', ')}
            </div>

            <button
              onClick={handleActivateBoveda}
              style={{ width: '100%', padding: '14px', background: 'var(--accent-color, #E05638)', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            >
              Ir a Crear Contenido 🚀
            </button>
          </div>
        </div>
      )}

      {/* PANTALLA: Chat / Pedido */}
      {screen === 'pedido' && (
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
                  background: m.sender === 'me' ? 'var(--accent-color, #E05638)' : '#F3F4F6',
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
              placeholder={piecesUsed >= 5 ? 'Límite de 5 piezas alcanzado' : 'Escribí tu pedido acá...'}
              disabled={piecesUsed >= 5}
              value={pedidoInput}
              onChange={(e) => setPedidoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1, padding: '14px', background: 'var(--input-bg, #F7F6F2)', border: '1px solid #E5E7EB', borderRadius: '12px', fontSize: '0.95rem', outline: 'none' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={piecesUsed >= 5 || !pedidoInput.trim()}
              style={{ padding: '14px 20px', background: 'var(--accent-color, #E05638)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* PANTALLA: Loading de Generación */}
      {screen === 'loading' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', border: '4px solid #E5E7EB', borderTopColor: 'var(--accent-color, #E05638)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }} />
          <h2 style={{ fontSize: '1.25rem', color: '#111827', marginBottom: '8px' }}>{genStepText}</h2>
          <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Orquestando Agente Copy + Agente Arte</p>
        </div>
      )}

      {/* PANTALLA: Resultado */}
      {screen === 'result' && pipelineResult && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
            <img src={pipelineResult.png_url} alt="Pieza Generada" style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '12px', marginBottom: '16px' }} />
            
            <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: '#374151', textAlign: 'left', marginBottom: '16px' }}>
              <strong>Caption Sugerido:</strong>
              <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{pipelineResult.caption}</p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleApprove} style={{ flex: 1, padding: '12px', background: '#166534', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                👍 Aprobar y Guardar
              </button>
              <button onClick={() => setShowFeedbackModal(true)} style={{ flex: 1, padding: '12px', background: '#E5E7EB', color: '#374151', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                👎 Pedir Cambios
              </button>
            </div>
          </div>

          <button onClick={() => setScreen('pedido')} style={{ padding: '12px', background: 'none', border: '1px solid #E5E7EB', borderRadius: '10px', color: '#4B5563', fontWeight: 600, cursor: 'pointer' }}>
            ← Hacer otro pedido
          </button>
        </div>
      )}

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
              <button onClick={handleSendFeedbackNote} style={{ flex: 1, padding: '12px', background: 'var(--accent-color, #E05638)', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 600 }}>
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
