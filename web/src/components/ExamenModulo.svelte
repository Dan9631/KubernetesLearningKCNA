<script lang="ts">
  // Examen de un módulo: se responde entero y solo al entregar se ve la nota y la explicación de los fallos.
  // Aprobarlo deja el módulo «aprobado» en la Ruta. Ver lib/examenModulo.ts.
  import { onMount } from 'svelte';
  import preguntas from '../data/preguntas.json';
  import { progress, recordAnswer, addReto, toggleDone } from '../lib/progress.svelte';
  import { pad } from '../lib/modules';
  import { PREGUNTAS, APROBAR, claveExamen, aprobado, minimo } from '../lib/examenModulo';
  import SourceLinks from './SourceLinks.svelte';

  interface Q { id: string; module: number; q: string; options: string[]; answer: number[]; explanation: string; source?: string[]; holdout?: boolean }
  let { module }: { module: number } = $props();

  // sin el banco reservado, igual que la práctica del módulo
  const pool = (preguntas as Q[]).filter((q) => q.module === module && !q.holdout);
  const total = Math.min(PREGUNTAS, pool.length);
  const necesita = minimo(total);

  let paso = $state<'inicio' | 'examen' | 'resultado'>('inicio');
  let items = $state<Q[]>([]);
  let marcadas = $state<number[][]>([]);
  let confirmar = $state(false);
  let vistas: string[] = []; // las del intento anterior salen al final del sorteo, para no repetir el mismo examen
  let cabecera = $state<HTMLElement>();

  // el HTML del servidor sale sin progreso: el aprobado se lee una vez montado, para que la página lo actualice
  let montado = $state(false);
  onMount(() => { montado = true; });
  const yaAprobado = $derived(montado && aprobado(progress, module));
  const sinResponder = $derived(marcadas.filter((m) => !m.length).length);
  const acierta = (q: Q, m: number[]) => m.length === q.answer.length && m.every((x) => q.answer.includes(x));
  const aciertos = $derived(items.filter((q, i) => acierta(q, marcadas[i] ?? [])).length);
  const nota = $derived(items.length ? Math.round((aciertos / items.length) * 100) : 0);
  const paso_ok = $derived(aciertos >= necesita);
  const letras = 'ABCDEFGHIJKL';

  function barajar<T>(a: T[]) { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
  const arriba = () => cabecera?.scrollIntoView({ block: 'start' });

  function empezar() {
    const antes = new Set(vistas);
    items = barajar(pool).sort((a, b) => Number(antes.has(a.id)) - Number(antes.has(b.id))).slice(0, total);
    marcadas = items.map(() => []);
    confirmar = false; paso = 'examen';
    arriba();
  }
  function marcar(i: number, o: number) {
    const q = items[i], m = marcadas[i];
    marcadas[i] = q.answer.length === 1 ? [o] : m.includes(o) ? m.filter((x) => x !== o) : [...m, o].slice(-q.answer.length);
  }
  function entregar() {
    // cada respuesta cuenta también para el repaso espaciado; las que quedaron en blanco, como fallo
    items.forEach((q, i) => recordAnswer(q.id, acierta(q, marcadas[i])));
    vistas = items.map((q) => q.id);
    if (aciertos >= necesita) {
      addReto(claveExamen(module));
      // aprobar es lo que completa el módulo: ya no se marca a mano
      if (!progress.done.includes(pad(module))) toggleDone(pad(module));
    }
    confirmar = false; paso = 'resultado';
    arriba();
  }
</script>

<div bind:this={cabecera} class="ancla"></div>
{#if total < 3}
  <p class="hint">Este módulo todavía no tiene suficientes preguntas en el banco para un examen.</p>
{:else if paso === 'inicio'}
  <div class="card" class:good={yaAprobado}>
    {#if yaAprobado}<p class="estado">Examen aprobado ✓</p>{/if}
    <ul class="reglas">
      <li>{total} preguntas de este módulo, en inglés como en el examen KCNA.</li>
      <li>No hay explicaciones mientras respondes: la nota y los fallos se ven al entregar.</li>
      <li>Se aprueba con el {APROBAR} % ({necesita} de {total}). Puedes repetirlo las veces que quieras.</li>
    </ul>
    <div class="row">
      <button type="button" class="btn" class:primary={!yaAprobado} onclick={empezar}>{yaAprobado ? 'Repetir el examen' : 'Empezar el examen'}</button>
    </div>
  </div>
{:else if paso === 'examen'}
  <p class="barra" role="status">{items.length - sinResponder} de {items.length} respondidas</p>
  <ol class="preguntas">
    {#each items as q, i (q.id)}
      {@const multiple = q.answer.length > 1}
      <li>
        <fieldset>
          <legend>{q.q}{#if multiple} <span class="muted">(marca {q.answer.length})</span>{/if}</legend>
          {#each q.options as o, j}
            <label class="opt" class:sel={marcadas[i].includes(j)}>
              <input type={multiple ? 'checkbox' : 'radio'} name="em{module}-{i}" checked={marcadas[i].includes(j)} onchange={() => marcar(i, j)} />
              <span>{o}</span>
            </label>
          {/each}
        </fieldset>
      </li>
    {/each}
  </ol>
  {#if !confirmar}
    <div class="row">
      <button type="button" class="btn primary" onclick={() => (sinResponder ? (confirmar = true) : entregar())}>Entregar el examen</button>
    </div>
  {:else}
    <p class="warn" role="alert">Te {sinResponder === 1 ? 'queda 1 pregunta' : `quedan ${sinResponder} preguntas`} sin responder; contarán como falladas.</p>
    <div class="row">
      <button type="button" class="btn" onclick={entregar}>Entregar de todos modos</button>
      <button type="button" class="btn" onclick={() => (confirmar = false)}>Seguir respondiendo</button>
    </div>
  {/if}
{:else}
  <div class="card" class:good={paso_ok} class:bad={!paso_ok} role="status">
    <h3>{paso_ok ? 'Módulo aprobado' : 'No alcanzó esta vez'}</h3>
    <p>Tu nota: <strong>{nota} %</strong> ({aciertos} de {items.length}). Se aprueba con el {APROBAR} % ({necesita} de {items.length}).</p>
    {#if paso_ok}
      <p>Con esto el módulo queda completado en tu Ruta.</p>
    {:else if yaAprobado}
      <p>El módulo sigue aprobado por un intento anterior.</p>
    {:else}
      <p>Repasa los fallos de abajo y vuelve a intentarlo: saldrán otras preguntas cuando el banco alcance.</p>
    {/if}
    <div class="row">
      <button type="button" class="btn" class:primary={!paso_ok && !yaAprobado} onclick={empezar}>{paso_ok ? 'Repetir el examen' : 'Intentar de nuevo'}</button>
    </div>
  </div>

  {#if aciertos < items.length}
    <h3 class="sub">Lo que fallaste</h3>
    <ol class="fallos">
      {#each items as q, i (q.id)}
        {#if !acierta(q, marcadas[i])}
          <li>
            <p class="q">{q.q}</p>
            <ul class="ops">
              {#each q.options as o, j}
                {@const buena = q.answer.includes(j)}
                {@const tuya = marcadas[i].includes(j)}
                {#if buena || tuya}
                  <li class:good={buena} class:bad={tuya && !buena}>
                    <span class="l">{letras[j]}</span>
                    <span>{o} <em>{buena ? (tuya ? '(correcta, la marcaste)' : '(correcta)') : '(tu respuesta)'}</em></span>
                  </li>
                {/if}
              {/each}
              {#if !marcadas[i].length}<li class="muted">La dejaste sin responder.</li>{/if}
            </ul>
            <p class="explica">{q.explanation}<SourceLinks source={q.source} /></p>
          </li>
        {/if}
      {/each}
    </ol>
  {/if}
{/if}

<style>
  .ancla { scroll-margin-top: 130px; }
  .hint { color: var(--ink-2); font-size: 0.95rem; }
  .card { border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); padding: 16px 18px; max-width: 760px; }
  .card.good { border-color: var(--ready); }
  .card.bad { border-color: var(--fail); }
  .estado { color: var(--ready); font-weight: 600; margin-bottom: 8px; }
  h3 { font-size: 1.12rem; }
  .good h3 { color: var(--ready); }
  .bad h3 { color: var(--fail); }
  .card p { color: var(--ink-2); margin-top: 8px; }
  .reglas { margin: 0; padding-left: 20px; color: var(--ink-2); }
  .reglas li { margin-top: 4px; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
  .barra { position: sticky; top: 64px; z-index: 2; max-width: 760px; padding: 8px 12px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); color: var(--ink-2); font-size: 0.92rem; }
  .preguntas { margin: 8px 0 0; padding-left: 26px; max-width: 760px; }
  .preguntas > li { margin-top: 22px; }
  fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
  legend { padding: 0; font-weight: 600; overflow-wrap: anywhere; }
  .opt { display: flex; gap: 10px; align-items: flex-start; font-size: 0.98rem; margin-top: 8px; padding: 9px 12px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); cursor: pointer; }
  .opt:hover { border-color: var(--helm); }
  .opt.sel { border-color: var(--helm); background: var(--helm-2); }
  .opt input { margin-top: 4px; flex: none; }
  .opt span { min-width: 0; overflow-wrap: anywhere; }
  .muted { color: var(--ink-3); font-size: 0.86rem; font-weight: 400; }
  .warn { color: var(--wait); margin-top: 14px; }
  .sub { margin-top: 26px; }
  .fallos { margin: 6px 0 0; padding-left: 26px; max-width: 760px; }
  .fallos > li { margin-top: 18px; }
  .q { font-weight: 600; overflow-wrap: anywhere; }
  .ops { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
  .ops li { display: flex; gap: 10px; align-items: flex-start; padding: 7px 10px; border: 1px solid var(--line); border-radius: var(--r-m); font-size: 0.95rem; overflow-wrap: anywhere; }
  .ops li > span:last-child { min-width: 0; }
  .ops li.good { border-color: var(--ready); background: var(--ready-2); }
  .ops li.bad { border-color: var(--fail); background: var(--fail-2); }
  .ops li.muted { border-style: dashed; }
  .ops em { font-style: normal; color: var(--ink-2); font-size: 0.86rem; }
  .l { flex: none; width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--line); display: grid; place-items: center; font: 500 0.75rem var(--mono); color: var(--ink-2); background: var(--panel); }
  .explica { margin-top: 8px; padding: 10px 12px; border-radius: var(--r-m); background: var(--panel-2); border-left: 3px solid var(--helm); font-size: 0.95rem; color: var(--ink); overflow-wrap: anywhere; }
</style>
