<script lang="ts">
  // Botón pequeño "Escuchar": lee `parts()` en voz alta; si ya está leyendo esto, lo detiene.
  import { voz, play, stop, type Part } from '../lib/voz.svelte';

  let { key, parts, label = 'Escuchar' }: { key: string; parts: () => Part[]; label?: string } = $props();

  const active = $derived(voz.key === key);
  // Si cambia lo que muestra el botón (otra pregunta) o desaparece, deja de leer lo anterior
  $effect(() => { const k = key; return () => { if (voz.key === k) stop(); }; });
</script>

{#if voz.supported}
  <button type="button" class="escuchar" class:on={active} aria-pressed={active} onclick={() => (active ? stop() : play(key, parts()))}>
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      {#if active}
        <rect x="5" y="5" width="10" height="10" rx="1.5" fill="currentColor" />
      {:else}
        <path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor" />
        <path d="M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      {/if}
    </svg>
    <span>{active ? 'Detener' : label}</span>
  </button>
{/if}

<style>
  .escuchar { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 0.82rem; color: var(--ink-2); background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px 3px 8px; cursor: pointer; white-space: nowrap; transition: border-color var(--dur), color var(--dur), background var(--dur); }
  .escuchar:hover { border-color: var(--helm); color: var(--helm-ink); }
  .escuchar.on { border-color: var(--helm); background: var(--helm-2); color: var(--helm-ink); }
</style>
