// Copia del progreso en un archivo: formato, validación de lo que se importa y cuándo avisar de que falta respaldo.
// Sin dependencias del navegador ni de Svelte, para poder probarlo con node (respaldo.test.mjs).
import type { Progress, QuizStat, ReadPos } from './progress.svelte';

export const APP = 'kcna-curso';
export const VERSION = 1;
export const MAX_BYTES = 2 * 1024 * 1024; // un progreso completo ocupa decenas de KB
const DAY = 86_400_000;

export interface Backup { app: typeof APP; v: number; exported: number; progress: Progress }

export const backupName = (t: number) => {
  const d = new Date(t);
  return `kcna-progreso-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
};

export const makeBackup = (p: Progress, t: number): string =>
  JSON.stringify({ app: APP, v: VERSION, exported: t, progress: p } satisfies Backup, null, 1);

// ---------- validación: de un archivo cualquiera solo pasa lo que tiene la forma del progreso ----------
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const strs = (x: unknown): string[] => (Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === 'string' && s.length <= 200))] : []);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** claves que podrían alterar el prototipo de un objeto al copiarlas */
const safeKey = (k: string) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype' && k.length <= 200;

function pair(x: unknown): [number, number] | undefined {
  return Array.isArray(x) && x.length === 2 && num(x[0]) && num(x[1]) ? [x[0], x[1]] : undefined;
}

function quizStat(x: unknown): QuizStat | undefined {
  if (!isObj(x) || !num(x.seen) || !num(x.ok) || typeof x.last !== 'boolean') return undefined;
  const s: QuizStat = { seen: x.seen, ok: x.ok, last: x.last };
  if (typeof x.first === 'boolean') s.first = x.first;
  if (num(x.at)) s.at = x.at;
  if (num(x.sureMiss)) s.sureMiss = x.sureMiss;
  if (num(x.box) && x.box >= 0 && x.box <= 5) s.box = Math.trunc(x.box);
  if (num(x.due)) s.due = x.due;
  if (isObj(x.conf)) {
    const conf: NonNullable<QuizStat['conf']> = {};
    for (const k of ['s', 'd', 'a'] as const) { const p = pair(x.conf[k]); if (p) conf[k] = p; }
    if (Object.keys(conf).length) s.conf = conf;
  }
  return s;
}

function readPos(x: unknown): ReadPos | undefined {
  if (!isObj(x) || !num(x.i) || !num(x.n) || !num(x.t)) return undefined;
  return { i: x.i, n: x.n, t: x.t, ...(typeof x.txt === 'string' ? { txt: x.txt.slice(0, 300) } : {}) };
}

function exam(x: unknown): Progress['exams'][number] | undefined {
  if (!isObj(x) || !num(x.date) || !num(x.score) || !num(x.ok) || !num(x.total) || !num(x.secs)) return undefined;
  const e: Progress['exams'][number] = { date: x.date, score: x.score, ok: x.ok, total: x.total, secs: x.secs };
  if (x.kind === 'final') e.kind = 'final';
  if (isObj(x.doms)) {
    const doms: Record<string, [number, number]> = {};
    for (const [k, v] of Object.entries(x.doms)) { const p = pair(v); if (p && safeKey(k)) doms[k] = p; }
    e.doms = doms;
  }
  return e;
}

/** Deja solo los campos conocidos y con el tipo correcto; lo demás se descarta */
export function sanitize(x: unknown): Progress {
  const o = isObj(x) ? x : {};
  const p: Progress = { steps: {}, done: strs(o.done), sims: strs(o.sims), quiz: {}, exams: [], known: strs(o.known), env: strs(o.env), plan: strs(o.plan), ready: strs(o.ready), reading: {}, retos: strs(o.retos), days: strs(o.days).filter((d) => ISO.test(d)).sort() };
  if (isObj(o.steps)) for (const [k, v] of Object.entries(o.steps)) if (safeKey(k)) p.steps[k] = strs(v);
  if (isObj(o.quiz)) for (const [k, v] of Object.entries(o.quiz)) { const s = quizStat(v); if (s && safeKey(k)) p.quiz[k] = s; }
  if (Array.isArray(o.exams)) p.exams = o.exams.map(exam).filter((e) => !!e).sort((a, b) => a.date - b.date);
  if (isObj(o.reading)) for (const [k, v] of Object.entries(o.reading)) {
    const last = isObj(v) ? readPos(v.last) : undefined, far = isObj(v) ? readPos(v.far) : undefined;
    if (last && far && safeKey(k)) p.reading[k] = { last, far };
  }
  if (isObj(o.exam) && typeof o.exam.date === 'string' && (o.exam.date === '' || ISO.test(o.exam.date)) && num(o.exam.t)) p.exam = { date: o.exam.date, t: o.exam.t };
  if (num(o.resetAt)) p.resetAt = o.resetAt;
  return p;
}

/** Lee el texto de un archivo de respaldo. Lanza un Error con un mensaje para el alumno si no sirve. */
export function parseBackup(text: string): { exported: number; progress: Progress } {
  if (text.length > MAX_BYTES) throw new Error('El archivo es demasiado grande para ser una copia del progreso.');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('El archivo no es una copia válida: no se pudo leer como JSON.'); }
  if (!isObj(raw) || raw.app !== APP || !isObj(raw.progress)) throw new Error('El archivo no es una copia del progreso de este curso.');
  if (!num(raw.v) || raw.v > VERSION) throw new Error('La copia viene de una versión más nueva del curso. Recarga la página e inténtalo de nuevo.');
  const progress = sanitize(raw.progress);
  if (isEmpty(progress)) throw new Error('La copia está vacía: no contiene progreso.');
  return { exported: num(raw.exported) ? raw.exported : 0, progress };
}

export const isEmpty = (p: Progress) =>
  !Object.keys(p.quiz).length && !Object.keys(p.steps).length && !Object.keys(p.reading).length && !p.done.length && !p.retos.length && !p.exams.length && !p.known.length && !p.days.length;

/** Resumen para mostrar antes de importar */
export function summary(p: Progress) {
  const keys = Object.keys(p.quiz);
  const commands = keys.filter((k) => k.startsWith('cmd:')).length;
  return { questions: keys.length - commands, commands, modules: p.done.length, exams: p.exams.length, days: p.days.length, lastDay: p.days.at(-1) ?? '' };
}

// ---------- aviso de que falta respaldo ----------
export const SNOOZE_DAYS = 7;    // tras «Ahora no», el aviso no vuelve en este tiempo
export const STALE_DAYS = 14;    // una copia en archivo más antigua que esto ya no cuenta como respaldo
export const MIN_DAYS = 3;       // días de estudio a partir de los cuales hay algo que perder

export type Aviso = null | 'activar' | 'codigo' | 'archivo';

/**
 * Qué aviso toca, si toca alguno:
 *  - 'codigo'  : la sincronización está activa pero el alumno no guardó su código (si pierde el dispositivo, pierde la llave)
 *  - 'activar' : hay progreso que perder, el sitio tiene sincronización y no está activada ni hay copia reciente en archivo
 *  - 'archivo' : lo mismo en una copia del sitio sin sincronización
 */
export function aviso(s: { days: number; done: number; syncAvailable: boolean; syncOn: boolean; codeSaved: boolean; exported: number; snoozed: number; now: number }): Aviso {
  if (s.now - s.snoozed < SNOOZE_DAYS * DAY) return null;
  if (s.days < MIN_DAYS && s.done < 1) return null;
  if (s.syncOn) return s.codeSaved ? null : 'codigo';
  if (s.exported && s.now - s.exported < STALE_DAYS * DAY) return null;
  return s.syncAvailable ? 'activar' : 'archivo';
}
