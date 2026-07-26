'use client';

import { useState } from 'react';

interface ExecutiveChatProps {
  token?: string;
  onConceptCreated?: () => void;
}

interface MessageItem {
  sender: 'user' | 'executive';
  text: string;
  sugerencias?: Array<{ concepto: string; tipo: string }>;
}

export default function ExecutiveChat({ token, onConceptCreated }: ExecutiveChatProps) {
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      sender: 'executive',
      text: '¡Hola! Soy tu Director de Cuenta en AMVI. Conozco tu rubro, tu identidad y tus preferencias aprendidas. ¿Qué dudas tenés sobre la estrategia o comunicación de tu marca?'
    }
  ]);

  const handleSend = async () => {
    if (!inputMsg.trim() || loading) return;
    const userText = inputMsg;
    setInputMsg('');

    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ejecutivo', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mensaje: userText })
      });

      if (!res.ok) {
        throw new Error('Error al consultar al Agente Ejecutivo');
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: 'executive',
          text: data.respuesta,
          sugerencias: data.conceptos_sugeridos || undefined
        }
      ]);

    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'executive',
          text: 'Disculpá, tuve un inconveniente al consultar tu Bóveda. Por favor volvé a intentar.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdoptConcept = async (concepto: string, tipo: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/pipeline/concepto', {
        method: 'POST',
        headers,
        body: JSON.stringify({ pedido: concepto, tipo })
      });

      if (res.ok && onConceptCreated) {
        onConceptCreated();
      }
    } catch (err) {
      console.error('Error adoptando concepto:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '16px' }}>
      
      <div style={{ paddingBottom: '12px', borderBottom: '1px solid #F3F4F6', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827', fontWeight: 700 }}>Director de Cuenta / Agente Ejecutivo</h3>
        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Conocimiento articulado de tu Bóveda, ADN y Directivas</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              padding: '12px 16px',
              borderRadius: '14px',
              background: m.sender === 'user' ? 'var(--coral, #FF4F4F)' : '#F9FAFB',
              color: m.sender === 'user' ? '#FFFFFF' : '#111827',
              border: m.sender === 'user' ? 'none' : '1px solid #E5E7EB',
              fontSize: '0.9rem',
              lineHeight: '1.5'
            }}
          >
            <div>{m.text}</div>

            {m.sugerencias && m.sugerencias.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>Propuestas sugeridas:</span>
                {m.sugerencias.map((s, sIdx) => (
                  <div key={sIdx} style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#111827', fontWeight: 600 }}>{s.concepto}</span>
                    <button
                      onClick={() => handleAdoptConcept(s.concepto, s.tipo)}
                      style={{ padding: '6px 12px', background: 'var(--coral, #FF4F4F)', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Sumar al Plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Consultá a tu Ejecutivo (ej: ¿Qué hacemos para el día del niño?)..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
          style={{ flex: 1, padding: '12px 14px', background: 'var(--input-bg, #F7F6F2)', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !inputMsg.trim()}
          style={{ padding: '12px 18px', background: 'var(--coral, #FF4F4F)', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          {loading ? 'Consultando…' : 'Preguntar'}
        </button>
      </div>

    </div>
  );
}
