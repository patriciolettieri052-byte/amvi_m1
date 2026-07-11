# AMVI · Módulo 1 — Tickets de desarrollo (v2)

**Sprint 7+7 días · prueba interna · sin clientes reales**
Para el developer IA. Cada ticket es atómico y autocontenido.

---

## Cómo leer el estado de cada ticket

- 🟢 **LISTO PARA EJECUTAR** — todo definido, el dev arranca ya.
- 🟣 **NECESITA SESIÓN NOSOTROS** — espera contenido que arma Pato + Claude (ADN, marcas, templates, prompts).
- 🔴 **BLOQUEADO** — depende de tickets anteriores.

## Regla de oro del motor

Cada etapa recibe un JSON conocido y devuelve un JSON conocido. **NUNCA texto libre entre etapas.** Los contratos exactos están en cada ticket. Si un contrato no está definido, el dev NO improvisa: pregunta.

## Cambios respecto a v1

1. Nuevo **T06.5 — Pipeline Runner** (orquestador): nadie era dueño de la cadena Copy → Arte → ensamblado → Render, y los contratos de T08 y T06 no encajaban entre sí.
2. **"Pedir cambios" definido**: en M1 NO regenera. Solo registra la señal (ver T09/T10).
3. **Dependencias corregidas**: T09 y T10 tenían bloqueos no declarados.
4. **T11 con método definido**: screenshots + visión de Claude, sin scraping.
5. **T12 mide zero-shot ≥60%**, no solo discriminación entre verticales.
6. **Lado de lectura del Aprendizaje** agregado a los contratos de entrada de T07/T08.

---

## Mapa de tickets

| # | Ticket | Etapa | Estado | Depende de |
|---|--------|-------|--------|------------|
| T01 | Setup del proyecto | Infra | 🟢 Listo | — |
| T02 | Tabla La Bóveda + 3 marcas dummy | Datos | 🟣 Sesión (marcas) | — |
| T03 | Pantalla cero (selector de marca) | UI | 🟢 Listo | T01 |
| T04 | Onboarding + inferencia simulada | UI | 🟢 Listo | T02, T03 |
| T05 | Templates HTML de render | Render | 🟣 Sesión (diseño) | T01 |
| T06 | Servicio Puppeteer → PNG | Render | 🟢 Listo | T01, T05 |
| T06.5 | Pipeline Runner (orquestador) | Backend | 🟢 Listo | T02 (contratos), luego enchufa T07/T08/T06 |
| T07 | Agente Copy | IA | 🟣 Sesión (prompt) | T02 |
| T08 | Agente Arte + ADN | IA | 🟣 Sesión (prompt + ADN) | T02, T07 |
| T09 | Mockup + aprobar / pedir cambios / descargar | UI | 🔴 Bloqueado | T05, T06, T06.5, T07, T08 |
| T10 | Capa Aprendizaje (escritura) | Datos | 🔴 Bloqueado | T02, T09 |
| T11 | Inferencia real desde Instagram | IA | Semana 2 | T02 |
| T12 | Crash test 3 verticales + zero-shot | QA | Semana 2 | T08, T11, 3 ADN cargados |

**Ruta crítica del dev (sin dependencias de contenido):** T01 → T03 → T06.5 (con agentes mockeados) → esperar contenido → enchufar.
**Ruta crítica nuestra (Pato + Claude):** marcas dummy (T02) + templates (T05) + prompts (T07/T08) + 3 ADN. **Deadline: día 2–3.** Si esto se atrasa, el checkpoint del día 7 evalúa un motor sin cerebro — el cuello de botella somos nosotros, no el dev.

---

# SEMANA 1 — El Motor

## T01 · Setup del proyecto — 🟢 LISTO

**Objetivo:** Proyecto Next.js corriendo + Supabase conectado + servicio Puppeteer que renderiza un PNG de prueba.

**Archivos:** Crear estructura base `/app`, `/lib`, `/templates`, `/mock`. Configurar Supabase client.

**Cerco eléctrico:** Puppeteer NO corre en serverless de Vercel. Montarlo como servicio aparte (Railway o Browserless) desde el día 1.

**Verificación:** Un endpoint renderiza un HTML dummy a PNG y lo devuelve.

---

## T02 · Tabla La Bóveda + 3 marcas dummy — 🟣 NECESITA SESIÓN

**Objetivo:** Tabla en Supabase con la estructura de 2 capas de La Bóveda. Cargar 3 marcas dummy (veterinaria, crochet, inmobiliaria) como registros.

