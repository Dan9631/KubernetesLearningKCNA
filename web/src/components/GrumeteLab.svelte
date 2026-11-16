<script lang="ts">
  // Mandos del banco de pruebas (pages/grumete.astro): estados, acciones y energía.
  import Grumete from './Grumete.svelte';
  import type { Estado } from '../lib/grumete';

  const BUCLES: [Estado, string][] = [['reposo', 'Reposo'], ['pensando', 'Pensando'], ['dormido', 'Dormido']];
  const ACCIONES: [Estado, string][] = [['feliz', 'Feliz'], ['saludo', 'Saludo'], ['triste', 'Triste'], ['timon', 'Timón']];
  let estado = $state<Estado>('reposo');
  let energia = $state(1);
  let g: ReturnType<typeof Grumete> | undefined = $state();
</script>

<div class="lab">
  <div class="escena"><Grumete bind:this={g} {estado} {energia} size={240} /></div>
  <div class="mandos">
    <div class="grupo" role="group" aria-label="Estado de fondo">
      <span class="k">Estado</span>
      {#each BUCLES as [e, label] (e)}
        <button type="button" class="btn small" class:primary={estado === e} aria-pressed={estado === e} onclick={() => (estado = e)}>{label}</button>
      {/each}
    </div>
    <div class="grupo" role="group" aria-label="Acciones">
      <span class="k">Acción</span>
      {#each ACCIONES as [e, label] (e)}
        <button type="button" class="btn small" onclick={() => g?.go(e)}>{label}</button>
      {/each}
    </div>
    <label class="grupo"><span class="k">Energía</span>
      <input type="range" min="0" max="1.5" step="0.1" bind:value={energia} />
      <output class="mono">{energia.toFixed(1)}</output>
    </label>
  </div>
</div>

<style>
  .lab { display: grid; gap: 18px; margin-top: 24px; }
  .escena { display: grid; place-items: center; padding: 36px 16px 20px; border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); }
  .mandos { display: grid; gap: 12px; }
  .grupo { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .k { min-width: 70px; font-size: 0.85rem; font-weight: 600; color: var(--ink-2); }
  input[type='range'] { width: 200px; max-width: 60vw; }
</style>
