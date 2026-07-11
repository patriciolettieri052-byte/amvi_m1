# Resumen de Sesión - AMVI Módulo 1 (Motor y UI Demo)

**Fecha:** 05 de Julio de 2026
**Objetivo de la Sesión:** Dejar listo el entorno local de demostración para el Módulo 1 (Motor de Generación) con una UI premium funcional y un servicio de renderizado operativo usando datos mockeados.

## 1. Lo que construimos hoy

* **Arquitectura de Microservicios:** Separamos el proyecto en dos carpetas:
  * `motor-web`: Aplicación Next.js que gestiona toda la interfaz de usuario, el orquestador (runner) y las secuencias de estados.
  * `render-service`: Servidor Node/Express con Puppeteer dedicado exclusivamente a transformar el HTML de los templates a imágenes PNG estáticas, optimizado para ser desplegado en Railway sin interferir con la web.
* **Interfaz de Usuario (UI) Premium:** Implementamos el mockup de teléfono con colores, tipografías reales (`Quicksand`, `Cormorant`, `Nunito`) y notch.
* **Flujo "Demo-Ready":** 
  * Reemplazamos los botones de inicio por un **Login Simulado** que inyecta los datos de 3 marcas distintas (`vetcare`, `prime`, `knit`).
  * Agregamos el **Chat del Ejecutivo de Cuentas** interactivo.
  * Diseñamos **Loaders Secuenciales** temporizados que dan la sensación visual de que la IA está analizando la marca y diseñando la pieza.
* **Servicio de Render (Puppeteer):** Configuramos el inyector HTML para que reciba el JSON del agente y reemplace variables como `{{BG}}`, posiciones dinámicas del logo, y procese adecuadamente las clases `.highlight` para resaltar palabras clave en contraste.
* **Correcciones Finales:** Ajustamos la asignación de fotos locales (ej. `crochet.webp`) y re-escribimos el CSS del template de veterinaria para garantizar que la palabra resaltada contrastara sobre el bloque de color.

---

## 2. Próximos Pasos (Manuales a cargo del Usuario)

Para que mañana podamos pasar de esta demo "hardcodeada" a un sistema 100% real, debes completar estos pasos manuales:

### Paso 1: Configurar Supabase (Datos)
1. Entra a tu proyecto en Supabase.
2. Crea la tabla **`marcas_boveda`** con las siguientes columnas (si no lo has hecho aún):
   - `id` (uuid, primary key)
   - `tenant_id` (text, unique) -> Ej: "vetcare"
   - `identidad` (jsonb) -> Contendrá logo, colores, tipografía, tono y restricciones.
   - `aprendizaje` (jsonb) -> Contendrá feedback aprobado/rechazado.
3. Inserta manualmente las 3 marcas dummies usando el JSON correspondiente para cada una.

### Paso 2: Despliegue del Render en Railway
1. Sube la carpeta `render-service` a un repositorio de GitHub (o al mismo repo en otra rama/directorio).
2. Entra a Railway, crea un "New Project" desde ese repositorio.
3. Asegúrate de configurar la variable de entorno `PORT` si Railway te lo pide, aunque por defecto tomará el 3001.
4. **IMPORTANTE:** Copia la URL pública que te da Railway (ej. `https://amvi-render.railway.app`).

### Paso 3: Despliegue de Next.js en Vercel
1. Sube la carpeta `motor-web` a Vercel.
2. En la configuración del proyecto (Environment Variables), deberás cargar las siguientes claves:
   - `NEXT_PUBLIC_SUPABASE_URL`: (La URL de tu proyecto Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Tu clave anónima de Supabase)
   - `GEMINI_API_KEY` o `OPENAI_API_KEY`: (La clave real de la IA que usaremos mañana).
   - `RENDER_SERVICE_URL`: (La URL pública de Railway obtenida en el Paso 2).

### Paso 4: Validar Imágenes Externas
1. Las imágenes de las marcas (logos y fotos si las subes) deberán alojarse en un Storage (puede ser un Bucket público en Supabase).
2. Asegúrate de configurar el dominio de tu Storage en el archivo `next.config.js` si vas a renderizarlas con el componente `<Image>` de Next.js (aunque por ahora usamos la etiqueta HTML estándar para no bloquearnos).

---
**¿Qué haremos mañana?**
Una vez tengas estas variables y URLs desplegadas, quitaremos las funciones mock (`MOCK_BRANDS` y los `setTimeout`) del `runner.ts`, inyectaremos tus variables `.env` reales, y conectaremos el motor a las APIs de IA para que redacten y diseñen en vivo.
