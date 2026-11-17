/**
 * Grumete: la mascota del curso. Una masa de plastilina con gorro de marinero.
 *
 *   const g = createGrumete(contenedor, { energia: 1 });
 *   g.go('pensando');   // estado en bucle: se queda ahí
 *   g.go('feliz');      // acción de un disparo: vuelve sola al estado base
 *   g.destroy();
 *
 * Cómo está hecho (cuerpo blando, no piezas rígidas):
 *  - La silueta es un anillo de N puntos unidos por una curva suave. Cada punto es un resorte que persigue su
 *    posición objetivo, y está acoplado a sus vecinos: si tiras de uno, arrastra a los de al lado como una masa.
 *  - La forma objetivo sale de unos pocos parámetros (aplastado, salto, inclinación, brazo, timón…). Los estados
 *    en bucle fijan esos parámetros y un resorte los mezcla, así que pasar de uno a otro no tiene cortes.
 *  - Las acciones (feliz, saludo, triste, timón) son líneas de tiempo que empiezan y terminan en la pose de
 *    reposo. Si llega una acción mientras hay otra, se encola (máximo 2).
 *  - Plastilina: al soltarlo conserva parte de la forma que le diste y la recupera poco a poco.
 *  - Cara, gorro y lazo no son piezas fijas: se recolocan cada frame según dónde esté la masa.
 *  - Con prefers-reduced-motion no respira ni rebota: las poses se aplican sin oscilar y las acciones solo cambian
 *    la cara. Fuera de pantalla o con la pestaña oculta no se calcula nada.
 */

export type Estado = 'reposo' | 'pensando' | 'dormido' | 'feliz' | 'saludo' | 'asiente' | 'triste' | 'timon';

interface Params {
  sx: number;     // ancho relativo
  sy: number;     // alto relativo (anclado al suelo)
  lift: number;   // altura del salto, en unidades del viewBox
  lean: number;   // inclinación de la parte de arriba
  arm: number;    // brazo de masa que sale del costado derecho
  wave: number;   // vaivén de ese brazo
  timon: number;  // 0 = masa, 1 = timón heptagonal
  giro: number;   // giro del timón, en radianes
  boca: number;   // -1 triste · 0 neutra · 1 contenta
  ojos: number;   // apertura de los ojos (0 cerrados)
  alegre: number; // > 0.5: ojos en arco (^ ^)
}

const REPOSO: Params = { sx: 1, sy: 1, lift: 0, lean: 0, arm: 0, wave: 0, timon: 0, giro: 0, boca: 0.25, ojos: 1, alegre: 0 };

type Linea = (t: number) => Partial<Params>;
interface Def { loop?: boolean; dur?: number; pose?: Linea; look?: [number, number] }

/** Interpola por tramos con suavizado (ease in-out) entre fotogramas clave [t, valor]. */
function kf(t: number, keys: [number, number][]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    const [t1, v1] = keys[k];
    if (t <= t1) {
      const [t0, v0] = keys[k - 1];
      const u = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * (u * u * (3 - 2 * u));
    }
  }
  return keys[keys.length - 1][1];
}

