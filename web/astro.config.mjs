// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// Sitio 100% estático. Para publicarlo bajo una subruta (p. ej. GitHub Pages en /KubernetesLearning/)
// define PUBLIC_BASE antes de construir:  $env:PUBLIC_BASE='/KubernetesLearning'; npm run build
const base = process.env.PUBLIC_BASE || '/';

export default defineConfig({
  output: 'static',
  base,
  trailingSlash: 'ignore',
  integrations: [svelte()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      defaultColor: false,
      // ```prompt en INSTALL.md: texto plano, pero conserva la etiqueta para el botón "Copiar prompt"
      langAlias: { prompt: 'plaintext' },
    },
  },
  vite: {
    // La carpeta curso/ está fuera de web/: hay que permitir que Vite la sirva en desarrollo
    server: { fs: { allow: ['..'] } },
  },
});
