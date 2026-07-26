# AMVI · Specs M1 completo

> Especificaciones para el desarrollo. De motor reactivo a plan proactivo con memoria.
> Punto de partida: informe de arquitectura del 26/07/2026. Tickets B00–B11 cerrados salvo B07 y B11 (a medias).
> Fuente de verdad: este documento reemplaza a `AMVI-Specs-Demo-Beta` para todo lo nuevo.

---

## Qué cambia, en una línea

M1 pasa de **"herramienta que responde cuando le pedís"** a **"empleado que llega con la semana propuesta y contesta sabiendo de tu negocio"**. Mismo motor, distinta categoría de producto.

---

## Resumen de lo que se construye

| Bloque | Tickets | Qué habilita |
|---|---|---|
| Cierre del beta | C00–C02 | Mandar el link sin deuda abierta |
| Refactor | C03–C05 | **Gate obligatorio** — sin esto lo nuevo no entra |
| Sub-ADN | C06 | Layout según tipo de pieza, no solo rubro |
| Flujo en 2 etapas | C07 | Aprobar concepto en texto antes de diseñar |
| Plan semanal | C08–C09 | Contenido que llega solo + calendario |
| Ejecutivo con memoria | C10 | Responde con criterio del negocio |

**Orden no negociable:** C03–C05 antes que C07–C10. Meter el plan semanal sobre el pipeline síncrono actual rompe el sistema (ver C04).

---

# BLOQUE 1 · Cierre del beta

## C00 · Quitar el tope de piezas — BORRAR

**Objetivo:** eliminar el límite de 5 piezas por usuario.

**Alcance:**
- Revertir la validación `count >= 5` y el error 429 en `/api/pipeline`
- Quitar el indicador "Piezas: X/5" de la UI

**Cerco eléctrico:** la tabla `piezas` sigue registrando todo igual. Solo deja de bloquear — no se toca el guardado.

**Verificación:** un usuario genera 8 piezas sin bloqueo, y las 8 quedan en `piezas`.

---

## C01 · Middleware real (cierra B07)

**Objetivo:** eliminar el parpadeo de contenido no autenticado.

**Problema actual:** la protección de rutas depende de `useEffect` client-side. El usuario ve la pantalla protegida un instante antes de ser redirigido.

**Implementación:** `middleware.ts` nativo de Next.js en Edge que valide sesión y `onboarding_completo` antes de renderizar.

**Reglas de redirección:**
- Sin sesión → `/login`
- Con sesión y `onboarding_completo = false` → `/onboarding`
- Con sesión y `onboarding_completo = true` → `/app`

**Verificación:** entrar directo a `/app` sin sesión no muestra nada de la app, ni por un frame.

---

## C02 · UI de reintento (cierra B11)

**Objetivo:** que ningún fallo deje al tester en pantalla muerta.

**Casos mínimos:** falla el LLM · falla el render-service · Zod rechaza la salida del modelo · se cae la conexión.

**UX:** mensaje claro en lenguaje humano + botón reintentar. Nunca un error técnico crudo.

**Cerco eléctrico:** el backend ya captura estos errores. Esto es solo la capa visual — no rehacer el manejo de errores del servidor.

---

# BLOQUE 2 · Refactor (gate obligatorio)

## C03 · Partir `runner.ts`

**Problema:** 284 líneas donde conviven lectura de disco, consultas a Supabase, llamadas a dos proveedores de LLM, prompts hardcodeados, URLs de stock por rubro, el orquestador y el cliente HTTP de Puppeteer. Cambiar un prompt obliga a tocar el orquestador.

**Estructura destino:**

```
src/lib/
  llm/
    client.ts          # Gemini + fallback OpenAI, nada más
    prompts.ts         # carga de prompts desde recursos/, sin lógica
  adn/
    loader.ts          # lee y valida ADN por vertical + tipo
  agents/
    copy.ts            # agente Copy: recibe contexto, devuelve CopyResponse
    arte.ts            # agente Arte: recibe contexto, devuelve ArtResponse
  render/
    client.ts          # cliente del microservicio Puppeteer
  memory/
    compressor.ts      # ver C05
  pipeline.ts          # orquestador: solo coordina, no implementa
  boveda.ts            # acceso a marcas_boveda
```

**Cerco eléctrico:** refactor de estructura, **no de comportamiento**. Los contratos Zod de `types.ts` no cambian. Al terminar, el pipeline debe producir exactamente el mismo resultado que antes.

