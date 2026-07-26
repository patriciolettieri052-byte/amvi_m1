import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir archivos estáticos, api routes y _next sin intercepción
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Interceptar token de sesión de cookies o header Authorization
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.replace('Bearer ', '');
  
  // Buscar token en cookies de Supabase
  const sbAuthToken = request.cookies.get('sb-access-token')?.value || 
                      request.cookies.get('supabase-auth-token')?.value ||
                      bearerToken;

  const isAuthRoute = pathname === '/login' || pathname === '/registro';
  const isOnboardingRoute = pathname === '/onboarding';
  const isAppRoute = pathname === '/app' || pathname === '/';

  // Si no hay token de autenticación
  if (!sbAuthToken) {
    if (isAuthRoute) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar usuario contra Supabase Auth
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${sbAuthToken}` } }
    });

    const { data: { user }, error } = await supabase.auth.getUser(sbAuthToken);

    if (error || !user) {
      if (isAuthRoute) return NextResponse.next();
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Consultar estado de onboarding en marcas_boveda
    const { data: boveda } = await supabase
      .from('marcas_boveda')
      .select('onboarding_completo')
      .eq('tenant_id', user.id)
      .single();

    const onboardingCompleto = boveda?.onboarding_completo === true;

    if (!onboardingCompleto) {
      if (isOnboardingRoute) return NextResponse.next();
      return NextResponse.redirect(new URL('/onboarding', request.url));
    } else {
      if (isAuthRoute || isOnboardingRoute) {
        return NextResponse.redirect(new URL('/app', request.url));
      }
    }

  } catch (err) {
    console.error('Error en middleware:', err);
    if (isAuthRoute) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
