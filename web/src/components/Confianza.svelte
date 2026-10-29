<script lang="ts">
  // "¿Qué tan seguro estás?" antes de responder: Seguro / Dudo / Adivino (teclas S, D, A en la práctica).
  // Por defecto "Dudo" para no frenar; marcar "Seguro" y fallar revela una idea equivocada.
  import type { Conf } from '../lib/progress.svelte';
  import { CONF_LABEL } from '../lib/preparacion';

  let { value, onchange, keys = false }: { value: Conf; onchange: (c: Conf) => void; keys?: boolean } = $props();
  const OPTS: Conf[] = ['s', 'd', 'a'];
</script>

<div class="conf" role="radiogroup" aria-label="¿Qué tan seguro estás?">
  <span class="lbl">¿Qué tan seguro estás?</span>
  <span class="opts">
    {#each OPTS as k}
      <button type="button" role="radio" aria-checked={value === k} class="c-{k}" class:on={value === k} onclick={() => onchange(k)}>
        {CONF_LABEL[k]}{#if keys}<kbd aria-hidden="true">{k.toUpperCase()}</kbd>{/if}
      </button>
    {/each}
  </span>
</div>

<style>
  .conf { display: flex; align-items: center; gap: 6px 10px; flex-wrap: wrap; margin-top: 12px; }
  .lbl { font-size: 0.85rem; color: var(--ink-2); }
  .opts { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; }
  button { font: inherit; font-size: 0.85rem; padding: 4px 12px; border: 0; background: var(--panel); color: var(--ink-2); cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
  button + button { border-left: 1px solid var(--line); }
  button:hover { color: var(--ink); }
  button.on { background: var(--helm-2); color: var(--helm-ink); font-weight: 500; }
  button.c-s.on { background: var(--ready-2); color: var(--ready); }
  button.c-a.on { background: var(--wait-2); color: var(--wait); }
  kbd { font: 0.7rem var(--mono); color: var(--ink-3); }
</style>
