// Valida las guías de diagramas (src/lib/diagramas.ts) contra el markdown de los módulos antes de compilar:
// el diagrama n existe, es del tipo que la guía espera y cada nodo citado aparece en su código Mermaid.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GUIAS } from '../src/lib/diagramas.ts';

const curso = fileURLToPath(new URL('../../curso/', import.meta.url));
const FENCE = '`'.repeat(3);
const bloques = new RegExp(FENCE + 'mermaid\\r?\\n([\\s\\S]*?)' + FENCE, 'g');
const porModulo = {};
for (const file of readdirSync(curso)) porModulo[file.slice(0, 2)] = [...readFileSync(curso + file, 'utf8').matchAll(bloques)].map((m) => m[1]);

const errores = [];
const vistos = new Set();
for (const g of GUIAS) {
  const at = `guía ${g.mod}-${g.n} («${g.titulo}»)`;
  if (vistos.has(`${g.mod}-${g.n}`)) errores.push(`${at}: repetida`);
  vistos.add(`${g.mod}-${g.n}`);
  const src = porModulo[g.mod]?.[g.n];
  if (!src) { errores.push(`${at}: el módulo ${g.mod} no tiene un diagrama número ${g.n}`); continue; }
  const tipo = src.trim().split(/\s/)[0];
  if (g.secuencia && tipo !== 'sequenceDiagram') errores.push(`${at}: pide secuencia y el diagrama es ${tipo}`);
  if ((g.recorrido || g.huecos) && !tipo.startsWith('flowchart') && !tipo.startsWith('graph')) errores.push(`${at}: recorrido y huecos solo valen para flowchart (es ${tipo})`);
  if (!g.secuencia && !g.recorrido && !g.huecos) errores.push(`${at}: no define nada`);
  if ((g.pistas || g.pregunta) && !g.secuencia) errores.push(`${at}: pistas y pregunta solo valen para una secuencia`);
  // mensajes de una secuencia: líneas con flecha (->>, -->>, ->, -->, -x, -))
  const nMensajes = src.split(/\r?\n/).filter((l) => /^\s*\w+\s*--?(>>|>|x|\))/.test(l)).length;
  if (g.pasos && !g.secuencia) errores.push(`${at}: pasos solo vale para una secuencia`);
  if (g.pasos && g.pasos.length !== nMensajes) errores.push(`${at}: ${g.pasos.length} pasos para ${nMensajes} mensajes (si se dan, uno por mensaje)`);
  if (g.pistas && g.pistas.length !== nMensajes) errores.push(`${at}: ${g.pistas.length} pistas para ${nMensajes} mensajes (si se dan, una por mensaje)`);
  for (const h of g.huecos ?? []) if (h.opcion !== undefined && h.opcion.length < 2) errores.push(`${at}: hueco con opción vacía`);
  const opciones = (g.huecos ?? []).map((h) => h.opcion).filter(Boolean);
  if (new Set(opciones).size !== opciones.length) errores.push(`${at}: dos huecos comparten la misma opción`);
  // un nodo existe si su id aparece como palabra seguida de una forma, una flecha o un fin de línea
  const tiene = (id) => new RegExp(`(^|[\\s>|])${id}(\\s*[\\[({]|\\s*(-|<|=|$))`, 'm').test(src);
  const ids = [...(g.recorrido ?? []).flatMap((p) => p.foco), ...(g.huecos ?? []).flatMap((h) => h.nodos)];
  for (const id of new Set(ids)) if (!tiene(id)) errores.push(`${at}: el nodo «${id}» no está en el diagrama`);
  for (const p of g.recorrido ?? []) if (!p.foco.length || p.texto.length < 20) errores.push(`${at}: paso del recorrido sin foco o sin texto`);
  for (const h of g.huecos ?? []) if (!h.nodos.length || h.pista.length < 15) errores.push(`${at}: hueco sin nodos o sin pista`);
}
if (errores.length) { console.error(`validar-diagramas: ${errores.length} problema(s)\n  ` + errores.join('\n  ')); process.exit(1); }
console.log(`validar-diagramas: ${GUIAS.length} guías correctas (módulos ${[...new Set(GUIAS.map((g) => g.mod))].join(', ')})`);
