<script lang="ts">
  // Carga perezosa de una simulación del registro y marca el progreso al interactuar.
  import { SIMS } from '../sims/registry';
  import { touchSim } from '../lib/progress.svelte';
  import type { Component } from 'svelte';

  let { module, simId }: { module: number; simId: string } = $props();
  const entry = SIMS[module]?.find((s) => s.id === simId);
  let Comp = $state<Component<any> | null>(null);
  let error = $state('');

  $effect(() => {
    if (!entry) return;
    entry.load().then((m) => (Comp = m.default)).catch((e) => (error = String(e)));
  });
  function touched() { touchSim(`${String(module).padStart(2, '0')}:${simId}`); }
</script>

{#if entry}
  <section class="sim" onpointerdown={touched} onkeydown={touched} aria-label={entry.title}>
    <header>
      <h3>{entry.title}</h3>
      <p>{entry.intro}</p>
    </header>
    {#if Comp}
      <Comp />
    {:else if error}
      <p class="hint">No se pudo cargar la simulación: {error}</p>
    {:else}
      <p class="hint">Cargando…</p>
    {/if}
  </section>
{/if}
