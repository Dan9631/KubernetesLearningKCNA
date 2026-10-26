// Progreso del alumno, guardado en localStorage de este navegador.
// Estado reactivo (Svelte 5 runes) compartido por todas las islas de una página.

export interface Progress {
  /** pasos de laboratorio marcados: { "04": ["3","5"] } */
  steps: Record<string, string[]>;
  /** módulos marcados como terminados */
  done: string[];
  /** simulaciones con las que ya se interactuó: ["04:scheduler"] */
  sims: string[];
  /** estadísticas del quiz por id de pregunta */
  quiz: Record<string, { seen: number; ok: number; last: boolean }>;
  /** simulacros entregados */
  exams: { date: number; score: number; ok: number; total: number; secs: number }[];
  /** flashcards dominadas (término) */
  known: string[];
  /** checklist de entorno */
  env: string[];
  /** sesiones del plan de 6 semanas marcadas (módulo 13): ["w1:m01", "inicio:2026-10-26"] */
  plan: string[];
  /** checklist final "estoy listo" (módulo 13) */
  ready: string[];
}

const KEY = 'kcna.progress.v1';
const empty = (): Progress => ({ steps: {}, done: [], sims: [], quiz: {}, exams: [], known: [], env: [], plan: [], ready: [] });

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

export function recordAnswer(qid: string, correct: boolean) {
  const s = progress.quiz[qid] ?? { seen: 0, ok: 0, last: false };
  progress.quiz[qid] = { seen: s.seen + 1, ok: s.ok + (correct ? 1 : 0), last: correct };
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
