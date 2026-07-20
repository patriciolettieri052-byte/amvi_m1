'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function RegistroPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Error al registrar el usuario');
      }

      // Si Supabase devuelve sesión activa (confirmación de email desactivada)
      if (authData.session) {
        router.push('/onboarding');
      } else {
        // Si requiere confirmación por mail
        setSuccessMsg('¡Cuenta creada con éxito! Por favor revisá tu casilla de correo y confirmá tu email para iniciar sesión y empezar el onboarding.');
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-quicksand)', fontSize: '2.5rem', color: '#111827', margin: '0 0 8px 0', fontWeight: 700 }}>AMVI</h1>
        <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>Tu Agencia de Marketing Virtual Inhouse</p>
      </div>

      <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#111827', marginTop: 0, marginBottom: '20px', fontWeight: 600 }}>Creá tu cuenta de prueba</h2>

        {errorMsg && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        {successMsg ? (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '16px', borderRadius: '10px', fontSize: '0.95rem', textAlign: 'center', lineHeight: '1.5' }}>
            <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>{successMsg}</p>
            <Link href="/login" style={{ color: 'var(--coral, #FF4F4F)', fontWeight: 700, textDecoration: 'none' }}>
              Ir al Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg, #F7F6F2)', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '0.95rem', color: '#111827', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg, #F7F6F2)', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '0.95rem', color: '#111827', outline: 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', background: 'var(--coral, #FF4F4F)', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', marginTop: '8px', transition: 'all 0.2s' }}
            >
              {loading ? 'Creando tu cuenta…' : 'Crear Cuenta y Comenzar'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" style={{ color: 'var(--coral, #FF4F4F)', fontWeight: 600, textDecoration: 'none' }}>
            Iniciá sesión acá
          </Link>
        </div>
      </div>
    </main>
  );
}
