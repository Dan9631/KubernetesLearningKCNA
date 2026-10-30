<script lang="ts">
  // Mapa de memoria: por competencia, cuántas preguntas tienes firmes, en proceso o frágiles según la
  // repetición espaciada (lib/preparacion.ts memoria()). Al volver, las barras crecen desde como las
  // dejaste en tu última visita a este dispositivo, para ver lo que subió con el repaso.
  import { onMount } from 'svelte';
  import { progress } from '../lib/progress.svelte';
  import { memoria } from '../lib/preparacion';
  import { url } from '../lib/modules';

  const KEY = 'kcna.mapa.v1'; // instantánea por dispositivo, solo para la animación
  type Snap = Record<string, [number, number, number]>;

  const rows = $derived(memoria(progress));
  const totals = $derived(rows.reduce((t, x) => ({ firme: t.firme + x.firme, seen: t.seen + x.firme + x.proceso + x.fragil, total: t.total + x.total }), { firme: 0, seen: 0, total: 0 }));
  const short = (name: string) => name.replace(/^Kubernetes /, '').replace(/^Cloud Native /, '');

  function loadSnap(): Snap | null {
    try { const s = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return s && typeof s === 'object' ? s : null; } catch { return null; }
  }
  // el componente solo se crea en el navegador (Hoy.svelte lo muestra si hay progreso): el primer pintado ya es la visita anterior
  const old = loadSnap();
  let prev = $state<Snap | null>(old); // mientras no es null, las barras muestran la visita anterior
  const gained = old ? rows.reduce((g, x) => g + Math.max(0, x.firme - (old[x.c.name]?.[2] ?? 0)), 0) : 0;
  onMount(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => (prev = null)));
    try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(rows.map((x) => [x.c.name, [x.fragil, x.proceso, x.firme]])))); } catch { /* sin almacenamiento */ }
  });

  const w = (n: number, total: number) => `${total ? (100 * n) / total : 0}%`;
  const shown = (x: (typeof rows)[number]) => (prev?.[x.c.name] ? { fragil: prev[x.c.name][0], proceso: prev[x.c.name][1], firme: prev[x.c.name][2] } : x);
</script>

<section class="mapa" aria-labelledby="h-mapa">
  <div class="head">
    <h2 id="h-mapa">Tu memoria</h2>
    <p>{totals.firme} de {totals.total} preguntas firmes{gained ? ` · +${gained} desde tu última visita` : ''}</p>
  </div>
  <ul class="rows">
    {#each rows as x (x.c.name)}
      {@const s = shown(x)}
      <li>
        <a class="name" href={url(x.module ? `/practica?modo=practica&modulo=${x.module.n}` : '/practica?modo=practica')} title="{x.c.name}: practicar">{short(x.c.name)}</a>
        <span class="bar" role="img" aria-label="{x.c.name}: {x.firme} firmes, {x.proceso} en proceso, {x.fragil} frágiles y {x.total - x.firme - x.proceso - x.fragil} sin ver, de {x.total}">
          <span class="firme" style:width={w(s.firme, x.total)}></span><span class="proceso" style:width={w(s.proceso, x.total)}></span><span class="fragil" style:width={w(s.fragil, x.total)}></span>
        </span>
        <span class="n">{x.firme}/{x.total}{#if x.due}<em title="vencen hoy"> · {x.due} hoy</em>{/if}</span>
      </li>
    {/each}
  </ul>
  <p class="legend">
    <span><i class="firme"></i>Firme: vuelve en 16 días o más</span>
    <span><i class="proceso"></i>En proceso</span>
    <span><i class="fragil"></i>Frágil: vuelve mañana</span>
    <span><i></i>Sin ver</span>
  </p>
</section>

<style>
  .mapa { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-l); padding: 18px 20px; }
  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 12px; margin-bottom: 10px; }
  h2 { font-size: 1.12rem; }
  .head p { font-size: 0.86rem; color: var(--ink-2); }
  .rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
  li { display: grid; grid-template-columns: minmax(0, 11em) minmax(0, 1fr) auto; gap: 10px; align-items: center; font-size: 0.86rem; }
  .name { color: var(--ink); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .name:hover { color: var(--helm-ink); text-decoration: underline; }
  .bar { display: flex; height: 10px; border-radius: 5px; background: var(--line-2); overflow: hidden; }
  .bar > span { height: 100%; transition: width var(--dur-slow) var(--ease); }
  .n { font-family: var(--mono); font-size: 0.8rem; color: var(--ink-2); white-space: nowrap; }
  .n em { font-style: normal; color: var(--wait); }
  .firme { background: var(--ready); }
  .proceso { background: var(--helm); }
  .fragil { background: var(--wait); }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 12px; font-size: 0.78rem; color: var(--ink-2); }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  .legend i:not([class]) { background: var(--line-2); }
  @media (max-width: 420px) { li { grid-template-columns: minmax(0, 8.5em) minmax(0, 1fr) auto; } .mapa { padding: 16px 14px; } }
</style>
