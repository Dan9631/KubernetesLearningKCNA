<script lang="ts">
  // Botón flotante del módulo: escuchar (desde aquí o desde el inicio), volver a donde te quedaste,
  // ir a lo más lejos, seguir en el teléfono (QR) y ajustes de voz, sin salir del módulo.
  // Pide las acciones a Lector y Marcador con eventos de ventana (ver lib/lectura.ts).
  import { onMount } from 'svelte';
  import { progress } from '../lib/progress.svelte';
  import { voz } from '../lib/voz.svelte';
  import { bloques, currentBlock, findBlock, pctOf, sectionOf, EV_ESCUCHAR, EV_IR } from '../lib/lectura';
  import Compartir from './Compartir.svelte';
  import VozAjustes from './VozAjustes.svelte';

  let { module }: { module: string } = $props();
  let open = $state(false);
  let blocks = $state.raw<HTMLElement[]>([]);
  let here = $state(-1); // bloque en pantalla al abrir el menú
  let share: Compartir | undefined = $state();
  let root: HTMLElement | undefined;

  const saved = $derived(progress.reading[module]);
  const lastI = $derived(saved && blocks.length ? findBlock(blocks, saved.last) : -1);
  const farI = $derived(saved && blocks.length ? findBlock(blocks, saved.far) : -1);
  const pct = (i: number) => pctOf({ i, n: blocks.length, t: 0 });
  // mientras suena el módulo, sus controles flotantes ocupan este sitio
  const playing = $derived(voz.key === `modulo-${module}`);

  function toggle() {
    if (!open) here = currentBlock(blocks);
    open = !open;
  }
  function act(fn: () => void) { open = false; fn(); }
  const escuchar = (from: number) => act(() => dispatchEvent(new CustomEvent(EV_ESCUCHAR, { detail: { from } })));
  const ir = (to: 'last' | 'far') => act(() => dispatchEvent(new CustomEvent(EV_IR, { detail: to })));

  onMount(() => {
    const prose = document.querySelector<HTMLElement>('article .prose');
    if (prose) blocks = bloques(prose);
    const close = (e: Event) => {
      if (!open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root?.contains(e.target as Node)) open = false;
    };
    addEventListener('pointerdown', close);
    addEventListener('keydown', close);
    return () => { removeEventListener('pointerdown', close); removeEventListener('keydown', close); };
  });
</script>

<div class="acciones" class:hidden={playing} bind:this={root}>
  {#if open}
    <div class="menu" role="menu" aria-label="Lectura y audio del módulo">
      {#if saved && lastI >= 0}
        <p class="estado">Leído hasta el {pct(farI)} %{sectionOf(blocks, lastI) ? ` · última vez en «${sectionOf(blocks, lastI)}»` : ''}</p>
      {/if}
      {#if voz.supported}
        {#if here > 0}
          <button type="button" role="menuitem" onclick={() => escuchar(here)}><span class="i" aria-hidden="true">▶</span>Escuchar desde aquí <em>{pct(here)} %</em></button>
        {/if}
        <button type="button" role="menuitem" onclick={() => escuchar(0)}><span class="i" aria-hidden="true">▶</span>Escuchar desde el inicio</button>
      {/if}
      {#if lastI >= 0 && Math.abs(lastI - here) > 3}
        <button type="button" role="menuitem" onclick={() => ir('last')}><span class="i" aria-hidden="true">↩</span>Volver a donde me quedé <em>{pct(lastI)} %</em></button>
      {/if}
      {#if farI > Math.max(here, lastI) + 3}
        <button type="button" role="menuitem" onclick={() => ir('far')}><span class="i" aria-hidden="true">⏭</span>Ir a lo más lejos <em>{pct(farI)} %</em></button>
      {/if}
      {#if saved}
        <button type="button" role="menuitem" onclick={() => act(() => share?.open())}><span class="i" aria-hidden="true">📱</span>Seguir en el teléfono (QR)</button>
      {:else}
        <p class="nota">Cuando avances leyendo podrás llevar tu posición al teléfono con un código QR.</p>
      {/if}
      {#if voz.supported}<div class="voz"><VozAjustes /></div>{/if}
    </div>
  {/if}
  <button type="button" class="fab" aria-expanded={open} aria-label={open ? 'Cerrar menú de lectura y audio' : 'Menú de lectura y audio'} onclick={toggle}>
    {#if open}
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
    {:else}
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" stroke="currentColor" stroke-width="1.8" /><rect x="3" y="13" width="4.5" height="7" rx="1.5" fill="currentColor" /><rect x="16.5" y="13" width="4.5" height="7" rx="1.5" fill="currentColor" /></svg>
    {/if}
    {#if saved && !open}<span class="badge">{pct(farI)}%</span>{/if}
  </button>
</div>
<!-- el diálogo del QR vive fuera del menú: así no desaparece al cerrarlo -->
<Compartir bind:this={share} boton={false} />

<style>
  .acciones { position: fixed; z-index: 24; right: 16px; bottom: 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
  .acciones.hidden { display: none; }
  .fab { position: relative; width: 52px; height: 52px; border-radius: 50%; border: 0; background: var(--helm); color: #fff; display: grid; place-items: center; cursor: pointer; box-shadow: 0 6px 20px rgb(0 0 0 / 0.22); transition: transform var(--dur), background var(--dur); }
  .fab:hover { background: var(--helm-ink); }
  .fab:active { transform: scale(0.96); }
  .badge { position: absolute; top: -4px; right: -6px; font: 600 0.66rem var(--mono); background: var(--panel); color: var(--helm-ink); border: 1px solid var(--helm); border-radius: 999px; padding: 1px 5px; }
  .menu { width: min(300px, calc(100vw - 32px)); display: grid; gap: 2px; padding: 8px; border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); box-shadow: 0 12px 34px rgb(0 0 0 / 0.2); }
  .menu button { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; font: inherit; font-size: 0.93rem; color: var(--ink); background: transparent; border: 0; border-radius: var(--r-s); padding: 9px 10px; cursor: pointer; }
  .menu button:hover, .menu button:focus-visible { background: var(--helm-2); color: var(--helm-ink); }
  .menu em { margin-left: auto; font-style: normal; font-size: 0.8rem; color: var(--ink-3); }
  .i { width: 18px; text-align: center; flex: none; }
  .estado, .nota { margin: 2px 10px 6px; font-size: 0.82rem; color: var(--ink-3); overflow-wrap: anywhere; }
  .voz { position: relative; border-top: 1px solid var(--line-2); margin-top: 4px; padding: 8px 10px 2px; }
  /* el panel de ajustes de voz se abre hacia arriba, con el ancho del menú, para no salirse de la pantalla */
  .voz :global(.ajustes) { position: static; }
  .voz :global(.panel) { top: auto; bottom: calc(100% + 6px); left: 0; right: 0; width: auto; }
  @media print { .acciones { display: none; } }
</style>
