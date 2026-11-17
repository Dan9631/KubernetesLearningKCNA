// Celebración de un hito (aprobar un examen): partículas en un único <canvas> fijo que nacen del elemento que
// la causó (la nota) y se apagan en ~1 s. Adaptado de assets/particles-burst.js de motion-craft.
// Solo para momentos que ocurren pocas veces: nunca en cada acierto. Con movimiento reducido no hace nada;
// la celebración ya tiene su señal estática (texto, color, ✓).
import { reduced } from './motion';

interface P { x: number; y: number; vx: number; vy: number; t: number; life: number; size: number; rot: number; spin: number; color: string; round: boolean }

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0, last = 0;
const parts: P[] = [];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const GRAVEDAD = 900, ROCE = 2.2;

function lienzo() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  medir();
  addEventListener('resize', medir);
}
function medir() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function cuadro(now: number) {
  if (!ctx) return;
  const dt = Math.min((now - last) / 1000, 0.032);
  last = now;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    if (p.t >= p.life) { parts.splice(i, 1); continue; }
    const k = Math.exp(-ROCE * dt);
    p.vx *= k;
    p.vy = p.vy * k + GRAVEDAD * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.spin * dt;
    ctx.save();
    ctx.globalAlpha = 1 - Math.pow(p.t / p.life, 3); // se mantiene y se apaga al final
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.283); ctx.fill(); }
    else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(cuadro) : 0;
}

/** Estalla desde el centro de `ancla`, en abanico hacia arriba, con los colores de los dominios del curso */
export function celebrar(ancla: Element | null | undefined, count = 30) {
  if (!ancla || reduced()) return;
  lienzo();
  const r = ancla.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const css = getComputedStyle(document.documentElement);
  const colores = ['--helm', '--ready', '--wait', '--fail'].map((v) => css.getPropertyValue(v).trim() || '#2f5fd0').concat('#8250df');
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + rand(-1.2, 1.2);
    const s = rand(220, 520);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rand(0.6, 1.1), size: rand(4, 9),
      rot: rand(0, 6.283), spin: rand(-8, 8), color: colores[i % colores.length], round: i % 3 === 0 });
  }
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(cuadro); }
}
