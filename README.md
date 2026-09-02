# W2B Optimizer

Optimizador de imágenes y video para el equipo de W2B Agency. Convierte a
formatos modernos (WebP, AVIF) con control sobre dimensiones y calidad.

Todo el procesamiento ocurre **en el navegador** — ffmpeg.wasm para video y
Canvas para imágenes. Ningún archivo sale de la máquina de quien lo usa.

React 19 · Vite · Tailwind 4 · ffmpeg.wasm

**En producción: <https://optimized-image-w2b.vercel.app/>**

## Arranque

```sh
npm install
npm run dev          # http://localhost:3000
```

No hace falta ningún `.env` para optimizar. `GEMINI_API_KEY` es opcional y solo
habilita las sugerencias con IA; sin ella la herramienta funciona igual.

```sh
cp .env.example .env.local   # solo si quieres las sugerencias con IA
```

## Comandos

```sh
npm run dev       # servidor de desarrollo
npm run build     # build de producción a dist/
npm run preview   # servir el build local
npm run lint      # typecheck (tsc --noEmit)
npm run clean     # borrar dist/
```

## Otras herramientas del equipo

- [W2B CRM](https://crm.w2bagency.com/) — pipeline, contactos y cotizaciones
- [W2B Tasks](https://task.w2bagency.com/) — proyectos, tareas y dailies

El header de la app enlaza a ambas. La lista vive en `src/lib/tools.ts` y está
duplicada en los otros dos repos: al agregar una herramienta, actualizar los tres.
