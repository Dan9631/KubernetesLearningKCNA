// Sincronización opcional del progreso con el Worker de Cloudflare (sync/). Ver docs/SINCRONIZACION.md.
// Del código de sincronización salen, con HKDF, el id del registro, el token y la clave AES-GCM;
// el progreso se comprime y se cifra aquí, así que el servidor solo guarda bloques ilegibles.
import { progress, save, onSave, emptyProgress, KEEP_DAYS, type Progress, type QuizStat } from './progress.svelte';
import { url } from './modules';
import { PUBLIC_SITE } from './lectura';

export const SYNC_URL = (import.meta.env.PUBLIC_SYNC_URL ?? '').replace(/\/$/, '');
/** El sitio se publicó con un Worker configurado */
export const syncAvailable = !!SYNC_URL;

const KEY = 'kcna.sync.v1';
const PUSH_DELAY = 30_000; // tras practicar, sube como mucho cada 30 s

interface Stored { code: string; rev: number; last: number; saved: boolean } // saved: el alumno ya copió, descargó o imprimió el código
function load(): Stored {
  const def = { code: '', rev: 0, last: 0, saved: false };
  if (typeof localStorage === 'undefined') return def;
  try { return { ...def, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return def; }
}

export const sync = $state({ ...load(), status: 'idle' as 'idle' | 'syncing' | 'error', error: '' });
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ code: sync.code, rev: sync.rev, last: sync.last, saved: sync.saved })); } catch { /* sin almacenamiento */ }
}
export function markSaved() { sync.saved = true; persist(); }

// ---------- código de sincronización: 128 bits en base32 de Crockford (sin I, L, O, U) ----------
const ALPH = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bits = 0, val = 0, out = '';
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += ALPH[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) out += ALPH[(val << (5 - bits)) & 31];
  return out; // 26 caracteres
}
/** Acepta minúsculas, guiones y espacios, y confusiones típicas (O→0, I/L→1). Devuelve '' si no es válido. */
export function normalizeCode(input: string): string {
  const c = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(c) ? c : '';
}
export const prettyCode = (c: string) => c.replace(/(.{4})(?=.)/g, '$1-');

function codeBytes(code: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(17);
  let bits = 0, val = 0, k = 0;
  for (const ch of code) { val = (val << 5) | ALPH.indexOf(ch); bits += 5; if (bits >= 8) { out[k++] = (val >>> (bits - 8)) & 255; bits -= 8; } }
  return out.slice(0, 16);
}

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (b: ArrayBuffer | Uint8Array) => { let s = ''; for (const x of new Uint8Array(b)) s += String.fromCharCode(x); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(code: string) {
  const base = await crypto.subtle.importKey('raw', codeBytes(code), 'HKDF', false, ['deriveBits', 'deriveKey']);
  const params = (info: string) => ({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('kcna-sync-v1'), info: enc.encode(info) });
  const id = hex(await crypto.subtle.deriveBits(params('id'), base, 256));
  const token = hex(await crypto.subtle.deriveBits(params('token'), base, 256));
  const key = await crypto.subtle.deriveKey(params('enc'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { id, token, key };
}

async function pipe(data: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer());
}
async function encrypt(key: CryptoKey, p: Progress) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const zipped = await pipe(enc.encode(JSON.stringify(p)), new CompressionStream('gzip'));
  return { iv: b64(iv), data: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, zipped)) };
}
async function decrypt(key: CryptoKey, iv: string, data: string): Promise<Progress> {
  const zipped = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(data));
  return { ...emptyProgress(), ...JSON.parse(new TextDecoder().decode(await pipe(new Uint8Array(zipped), new DecompressionStream('gzip')))) };
}

// ---------- combinar dos progresos (ver la tabla en docs/SINCRONIZACION.md) ----------
const uni = (a: string[] = [], b: string[] = []) => [...new Set([...a, ...b])];
const better = (a?: QuizStat, b?: QuizStat) => (!a ? b! : !b ? a : b.seen !== a.seen ? (b.seen > a.seen ? b : a) : (b.due ?? 0) > (a.due ?? 0) ? b : a);