/* Añadir un estado = una entrada aquí. Las acciones deben empezar y terminar en REPOSO. */
const ESTADOS: Record<Estado, Def> = {
  reposo: { loop: true, pose: () => ({}) },
  pensando: { loop: true, look: [0.7, -0.9], pose: (t) => ({ lean: 5 * Math.sin((t * 2 * Math.PI) / 2.6), boca: 0 }) },
  dormido: { loop: true, look: [0, 0.5], pose: () => ({ sy: 0.88, sx: 1.07, ojos: 0.06, boca: 0 }) },
  feliz: {
    dur: 1.1,
    pose: (t) => ({
      // anticipación (se encoge), despegue estirado, caída, aterrizaje aplastado y vuelta
      sy: kf(t, [[0, 1], [0.16, 0.8], [0.3, 1.16], [0.55, 1.02], [0.7, 1.08], [0.8, 0.84], [1.1, 1]]),
      sx: kf(t, [[0, 1], [0.16, 1.14], [0.3, 0.9], [0.55, 1], [0.7, 0.96], [0.8, 1.12], [1.1, 1]]),
      lift: kf(t, [[0, 0], [0.18, 0], [0.42, 38], [0.7, 0], [1.1, 0]]),
      boca: 1, alegre: 1,
    }),
  },
  saludo: {
    dur: 1.6,
    pose: (t) => ({
      arm: kf(t, [[0, 0], [0.3, 24], [1.3, 24], [1.6, 0]]),
      wave: kf(t, [[0, 0], [0.3, 1], [1.3, 1], [1.6, 0]]) * Math.sin(t * 2 * Math.PI * 2.6),
      lean: kf(t, [[0, 0], [0.3, -3], [1.3, -3], [1.6, 0]]),
      boca: 1,
    }),
  },
  asiente: {
    // acuse de recibo al elegir algo: un cabeceo corto (se encoge y vuelve), sin cambiar de cara
    dur: 0.38,
    pose: (t) => ({
      sy: kf(t, [[0, 1], [0.12, 0.92], [0.38, 1]]),
      sx: kf(t, [[0, 1], [0.12, 1.05], [0.38, 1]]),
      lean: kf(t, [[0, 0], [0.12, 2], [0.38, 0]]),
    }),
  },
  triste: {
    dur: 1.5,
    pose: (t) => ({
      // se derrite: baja y se ensancha, y luego se recompone
      sy: kf(t, [[0, 1], [0.45, 0.74], [1.1, 0.74], [1.5, 1]]),
      sx: kf(t, [[0, 1], [0.45, 1.2], [1.1, 1.2], [1.5, 1]]),
      boca: kf(t, [[0, 0.25], [0.3, -1], [1.2, -1], [1.5, 0.25]]),
      ojos: kf(t, [[0, 1], [0.3, 0.55], [1.2, 0.55], [1.5, 1]]),
    }),
  },
  timon: {
    dur: 2,
    pose: (t) => ({
      // se encoge, se transforma en el timón, da una séptima de vuelta y vuelve a ser masa
      sy: kf(t, [[0, 1], [0.15, 0.86], [0.4, 1], [2, 1]]),
      sx: kf(t, [[0, 1], [0.15, 1.1], [0.4, 1], [2, 1]]),
      timon: kf(t, [[0, 0], [0.15, 0], [0.5, 1], [1.5, 1], [1.85, 0], [2, 0]]),
      giro: kf(t, [[0, 0], [0.5, 0], [1.4, (2 * Math.PI) / 7], [2, (2 * Math.PI) / 7]]),
      boca: 1, alegre: kf(t, [[0, 0], [0.4, 1], [1.6, 1], [1.8, 0]]),
    }),
  },
};

const N = 28;                       // puntos del anillo (bastantes para que el timón tenga lados rectos)
const C = { x: 100, y: 118 };       // centro de la masa en reposo
const RX = 56, RY = 48, SUELO = 170;
const SETTLE = 0.18;                // s para volver al reposo antes de una acción
const MAX_COLA = 2;
const PLASTICIDAD = 0.55;           // parte de la deformación que se queda al soltar
const MEMORIA = 2.8;                // s que tarda en olvidar esa deformación (constante de tiempo)

const MARCADO = `
<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <ellipse class="g-sombra" cx="100" cy="171.5" rx="46" ry="5"/>
  <path class="g-cuerpo"/>
  <path class="g-brillo"/>
  <g class="g-rueda"><circle r="12"/><path class="g-radios"/></g>
  <g class="g-cara">
    <ellipse class="g-ojo g-ojo-l"/><ellipse class="g-ojo g-ojo-r"/>
    <path class="g-arco g-arco-l"/><path class="g-arco g-arco-r"/>
    <path class="g-boca"/>
  </g>
  <g class="g-lazo">
    <path d="M0 0L-9 -5L-9 5Z"/><path d="M0 0L9 -5L9 5Z"/><circle r="2.6"/>
  </g>
  <g class="g-gorro">
    <path class="g-copa" d="M-19 0C-19 -13 -12 -19 0 -19C12 -19 19 -13 19 0Z"/>
    <rect class="g-cinta" x="-22" y="-4" width="44" height="7" rx="3.5"/>
  </g>
</svg>`;

