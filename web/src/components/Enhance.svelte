<script lang="ts">
  // Mejora el markdown renderizado: diagramas Mermaid, botón copiar y pasos del laboratorio con casilla.
  import { progress, toggleStep, toggleDone } from '../lib/progress.svelte';

  let { module }: { module: string } = $props();
  let root: HTMLElement | undefined;

  const isDark = () => document.documentElement.dataset.theme === 'dark';

  async function mermaid(prose: HTMLElement) {
    const blocks = [...prose.querySelectorAll<HTMLPreElement>('pre')].filter((pre) => {
      const lang = pre.dataset.language ?? pre.querySelector('code')?.className ?? '';
      return /mermaid/.test(lang);
    });
    if (!blocks.length) return;
    const { default: m } = await import('mermaid');
    m.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark() ? 'dark' : 'neutral', fontFamily: 'IBM Plex Sans, sans-serif',
      themeVariables: isDark() ? { background: '#141f34' } : { primaryColor: '#e3ebfb', primaryBorderColor: '#2f5fd0', lineColor: '#4a5a72' } });
    for (const [k, pre] of blocks.entries()) {
      const src = (pre.querySelector('code') ?? pre).textContent ?? '';
      const div = document.createElement('div');
      div.className = 'mermaid';
      try {
        const { svg } = await m.render(`mmd-${module}-${k}`, src);
        div.innerHTML = svg;
      } catch (e) {
        console.warn('mermaid:', e);
        div.innerHTML = `<pre>${src.replace(/</g, '&lt;')}</pre>`;
      }
      pre.replaceWith(div);
    }
  }

  function copyButtons(prose: HTMLElement) {
    for (const pre of prose.querySelectorAll<HTMLPreElement>('pre')) {
      if (pre.querySelector('.copy')) continue;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'copy'; b.textContent = 'Copiar';
      b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText((pre.querySelector('code') ?? pre).textContent ?? ''); b.textContent = 'Copiado'; b.classList.add('done'); }
        catch { b.textContent = 'No disponible'; }
        setTimeout(() => { b.textContent = 'Copiar'; b.classList.remove('done'); }, 1600);
      });
      pre.appendChild(b);
    }
  }

  // Los pasos del laboratorio son los h3 entre "## Laboratorio guiado" y el siguiente h2
  function labSteps(prose: HTMLElement) {
    const h2 = [...prose.querySelectorAll('h2')].find((h) => /laboratorio/i.test(h.textContent ?? ''));
    if (!h2) return;
    let el = h2.nextElementSibling;
    let n = 0;
    while (el && el.tagName !== 'H2') {
      if (el.tagName === 'H3') {
        n += 1;
        const h = el as HTMLHeadingElement;
        const id = String(n);
        const box = document.createElement('input');
        box.type = 'checkbox'; box.setAttribute('aria-label', `Paso ${n} hecho`);
        const sync = () => { const done = (progress.steps[module] ?? []).includes(id); box.checked = done; h.classList.toggle('done', done); };
        box.addEventListener('change', () => { toggleStep(module, id); sync(); });
        h.classList.add('step'); h.prepend(box); sync();
      }
      el = el.nextElementSibling;
    }
  }

  $effect(() => {
    const prose = root?.closest('article')?.querySelector<HTMLElement>('.prose') ?? document.querySelector<HTMLElement>('.prose');
    if (!prose) return;
    labSteps(prose);
    mermaid(prose).finally(() => copyButtons(prose));
  });

  const done = $derived(progress.done.includes(module));
  const steps = $derived((progress.steps[module] ?? []).length);
</script>

<div bind:this={root} class="status">
  <span class="hint">{steps ? `${steps} paso${steps === 1 ? '' : 's'} del laboratorio hechos` : 'Marca los pasos del laboratorio a medida que los completes.'}</span>
  <button type="button" class="btn small" class:primary={!done} onclick={() => toggleDone(module)}>{done ? 'Módulo terminado ✓' : 'Marcar módulo terminado'}</button>
</div>

<style>
  .status { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin: 20px 0 8px; padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); }
  .hint { color: var(--ink-2); font-size: 0.92rem; }
</style>
