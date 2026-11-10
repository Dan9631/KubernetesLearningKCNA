// Respaldo del progreso en este navegador: exportar e importar un archivo, recordar si ya hay copia
// y pedir al navegador que no borre los datos. El formato y la validación están en respaldo.ts.
import { progress, save, emptyProgress, type Progress } from './progress.svelte';
import { sync, syncNow, merge } from './sync.svelte';
import { makeBackup, backupName } from './respaldo';

const KEY = 'kcna.respaldo.v1';
interface Stored { exported: number; snoozed: number } // fechas de la última copia en archivo y del último «Ahora no»
function load(): Stored {
  const def = { exported: 0, snoozed: 0 };
  if (typeof localStorage === 'undefined') return def;
  try { return { ...def, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return def; }
}
export const respaldo = $state({ ...load(), persisted: null as boolean | null });
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ exported: respaldo.exported, snoozed: respaldo.snoozed })); } catch { /* sin almacenamiento */ }
}

export function snooze() { respaldo.snoozed = Date.now(); persist(); }

/** Descarga el progreso como archivo JSON */
export function exportar() {
  const now = Date.now();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([makeBackup($state.snapshot(progress) as Progress, now)], { type: 'application/json' }));
  a.download = backupName(now);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  respaldo.exported = now;
  persist();
  pedirPersistencia();
}

/**
 * Aplica una copia ya validada.
 *  - 'combinar'   : se une con el progreso actual con las mismas reglas que la sincronización. Las fechas de borrado
 *                   se igualan antes, para que un «Borrar mi progreso» anterior no descarte uno de los dos lados.
 *  - 'reemplazar' : el progreso actual se sustituye por la copia. Se marca como un borrado reciente para que, con la
 *                   sincronización activa, lo guardado en el servidor no vuelva a mezclarse.
 */
export function importar(copia: Progress, modo: 'combinar' | 'reemplazar') {
  const local = $state.snapshot(progress) as Progress;
  let out: Progress;
  if (modo === 'combinar') {
    const resetAt = Math.max(local.resetAt ?? 0, copia.resetAt ?? 0);
    const eq = (p: Progress): Progress => (resetAt ? { ...p, resetAt } : p);
    out = merge(eq(local), eq(copia));
  } else {
    out = { ...emptyProgress(), ...copia, resetAt: Date.now() };
  }
  Object.assign(progress, emptyProgress(), { exam: undefined, resetAt: undefined }, out);
  save();
  if (sync.code) syncNow();
}

// ---------- almacenamiento persistente ----------
// Sin él, el navegador puede borrar los datos del sitio si falta espacio o si pasa tiempo sin visitarlo.
const storage = () => (typeof navigator !== 'undefined' && typeof navigator.storage?.persist === 'function' ? navigator.storage : null);

export async function comprobarPersistencia() {
  const s = storage();
  respaldo.persisted = s ? await s.persisted().catch(() => false) : null;
}

/** Pide al navegador que conserve los datos. Algunos navegadores muestran un permiso: llamar tras una acción del alumno. */
export async function pedirPersistencia() {
  const s = storage();
  if (!s) return;
  respaldo.persisted = await s.persist().catch(() => false);
}

/** Los navegadores basados en Chromium conceden o niegan sin preguntar: ahí se puede pedir al cargar */
export const pideSinPreguntar = () => typeof navigator !== 'undefined' && 'userAgentData' in navigator;
