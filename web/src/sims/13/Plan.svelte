<script lang="ts">
  // Plan de 6 semanas del módulo 13 como calendario: sesiones con casilla (persistidas en progress.plan),
  // fechas calculadas desde la fecha de inicio y el progreso real del curso (progress.done) al lado.
  import { progress, togglePlan } from '../../lib/progress.svelte';
  import { MODULES, pad, moduleUrl } from '../../lib/modules';

  type Kind = 'mod' | 'lab' | 'quiz' | 'exam' | 'note';
  interface Session { id: string; kind: Kind; text: string; mod?: number }
  interface Week { n: number; hours: number; focus: string; sessions: Session[] }

  const M = (w: number, n: number, extra = ''): Session => ({ id: `w${w}:m${pad(n)}`, kind: 'mod', mod: n, text: `${pad(n)} ${MODULES[n].title}${extra}` });
  const WEEKS: Week[] = [
    { n: 1, hours: 7, focus: 'Entorno y fundamentos', sessions: [M(1, 0, ': montar el entorno'), M(1, 1, ' + lab + reto'), M(1, 2, ' + lab + reto'), { id: 'w1:q', kind: 'quiz', text: 'Práctica por módulo (01 y 02) al terminar cada uno' }, { id: 'w1:f', kind: 'quiz', text: 'Empezar las Flashcards: 10 min al día' }] },
    { n: 2, hours: 8, focus: 'Workloads y scheduling', sessions: [M(2, 3, ' + lab + reto'), M(2, 4, ' + lab + reto'), { id: 'w2:l', kind: 'lab', text: 'Repetir el reto 03 sin mirar la solución' }, { id: 'w2:q', kind: 'quiz', text: 'Práctica por módulo + dominio Kubernetes Fundamentals' }] },
    { n: 3, hours: 8, focus: 'Seguridad y red', sessions: [M(3, 5, ' + lab'), M(3, 6, ' + lab'), M(3, 7, ' + lab'), { id: 'w3:q', kind: 'quiz', text: 'Práctica por módulo (05, 06, 07)' }, { id: 'w3:r', kind: 'quiz', text: 'Repaso del día el fin de semana' }] },
    { n: 4, hours: 8, focus: 'Storage, troubleshooting y observabilidad', sessions: [M(4, 8, ' + lab'), M(4, 9, ' + lab'), M(4, 11, ' + lab'), { id: 'w4:q', kind: 'quiz', text: 'Práctica del dominio Container Orchestration' }, { id: 'w4:s1', kind: 'exam', text: 'Primer simulacro completo, como diagnóstico (fin de semana)' }] },
    { n: 5, hours: 8, focus: 'Arquitectura y entrega', sessions: [{ id: 'w5:book', kind: 'note', text: 'Reservar la fecha del examen' }, M(5, 10, ' + lab'), M(5, 12, ' + lab, incluida la parte de Argo CD'), { id: 'w5:q', kind: 'quiz', text: 'Práctica de los dominios Application Delivery y Architecture' }, { id: 'w5:s2', kind: 'exam', text: 'Segundo simulacro (domingo)' }] },
    { n: 6, hours: 7, focus: 'Repaso y simulacros reales', sessions: [M(6, 13), { id: 'w6:l', kind: 'lab', text: 'Repetir 3-4 retos al azar desde cero (reset + lab + reto + check)' }, { id: 'w6:s3', kind: 'exam', text: 'Simulacro 3 en condiciones reales: 90 min, sin apuntes' }, { id: 'w6:s4', kind: 'exam', text: 'Simulacro 4 en condiciones reales' }, { id: 'w6:r', kind: 'quiz', text: 'Repaso del día y Flashcards entre medias' }, { id: 'w6:sum', kind: 'note', text: 'Leer los Resumen para repasar de los 13 módulos' }] },
  ];
  const TOTAL = WEEKS.reduce((a, w) => a + w.sessions.length, 0);
  const KIND: Record<Kind, string> = { mod: 'módulo', lab: 'lab', quiz: 'quiz', exam: 'simulacro', note: 'hito' };

  // Fecha de inicio: guardada en progress.plan como "inicio:YYYY-MM-DD"
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const stored = $derived(progress.plan.find((p) => p.startsWith('inicio:'))?.slice(7));
  const startIso = $derived(stored && /^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : iso(today));
  const start = $derived(parse(startIso));
  function setStart(v: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    for (const p of progress.plan.filter((p) => p.startsWith('inicio:'))) togglePlan(p);
    togglePlan(`inicio:${v}`);
  }

  const fDay = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' });
  const fLong = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const weekStart = (n: number) => addDays(start, 7 * (n - 1));
  const weekEnd = (n: number) => addDays(start, 7 * n - 1);
  const examDay = $derived(addDays(start, 42));
  const bookDay = $derived(weekStart(5));
  const currentWeek = $derived(WEEKS.find((w) => today >= weekStart(w.n) && today <= weekEnd(w.n))?.n);

  const checked = (id: string) => progress.plan.includes(id);
  const doneCount = $derived(WEEKS.reduce((a, w) => a + w.sessions.filter((s) => checked(s.id)).length, 0));
  const pct = $derived(Math.round((100 * doneCount) / TOTAL));
  const weekDone = (w: Week) => w.sessions.filter((s) => checked(s.id)).length;
  const modDone = (n: number) => progress.done.includes(pad(n));
  const modulesDone = $derived(MODULES.filter((m) => modDone(m.n)).length);
