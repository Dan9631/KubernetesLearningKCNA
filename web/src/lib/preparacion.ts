// "Preparación real": cuándo el alumno está listo para reservar fecha, sin dejarse engañar por
// haber memorizado el banco. Se apoya en tres señales:
//   1. Cobertura: ha practicado todas las competencias del temario.
//   2. Primer intento: acierta las preguntas que ve por PRIMERA vez (no las repetidas).
//   3. Examen de graduación: 60 preguntas del banco reservado, que nunca salen en la práctica.
import preguntas from '../data/preguntas.json';
import { COMPETENCIES, canonical, type Competency } from './curriculum';
import type { Progress, QuizStat } from './progress.svelte';
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

  return {
    rows, coverOk,
    recent: { n: recent.length, ok: recentOk, pct: recentPct }, firstReady,
    final, retakes: finals.length - 1, weakDoms, finalOk,
    /** se recomienda gastar el examen de graduación cuando las dos primeras señales están en verde */
    finalAdvised: coverOk && firstReady,
    ready: coverOk && firstReady && finalOk,
  };
}