**Verificación:** generar una pieza antes y después del refactor con el mismo pedido y la misma Bóveda produce el mismo JSON de copy y arte.

---

## C04 · Sacar el render del request — CRÍTICO

**Problema:** `/api/pipeline` llama al LLM de Copy, al de Arte, y hace una petición HTTP síncrona a Puppeteer que devuelve base64. Latencia total 4–10 segundos, rozando el timeout de Vercel. **Con 3 piezas generadas de una (plan semanal), esto no llega.**

Además el PNG viaja en base64 dentro del JSON de respuesta en vez de ir a un bucket — con un calendario de piezas acumuladas no escala.

**Implementación:**

1. **PNG a Supabase Storage**, no base64 en la respuesta. `piezas.imagen_url` guarda la URL, no el contenido.
2. **Render desacoplado del request:** la petición de diseño encola el trabajo y responde de inmediato con la pieza en estado `diseñando`. El render ocurre aparte y actualiza la fila cuando termina.
3. **El frontend consulta el estado** (polling simple cada 2–3 s, o realtime de Supabase) y muestra la pieza cuando pasa a `disenada`.

**Cerco eléctrico:** ninguna ruta de API puede quedar esperando a Puppeteer dentro del request. Si el render tarda 10 segundos, el usuario ya recibió respuesta hace 9.

**Verificación:** disparar el diseño de 3 piezas simultáneas. Las tres responden en menos de 1 segundo y aparecen renderizadas al completarse, sin timeout.

---

## C05 · Compresor de memoria

**Problema:** todo el objeto `aprendizaje` se serializa crudo y se inyecta en el prompt. Con 20 piezas el contexto se infla, encarece y ralentiza. Y es justo donde vive el Ejecutivo con memoria (C10).

**Implementación:** función `synthesizeBrandDirectives(aprendizaje)` que convierte el histórico en **3 a 5 directivas compactas en texto**.

**Contrato:**
```json
{
  "directivas": [
    "Prefiere tono didáctico sobre promocional",
    "Rechaza llamados a la acción agresivos",
    "Aprueba consistentemente piezas con foto de mascota"
  ],
  "piezas_analizadas": 14,
  "actualizado": "ISO8601"
}
```

**Reglas:**
- Se recalcula cuando hay señal nueva, no en cada generación
- Se guarda en `marcas_boveda.aprendizaje.directivas` — no se recomputa por pieza
- Si hay menos de 3 señales, devuelve array vacío y el prompt no incluye la sección
- **Máximo 5 directivas.** Es un tope duro, no una sugerencia

**Cerco eléctrico:** a partir de acá, los agentes reciben las directivas sintetizadas. **Nunca más el JSON crudo de `aprendizaje` en un prompt.**

**Verificación:** con 15 piezas de histórico, el prompt inyectado no supera las 5 líneas de directivas.

---

# BLOQUE 3 · Sub-ADN

## C06 · ADN con tipos de pieza

**Objetivo:** que el layout cambie según el **tipo de pieza**, no solo según el rubro. Hoy una promo y un post educativo salen con la misma estructura.

**Jerarquía de aplicación (orden estricto):**

1. **ADN de rubro** → estética base (colores típicos, tipografía, concepto visual)
2. **Sub-ADN de tipo** → estructura (layout, jerarquía, tamaño de título)
3. **Bóveda del cliente** → identidad (sus colores, su tipografía, su logo, su tono)

**Regla de conflicto:** cuando el ADN y la Bóveda chocan, **gana la Bóveda**. El ADN llena lo que la Bóveda no especifica, nunca la pisa.

**Estructura del archivo** (`recursos/adns/adn_verticales.json`):

```json
{
  "veterinaria": {
    "vertical": "veterinaria",
    "concepto_visual": "...",
    "layout_preferido": "...",
    "densidad_texto": "...",
    "tipografia_estilo": "...",
    "templates_recomendados": ["foto_recortada_bloque", "highlight_palabras"],
    "do": ["..."],
    "anti_patterns": ["..."],
    "tipos": {
      "educativo": {
        "descripcion": "informa o enseña algo al dueño de la mascota",
        "jerarquia": ["titulo", "foto", "dato", "cta_suave"],
        "template_preferido": "foto_recortada_bloque",
        "title_size": "lg",
        "highlight_words": true,
        "anti_patterns_extra": ["precio destacado", "urgencia"]
      },
      "promo": {
        "descripcion": "oferta o beneficio con condiciones",
        "jerarquia": ["beneficio", "precio", "vigencia", "cta"],
        "template_preferido": "highlight_palabras",
        "title_size": "xl",
        "highlight_words": true,
        "anti_patterns_extra": ["texto largo", "varios beneficios juntos"]
      },
      "novedad": {
        "descripcion": "algo nuevo del negocio: servicio, producto, horario",
        "jerarquia": ["novedad", "foto", "detalle", "cta"],
        "template_preferido": "foto_recortada_bloque",
        "title_size": "lg",
        "highlight_words": false,
        "anti_patterns_extra": ["tono de oferta"]
      }
    }
  }
}
```

