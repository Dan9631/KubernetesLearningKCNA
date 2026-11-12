<script lang="ts">
  // Último paso de /diploma: con un intento de examen aprobado, escribir el nombre que llevará el diploma.
  import { pedir, comprobarFirma, urlVerificar, type Diploma } from '../lib/diploma';
  import { fmtDate } from './practica/quiz';

  let { intento, onemitido }: { intento: string; onemitido?: (d: Diploma) => void } = $props();

  let nombre = $state('');
  let acepta = $state(false);
  let busy = $state(false);
  let error = $state('');
  let diploma = $state<Diploma | null>(null);
  let firma = $state<'valida' | 'invalida' | 'sin-comprobar'>('sin-comprobar');
  let copied = $state(false);
  const listo = $derived(nombre.trim().length >= 3 && acepta);

  async function submit() {
    busy = true; error = '';
    try {
      diploma = await pedir(intento, nombre);
      firma = await comprobarFirma(diploma);
      onemitido?.(diploma);
    } catch (e) {
      error = e instanceof TypeError ? 'Sin conexión con el servicio de diplomas.' : (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function copy() {
    if (!diploma) return;
    try { await navigator.clipboard.writeText(urlVerificar(diploma.id)); copied = true; setTimeout(() => (copied = false), 1600); } catch { /* sin portapapeles */ }
  }
</script>

{#if diploma}
  <div class="card" role="status">
    <h2>Diploma emitido</h2>
    <dl>
      <dt>Emitido a</dt><dd>{diploma.nombre}</dd>
      <dt>Por</dt><dd>{diploma.curso}</dd>
      <dt>Fecha</dt><dd>{fmtDate(diploma.emitido)}</dd>
      {#if diploma.nota !== null}<dt>Nota del examen</dt><dd>{diploma.nota} %</dd>{/if}
      <dt>Identificador</dt><dd class="mono">{diploma.id}</dd>
    </dl>
    <p>Guarda este enlace: es la única forma de volver a encontrar tu diploma, y con él cualquiera puede comprobar que es auténtico.</p>
    <p><a href={urlVerificar(diploma.id)}>{urlVerificar(diploma.id)}</a></p>
    <div class="row">
      <button type="button" class="btn primary" onclick={copy}>{copied ? 'Copiado' : 'Copiar el enlace'}</button>
    </div>
    {#if firma === 'invalida'}<p class="err" role="alert">La firma que devolvió el servicio no es válida. Avisa a quien te dio el código.</p>{/if}
  </div>
{:else}
  <form class="form" onsubmit={(e) => { e.preventDefault(); if (listo && !busy) submit(); }}>
    <label for="nombre">Tu nombre, como quieres que aparezca en el diploma</label>
    <input id="nombre" autocomplete="name" maxlength="80" bind:value={nombre} />
    <p class="muted">No se puede cambiar después de emitir el diploma.</p>

    <label class="check">
      <input type="checkbox" bind:checked={acepta} />
      <span>Acepto que mi nombre se guarde en el servicio del curso y que lo vea cualquiera que tenga el enlace de mi diploma.</span>
    </label>

    <div class="row">
      <button type="submit" class="btn primary" disabled={!listo || busy}>{busy ? 'Emitiendo…' : 'Pedir el diploma'}</button>
    </div>
    {#if error}<p class="err" role="alert">{error}</p>{/if}
  </form>
{/if}

<style>
  .form { margin-top: 12px; max-width: 560px; }
  label { display: block; font-weight: 600; font-size: 0.92rem; margin-top: 16px; }
  input:not([type='checkbox']) { width: 100%; margin-top: 8px; font-size: 0.95rem; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); color: var(--ink); }
  .check { display: flex; gap: 10px; align-items: flex-start; font-weight: 400; color: var(--ink-2); }
  .check input { margin-top: 4px; flex: none; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
  .card { border: 1px solid var(--ready); border-radius: var(--r-l); background: var(--panel); padding: 16px 18px; margin-top: 18px; max-width: 620px; }
  h2 { font-size: 1.12rem; color: var(--ready); }
  p { color: var(--ink-2); margin-top: 10px; overflow-wrap: anywhere; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 12px 0 0; }
  dt { color: var(--ink-3); font-size: 0.9rem; }
  dd { margin: 0; overflow-wrap: anywhere; }
  .muted { color: var(--ink-3); font-size: 0.86rem; margin-top: 6px; }
  .err { color: var(--fail); }
</style>
