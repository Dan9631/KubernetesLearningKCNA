// Convierte quiz/preguntas.js y quiz/flashcards.js (scripts de navegador) en JSON importable por el sitio.
// Se ejecuta antes de dev y build (ver package.json).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const quizDir = join(here, '..', '..', 'quiz');
const out = join(here, '..', 'src', 'data');
mkdirSync(out, { recursive: true });

function load(file, key) {
  const src = readFileSync(join(quizDir, file), 'utf8');
  const win = {};
  new Function('window', src)(win);
  return win[key];
}

const preguntas = load('preguntas.js', 'KCNA_QUESTIONS');
const flashcards = load('flashcards.js', 'KCNA_FLASHCARDS');
writeFileSync(join(out, 'preguntas.json'), JSON.stringify(preguntas));
writeFileSync(join(out, 'flashcards.json'), JSON.stringify(flashcards));
console.log(`sync-data: ${preguntas.length} preguntas, ${flashcards.length} flashcards`);
