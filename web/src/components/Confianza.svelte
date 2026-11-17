<script lang="ts">
  // "¿Qué tan seguro estás?" antes de responder: Seguro / Dudo / Adivino (teclas S, D, A en la práctica).
  // Por defecto "Dudo" para no frenar; marcar "Seguro" y fallar revela una idea equivocada.
  import type { Conf } from '../lib/progress.svelte';
  import { CONF_LABEL } from '../lib/preparacion';
  import { pastilla } from '../lib/pastilla';

  let { value, onchange, keys = false }: { value: Conf; onchange: (c: Conf) => void; keys?: boolean } = $props();
  const OPTS: Conf[] = ['s', 'd', 'a'];
</script>

<div class="conf" role="radiogroup" aria-label="¿Qué tan seguro estás?">
  <span class="lbl">¿Qué tan seguro estás?</span>
  <!-- la pastilla se desliza a la opción marcada y cambia de color con ella -->
  <span class="opts" style="--pc: {value === 's' ? 'var(--ready-2)' : value === 'a' ? 'var(--wait-2)' : 'var(--helm-2)'}" use:pastilla>
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
  .opts { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; background: var(--panel); }
  /* el color va en --pc (no en una clase del contenedor: reescribir su class quitaría la de la pastilla) */
  .opts :global(.pastilla) { background: var(--pc); }
  button { font: inherit; font-size: 0.85rem; padding: 4px 12px; border: 0; background: none; color: var(--ink-2); cursor: pointer; display: inline-flex; gap: 6px; align-items: center;
    transition: color var(--dur-fast) linear; }
  button + button { border-left: 1px solid var(--line); }
  button:hover { color: var(--ink); }
  button.on { color: var(--helm-ink); font-weight: 500; }
  button.c-s.on { color: var(--ready); }
  button.c-a.on { color: var(--wait); }
  /* sin pastilla (antes de hidratar) el fondo va en el botón */
  .opts:not(:global(.con-pastilla)) button.on { background: var(--helm-2); }
  .opts:not(:global(.con-pastilla)) button.c-s.on { background: var(--ready-2); }
  .opts:not(:global(.con-pastilla)) button.c-a.on { background: var(--wait-2); }
  kbd { font: 0.7rem var(--mono); color: var(--ink-3); }
</style>
