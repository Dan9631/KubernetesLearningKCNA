<script lang="ts">
  // Carga perezosa de una simulación del registro y marca el progreso al interactuar.
  import { SIMS } from '../sims/registry';
  import { touchSim } from '../lib/progress.svelte';
  import { PREDICCIONES } from '../lib/comprueba';
  import Predice from './Predice.svelte';
  import { avisarGrumete } from '../lib/grumete-avisos';
  import type { Component } from 'svelte';

  let { module, simId }: { module: number; simId: string } = $props();
  const entry = SIMS[module]?.find((s) => s.id === simId);
  const prediccion = PREDICCIONES[`${String(module).padStart(2, '0')}:${simId}`];
  let Comp = $state<Component<any> | null>(null);
  let error = $state('');

  $effect(() => {
    if (!entry) return;
    entry.load().then((m) => (Comp = m.default)).catch((e) => (error = String(e)));
  });
  // la primera vez que se toca la simulación tras predecir, Grumete la mira (solo eso: ni gesto ni globo)
  let simEl: HTMLElement | undefined = $state();
  let mirada = false;
  function touched(e: Event) {
    touchSim(`${String(module).padStart(2, '0')}:${simId}`);
    if (mirada || !simEl || !simEl.contains(e.target as Node)) return;
    if (!(e.currentTarget as HTMLElement).querySelector('.predice .opt.picked')) return;
    mirada = true;
    avisarGrumete({ tipo: 'mira', el: simEl });
  }
</script>

{#if entry}
  <section class="sim" onpointerdown={touched} onkeydown={touched} aria-label={entry.title}>
    <header>
      <h3>{entry.title}</h3>
      <p>{entry.intro}</p>
    </header>
    {#if prediccion}<Predice check={prediccion} />{/if}
    {#if Comp}
      <!-- llega con un fundido en vez de sustituir de golpe al «Cargando…» -->
      <div class="llega" bind:this={simEl}><Comp /></div>
    {:else if error}
      <p class="hint">No se pudo cargar la simulación: {error}</p>
    {:else}
      <p class="hint">Cargando…</p>
    {/if}
  </section>
{/if}

<style>
  .llega { animation: mc-fundido var(--dur) linear both; }
</style>