**Depende de:** Sesión Pato+Claude — las 3 marcas se inventan ahí (nombre, colores, tono, etc.).

**Contrato (estructura del registro):**

```json
{
  "tenant_id": "uuid",
  "identidad": {
    "brand_name": "string",
    "logo_url": "string",
    "palette": { "primary": "#HEX", "secondary": "#HEX", "accent": "#HEX" },
    "typography": "string",
    "tone": ["string"],
    "restrictions": ["string"]
  },
  "aprendizaje": {
    "approved": [],
    "rejected": [],
    "notes": []
  }
}
```

**Cercos eléctricos:**
- El bloque `aprendizaje` existe desde el primer commit aunque esté vacío (retrofitear duele).
- Las marcas viven en Supabase, NO hardcodeadas en JS — la inferencia de semana 2 puebla esta misma tabla sin migración.

**Verificación:** Las 3 marcas se leen desde Supabase con la estructura correcta.

---

## T03 · Pantalla cero — selector de marca — 🟢 LISTO

**Objetivo:** Pantalla de login (usuario + pass) que funciona como selector de cuál de las 3 marcas cargar.

**Cerco eléctrico:** Sin verificación de auth seria — es interno. Apariencia de login real, comportamiento de selector. Auth real = post-validación.

**Verificación:** Elegir una marca carga su Bóveda y entra al onboarding.

---

## T04 · Onboarding + inferencia simulada — 🟢 LISTO

**Objetivo:** Flujo: pega IG (campo) → animación de análisis → muestra la Bóveda PRE-LLENA de la marca elegida para revisar/ajustar.

**Cerco eléctrico:** La inferencia es SIMULADA — muestra los datos ya cargados de la marca dummy como si los hubiera inferido. La real llega en T11 y reemplaza solo el origen de los datos, no la pantalla.

**Verificación:** El usuario ve su marca pre-armada y puede ajustarla, no un formulario vacío.

---

## T05 · Templates HTML de render — 🟣 NECESITA SESIÓN

**Objetivo:** 2–3 templates HTML/Tailwind parametrizados (ej: `hero_foto`, `split_imagen_dato`) que el render rellena.

**Depende de:** Sesión Pato+Claude — el diseño lo bocetamos nosotros.

**Cerco eléctrico:** El formato (post/story/carrusel) es un PARÁMETRO del template, no un template nuevo por formato.

**Verificación:** Un template renderiza correctamente con datos de prueba inyectados.

---

## T06 · Servicio Puppeteer → PNG — 🟢 LISTO

**Objetivo:** Función que toma el **RenderJob** (ver T06.5) y devuelve PNG 1080×1080.

**Contrato (recibe):**

```json
{
  "template": "hero_foto",
  "format": "post_1080",
  "copy": { "titulo": "", "subtitulo": "", "cta": "" },
  "art": { "bg": "#HEX", "text_color": "#HEX", "jerarquia": "string", "logo_position": "string" },
  "palette": { "primary": "#HEX", "secondary": "#HEX", "accent": "#HEX" },
  "logo_url": "string"
}
```

**Devuelve:** PNG (buffer o URL).

**Cerco eléctrico:** El servicio NO decide nada de diseño. Solo inyecta y fotografía. Si falta un campo, error explícito — nunca defaults silenciosos.

**Verificación:** Dado un RenderJob válido, devuelve un PNG correcto del template indicado.

---

## T06.5 · Pipeline Runner (orquestador) — 🟢 LISTO *(nuevo)*

**Objetivo:** Función única dueña de la cadena completa: recibe el pedido del usuario + `tenant_id`, ejecuta `Copy → Arte → ensamblado → Render` y devuelve la pieza. Es el único lugar donde se llaman los agentes.

**Flujo:**

```
input: { tenant_id, pedido }
1. Leer Bóveda (identidad + aprendizaje) desde Supabase
2. Leer ADN del vertical de la marca
3. Llamar Agente Copy    → CopyJSON
4. Llamar Agente Arte    → ArteJSON (recibe también el CopyJSON)
5. Ensamblar RenderJob   = ArteJSON + CopyJSON + palette + logo_url (de la Bóveda)
6. Llamar Render (T06)   → PNG
output: { png_url, copy: CopyJSON, art: ArteJSON, caption }
```

