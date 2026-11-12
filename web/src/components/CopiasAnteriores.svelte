<script lang="ts">
  // Sección «Copias anteriores» de /sincronizar: con la sincronización activa, el servidor conserva el estado
  // con el que terminó cada uno de los últimos días con cambios (hasta 7). Restaurar reemplaza el progreso.
  import { untrack } from 'svelte';
  import { sync, syncAvailable, listCopias, getCopia, type Copia } from '../lib/sync.svelte';
  import { importar } from '../lib/respaldo.svelte';
  import { summary, sanitize } from '../lib/respaldo';
  import type { Progress } from '../lib/progress.svelte';
  import { fmtDate } from './practica/quiz';

  let list = $state<Copia[] | null>(null);
  let state = $state<'idle' | 'loading' | 'ready' | 'none' | 'error'>('idle'); // none: el servicio no ofrece copias
  let error = $state('');
  let open = $state<{ rev: number; updated: number; progress: Progress } | null>(null);
  let busy = $state(0); // versión que se está descargando
  let ask = $state(false);
  let done = $state('');

  // al cambiar de código o desconectar, lo cargado deja de valer
  let code = sync.code;
  $effect(() => { if (sync.code !== code) { code = sync.code; list = null; state = 'idle'; open = null; ask = false; done = ''; } });
  // La lista se pide sola cuando ya hubo una sincronización (antes el registro no existe en el servidor).
  // La sección solo se muestra si el servicio responde: con un Worker sin copias no se promete nada.
  // y se refresca tras cada sincronización, salvo mientras se mira una copia
  $effect(() => { if (syncAvailable && sync.code && sync.last) untrack(() => { if (state !== 'loading' && !open) load(); }); });

  async function load() {
    const first = state !== 'ready'; // al refrescar, la lista visible se queda hasta que llega la nueva
    if (first) state = 'loading';
    error = '';
    try {
      list = await listCopias();
      state = list ? 'ready' : 'none';
    } catch (e) {
      if (!first) return; // un refresco fallido no quita la lista que ya se ve
      state = 'error';
      error = e instanceof TypeError ? 'Sin conexión con el servicio de sincronización.' : (e as Error).message;
    }
  }

  async function view(c: Copia) {
    busy = c.rev; error = ''; done = ''; ask = false;
    try {
      open = { ...c, progress: sanitize(await getCopia(c.rev)) };
    } catch (e) {
      open = null;
      error = e instanceof TypeError ? 'Sin conexión con el servicio de sincronización.' : e instanceof DOMException ? 'No se pudo descifrar esa copia con el código de este dispositivo.' : (e as Error).message;
    } finally {
      busy = 0;
    }
  }

  function restore() {
    if (!open) return;
    importar(open.progress, 'reemplazar');
    done = `Tu progreso volvió al estado del ${fmtDate(open.updated)}. Se está sincronizando con tus otros dispositivos.`;
    open = null; ask = false;
  }

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts = $derived.by(() => {
    if (!open) return [];
    const s = summary(open.progress);
    return [
      s.questions ? plural(s.questions, 'pregunta respondida', 'preguntas respondidas') : '',
      s.commands ? plural(s.commands, 'comando practicado', 'comandos practicados') : '',
      s.modules ? plural(s.modules, 'módulo terminado', 'módulos terminados') : '',
      s.exams ? plural(s.exams, 'simulacro', 'simulacros') : '',
      s.days ? plural(s.days, 'día de estudio', 'días de estudio') : '',
    ].filter(Boolean);
  });
</script>

{#if syncAvailable && sync.code && (state === 'ready' || state === 'error')}
  <section class="copias" aria-labelledby="h-copias">
    <h2 id="h-copias">Copias anteriores</h2>
    <p>Mientras la sincronización está activa, el servidor conserva cómo estaba tu progreso al terminar cada uno de los últimos días en que cambió (hasta 7). Sirven para volver atrás si algo se borró o se mezcló mal.</p>

    {#if state === 'error'}
      <div class="row">
        <button type="button" class="btn" onclick={load}>Reintentar</button>
      </div>
    {:else if list && !list.length}
      <p class="muted" role="status">Todavía no hay copias anteriores. La primera aparece al día siguiente de sincronizar por primera vez.</p>
    {:else if list}
      <ul class="list">
        {#each list as c (c.rev)}
          <li class:sel={open?.rev === c.rev}>
            <span>{fmtDate(c.updated)}</span>
            <button type="button" class="btn small" disabled={busy !== 0} aria-label="Ver la copia del {fmtDate(c.updated)}" onclick={() => view(c)}>{busy === c.rev ? 'Abriendo…' : 'Ver'}</button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if error}<p class="err" role="alert">{error}</p>{/if}
    {#if done}<p class="ok" role="status">{done}</p>{/if}

    {#if open}
      <div class="card" role="group" aria-labelledby="h-copia-sel">
        <h3 id="h-copia-sel">Copia del {fmtDate(open.updated)}</h3>
        <p>Contiene {parts.length ? parts.join(', ') : 'progreso de lectura y laboratorios'}.</p>
        {#if !ask}
          <div class="row">
            <button type="button" class="btn primary" onclick={() => (ask = true)}>Restaurar esta copia</button>
            <button type="button" class="btn" onclick={() => (open = null)}>Cerrar</button>
          </div>
        {:else}
          <p class="warn">Tu progreso actual se reemplaza por el de esta copia, aquí y en tus otros dispositivos. Lo que hiciste después de esa fecha se pierde; si dudas, descarga antes una copia en un archivo (más abajo).</p>
          <div class="row">
            <button type="button" class="btn" onclick={restore}>Sí, restaurar</button>
            <button type="button" class="btn" onclick={() => (ask = false)}>Volver</button>
          </div>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .copias { margin-top: 28px; max-width: 760px; }
  h2 { font-size: 1.12rem; }
  h3 { font-size: 1rem; }
  p { color: var(--ink-2); margin-top: 6px; overflow-wrap: anywhere; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
  .list { list-style: none; margin: 12px 0 0; padding: 0; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); max-width: 420px; }
  .list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-top: 1px solid var(--line-2); }
  .list li:first-child { border-top: 0; }
  .list li.sel { background: var(--helm-2); }
  .card { border: 1px solid var(--helm); border-radius: var(--r-l); background: var(--panel); padding: 16px 18px; margin-top: 14px; }
  .muted { color: var(--ink-3); font-size: 0.86rem; }
  .warn { color: var(--wait); font-size: 0.9rem; }
  .err { color: var(--fail); }
  .ok { color: var(--ready); }
</style>
