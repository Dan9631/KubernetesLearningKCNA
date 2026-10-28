<script lang="ts">
  // Mejora el markdown renderizado: diagramas Mermaid, botón copiar y pasos del laboratorio con casilla.
  import { untrack } from 'svelte';
  import { progress, toggleStep, toggleDone } from '../lib/progress.svelte';

  // checklist=false: páginas que no son módulos (instalación) no muestran la barra de progreso
  let { module, checklist = true }: { module: string; checklist?: boolean } = $props();
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
      // Los bloques ```prompt son para pegar en un agente: botón grande y siempre visible
      const isPrompt = pre.dataset.language === 'prompt';
      const label = isPrompt ? 'Copiar prompt' : 'Copiar';
      if (isPrompt) pre.classList.add('prompt');
      const b = document.createElement('button');
      b.type = 'button'; b.className = isPrompt ? 'copy copy-prompt' : 'copy'; b.textContent = label;
      b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText((pre.querySelector('code') ?? pre).textContent ?? ''); b.textContent = 'Copiado'; b.classList.add('done'); }
        catch { b.textContent = 'No disponible'; }
        setTimeout(() => { b.textContent = label; b.classList.remove('done'); }, 1600);
      });
      pre.appendChild(b);
    }
  }

  // Los pasos del laboratorio son los h3 entre "## Laboratorio guiado" y el siguiente h2.
  // Las casillas se insertan UNA vez; su estado lo actualiza el $effect de abajo.
  let steps = $state<{ id: string; box: HTMLInputElement; h: HTMLElement }[]>([]);
  function labSteps(prose: HTMLElement) {
    const h2 = [...prose.querySelectorAll('h2')].find((h) => /laboratorio/i.test(h.textContent ?? ''));
    if (!h2) return;
    const found: typeof steps = [];
    let el = h2.nextElementSibling;
    let n = 0;
    while (el && el.tagName !== 'H2') {
      if (el.tagName === 'H3') {
        n += 1;
        const h = el as HTMLHeadingElement;
        const id = String(n);
        let box = h.querySelector<HTMLInputElement>('input.step-box');
        if (!box) {
          box = document.createElement('input');
          box.type = 'checkbox'; box.className = 'step-box'; box.setAttribute('aria-label', `Paso ${n} hecho`);
          box.addEventListener('change', () => toggleStep(module, id));
          h.classList.add('step'); h.prepend(box);
        }
        found.push({ id, box, h });
      }
      el = el.nextElementSibling;
    }
    steps = found;
  }

  // Preparación del DOM: una sola vez (untrack evita que lea `progress` y se repita en cada clic)
  $effect(() => {
    const prose = root?.closest('article')?.querySelector<HTMLElement>('.prose') ?? document.querySelector<HTMLElement>('.prose');
    if (!prose) return;
    untrack(() => {
      labSteps(prose);
      mermaid(prose).finally(() => copyButtons(prose));
    });
  });

  // Estado de las casillas: reactivo al progreso guardado
  $effect(() => {
    const done = progress.steps[module] ?? [];
    for (const s of steps) { const ok = done.includes(s.id); s.box.checked = ok; s.h.classList.toggle('done', ok); }
  });

  const done = $derived(progress.done.includes(module));
  const doneCount = $derived((progress.steps[module] ?? []).length);
</script>

<div bind:this={root} class="status" style:display={checklist ? null : 'none'}>
  <span class="hint">{doneCount ? `${doneCount} paso${doneCount === 1 ? '' : 's'} del laboratorio hechos` : 'Marca los pasos del laboratorio a medida que los completes.'}</span>
  <button type="button" class="btn small" class:primary={!done} onclick={() => toggleDone(module)}>{done ? 'Módulo terminado ✓' : 'Marcar módulo terminado'}</button>
</div>

<style>
  .status { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin: 20px 0 8px; padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); }
  .hint { color: var(--ink-2); font-size: 0.92rem; }
</style>
