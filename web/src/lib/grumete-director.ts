/**
 * El «director» de Grumete: decide qué gesto hace y qué dice, y cuándo calla. Funciones puras (sin DOM, sin Svelte):
 * quien pinta (GrumeteCompanero, la escena de ModuleQuiz) solo ejecuta la decisión. Así las frases y las reglas
 * viven en un sitio, se pueden probar (grumete-director.test.mjs) y no se duplican entre componentes.
 *
 * Principios (ver .claude/skills/motion-craft/references/aprendizaje-y-quiz.md):
 *  - habla de la tarea, no de la persona; elogio escaso; todo lo que afirma sale de datos reales;
 *  - si la tarjeta ya lo dice, gesto y silencio;
 *  - por iniciativa propia: como mucho una frase por página y tres al día, sin repetir la misma el mismo día.
 */

/** Acciones puntuales de lib/grumete.ts que usa el director */
export type Gesto = 'feliz' | 'triste' | 'timon' | 'saludo' | 'asiente';
export type Conf = 's' | 'd' | 'a';

export interface Decision {
  gestos: Gesto[];
  /** Sin frase: solo el gesto */
  frase?: string;
  /** Bucle mientras dura (p. ej. pensando al adivinar) */
  estado?: 'pensando';
  /** Identifica la frase para no repetirla el mismo día (solo las proactivas) */
  clave?: string;
  /** Selector del elemento al que mira mientras lo dice */
  apunta?: string;
}

/* ---------------- respuestas ---------------- */

/**
 * Reacción a una respuesta según la confianza declarada (Seguro / Dudo / Adivino) y el resultado.
 * `donde`: en el chat de la práctica del módulo siempre acompaña la explicación con una frase;
 * en la esquina solo gesticula (la tarjeta ya dice si fue correcto), salvo las rachas.
 */
export function reaccionRespuesta(ok: boolean, conf: Conf | undefined, racha: number, donde: 'chat' | 'esquina'): Decision {
  const chat = donde === 'chat';
  if (!ok) {
    if (conf === 's') return { gestos: ['triste'], frase: chat ? 'Esta idea hay que cambiarla. Mira por qué:' : undefined };
    return { gestos: ['triste'], frase: chat ? 'Casi. Mira por qué:' : undefined };
  }
  // tres aciertos seguidos que no fueron a ciegas: el único elogio, y corto
  if (racha > 0 && racha % 3 === 0 && conf !== 'a') return { gestos: ['timon'], frase: `¡${racha} seguidas!${chat ? ' Mira por qué:' : ''}` };
  if (conf === 'a') return { gestos: ['asiente'], estado: 'pensando', frase: chat ? 'Salió, pero vuelve pronto: lee el porqué.' : undefined };
  if (conf === 'd') return { gestos: ['feliz'], frase: chat ? 'Dudabas y era esa. Mira por qué:' : undefined };
  // seguro y bien (o sin confianza declarada): asiente; en el chat, un empujón a leer igual
  return { gestos: ['asiente'], frase: chat ? 'Bien. Repasa el porqué igual:' : undefined };
}

/* ---------------- memoria y presupuesto ---------------- */

export interface Memoria {
  /** Día (AAAA-MM-DD) al que se refieren los contadores */
  dia: string;
  /** Frases proactivas dichas hoy */
  proactivas: number;
  /** Claves de frases dichas hoy */
  dichas: string[];
}
export const MAX_DIA = 3;
export const memoriaVacia = (dia: string): Memoria => ({ dia, proactivas: 0, dichas: [] });

/** La memoria de otro día no cuenta: se empieza de cero */
export function alDia(m: Memoria | null | undefined, hoy: string): Memoria {
  return m && m.dia === hoy && Array.isArray(m.dichas) ? m : memoriaVacia(hoy);
}

/** ¿Puede decir esta frase proactiva? (presupuesto del día y sin repetir) */
export function puedeDecir(m: Memoria, d: Decision | null): boolean {
  if (!d?.frase) return false;
  if (m.proactivas >= MAX_DIA) return false;
  return !d.clave || !m.dichas.includes(d.clave);
}

/** Apunta que la dijo */
export function anotar(m: Memoria, d: Decision): Memoria {
  return { ...m, proactivas: m.proactivas + 1, dichas: d.clave ? [...m.dichas, d.clave] : m.dichas };
}

