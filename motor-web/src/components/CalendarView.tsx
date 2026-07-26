'use client';

import { useState } from 'react';

interface PiezaItem {
  id: string;
  pedido?: string;
  concepto?: string;
  tipo?: string;
  estado: string;
  fecha_programada?: string;
  imagen_url?: string;
  copy_json?: any;
}

interface CalendarViewProps {
  piezas: PiezaItem[];
  onAprobarLote: (ids: string[]) => void;
  onDescartar: (id: string) => void;
}

export default function CalendarView({ piezas, onAprobarLote, onDescartar }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'semanal' | 'mensual'>('semanal');

  const pendientes = piezas.filter((p) => p.estado === 'concepto_pendiente');
  const aprobadasOEnProgreso = piezas.filter((p) => p.estado !== 'concepto_pendiente' && p.estado !== 'descartada');

  const handleAprobarTodo = () => {
    const ids = pendientes.map((p) => p.id);
    if (ids.length > 0) {
      onAprobarLote(ids);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Selector de Vista: Semanal vs Mensual */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#111827', fontWeight: 700 }}>Plan de Contenido</h2>
        <div style={{ display: 'flex', background: '#F3F4F6', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setViewMode('semanal')}
            style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', background: viewMode === 'semanal' ? '#FFFFFF' : 'none', color: viewMode === 'semanal' ? '#111827' : '#6B7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', boxShadow: viewMode === 'semanal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Vista Semanal
          </button>
          <button
            onClick={() => setViewMode('mensual')}
            style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', background: viewMode === 'mensual' ? '#FFFFFF' : 'none', color: viewMode === 'mensual' ? '#111827' : '#6B7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', boxShadow: viewMode === 'mensual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            Vista Mensual
          </button>
        </div>
      </div>

      {/* VISTA SEMANAL OPERATIVA */}
      {viewMode === 'semanal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Banner de Acción Rápida (Aprobar Semana en 1 Clic) */}
          {pendientes.length > 0 && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#166534', fontWeight: 700 }}>
                  Tenés {pendientes.length} concepto(s) listos para revisar esta semana
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803D' }}>
                  Aprobá la propuesta semanal en un clic para iniciar el diseño visual automático.
                </p>
              </div>
              <button
                onClick={handleAprobarTodo}
                style={{ padding: '12px 20px', background: '#166534', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(22, 101, 52, 0.2)' }}
              >
                Aprobar Semana en 1 Clic
              </button>
            </div>
          )}

          {/* Lista de Tarjetas de Conceptos Pendientes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {piezas.map((p) => {
              const isPendiente = p.estado === 'concepto_pendiente';
              const isDisenada = p.estado === 'disenada';
              const isDisenando = p.estado === 'disenando';

              return (
                <div
                  key={p.id}
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${isPendiente ? '#FDE68A' : isDisenada ? '#BBF7D0' : '#E5E7EB'}`,
                    borderRadius: '14px',
                    padding: '16px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: p.tipo === 'promo' ? '#FEF3C7' : p.tipo === 'novedad' ? '#E0E7FF' : '#E0F2FE', color: p.tipo === 'promo' ? '#92400E' : p.tipo === 'novedad' ? '#3730A3' : '#075985', textTransform: 'uppercase' }}>
                      {p.tipo || 'Educativo'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                      {p.fecha_programada ? new Date(p.fecha_programada).toLocaleDateString() : 'Sin fecha'}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#111827', fontWeight: 600, lineHeight: '1.4' }}>
                    {p.concepto || p.pedido}
                  </p>

                  {isDisenada && p.imagen_url && (
                    <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                      <img src={p.imagen_url} alt="Pieza Diseñada" style={{ maxHeight: '240px', borderRadius: '10px', objectFit: 'contain' }} />
                    </div>
                  )}

                  {isDisenando && (
                    <div style={{ padding: '12px', background: '#F3F4F6', borderRadius: '8px', fontSize: '0.85rem', color: '#4B5563', textAlign: 'center' }}>
                      Diseñando y maquetando pieza en HD…
                    </div>
                  )}

                  {isPendiente && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <button
                        onClick={() => onDescartar(p.id)}
                        style={{ padding: '8px 14px', background: '#F3F4F6', color: '#4B5563', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Descartar
                      </button>
                      <button
                        onClick={() => onAprobarLote([p.id])}
                        style={{ padding: '8px 16px', background: 'var(--coral, #FF4F4F)', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Aprobar este concepto
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA MENSUAL (PRESENTACIÓN GENERAL) */}
      {viewMode === 'mensual' && (
        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#111827' }}>Panorama Mensual de Contenido</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
            {piezas.map((p, idx) => (
              <div key={p.id || idx} style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px', background: '#F9FAFB', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--coral, #FF4F4F)', marginBottom: '4px' }}>
                  {p.fecha_programada ? new Date(p.fecha_programada).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : `Pieza ${idx + 1}`}
                </div>
                <div style={{ color: '#374151', fontSize: '0.75rem', height: '36px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.concepto || p.pedido}
                </div>
                <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: p.estado === 'disenada' ? '#DCFCE7' : '#FEF3C7', color: p.estado === 'disenada' ? '#166534' : '#92400E', fontWeight: 600 }}>
                  {p.estado === 'disenada' ? 'Listo' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
