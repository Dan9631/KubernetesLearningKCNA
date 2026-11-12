// Convierte un banco de preguntas en JSON en las sentencias SQL que lo cargan en la tabla `pregunta`.
// Uso: node scripts/banco-examen.mjs <banco.json> [salida.sql]
//
// El archivo es una lista de preguntas con este formato (el mismo del banco de práctica):
//   [{ "q": "enunciado", "options": ["a", "b", "c", "d"], "answer": [2] }, …]
// `answer` son las posiciones (desde 0) de las opciones correctas; con más de una, hay que marcarlas todas.
//
// El banco del examen NO debe subirse al repositorio: guárdalo como `banco-examen.json` en esta carpeta
// (está en .gitignore). El .sql generado se pega en la consola de la base D1 o se ejecuta con
// `npx wrangler d1 execute kcna-sync --remote --file=banco-examen.sql`.
// Volver a cargarlo reemplaza las preguntas con el mismo número y retira las que ya no estén en el archivo.
import { readFileSync, writeFileSync } from 'node:fs';

const [entrada, salida = 'banco-examen.sql'] = process.argv.slice(2);
if (!entrada) { console.error('Uso: node scripts/banco-examen.mjs <banco.json> [salida.sql]'); process.exit(1); }

let banco;
try {
  banco = JSON.parse(readFileSync(entrada, 'utf8'));
} catch (e) {
  console.error(e.code === 'ENOENT'
    ? `No existe ${entrada}. Ese archivo lo escribes tú: una lista de preguntas con el formato que explica la cabecera de este script.`
    : `${entrada} no es JSON válido: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(banco)) { console.error('El archivo debe ser una lista de preguntas.'); process.exit(1); }

const errores = [];
banco.forEach((p, i) => {
  const n = `Pregunta ${i + 1}`;
  if (typeof p?.q !== 'string' || !p.q.trim()) errores.push(`${n}: falta el enunciado (q)`);
  if (!Array.isArray(p?.options) || p.options.length < 2 || p.options.length > 12 || p.options.some((o) => typeof o !== 'string' || !o.trim())) errores.push(`${n}: options debe tener entre 2 y 12 textos`);
  else if (!Array.isArray(p.answer) || !p.answer.length || new Set(p.answer).size !== p.answer.length || p.answer.some((a) => !Number.isInteger(a) || a < 0 || a >= p.options.length)) errores.push(`${n}: answer debe listar posiciones válidas de options, sin repetir`);
});
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }

const txt = (s) => `'${String(s).replace(/'/g, "''")}'`;
const lineas = banco.map((p, i) =>
  `INSERT OR REPLACE INTO pregunta (id, texto, opciones, correctas, activa) VALUES (${i + 1}, ${txt(p.q.trim())}, ${txt(JSON.stringify(p.options))}, ${txt(JSON.stringify([...p.answer].sort((a, b) => a - b)))}, 1);`);
lineas.push(`UPDATE pregunta SET activa = 0 WHERE id > ${banco.length};`);
writeFileSync(salida, lineas.join('\n') + '\n');

console.log(`${banco.length} preguntas escritas en ${salida}.`);
if (banco.length < 30) console.log('Aviso: el examen necesita al menos 30 preguntas activas; con menos no se puede empezar.');
else if (banco.length < 90) console.log('Aviso: con menos de 90 preguntas, tres intentos enseñan casi todo el banco. Cuantas más, mejor.');
