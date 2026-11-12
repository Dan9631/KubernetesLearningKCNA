<script lang="ts">
  // Página /verificar: consulta un diploma por su identificador (?id=…) y comprueba su firma en el navegador.
  import { onMount } from 'svelte';
  import { diplomasDisponibles, consultar, comprobarFirma, UUID, type Diploma } from '../lib/diploma';
  import { fmtDate } from './practica/quiz';

  let input = $state('');
  let state = $state<'idle' | 'loading' | 'found' | 'missing' | 'error'>('idle');
  let error = $state('');
  let diploma = $state<Diploma | null>(null);
  let firma = $state<'valida' | 'invalida' | 'sin-comprobar'>('sin-comprobar');
  const typed = $derived(input.trim().toLowerCase());

  onMount(() => {
    const id = new URLSearchParams(location.search).get('id') ?? '';
    if (id) { input = id; check(); }
  });

  async function check() {
    if (!UUID.test(typed)) { state = 'missing'; diploma = null; return; }
    state = 'loading'; error = '';
    try {
      diploma = await consultar(typed);
      if (diploma) firma = await comprobarFirma(diploma);
      state = diploma ? 'found' : 'missing';
    } catch (e) {
      state = 'error';
      error = e instanceof TypeError ? 'Sin conexión con el servicio de diplomas.' : (e as Error).message;
    }
  }
</script>

{#if !diplomasDisponibles}
  <p class="muted">Esta copia del sitio se generó sin el servicio que emite los diplomas, así que aquí no se pueden verificar.</p>
{:else}
  <form class="form" onsubmit={(e) => { e.preventDefault(); check(); }}>
    <label for="id-diploma">Identificador del diploma</label>
    <div class="row">
      <input id="id-diploma" class="mono" autocomplete="off" spellcheck="false" placeholder="xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx" bind:value={input} />
      <button type="submit" class="btn primary" disabled={!typed || state === 'loading'}>{state === 'loading' ? 'Comprobando…' : 'Verificar'}</button>
    </div>
  </form>

  <div aria-live="polite">
    {#if state === 'missing'}
      <div class="card bad">
        <h2>No existe</h2>
        <p>No hay ningún diploma con ese identificador. Revisa que esté completo, tal como aparece en el diploma.</p>
      </div>
    {:else if state === 'error'}
      <p class="err" role="alert">{error}</p>
    {:else if state === 'found' && diploma}
      {@const mala = firma === 'invalida'}
      <div class="card" class:bad={mala || diploma.revocado} class:good={!mala && !diploma.revocado}>
        <h2>{mala ? 'Firma no válida' : diploma.revocado ? 'Diploma revocado' : 'Diploma válido'}</h2>
        {#if mala}
          <p>Los datos que devolvió el servicio no corresponden con la firma. No des este diploma por bueno.</p>
        {:else}
          <dl>
            <dt>Emitido a</dt><dd>{diploma.nombre}</dd>
            <dt>Por</dt><dd>{diploma.curso}</dd>
            <dt>Fecha</dt><dd>{fmtDate(diploma.emitido)}</dd>
            {#if diploma.nota !== null}<dt>Nota del examen</dt><dd>{diploma.nota} %</dd>{/if}
            {#if diploma.revocado}<dt>Revocado</dt><dd>{fmtDate(diploma.revocado)}</dd>{/if}
          </dl>
          {#if diploma.revocado}<p>Este diploma se emitió, pero quien lo firmó lo retiró después. Ya no es válido.</p>{/if}
          <p class="muted">
            {#if firma === 'valida'}Firma comprobada en tu navegador con la llave pública del curso.
            {:else}La firma no se pudo comprobar en este navegador; el resultado es el que informa el servicio.{/if}
          </p>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .form { margin-top: 20px; max-width: 620px; }
  label { font-weight: 600; font-size: 0.92rem; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
  input { flex: 1 1 320px; min-width: 0; font-size: 0.95rem; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); color: var(--ink); }
  .card { border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); padding: 16px 18px; margin-top: 18px; max-width: 620px; }
  .card.good { border-color: var(--ready); }
  .card.bad { border-color: var(--fail); }
  h2 { font-size: 1.12rem; }
  .good h2 { color: var(--ready); }
  .bad h2 { color: var(--fail); }
  p { color: var(--ink-2); margin-top: 8px; overflow-wrap: anywhere; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 12px 0 0; }
  dt { color: var(--ink-3); font-size: 0.9rem; }
  dd { margin: 0; overflow-wrap: anywhere; }
  .muted { color: var(--ink-3); font-size: 0.86rem; }
  .err { color: var(--fail); margin-top: 14px; }
</style>