**Cerco eléctrico — el error a evitar:** **UN ADN por rubro con los tipos adentro.** NO crear archivos separados tipo `vet_promo`, `vet_educativo` — eso duplica el criterio del rubro y obliga a tocar tres lugares para cambiar un color base.

**Cambios en código:**
- El loader de ADN acepta `(vertical, tipo)` y devuelve el merge: rubro + tipo
- El Agente Arte recibe ese merge y elige dentro de `templates_recomendados`, respetando `anti_patterns` + `anti_patterns_extra`

**ADN genérico:** debe existir una entrada `"otro"` con la misma estructura, incluidos sus `tipos`. Sin ella, cualquier tester fuera de los tres verticales queda sin criterio.

**Verificación:** el mismo pedido con `tipo: "promo"` y `tipo: "educativo"` produce parámetros de arte distintos para la misma marca.

**Contenido:** los tipos por vertical los escribe Pato, no el dev. El dev solo consume la estructura.

---

# BLOQUE 4 · Flujo en dos etapas

## C07 · Concepto en texto → diseño

**Objetivo:** el usuario aprueba **ideas en texto** antes de que se gaste un render. Rechazar una idea no cuesta nada; rechazar una pieza terminada tira trabajo hecho.

**Cambios en base de datos:**

```sql
ALTER TABLE piezas ADD COLUMN estado TEXT NOT NULL DEFAULT 'concepto_pendiente';
-- valores: concepto_pendiente | concepto_aprobado | disenando | disenada | descartada

ALTER TABLE piezas ADD COLUMN tipo TEXT;
-- educativo | promo | novedad (del sub-ADN)

ALTER TABLE piezas ADD COLUMN concepto TEXT;
-- la idea en lenguaje natural, antes de existir el copy final

ALTER TABLE piezas ADD COLUMN fecha_programada TIMESTAMPTZ;
```

**Endpoints:**

`POST /api/pipeline/concepto`
- Recibe: `{ "pedido": string }` o nada (si viene del plan semanal)
- Genera solo el concepto en texto — 1 llamada de LLM, barata
- Guarda la pieza en estado `concepto_pendiente`
- Devuelve: `{ "piezas": [{ id, concepto, tipo, fecha_programada }] }`

`POST /api/pipeline/diseno`
- Recibe: `{ "pieza_id": uuid }`
- Verifica que la pieza esté en `concepto_aprobado`
- Ejecuta Copy + Arte, encola el render (C04), pasa a `disenando`
- Devuelve de inmediato, sin esperar el PNG

`POST /api/conceptos/aprobar`
- Recibe: `{ "pieza_ids": [uuid] }` — **acepta lote**
- Pasa las piezas a `concepto_aprobado` y dispara el diseño de todas

**Regla de UX no negociable:** el default es **aprobar todo**. Descartar es la excepción, con un botón por pieza. Si se le hace aprobar de a una, se le devolvió la tarea al dueño y se pierde el sentido del producto.

**Verificación:** generar 3 conceptos, descartar 1, aprobar los otros 2 en un clic → solo se diseñan 2 piezas.

---

# BLOQUE 5 · Plan semanal

## C08 · Temarios y generación automática

**Objetivo:** el contenido llega solo, sin que el dueño pida nada.

**Nueva tabla:**

```sql
CREATE TABLE temarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL,
  temas JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
```

**Estructura de `temas`:**
```json
{
  "temas": [
    {
      "tema": "vacunación anual",
      "tipo": "educativo",
      "meses": [3, 4, 9, 10],
      "prioridad": "alta"
    },
    {
      "tema": "cuidado de garrapatas",
      "tipo": "educativo",
      "meses": [11, 12, 1, 2],
      "prioridad": "alta"
    }
  ]
}
```

