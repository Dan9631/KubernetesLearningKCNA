// "Preparación real": cuándo el alumno está listo para reservar fecha, sin dejarse engañar por
// haber memorizado el banco. Se apoya en tres señales:
//   1. Cobertura: ha practicado todas las competencias del temario.
//   2. Primer intento: acierta las preguntas que ve por PRIMERA vez (no las repetidas).
//   3. Examen de graduación: 60 preguntas del banco reservado, que nunca salen en la práctica.
// Además: fallos con "Seguro" pendientes (ideas equivocadas) y repetición espaciada ("Repaso del día").
import preguntas from '../data/preguntas.json';
import { COMPETENCIES, canonical, type Competency } from './curriculum';
import { MODULES, url } from './modules';
import { DAY, type Conf, type Progress, type QuizStat } from './progress.svelte';
import type { Q } from '../components/practica/quiz';

export const READY = {
  /** preguntas distintas vistas por competencia (o todas, si tiene menos) */
  cover: 8,
  /** últimas preguntas nuevas sobre las que se mide el primer intento */
  recent: 40,
  firstPass: 75,
  /** con 60 preguntas el error estándar ronda 5,6 puntos: 80 % deja margen sobre el 75 % */
  finalPass: 80,
  domainPass: 70,
};

const QS = preguntas as Q[];
export const HOLDOUT = QS.filter((q) => q.holdout);
export const PRACTICE = QS.filter((q) => !q.holdout);

/** Resultado del primer intento. Para estadísticas antiguas (sin `first`) se deduce cuando es seguro. */
export function firstOf(s: QuizStat | undefined): boolean | undefined {
  if (!s) return undefined;
  if (s.first !== undefined) return s.first;
  if (s.seen === 1 || s.ok === s.seen || s.ok === 0) return s.ok > 0;
  return undefined;
}

/** Fin del día local: lo que vence hoy, aunque sea más tarde, ya está pendiente */
export function endOfToday(now = Date.now()) { const d = new Date(now); d.setHours(23, 59, 59, 999); return d.getTime(); }

/** Pendiente de repaso hoy. Las estadísticas antiguas sin fecha solo cuentan si el último intento falló. */
export function isDue(s: QuizStat | undefined, eod = endOfToday()): boolean {
  if (!s) return false;
  return s.due !== undefined ? s.due <= eod : !s.last;
}

/** Orden de la práctica: fallos con seguridad, repasos vencidos, nunca vistas y, por último, las menos dominadas */
export function priority(s: QuizStat | undefined, eod = endOfToday()): number {
  if (!s) return 2;
  if (isDue(s, eod)) return s.sureMiss ? 4 : 3;
  return 1 - s.ok / (s.seen + 1);
}

/** Cola del "Repaso del día": primero los fallos con seguridad y después lo que venció hace más tiempo */
export function dueToday(p: Progress) {
  const eod = endOfToday();
  return PRACTICE.filter((q) => isDue(p.quiz[q.id], eod))
    .sort((a, b) => Number(!!p.quiz[b.id].sureMiss) - Number(!!p.quiz[a.id].sureMiss) || (p.quiz[a.id].due ?? 0) - (p.quiz[b.id].due ?? 0));
}

export const CONF_LABEL: Record<Conf, string> = { s: 'Seguro', d: 'Dudo', a: 'Adivino' };

export interface CompRow { c: Competency; total: number; seen: number; need: number; firstOk: number; firstN: number }

