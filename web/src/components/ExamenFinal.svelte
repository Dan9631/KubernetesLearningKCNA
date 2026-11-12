<script lang="ts">
  // Página /diploma: examen final con un código de invitación y, si se aprueba, el formulario del diploma.
  // El servidor sortea las preguntas, lleva el plazo y califica; aquí solo se muestran y se marcan opciones.
  import { onMount, onDestroy } from 'svelte';
  import { diplomasDisponibles, empezarExamen, verIntento, entregarExamen, urlVerificar, type Examen, type Resultado } from '../lib/diploma';
  import PedirDiploma from './PedirDiploma.svelte';

  // El intento en curso se recuerda en este navegador para poder seguir tras recargar la página
  const KEY = 'kcna-examen';
  type Guardado = { intento: string; marcadas: number[][] };

  let paso = $state<'cargando' | 'codigo' | 'examen' | 'resultado'>('cargando');
  let codigo = $state('');
  let intento = $state('');
  let examen = $state<Examen | null>(null);
  let marcadas = $state<number[][]>([]);
  let resultado = $state<Resultado | null>(null);
  let busy = $state(false);
  let error = $state('');
  let confirmar = $state(false);
  let ahora = $state(Date.now());
  let reloj: ReturnType<typeof setInterval> | undefined;

  const sinResponder = $derived(marcadas.filter((m) => !m.length).length);
  const restante = $derived(examen ? Math.max(0, examen.expira - ahora) : 0);
  const mmss = $derived(`${Math.floor(restante / 60000)}:${String(Math.floor(restante / 1000) % 60).padStart(2, '0')}`);

  const leer = (): Guardado | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } };
  const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify({ intento, marcadas })); } catch { /* sin almacenamiento */ } };
  const olvidar = () => { try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ } };
  const mensaje = (e: unknown) => (e instanceof TypeError ? 'Sin conexión con el servicio del examen.' : (e as Error).message);

  function mostrar(e: Examen, previas?: number[][]) {
    examen = e;
    marcadas = e.preguntas.map((_, i) => previas?.[i] ?? []);
    paso = 'examen';
    ahora = Date.now();
    clearInterval(reloj);
    reloj = setInterval(() => {
      ahora = Date.now();
      if (examen && ahora >= examen.expira && !busy) entregar(); // se acabó el tiempo: se entrega lo que haya
    }, 1000);
  }
  function terminar(r: Resultado) {
    clearInterval(reloj);
    resultado = r; examen = null; paso = 'resultado'; confirmar = false;
    if (!r.aprobado || r.diploma) olvidar(); // un aprobado sin diploma se conserva para poder pedirlo después
  }

  onMount(async () => {
    const g = leer();
    if (!diplomasDisponibles || !g?.intento) { paso = 'codigo'; return; }
    intento = g.intento;
    try {
      const v = await verIntento(intento);
      if ('preguntas' in v) mostrar(v, g.marcadas); else terminar(v);
    } catch (e) {
      // intento vencido o que ya no existe: se empieza de nuevo. Sin conexión, se conserva para reintentar
      if (!(e instanceof TypeError)) olvidar();
      error = e instanceof TypeError ? mensaje(e) : '';
      paso = 'codigo';
    }
  });
  onDestroy(() => clearInterval(reloj));

  async function empezar() {
    busy = true; error = '';
    try {
      const e = await empezarExamen(codigo);
      intento = e.intento;
      mostrar(e);
      guardar();
    } catch (e) {
      error = mensaje(e);
    } finally {
      busy = false;
    }
  }

  function marcar(i: number, o: number, multiple: boolean) {
    const m = marcadas[i];
    marcadas[i] = !multiple ? [o] : m.includes(o) ? m.filter((x) => x !== o) : [...m, o];
    guardar();
  }

  async function entregar() {
    busy = true; error = '';
    try {
      terminar(await entregarExamen(intento, $state.snapshot(marcadas)));
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'ya_entregado') {
        try { const v = await verIntento(intento); if (!('preguntas' in v)) terminar(v); } catch { error = mensaje(e); }
      } else if (code === 'expirado') {
        clearInterval(reloj); olvidar(); examen = null; paso = 'codigo'; error = 'Se acabó el tiempo antes de entregar. El intento se perdió.';
      } else {
        error = mensaje(e);
      }
    } finally {
      busy = false;
    }
  }

  function otraVez() { olvidar(); resultado = null; intento = ''; error = ''; paso = 'codigo'; }
</script>