/* ---------------- proactivas: vuelta tras ausencia y parte del día ---------------- */

const DIA_MS = 86_400_000;
const aFecha = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };

/** Días completos desde el último día con estudio (anterior a hoy) hasta hoy; null si nunca estudió */
export function diasSinEstudiar(days: string[], hoy: string): number | null {
  const antes = days.filter((d) => d < hoy).sort();
  if (!antes.length) return null;
  return Math.round((aFecha(hoy) - aFecha(antes[antes.length - 1])) / DIA_MS);
}

const NUM = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const enLetra = (n: number) => (n >= 0 && n < NUM.length ? NUM[n] : String(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Lo que la portada «Hoy» ya calcula y le pasa (así el compañero no carga el banco de preguntas en cada página) */
export interface DatosHoy {
  due: number;
  sure: number;
  cmdDue: number;
  tomorrow: number;
  /** Texto del siguiente paso de la preparación (preparacion.ts nextStep), sin el «Siguiente paso: » */
  siguiente?: string;
  /** Módulo que se estaba leyendo */
  leyendo?: { mod: string; titulo: string };
}

/**
 * Vuelta tras 3 días o más sin estudiar. Sin culpa ni reproche: el hecho y una acción pequeña.
 * Con los datos de «Hoy» dice cuántos repasos esperan; en otras páginas, solo dónde están.
 */
export function regreso(dias: number | null, hoy: string, datos?: DatosHoy): Decision | null {
  if (dias === null || dias < 3) return null;
  const puerto = `${cap(enLetra(dias))} días en puerto.`;
  let resto = 'Tus repasos te esperan en Hoy.';
  if (datos) {
    const n = datos.due + datos.cmdDue;
    resto = n === 1 ? 'Te espera un solo repaso: un minuto y listo.'
      : n ? `Se acumularon ${n} repasos: diez minutos hoy ya ayudan.` : 'Nada vencido: buen momento para seguir leyendo.';
  }
  return { gestos: ['saludo'], frase: `${puerto} ${resto}`, clave: `regreso:${hoy}`, apunta: datos ? '.hoy .task.main .btn, .hoy .task.main' : undefined };
}

/**
 * Parte del día en la portada: una frase con lo más importante (no repite la tarjeta entera).
 * Prioridad: ideas que dabas por seguras > repasos > seguir leyendo > siguiente paso.
 */
export function parteDelDia(d: DatosHoy, hoy: string): Decision | null {
  const n = d.due + d.cmdDue;
  const clave = `parte:${hoy}`;
  const boton = '.hoy .task.main .btn';
  if (n && d.sure) {
    return { gestos: ['saludo'], clave, apunta: boton,
      frase: `Hoy tocan ${n}; ${d.sure === 1 ? 'una es una idea que dabas' : `${d.sure} son ideas que dabas`} por segura${d.sure === 1 ? '' : 's'}. Empezamos por ${d.sure === 1 ? 'esa' : 'esas'}.` };
  }
  if (n === 1) return { gestos: ['saludo'], clave, apunta: boton, frase: 'Hoy toca un repaso: un minuto y listo.' };
  if (n) {
    const min = Math.max(1, Math.round(n * 0.75));
    return { gestos: ['saludo'], clave, apunta: boton, frase: `Hoy tocan ${plural(n, 'repaso', 'repasos')}. Unos ${plural(min, 'minuto', 'minutos')}.` };
  }
  if (d.leyendo) return { gestos: ['saludo'], clave, apunta: '.hoy .task:nth-child(2) .btn', frase: `Repaso al día. Buen momento para seguir con el Módulo ${d.leyendo.mod}.` };
  if (d.siguiente) return { gestos: ['saludo'], clave, frase: `Repaso al día. Siguiente: ${d.siguiente.replace(/\.$/, '')}.` };
  return null;
}

/** Qué decir al cargar una página: primero la vuelta tras ausencia; en la portada, el parte del día. Con memoria,
 *  devuelve la primera que aún se puede decir hoy (si la vuelta ya se dijo, pasa al parte del día). */
export function alCargar(dias: number | null, hoy: string, datos?: DatosHoy, m?: Memoria): Decision | null {
  const candidatas = [regreso(dias, hoy, datos), datos ? parteDelDia(datos, hoy) : null];
  return candidatas.find((d) => d && (!m || puedeDecir(m, d))) ?? null;
}
