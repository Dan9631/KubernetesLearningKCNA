<script lang="ts">
  // Página de práctica: inicio con los modos, práctica por dominio/módulo, repaso de falladas,
  // simulacro cronometrado con revisión final, y progreso del alumno.
  import { onMount } from 'svelte';
  import { DOMAINS, MODULES, pad, url, type DomainKey } from '../../lib/modules';
  import { progress, recordAnswer, resetProgress, save } from '../../lib/progress.svelte';
  import { EXAM_DOMAINS, EXAM_SECONDS, PASS, fmt, fmtDate, isCorrect, pct, prep, shuffle, togglePick, type Item, type Q } from './quiz';
  import Pregunta from './Pregunta.svelte';
  import VozAjustes from '../VozAjustes.svelte';
  import Preparacion from './Preparacion.svelte';
  import { PRACTICE, HOLDOUT } from '../../lib/preparacion';

  // la práctica, los repasos y los simulacros nunca usan el banco reservado (Examen de graduación)
  const QS = PRACTICE;
  const PRACTICE_N = 20;
  const examMods = MODULES.filter((m) => m.domain !== 'base');

  type View = 'home' | 'practice' | 'practice-end' | 'exam' | 'result' | 'review';
  let view = $state<View>('home');
  let items = $state<Item[]>([]);
  let idx = $state(0);
  let scope = $state('all');
  let practiceTitle = $state('Práctica');
  let askReset = $state(false);
  let askSubmit = $state(false);

  // simulacro
  let left = $state(EXAM_SECONDS);
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let result = $state<{ score: number; ok: number; secs: number; timeout: boolean; counts: boolean } | null>(null);
  let finalRun = $state(false); // simulacro con el banco reservado

  const cur = $derived(items[idx]);
  const okCount = $derived(items.filter((it) => it.done && isCorrect(it)).length);
  const answeredCount = $derived(items.filter((it) => it.picked.length).length);
  const doneCount = $derived(items.filter((it) => it.done).length);

  // ---------- inicio ----------
  const wrongPool = $derived(QS.filter((q) => progress.quiz[q.id]?.last === false));
  const lastExams = $derived(progress.exams.slice(-6).reverse());
  function domainStats(d: DomainKey) {
    const qs = QS.filter((q) => q.domain === d);
    let seen = 0, ok = 0, mastered = 0;
    for (const q of qs) { const s = progress.quiz[q.id]; if (s) { seen += s.seen; ok += s.ok; if (s.last) mastered++; } }
    return { total: qs.length, acc: pct(ok, seen), mastered, seen };
  }

  function home() {
    stopTimer();
    view = 'home'; items = []; idx = 0; askSubmit = false; askReset = false; result = null;
  }

  // ---------- práctica ----------
  function poolFor(s: string): Q[] {
    if (s.startsWith('d:')) return QS.filter((q) => q.domain === s.slice(2));
    if (s.startsWith('m:')) return QS.filter((q) => String(q.module) === s.slice(2));
    return QS;
  }
  function titleFor(s: string) {
    if (s.startsWith('d:')) return DOMAINS[s.slice(2) as DomainKey]?.name ?? 'Práctica';
    if (s.startsWith('m:')) { const m = examMods.find((x) => String(x.n) === s.slice(2)); return m ? `Módulo ${pad(m.n)} · ${m.title}` : 'Práctica'; }
    return 'Todo el temario';
  }
  // primero las nunca vistas y las falladas; después las que menos se dominan
  const weightOf = (q: Q) => { const s = progress.quiz[q.id]; if (!s) return 2; return s.last === false ? 3 : 1 - s.ok / (s.seen + 1); };

  function startPractice(pool: Q[], n: number, title: string) {
    stopTimer();
    const chosen = shuffle(pool).sort((a, b) => weightOf(b) - weightOf(a)).slice(0, Math.min(n, pool.length));
    items = chosen.map(prep); idx = 0; practiceTitle = title;
    view = items.length ? 'practice' : 'practice-end';
  }
  function startScoped() { startPractice(poolFor(scope), PRACTICE_N, titleFor(scope)); }
  function startWrong() { startPractice(wrongPool, 999, 'Repaso de falladas'); }
  function confirmPractice() {
    const it = cur; if (!it || it.done || !it.picked.length) return;
    it.done = true; recordAnswer(it.q.id, isCorrect(it));
  }
  function nextPractice() { if (idx + 1 < items.length) idx += 1; else view = 'practice-end'; }

  // ---------- simulacro ----------
  function startExam() {
    let sel: Q[] = [];
    for (const d of EXAM_DOMAINS) sel = sel.concat(shuffle(QS.filter((q) => q.domain === d)).slice(0, DOMAINS[d].exam));
    beginExam(sel, false);
  }
  // Examen de graduación: las 60 reservadas (ya vienen con los pesos del examen)
  function startFinal() { beginExam(HOLDOUT, true); }
  function beginExam(sel: Q[], final: boolean) {
    stopTimer();
    finalRun = final;
    items = shuffle(sel).map(prep); idx = 0; result = null; askSubmit = false;
    startedAt = Date.now(); left = EXAM_SECONDS;
    timer = setInterval(tick, 1000);
    view = 'exam';
  }
  function tick() {
    left = Math.max(0, EXAM_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
    if (left <= 0) submit(true);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function submit(timeout: boolean) {
    if (view !== 'exam') return;
    stopTimer(); askSubmit = false;
    const secs = Math.min(EXAM_SECONDS, Math.floor((Date.now() - startedAt) / 1000));
    for (const it of items) { it.done = true; recordAnswer(it.q.id, isCorrect(it)); }
    const ok = items.filter(isCorrect).length;
    const score = pct(ok, items.length);
    const doms: Record<string, [number, number]> = {};
    for (const it of items) { const d = (doms[it.q.domain] ??= [0, 0]); d[1]++; if (isCorrect(it)) d[0]++; }
    // solo el primer examen de graduación cuenta para la preparación (ver lib/preparacion.ts)
    const counts = finalRun && !progress.exams.some((e) => e.kind === 'final');
    progress.exams.push({ date: Date.now(), score, ok, total: items.length, secs, doms, ...(finalRun ? { kind: 'final' as const } : {}) });
    save();
    result = { score, ok, secs, timeout, counts };
    idx = 0;
    view = 'result';
  }
  const pendingCount = $derived(items.length - answeredCount);
  const byDomain = $derived(EXAM_DOMAINS.map((d) => {
    const its = items.filter((it) => it.q.domain === d);
    return { d, n: its.length, ok: its.filter(isCorrect).length };
  }));
  const weakTopics = $derived.by(() => {
    const map = new Map<string, { ok: number; n: number; mods: Set<number> }>();
    for (const it of items) {
      const t = map.get(it.q.topic) ?? { ok: 0, n: 0, mods: new Set<number>() };
      t.n++; if (isCorrect(it)) t.ok++; if (it.q.module) t.mods.add(it.q.module);
      map.set(it.q.topic, t);
    }
    return [...map.entries()].filter(([, t]) => pct(t.ok, t.n) < PASS).sort((a, b) => pct(a[1].ok, a[1].n) - pct(b[1].ok, b[1].n))
      .map(([topic, t]) => ({ topic, ok: t.ok, n: t.n, mods: [...t.mods].sort((x, y) => x - y) }));
  });

  // ---------- navegación común ----------
  function go(n: number) { if (n >= 0 && n < items.length) idx = n; }
  function pick(k: number) { if (!cur || cur.done) return; togglePick(cur, k); }
  function flag() { if (cur) cur.flagged = !cur.flagged; }

  function onkey(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    const tag = t?.tagName ?? '';
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
    // Enter y Espacio sobre un botón o enlace ya disparan su clic
    if ((e.key === 'Enter' || e.key === ' ') && /^(BUTTON|A)$/.test(tag)) return;
    if (view === 'practice' && cur) {
      if (/^[1-5]$/.test(e.key) && !cur.done && +e.key <= cur.options.length) { pick(+e.key - 1); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); cur.done ? nextPractice() : confirmPractice(); }
    } else if (view === 'exam' && cur) {
      if (/^[1-5]$/.test(e.key) && +e.key <= cur.options.length) { pick(+e.key - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); go(idx + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
      else if (e.key === 'f' || e.key === 'F') { flag(); }
    } else if (view === 'review') {
      if (e.key === 'ArrowRight') go(idx + 1);
      else if (e.key === 'ArrowLeft') go(idx - 1);
    }
  }

  function doReset() { resetProgress(); askReset = false; }

  // Entrada directa por URL (solo en el navegador; onMount no vuelve a ejecutarse al cambiar el estado)
  onMount(() => {
    const p = new URLSearchParams(location.search);
    const modo = p.get('modo');
    if (modo === 'simulacro') startExam();
    else if (modo === 'practica') {
      const d = p.get('dominio'), m = p.get('modulo');
      if (d && EXAM_DOMAINS.includes(d as DomainKey)) scope = `d:${d}`;
      else if (m && examMods.some((x) => String(x.n) === String(+m))) scope = `m:${+m}`;
      startScoped();
    } else if (modo === 'falladas') startWrong();
    return () => stopTimer();
  });
</script>

<svelte:window onkeydown={onkey} />

{#if view === 'home'}
  <div class="home">
    <Preparacion onfinal={startFinal} />
    <ul class="modes">
      <li class="mode main">
        <div class="txt">
          <h2>Simulacro de examen</h2>
          <p>60 preguntas con los pesos oficiales, 90 minutos y sin ver las respuestas hasta entregar. Apruebas con 75 %.</p>
        </div>
        <div class="act"><button type="button" class="btn primary" onclick={startExam}>Empezar simulacro</button></div>
      </li>
      <li class="mode">
        <div class="txt">
          <h2>Práctica</h2>
          <p>20 preguntas por dominio o por módulo, con la explicación justo después de responder. Salen antes las que nunca has visto y las que fallaste.</p>
        </div>
        <div class="act">
          <label class="visually-hidden" for="scope">Alcance de la práctica</label>
          <select id="scope" bind:value={scope}>
            <option value="all">Todo el temario</option>
            <optgroup label="Por dominio">
              {#each EXAM_DOMAINS as d}<option value={'d:' + d}>{DOMAINS[d].name} ({DOMAINS[d].weight} %)</option>{/each}
            </optgroup>
            <optgroup label="Por módulo">
              {#each examMods as m}<option value={'m:' + m.n}>{pad(m.n)} · {m.title}</option>{/each}
            </optgroup>
          </select>
          <button type="button" class="btn" onclick={startScoped}>Practicar 20</button>
        </div>
      </li>
      <li class="mode">
        <div class="txt">
          <h2>Repasar falladas</h2>
          <p>{#if wrongPool.length}{wrongPool.length} {wrongPool.length === 1 ? 'pregunta cuyo último intento fue incorrecto' : 'preguntas cuyo último intento fue incorrecto'}.{:else}Aquí aparecerán las preguntas que falles en la práctica o en el simulacro.{/if}</p>
        </div>
        <div class="act"><button type="button" class="btn" onclick={startWrong} disabled={!wrongPool.length}>Repasar {wrongPool.length || ''}</button></div>
      </li>
      <li class="mode">
        <div class="txt">
          <h2>Flashcards</h2>
          <p>Términos clave en inglés con su definición. Marca los que ya dominas y repasa el resto como glosario.</p>
        </div>
        <div class="act"><a class="btn" href={url('/flashcards')}>Abrir flashcards</a></div>
      </li>
    </ul>

    <div class="cols">
      <section class="panel" aria-labelledby="h-dom">
        <h2 id="h-dom" class="sec">Progreso por dominio</h2>
        <ul class="doms">
          {#each EXAM_DOMAINS as d}
            {@const s = domainStats(d)}
            <li class="dom-{d}">
              <div class="dh"><span class="dn">{DOMAINS[d].name}</span><span class="dw">{DOMAINS[d].weight} % del examen · {s.total} preguntas</span></div>
              <div class="bar" role="img" aria-label="{s.mastered} de {s.total} acertadas"><span style="width:{pct(s.mastered, s.total)}%"></span></div>
              <div class="ds">{s.mastered}/{s.total} acertadas en su último intento · precisión {s.seen ? s.acc + ' %' : 'sin datos'}</div>
            </li>
          {/each}
        </ul>
      </section>

      <section class="panel" aria-labelledby="h-ex">
        <h2 id="h-ex" class="sec">Últimos simulacros</h2>
        {#if lastExams.length}
          <table class="exams">
            <thead><tr><th>Fecha</th><th>Resultado</th><th>Tiempo</th></tr></thead>
            <tbody>
              {#each lastExams as h}
                <tr>
                  <td>{fmtDate(h.date)}{#if h.kind === 'final'} <span class="tag">Graduación</span>{/if}</td>
                  <td class:pass={h.score >= PASS} class:fail={h.score < PASS}>{h.score} % <span class="muted">({h.ok}/{h.total})</span></td>
                  <td class="mono">{fmt(h.secs)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="muted">Todavía no has entregado ningún simulacro. El primero te dirá en qué punto estás.</p>
        {/if}
        <p class="keys">Atajos: <kbd>1</kbd> a <kbd>5</kbd> elegir opción, <kbd>Enter</kbd> responder o siguiente, <kbd>←</kbd> <kbd>→</kbd> moverse en el simulacro, <kbd>F</kbd> marcar para revisar.</p>
      </section>
    </div>

    <div class="reset">
      {#if askReset}
        <span>Se borran estadísticas, simulacros, flashcards dominadas y pasos de laboratorio marcados.</span>
        <button type="button" class="btn small" onclick={doReset}>Sí, borrar todo</button>
        <button type="button" class="btn small" onclick={() => (askReset = false)}>Cancelar</button>
      {:else}
        <button type="button" class="btn small" onclick={() => (askReset = true)}>Borrar mi progreso</button>
      {/if}
    </div>
  </div>

{:else if view === 'practice' && cur}
  <div class="round">
    <div class="top">
      <span class="title">{practiceTitle}</span>
      <span class="stat" aria-live="polite">{okCount} correctas de {doneCount}</span>
      <VozAjustes />
    </div>
    <div class="card">
      <Pregunta item={cur} index={idx} total={items.length} reveal={cur.done} onpick={cur.done ? undefined : pick} />
      <div class="row">
        {#if cur.done}
          <button type="button" class="btn primary" onclick={nextPractice}>{idx + 1 < items.length ? 'Siguiente' : 'Ver resultado'}</button>
        {:else}
          <button type="button" class="btn primary" onclick={confirmPractice} disabled={!cur.picked.length}>Responder</button>
        {/if}
        <button type="button" class="btn right" onclick={() => (view = 'practice-end')}>Terminar</button>
      </div>
    </div>
  </div>

{:else if view === 'practice-end'}
  <div class="card end" role="status">
    {#if items.length}
      <p class="muted">{practiceTitle}</p>
      <h2>Práctica terminada</h2>
      <p class="score" class:pass={pct(okCount, doneCount) >= PASS} class:fail={doneCount > 0 && pct(okCount, doneCount) < PASS}>{pct(okCount, doneCount)} %</p>
      <p>{okCount} de {doneCount} correctas{#if doneCount < items.length}{' · '}{items.length - doneCount} sin responder{/if}</p>
      <div class="row">
        <button type="button" class="btn primary" onclick={() => (practiceTitle === 'Repaso de falladas' ? startWrong() : startScoped())}>Otra ronda</button>
        <button type="button" class="btn" onclick={home}>Volver al inicio</button>
      </div>
    {:else}
      <h2>No hay preguntas para esta selección</h2>
      <p class="muted">Elige otro dominio o módulo, o practica primero para tener falladas que repasar.</p>
      <div class="row"><button type="button" class="btn primary" onclick={home}>Volver al inicio</button></div>
    {/if}
  </div>

{:else if view === 'exam' && cur}
  <div class="round">
    <div class="top">
      <span class="title">{finalRun ? 'Examen de graduación' : 'Simulacro'}</span>
      <span class="timer" class:low={left < 300} role="timer" aria-label="Tiempo restante">{fmt(left)}</span>
      <span class="stat">{answeredCount}/{items.length} respondidas</span>
      <VozAjustes />
    </div>
    <div class="card">
      <Pregunta item={cur} index={idx} total={items.length} onpick={pick} />
      <div class="row">
        <button type="button" class="btn" onclick={() => go(idx - 1)} disabled={idx === 0}>Anterior</button>
        <button type="button" class="btn" onclick={() => go(idx + 1)} disabled={idx + 1 >= items.length}>Siguiente</button>
        <button type="button" class="btn" class:flagged={cur.flagged} aria-pressed={cur.flagged} onclick={flag}>{cur.flagged ? 'Marcada para revisar' : 'Marcar para revisar'}</button>
        {#if !askSubmit}
          <button type="button" class="btn primary right" onclick={() => (askSubmit = true)}>Entregar</button>
        {/if}
      </div>
      {#if askSubmit}
        <div class="confirm" role="alertdialog" aria-labelledby="sub-t">
          <p id="sub-t">{pendingCount ? `Tienes ${pendingCount} sin responder. ¿Entregas de todas formas?` : '¿Entregas el simulacro?'}</p>
          <div class="row">
            <button type="button" class="btn primary" onclick={() => submit(false)}>Sí, entregar</button>
            <button type="button" class="btn" onclick={() => (askSubmit = false)}>Seguir respondiendo</button>
          </div>
        </div>
      {/if}
      <nav class="navgrid" aria-label="Ir a una pregunta">
        {#each items as it, n}
          <button type="button" class:current={n === idx} class:answered={it.picked.length > 0} class:flag={it.flagged} aria-current={n === idx ? 'true' : undefined} aria-label="Pregunta {n + 1}{it.picked.length ? ', respondida' : ''}{it.flagged ? ', marcada' : ''}" onclick={() => go(n)}>{n + 1}</button>
        {/each}
      </nav>
    </div>
  </div>

{:else if view === 'result' && result}
  <div class="card end" role="status">
    <p class="muted">{result.timeout ? 'Se acabó el tiempo.' : finalRun ? 'Examen de graduación entregado.' : 'Simulacro entregado.'} Tiempo: {fmt(result.secs)}</p>
    <h2>{finalRun ? 'Resultado del examen de graduación' : 'Resultado del simulacro'}</h2>
    <p class="score" class:pass={result.score >= PASS} class:fail={result.score < PASS}>{result.score} %</p>
    <p>{result.ok} de {items.length} correctas · <strong class:pass={result.score >= PASS} class:fail={result.score < PASS}>{result.score >= PASS ? 'Aprobado' : 'Por debajo del 75 %'}</strong></p>

    {#if finalRun}
      <p class="note">{result.counts ? 'Este resultado cuenta para tu Preparación real.' : 'Es una repetición: ya conocías estas preguntas, así que no cambia tu Preparación real.'}</p>
    {/if}

    <h3 class="sec">Por dominio</h3>
    <ul class="doms">
      {#each byDomain as s}
        <li class="dom-{s.d}">
          <div class="dh"><span class="dn">{DOMAINS[s.d].name}</span><span class="dw">{s.ok}/{s.n} ({pct(s.ok, s.n)} %)</span></div>
          <div class="bar" role="img" aria-label="{s.ok} de {s.n} correctas"><span style="width:{pct(s.ok, s.n)}%"></span></div>
        </li>
      {/each}
    </ul>

    {#if weakTopics.length}
      <h3 class="sec">Temas a reforzar</h3>
      <table class="weak">
        <thead><tr><th>Competencia</th><th>Aciertos</th><th>Repasar</th></tr></thead>
        <tbody>
          {#each weakTopics as t}
            <tr>
              <td>{t.topic}</td>
              <td class="mono">{t.ok}/{t.n}</td>
              <td>{#each t.mods as m, i}{#if i}, {/if}<a href={url(`/modulos/${pad(m)}`)}>Módulo {pad(m)}</a>{/each}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="muted">Ningún tema por debajo del 75 %.</p>
    {/if}

    <div class="row">
      <button type="button" class="btn primary" onclick={() => { idx = 0; view = 'review'; }}>Revisar respuestas</button>
      <button type="button" class="btn" onclick={startExam}>Otro simulacro</button>
      <button type="button" class="btn" onclick={home}>Volver al inicio</button>
    </div>
  </div>

{:else if view === 'review' && cur}
  <div class="round">
    <div class="top">
      <span class="title">{finalRun ? 'Revisión del examen de graduación' : 'Revisión del simulacro'}</span>
      <span class="stat">{items.filter(isCorrect).length} de {items.length} correctas</span>
      <VozAjustes />
    </div>
    <div class="card">
      <Pregunta item={cur} index={idx} total={items.length} reveal link />
      <div class="row">
        <button type="button" class="btn" onclick={() => go(idx - 1)} disabled={idx === 0}>Anterior</button>
        <button type="button" class="btn" onclick={() => go(idx + 1)} disabled={idx + 1 >= items.length}>Siguiente</button>
        <button type="button" class="btn right" onclick={() => (view = 'result')}>Volver al resultado</button>
      </div>
      <nav class="navgrid" aria-label="Ir a una pregunta">
        {#each items as it, n}
          <button type="button" class:current={n === idx} class:r-ok={isCorrect(it)} class:r-bad={!isCorrect(it)} aria-current={n === idx ? 'true' : undefined} aria-label="Pregunta {n + 1}, {isCorrect(it) ? 'correcta' : 'incorrecta'}" onclick={() => go(n)}>{n + 1}</button>
        {/each}
      </nav>
    </div>
  </div>
{/if}

<style>
  .home { display: grid; gap: 28px; }
  .muted { color: var(--ink-2); font-size: 0.92rem; }
  .mono { font-family: var(--mono); font-size: 0.9em; }
  .pass { color: var(--ready); }
  .fail { color: var(--fail); }

  /* modos: lista con separadores, no cuatro tarjetas iguales */
  .modes { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
  .mode { display: grid; grid-template-columns: 1fr auto; gap: 12px 28px; align-items: center; padding: 18px 0; border-bottom: 1px solid var(--line); }
  .mode h2 { font-size: 1.12rem; }
  .mode p { color: var(--ink-2); font-size: 0.95rem; margin-top: 4px; max-width: 62ch; }
  .mode.main { padding-left: 16px; border-left: 3px solid var(--helm); }
  .act { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
  .act select { font: inherit; font-size: 0.95rem; padding: 7px 10px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel); color: var(--ink); max-width: 100%; }
  a.btn { text-decoration: none; }

  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-l); padding: 18px 20px; }
  .sec { font-size: 1.05rem; margin-bottom: 12px; }

  .doms { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  .dh { display: flex; justify-content: space-between; gap: 8px 12px; flex-wrap: wrap; align-items: baseline; }
  .dn { font-weight: 500; }
  .dw, .ds { font-size: 0.85rem; color: var(--ink-3); }
  .bar { height: 7px; background: var(--line-2); border-radius: 4px; overflow: hidden; margin: 6px 0 4px; }
  .bar > span { display: block; height: 100%; background: var(--dc, var(--helm)); border-radius: 4px; transition: width var(--dur-slow) var(--ease); }
  .dom-fundamentals { --dc: var(--helm); }
  .dom-orchestration { --dc: #8250df; }
  .dom-delivery { --dc: var(--wait); }
  .dom-architecture { --dc: var(--ready); }
  :global(:root[data-theme='dark']) .dom-orchestration { --dc: #b392f0; }

  table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--line-2); vertical-align: top; }
  th { color: var(--ink-2); font-weight: 600; border-bottom-color: var(--line); }
  .keys { margin-top: 16px; font-size: 0.85rem; color: var(--ink-3); }
  kbd { font: 0.78rem var(--mono); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; background: var(--panel-2); color: var(--ink-2); }
  .reset { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 0.9rem; color: var(--ink-2); }

  /* ronda de preguntas */
  .round { max-width: 820px; }
  .top { display: flex; align-items: baseline; gap: 10px 18px; flex-wrap: wrap; margin-bottom: 12px; }
  .title { font-weight: 600; }
  .stat { font-size: 0.9rem; color: var(--ink-2); margin-left: auto; }
  .timer { font: 600 1.05rem var(--mono); font-variant-numeric: tabular-nums; color: var(--ink); }
  .timer.low { color: var(--fail); }
  .card { border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); padding: 20px; box-shadow: var(--shadow); }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
  .right { margin-left: auto; }
  .btn.flagged { border-color: var(--wait); color: var(--wait); }
  .confirm { margin-top: 14px; padding: 12px 14px; border-radius: var(--r-m); background: var(--wait-2); border-left: 3px solid var(--wait); font-size: 0.95rem; }
  .confirm .row { margin-top: 10px; }

  .navgrid { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line-2); }
  .navgrid button { width: 34px; height: 30px; padding: 0; font: 500 0.78rem var(--mono); border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel); color: var(--ink-2); cursor: pointer; }
  .navgrid button.answered { background: var(--helm-2); border-color: var(--helm); color: var(--helm-ink); }
  .navgrid button.flag { box-shadow: inset 0 0 0 2px var(--wait); }
  .navgrid button.r-ok { background: var(--ready-2); border-color: var(--ready); color: var(--ink); }
  .navgrid button.r-bad { background: var(--fail-2); border-color: var(--fail); color: var(--ink); }
  .navgrid button.current { background: var(--helm); border-color: var(--helm); color: #fff; }

  /* pantallas de resultado */
  .end { max-width: 820px; }
  .end h2 { font-size: 1.35rem; }
  .end .sec { margin-top: 22px; }
  .score { font-size: clamp(2.4rem, 2rem + 2vw, 3.2rem); font-weight: 700; line-height: 1.1; margin: 6px 0 4px; letter-spacing: -0.02em; }
  .weak { display: block; overflow-x: auto; }
  .note { margin-top: 10px; padding: 8px 12px; border-radius: var(--r-m); background: var(--panel-2); font-size: 0.92rem; color: var(--ink-2); }
  .tag { font-size: 0.72rem; padding: 1px 6px; border-radius: 999px; border: 1px solid var(--ready); color: var(--ready); white-space: nowrap; }
  .weak td { padding-right: 10px; }

  @media (max-width: 760px) {
    .cols { grid-template-columns: 1fr; }
    .mode { grid-template-columns: 1fr; }
    .act { justify-content: flex-start; }
  }
  @media (max-width: 420px) {
    .card { padding: 14px; }
    .act select { width: 100%; }
  }
</style>