</script>

<div class="plan">
  <div class="controls">
    <label for="inicio">Fecha de inicio</label>
    <input id="inicio" type="date" value={startIso} onchange={(e) => setStart((e.currentTarget as HTMLInputElement).value)} />
    <span class="hint">Semana 1 empieza el {fDay.format(start)}. Reserva el examen el {fDay.format(bookDay)} y preséntate hacia el <strong>{fLong.format(examDay)}</strong>, si el panel Preparación real de la práctica está en verde.</span>
  </div>

  <div class="progress" aria-label="Avance del plan">
    <div class="bar"><i style={`width:${pct}%`}></i></div>
    <span class="mono">{doneCount} de {TOTAL} sesiones · {pct}%</span>
  </div>

  <ol class="weeks">
    {#each WEEKS as w (w.n)}
      <li class="week" class:cur={currentWeek === w.n} class:complete={weekDone(w) === w.sessions.length}>
        <header>
          <span class="wn">Semana {w.n}</span>
          <span class="dates">{fDay.format(weekStart(w.n))} a {fDay.format(weekEnd(w.n))}</span>
          <span class="focus">{w.focus} · {w.hours} h</span>
          {#if currentWeek === w.n}<span class="now">esta semana</span>{/if}
          <span class="count mono">{weekDone(w)}/{w.sessions.length}</span>
        </header>
        <ul>
          {#each w.sessions as s (s.id)}
            <li class="session kind-{s.kind}">
              <label>
                <input type="checkbox" checked={checked(s.id)} onchange={() => togglePlan(s.id)} />
                <span class="kind">{KIND[s.kind]}</span>
                <span class="text">{s.text}</span>
              </label>
              {#if s.kind === 'mod' && s.mod !== undefined}
                <a class="modlink" href={moduleUrl(s.mod)} title={`Abrir el módulo ${pad(s.mod)}`}>{modDone(s.mod) ? 'terminado' : 'abrir'}</a>
              {/if}
              {#if s.kind === 'exam' && progress.exams.length}
                <span class="meta mono">{progress.exams.length} simulacro{progress.exams.length === 1 ? '' : 's'} hecho{progress.exams.length === 1 ? '' : 's'} · mejor {Math.max(...progress.exams.map((e) => e.score))}%</span>
              {/if}
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ol>

  <div class="course">
    <span class="k">Progreso real del curso: <strong>{modulesDone} de {MODULES.length}</strong> módulos marcados como terminados</span>
    <div class="mods">
      {#each MODULES as m (m.n)}<a class="m mono" class:done={modDone(m.n)} href={moduleUrl(m.n)} title={m.title}>{pad(m.n)}</a>{/each}
    </div>
    <p class="hint">Un módulo se marca como terminado al final de su página. Las casillas de arriba son tu plan: tú decides cuándo marcar cada sesión.</p>
  </div>
</div>

<style>
  .plan { display: grid; gap: 12px; }
  .progress { display: grid; gap: 4px; }
  .progress .mono { font-size: 0.8rem; color: var(--ink-2); }
  .bar { height: 10px; border-radius: 5px; background: var(--panel-2); border: 1px solid var(--line-2); overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--ready); transition: width var(--dur) var(--ease); }
  .weeks { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .week { border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); padding: 8px 10px 10px; display: grid; gap: 6px; transition: border-color var(--dur), box-shadow var(--dur); }
  .week.cur { border-color: var(--helm); box-shadow: 0 0 0 3px var(--helm-2); }
  .week.complete { border-color: var(--ready); }
  .week header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; }
  .wn { font-weight: 600; }
  .dates { font-size: 0.82rem; color: var(--ink-2); }
  .focus { font-size: 0.82rem; color: var(--ink-3); }
  .now { font-size: 0.72rem; font-weight: 600; color: var(--helm-ink); background: var(--helm-2); padding: 1px 8px; border-radius: 999px; }
  .count { margin-left: auto; font-size: 0.78rem; color: var(--ink-3); }
  .week ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
  .session { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; font-size: 0.9rem; }
  .session label { display: inline-flex; align-items: center; gap: 8px; font-weight: 400; cursor: pointer; flex: 1 1 240px; min-width: 0; }
  .session input { width: 18px; height: 18px; margin: 0; accent-color: var(--ready); flex: none; }
  .session input:checked ~ .text { color: var(--ink-3); text-decoration: line-through; text-decoration-thickness: 1px; }
  .kind { font-size: 0.68rem; font-weight: 600; padding: 0 6px; border-radius: 4px; background: var(--panel); border: 1px solid var(--line-2); color: var(--ink-3); flex: none; min-width: 58px; text-align: center; }
  .kind-exam .kind { border-color: var(--wait); color: var(--wait); }
  .kind-mod .kind { border-color: var(--helm); color: var(--helm-ink); }
  .kind-note .kind { border-color: var(--ready); color: var(--ready); }
  .modlink { font-size: 0.78rem; }
  .meta { font-size: 0.74rem; color: var(--ink-3); }
  .course { display: grid; gap: 6px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-m); }
  .course .k { font-size: 0.9rem; }
  .mods { display: flex; flex-wrap: wrap; gap: 4px; }
  .m { font-size: 0.74rem; padding: 2px 7px; border-radius: 4px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink-2); text-decoration: none; }
  .m.done { border-color: var(--ready); background: var(--ready-2); color: var(--ready); font-weight: 600; }
</style>
