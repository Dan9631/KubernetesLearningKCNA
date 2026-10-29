<script lang="ts">
  // Marcador de lectura del módulo (como Kindle): guarda solo dónde vas leyendo y, al volver,
  // ofrece continuar desde la última posición o desde la más lejana. Ver lib/lectura.ts.
  import { onMount } from 'svelte';
  import { progress } from '../lib/progress.svelte';
  import { bloques, saveReading, findBlock, sectionOf, pctOf, importReading } from '../lib/lectura';
  import Compartir from './Compartir.svelte';

  let { module }: { module: string } = $props();
  let root: HTMLElement | undefined;
  let blocks = $state.raw<HTMLElement[]>([]);
  let show = $state(false);
  let armed = false; // hay desplazamiento del alumno (ver onMount)
  const LINE = 0.33; // línea de lectura: tercio superior de la pantalla

  const saved = $derived(progress.reading[module]);
  const lastI = $derived(saved && blocks.length ? findBlock(blocks, saved.last) : -1);
  const farI = $derived(saved && blocks.length ? findBlock(blocks, saved.far) : -1);
  const where = $derived(lastI >= 0 ? sectionOf(blocks, lastI) : '');

  // Coloca el bloque justo en la línea de lectura, para que al seguir leyendo cuente como ese bloque
  const place = (el: HTMLElement) => scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * (LINE - 0.05) });
  function irA(i: number) {
    const el = blocks[i];
    if (!el) return;
    show = false;
    armed = false; // el salto no es lectura; vuelve a contar con el siguiente gesto del alumno
    place(el);
    el.classList.remove('marca'); void el.offsetWidth; el.classList.add('marca');
    // los diagramas Mermaid se dibujan después y empujan el texto: se recoloca una vez
    setTimeout(() => { if (Math.abs(el.getBoundingClientRect().top - innerHeight * (LINE - 0.05)) > 60) place(el); }, 900);
  }

  // Bloque que se está leyendo: el último cuyo inicio ya pasó por el tercio superior de la pantalla
  function current(): number {
    const line = innerHeight * LINE;
    let cur = -1;
    for (let k = 0; k < blocks.length; k++) { if (blocks[k].getBoundingClientRect().top <= line) cur = k; else break; }
    return cur;
  }

  onMount(() => {
    const prose = root?.closest('article')?.querySelector<HTMLElement>('.prose');
    if (!prose) return;
    blocks = bloques(prose);

    const params = new URLSearchParams(location.search);
    const r = params.get('r');
    let jump = location.hash === '#continuar';
    if (r) {
      importReading(r);
      params.delete('r');
      jump = true;
    }
    if (r || jump) history.replaceState(null, '', location.pathname + (params.size ? `?${params}` : '') + (location.hash === '#continuar' ? '' : location.hash));
    const pos = progress.reading[module];
    if (jump && pos) setTimeout(() => irA(findBlock(blocks, pos.last)), 300);
    else show = !!pos && findBlock(blocks, pos.last) >= 2;

    let timer: ReturnType<typeof setTimeout> | undefined;
    // Solo cuenta el desplazamiento del alumno: la restauración del scroll al recargar, los saltos de
    // "Continuar" y lo que empujan los diagramas al dibujarse no deben pisar la posición guardada
    const arm = () => { armed = true; };
    const INPUT = ['wheel', 'touchmove', 'keydown'] as const;
    for (const ev of INPUT) addEventListener(ev, arm, { passive: true });
    const record = () => {
      if (!armed) return;
      const i = current();
      if (i < 0) return; // aún en la cabecera o en las simulaciones: no pisa la posición guardada
      saveReading(module, blocks, i);
      if (show && i >= lastI - 1) show = false;
    };
    const onScroll = () => { clearTimeout(timer); timer = setTimeout(record, 500); };
    const flush = () => { clearTimeout(timer); record(); };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('pagehide', flush);
    return () => { removeEventListener('scroll', onScroll); removeEventListener('pagehide', flush); for (const ev of INPUT) removeEventListener(ev, arm); clearTimeout(timer); };
  });
</script>

<div bind:this={root}>
  {#if show && saved && lastI >= 0}
    <div class="marcador" role="region" aria-label="Continuar leyendo">
      <p>
        <strong>Te quedaste en</strong>{where ? ` «${where}»` : ` el párrafo ${lastI + 1}`}
        <span class="pct">· {pctOf({ ...saved.last, i: lastI, n: blocks.length })} % del módulo</span>
      </p>
      <div class="act">
        <button type="button" class="btn small primary" onclick={() => irA(lastI)}>Continuar</button>
        {#if farI > lastI + 2}
          <button type="button" class="btn small" onclick={() => irA(farI)}>Ir a lo más lejos ({pctOf({ ...saved.far, i: farI, n: blocks.length })} %)</button>
        {/if}
        <Compartir />
        <button type="button" class="x" aria-label="Cerrar aviso" onclick={() => (show = false)}>×</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .marcador { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 14px; margin: 16px 0 4px; padding: 12px 14px; border: 1px solid var(--helm); border-radius: var(--r-m); background: var(--helm-2); }
  p { margin: 0; color: var(--ink); font-size: 0.95rem; overflow-wrap: anywhere; }
  .pct { color: var(--ink-2); font-size: 0.88rem; }
  .act { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .x { font: inherit; font-size: 1.2rem; line-height: 1; border: 0; background: transparent; color: var(--ink-2); cursor: pointer; padding: 2px 6px; }
  .x:hover { color: var(--ink); }
</style>
