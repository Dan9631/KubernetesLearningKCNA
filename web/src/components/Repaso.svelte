<script lang="ts">
  // Línea bajo la explicación: qué significó la confianza declarada y cuándo vuelve a salir la pregunta.
  import { progress, DAY, type Conf } from '../lib/progress.svelte';

  let { id, conf, correct }: { id: string; conf?: Conf; correct: boolean } = $props();
  const due = $derived(progress.quiz[id]?.due);
  const days = $derived(due ? Math.max(1, Math.round((due - Date.now()) / DAY)) : 0);
  const when = $derived(days === 1 ? 'mañana' : `en ${days} días`);
</script>

{#if conf === 's' && !correct}
  <p class="rep sure">Fallo con seguridad: es una idea equivocada, justo lo que más conviene corregir. Vuelve {when} y queda pendiente hasta que la aciertes con días de por medio.</p>
{:else if conf === 'a' && correct}
  <p class="rep guess">Acertaste adivinando: no sube de nivel. Vuelve {when}.</p>
{:else if due}
  <p class="rep">Próximo repaso {when}.</p>
{/if}

<style>
  .rep { margin-top: 8px; font-size: 0.85rem; color: var(--ink-3); }
  .sure { color: var(--fail); }
  .guess { color: var(--wait); }
</style>
