// Genera quiz/preguntas.js y quiz/flashcards.js a partir de los src_*.js
const path = require('path');
const fs = require('fs');
const dir = __dirname;
const OUT = path.join(__dirname, '..');

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261023);
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
let bag = [];
function nextTarget(n) { if (!bag.length) bag = shuffle([0, 1, 2, 3]); return bag.shift() % n; }

const domains = [['fundamentals', 'F', 'src_f.js'], ['orchestration', 'O', 'src_o.js'], ['delivery', 'D', 'src_d.js'], ['architecture', 'A', 'src_a.js']];
const qs = [];
for (const [dom, pre, file] of domains) {
  require(path.join(dir, file)).forEach((r, i) => {
    const [topic, module, q, opts, ans, explanation] = r;
    if (new Set(opts).size !== opts.length) throw new Error('duplicate option in ' + q);
    const correct = new Set(ans.map(k => opts[k]));
    let o;
    if (opts.every(x => /^\d/.test(x))) o = opts.slice().sort((a, b) => parseFloat(a) - parseFloat(b));
    else if (ans.length === 1) { const c = opts[ans[0]]; o = shuffle(opts.filter((_, k) => k !== ans[0])); o.splice(nextTarget(opts.length), 0, c); }
    else o = shuffle(opts);
    const answer = o.map((x, k) => correct.has(x) ? k : -1).filter(k => k >= 0);
    qs.push({ id: pre + String(i + 1).padStart(3, '0'), domain: dom, topic, module, q, options: o, answer, explanation });
  });
}

const J = JSON.stringify;
let s = '// Banco de preguntas de práctica KCNA (Kubernetes and Cloud Native Associate)\n' +
  '// Temario CNCF vigente desde nov-2025. Preguntas y opciones en inglés; explicaciones en español.\n' +
  '// answer: índices 0-based de las opciones correctas (más de uno => multi-respuesta).\n' +
  '// Total: ' + qs.length + ' preguntas.\n' +
  'window.KCNA_QUESTIONS = [\n' +
  qs.map(x => '  {\n' +
    '    id: ' + J(x.id) + ',\n' +
    '    domain: ' + J(x.domain) + ',\n' +
    '    topic: ' + J(x.topic) + ',\n' +
    '    module: ' + x.module + ',\n' +
    '    q: ' + J(x.q) + ',\n' +
    '    options: [\n      ' + x.options.map(J).join(',\n      ') + '\n    ],\n' +
    '    answer: ' + J(x.answer) + ',\n' +
    '    explanation: ' + J(x.explanation) + '\n' +
    '  }').join(',\n') + '\n];\n';
fs.writeFileSync(path.join(OUT, 'preguntas.js'), s, 'utf8');

const fc = require(path.join(dir, 'src_fc.js')).map(([term, def, domain, module]) => ({ term, def, domain, module }));
let f = '// Flashcards KCNA: término en inglés, definición en español.\n' +
  '// Total: ' + fc.length + ' tarjetas.\n' +
  'window.KCNA_FLASHCARDS = [\n' +
  fc.map(x => '  { term: ' + J(x.term) + ', def: ' + J(x.def) + ', domain: ' + J(x.domain) + ', module: ' + x.module + ' }').join(',\n') + '\n];\n';
fs.writeFileSync(path.join(OUT, 'flashcards.js'), f, 'utf8');
console.log('questions', qs.length, 'flashcards', fc.length);
