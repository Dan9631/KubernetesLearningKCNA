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
  /** La clave se recuerda más allá de hoy (hitos de constancia: cada uno se celebra una vez) */
  perdura?: boolean;
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
  /** Hitos ya celebrados (no caducan con el día; se guardan los últimos MAX_HITOS) */
  hitos: string[];
}
export const MAX_DIA = 3;
const MAX_HITOS = 30;
export const memoriaVacia = (dia: string, hitos: string[] = []): Memoria => ({ dia, proactivas: 0, dichas: [], hitos });

/** La memoria de otro día no cuenta (salvo los hitos ya celebrados): se empieza de cero */
export function alDia(m: Memoria | null | undefined, hoy: string): Memoria {
  const hitos = Array.isArray(m?.hitos) ? m.hitos : [];
  return m && m.dia === hoy && Array.isArray(m.dichas) ? { ...m, hitos } : memoriaVacia(hoy, hitos);
}

/** ¿Puede decir esta frase proactiva? (presupuesto del día y sin repetir) */
export function puedeDecir(m: Memoria, d: Decision | null): boolean {
  if (!d?.frase) return false;
  if (m.proactivas >= MAX_DIA) return false;
  return !d.clave || !(d.perdura ? m.hitos : m.dichas).includes(d.clave);
}

