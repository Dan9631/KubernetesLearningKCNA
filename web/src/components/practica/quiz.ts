// Utilidades compartidas por la práctica, el simulacro y la revisión.
import { DOMAINS, type DomainKey } from '../../lib/modules';
import type { Conf } from '../../lib/progress.svelte';

export interface Q { id: string; domain: string; topic: string; module: number; q: string; options: string[]; answer: number[]; explanation: string; source?: string[]; holdout?: boolean }

/** Pregunta preparada para una ronda: opciones barajadas y respuesta remapeada. */
export interface Item { q: Q; options: string[]; answer: number[]; picked: number[]; flagged: boolean; done: boolean; conf: Conf }

export const EXAM_SECONDS = 90 * 60;
export const PASS = 75;
/** Dominios del examen, en el orden oficial (sin 'base'). */
export const EXAM_DOMAINS = (Object.keys(DOMAINS) as DomainKey[]).filter((d) => DOMAINS[d].exam > 0);

export function shuffle<T>(a: T[]): T[] {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function prep(q: Q): Item {
  const order = shuffle(q.options.map((_, i) => i));
  return {
    q,
    options: order.map((i) => q.options[i]),
    answer: order.map((orig, idx) => (q.answer.includes(orig) ? idx : -1)).filter((i) => i >= 0),
    picked: [],
    flagged: false,
    done: false,
    conf: 'd',
  };
}

export const isCorrect = (it: Item) => it.picked.length === it.answer.length && it.picked.every((p) => it.answer.includes(p));

/** Alterna una opción: una sola en preguntas simples, hasta N en las de varias respuestas. */
export function togglePick(it: Item, k: number) {
  if (it.answer.length > 1) {
    it.picked = it.picked.includes(k) ? it.picked.filter((x) => x !== k) : [...it.picked, k].slice(-it.answer.length);
  } else {
    it.picked = [k];
  }
}

export const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const dateFmt = () => new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });
export const fmtDate = (t: number) => dateFmt().format(new Date(t));
