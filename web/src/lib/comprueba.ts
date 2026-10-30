// "Predice antes de mirar" (una pregunta por simulación) y comprobaciones de 10 segundos al final de
// las subsecciones clave de "Conceptos". Contenido en data/comprueba.json; ver docs/VERIFICACION.md.
import data from '../data/comprueba.json';

export interface Check { q: string; options: string[]; answer: number; why: string }
/** after: texto exacto del encabezado ### de Conceptos tras cuya subsección va la comprobación */
export interface SectionCheck extends Check { after: string }

/** clave "NN:id" de la simulación (p. ej. "02:apply") */
export const PREDICCIONES = data.predicciones as Record<string, Check>;
/** clave "NN" del módulo */
export const COMPROBACIONES = data.comprobaciones as Record<string, SectionCheck[]>;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Texto con `código` en línea a HTML seguro */
export const inline = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