{#if !diplomasDisponibles}
  <p class="muted">Esta copia del sitio se generó sin el servicio que emite los diplomas.</p>
{:else if paso === 'cargando'}
  <p class="muted" role="status">Cargando…</p>
{:else if paso === 'codigo'}
  <form class="form" onsubmit={(e) => { e.preventDefault(); if (codigo.trim().length >= 12 && !busy) empezar(); }}>
    <ul class="reglas">
      <li>30 preguntas al azar, en inglés como el examen KCNA.</li>
      <li>60 minutos desde que empiezas. Si se acaba el tiempo, se entrega lo que lleves.</li>
      <li>Se aprueba con el 75 % (23 aciertos).</li>
      <li>Cada código permite 3 intentos. Empezar gasta uno, aunque no lo entregues.</li>
    </ul>
    <label for="codigo">Código de invitación</label>
    <input id="codigo" class="mono" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" bind:value={codigo} />
    <div class="row">
      <button type="submit" class="btn primary" disabled={codigo.trim().length < 12 || busy}>{busy ? 'Preparando…' : 'Empezar el examen'}</button>
    </div>
    {#if error}<p class="err" role="alert">{error}</p>{/if}
  </form>
{:else if paso === 'examen' && examen}
  <div class="barra" class:poco={restante < 5 * 60000}>
    <span>Tiempo: <strong class="mono">{mmss}</strong></span>
    <span>{examen.preguntas.length - sinResponder} de {examen.preguntas.length} respondidas</span>
  </div>
  <ol class="preguntas">
    {#each examen.preguntas as p, i}
      {@const multiple = p.elige > 1}
      <li>
        <fieldset>
          <legend>{p.texto}{#if multiple} <span class="muted">(marca {p.elige})</span>{/if}</legend>
          {#each p.opciones as o, j}
            <label class="opt" class:sel={marcadas[i].includes(j)}>
              <input type={multiple ? 'checkbox' : 'radio'} name="p{i}" checked={marcadas[i].includes(j)} onchange={() => marcar(i, j, multiple)} />
              <span>{o}</span>
            </label>
          {/each}
        </fieldset>
      </li>
    {/each}
  </ol>
  {#if !confirmar}
    <div class="row">
      <button type="button" class="btn primary" disabled={busy} onclick={() => (sinResponder ? (confirmar = true) : entregar())}>{busy ? 'Entregando…' : 'Entregar el examen'}</button>
    </div>
  {:else}
    <p class="warn">Te {sinResponder === 1 ? 'queda 1 pregunta' : `quedan ${sinResponder} preguntas`} sin responder; contarán como falladas.</p>
    <div class="row">
      <button type="button" class="btn" disabled={busy} onclick={entregar}>{busy ? 'Entregando…' : 'Entregar de todos modos'}</button>
      <button type="button" class="btn" onclick={() => (confirmar = false)}>Seguir respondiendo</button>
    </div>
  {/if}
  {#if error}<p class="err" role="alert">{error}</p>{/if}
{:else if paso === 'resultado' && resultado}
  <div class="card" class:good={resultado.aprobado} class:bad={!resultado.aprobado} role="status">
    <h2>{resultado.aprobado ? 'Aprobaste' : 'No alcanzó esta vez'}</h2>
    <p>Tu nota: <strong>{resultado.nota} %</strong>{#if resultado.total} ({resultado.aciertos} de {resultado.total}){/if}. Se aprueba con el {resultado.aprobar} %.</p>
    {#if !resultado.aprobado}
      <p>Repasa los temas en los que dudaste y vuelve a intentarlo con el mismo código, si le quedan intentos.</p>
      <div class="row"><button type="button" class="btn primary" onclick={otraVez}>Intentar de nuevo</button></div>
    {:else if resultado.diploma}
      <p>Ya pediste el diploma de este intento: <a href={urlVerificar(resultado.diploma)}>{urlVerificar(resultado.diploma)}</a></p>
    {/if}
  </div>
  {#if resultado.aprobado && !resultado.diploma}
    <PedirDiploma {intento} onemitido={olvidar} />
  {/if}
{/if}

<style>
  .form { margin-top: 20px; max-width: 560px; }
  .reglas { margin: 0 0 8px; padding-left: 20px; color: var(--ink-2); }
  .reglas li { margin-top: 4px; }
  label { display: block; font-weight: 600; font-size: 0.92rem; margin-top: 16px; }
  #codigo { width: 100%; margin-top: 8px; font-size: 0.95rem; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); color: var(--ink); }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
  .barra { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 20px; padding: 8px 12px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); color: var(--ink-2); font-size: 0.92rem; }
  .barra.poco strong { color: var(--fail); }
  .preguntas { margin: 8px 0 0; padding-left: 26px; }
  .preguntas > li { margin-top: 22px; }
  fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
  legend { padding: 0; font-weight: 600; overflow-wrap: anywhere; }
  .opt { display: flex; gap: 10px; align-items: flex-start; font-weight: 400; font-size: 0.98rem; margin-top: 8px; padding: 9px 12px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); cursor: pointer; }
  .opt:hover { border-color: var(--helm); }
  .opt.sel { border-color: var(--helm); background: var(--helm-2); }
  .opt input { margin-top: 4px; flex: none; }
  .opt span { min-width: 0; overflow-wrap: anywhere; }
  .card { border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); padding: 16px 18px; margin-top: 18px; max-width: 620px; }
  .card.good { border-color: var(--ready); }
  .card.bad { border-color: var(--fail); }
  h2 { font-size: 1.12rem; }
  .good h2 { color: var(--ready); }
  .bad h2 { color: var(--fail); }
  p { color: var(--ink-2); margin-top: 10px; overflow-wrap: anywhere; }
  .muted { color: var(--ink-3); font-size: 0.86rem; font-weight: 400; }
  .warn { color: var(--wait); }
  .err { color: var(--fail); }
</style>
