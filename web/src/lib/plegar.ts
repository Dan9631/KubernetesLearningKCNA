// Ajustes al HTML ya renderizado de un módulo (curso/*.md), sin tocar el markdown:
// - quita el "# Módulo NN — …": la plantilla de la página ya pinta el título (antes había dos h1);
// - pliega el bloque de metadatos inicial (dominio, tiempo, prerrequisitos, verificado) en "Ficha del módulo";
// - pliega las secciones de consulta ("Comandos clave", "Fuentes oficiales"); el h2 queda visible en el
//   <summary>, así que el índice del módulo sigue llevando a ellas.
// Lo plegado deja de ser hijo directo de .prose: no entra en el marcador de lectura ni en "Escuchar".
const FOLD = /^(comandos clave|fuentes oficiales)$/i;
const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;|&#\d+;/g, ' ').trim();

export function plegar(html: string): string {
  // título del markdown y, justo después, su bloque de metadatos
  html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*(?:<blockquote>([\s\S]*?)<\/blockquote>)?/, (_, meta?: string) =>
    meta ? `<details class="ficha"><summary>Ficha del módulo</summary>${meta}</details>` : '');

  // cada trozo empieza en un <h2> de primer nivel (el markdown de los módulos no anida h2)
  return html.split(/(?=<h2[\s>])/).map((part) => {
    const m = part.match(/^(<h2[^>]*>([\s\S]*?)<\/h2>)([\s\S]*)$/);
    if (!m || !FOLD.test(plain(m[2]))) return part;
    return `<details class="seccion"><summary>${m[1]}</summary>${m[3]}</details>`;
  }).join('');
}
