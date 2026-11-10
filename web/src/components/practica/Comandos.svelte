<script lang="ts">
  // Comandos de memoria: el alumno lee la tarea, escribe el comando sin mirarlo y el analizador lo corrige
  // parte por parte (verbo, recurso, nombre, flags). No se ejecuta nada. Ayuda graduada: idea, forma, solución.
  // Comparte la repetición espaciada de las preguntas (progress.quiz con clave "cmd:<id>").
  import { tick } from 'svelte';
  import { DRILLS, FUENTES, drillsOf, drillKey, type Drill, type Cierre } from '../../lib/kube/drills.ts';
  import SourceLinks from '../SourceLinks.svelte';
  import { analizar, comparar, esqueleto, type Veredicto, type Nota } from '../../lib/kube/analizador.ts';
  import { progress, recordAnswer } from '../../lib/progress.svelte';
  import { priority, isDue, endOfToday } from '../../lib/preparacion';
  import { MODULES, pad, moduleUrl, url } from '../../lib/modules';

  // module: ejercicios de un solo módulo (página del módulo); sin él, se puede elegir el alcance.
  // ids: ejercicios concretos, en ese orden. mode: 'full' (con inicio y cierre), 'uno' (arranca solo y avisa al
  // terminar: lo intercala el Repaso del día) o 'paso' (botón compacto al final de un paso del laboratorio).
  let { module, size = 8, ids, mode = 'full', ondone, onfase }: {
    module?: number; size?: number; ids?: string[]; mode?: 'full' | 'uno' | 'paso';
    ondone?: (r: Cierre) => void; onfase?: (f: 'inicio' | 'pregunta' | 'bien' | 'solucion' | 'fin') => void;
  } = $props();

  // errores de forma que el analizador detecta sin clúster y que no revelan la respuesta
  const FORMA = new Set(['binario', 'verbo', 'flag-desconocido', 'flag-sin-valor', 'guion-simple', 'exec-separador', 'set-par', 'create-pod', 'tipo-mal-escrito', 'taint-efecto', 'rollout-sub', 'secret-subtipo', 'config-sub']);

  const preset = typeof location === 'undefined' ? 0 : Number(new URLSearchParams(location.search).get('modulo') ?? 0);
  let scope = $state(module ?? (drillsOf(preset).length ? preset : 0));
  const pool = $derived(ids ? ids.map((id) => DRILLS.find((x) => x.id === id)).filter((x): x is Drill => !!x) : scope ? drillsOf(scope) : DRILLS);
  const stats = $derived.by(() => {
    const eod = endOfToday();
    let seen = 0, due = 0, firme = 0;
    for (const d of pool) { const s = progress.quiz[drillKey(d)]; if (!s) continue; seen++; if (isDue(s, eod)) due++; if ((s.box ?? 0) >= 3) firme++; }
    return { seen, due, firme, total: pool.length };
  });

  type Fase = 'inicio' | 'pregunta' | 'bien' | 'solucion' | 'fin';
  let fase = $state<Fase>('inicio');
  let queue = $state<Drill[]>([]);
  let i = $state(0);
  let input = $state('');
  let tries = $state(0);
  let level = $state(0);
  let verdict = $state<Veredicto | null>(null);
  let notas = $state<Nota[]>([]);
  let limpio = $state(true);
  let tally = $state({ primera: 0, ayuda: 0, vistas: 0 });
  let inputEl: HTMLInputElement | undefined = $state();
  let nextEl: HTMLButtonElement | undefined = $state();
  const d = $derived(queue[i]);
  const skel = $derived(d ? esqueleto(d.acepta[0]) : '');
  const hasSkel = $derived(!!d && skel !== d.acepta[0]);
  const otras = $derived(d ? d.acepta.filter((c) => c !== input.trim()).slice(0, 2) : []);

  function shuffle<T>(a: T[]) { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
  function start() {
    // primero lo que vence hoy, después lo nunca visto y, al final, lo menos dominado
    const eod = endOfToday();
    queue = ids ? pool : shuffle(pool).sort((a, b) => priority(progress.quiz[drillKey(b)], eod) - priority(progress.quiz[drillKey(a)], eod)).slice(0, size);
    i = 0; tally = { primera: 0, ayuda: 0, vistas: 0 };
    ask();
  }
  async function ask() {
    input = ''; tries = 0; level = 0; verdict = null; notas = []; limpio = true; fase = 'pregunta';
    await tick(); inputEl?.focus();
  }

  async function submit() {
    if (!d || !input.trim()) return;
    const v = comparar(input, d.acepta);
    verdict = v;
    if (v.ok) {
      if (fase === 'pregunta') {
        limpio = tries === 0 && level === 0;
        recordAnswer(drillKey(d), true, undefined, !limpio);
        if (limpio) tally.primera++; else tally.ayuda++;
      }
      notas = []; fase = 'bien';
      await tick(); nextEl?.focus();
      return;
    }
    tries++;
    notas = analizar(input).filter((n) => n.nivel === 'error' && FORMA.has(n.clave)).slice(0, 1);
  }
  function hint() {
    level = level === 1 && !hasSkel ? 3 : level + 1;
    if (level >= 3 && fase === 'pregunta') {
      // ver la solución cuenta como fallo: vuelve mañana
      recordAnswer(drillKey(d), false);
      tally.vistas++; verdict = null; notas = []; input = ''; limpio = false; fase = 'solucion';
    }
    inputEl?.focus();
  }
  function next() {
    if (i + 1 < queue.length) { i++; ask(); return; }
    if (mode !== 'uno') fase = 'fin';
    ondone?.({ ...tally, total: queue.length });
  }
  $effect(() => { onfase?.(fase); });
  if (mode === 'uno') start();
  function onkeydown(e: KeyboardEvent) { if (e.key === 'Enter') { e.preventDefault(); submit(); } }
</script>

<div class="cmds" class:flat={mode !== 'full'}>
  {#if fase === 'inicio' || fase === 'fin'}
    {#if mode === 'paso'}
      {#if fase === 'fin'}<p class="hint" role="status"><strong>{tally.primera} de {queue.length}</strong> a la primera{tally.vistas ? `, ${tally.vistas} con la solución a la vista` : ''}. {tally.primera === queue.length ? 'Paso marcado como hecho.' : 'Vuelve a intentarlo cuando quieras: el paso se marca cuando salgan sin ayuda.'}</p>{/if}
    {:else if fase === 'fin'}
      <p class="res" role="status"><strong>{tally.primera} de {queue.length}</strong> a la primera{tally.ayuda ? `, ${tally.ayuda} con pistas o varios intentos` : ''}{tally.vistas ? `, ${tally.vistas} con la solución a la vista` : ''}.</p>
      <p class="hint">Los que salieron a la primera se espacian (1, 3, 7, 16 y 35 días). Los que necesitaron ayuda vuelven mañana: recordar un comando con esfuerzo, días después, es lo que lo deja fijo.</p>
    {:else}
      <p class="lead">Lee la tarea y escribe el comando <strong>sin mirarlo</strong>. Nada se ejecuta: se corrige la forma, parte por parte. El orden de los flags, <span class="mono">k</span> por <span class="mono">kubectl</span>, las abreviaturas (<span class="mono">deploy</span>, <span class="mono">svc</span>) y <span class="mono">tipo/nombre</span> cuentan igual.</p>
    {/if}
    <div class="row">
      {#if module === undefined && !ids}
        <label>Alcance
          <select bind:value={scope}>
            <option value={0}>Todos los módulos</option>
            {#each MODULES.filter((m) => drillsOf(m.n).length) as m}<option value={m.n}>{pad(m.n)} · {m.title}</option>{/each}
          </select>
        </label>
      {/if}
      {#if mode === 'paso'}
        <button type="button" class="btn small" onclick={start}>{fase === 'fin' ? 'Otra vez' : pool.length === 1 ? 'Escríbelo de memoria' : `Escríbelos de memoria (${pool.length})`}</button>
        {#if fase === 'inicio'}<span class="hint">Los comandos del paso se tapan mientras escribes.</span>{/if}
      {:else}
      <button type="button" class="btn primary" onclick={start}>{fase === 'fin' ? 'Otra ronda' : stats.due ? `Repasar ${Math.min(size, pool.length)} comandos` : `Practicar ${Math.min(size, pool.length)} comandos`}</button>
      <span class="hint">{stats.seen} de {stats.total} practicados{stats.firme ? ` · ${stats.firme} firmes` : ''}{stats.due ? ` · ${stats.due} por repasar hoy` : ''}</span>
      {/if}
    </div>
    {#if fase === 'fin' && scope && mode === 'full'}<p class="hint">Para verlos funcionar: <a href={url('/terminal')}>terminal simulada</a> o el laboratorio del <a href={`${moduleUrl(scope)}#laboratorio-guiado`}>módulo {pad(scope)}</a> en tu clúster.</p>{/if}
  {:else if d}
    <p class="kicker">{mode === 'uno' ? 'Comando de memoria' : `Comando ${i + 1} de ${queue.length}`} · módulo {pad(d.mod)}{progress.quiz[drillKey(d)] && fase === 'pregunta' ? ' · repaso' : ''}</p>
    <p class="tarea">{d.tarea}</p>

    {#if fase === 'solucion'}
      <div class="explain warn">
        <p>Solución:</p>
        {#each d.acepta.slice(0, 2) as c}<code class="sol mono">{c}</code>{/each}
        <p>{d.porque}</p>
        <SourceLinks source={FUENTES[d.id]} />
        <p class="hint">Ahora escríbelo tú, entero, sin copiar y pegar. Volverá a salir mañana.</p>
      </div>
    {/if}

    {#if fase !== 'bien'}
      <div class="inrow mono">
        <label for="cmd-{module ?? 'x'}" class="visually-hidden">Escribe el comando</label>
        <span class="prompt" aria-hidden="true">PS&gt; </span>
        <input id="cmd-{module ?? 'x'}" bind:this={inputEl} bind:value={input} {onkeydown} type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck={false} placeholder="escribe el comando y pulsa Enter" />
      </div>
      <div class="row">
        <button type="button" class="btn primary small" onclick={submit} disabled={!input.trim()}>Comprobar</button>
        {#if fase === 'pregunta'}<button type="button" class="btn small" onclick={hint}>{level === 0 ? 'Pista' : level === 1 && hasSkel ? 'Otra pista: la forma' : 'Ver la solución'}</button>{/if}
        {#if fase === 'solucion'}<button type="button" class="btn small" onclick={next}>Saltar</button>{/if}
      </div>
    {/if}

    <div aria-live="polite">
      {#if fase === 'pregunta' && level >= 1}<p class="pista"><strong>Pista.</strong> {d.idea}</p>{/if}
      {#if fase === 'pregunta' && level >= 2 && hasSkel}<p class="pista"><strong>La forma.</strong> <code class="mono">{skel}</code></p>{/if}

      {#if verdict && !verdict.ok && fase !== 'bien'}
        <ul class="partes" aria-label="Corrección por partes">
          {#each verdict.partes as p}
            <li class:ok={p.ok} class:bad={!p.ok}><span aria-hidden="true">{p.ok ? '✓' : '✗'}</span> {p.etiqueta}<span class="visually-hidden">{p.ok ? ': bien' : ': revisar'}</span>{#if p.detalle}<span class="det">{p.detalle}</span>{/if}</li>
          {/each}
        </ul>
        {#each notas as n}<p class="pista"><strong>Tutor.</strong> {n.msg}</p>{/each}
        {#if tries >= 2 && level === 0 && fase === 'pregunta'}<p class="hint">Llevas {tries} intentos. Pedir una pista no es rendirse: te da la idea, no el comando.</p>{/if}
      {/if}

      {#if fase === 'bien'}
        <div class="explain ok">
          <p><strong>Correcto.</strong> <code class="mono">{input.trim()}</code></p>
          <p>{d.porque}</p>
          <SourceLinks source={FUENTES[d.id]} />
          {#if otras.length}<p class="hint">También vale: {#each otras as c, k}{k ? ' · ' : ''}<code class="mono">{c}</code>{/each}</p>{/if}
          {#if !limpio}<p class="hint">Salió con ayuda o tras varios intentos: volverá mañana para comprobar que ya sale solo.</p>{/if}
        </div>
        <div class="row"><button type="button" class="btn primary small" bind:this={nextEl} onclick={next}>{i + 1 < queue.length || mode === 'uno' ? 'Siguiente' : mode === 'paso' ? 'Terminar' : 'Ver resultado'}</button></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .cmds { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-l); box-shadow: var(--shadow); padding: 20px; overflow-wrap: anywhere; }
  .cmds.flat { background: none; border: 0; box-shadow: none; padding: 0; border-radius: 0; }
  .cmds > :global(* + *), .cmds div[aria-live] > :global(* + *) { margin-top: 12px; }
  .lead { max-width: var(--measure); color: var(--ink-2); }
  .kicker { font-size: 0.85rem; color: var(--ink-2); }
  .tarea { font-size: 1.08rem; font-weight: 500; max-width: var(--measure); }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
  .row label { display: inline-flex; align-items: center; gap: 8px; font-size: 0.92rem; font-weight: 500; }
  select { font: inherit; font-size: 0.95rem; padding: 6px 10px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel); color: var(--ink); max-width: 100%; }
  .hint { color: var(--ink-2); font-size: 0.9rem; max-width: var(--measure); }
  .res { font-size: 1.05rem; }
  .inrow { display: flex; align-items: center; background: #0e1626; color: #e7edf5; border-radius: var(--r-m); border: 1px solid var(--line); padding: 10px 14px; font-size: 0.9rem; }
  .inrow:focus-within { border-color: var(--helm); }
  .prompt { color: #8fe0ae; white-space: pre; flex: none; margin-right: 8px; }
  .inrow input { flex: 1; min-width: 0; background: none; border: 0; outline: none; color: inherit; font: inherit; padding: 2px 0; caret-color: #8fe0ae; }
  .inrow input::placeholder { color: #5b6b86; }
  .partes { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 8px; }
  .partes li { font-size: 0.86rem; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel-2); }
  .partes li.ok { border-color: var(--ready); color: var(--ready); }
  .partes li.bad { border-color: var(--fail); color: var(--ink); border-radius: 12px; }
  .partes li.bad > span[aria-hidden] { color: var(--fail); font-weight: 600; }
  .det { color: var(--ink-2); margin-left: 6px; }
  .pista { font-size: 0.94rem; padding: 10px 12px; border-radius: var(--r-m); background: var(--panel-2); border-left: 3px solid var(--helm); max-width: var(--measure); }
  .pista code, .explain code { font-size: 0.86rem; }
  .explain { padding: 12px 14px; border-radius: var(--r-m); background: var(--panel-2); border-left: 3px solid var(--helm); font-size: 0.95rem; max-width: var(--measure); }
  .explain > :global(* + *) { margin-top: 8px; }
  .explain.ok { border-left-color: var(--ready); }
  .explain.warn { border-left-color: var(--wait); }
  .sol { display: block; background: #0e1626; color: #dfe7f3; padding: 8px 12px; border-radius: var(--r-s); user-select: none; }
  @media (pointer: coarse) { .inrow input { font-size: 16px; } }
  @media (max-width: 480px) { .cmds { padding: 16px 14px; border-radius: var(--r-m); } }
</style>
