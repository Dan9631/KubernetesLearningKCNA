// Progreso del alumno, guardado en localStorage de este navegador.
// Estado reactivo (Svelte 5 runes) compartido por todas las islas de una página.

export interface Progress {
  /** pasos de laboratorio marcados: { "04": ["3","5"] } */
  steps: Record<string, string[]>;
  /** módulos marcados como terminados */
  done: string[];
  /** simulaciones con las que ya se interactuó: ["04:scheduler"] */
  sims: string[];
  /** estadísticas del quiz por id de pregunta (first/at: resultado y fecha del primer intento) */
  quiz: Record<string, QuizStat>;
  /** simulacros entregados; kind 'final' = Examen de graduación (banco reservado) */
  exams: { date: number; score: number; ok: number; total: number; secs: number; kind?: 'final'; doms?: Record<string, [number, number]> }[];
  /** flashcards dominadas (término) */
  known: string[];
  /** checklist de entorno */
  env: string[];
  /** sesiones del plan de 6 semanas marcadas (módulo 13): ["w1:m01", "inicio:2026-10-26"] */
  plan: string[];
  /** checklist final "estoy listo" (módulo 13) */
  ready: string[];
  /** marcador de lectura por módulo: última posición y la más lejana (ver lib/lectura.ts) */
  reading: Record<string, { last: ReadPos; far: ReadPos }>;
}

/** Posición de lectura: índice del bloque (párrafo, encabezado o viñeta), total de bloques, fecha y el inicio del texto para reencontrarlo */
export interface ReadPos { i: number; n: number; t: number; txt?: string }

/** Confianza declarada al responder: Seguro, Dudo, Adivino */
export type Conf = 's' | 'd' | 'a';

export interface QuizStat {
  seen: number; ok: number; last: boolean;
  /** resultado y fecha del primer intento */
  first?: boolean; at?: number;
  /** aciertos y fallos por confianza declarada: { s: [ok, mal], ... } */
  conf?: Partial<Record<Conf, [number, number]>>;
  /** fecha de un fallo marcado como "Seguro", pendiente hasta acertarla de nuevo pasados 3 días */
  sureMiss?: number;
  /** repetición espaciada (cajas de Leitner): caja 0-5 y fecha del próximo repaso */
  box?: number; due?: number;
}

export const DAY = 86_400_000;
/** días hasta el próximo repaso según la caja */
export const INTERVALS = [0, 1, 3, 7, 16, 35];

const KEY = 'kcna.progress.v1';
const empty = (): Progress => ({ steps: {}, done: [], sims: [], quiz: {}, exams: [], known: [], env: [], plan: [], ready: [], reading: {} });

function load(): Progress {
  if (typeof localStorage === 'undefined') return empty();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

export const progress = $state<Progress>(load());

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* sin almacenamiento: la sesión sigue funcionando */ }
}

export function toggleStep(mod: string, step: string) {
  const list = progress.steps[mod] ?? [];
  progress.steps[mod] = list.includes(step) ? list.filter((s) => s !== step) : [...list, step];
  save();
}

export function toggleDone(mod: string) {
  progress.done = progress.done.includes(mod) ? progress.done.filter((m) => m !== mod) : [...progress.done, mod];
  save();
}

export function touchSim(id: string) {
  if (!progress.sims.includes(id)) { progress.sims = [...progress.sims, id]; save(); }
}

export function recordAnswer(qid: string, correct: boolean, conf?: Conf) {
  const now = Date.now();
  const s = progress.quiz[qid];
  const n: QuizStat = s
    ? { ...s, seen: s.seen + 1, ok: s.ok + (correct ? 1 : 0), last: correct }
    : { seen: 1, ok: correct ? 1 : 0, last: correct, first: correct, at: now };
  if (conf) {
    const c = { ...n.conf }, [ok, bad] = c[conf] ?? [0, 0];
    c[conf] = correct ? [ok + 1, bad] : [ok, bad + 1];
    n.conf = c;
  }
  // Un fallo con "Seguro" revela una idea equivocada: queda pendiente hasta acertarla con días de por medio
  if (!correct && conf === 's') n.sureMiss = now;
  else if (correct && n.sureMiss && now - n.sureMiss >= 3 * DAY) delete n.sureMiss;
  // Leitner: el fallo vuelve a la caja 1 (mañana); el acierto sube de caja, salvo si fue adivinando
  let box = n.box ?? (s ? (s.last ? 2 : 1) : 0);
  box = !correct ? 1 : conf === 'a' ? Math.max(1, box) : Math.min(box + 1, INTERVALS.length - 1);
  n.box = box;
  n.due = now + INTERVALS[box] * DAY;
  progress.quiz[qid] = n;
  save();
}

export function toggleKnown(term: string) {
  progress.known = progress.known.includes(term) ? progress.known.filter((t) => t !== term) : [...progress.known, term];
  save();
}

export function toggleEnv(id: string) {
  progress.env = progress.env.includes(id) ? progress.env.filter((t) => t !== id) : [...progress.env, id];
  save();
}

export function togglePlan(id: string) {
  progress.plan = progress.plan.includes(id) ? progress.plan.filter((t) => t !== id) : [...progress.plan, id];
  save();
}

export function toggleReady(id: string) {
  progress.ready = progress.ready.includes(id) ? progress.ready.filter((t) => t !== id) : [...progress.ready, id];
  save();
}

export function resetProgress() {
  Object.assign(progress, empty());
  save();
}
