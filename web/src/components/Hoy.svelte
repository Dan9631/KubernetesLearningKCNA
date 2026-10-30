<script lang="ts">
  // Portada para quien ya empezó: cuenta atrás del examen, lo que toca hoy (una acción principal),
  // seguir leyendo, el siguiente paso de la preparación y la constancia de la semana. Todo se calcula
  // en el navegador con el progreso guardado (y sincronizado, si está activo).
  import { progress, setExamDate, isoDay, DAY } from '../lib/progress.svelte';
  import { dueToday, dueTomorrow, readiness, nextStep } from '../lib/preparacion';
  import { lastRead, pctOf } from '../lib/lectura';
  import { MODULES, moduleUrl, url } from '../lib/modules';
  import MapaMemoria from './MapaMemoria.svelte';
  import { MISSIONS } from '../lib/kube/missions';

  const ROUND = 30; // preguntas por ronda del Repaso del día (Practica.svelte)
  const DIAG_CASES = 6; // casos de sims/09/Diagnostico.svelte
  const termN = $derived(progress.retos.filter((r) => r.startsWith('term:')).length);
  const diagN = $derived(progress.retos.filter((r) => r.startsWith('diag:')).length);

  const started = $derived(Object.keys(progress.quiz).length > 0 || Object.keys(progress.reading).length > 0 || progress.done.length > 0 || Object.keys(progress.steps).length > 0 || progress.retos.length > 0);

  // fecha del examen (día local) y cuenta atrás
  const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  const today = isoDay();
  const exam = $derived(progress.exam?.date ?? '');
  const left = $derived(exam ? Math.round((parse(exam) - parse(today)) / DAY) : null);
  const fLong = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
  let editing = $state(false);
  function pickDate(v: string) { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { setExamDate(v); editing = false; } }

  // lo que toca hoy
  const due = $derived(dueToday(progress));
  const sure = $derived(due.filter((q) => progress.quiz[q.id]?.sureMiss).length);
  const tomorrow = $derived(dueTomorrow(progress));
  const r = $derived(readiness(progress));
  const next = $derived(nextStep(r));
  const top = $derived(Object.keys(progress.reading).length ? lastRead() : null);
  const meta = $derived(top ? MODULES.find((m) => m.n === +top.mod) : undefined);

  // últimos 7 días, de más antiguo a hoy
  const fNarrow = new Intl.DateTimeFormat('es', { weekday: 'narrow' });
  const fDay = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric' });
  const week = $derived(Array.from({ length: 7 }, (_, k) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - k));
    return { iso: isoDay(d.getTime()), l: fNarrow.format(d), name: fDay.format(d), on: progress.days.includes(isoDay(d.getTime())) };
  }));
  const active = $derived(week.filter((d) => d.on).length);

  const signals = $derived([
    { ok: r.coverOk, label: `Cobertura ${r.rows.filter((x) => x.seen >= x.need).length}/${r.rows.length}` },
    { ok: r.firstReady, label: `Primer intento ${r.recent.n ? `${r.recent.pct} %` : 'sin datos'}` },
    { ok: r.finalOk, label: r.final ? `Graduación ${r.final.score} %` : 'Graduación pendiente' },
  ]);
</script>

