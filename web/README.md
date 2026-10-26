# Sitio interactivo del curso KCNA

Versión web del curso: los módulos de `../curso/*.md` renderizados con simulaciones interactivas, práctica tipo examen, flashcards y un simulador de `kubectl`. Es un sitio **estático**: se construye una vez y se sirve desde cualquier servidor de archivos.

Stack: [Astro](https://astro.build) 7 (contenido y páginas) + [Svelte](https://svelte.dev) 5 (simulaciones) + IBM Plex (tipografía autoalojada). Sin backend, sin base de datos; el progreso del alumno vive en el `localStorage` de su navegador.

## Desarrollo

```powershell
cd web
npm install
npm run dev        # http://localhost:4321 con recarga en caliente
```

`npm run dev` y `npm run build` ejecutan antes `scripts/sync-data.mjs`, que convierte `../quiz/preguntas.js` y `../quiz/flashcards.js` en JSON para el sitio. Si editas el banco de preguntas, basta con reiniciar `dev` o volver a construir.

## Construir

```powershell
cd web
npm run build      # genera web/dist
npm run preview    # sirve dist en local para comprobarlo
```

Para publicar bajo una subruta (GitHub Pages en `/<repo>/`, o `/curso` dentro del clúster) define `PUBLIC_BASE` antes de construir:

```powershell
$env:PUBLIC_BASE = '/curso'; npm run build
```

## Desplegar

| Dónde | Cómo |
|---|---|
| **Cualquier hosting estático** (Netlify, Vercel, Cloudflare Pages, un IIS/nginx interno) | Sube la carpeta `web/dist`. Comando de build: `npm run build` en `web/`. |
| **GitHub Pages** | Ya hay un flujo en `.github/workflows/pages.yml`. En el repositorio: *Settings → Pages → Source: GitHub Actions*. Cada push a `main` publica. |
| **Tu clúster kind** (es un lab más) | `.\kcna.ps1 site` desde la raíz: construye la imagen con Podman, la carga en el clúster y aplica `web/k8s/`. Queda en http://localhost:8080/curso |
| **Contenedor en cualquier sitio** | `podman build -t kcna-web -f web/Containerfile .` desde la raíz y `podman run -p 8090:80 kcna-web` → http://localhost:8090 |

## Estructura

```
src/pages/           portada, modulos/[id], practica, flashcards, terminal, entorno
src/sims/            ClusterCanvas, Stepper y una carpeta por módulo con sus simulaciones
src/sims/registry.ts qué simulaciones se montan en cada módulo
src/components/      islas compartidas (quiz del módulo, progreso, mejoras del markdown)
src/lib/             metadatos de módulos, progreso (localStorage), movimiento
src/lib/kube/        clúster simulado y parser de kubectl para la terminal
src/data/            JSON generado desde ../quiz
docs/COMPONENTES.md  guía para añadir simulaciones
k8s/                 manifiestos para publicarlo en el clúster kind
```

## Añadir contenido

- **Un módulo nuevo**: crea `../curso/NN-tema.md` siguiendo `../docs/CONVENCIONES.md` y añade su entrada en `src/lib/modules.ts`.
- **Una simulación**: lee `docs/COMPONENTES.md`; crea el componente en `src/sims/NN/` y regístralo en `src/sims/registry.ts`.
- **Preguntas**: edita las fuentes en `../quiz/src/` y ejecuta `node build.js` ahí.
