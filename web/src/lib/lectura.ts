// Marcador de lectura, como en Kindle: por módulo se guarda la última posición y la más lejana.
// La posición es un bloque del texto (párrafo, encabezado o viñeta), no píxeles: así sirve en
// cualquier ancho de pantalla. El enlace "?r=" lleva las posiciones a otro dispositivo (QR).
import { progress, save, type ReadPos } from './progress.svelte';
import { url } from './modules';

/** Sitio publicado: un enlace a localhost no abre en el teléfono */
export const PUBLIC_SITE = 'https://dan9631.github.io/KubernetesLearningKCNA';

/** Bloques legibles del módulo (los mismos que lee "Escuchar este módulo"): para antes de "Fuentes oficiales" */
export function bloques(prose: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const el of prose.children as HTMLCollectionOf<HTMLElement>) {
    if (el.tagName === 'H2' && /fuentes oficiales/i.test(el.textContent ?? '')) break;
    if (/^(H[1-4]|P|BLOCKQUOTE)$/.test(el.tagName)) out.push(el);
    else if (/^(UL|OL)$/.test(el.tagName)) out.push(...([...el.children] as HTMLElement[]));
  }
  return out.filter((b) => b.getClientRects().length && (b.textContent ?? '').trim()); // sin ocultos ni vacíos
}

/** Línea de lectura: el tercio superior de la pantalla */
export const LINE = 0.33;

/** Bloque que se está leyendo: el último cuyo inicio ya pasó por la línea de lectura (-1 si aún no empieza el texto) */
export function currentBlock(blocks: HTMLElement[]): number {
  const line = innerHeight * LINE;
  let cur = -1;
  for (let k = 0; k < blocks.length; k++) { if (blocks[k].getBoundingClientRect().top <= line) cur = k; else break; }
  return cur;
}

// El botón flotante del módulo pide acciones a otras islas con eventos de ventana
/** detail: { from: número de bloque } → "Escuchar este módulo" desde ese bloque */
export const EV_ESCUCHAR = 'kcna:escuchar';
/** detail: 'last' | 'far' → el marcador lleva a la última posición o a la más lejana */
export const EV_IR = 'kcna:ir';

const snippet = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
export const pctOf = (p: ReadPos) => Math.min(100, Math.round((100 * (p.i + 1)) / Math.max(1, p.n)));

export function saveReading(mod: string, blocks: HTMLElement[], i: number) {
  const now = Date.now();
  const pos: ReadPos = { i, n: blocks.length, t: now, txt: snippet(blocks[i]) };
  const cur = progress.reading[mod];
  const far = !cur || i >= cur.far.i ? pos : cur.far;
  if (cur && cur.last.i === i && far === cur.far) return; // sin cambios: no reescribir el almacenamiento
  progress.reading[mod] = { last: pos, far };
  save();
}

/** Índice del bloque guardado; si el texto cambió desde entonces, lo busca por su inicio */
export function findBlock(blocks: HTMLElement[], pos: ReadPos): number {
  const i = Math.min(pos.i, blocks.length - 1);
  if (!pos.txt || snippet(blocks[i]) === pos.txt) return i;
  const k = blocks.findIndex((b) => snippet(b) === pos.txt);
  return k >= 0 ? k : i;
}

/** Encabezado bajo el que está un bloque, para decir "te quedaste en «...»" */
export function sectionOf(blocks: HTMLElement[], i: number): string {
  for (let k = i; k >= 0; k--) if (/^H[23]$/.test(blocks[k].tagName)) return (blocks[k].textContent ?? '').trim();
  return '';
}

/** El módulo leído más recientemente */
export function lastRead(): { mod: string; last: ReadPos; far: ReadPos } | null {
  const e = Object.entries(progress.reading).sort((a, b) => b[1].last.t - a[1].last.t)[0];
  return e ? { mod: e[0], ...e[1] } : null;
}

// ---------- llevar la lectura a otro dispositivo ----------
// r=06.37.52.180_04.10.120.130 → módulo.última.más-lejana.total, el más reciente primero

export function encodeReading(): string {
  return Object.entries(progress.reading)
    .sort((a, b) => b[1].last.t - a[1].last.t)
    .map(([m, r]) => [m, r.last.i, r.far.i, r.last.n].join('.'))
    .join('_');
}

/** Enlace al módulo leído más recientemente con todas las posiciones; en localhost apunta al sitio publicado */
export function shareUrl(): { href: string; local: boolean } | null {
  const r = encodeReading();
  const top = lastRead();
  if (!r || !top) return null;
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  const path = local ? `${PUBLIC_SITE}/modulos/${top.mod}/` : new URL(url(`/modulos/${top.mod}/`), location.origin).href;
  return { href: `${path}?r=${r}`, local };
}

/** Une las posiciones que llegan por el enlace: la última es la del otro dispositivo, la más lejana gana la mayor */
export function importReading(r: string): string | null {
  const now = Date.now();
  let first: string | null = null;
  r.split('_').forEach((part, k) => {
    const [m, last, far, n] = part.split('.');
    if (!/^\d{2}$/.test(m) || ![last, far, n].every((x) => /^\d+$/.test(x))) return;
    const L: ReadPos = { i: +last, n: +n, t: now - k }; // conserva el orden: el primero es el más reciente
    const F: ReadPos = { i: Math.max(+far, +last), n: +n, t: now - k };
    const cur = progress.reading[m];
    progress.reading[m] = { last: L, far: cur && cur.far.i > F.i ? cur.far : F };
    first ??= m;
  });
  if (first) save();
  return first;
}

