<script lang="ts">
  // Reproductor por etapas: avanza paso a paso (o solo) y entrega el índice actual a la escena.
  import type { Snippet } from 'svelte';
  import { ms } from '../lib/motion';

  export interface Stage { title: string; text: string; /** ms que dura si se reproduce solo */ hold?: number }
  interface Props {
    stages: Stage[];
    /** escena que se dibuja con la etapa actual */
    scene: Snippet<[number, Stage]>;
    autoplay?: boolean;
    onchange?: (i: number) => void;
  }
  let { stages, scene, autoplay = false, onchange }: Props = $props();

  let i = $state(0);
  let playing = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function go(n: number) {
    i = Math.max(0, Math.min(stages.length - 1, n));
    onchange?.(i);
    if (playing) schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (i >= stages.length - 1) { playing = false; return; }
    timer = setTimeout(() => { i += 1; onchange?.(i); schedule(); }, ms(stages[i].hold ?? 1800) || 600);
  }
  function play() { playing = !playing; if (playing) { if (i >= stages.length - 1) i = 0; schedule(); } else clearTimeout(timer); }
  $effect(() => { if (autoplay) { playing = true; schedule(); } return () => clearTimeout(timer); });
  function key(e: KeyboardEvent) { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); }
</script>

<div class="stepper" onkeydown={key} tabindex="-1" role="group" aria-label="Etapas">
  <div class="scene">{@render scene(i, stages[i])}</div>
  <div class="track" role="tablist">
    {#each stages as s, k}
      <button type="button" role="tab" aria-selected={k === i} class:done={k < i} class:cur={k === i} onclick={() => go(k)} title={s.title}>
        <span class="n">{k + 1}</span>
      </button>
    {/each}
  </div>
  <div class="caption" aria-live="polite">
    <strong>{stages[i].title}</strong>
    <p>{stages[i].text}</p>
  </div>
  <div class="nav">
    <button type="button" class="btn small" onclick={() => go(i - 1)} disabled={i === 0}>Anterior</button>
    <button type="button" class="btn small" onclick={play}>{playing ? 'Pausar' : 'Reproducir'}</button>
    <button type="button" class="btn small primary" onclick={() => go(i + 1)} disabled={i === stages.length - 1}>Siguiente</button>
    <span class="count">{i + 1} / {stages.length}</span>
  </div>
</div>

<style>
  .stepper { display: grid; gap: 12px; outline: none; }
  .scene { min-height: 120px; }
  .track { display: flex; gap: 4px; }
  .track button { flex: 1; height: 26px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel-2); cursor: pointer; padding: 0; color: var(--ink-3); font: 500 0.72rem var(--mono); transition: background var(--dur), border-color var(--dur); }
  .track button.done { background: var(--helm-2); border-color: var(--helm-2); color: var(--helm-ink); }
  .track button.cur { background: var(--helm); border-color: var(--helm); color: #fff; }
  .caption { min-height: 58px; }
  .caption strong { font-weight: 600; }
  .caption p { color: var(--ink-2); font-size: 0.95rem; margin-top: 2px; }
  .nav { display: flex; gap: 8px; align-items: center; }
  .count { margin-left: auto; font-size: 0.8rem; color: var(--ink-3); font-family: var(--mono); }
</style>
