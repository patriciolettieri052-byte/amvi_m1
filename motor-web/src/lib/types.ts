import { z } from 'zod';

export const PaletteSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hexadecimal válido (ej. #HEX)'),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hexadecimal válido (ej. #HEX)'),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hexadecimal válido (ej. #HEX)')
});

export const IdentidadSchema = z.object({
  brand_name: z.string().min(1, 'El nombre de la marca es requerido'),
  logo_url: z.string().url('Debe ser una URL válida para el logo'),
  palette: PaletteSchema,
  typography: z.string().min(1, 'La tipografía es requerida'),
  tone: z.array(z.string()),
  restrictions: z.array(z.string())
});

export const AprendizajeItemSchema = z.object({
  piece_id: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
  note: z.string().nullable(),
  copy: z.any(),
  art: z.any(),
  timestamp: z.string()
});

export const AprendizajeSchema = z.object({
  approved: z.array(z.any()).default([]),
  rejected: z.array(z.any()).default([]),
  notes: z.array(z.string()).default([])
});

export const BovedaSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  identidad: IdentidadSchema,
  aprendizaje: AprendizajeSchema.default({ approved: [], rejected: [], notes: [] })
});

export const CopyResponseSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  subtitulo: z.string().min(1, 'El subtítulo es requerido'),
  cta: z.string().min(1, 'El CTA es requerido'),
  caption: z.string().min(1, 'El caption es requerido')
});

export const ArtResponseSchema = z.object({
  template: z.string().min(1, 'El template es requerido'),
  bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'El fondo debe ser hexadecimal'),
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'El color de texto debe ser hexadecimal'),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'El color de acento debe ser hexadecimal'),
  title_size: z.enum(['sm', 'md', 'lg', 'xl']),
  layout: z.string(),
  logo_position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'none']),
  highlight_words: z.array(z.string()).default([])
});

export type Identidad = z.infer<typeof IdentidadSchema>;
export type Boveda = z.infer<typeof BovedaSchema>;
export type CopyResponse = z.infer<typeof CopyResponseSchema>;
export type ArtResponse = z.infer<typeof ArtResponseSchema>;

export interface PipelineResult {
  png_url: string; // Base64 o ruta generada
  copy: CopyResponse;
  art: ArtResponse;
  caption: string;
}