export function readiness(p: Progress) {
  const rows: CompRow[] = COMPETENCIES.map((c) => {
    const qs = PRACTICE.filter((q) => canonical(q.topic) === c.name);
    let seen = 0, firstOk = 0, firstN = 0;
    for (const q of qs) {
      const s = p.quiz[q.id];
      if (!s) continue;
      seen++;
      const f = firstOf(s);
      if (f !== undefined) { firstN++; if (f) firstOk++; }
    }
    return { c, total: qs.length, seen, need: Math.min(READY.cover, qs.length), firstOk, firstN };
  });
  const coverOk = rows.every((r) => r.seen >= r.need);

  // Las últimas preguntas nuevas reflejan lo que sabes hoy; las estadísticas antiguas sin fecha cuentan como las más viejas
  const recent = PRACTICE.map((q) => ({ s: p.quiz[q.id], f: firstOf(p.quiz[q.id]) }))
    .filter((x) => x.f !== undefined)
    .sort((a, b) => (b.s?.at ?? 0) - (a.s?.at ?? 0))
    .slice(0, READY.recent);
  const recentOk = recent.filter((x) => x.f).length;
  const recentPct = recent.length ? Math.round((100 * recentOk) / recent.length) : 0;
  const firstReady = recent.length >= READY.recent && recentPct >= READY.firstPass;

  // Solo cuenta el PRIMER examen de graduación: al repetirlo ya conoces sus preguntas
  const finals = p.exams.filter((e) => e.kind === 'final');
  const final = finals[0];
  const weakDoms = final?.doms ? Object.entries(final.doms).filter(([, [ok, n]]) => n && (100 * ok) / n < READY.domainPass).map(([d]) => d) : [];
  const finalOk = !!final && final.score >= READY.finalPass && weakDoms.length === 0;

  // Calibración: cuánto aciertas según lo seguro que dijiste estar
  const calib: Record<Conf, { ok: number; n: number }> = { s: { ok: 0, n: 0 }, d: { ok: 0, n: 0 }, a: { ok: 0, n: 0 } };
  for (const s of Object.values(p.quiz)) for (const k of ['s', 'd', 'a'] as Conf[]) { const c = s.conf?.[k]; if (c) { calib[k].ok += c[0]; calib[k].n += c[0] + c[1]; } }
  const sureMisses = PRACTICE.filter((q) => p.quiz[q.id]?.sureMiss);

  return {
    rows, coverOk, calib, sureMisses,
    recent: { n: recent.length, ok: recentOk, pct: recentPct }, firstReady,
    final, retakes: finals.length - 1, weakDoms, finalOk,
    /** se recomienda gastar el examen de graduación cuando las dos primeras señales están en verde */
    finalAdvised: coverOk && firstReady,
    ready: coverOk && firstReady && finalOk && sureMisses.length === 0,
  };
}

/** Módulo del curso que enseña una competencia (para enlazar "practica X") */
export function moduleFor(c: Competency) {
  return MODULES.find((m) => m.domain !== 'base' && m.topics.map(canonical).includes(c.name));
}

/** Siguiente paso según las señales de preparación, con su acción (portada "Hoy" y panel de la práctica) */
export function nextStep(r: ReturnType<typeof readiness>): { text: string; href: string; label: string } {
  const practica = url('/practica');
  if (r.ready) return { text: 'Listo para reservar fecha. Mantén el ritmo con simulacros hasta el día del examen.', href: url('/practica?modo=simulacro'), label: 'Hacer un simulacro' };
  if (!r.coverOk) {
    // la competencia con menos preguntas vistas respecto a lo que pide
    const gap = r.rows.filter((x) => x.seen < x.need).sort((a, b) => a.seen / a.need - b.seen / b.need)[0];
    const m = moduleFor(gap.c);
    return { text: `Siguiente paso: practica ${gap.c.name} (${gap.seen} de ${gap.need} preguntas vistas).`, href: m ? url(`/practica?modo=practica&modulo=${m.n}`) : url('/practica?modo=practica'), label: 'Practicar' };
  }
  if (!r.firstReady) return { text: 'Siguiente paso: sube tu acierto en preguntas nuevas antes de gastar el examen de graduación.', href: url('/practica?modo=practica'), label: 'Practicar' };
  if (!r.final) return { text: 'Siguiente paso: haz el examen de graduación.', href: practica, label: 'Ir a la práctica' };
  if (r.finalOk && r.sureMisses.length) return { text: 'Siguiente paso: corrige tus fallos con seguridad en el Repaso del día.', href: url('/practica?modo=repaso'), label: 'Repasar' };
  return { text: 'Siguiente paso: repasa los dominios flojos del examen de graduación; tu estimación no mejorará repitiéndolo.', href: practica, label: 'Ir a la práctica' };
}

/** Estado de memoria por competencia según la caja de Leitner: frágil (caja 1, vuelve mañana),
 *  en proceso (cajas 2-3) y firme (cajas 4-5, repasos a 16 y 35 días). Las estadísticas antiguas
 *  sin caja se clasifican como lo haría recordAnswer. */
export function memoria(p: Progress) {
  const eod = endOfToday();
  return COMPETENCIES.map((c) => {
    const qs = PRACTICE.filter((q) => canonical(q.topic) === c.name);
    let fragil = 0, proceso = 0, firme = 0, due = 0;
    for (const q of qs) {
      const s = p.quiz[q.id];
      if (!s) continue;
      const box = s.box ?? (s.last ? 2 : 1);
      if (box >= 4) firme++; else if (box >= 2) proceso++; else fragil++;
      if (isDue(s, eod)) due++;
    }
    return { c, total: qs.length, fragil, proceso, firme, due, module: moduleFor(c) };
  });
}

/** Preguntas que vencen mañana (para "mañana vencen N") */
export function dueTomorrow(p: Progress) {
  const eod = endOfToday();
  return PRACTICE.filter((q) => { const d = p.quiz[q.id]?.due; return d !== undefined && d > eod && d <= eod + DAY; }).length;
}
