# AMVI M1 · Anexo de Referencia Visual del Frontend

> Para el agente de desarrollo. Fuente de verdad del diseño de la plataforma AMVI (la interfaz, NO el contenido que se genera para el cliente).
> Referencia viva: `AMVI-M1-Interfaz-Real.html`. Ante cualquier duda visual, ese HTML manda.
> Regla: NO inventar colores, tamaños ni estilos fuera de lo especificado acá.

---

## 1. Design tokens

### Colores de la plataforma
| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#F5F5F5` | Fondo general de pantallas |
| `--surface` | `#FFFFFF` | Cards, barras, inputs |
| `--ink` | `#1A1A1A` | Texto principal, botón primario |
| `--muted` | `#6B6B6B` | Texto secundario, labels |
| `--line` | `#E8E8E8` | Bordes, separadores |
| `--coral` | `#E94560` | Acento único (loading, foco, CTA activo, nav activo) |
| `--green` | `#00A650` | Confirmaciones, botón "aprobar/activar" |

**Regla:** coral es el ÚNICO color de acento de la interfaz. No agregar azules, violetas ni gradientes. Fondo sólido siempre, nunca glass ni blur.

> IMPORTANTE: estos son los colores de la INTERFAZ de AMVI. NO confundir con los colores de las marcas del cliente (VetCare, Prime, Knit&Purl), que viven en La Bóveda y solo se usan dentro de las piezas generadas.

### Tipografía de la plataforma
- **Fuente única de UI:** `Quicksand` (Google Fonts, pesos 400/500/600/700).
- Títulos de pantalla: 700, ~23px.
- Body/labels: 500-600, 12-14px.
- No usar Inter/Roboto/Arial en la interfaz.

> Las fuentes de marca (Nunito, Cormorant Garamond) son SOLO para las piezas generadas, nunca para la UI.

### Espaciado y formas
| Token | Valor |
|-------|-------|
| Radio de cards | `16px` |
| Radio de botones | `12px` |
| Radio de inputs | `12px` |
| Radio de chips/pills | `20-24px` (redondeado) |
| Sombra de card | `0 2px 12px rgba(0,0,0,.07)` |
| Padding de body | `22px 18px` |

Layout **mobile-first**, ancho base 390px.

---

## 2. Componentes base

### Botones
- **Primario:** fondo `--ink` (negro), texto blanco, radio 12px, padding 15px, full-width.
- **Verde (confirmar):** fondo `--green` — para "activar Bóveda", "aprobar y descargar".
- **Ghost (secundario):** fondo transparente, borde `--line`, texto `--ink`.
- Feedback tap: `transform: scale(.98)`.

### Inputs
- Fondo blanco, borde `--line` 1.5px, radio 12px, padding 13px.
- Foco: borde `--coral`, sin outline.

### Cards
- Fondo blanco, radio 16px, sombra suave, padding 17px.

### Chips (tono / restricciones)
- Fondo `#F0F0F0`, radio 20px, padding 5px 12px, peso 600, 12px.

### Top bar
- Fondo blanco, borde inferior `--line`, padding superior 38px (deja lugar al notch).
- Logo "AM**VI**" con VI en coral.
- A la derecha: chip de marca activa (avatar de color + nombre).

### Barra de navegación inferior
- 3 items: **Crear** (✦) · **Piezas** (▦) · **Bóveda** (◈).
- Altura 60px, fondo blanco, borde superior.
- Item activo en `--coral`, inactivos en `--muted`.
- Se oculta en: login y pantalla de análisis. Visible en el resto.

---

## 3. Pantallas (orden del flujo)

### S0 · Selector de marca (login de apariencia) — T03
- Logo AMVI centrado grande.
- 3 cards de marca: avatar color + nombre + rubro + flecha ›.
- Abajo, campos usuario/contraseña DECORATIVOS (login de apariencia, sin auth real en M1).
- Sin navbar.

### S1 · Análisis / inferencia simulada — T04
- Pantalla centrada, sin navbar.
- Círculo con pulso animado (color = color primario de la marca elegida).
- Texto que cambia en secuencia cada ~1s: "Mirando tu perfil…" → "Detectando colores…" → "Leyendo tu tono…" → "Armando tu Bóveda…".
- Al terminar, pasa a la Bóveda.

### S2 · Bóveda pre-llena — T04
- Badge verde "✓ Inferido de @marca".
- Título "Esto encontré de [marca]".
- Card 1: logo, colores (3 swatches), tipografía.
- Card 2: chips de tono + chips de "no comunicar" (restricciones).
- Botón verde "Está perfecto, activar" + ghost "Ajustar algo".

### S3 · Pedido — (captura del pedido, dispara T07/T08)
- Chat mínimo: saludo del Ejecutivo + pedido del usuario + confirmación.
- Composer abajo: input redondeado + botón coral circular ↑.
- Hint: "Pedí en lenguaje natural, como a un empleado".

### S4 · Generando — T07/T08/T06
- Pantalla centrada. Círculo con pulso coral (✦).
- Barra de progreso coral que avanza.
- Texto en secuencia: "Pensando el ángulo…" → "Redactando el copy con tu tono…" → "Diseñando con tus colores…" → "Maquetando la pieza…".
- Subtítulo fijo: "Aplicando los colores y el tono de tu Bóveda".

### S5 · Resultado — T09
- Título "Tu pieza con la marca de [marca]".
- Mockup nativo de Instagram: header (avatar+handle+"Patrocinado"), canvas cuadrado con la pieza, íconos de acción, caption.
- Botones: ghost "Pedir cambios" + verde "Aprobar y descargar".
- Toast de confirmación al descargar.

---

## 4. Estados de loading (importante — dan el efecto premium)

Los dos loadings NO son spinners genéricos. Comunican valor:

1. **Análisis de marca (S1):** pulso + texto secuencial que nombra lo que "está detectando" de esa marca puntual. Da la sensación de que el sistema está entendiendo la marca.
2. **Generación (S4):** barra de progreso + texto secuencial que nombra cada etapa del pipeline (ángulo → copy → diseño → maqueta). Hace visible el trabajo del motor.

**Regla:** los textos de loading son secuenciales y temáticos, nunca un "Cargando…" genérico. Duración total ~10-15s en producción (en el mock son ~4s).

---

## 5. Cercos eléctricos visuales (qué NO hacer)

- NO glass, blur ni transparencias.
- NO gradientes de fondo.
- NO más de un color de acento (solo coral).
- NO emojis como íconos de UI (los emojis solo pueden aparecer dentro del contenido/caption generado).
- NO mezclar las fuentes de marca (Nunito/Cormorant) en la interfaz — esas son solo para las piezas.
- NO usar los colores de las marcas del cliente en la UI de la plataforma — la UI es siempre gris/blanco/coral.
- NO spinners genéricos — usar los loadings secuenciales descritos.

---

## 6. Regla final para el agente

Si algo no está especificado acá, abrí `AMVI-M1-Interfaz-Real.html` y replicá lo que ves. Ese HTML es la fuente de verdad. No inventes variantes visuales "para mejorar" — la coherencia vale más que la creatividad en la UI.
