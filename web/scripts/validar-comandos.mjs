// Valida los ejercicios de "Comandos de memoria" (src/lib/kube/drills.ts) antes de compilar:
// ids únicos, módulo válido, textos completos, y que cada comando aceptado pase su propia corrección
// y no dispare ningún error del analizador (un ejercicio cuya solución el tutor marca como mala enseña mal).
import { DRILLS } from '../src/lib/kube/drills.ts';
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
if (errores.length) { console.error(`validar-comandos: ${errores.length} problema(s)\n  ` + errores.join('\n  ')); process.exit(1); }
const porMod = Object.entries(Object.groupBy(DRILLS, (d) => d.mod)).map(([m, l]) => `${m}:${l.length}`).join(' ');
console.log(`validar-comandos: ${DRILLS.length} ejercicios correctos (${porMod})`);
