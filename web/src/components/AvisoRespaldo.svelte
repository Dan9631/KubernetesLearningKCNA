<script lang="ts">
  // Aviso discreto cuando hay progreso que perder y ningún respaldo (portada y panel de preparación).
  // Se puede posponer; las reglas están en lib/respaldo.ts (aviso).
  import { onMount } from 'svelte';
  import { progress } from '../lib/progress.svelte';
  import { sync, syncAvailable } from '../lib/sync.svelte';
  import { respaldo, snooze, pedirPersistencia, pideSinPreguntar } from '../lib/respaldo.svelte';
  import { aviso } from '../lib/respaldo';
  import { url } from '../lib/modules';

  let ready = $state(false); // se decide en el navegador, con lo guardado: nada en el HTML estático
  onMount(() => {
    ready = true;
    // con progreso real, pide conservar los datos donde el navegador no muestra un permiso
    if ((progress.days.length >= 3 || progress.done.length) && pideSinPreguntar()) pedirPersistencia();
  });

  const kind = $derived(ready ? aviso({
    days: progress.days.length, done: progress.done.length,
    syncAvailable, syncOn: !!sync.code, codeSaved: sync.saved,
    exported: respaldo.exported, snoozed: respaldo.snoozed, now: Date.now(),
  }) : null);

  const text = $derived({
    activar: { t: 'Tu progreso solo está en este navegador', d: `Llevas ${progress.days.length} ${progress.days.length === 1 ? 'día' : 'días'} de estudio guardados aquí. Si se borran los datos del navegador, se pierden. Activa la sincronización o descarga una copia.`, b: 'Proteger mi progreso' },
    archivo: { t: 'Tu progreso solo está en este navegador', d: 'Si se borran los datos del navegador, se pierde. Descarga una copia en un archivo de vez en cuando.', b: 'Descargar una copia' },
    codigo: { t: 'Aún no guardas tu código de sincronización', d: 'Si pierdes este dispositivo, el código es la única forma de recuperar tu progreso.', b: 'Guardar mi código' },
  });
</script>

{#if kind}
  {@const c = text[kind]}
  <aside class="aviso" aria-label="Respaldo del progreso">
    <div class="tx">
      <strong>{c.t}</strong>
      <span>{c.d}</span>
    </div>
    <div class="acts">
      <a class="btn small" href={url(kind === 'archivo' ? '/sincronizar/#copia' : '/sincronizar/')}>{c.b}</a>
      <button type="button" class="link" onclick={snooze}>Ahora no</button>
    </div>
  </aside>
{/if}

<style>
  .aviso { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between; margin-top: 12px; padding: 12px 14px; border: 1px solid var(--line); border-left: 3px solid var(--wait); border-radius: var(--r-m); background: var(--panel-2); }
  .tx { display: grid; gap: 2px; min-width: 0; flex: 1 1 260px; }
  .tx strong { font-weight: 600; }
  .tx span { font-size: 0.88rem; color: var(--ink-2); }
  .acts { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  a.btn { text-decoration: none; }
  .link { background: none; border: 0; padding: 0; min-height: 44px; color: var(--ink-2); text-decoration: underline; cursor: pointer; font: inherit; font-size: 0.88rem; }
</style>
