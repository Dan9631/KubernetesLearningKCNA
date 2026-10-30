// Ajustes al HTML ya renderizado de un módulo (curso/*.md), sin tocar el markdown:
// - quita el "# Módulo NN — …": la plantilla de la página ya pinta el título (antes había dos h1);
// - pliega el bloque de metadatos inicial (dominio, tiempo, prerrequisitos, verificado) en "Ficha del módulo";
// - pliega las secciones de consulta ("Comandos clave", "Fuentes oficiales"); el h2 queda visible en el
//   <summary>, así que el índice del módulo sigue llevando a ellas.
// - inserta las comprobaciones de 10 segundos al final de su subsección de Conceptos (lib/comprueba.ts);
//   Enhance.svelte les da la interacción.
// Lo plegado y las comprobaciones no son p/h/li: no entran en el marcador de lectura ni en "Escuchar".
import { inline, type SectionCheck } from './comprueba';

const FOLD = /^(comandos clave|fuentes oficiales)$/i;
const ENT: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&(amp|quot|#39|lt|gt);/g, (e) => ENT[e]).replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
/** Para comparar títulos: sin comillas invertidas y con las comillas tipográficas (smartypants) como rectas */
const norm = (s: string) => s.replace(/`/g, '').replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();

function checkHtml(c: SectionCheck) {
  const opts = c.options.map((o, i) => `<button type="button" class="check-opt" data-i="${i}">${inline(o)}</button>`).join('');
  return `<aside class="check" data-answer="${c.answer}" aria-label="Comprueba lo que acabas de leer">`
    + `<p class="check-k">Comprueba en 10 segundos</p><p class="check-q">${inline(c.q)}</p>`
    + `<div class="check-opts" role="group">${opts}</div><p class="check-why" aria-live="polite" hidden>${inline(c.why)}</p></aside>`;
}

/** Inserta cada comprobación al final de la subsección ### cuyo título coincide con `after` */
function insertChecks(part: string, checks: SectionCheck[]) {
  return part.split(/(?=<h3[\s>])/).map((sec) => {
    const h = sec.match(/^<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (!h) return sec;
    const title = norm(plain(h[1]));
    const here = checks.filter((c) => norm(c.after) === title);
    return here.length ? sec + here.map(checkHtml).join('') : sec;
  }).join('');
}

export function plegar(html: string, checks: SectionCheck[] = []): string {
  // título del markdown y, justo después, su bloque de metadatos
  html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*(?:<blockquote>([\s\S]*?)<\/blockquote>)?/, (_, meta?: string) =>
    meta ? `<details class="ficha"><summary>Ficha del módulo</summary>${meta}</details>` : '');

  // cada trozo empieza en un <h2> de primer nivel (el markdown de los módulos no anida h2)
  return html.split(/(?=<h2[\s>])/).map((part) => {
    const m = part.match(/^(<h2[^>]*>([\s\S]*?)<\/h2>)([\s\S]*)$/);
    if (m && /^conceptos$/i.test(plain(m[2])) && checks.length) return insertChecks(part, checks);
    if (!m || !FOLD.test(plain(m[2]))) return part;
    return `<details class="seccion"><summary>${m[1]}</summary>${m[3]}</details>`;
  }).join('');
}
