<script lang="ts">
  // "Predice antes de mirar": el alumno se compromete con una respuesta antes de tocar la simulación,
  // la comprueba jugando y luego ve la explicación. Comprometerse primero hace que la sorpresa se recuerde.
  import { inline, type Check } from '../lib/comprueba';
  import { markToday, save } from '../lib/progress.svelte';

  let { check }: { check: Check } = $props();
  let pick = $state<number | null>(null);
  let shown = $state(false);
  let skipped = $state(false);
  function reveal() { shown = true; markToday(); save(); }
</script>

{#if !skipped}
  <div class="predice">
    <p class="k">Antes de tocar: ¿qué crees que pasará?</p>
    <p class="q">{@html inline(check.q)}</p>
    <div class="opts" role="group" aria-label="Tu predicción">
      {#each check.options as o, i}
        <button type="button" class="opt" class:picked={pick === i} class:right={shown && i === check.answer} class:wrong={shown && pick === i && i !== check.answer}
          aria-pressed={pick === i} disabled={shown} onclick={() => (pick = i)}>{@html inline(o)}</button>
      {/each}
    </div>
    <div aria-live="polite">
      {#if shown}
        <p class="why"><strong>{pick === check.answer ? 'Acertaste.' : 'No era esa.'}</strong> {@html inline(check.why)}</p>
      {:else if pick !== null}
        <p class="next">Anotado. Ahora pruébalo en la simulación y, cuando lo veas, <button type="button" class="link" onclick={reveal}>comprueba tu predicción</button>.</p>
      {:else}
        <button type="button" class="link skip" onclick={() => (skipped = true)}>Saltar y ir directo a la simulación</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .predice { margin: 0 0 16px; padding: 14px 16px; border-radius: var(--r-m); background: var(--helm-2); border-left: 3px solid var(--helm); }
  .k { font-size: 0.8rem; font-weight: 600; color: var(--helm-ink); text-transform: uppercase; letter-spacing: 0.04em; }
  .q { margin-top: 4px; font-weight: 500; }
  .opts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .opt { font: inherit; font-size: 0.92rem; text-align: left; padding: 8px 12px; min-height: 40px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel); color: var(--ink); cursor: pointer; }
  .opt:hover:not(:disabled) { border-color: var(--helm); }
  .opt.picked { border-color: var(--helm); box-shadow: inset 0 0 0 1px var(--helm); }
  .opt:disabled { cursor: default; opacity: 0.75; }
  .opt.right { opacity: 1; border-color: var(--ready); background: var(--ready-2); box-shadow: inset 0 0 0 1px var(--ready); }
  .opt.wrong { opacity: 1; border-color: var(--fail); background: var(--fail-2); box-shadow: inset 0 0 0 1px var(--fail); }
  .next, .why { margin-top: 10px; font-size: 0.92rem; color: var(--ink-2); }
  .why strong { color: var(--ink); }
  .link { background: none; border: 0; padding: 0; color: var(--helm-ink); text-decoration: underline; cursor: pointer; font: inherit; }
  .skip { margin-top: 8px; font-size: 0.85rem; color: var(--ink-2); }
  @media (pointer: coarse) { .opt { min-height: 44px; } }
</style>
