'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('marcas_boveda')
          .select('onboarding_completo')
          .eq('tenant_id', user.id)
          .single()
          .then(({ data }) => {
            if (data && data.onboarding_completo) {
              router.push('/app');
            } else {
              router.push('/onboarding');
            }
          });
      } else {
        router.push('/login');
      }
    });
  }, [router]);

  return (
    <main className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ fontFamily: 'var(--font-quicksand)', color: '#6B7280' }}>Cargando AMVI…</p>
    </main>
  );
}
