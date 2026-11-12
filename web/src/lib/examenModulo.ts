// Examen de módulo: unas pocas preguntas del módulo, sin explicación hasta entregar, que dejan el módulo
// «aprobado». Lo califica el navegador y se guarda con el resto del progreso: es para que el alumno vea su
// avance, no una prueba ante terceros (esa es el examen final, que califica el servidor).
import { MODULES, pad } from './modules';
import type { Progress } from './progress.svelte';

/** preguntas por examen (menos si el módulo no tiene tantas en el banco) y porcentaje para aprobar */
export const PREGUNTAS = 10;
export const APROBAR = 80;

/** Módulos que tienen examen: los que entran en la certificación (los de preparación no llevan preguntas) */
export const CON_EXAMEN = MODULES.filter((m) => m.domain !== 'base');

/** Clave con la que queda guardado el aprobado en progress.retos; no se cambia ni se reutiliza */
export const claveExamen = (n: number) => `mod:${pad(n)}`;
export const aprobado = (p: Progress, n: number) => p.retos.includes(claveExamen(n));
export const tieneExamen = (n: number) => CON_EXAMEN.some((m) => m.n === n);
/** Un módulo con examen se completa al aprobarlo; los de preparación, al marcarlos a mano */
export const completo = (p: Progress, n: number) => (tieneExamen(n) ? aprobado(p, n) : p.done.includes(pad(n)));
/** aciertos necesarios en un examen de `total` preguntas */
export const minimo = (total: number) => Math.ceil((total * APROBAR) / 100);