**Cercos eléctricos:**
- Validar cada JSON contra su contrato ANTES de pasar a la siguiente etapa. Si un agente devuelve algo fuera de contrato: 1 reintento con el error como feedback; si falla de nuevo, error visible — nunca "arreglar" el JSON a mano.
- El ensamblado del RenderJob vive acá y solo acá. Ni el Agente Arte ni el Render conocen la estructura completa.
- Mientras T07/T08 no existen, el runner corre con agentes **mockeados** que devuelven JSON fijo válido — así el dev prueba la cadena entera el día 2 sin esperar los prompts.

**Verificación:** Con agentes mockeados, `pedido → PNG en pantalla` funciona de punta a punta.

---

## T07 · Agente Copy — 🟣 NECESITA SESIÓN

**Objetivo:** Agente que recibe ADN + Bóveda + pedido y devuelve el JSON de copy.

**Depende de:** Sesión Pato+Claude — el system prompt (criterio de redacción) lo escribimos nosotros.

**Contrato (recibe):**

```json
{
  "adn_vertical": { },
  "identidad": { },
  "aprendizaje": { "approved": [], "rejected": [], "notes": [] },
  "pedido": "string"
}
```

**Contrato (devuelve):** `{ "titulo": "", "subtitulo": "", "cta": "", "caption": "" }`

**Cercos eléctricos:**
- Orden de inyección en el prompt: **ADN primero, Bóveda después.** Nunca al revés.
- Respeta `tone` y `restrictions` de la Bóveda.
- El bloque `aprendizaje` entra al contexto desde el día 1 aunque esté vacío — el system prompt debe instruir cómo usarlo ("evitá lo que fue rechazado, repetí patrones de lo aprobado"). Esto es el lado de lectura del WOW #3; sin esto, T10 escribe señales que nadie consume.
- JSON estructurado, nunca texto libre.

**Verificación:** Para un pedido, devuelve los 4 campos respetando tono y restricciones. Con un `rejected` cargado a mano, la siguiente generación lo evita.

---

## T08 · Agente Arte + ADN — 🟣 NECESITA SESIÓN

**Objetivo:** Agente que recibe el copy + ADN del vertical + Bóveda y elige parámetros de diseño.

**Depende de:** Sesión Pato+Claude — el system prompt y los 3 ADN (con anti-patterns).

**Contrato (recibe):**

```json
{
  "adn_vertical": { },
  "identidad": { },
  "aprendizaje": { },
  "copy": { "titulo": "", "subtitulo": "", "cta": "" },
  "templates_disponibles": ["hero_foto", "split_imagen_dato"]
}
```

**Contrato (devuelve):** `{ "template": "", "bg": "#HEX", "text_color": "#HEX", "jerarquia": "", "logo_position": "" }`

**Cercos eléctricos:**
- ADN se inyecta ANTES de la Bóveda. Nunca al revés.
- NO genera imágenes de píxeles — solo elige parámetros de template.
- `template` debe ser uno de `templates_disponibles` — validado por el runner.

**Verificación:** Dos verticales distintos con el mismo pedido producen parámetros de arte distintos.

---

## T09 · Mockup + aprobar / pedir cambios / descargar — 🔴 BLOQUEADO

**Objetivo:** Mostrar el PNG dentro de un mockup nativo de Instagram (con su caption). Botones: **Aprobar**, **Pedir cambios**, **Descargar**.

**Depende de:** T05, T06, T06.5, T07, T08 — necesita la cadena completa para mostrar una pieza real. (Con agentes mockeados puede desarrollarse antes.)

**Comportamiento de los botones — DEFINIDO, no improvisar:**
- **Aprobar** → registra señal `approved` en la capa Aprendizaje (T10) + habilita descarga.
- **Pedir cambios** → en M1 **NO regenera la pieza**. Abre un campo de texto corto, guarda la nota como señal `rejected` + `note` en Aprendizaje (T10), y cierra. El loop de re-generación con feedback es post-M1. El valor de la señal es alimentar la próxima generación, no arreglar esta.
- **Descargar** → baja el PNG.

**Verificación:** La pieza se ve en el mockup con caption; aprobar y pedir cambios escriben en Aprendizaje; descargar baja el PNG.

---

## T10 · Capa Aprendizaje (escritura) — 🔴 BLOQUEADO

**Objetivo:** Al aprobar/rechazar una pieza, guardar la señal en la capa `aprendizaje` de la Bóveda.

**Depende de:** T02 (tabla) y T09 (quién dispara la señal).

**Contrato (señal):**

```json
{
  "piece_id": "uuid",
  "action": "approved | rejected",
  "note": "string | null",
  "copy": { },
  "art": { },
  "timestamp": "ISO8601"
}
```

