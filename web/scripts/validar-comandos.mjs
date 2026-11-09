// Valida los ejercicios de "Comandos de memoria" (src/lib/kube/drills.ts) antes de compilar:
// ids únicos, módulo válido, textos completos, y que cada comando aceptado pase su propia corrección
// y no dispare ningún error del analizador (un ejercicio cuya solución el tutor marca como mala enseña mal).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DRILLS, PASO } from '../src/lib/kube/drills.ts';
import { analizar, comparar, canon, esqueleto } from '../src/lib/kube/analizador.ts';

const errores = [];
const ids = new Set();
for (const d of DRILLS) {
  const at = `ejercicio ${d.id}`;
  if (!/^\d\d-[a-z0-9-]+$/.test(d.id)) errores.push(`${at}: id con formato NN-nombre`);
  if (ids.has(d.id)) errores.push(`${at}: id repetido`);
  ids.add(d.id);
  if (Number(d.id.slice(0, 2)) !== d.mod || d.mod < 1 || d.mod > 12) errores.push(`${at}: el módulo (${d.mod}) no coincide con el id`);
  for (const k of ['tarea', 'idea', 'porque']) if (!d[k] || d[k].length < 15) errores.push(`${at}: falta ${k}`);
  if (!d.acepta.length) errores.push(`${at}: sin comandos aceptados`);
  const formas = new Set();
  for (const cmd of d.acepta) {
    if (!comparar(cmd, [cmd]).ok) errores.push(`${at}: «${cmd}» no pasa su propia corrección`);
    const malas = analizar(cmd).filter((n) => n.nivel === 'error');
    if (malas.length) errores.push(`${at}: el analizador rechaza «${cmd}» (${malas[0].clave})`);
    const forma = JSON.stringify(canon(cmd));
    if (formas.has(forma)) errores.push(`${at}: «${cmd}» equivale a otra variante aceptada (sobra)`);
    formas.add(forma);
    if (!esqueleto(cmd).includes('___') && cmd.split(' ').length > 4) errores.push(`${at}: el esqueleto de «${cmd}» no oculta nada`);
  }
  // la tarea no debe contener la respuesta
  if (d.acepta.some((cmd) => d.tarea.includes(cmd))) errores.push(`${at}: la tarea contiene el comando`);
}
// cada ejercicio enlazado a un paso del laboratorio: el paso existe y usa un comando con ese mismo verbo (y recurso)
const curso = fileURLToPath(new URL('../../curso/', import.meta.url));
const FENCE = '`'.repeat(3);
const bloques = new RegExp(FENCE + 'powershell\\r?\\n([\\s\\S]*?)' + FENCE, 'g');
const pasos = {};
for (const file of readdirSync(curso)) {
  const lab = readFileSync(curso + file, 'utf8').split(/^## /m).find((p) => /^Laboratorio/i.test(p));
  if (!lab) continue;
  pasos[Number(file.slice(0, 2))] = lab.split(/^### /m).slice(1)
    .map((t) => [...t.matchAll(bloques)].flatMap((m) => m[1].split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))));
}
for (const [id, n] of Object.entries(PASO)) {
  const d = DRILLS.find((x) => x.id === id);
  if (!d) { errores.push(`PASO: no existe el ejercicio ${id}`); continue; }
  const lines = pasos[d.mod]?.[n - 1];
  if (!lines) { errores.push(`PASO ${id}: el módulo ${d.mod} no tiene paso ${n}`); continue; }
  const e = canon(d.acepta[0]);
  const usa = lines.some((l) => { const a = canon(l); return a.bin === e.bin && a.verb === e.verb && (!e.kubectl || a.res === e.res); });
  if (!usa) errores.push(`PASO ${id}: el paso ${n} del módulo ${d.mod} ya no usa «${e.bin} ${e.verb}${e.res ? ' ' + e.res : ''}»`);
}
if (errores.length) { console.error(`validar-comandos: ${errores.length} problema(s)\n  ` + errores.join('\n  ')); process.exit(1); }
const porMod = Object.entries(Object.groupBy(DRILLS, (d) => d.mod)).map(([m, l]) => `${m}:${l.length}`).join(' ');
console.log(`validar-comandos: ${DRILLS.length} ejercicios correctos (${porMod}); ${Object.keys(PASO).length} enlazados a un paso del laboratorio`);
