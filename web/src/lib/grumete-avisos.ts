/**
 * Canal entre el curso y Grumete, el compañero que vive en la esquina de cada página (GrumeteCompanero.svelte).
 * Quien detecta algo (una respuesta, un reto, un módulo) llama a avisarGrumete y no necesita saber si Grumete
 * está en la página: es un evento de ventana. Así el curso no depende de la mascota y se puede quitar sin tocarlo.
 */
export type Aviso = 'acierto' | 'fallo' | 'reto' | 'modulo';
export const EV_AVISO = 'grumete:aviso';
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