**Cerco eléctrico:** el temario es **por vertical, no por cliente**. Es criterio de rubro, no dato del usuario. Vive junto al ADN, no en la Bóveda.

**Generación:**
- Un cron semanal (o worker programado) recorre los usuarios con `onboarding_completo = true`
- Cruza el temario de su vertical con el mes actual
- Genera **3 conceptos** en estado `concepto_pendiente` con `fecha_programada` distribuida en la semana
- No genera si ya hay conceptos pendientes sin resolver de la semana anterior

**Nota de infraestructura:** es la única pieza genuinamente nueva. Puede resolverse con cron de Supabase, con un servicio programado en Railway, o con cron de Vercel — a criterio del dev.

**Verificación:** al correr el cron, un usuario con vertical veterinaria recibe 3 conceptos pertinentes al mes actual, sin haber pedido nada.

---

## C09 · Vista de calendario

**Objetivo:** que el dueño vea su plan, no piezas sueltas.

**Alcance:**
- **Vista semanal** en `/app` — es la operación: 3 conceptos, aprobar o descartar
- **Vista mensual** — se muestra en el onboarding como golpe de "tengo un plan", y queda accesible después
- Las piezas se ordenan por `fecha_programada`
- Estados visibles: pendiente de aprobar · aprobado · diseñando · listo

**Cerco eléctrico:** la vista mensual es de **lectura y presentación**. La operación (aprobar, descartar) ocurre en la semanal. No convertir el calendario en un editor.

---

# BLOQUE 6 · Ejecutivo con memoria

## C10 · Respuestas con criterio del negocio

**Objetivo:** que el dueño pregunte *"¿qué hacemos para el día del niño?"* y reciba una respuesta con lo que el sistema sabe de **ese** negocio, no ideas genéricas.

**Contexto que recibe el agente (las tres capas):**

| Capa | Fuente | Disponible desde |
|---|---|---|
| Del rubro | ADN + temario del vertical | Día 1 |
| De vos | `identidad`, `conversacion`, `audiencia` de la Bóveda | Día 1 (post-onboarding) |
| De cómo trabajás | `aprendizaje.directivas` (C05) | Semana 1 |

**Endpoint:** `POST /api/ejecutivo`
- Recibe: `{ "mensaje": string }`
- Devuelve: `{ "respuesta": string, "conceptos_sugeridos": [{ concepto, tipo }] | null }`

**Regla:** si la respuesta incluye propuestas concretas, se ofrecen como conceptos que el usuario puede aprobar directo — entran al flujo de C07 sin reescribir nada.

**Cerco eléctrico:** usa las **directivas sintetizadas** de C05, nunca el JSON crudo de aprendizaje.

**Honestidad de producto:** en el mes 1 la capa 3 está casi vacía, así que el Ejecutivo responde con criterio del rubro + lo que el dueño contó. Es correcto y ya es mejor que un chatbot. La respuesta con "lo que te funcionó" llega al mes 2–3.

**Verificación:** dos marcas del mismo vertical con distintas directivas reciben respuestas distintas a la misma pregunta.

---

## Orden de ejecución

| Fase | Tickets | Bloquea a |
|---|---|---|
| 1 · Cierre | C00, C01, C02 | Nada — se puede mandar el link |
| 2 · Refactor | C03, C04, C05 | **Todo lo siguiente** |
| 3 · Estructura | C06, C07 | Plan semanal |
| 4 · Producto | C08, C09, C10 | — |

---

## Criterio de listo

- Un usuario nuevo se registra, hace onboarding y ve **el calendario del mes** propuesto
- El lunes recibe 3 conceptos en texto sin haber pedido nada
- Aprueba los 3 de un clic; las piezas se diseñan sin que el endpoint se caiga
- Una promo y un educativo se ven **estructuralmente distintos**, ambos con su marca
- Pregunta algo al ejecutivo y recibe una respuesta con criterio de su rubro y de lo que contó
- Nada del histórico crudo viaja en un prompt

---

## Dependencias que no son del dev

| Qué | Quién | Bloquea |
|---|---|---|
| Temario con estacionalidad de los 3 verticales | Pato | C08 |
| Tipos de pieza por vertical (sub-ADN) | Pato | C06 |
| ADN genérico `"otro"` con sus tipos | Pato | El link del beta |
| Anti-patterns de comunicación | Pato | Calidad del copy |
