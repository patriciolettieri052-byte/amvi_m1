import { supabase, getSupabaseServerClient } from './supabase';

export interface LogoUploadResult {
  original_url: string;
  procesado_url: string;
}

export async function processBrandLogo(
  tenantId: string,
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string,
  token?: string
): Promise<LogoUploadResult> {
  const client = token ? getSupabaseServerClient(token) : supabase;
  const fileExt = fileName.split('.').pop() || 'png';
  
  const originalPath = `tenants/${tenantId}/logo_original.${fileExt}`;
  const procesadoPath = `tenants/${tenantId}/logo_procesado.png`;

  // 1. Guardar versión original en Supabase Storage logos-bucket
  const { error: origErr } = await client.storage
    .from('logos-bucket')
    .upload(originalPath, imageBuffer, {
      contentType: mimeType,
      upsert: true
    });

  if (origErr) {
    console.error('Error al subir logo original a Storage:', origErr);
  }

  const { data: origPublic } = client.storage
    .from('logos-bucket')
    .getPublicUrl(originalPath);

  const originalUrl = origPublic?.publicUrl || '';
  let procesadoBuffer: Buffer = imageBuffer;

  // 2. Intentar remoción de fondo vía remove.bg API si existe la API Key
  const removeBgApiKey = process.env.REMOVE_BG_API_KEY;
  if (removeBgApiKey) {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType });
      formData.append('image_file', blob, fileName);
      formData.append('size', 'auto');

      const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': removeBgApiKey },
        body: formData
      });

      if (bgRes.ok) {
        const bgArrayBuffer = await bgRes.arrayBuffer();
        procesadoBuffer = Buffer.from(bgArrayBuffer);
      } else {
        console.warn('remove.bg API retornó error, usando original como fallback:', bgRes.statusText);
      }
    } catch (bgErr) {
      console.error('Error al procesar remove.bg:', bgErr);
    }
  }

  // 3. Guardar versión procesada en Supabase Storage logos-bucket
  const { error: procErr } = await client.storage
    .from('logos-bucket')
    .upload(procesadoPath, procesadoBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (procErr) {
    console.error('Error al subir logo procesado a Storage:', procErr);
  }

  const { data: procPublic } = client.storage
    .from('logos-bucket')
    .getPublicUrl(procesadoPath);

  const procesadoUrl = procPublic?.publicUrl || originalUrl;

  return {
    original_url: originalUrl,
    procesado_url: procesadoUrl
  };
}
