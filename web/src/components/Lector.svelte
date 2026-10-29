<script lang="ts">
  // "Escuchar este módulo": lee el texto del módulo párrafo a párrafo, resaltando el que suena.
  // Se salta código, tablas y diagramas, y para antes de "Fuentes oficiales".
  import { untrack } from 'svelte';
  import { voz, play, pause, resume, stop, jump, type Part } from '../lib/voz.svelte';
  import { progress } from '../lib/progress.svelte';
  import { bloques, findBlock, saveReading, pctOf } from '../lib/lectura';
  import VozAjustes from './VozAjustes.svelte';

  let { module }: { module: string } = $props();
  const KEY = `modulo-${module}`;
  let root: HTMLElement | undefined;
  let blocks: HTMLElement[] = [];

  function collect(): Part[] {
    const prose = root?.closest('article')?.querySelector<HTMLElement>('.prose');
    blocks = prose ? bloques(prose) : [];
    return blocks.map((b) => ({ text: b.textContent ?? '', lang: 'es' }));
  }

  const active = $derived(voz.key === KEY);

  // Resalta y sigue el párrafo que se está leyendo
  $effect(() => {
    const el = active ? blocks[voz.part] : undefined;
    if (!el) return;
    el.classList.add('leyendo');
    const i = voz.part;
    untrack(() => saveReading(module, blocks, i)); // escuchar también cuenta como leer
    const r = el.getBoundingClientRect();
    if (r.top < 80 || r.bottom > innerHeight - 110) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return () => el.classList.remove('leyendo');
  });

  function start(from = 0) { play(KEY, collect(), from); }
  // "Desde donde me quedé": el índice se calcula sobre los mismos bloques que guarda el marcador
  const saved = $derived(progress.reading[module]);
  function resumeFrom() {
    const parts = collect();
    if (saved) play(KEY, parts, findBlock(blocks, saved.last));
  }
</script>

<div bind:this={root} class="hueco" class:activo={active}>
  {#if voz.supported}
    <div class="lector" class:on={active} role="group" aria-label="Escuchar este módulo">
      {#if !active}
        <button type="button" class="btn small" onclick={() => start()}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor" /><path d="M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
          Escuchar este módulo
        </button>
        {#if saved && saved.last.i > 0}
          <button type="button" class="btn small" onclick={resumeFrom}>Desde donde me quedé ({pctOf(saved.last)} %)</button>
        {:else}
          <span class="hint">Se salta el código y los diagramas.</span>
        {/if}
      {:else}
        <button type="button" class="btn small" onclick={() => jump(voz.part - 1)} disabled={voz.part === 0} aria-label="Párrafo anterior">⏮</button>
        {#if voz.status === 'paused'}
          <button type="button" class="btn small primary" onclick={resume}>▶ Seguir</button>
        {:else}
          <button type="button" class="btn small primary" onclick={pause}>⏸ Pausa</button>
        {/if}
        <button type="button" class="btn small" onclick={() => jump(voz.part + 1)} disabled={voz.part + 1 >= voz.total} aria-label="Párrafo siguiente">⏭</button>
        <button type="button" class="btn small" onclick={stop}>⏹ Detener</button>
        <span class="hint" aria-live="polite">Párrafo {voz.part + 1} de {voz.total}</span>
      {/if}
      <span class="right"><VozAjustes /></span>
    </div>
  {/if}
</div>

<style>
  .hueco { min-height: 44px; margin: 12px 0 4px; }
  .lector { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .hint { color: var(--ink-3); font-size: 0.85rem; }
  .right { margin-left: auto; }
  /* mientras lee, los controles flotan abajo para tenerlos a mano al bajar por el texto */
  .lector.on { position: fixed; z-index: 25; left: 50%; bottom: 16px; transform: translateX(-50%); width: min(620px, calc(100% - 32px)); padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); box-shadow: 0 10px 30px rgb(0 0 0 / 0.18); }
  .lector.on .right :global(.panel) { top: auto; bottom: calc(100% + 6px); }
  @media (max-width: 480px) { .lector.on .hint { flex-basis: 100%; order: 9; } }
</style>
