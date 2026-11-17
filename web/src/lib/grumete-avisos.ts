/**
 * Canal entre el curso y Grumete, el compañero que vive en la esquina de cada página (GrumeteCompanero.svelte).
 * Quien detecta algo (una respuesta, un reto, un módulo) llama a avisarGrumete y no necesita saber si Grumete
 * está en la página: es un evento de ventana. Así el curso no depende de la mascota y se puede quitar sin tocarlo.
 */
/** paso: casilla del laboratorio marcada; dominada: flashcard marcada como dominada. Son acuses pequeños (asiente).
 *  lote: un examen entregado, con su mínimo real para aprobar (el compañero no adivina el umbral).
 *  reto: un reto superado, con su clase (cada uno tiene su frase). */
import { untrack } from 'svelte';
import { alDia, type DatosHoy, type Memoria } from './grumete-director';

export type ClaseReto = 'diagrama' | 'terminal' | 'diagnostico' | 'examen' | 'otro';
export type Aviso =
  | 'acierto' | 'fallo' | 'modulo' | 'paso' | 'dominada'
  /** una respuesta del banco con la confianza declarada (Seguro / Dudo / Adivino), si la hubo */
  | { tipo: 'respuesta'; ok: boolean; conf?: 's' | 'd' | 'a' }
  | { tipo: 'lote'; ok: number; total: number; minimo: number }
  | { tipo: 'reto'; clase: ClaseReto };
export const EV_AVISO = 'grumete:aviso';

/** La portada «Hoy» deja aquí lo que ya calcula (repasos, fallos con seguridad, siguiente paso) para el parte del
 *  día: así el compañero no carga el banco de preguntas en cada página. Se guarda en window porque las islas se
 *  hidratan en cualquier orden. */
export const EV_HOY = 'grumete:hoy';
export function contextoHoy(datos: DatosHoy) {
  if (typeof window === 'undefined') return;
  (window as unknown as { __grumeteHoy?: DatosHoy }).__grumeteHoy = datos;
  untrack(() => dispatchEvent(new CustomEvent(EV_HOY)));
}
export const leerHoy = (): DatosHoy | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { __grumeteHoy?: DatosHoy }).__grumeteHoy);

/** Memoria del director (qué dijo hoy y cuántas frases por iniciativa propia): por dispositivo, fuera de Progress
 *  para no viajar con la sincronización. */
const KEY_MEMORIA = 'kcna.grumete.memoria';
export function leerMemoria(hoy: string): Memoria {
  try { return alDia(JSON.parse(localStorage.getItem(KEY_MEMORIA) ?? 'null'), hoy); } catch { return alDia(null, hoy); }
}
export function guardarMemoria(m: Memoria) {
  try { localStorage.setItem(KEY_MEMORIA, JSON.stringify(m)); } catch { /* sin almacenamiento */ }
}

/** La clase de un reto sale del prefijo de su id (ver addReto en progress.svelte.ts) */
export const claseReto = (id: string): ClaseReto =>
  id.startsWith('dg:') ? 'diagrama' : id.startsWith('term:') ? 'terminal' : id.startsWith('diag:') ? 'diagnostico' : id.startsWith('mod:') ? 'examen' : 'otro';

/** Modo examen: mientras dura un examen (de módulo, simulacro o final) Grumete observa en silencio. Contador global,
 *  como los Grumetes locales: devuelve la función que lo cierra (para usarla como limpieza de un $effect). */
export const EV_MODO = 'grumete:modo';
// Se llama desde un $effect: el aviso sale con untrack para que lo que lean y escriban los oyentes (el estado del
// compañero) no quede como dependencia de ese efecto; si no, el efecto se relanza en bucle.
const avisarModo = () => untrack(() => dispatchEvent(new CustomEvent(EV_MODO)));
export function modoExamen(): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as unknown as { __grumeteExamen?: number };
  w.__grumeteExamen = (w.__grumeteExamen ?? 0) + 1;
  avisarModo();
  let cerrado = false;
  return () => {
    if (cerrado) return;
    cerrado = true;
    w.__grumeteExamen = Math.max(0, (w.__grumeteExamen ?? 1) - 1);
    avisarModo();
  };
}
export const enExamen = () => typeof window !== 'undefined' && ((window as unknown as { __grumeteExamen?: number }).__grumeteExamen ?? 0) > 0;
/** Lo emite cada Grumete «local» (examen final, banco de pruebas) al montarse y desmontarse: el compañero se aparta. */
export const EV_LOCAL = 'grumete:local';

export function avisarGrumete(aviso: Aviso) {
  if (typeof window === 'undefined') return;
  dispatchEvent(new CustomEvent<Aviso>(EV_AVISO, { detail: aviso }));
}

/** El alumno puede esconder a Grumete; vale para el compañero y para la práctica. Se recuerda en este navegador. */
const KEY_OCULTO = 'kcna.grumete';
export const EV_PREF = 'grumete:pref';
export function grumeteOculto(): boolean {
  try { return localStorage.getItem(KEY_OCULTO) === 'oculto'; } catch { return false; }
}
export function setGrumeteOculto(oculto: boolean) {
  try { if (oculto) localStorage.setItem(KEY_OCULTO, 'oculto'); else localStorage.removeItem(KEY_OCULTO); } catch { /* sin almacenamiento */ }
  dispatchEvent(new CustomEvent(EV_PREF));
}

/** Cuántos Grumetes locales hay ahora en la página (contador global: las islas pueden hidratarse en cualquier orden). */
export function grumetesLocales(delta = 0): number {
  const w = window as unknown as { __grumetesLocales?: number };
  w.__grumetesLocales = Math.max(0, (w.__grumetesLocales ?? 0) + delta);
  if (delta) dispatchEvent(new CustomEvent(EV_LOCAL));
  return w.__grumetesLocales;
}