/** Curva cerrada y suave (Catmull-Rom convertida a Bézier) que pasa por todos los puntos. */
function curva(p: { x: number; y: number }[]): string {
  const n = p.length;
  let d = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d + 'Z';
}

export interface Grumete {
  el: HTMLElement;
  go(estado: Estado): Grumete;
  readonly estado: Estado;
  readonly base: Estado;
  setEnergia(v: number): Grumete;
  /** Sigue (o deja de seguir) al cursor con la mirada; al dejarlo, mira al frente. */
  setSeguir(v: boolean): Grumete;
  /** Mira un elemento de la página (una opción, un mensaje) hasta que se le pase null; null vuelve a seguir al cursor. */
  mirar(destino: Element | null): Grumete;
  destroy(): void;
}

export function createGrumete(contenedor: HTMLElement, opts: { energia?: number; seguir?: boolean; moldeable?: boolean; onEstado?: (e: Estado) => void } = {}): Grumete {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let energia = opts.energia ?? 1;
  const moldeable = opts.moldeable ?? true;

  const el = document.createElement('div');
  el.className = 'grumete';
  el.innerHTML = MARCADO;
  contenedor.appendChild(el);
  const svg = el.querySelector('svg')!;
  const q = <T extends Element>(s: string) => svg.querySelector(s) as unknown as T;
  const cuerpo = q<SVGPathElement>('.g-cuerpo'), brillo = q<SVGPathElement>('.g-brillo'), sombra = q<SVGEllipseElement>('.g-sombra');
  const ojoL = q<SVGEllipseElement>('.g-ojo-l'), ojoR = q<SVGEllipseElement>('.g-ojo-r');
  const arcoL = q<SVGPathElement>('.g-arco-l'), arcoR = q<SVGPathElement>('.g-arco-r'), boca = q<SVGPathElement>('.g-boca');
  const lazo = q<SVGGElement>('.g-lazo'), gorro = q<SVGGElement>('.g-gorro'), rueda = q<SVGGElement>('.g-rueda');
  // siete radios del timón, del aro al borde; se dibujan una vez y solo se mueven y giran
  q<SVGPathElement>('.g-radios').setAttribute('d', Array.from({ length: 7 }, (_, k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 7; return `M${(12 * Math.cos(a)).toFixed(1)} ${(12 * Math.sin(a)).toFixed(1)}L${(40 * Math.cos(a)).toFixed(1)} ${(40 * Math.sin(a)).toFixed(1)}`; }).join(''));

  /* ---------- máquina de estados ---------- */
  let base: Estado = 'reposo';
  let actual: Estado = 'reposo';
  let tEstado = 0;          // s desde que empezó el estado actual
  let ocupado = false;      // hay una acción en curso (o volviendo al reposo para empezarla)
  let espera = 0;           // s que faltan para empezar la acción pendiente
  let pendiente: Estado | null = null;
  const cola: Estado[] = [];

  function aplicar(e: Estado) { actual = e; tEstado = 0; el.dataset.estado = e; opts.onEstado?.(e); }
  function empezarAccion(e: Estado) {
    ocupado = true;
    if (actual !== 'reposo' || cerca() > 0.05) { aplicar('reposo'); pendiente = e; espera = reduce ? 0 : SETTLE; }
    else aplicar(e);
  }
  function go(e: Estado): Grumete {
    const def = ESTADOS[e];
    if (!def) throw new Error(`Estado desconocido: ${e}`);
    if (def.loop) { base = e; if (!ocupado) aplicar(e); return api; }
    if (ocupado) { if (cola[cola.length - 1] !== e) cola.push(e); while (cola.length > MAX_COLA) cola.shift(); }
    else empezarAccion(e);
    despertar();
    return api;
  }

  /* ---------- parámetros de la pose (con resorte, así las poses se mezclan) ---------- */
  const P: Params = { ...REPOSO };
  const V: Record<keyof Params, number> = Object.fromEntries(Object.keys(REPOSO).map((k) => [k, 0])) as Record<keyof Params, number>;
  const claves = Object.keys(REPOSO) as (keyof Params)[];
  /** distancia de la pose actual al reposo (para saber si una acción puede empezar ya) */
  function cerca() { return Math.abs(P.sx - 1) + Math.abs(P.sy - 1) + Math.abs(P.lift) / 40 + Math.abs(P.lean) / 10 + Math.abs(P.arm) / 20 + P.timon; }

  /* ---------- cuerpo blando ---------- */
  const ang = Array.from({ length: N }, (_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / N); // el punto 0 es la coronilla
  const pts = ang.map(() => ({ x: C.x, y: C.y, vx: 0, vy: 0 }));
  const obj = ang.map(() => ({ x: 0, y: 0 }));
  const mem = ang.map(() => ({ x: 0, y: 0 })); // plastilina: deformación que se queda al soltar

  function forma(p: Params, respira: number) {
    const sy = p.sy * (1 + respira), sx = p.sx * (1 - respira * 0.6);
    const R7 = 58, paso = (2 * Math.PI) / 7, fase = -Math.PI / 2 + p.giro;
    for (let i = 0; i < N; i++) {
      const a = ang[i], s = Math.sin(a), c = Math.cos(a);
      // masa en reposo: un poco más ancha abajo y con la base aplastada contra el suelo
      let x = C.x + RX * c * (1 + 0.14 * Math.max(0, s));
      let y = Math.min(C.y + RY * s * (s > 0 ? 1.16 : 1), SUELO);
      // timón: el mismo ángulo sobre un heptágono, mezclado con la masa
      if (p.timon > 0) {
        const rel = ((((a - fase) % paso) + paso) % paso) - paso / 2;
        const r = (R7 * Math.cos(Math.PI / 7)) / Math.cos(rel);
        x += (C.x + r * c - x) * p.timon;
        y += (C.y - 6 + r * s - y) * p.timon;
      }
      // aplastar o estirar anclado al suelo, y saltar
      x = C.x + (x - C.x) * sx;
      y = SUELO - (SUELO - y) * sy - p.lift;
      // inclinación: más cuanto más arriba
      x += p.lean * Math.max(0, (SUELO - p.lift - y) / (RY * 2));
      // brazo de masa en el costado derecho, un poco por encima del ecuador
      if (p.arm) {
        const d = Math.atan2(Math.sin(a + 0.35), Math.cos(a + 0.35));
        const w = Math.exp(-(d * d) / (2 * 0.22 * 0.22));
        x += w * p.arm;
        y += w * (-p.arm * 0.35 - p.wave * 9);
      }
      obj[i].x = x; obj[i].y = y;
    }
  }

  /* ---------- moldear con el puntero ---------- */
  let agarre = -1;
  const tiron = { x: 0, y: 0 };
  function aSvg(e: PointerEvent) {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  const peso = (i: number) => { if (agarre < 0) return 0; const d = (Math.min(Math.abs(i - agarre), N - Math.abs(i - agarre)) * 18) / N; return Math.exp(-(d * d) / 4.5); };
  function onDown(e: PointerEvent) {
    if (!moldeable) return;
    const p = aSvg(e);
    let mejor = 0, dmin = Infinity;
    pts.forEach((q, i) => { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < dmin) { dmin = d; mejor = i; } });
    agarre = mejor;
    try { svg.setPointerCapture(e.pointerId); } catch { /* puntero ya liberado: se sigue sin captura */ }
    el.dataset.agarrado = '';
    onMove(e);
    despertar();
  }
  function onMove(e: PointerEvent) {
    if (agarre < 0) return;
    const p = aSvg(e), o = obj[agarre], m = mem[agarre];
    let dx = p.x - (o.x + m.x), dy = p.y - (o.y + m.y);
    const L = Math.hypot(dx, dy), MAX = 70; // la masa no se estira infinito
    if (L > MAX) { dx *= MAX / L; dy *= MAX / L; }
    tiron.x = dx; tiron.y = dy;
  }
  function onUp() {
    if (agarre < 0) return;
    // plastilina: parte de la forma se queda y se olvida despacio
    for (let i = 0; i < N; i++) { const w = peso(i); mem[i].x += w * tiron.x * PLASTICIDAD; mem[i].y += w * tiron.y * PLASTICIDAD; }
    agarre = -1; tiron.x = tiron.y = 0;
    delete el.dataset.agarrado;
  }
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);

  /* ---------- mirada ---------- */
  const mira = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  let objetivo: Element | null = null; // si hay uno, mira ese elemento en vez del cursor
  const tope = (v: number) => Math.max(-1, Math.min(1, v));
  function mirarObjetivo() {
    if (!objetivo?.isConnected) { objetivo = null; return; }
    const r = el.getBoundingClientRect(), o = objetivo.getBoundingClientRect();
    // alcance amplio: así una opción de arriba y una de abajo dan miradas distintas en vez de saturar las dos
    const alcance = Math.max(380, r.width * 3);
    // apunta al principio del elemento (la letra de una opción), no a su centro: en filas anchas el centro queda
    // siempre a la derecha y todas las opciones darían la misma mirada
    mira.tx = tope((o.left + Math.min(o.width / 2, 48) - (r.left + r.width / 2)) / alcance);
    mira.ty = tope((o.top + o.height / 2 - (r.top + r.height * 0.55)) / alcance);
  }
  function onPointer(e: PointerEvent) {
    if (opts.seguir === false || ESTADOS[actual].look || objetivo) return;
    const r = el.getBoundingClientRect();
    const alcance = Math.max(innerWidth, innerHeight) * 0.35;
    mira.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / alcance));
    mira.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.55)) / alcance));
    despertar();
  }
  addEventListener('pointermove', onPointer, { passive: true });

  /* ---------- parpadeo ---------- */
  let parpadeo = 2 + Math.random() * 3, cerrando = 0;

  /* ---------- bucle ---------- */
  let raf = 0, last = 0, reloj = 0, visible = true, quieto = 0;
  function despertar() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now; reloj += dt; tEstado += dt;

    // máquina de estados: acción pendiente, fin de acción
    if (pendiente) { espera -= dt; if (espera <= 0 && (cerca() < 0.05 || reduce || espera < -0.4)) { const e = pendiente; pendiente = null; aplicar(e); } }
    const def = ESTADOS[actual];
    if (def.dur && tEstado >= def.dur) {
      ocupado = false; aplicar(base);
      const sig = cola.shift(); if (sig) empezarAccion(sig);
    }

    // pose objetivo: reposo + la del estado; las acciones se siguen de cerca, los bucles se mezclan despacio
    const meta: Params = { ...REPOSO, ...ESTADOS[actual].pose?.(tEstado) };
    if (agarre >= 0) { meta.boca = 0.6; meta.ojos = 1.25; } // sorpresa mientras lo moldean
    const accion = !!ESTADOS[actual].dur;
    const K = accion ? 900 : 140, D = 2 * Math.sqrt(K) * 0.9;
    for (const k of claves) {
      const amp = k === 'boca' || k === 'ojos' || k === 'alegre' || k === 'giro' || k === 'timon' ? 1 : energia;
      const destino = REPOSO[k] + (meta[k] - REPOSO[k]) * amp;
      if (reduce) { P[k] = destino; continue; }
      V[k] += (K * (destino - P[k]) - D * V[k]) * dt;
      P[k] += V[k] * dt;
    }
    if (reduce) { P.lift = 0; P.lean = 0; P.arm = 0; P.wave = 0; P.sx = 1; P.sy = 1; P.timon = 0; } // reducido: solo cambia la cara

    // respiración (capa 1): lenta y pequeña; dormido respira más hondo
    const respira = reduce ? 0 : (actual === 'dormido' ? 0.035 : 0.018) * energia * Math.sin((reloj * 2 * Math.PI) / (actual === 'dormido' ? 4.5 : 3.4));
    forma(P, respira);

    // memoria de la plastilina
    const olvido = Math.exp(-dt / MEMORIA);
    for (const m of mem) { m.x *= olvido; m.y *= olvido; }

    // resortes de los puntos, acoplados a sus vecinos (masa, no puntos sueltos)
    const KP = 210, DP = 2 * Math.sqrt(KP) * 0.62, KV = 70;
    let mov = 0;
    for (let i = 0; i < N; i++) {
      const p = pts[i], w = peso(i);
      const tx = obj[i].x + mem[i].x + w * tiron.x, ty = obj[i].y + mem[i].y + w * tiron.y;
      if (reduce) { mov += Math.abs(tx - p.x) + Math.abs(ty - p.y); p.x = tx; p.y = ty; continue; }
      const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
      const oa = obj[(i - 1 + N) % N], ob = obj[(i + 1) % N];
      // los vecinos tiran para mantener la curvatura de la forma objetivo
      const vx = (a.x + b.x) / 2 - p.x - ((oa.x + ob.x) / 2 - obj[i].x);
      const vy = (a.y + b.y) / 2 - p.y - ((oa.y + ob.y) / 2 - obj[i].y);
      p.vx += (KP * (tx - p.x) - DP * p.vx + KV * vx) * dt;
      p.vy += (KP * (ty - p.y) - DP * p.vy + KV * vy) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y > SUELO) { p.y = SUELO; p.vy = 0; } // no atraviesa el suelo
      mov += Math.abs(p.vx) + Math.abs(p.vy);
    }

    // mirada con resorte
    if (objetivo) mirarObjetivo();
    const fija = ESTADOS[actual].look;
    const mtx = fija ? fija[0] : mira.tx, mty = fija ? fija[1] : mira.ty;
    if (reduce) { mira.x = mtx; mira.y = mty; }
    else { mira.vx += (170 * (mtx - mira.x) - 22 * mira.vx) * dt; mira.vy += (170 * (mty - mira.y) - 22 * mira.vy) * dt; mira.x += mira.vx * dt; mira.y += mira.vy * dt; }

    // parpadeo irregular
    parpadeo -= dt;
    if (parpadeo <= 0) { cerrando = 0.13; parpadeo = 3 + Math.random() * 3.5; }
    if (cerrando > 0) cerrando -= dt;

    dibujar(cerrando > 0 && !reduce ? 0.1 : 1);

    // ¿puede dormir el bucle? Solo con movimiento reducido (sin respiración) y sin nada pendiente
    quieto = reduce && mov < 0.01 && !ocupado && agarre < 0 ? quieto + dt : 0;
    raf = quieto > 0.5 ? 0 : requestAnimationFrame(frame);
  }

  function dibujar(parpado: number) {
    cuerpo.setAttribute('d', curva(pts));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, sumX = 0;
    for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); sumX += p.x; }
    const W = maxX - minX, H = maxY - minY, cx = sumX / N;
    // la cara se apoya en el centro de la masa (no en el brazo): media de los puntos, sin la deformación del tiron
    // la cara entera gira hacia donde mira (más hacia abajo, que es donde suele estar lo que señala) y al mirar
    // abajo los párpados bajan un poco: así se lee la dirección aunque los ojos no tengan pupila
    const fx = cx + mira.x * 7, fy = minY + H * 0.44 + mira.y * (mira.y > 0 ? 10 : 6);
    const sep = Math.max(11, W * 0.16);
    const abre = Math.max(0.04, P.ojos * parpado * (1 - Math.max(0, mira.y) * 0.3));
    for (const [ojo, arco, lado] of [[ojoL, arcoL, -1], [ojoR, arcoR, 1]] as const) {
      const ex = fx + lado * sep, ey = fy;
      ojo.setAttribute('cx', ex.toFixed(1)); ojo.setAttribute('cy', ey.toFixed(1));
      ojo.setAttribute('rx', '3.6'); ojo.setAttribute('ry', (4.8 * abre).toFixed(2));
      arco.setAttribute('d', `M${(ex - 5).toFixed(1)} ${(ey + 2).toFixed(1)}Q${ex.toFixed(1)} ${(ey - 5).toFixed(1)} ${(ex + 5).toFixed(1)} ${(ey + 2).toFixed(1)}`);
    }
    el.toggleAttribute('data-alegre', P.alegre > 0.5);
    // boca: una curva cuya flecha depende del ánimo; abierta (rellena) cuando está muy contento
    const mx = fx, my = fy + Math.max(9, H * 0.16), mw = Math.max(5, W * 0.07);
    const curv = P.boca * 6;
    boca.setAttribute('d', `M${(mx - mw).toFixed(1)} ${my.toFixed(1)}Q${mx.toFixed(1)} ${(my + curv).toFixed(1)} ${(mx + mw).toFixed(1)} ${my.toFixed(1)}`);
    el.toggleAttribute('data-boca-abierta', P.boca > 0.7 || agarre >= 0);
    // brillo: un trazo en la parte de arriba a la izquierda que sigue a la masa
    const b0 = pts[Math.round((N * 5) / 6)], b1 = pts[Math.round((N * 8) / 9)];
    brillo.setAttribute('d', `M${(b0.x + 9).toFixed(1)} ${(b0.y + 6).toFixed(1)}Q${(b1.x + 8).toFixed(1)} ${(b1.y + 4).toFixed(1)} ${(b1.x + 16).toFixed(1)} ${(b1.y + 1).toFixed(1)}`);
    // gorro en la coronilla, girado según la pendiente de la masa, con un ladeo de carácter
    const t = pts[0], a = pts[N - 1], b = pts[1];
    const giro = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - 8;
    gorro.setAttribute('transform', `translate(${t.x.toFixed(1)} ${(t.y + 5).toFixed(1)}) rotate(${giro.toFixed(1)})`);
    // timón: aro y radios que aparecen solo mientras es timón, centrados en la masa y girando con ella
    rueda.setAttribute('transform', `translate(${cx.toFixed(1)} ${(minY + H * 0.5).toFixed(1)}) rotate(${((P.giro * 180) / Math.PI).toFixed(1)})`);
    rueda.style.opacity = String(Math.max(0, Math.min(1, P.timon)));
    // lazo de marinero bajo la boca
    lazo.setAttribute('transform', `translate(${mx.toFixed(1)} ${(my + Math.max(10, H * 0.17)).toFixed(1)}) rotate(${(P.lean * 1.5).toFixed(1)})`);
    // sombra: se encoge y aclara al saltar
    const alto = Math.max(0, SUELO - maxY);
    sombra.setAttribute('rx', (W * 0.46 * (1 - Math.min(alto, 60) / 120)).toFixed(1));
    sombra.style.opacity = String(0.18 * (1 - Math.min(alto, 60) / 90));
  }

  /* ---------- pausa fuera de pantalla y con la pestaña oculta ---------- */
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) despertar(); else { cancelAnimationFrame(raf); raf = 0; } }) : null;
  io?.observe(el);
  const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else despertar(); };
  document.addEventListener('visibilitychange', onVis);

  // arranca ya en su forma, sin animación de entrada
  forma(P, 0);
  pts.forEach((p, i) => { p.x = obj[i].x; p.y = obj[i].y; });
  aplicar('reposo');
  dibujar(1);
  despertar();

  const api: Grumete = {
    el,
    go,
    get estado() { return actual; },
    get base() { return base; },
    setEnergia(v: number) { energia = Math.max(0, Math.min(1.5, v)); despertar(); return api; },
    setSeguir(v: boolean) { opts.seguir = v; if (!v && !objetivo) { mira.tx = 0; mira.ty = 0; } despertar(); return api; },
    mirar(destino: Element | null) { objetivo = destino; if (!destino) { mira.tx = 0; mira.ty = 0; } despertar(); return api; },
    destroy() {
      cancelAnimationFrame(raf); raf = 0;
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('pointermove', onPointer);
      el.remove();
    },
  };
  return api;
}

export const ESTADOS_GRUMETE = Object.keys(ESTADOS) as Estado[];
