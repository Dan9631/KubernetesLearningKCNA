<script lang="ts">
  // Sección «Copia en un archivo» de /sincronizar: exportar el progreso, importarlo (combinar o reemplazar)
  // y pedir al navegador que conserve los datos. Funciona aunque el sitio no tenga sincronización.
  import { onMount } from 'svelte';
  import { progress } from '../lib/progress.svelte';
  import { sync } from '../lib/sync.svelte';
  import { respaldo, exportar, importar, comprobarPersistencia, pedirPersistencia } from '../lib/respaldo.svelte';
  import { parseBackup, summary, isEmpty, MAX_BYTES } from '../lib/respaldo';
  import type { Progress } from '../lib/progress.svelte';
  import { fmtDate } from './practica/quiz';

  let ready = $state(false);
  let file: HTMLInputElement | undefined = $state();
  let copia = $state<{ exported: number; progress: Progress; name: string } | null>(null);
  let error = $state('');
  let done = $state('');
  let askReplace = $state(false);
  let asked = $state(false); // ya se pidió conservar los datos en esta visita

  onMount(() => { ready = true; comprobarPersistencia(); });

  const empty = $derived(ready && isEmpty(progress));
  const info = $derived(copia ? summary(copia.progress) : null);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts = $derived(info ? [
    info.questions ? plural(info.questions, 'pregunta respondida', 'preguntas respondidas') : '',
    info.commands ? plural(info.commands, 'comando practicado', 'comandos practicados') : '',
    info.modules ? plural(info.modules, 'módulo terminado', 'módulos terminados') : '',
    info.exams ? plural(info.exams, 'simulacro', 'simulacros') : '',
    info.days ? plural(info.days, 'día de estudio', 'días de estudio') : '',
  ].filter(Boolean) : []);

  async function pick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    error = ''; done = ''; copia = null; askReplace = false;
    if (!f) return;
    try {
      if (f.size > MAX_BYTES) throw new Error('El archivo es demasiado grande para ser una copia del progreso.');
      copia = { ...parseBackup(await f.text()), name: f.name };
    } catch (err) {
      error = (err as Error).message;
    }
    if (file) file.value = ''; // permite volver a elegir el mismo archivo
  }

  function apply(modo: 'combinar' | 'reemplazar') {
    if (!copia) return;
    importar(copia.progress, modo);
    done = modo === 'combinar' ? 'Copia combinada con tu progreso.' : 'Tu progreso se reemplazó por el de la copia.';
    if (sync.code) done += ' Se está sincronizando con tus otros dispositivos.';
    copia = null; askReplace = false;
  }
  function cancel() { copia = null; askReplace = false; }

  async function keep() { await pedirPersistencia(); asked = true; }
</script>

<section class="copia" id="copia" aria-labelledby="h-copia">
  <h2 id="h-copia">Copia en un archivo</h2>
  <p>Descarga tu progreso como un archivo y guárdalo donde quieras. Sirve como respaldo aunque no uses la sincronización, y para llevar el progreso a otro navegador.</p>

  <div class="row">
    <button type="button" class="btn primary" disabled={!ready || empty} onclick={exportar}>Descargar copia</button>
    <label class="btn" for="copia-file">Cargar una copia…</label>
    <input id="copia-file" class="visually-hidden" type="file" accept=".json,application/json" bind:this={file} onchange={pick} />
  </div>
  <p class="muted" role="status">
    {#if empty}Aún no hay progreso que copiar.
    {:else if respaldo.exported}Última copia descargada el {fmtDate(respaldo.exported)}.
    {:else if ready}Todavía no has descargado ninguna copia desde este navegador.{/if}
  </p>

  {#if error}<p class="err" role="alert">{error}</p>{/if}
  {#if done}<p class="ok" role="status">{done}</p>{/if}

  {#if copia}
    <div class="card" role="group" aria-labelledby="h-imp">
      <h3 id="h-imp">Copia {copia.exported ? `del ${fmtDate(copia.exported)}` : 'sin fecha'}</h3>
      <p class="mono">{copia.name}</p>
      <p>Contiene {parts.length ? parts.join(', ') : 'progreso de lectura y laboratorios'}.</p>
      {#if !askReplace}
        <div class="row">
          <button type="button" class="btn primary" onclick={() => apply('combinar')}>Combinar con mi progreso</button>
          <button type="button" class="btn" onclick={() => (askReplace = true)}>Reemplazar mi progreso</button>
          <button type="button" class="btn" onclick={cancel}>Cancelar</button>
        </div>
        <p class="muted">Combinar conserva lo de ambos lados: no se pierde nada. Reemplazar deja solo lo que hay en la copia.</p>
      {:else}
        <p class="warn">Se borra el progreso de este navegador y queda solo el de la copia.{#if sync.code} Como la sincronización está activa, también se reemplaza en tus otros dispositivos.{/if}</p>
        <div class="row">
          <button type="button" class="btn" onclick={() => apply('reemplazar')}>Sí, reemplazar</button>
          <button type="button" class="btn" onclick={() => (askReplace = false)}>Volver</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if ready && respaldo.persisted !== null}
    <div class="keep">
      {#if respaldo.persisted}
        <p class="muted">Este navegador conserva los datos del curso: no los borra por falta de espacio ni por inactividad.</p>
      {:else}
        <p class="muted">Este navegador puede borrar los datos del curso si le falta espacio o si pasas un tiempo sin visitar el sitio.
          {#if asked}No concedió el permiso; la sincronización o una copia en archivo siguen protegiendo tu progreso.{/if}</p>
        {#if !asked}<button type="button" class="btn small" onclick={keep}>Pedirle que los conserve</button>{/if}
      {/if}
    </div>
  {/if}
</section>

<style>
  .copia { margin-top: 28px; max-width: 760px; scroll-margin-top: 80px; }
  h2 { font-size: 1.12rem; }
  h3 { font-size: 1rem; }
  p { color: var(--ink-2); margin-top: 6px; overflow-wrap: anywhere; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
  label.btn { cursor: pointer; }
  /* el input está oculto: el foco se muestra en su etiqueta */
  .row:has(#copia-file:focus-visible) label.btn { outline: 2px solid var(--helm); outline-offset: 2px; }
  .card { border: 1px solid var(--helm); border-radius: var(--r-l); background: var(--panel); padding: 16px 18px; margin-top: 14px; }
  .mono { font-family: var(--mono); font-size: 0.88rem; }
  .muted { color: var(--ink-3); font-size: 0.86rem; }
  .warn { color: var(--wait); font-size: 0.9rem; }
  .err { color: var(--fail); }
  .ok { color: var(--ready); }
  .keep { margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--line-2); display: grid; gap: 8px; justify-items: start; }
</style>
