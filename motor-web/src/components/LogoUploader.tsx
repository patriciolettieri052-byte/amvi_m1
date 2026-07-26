'use client';

import { useState } from 'react';

interface LogoUploaderProps {
  initialLogoUrl?: string;
  onLogoSelected: (logoUrl: string) => void;
  onSkip?: () => void;
  token?: string;
}

export default function LogoUploader({ initialLogoUrl, onLogoSelected, onSkip, token }: LogoUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Resultado del backend
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [procesadoUrl, setProcesadoUrl] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<'procesado' | 'original' | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/onboarding/logo', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al subir la imagen');
      }

      const data = await res.json();
      setOriginalUrl(data.original_url);
      setProcesadoUrl(data.procesado_url);
      setSelectedVersion('procesado');

      // Seleccionar por defecto la versión recortada si está disponible
      onLogoSelected(data.procesado_url || data.original_url);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error procesando la imagen');
    } finally {
      setLoading(false);
    }
  };

  const handleChooseVersion = (version: 'procesado' | 'original') => {
    setSelectedVersion(version);
    const chosenUrl = version === 'procesado' ? procesadoUrl : originalUrl;
    if (chosenUrl) {
      onLogoSelected(chosenUrl);
    }
  };

  return (
    <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#111827' }}>Logo de tu Marca</h3>
      <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '16px' }}>
        Subí cualquier foto desde tu celular o PC (marquesina, tarjeta, o imagen). El sistema quitará el fondo automáticamente y podrás previsualizar el resultado.
      </p>

      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#4B5563' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #E5E7EB', borderTopColor: 'var(--coral, #FF4F4F)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '0.9rem', margin: 0 }}>Procesando y recortando el fondo de tu logo…</p>
        </div>
      ) : !originalUrl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'block', padding: '24px', border: '2px dashed #D1D5DB', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', background: '#F9FAFB', transition: 'all 0.2s' }}>
            <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Seleccionar foto o archivo de logo
            </span>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>PNG, JPG, WEBP o foto de celular</span>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          {onSkip && (
            <button
              onClick={onSkip}
              type="button"
              style={{ padding: '12px', background: 'none', border: '1px solid #E5E7EB', borderRadius: '10px', color: '#6B7280', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Lo subo después (Usar nombre en texto)
            </button>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Previsualización del recorte:</p>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            {/* Opción 1: Recortado */}
            <div
              onClick={() => handleChooseVersion('procesado')}
              style={{ flex: 1, padding: '12px', border: `2px solid ${selectedVersion === 'procesado' ? 'var(--coral, #FF4F4F)' : '#E5E7EB'}`, borderRadius: '12px', background: selectedVersion === 'procesado' ? '#FFF0F2' : '#F9FAFB', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ background: 'checkerboard', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <img src={procesadoUrl || ''} alt="Recortado" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>Versión Recortada (Sin fondo)</span>
            </div>

            {/* Opción 2: Original */}
            <div
              onClick={() => handleChooseVersion('original')}
              style={{ flex: 1, padding: '12px', border: `2px solid ${selectedVersion === 'original' ? 'var(--coral, #FF4F4F)' : '#E5E7EB'}`, borderRadius: '12px', background: selectedVersion === 'original' ? '#FFF0F2' : '#F9FAFB', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <img src={originalUrl} alt="Original" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>Imagen Original Tal Cual</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <label style={{ flex: 1, padding: '10px', background: '#F3F4F6', color: '#374151', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              Subir otra foto
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