export function merge(a: Progress, b: Progress): Progress {
  // un "Borrar mi progreso" en cualquier dispositivo gana: se descarta el lado anterior al borrado
  const resetAt = Math.max(a.resetAt ?? 0, b.resetAt ?? 0);
  if ((a.resetAt ?? 0) < resetAt) a = emptyProgress();
  if ((b.resetAt ?? 0) < resetAt) b = emptyProgress();
  const out: Progress = { ...emptyProgress(), ...(resetAt ? { resetAt } : {}) };
  for (const m of new Set([...Object.keys(a.steps), ...Object.keys(b.steps)])) out.steps[m] = uni(a.steps[m], b.steps[m]);
  for (const id of new Set([...Object.keys(a.quiz), ...Object.keys(b.quiz)])) out.quiz[id] = better(a.quiz[id], b.quiz[id]);
  const ex = new Map([...a.exams, ...b.exams].map((e) => [`${e.date}:${e.kind ?? ''}`, e]));
  out.exams = [...ex.values()].sort((x, y) => x.date - y.date);
  for (const k of ['done', 'sims', 'known', 'env', 'plan', 'ready', 'retos'] as const) out[k] = uni(a[k], b[k]);
  out.days = uni(a.days, b.days).sort().slice(-KEEP_DAYS);
  if (a.exam || b.exam) out.exam = (b.exam?.t ?? 0) > (a.exam?.t ?? 0) ? b.exam : a.exam;
  for (const m of new Set([...Object.keys(a.reading), ...Object.keys(b.reading)])) {
    const x = a.reading[m], y = b.reading[m];
    out.reading[m] = !x ? y : !y ? x : { last: y.last.t > x.last.t ? y.last : x.last, far: y.far.i > x.far.i ? y.far : x.far };
  }
  return out;
}

// ---------- ciclo de sincronización ----------
let applying = false; // al aplicar lo que llega no se programa otra subida
let running: Promise<void> | null = null;

function apply(p: Progress) {
  applying = true;
  Object.assign(progress, p);
  save();
  applying = false;
}

async function api(method: string, id: string, token: string, body?: unknown) {
  return fetch(`${SYNC_URL}/v1/sync/${id}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    keepalive: method === 'PUT',
  });
}

/** Descarga, combina con lo local y sube el resultado; repite si otro dispositivo escribió en medio */
export function syncNow(): Promise<void> {
  if (!syncAvailable || !sync.code) return Promise.resolve();
  running ??= (async () => {
    sync.status = 'syncing'; sync.error = '';
    try {
      const { id, token, key } = await derive(sync.code);
      for (let attempt = 0; attempt < 4; attempt++) {
        const res = await api('GET', id, token);
        let rev = 0;
        if (res.status === 200) {
          const r = await res.json();
          rev = r.rev;
          apply(merge($state.snapshot(progress) as Progress, await decrypt(key, r.iv, r.data)));
        } else if (res.status !== 404) throw new Error(res.status === 401 ? 'El código no coincide con el registro del servidor.' : `El servidor respondió ${res.status}.`);
        const put = await api('PUT', id, token, { rev, ...(await encrypt(key, $state.snapshot(progress) as Progress)) });
        if (put.status === 409) continue;
        if (!put.ok) throw new Error(put.status === 413 ? 'El progreso supera el tamaño permitido.' : `El servidor respondió ${put.status}.`);
        sync.rev = (await put.json()).rev;
        sync.last = Date.now();
        persist();
        sync.status = 'idle';
        return;
      }
      throw new Error('Otro dispositivo está sincronizando a la vez; se reintentará.');
    } catch (e) {
      sync.status = 'error';
      sync.error = e instanceof TypeError ? 'Sin conexión con el servicio de sincronización (¿red o proxy?). Tu progreso sigue guardado en este navegador.' : (e as Error).message;
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Activa la sincronización en este dispositivo con un código nuevo o uno existente (saved: ya lo tiene guardado en otro lado) */
export async function connect(code: string, saved = false) {
  sync.code = code; sync.rev = 0; sync.last = 0; sync.saved = saved;
  persist();
  await syncNow();
}

/** Olvida el código en este dispositivo (los datos del servidor siguen ahí) */
export function disconnect() {
  sync.code = ''; sync.rev = 0; sync.last = 0; sync.saved = false; sync.status = 'idle'; sync.error = '';
  persist();
}

/** Borra el registro del servidor. keep=true lo vuelve a crear vacío con el mismo código (tras "Borrar mi progreso") */
export async function deleteRemote(keep = false) {
  if (!syncAvailable || !sync.code) return;
  const { id, token } = await derive(sync.code);
  const res = await api('DELETE', id, token);
  if (!res.ok) throw new Error(`El servidor respondió ${res.status}.`);
  if (keep) { sync.rev = 0; persist(); await syncNow(); } else disconnect();
}

/** Enlace para conectar otro dispositivo: el código va en el fragmento (#), que el navegador nunca envía al servidor */
export function connectUrl(code: string) {
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  const page = local ? `${PUBLIC_SITE}/sincronizar/` : new URL(url('/sincronizar/'), location.origin).href;
  return { href: `${page}#c=${code}`, local };
}

// Sincronización automática: al abrir la página, tras practicar (con espera) y al salir
if (typeof window !== 'undefined' && syncAvailable) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  onSave(() => {
    if (applying || !sync.code) return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, PUSH_DELAY);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer) { clearTimeout(timer); timer = undefined; syncNow(); }
  });
  if (sync.code) setTimeout(syncNow, 1500);
}