{#if started}
  <section class="hoy" aria-labelledby="h-hoy">
    <div class="card">
      <header class="head">
        <div>
          <h2 id="h-hoy">Hoy</h2>
          <p class="date">{fLong.format(new Date())}</p>
        </div>
        <div class="exam">
          {#if editing || !exam}
            <label for="exam-date">{exam ? 'Fecha del examen' : '¿Cuándo es tu examen?'}</label>
            <span class="pick">
              <input id="exam-date" type="date" min={today} value={exam} onchange={(e) => pickDate((e.currentTarget as HTMLInputElement).value)} />
              {#if exam}<button type="button" class="btn small" onclick={() => { setExamDate(''); editing = false; }}>Quitar</button>{/if}
              {#if editing}<button type="button" class="btn small" onclick={() => (editing = false)}>Cancelar</button>{/if}
            </span>
          {:else}
            <p class="count" class:soon={left !== null && left >= 0 && left <= 7}>
              {#if left === null}{''}
              {:else if left > 1}Examen en <strong>{left}</strong> días
              {:else if left === 1}Examen <strong>mañana</strong>
              {:else if left === 0}Examen <strong>hoy</strong>
              {:else}Tu examen fue hace {-left} {-left === 1 ? 'día' : 'días'}{/if}
            </p>
            <button type="button" class="link" onclick={() => (editing = true)}>{left !== null && left < 0 ? '¿Lo reprogramaste? Cambia la fecha' : 'Cambiar fecha'}</button>
          {/if}
        </div>
      </header>

      <ul class="tasks">
        <li class="task main" class:done={!due.length}>
          {#if due.length}
            <div class="tx">
              <strong>Repaso del día · {due.length} {due.length === 1 ? 'pregunta' : 'preguntas'}</strong>
              <span>{sure ? `${sure} ${sure === 1 ? 'fallo' : 'fallos'} con seguridad primero · ` : ''}{due.length > ROUND ? `rondas de ${ROUND} · ` : ''}unos {Math.max(1, Math.round(Math.min(due.length, ROUND) * 0.75))} min</span>
            </div>
            <a class="btn primary" href={url('/practica?modo=repaso')}>Empezar</a>
          {:else}
            <div class="tx">
              <strong>Repaso del día al corriente</strong>
              <span>{tomorrow ? `Mañana vencen ${tomorrow}.` : 'No tienes repasos pendientes.'} Aprovecha para avanzar.</span>
            </div>
          {/if}
        </li>
        {#if top && meta}
          <li class="task">
            <div class="tx">
              <strong>Seguir leyendo · Módulo {top.mod} · {meta.title}</strong>
              <span class="bar" role="img" aria-label="Te quedaste en el {pctOf(top.last)} %"><span style="width:{pctOf(top.last)}%"></span></span>
              <span>Te quedaste en el {pctOf(top.last)} %</span>
            </div>
            <a class="btn" class:primary={!due.length} href={`${moduleUrl(meta.n)}#continuar`}>Continuar</a>
          </li>
        {/if}
        <li class="task">
          <div class="tx">
            <strong>{next.text.replace(/^Siguiente paso: /, '').replace(/^./, (c) => c.toUpperCase())}</strong>
            <span class="signals">
              {#each signals as s}<span class="sig" class:ok={s.ok}><span aria-hidden="true">{s.ok ? '✓' : '○'}</span> {s.label}</span>{/each}
            </span>
          </div>
          <a class="btn" class:primary={!due.length && !(top && meta)} href={next.href}>{next.label}</a>
        </li>
      </ul>

      <footer class="week">
        <ol class="dots" aria-label="Días con estudio en la última semana: {active} de 7">
          {#each week as d, k}
            <li class:on={d.on} class:today={k === 6} title="{d.name}{d.on ? ': estudiaste' : ''}"><span class="d" aria-hidden="true"></span><span class="l">{d.l}</span></li>
          {/each}
        </ol>
        <p>{active === 0 ? 'Esta semana aún no has estudiado.' : `Estudiaste ${active} de los últimos 7 días.`}{due.length && tomorrow ? ` Mañana vencen ${tomorrow} más.` : ''}</p>
        <p class="retos">
          <a href={url('/terminal')}>Terminal <strong class:full={termN === MISSIONS.length}>{termN}/{MISSIONS.length}</strong> misiones</a>
          <span aria-hidden="true">·</span>
          <a href={`${moduleUrl(9)}#simulaciones`}>Diagnóstico <strong class:full={diagN === DIAG_CASES}>{diagN}/{DIAG_CASES}</strong> casos</a>
        </p>
      </footer>
    </div>

    <MapaMemoria />
  </section>
{/if}

<style>
  .hoy { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 20px; align-items: start; padding-top: 28px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-l); box-shadow: var(--shadow); padding: 20px 22px; }
  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 12px 20px; }
  h2 { font-size: 1.5rem; line-height: 1.1; }
  .date { color: var(--ink-2); font-size: 0.92rem; margin-top: 2px; }
  .date::first-letter { text-transform: uppercase; }
  .exam { display: grid; justify-items: end; gap: 4px; text-align: right; }
  .exam label { font-size: 0.85rem; color: var(--ink-2); }
  .pick { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .pick input { font: inherit; font-size: 0.95rem; padding: 6px 10px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel); color: var(--ink); }
  .count { font-size: 1.05rem; }
  .count strong { font-size: 1.6rem; color: var(--helm-ink); }
  .count.soon strong { color: var(--wait); }
  .link { background: none; border: 0; padding: 0; color: var(--ink-2); text-decoration: underline; cursor: pointer; font: inherit; font-size: 0.85rem; }

  .tasks { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 0; }
  .task { display: flex; gap: 12px 16px; align-items: center; justify-content: space-between; padding: 12px 0; border-top: 1px solid var(--line-2); }
  .task.main { padding: 14px 16px; margin-bottom: 4px; border: 0; border-radius: var(--r-m); background: var(--helm-2); }
  .task.main.done { background: var(--ready-2); }
  .tx { display: grid; gap: 3px; min-width: 0; }
  .tx strong { font-weight: 600; overflow-wrap: anywhere; }
  .tx > span { font-size: 0.88rem; color: var(--ink-2); }
  .bar { display: block; width: min(220px, 100%); height: 4px; border-radius: 2px; background: var(--line-2); overflow: hidden; margin-top: 3px; }
  .bar > span { display: block; height: 100%; background: var(--helm); }
  .signals { display: flex; flex-wrap: wrap; gap: 4px 12px; }
  .sig.ok { color: var(--ready); }
  a.btn { text-decoration: none; flex: none; }

  .week { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line-2); }
  .week p { font-size: 0.88rem; color: var(--ink-2); }
  .week .retos { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 4px 10px; }
  .retos a { color: var(--ink-2); text-decoration: none; }
  .retos a:hover { color: var(--helm-ink); text-decoration: underline; }
  .retos strong { font-family: var(--mono); font-weight: 500; color: var(--ink); }
  .retos strong.full { color: var(--ready); }
  .dots { list-style: none; margin: 0; padding: 0; display: flex; gap: 6px; }
  .dots li { display: grid; justify-items: center; gap: 2px; }
  .d { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--line); background: transparent; }
  .on .d { background: var(--ready); border-color: var(--ready); }
  .today .d { box-shadow: 0 0 0 2px var(--paper), 0 0 0 3px var(--helm); }
  .l { font-size: 0.7rem; color: var(--ink-3); text-transform: uppercase; }

  @media (max-width: 900px) { .hoy { grid-template-columns: 1fr; } }
  @media (max-width: 520px) {
    .card { padding: 16px 14px; }
    .exam { justify-items: start; text-align: left; }
    .pick { justify-content: flex-start; }
    .task { flex-wrap: wrap; }
    .task a.btn { width: 100%; justify-content: center; }
  }
</style>
