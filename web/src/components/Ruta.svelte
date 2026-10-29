<script lang="ts">
  // La ruta del curso con el progreso del alumno. Se usa en el inicio (vertical, con detalle) y en el rail de los módulos (compacta).
  import { MODULES, DOMAINS, pad } from '../lib/modules';
  import { progress } from '../lib/progress.svelte';
  import { pctOf } from '../lib/lectura';

  let { current = -1, compact = false, base = '/' }: { current?: number; compact?: boolean; base?: string } = $props();
  const href = (n: number) => `${base.replace(/\/$/, '')}/modulos/${pad(n)}`;
  const isDone = (n: number) => progress.done.includes(pad(n));
  const started = (n: number) => (progress.steps[pad(n)]?.length ?? 0) > 0 || progress.sims.some((s) => s.startsWith(pad(n) + ':'));
  const doneCount = $derived(MODULES.filter((m) => isDone(m.n)).length);
  // hasta dónde se ha leído cada módulo (la marca más lejana)
  const readPct = (n: number) => { const r = progress.reading[pad(n)]; return r ? pctOf(r.far) : 0; };
</script>

<nav class="ruta" class:compact aria-label="Ruta del curso">
  {#if !compact}
    <p class="sum">{doneCount} de {MODULES.length} módulos terminados</p>
  {/if}
  <ol>
    {#each MODULES as m}
      <li class:cur={m.n === current} class:done={isDone(m.n)} class:started={started(m.n) && !isDone(m.n)}>
        <a href={href(m.n)} aria-current={m.n === current ? 'page' : undefined}>
          <span class="mark" aria-hidden="true">{isDone(m.n) ? '✓' : pad(m.n)}</span>
          <span class="body">
            <span class="t">{m.title}</span>
            {#if readPct(m.n) > 0 && !isDone(m.n)}<span class="read" role="img" aria-label="Leído {readPct(m.n)} %"><span style="width:{readPct(m.n)}%"></span></span>{/if}
            {#if !compact}
              <span class="s">{m.summary}</span>
              <span class="meta">
                {#if m.domain !== 'base'}<span class="chip {m.domain}">{DOMAINS[m.domain].short} · {DOMAINS[m.domain].weight}%</span>{/if}
                <span class="h">{m.hours}</span>
                {#if m.lab}<span class="h">lab verificable</span>{/if}
                {#if readPct(m.n) > 0 && !isDone(m.n)}<span class="h">leído {readPct(m.n)} %</span>{/if}
              </span>
            {/if}
          </span>
        </a>
      </li>
    {/each}
  </ol>
</nav>

<style>
  .sum { color: var(--ink-2); font-size: 0.92rem; margin-bottom: 10px; }
  ol { list-style: none; margin: 0; padding: 0; position: relative; }
  ol::before { content: ''; position: absolute; left: 15px; top: 16px; bottom: 16px; width: 2px; background: var(--line); }
  li { position: relative; }
  a { display: flex; gap: 14px; align-items: flex-start; text-decoration: none; color: var(--ink); padding: 8px 10px 8px 0; border-radius: var(--r-m); }
  a:hover .t { color: var(--helm-ink); text-decoration: underline; text-underline-offset: 3px; }
  .mark { position: relative; z-index: 1; flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font: 500 0.78rem var(--mono); background: var(--paper); border: 2px solid var(--line); color: var(--ink-3); transition: background var(--dur), border-color var(--dur); }
  .started .mark { border-color: var(--wait); color: var(--wait); }
  .done .mark { background: var(--ready); border-color: var(--ready); color: #fff; }
  .cur .mark { border-color: var(--helm); color: var(--helm); box-shadow: 0 0 0 4px var(--helm-2); }
  .cur .t { color: var(--helm-ink); font-weight: 600; }
  .body { display: grid; gap: 2px; padding-top: 4px; }
  .t { font-weight: 500; line-height: 1.3; }
  .s { color: var(--ink-2); font-size: 0.92rem; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; }
  .h { font-size: 0.8rem; color: var(--ink-3); }
  .read { display: block; width: min(160px, 100%); height: 3px; border-radius: 2px; background: var(--line-2); overflow: hidden; margin: 3px 0 1px; }
  .read > span { display: block; height: 100%; background: var(--helm); }
  .compact a { padding: 4px 6px 4px 0; gap: 10px; }
  .compact .mark { width: 24px; height: 24px; font-size: 0.68rem; }
  .compact ol::before { left: 11px; }
  .compact .t { font-size: 0.9rem; }
  .compact .body { padding-top: 1px; }
</style>
