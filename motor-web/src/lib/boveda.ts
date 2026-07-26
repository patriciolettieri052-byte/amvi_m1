import { supabase, getSupabaseServerClient } from './supabase';
import { Boveda } from './types';

export async function getBoveda(tenantIdOrKey: string, token?: string): Promise<Boveda> {
  const client = token ? getSupabaseServerClient(token) : supabase;
  const { data, error } = await client
    .from('marcas_boveda')
    .select('*')
    .eq('tenant_id', tenantIdOrKey)
    .single();

  if (error || !data) {
    throw new Error(`No se encontró Bóveda para ${tenantIdOrKey} en Supabase: ${error?.message}`);
  }

  return {
    tenant_id: data.tenant_id,
    vertical: data.vertical || null,
    identidad: data.identidad || {},
    conversacion: data.conversacion || {},
    audiencia: data.audiencia || {},
    aprendizaje: data.aprendizaje || { approved: [], rejected: [], notes: [] },
    onboarding_completo: data.onboarding_completo || false
  };
}