/** Apunta que la dijo */
export function anotar(m: Memoria, d: Decision): Memoria {
  if (d.clave && d.perdura) return { ...m, proactivas: m.proactivas + 1, hitos: [...m.hitos, d.clave].slice(-MAX_HITOS) };
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

/* ---------------- constancia: hitos, sin racha punitiva ---------------- */

const iso = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const masDias = (dia: string, n: number) => iso(aFecha(dia) + n * DIA_MS + DIA_MS / 2); // +12 h: inmune al cambio de hora

/** Días seguidos con estudio hasta hoy (o hasta ayer, si hoy aún no estudió) y el día en que empezó */
export function rachaActual(days: string[], hoy: string): { n: number; desde: string } {
  const set = new Set(days);
  let dia = set.has(hoy) ? hoy : masDias(hoy, -1);
  let n = 0, desde = dia;
  while (set.has(dia)) { n++; desde = dia; dia = masDias(dia, -1); }
  return { n, desde };
}

const HITOS: [number, string][] = [
  [30, 'Un mes seguido al timón.'],
  [14, 'Dos semanas seguidas al timón.'],
  [7, 'Siete días seguidos al timón.'],
  [3, 'Tres días seguidos: así se fija lo aprendido.'],
];

/**
 * Hitos de constancia para la portada: 3, 7, 14 y 30 días seguidos, o 5 de los últimos 7. Cada hito se celebra una
 * vez (la clave lleva el día en que empezó la racha, así una racha nueva vuelve a contar). Si la racha se rompe,
 * no dice nada: ni contador permanente ni aviso de pérdida.
 */
export function hitoConstancia(days: string[], hoy: string): Decision | null {
  const r = rachaActual(days, hoy);
  const h = HITOS.find(([m]) => r.n >= m);
  if (h) return { gestos: ['timon'], frase: h[1], clave: `hito:racha${h[0]}:${r.desde}`, perdura: true };
  // sin racha larga: 5 de los últimos 7 días (hoy incluido), una vez por semana
  const set = new Set(days);
  let n = 0;
  for (let k = 0; k < 7; k++) if (set.has(masDias(hoy, -k))) n++;
  if (n < 5) return null;
  const lunes = masDias(hoy, -((new Date(aFecha(hoy)).getDay() + 6) % 7));
  return { gestos: ['feliz'], frase: 'Cinco de los últimos siete días estudiando. Buen ritmo.', clave: `hito:cinco:${lunes}`, perdura: true };
}

/** Qué decir al cargar una página: primero la vuelta tras ausencia; en la portada, el parte del día y después los
 *  hitos de constancia. Con memoria, devuelve la primera que aún se puede decir hoy. */
export function alCargar(dias: number | null, hoy: string, datos?: DatosHoy, m?: Memoria, days: string[] = []): Decision | null {
  const candidatas = [regreso(dias, hoy, datos), datos ? parteDelDia(datos, hoy) : null, datos ? hitoConstancia(days, hoy) : null];
  return candidatas.find((d) => d && (!m || puedeDecir(m, d))) ?? null;
}

/* ---------------- práctica: cierre de ronda y trampas de formato ---------------- */

export interface Fallo { topic: string; module?: number }
const dos = (n: number) => String(n).padStart(2, '0');

/**
 * Cierre de una ronda de práctica. Ronda limpia (5 o más): su momento protagonista, el timón. Con fallos, busca un
 * patrón que la lista no dice: dos o más del mismo tema, y el módulo que lo explica. Si no hay patrón, empuja a
 * repasarlos ya (mira el botón).
 */
export function cierreRonda(ok: number, total: number, fallos: Fallo[]): Decision | null {
  if (!total) return null;
  if (!fallos.length) return total >= 5 ? { gestos: ['timon'], frase: 'Ronda limpia. ¡A toda vela!' } : { gestos: ['feliz'] };
  const temas = new Map<string, Fallo[]>();
  for (const f of fallos) temas.set(f.topic, [...(temas.get(f.topic) ?? []), f]);
  const [tema, suyos] = [...temas].sort((a, b) => b[1].length - a[1].length)[0];
  if (suyos.length >= 2) {
    // el módulo que más se repite entre esos fallos
    const mods = new Map<number, number>();
    for (const f of suyos) if (f.module) mods.set(f.module, (mods.get(f.module) ?? 0) + 1);
    const mod = [...mods].sort((a, b) => b[1] - a[1])[0]?.[0];
    const todos = suyos.length === fallos.length && fallos.length > 2;
    return {
      gestos: ['asiente'],
      frase: `${todos ? 'Todos los' : cap(enLetra(suyos.length))} fallos son del mismo tema: ${tema}.${mod ? ` El Módulo ${dos(mod)} lo explica.` : ''}`,
      apunta: mod ? `.missed a[href*="/modulos/${dos(mod)}"]` : undefined,
    };
  }
  return {
    gestos: ['asiente'],
    frase: fallos.length === 1 ? 'Un fallo: repásalo ahora, que está fresco.' : `${cap(enLetra(fallos.length))} fallos: repásalos ahora, que están frescos.`,
    apunta: '.end .row .btn.primary',
  };
}

/** Tipos de pregunta que suelen costar puntos (lib/preparacion.ts TRAMPAS) */
export type Trampa = 'multi' | 'superl' | 'neg';
export const MAX_TRAMPAS = 2; // por ronda: más sería convertirlo en muleta
const TRAMPA_FRASE: Record<Trampa, string> = {
  neg: 'Ojo, de las que te cuestan: aquí buscas la opción falsa.',
  superl: 'Ojo, de las que te cuestan: varias pueden ser ciertas; busca la que mejor responde.',
  multi: 'Ojo, de las que te cuestan: valida cada opción por separado.',
};
/**
 * Aviso antes de una pregunta de un tipo en el que el alumno rinde peor (solo si los datos lo dicen: trampas()).
 * Habla del formato, nunca del contenido; nunca en exámenes y como mucho MAX_TRAMPAS por ronda.
 */
export function avisoTrampa(tipos: Trampa[], dichasEnRonda: number): Decision | null {
  if (dichasEnRonda >= MAX_TRAMPAS) return null;
  const t = (['neg', 'superl', 'multi'] as const).find((x) => tipos.includes(x));
  return t ? { gestos: [], frase: TRAMPA_FRASE[t] } : null;
}

/* ---------------- preferencia ---------------- */

/** habla: frases y gestos; gestos: solo gestos (habla si se le pulsa); oculto: no está */
export type Nivel = 'habla' | 'gestos' | 'oculto';
