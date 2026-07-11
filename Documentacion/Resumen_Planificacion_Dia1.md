# Resumen de Planificación - Día 1 (AMVI Módulo 1)

**Fecha:** 4 de Julio de 2026
**Estado:** Planificación completada. Listos para ejecutar.

## 1. Análisis del Proyecto
Analizamos el documento base `AMVI-M1-Tickets-v2.md`. El objetivo del Módulo 1 es construir un motor automatizado de generación de contenido visual, impulsado por IA, que respete la identidad ("La Bóveda") y el ADN de diferentes marcas.

## 2. Decisiones Arquitectónicas
Se acordó dividir el proyecto en dos repositorios/carpetas principales para facilitar el despliegue y evitar conflictos de dependencias:
* `motor-web/`: Aplicación Next.js (despliegue en Vercel) que manejará las pantallas (T03, T04), la conexión a Supabase y actuará como el "Pipeline Runner" (T06.5) orquestando a los agentes.
* `render-service/`: Servicio ligero en Node.js/Express (despliegue en Railway) dedicado exclusivamente a correr Puppeteer y renderizar los templates HTML a PNG (T06).

## 3. Preparación de Datos (Supabase)
* El proyecto en Supabase ya está creado.
* Generamos el script SQL exacto para crear la tabla `marcas_boveda` e insertar las 3 marcas simuladas (VetCare, Knit & Purl, Prime Properties) cumpliendo con el contrato JSON de la etapa T02.

## 4. Insumos Recolectados
El equipo humano (Pato + Claude) completó exitosamente sus tareas cuello de botella de forma anticipada. Los siguientes archivos se han centralizado en la carpeta `/recursos/` para ser inyectados mañana:
* **T05:** Templates HTML/Tailwind.
* **T07 & T08:** System prompts para los Agentes Copy y Arte.
* **T08:** JSONs con el ADN de los 3 verticales.

## 5. Próximos Pasos (Para la siguiente sesión)
A partir de la orden de ejecución, el Developer IA procederá con:
1. **Setup (T01):** Inicializar `motor-web` (Next.js) y `render-service` (Node.js).
2. **Integración:** Mover los archivos de la carpeta `/recursos/` a su estructura definitiva en el código.
3. **Desarrollo:** Construir la Pantalla Cero (T03), Onboarding (T04) y el Servicio Puppeteer (T06).
4. **Orquestación:** Ensamblar el Pipeline Runner (T06.5) e integrarlo con los prompts reales provistos.