**Cercos eléctricos:**
- Solo INSERT (append) en el historial — nunca modificar ni borrar señales previas.
- NUNCA tocar la capa `identidad`. Identidad solo cambia en rebranding.
- Guardar copy + art de la pieza junto con la señal — sin eso, "evitá lo rechazado" no tiene qué evitar.

**Verificación:** Una aprobación queda registrada y aparece en el contexto de la próxima generación (leída por T06.5 → inyectada en T07/T08). Base del WOW #3.

---

# SEMANA 2 — Inferencia real + Verticales

## T11 · Inferencia real desde Instagram — 🔴 SEMANA 2

**Objetivo:** A partir de un Instagram real, poblar la Bóveda (colores, tono, logo) automáticamente.

**Método — DEFINIDO, no scrapear:** Instagram no tiene API pública para perfiles ajenos y el scraping se bloquea rápido; puede comerse la semana entera. Para el crash test interno el método es:

```
1. Input: 3–5 screenshots del perfil/posts (subidos a mano o capturados con Puppeteer sobre la vista pública si carga)
2. Claude con visión analiza los screenshots → infiere palette, tone, typography aproximada
3. Logo: crop manual o upload directo (no automatizar en M1)
4. Output: JSON con la estructura EXACTA de la capa identidad de T02
5. UPDATE del registro en Supabase → la pantalla de T04 lo muestra igual que antes
```

**Contrato (devuelve):** idéntico al bloque `identidad` de T02, más `"confidence": "alto | medio | bajo"` por campo.

**Cercos eléctricos:**
- Reemplaza solo el ORIGEN de los datos de T04. La estructura y la pantalla no cambian.
- Nunca inventar colores o tipografías que no se vean en el material (regla Brand Detective).
- Si no puede inferir un campo, lo deja null con confidence bajo — no rellena con genéricos.

**Verificación:** Con screenshots de un IG real, la Bóveda queda poblada con datos plausibles y el flujo de onboarding funciona sin cambios.

---

## T12 · Crash test 3 verticales + zero-shot — 🔴 SEMANA 2

**Objetivo:** Probar varios Instagram internos por vertical y medir dos cosas: **discriminación** y **tasa zero-shot**.

**Depende de:** T08 + T11 + los 3 ADN cargados.

**Protocolo de medición:**

```
- Mínimo 5 piezas generadas por vertical (15 total)
- Mismo set de pedidos para los 3 verticales (para comparar en igualdad)
- Jueces: los 3 socios, veredicto por pieza SIN discutir antes de votar
- Registrar por pieza: aprobada sin cambios / aprobada con cambios / rechazada
```

**Criterios de éxito (los dos deben cumplirse):**
1. **Discriminación:** veterinaria, crochet e inmobiliaria producen piezas claramente distintas, no gemelas. (Veto del CMO — binding.)
2. **Zero-shot ≥ 60%:** piezas aprobadas sin cambios / total ≥ 60%. Este es el gate de módulo — si no lo mide el crash test, se avanza a ciegas.

**Verificación:** Tabla con los 15+ veredictos + tasa zero-shot calculada + veredicto de discriminación del CMO.

---

# Orden de ejecución

**Dev, día 1:** T01 → T03 → T06.5 con agentes mockeados. Nada de esto depende de contenido nuestro.
**Nosotros, día 1–3 (deadline duro):** marcas dummy (T02) + templates (T05) + prompts Copy/Arte (T07/T08). Cuando llega, se enchufa en el runner.
**T09 cierra el motor. Checkpoint día 7:** los tres socios miran las piezas. ¿Convencen? SÍ → semana 2 (T11, T12). NO → semana 2 afina el motor, no suma encima.

---

# Cercos eléctricos globales (repaso)

| # | Regla |
|---|-------|
| CE-1 | JSON estructurado entre TODAS las etapas. Nunca texto libre. |
| CE-2 | ADN de Vertical se inyecta ANTES de la Bóveda. Siempre. |
| CE-3 | Capa `identidad` inmutable en producción. Solo rebranding la toca. |
| CE-4 | Capa `aprendizaje` es append-only. Solo INSERT. |
| CE-5 | Marcas y Bóveda viven en Supabase, nunca hardcodeadas en JS. |
| CE-6 | Puppeteer como servicio aparte — nunca en serverless de Vercel. |
| CE-7 | Lógica separada de presentación — migrar a otro frontend no debe tocar lógica. |
| CE-8 | Si un contrato no está definido, el dev pregunta. No improvisa. |
