// Valida src/data/comprueba.json antes de compilar: cada predicción apunta a una simulación registrada,
// cada comprobación a un encabezado ### de "## Conceptos" de su módulo, y el formato es el esperado.
// Falla el build si algo no cuadra (así una comprobación nunca desaparece en silencio).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'comprueba.json'), 'utf8'));
const registry = readFileSync(join(here, '..', 'src', 'sims', 'registry.ts'), 'utf8');
const cursoDir = join(here, '..', '..', 'curso');
const errors = [];

// simulaciones registradas: "N: [ { id: '...' ..." → "0N:id"
const sims = new Set();
for (const block of registry.matchAll(/^\s*(\d+): \[([\s\S]*?)^\s*\],/gm)) {
  for (const m of block[2].matchAll(/id: '([^']+)'/g)) sims.add(`${block[1].padStart(2, '0')}:${m[1]}`);
}

function checkShape(where, c) {
  if (typeof c.q !== 'string' || !c.q.trim() || c.q.length > 200) errors.push(`${where}: q vacía o demasiado larga`);
  if (!Array.isArray(c.options) || c.options.length < 3 || c.options.length > 4) errors.push(`${where}: debe tener 3 o 4 opciones`);
  else {
    if (new Set(c.options).size !== c.options.length) errors.push(`${where}: opciones repetidas`);
    if (c.options.some((o) => typeof o !== 'string' || !o.trim() || o.length > 120)) errors.push(`${where}: opción vacía o demasiado larga`);
  }
  if (!Number.isInteger(c.answer) || c.answer < 0 || c.answer >= (c.options?.length ?? 0)) errors.push(`${where}: answer fuera de rango`);
  if (typeof c.why !== 'string' || !c.why.trim() || c.why.length > 320) errors.push(`${where}: why vacío o demasiado largo`);
}

for (const [key, c] of Object.entries(data.predicciones ?? {})) {
  if (!sims.has(key)) errors.push(`predicción ${key}: no hay simulación registrada con esa clave`);
  checkShape(`predicción ${key}`, c);
}

const files = readdirSync(cursoDir).filter((f) => /^\d\d-.*\.md$/.test(f));
const norm = (s) => s.replace(/`/g, '').replace(/\s+/g, ' ').trim();
let total = 0;
for (const [mod, list] of Object.entries(data.comprobaciones ?? {})) {
  const file = files.find((f) => f.startsWith(`${mod}-`));
  if (!file) { errors.push(`comprobaciones ${mod}: no existe curso/${mod}-*.md`); continue; }
  const md = readFileSync(join(cursoDir, file), 'utf8');
  const conceptos = md.split(/^## /m).find((s) => /^Conceptos\s*$/m.test(s.split('\n')[0])) ?? '';
  const heads = new Set([...conceptos.matchAll(/^### (.+)$/gm)].map((m) => norm(m[1])));
  list.forEach((c, i) => {
    total++;
    if (!heads.has(norm(c.after ?? ''))) errors.push(`comprobación ${mod}#${i + 1}: "${c.after}" no es un ### de Conceptos en ${file}`);
    checkShape(`comprobación ${mod}#${i + 1}`, c);
  });
}

if (errors.length) {
  console.error(`validar-comprueba: ${errors.length} error(es)\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`validar-comprueba: ${Object.keys(data.predicciones ?? {}).length} predicciones, ${total} comprobaciones`);
