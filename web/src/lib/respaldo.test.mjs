// Prueba del respaldo en archivo: node src/lib/respaldo.test.mjs
import { makeBackup, parseBackup, sanitize, summary, isEmpty, aviso, backupName, APP, MAX_BYTES } from './respaldo.ts';

let n = 0; let failures = 0;
const check = (name, cond, extra = '') => { n++; if (cond) console.log(`ok ${n}: ${name}`); else { failures++; console.log(`\nFALLO ${n}: ${name}\n  ${extra}`); } };
const falla = (name, text, frag) => {
  let msg = '';
  try { parseBackup(text); } catch (e) { msg = e.message; }
  check(name, msg.includes(frag), `mensaje: «${msg}»`);
};

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 10, 9, 0).getTime();
const p = {
  steps: { '04': ['1', '2'] }, done: ['01', '02'], sims: ['04:scheduler'],
  quiz: {
    'q-001': { seen: 3, ok: 2, last: true, first: false, at: NOW - 9 * DAY, box: 3, due: NOW + 7 * DAY, conf: { s: [2, 0], a: [0, 1] } },
    'cmd:get-pods': { seen: 1, ok: 1, last: true, box: 1, due: NOW + DAY },
  },
  exams: [{ date: NOW - DAY, score: 78, ok: 47, total: 60, secs: 3200, doms: { fundamentals: [20, 26] } }, { date: NOW - 5 * DAY, score: 70, ok: 42, total: 60, secs: 4000, kind: 'final' }],
  known: ['Pod'], env: ['kubectl'], plan: ['w1:m01'], ready: [],
  reading: { '02': { last: { i: 10, n: 80, t: NOW, txt: 'El API server' }, far: { i: 40, n: 80, t: NOW - DAY } } },
  retos: ['term:crear'],
  days: ['2026-11-08', '2026-11-09', '2026-11-10'], exam: { date: '2026-12-15', t: NOW }, resetAt: NOW - 30 * DAY,
};

// ida y vuelta
const text = makeBackup(p, NOW);
const back = parseBackup(text);
check('exportar e importar devuelve el mismo progreso', JSON.stringify(back.progress) === JSON.stringify({ ...p, exams: [...p.exams].sort((a, b) => a.date - b.date) }), JSON.stringify(back.progress));
check('conserva la fecha de exportación', back.exported === NOW);
check('el archivo lleva la marca de la app', JSON.parse(text).app === APP);
check('nombre del archivo con fecha local', backupName(NOW) === 'kcna-progreso-2026-11-10.json', backupName(NOW));

const s = summary(back.progress);
check('resumen: preguntas y comandos por separado', s.questions === 1 && s.commands === 1 && s.modules === 2 && s.exams === 2 && s.days === 3 && s.lastDay === '2026-11-10', JSON.stringify(s));

// archivos que no sirven
falla('rechaza texto que no es JSON', 'hola', 'JSON');
falla('rechaza JSON de otra cosa', '{"a":1}', 'no es una copia del progreso');
falla('rechaza un JSON que es una lista', '[1,2]', 'no es una copia del progreso');
falla('rechaza otra app', JSON.stringify({ app: 'otra', v: 1, progress: p }), 'no es una copia del progreso');
falla('rechaza una versión más nueva', JSON.stringify({ app: APP, v: 99, progress: p }), 'versión más nueva');
falla('rechaza una copia vacía', JSON.stringify({ app: APP, v: 1, progress: {} }), 'vacía');
falla('rechaza un archivo enorme', ' '.repeat(MAX_BYTES + 1), 'demasiado grande');

// saneado: solo pasa lo que tiene forma de progreso
const sucio = sanitize({
  done: ['01', 7, null, '01'], sims: 'x', known: { a: 1 },
  steps: { '04': ['1', 2], ['__proto__']: ['x'] },
  quiz: { ok1: { seen: 1, ok: 1, last: true, box: 9, conf: { s: [1, 0], z: [1, 1], d: 'x' } }, mal: { seen: 'x' }, mal2: 5 },
  exams: [{ date: 1, score: 2, ok: 3, total: 4, secs: 5, kind: 'otro' }, { date: 'x' }, null],
  reading: { '02': { last: { i: 1, n: 2, t: 3 } }, '03': { last: { i: 1, n: 2, t: 3 }, far: { i: 1, n: 2, t: 3, txt: 9 } } },
  days: ['2026-11-10', 'ayer', '2026-11-01'], exam: { date: 'pronto', t: 1 }, resetAt: 'x', extra: '<script>',
});
check('listas: quita lo que no es texto y los repetidos', JSON.stringify(sucio.done) === '["01"]' && sucio.sims.length === 0 && sucio.known.length === 0);
check('pasos: solo textos y sin claves peligrosas', JSON.stringify(sucio.steps) === '{"04":["1"]}' && !Object.hasOwn(sucio.steps, '__proto__'), JSON.stringify(sucio.steps));
check('quiz: descarta entradas mal formadas', Object.keys(sucio.quiz).join() === 'ok1');
check('quiz: caja fuera de rango y confianzas desconocidas fuera', sucio.quiz.ok1.box === undefined && JSON.stringify(sucio.quiz.ok1.conf) === '{"s":[1,0]}', JSON.stringify(sucio.quiz.ok1));
check('exámenes: solo los completos, sin kind inventado', sucio.exams.length === 1 && sucio.exams[0].kind === undefined);
check('lectura: exige last y far', Object.keys(sucio.reading).join() === '03' && sucio.reading['03'].far.txt === undefined);
check('días: solo fechas ISO, ordenadas', JSON.stringify(sucio.days) === '["2026-11-01","2026-11-10"]');
check('fecha de examen y borrado inválidos fuera', sucio.exam === undefined && sucio.resetAt === undefined);
check('campos desconocidos fuera', !('extra' in sucio));
check('isEmpty reconoce el progreso vacío', isEmpty(sanitize({})) && !isEmpty(back.progress));
check('sanitize tolera valores que no son objetos', isEmpty(sanitize(null)) && isEmpty(sanitize('x')) && isEmpty(sanitize([1])));

// aviso
const base = { days: 5, done: 0, syncAvailable: true, syncOn: false, codeSaved: false, exported: 0, snoozed: 0, now: NOW };
check('aviso: con progreso y sin respaldo, activar', aviso(base) === 'activar');
check('aviso: sin sincronización en el sitio, archivo', aviso({ ...base, syncAvailable: false }) === 'archivo');
check('aviso: poco progreso, nada', aviso({ ...base, days: 2 }) === null);
check('aviso: un módulo terminado ya cuenta', aviso({ ...base, days: 1, done: 1 }) === 'activar');
check('aviso: pospuesto hace 3 días, nada', aviso({ ...base, snoozed: NOW - 3 * DAY }) === null);
check('aviso: pospuesto hace 8 días, vuelve', aviso({ ...base, snoozed: NOW - 8 * DAY }) === 'activar');
check('aviso: copia en archivo reciente, nada', aviso({ ...base, exported: NOW - 5 * DAY }) === null);
check('aviso: copia en archivo antigua, vuelve', aviso({ ...base, exported: NOW - 20 * DAY }) === 'activar');
check('aviso: sincronizando con el código guardado, nada', aviso({ ...base, syncOn: true, codeSaved: true }) === null);
check('aviso: sincronizando sin guardar el código', aviso({ ...base, syncOn: true }) === 'codigo');
check('aviso: código sin guardar pospuesto, nada', aviso({ ...base, syncOn: true, snoozed: NOW - DAY }) === null);

console.log(`\n${n - failures}/${n} pruebas correctas`);
if (failures) process.exit(1);
