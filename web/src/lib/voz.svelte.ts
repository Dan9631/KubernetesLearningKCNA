// Lectura en voz alta con la voz del propio navegador (Web Speech API): gratis, sin servidor.
// Las preguntas se leen con voz en inglés (como el examen) y las explicaciones con voz en español.
// Un solo lector por página: empezar a leer algo detiene lo anterior.

export type Lang = 'es' | 'en';
export interface Part { text: string; lang: Lang }
export interface VoiceInfo { name: string; lang: string; score: number }
interface Prefs { es: string; en: string; rate: number }

const KEY = 'kcna.voz.v1';
const MAX_CHUNK = 220; // Chrome corta las frases largas: se lee por trozos

function loadPrefs(): Prefs {
  const def: Prefs = { es: '', en: '', rate: 1 };
  if (typeof localStorage === 'undefined') return def;
  try { return { ...def, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return def; }
}

export const voz = $state({
  supported: false,
  voices: [] as VoiceInfo[],
  /** qué se está leyendo ('' = nada); cada botón usa su propia clave */
  key: '',
  status: 'idle' as 'idle' | 'playing' | 'paused',
  part: 0,
  total: 0,
  prefs: loadPrefs(),
});

const byName = new Map<string, SpeechSynthesisVoice>();
let chunks: { text: string; lang: Lang; part: number }[] = [];
let at = 0;
let run = 0; // cada play/stop invalida los eventos de lecturas anteriores
let current: SpeechSynthesisUtterance | null = null; // referencia viva: si se recolecta, Chrome no avisa del final

// Las voces neuronales ("Natural" de Edge, "Premium"/"Mejorada" de Apple, Google) suenan mucho mejor
function score(v: SpeechSynthesisVoice): number {
  let s = 0;
  if (/natural/i.test(v.name)) s += 50;
  if (/premium/i.test(v.name)) s += 40;
  if (/enhanced|mejorada|siri/i.test(v.name)) s += 35;
  if (/google/i.test(v.name)) s += 20;
  if (!v.localService) s += 5;
  if (/^es-(MX|US|419|GT|CO|AR)/i.test(v.lang) || /^en-US/i.test(v.lang)) s += 3; // español latino e inglés de EE. UU.
  return s;
}

function loadVoices() {
  const list = speechSynthesis.getVoices().filter((v) => /^(es|en)\b/i.test(v.lang));
  byName.clear();
  for (const v of list) byName.set(v.name, v);
  voz.voices = list.map((v) => ({ name: v.name, lang: v.lang, score: score(v) })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  voz.supported = voz.voices.length > 0;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
  window.addEventListener('pagehide', () => speechSynthesis.cancel());
}

export const voicesFor = (lang: Lang) => voz.voices.filter((v) => v.lang.toLowerCase().startsWith(lang));

/** Voz elegida por el alumno o, si no hay, la de mejor calidad para ese idioma */
export function voiceFor(lang: Lang): SpeechSynthesisVoice | undefined {
  return byName.get(voz.prefs[lang]) ?? byName.get(voicesFor(lang)[0]?.name ?? '');
}

export function setPref<K extends keyof Prefs>(k: K, v: Prefs[K]) {
  voz.prefs[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(voz.prefs)); } catch { /* sin almacenamiento */ }
}

// Trozos de hasta MAX_CHUNK caracteres, cortando por frase y, si no alcanza, por coma o espacio
function split(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').replace(/[→⇒]/g, ', ').trim();
  if (!clean) return [];
  const out: string[] = [];
  let buf = '';
  for (const s of clean.match(/[^.!?;:]+[.!?;:]*\s*/g) ?? [clean]) {
    if ((buf + s).length <= MAX_CHUNK) { buf += s; continue; }
    if (buf) out.push(buf.trim());
    buf = s;
    while (buf.length > MAX_CHUNK) {
      const cut = Math.max(buf.lastIndexOf(', ', MAX_CHUNK - 2), buf.lastIndexOf(' ', MAX_CHUNK));
      const n = cut > 40 ? cut + 1 : MAX_CHUNK;
      out.push(buf.slice(0, n).trim());
      buf = buf.slice(n);
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function speakFrom(i: number) {
  const id = ++run;
  speechSynthesis.cancel();
  at = i;
  const c = chunks[i];
  if (!c) { finish(); return; }
  voz.status = 'playing';
  voz.part = c.part;
  const u = new SpeechSynthesisUtterance(c.text);
  const v = voiceFor(c.lang);
  if (v) u.voice = v;
  u.lang = v?.lang ?? (c.lang === 'es' ? 'es-MX' : 'en-US');
  u.rate = voz.prefs.rate;
  u.onend = () => { if (id === run) speakFrom(i + 1); };
  u.onerror = (e) => { if (id === run && e.error !== 'interrupted' && e.error !== 'canceled') speakFrom(i + 1); };
  current = u;
  // speak() debe ir en el mismo clic: iOS no deja empezar a hablar fuera de un gesto del usuario
  speechSynthesis.speak(u);
}

function finish() {
  run++;
  current = null;
  voz.key = ''; voz.status = 'idle'; voz.part = 0; voz.total = 0;
}

/** Empieza a leer `parts` (desde la parte `from`); detiene cualquier otra lectura */
export function play(key: string, parts: Part[], from = 0) {
  if (!voz.supported) return;
  chunks = parts.flatMap((p, k) => split(p.text).map((text) => ({ text, lang: p.lang, part: k })));
  voz.key = key;
  voz.total = parts.length;
  const start = chunks.findIndex((c) => c.part >= from);
  speakFrom(start < 0 ? chunks.length : start);
}

// Pausar = cancelar y recordar el trozo: speechSynthesis.pause() falla en Android y con las voces en línea
export function pause() {
  if (voz.status !== 'playing') return;
  run++;
  speechSynthesis.cancel();
  voz.status = 'paused';
}

export function resume() { if (voz.status === 'paused') speakFrom(at); }

export function stop() {
  if (!voz.key) return;
  speechSynthesis.cancel();
  finish();
}

/** Salta a otra parte (párrafo) de lo que se está leyendo */
export function jump(part: number) {
  if (!voz.key) return;
  const i = chunks.findIndex((c) => c.part >= Math.max(0, part));
  if (i >= 0) speakFrom(i);
}

// Preguntas: enunciado y opciones en inglés, como en el examen (letters: A, B, C… en vez de 1, 2, 3…)
const optName = (k: number, letters: boolean) => (letters ? 'ABCDE'[k] : String(k + 1));

export function questionParts(q: string, options: string[], picks: number, letters = false): Part[] {
  return [
    { text: picks > 1 ? `${q} Choose ${picks}.` : q, lang: 'en' },
    ...options.map((o, k) => ({ text: `Option ${optName(k, letters)}. ${o}`, lang: 'en' as Lang })),
  ];
}

/** Respuesta correcta en inglés y explicación en español */
export function answerParts(options: string[], answer: number[], explanation: string, letters = false): Part[] {
  const ans = answer.map((k) => `${optName(k, letters)}: ${options[k]}`).join('. ');
  return [
    { text: `Correct answer${answer.length > 1 ? 's' : ''}. ${ans}.`, lang: 'en' },
    { text: explanation, lang: 'es' },
  ];
}

/** Frase corta para probar una voz desde los ajustes */
export function sample(lang: Lang) {
  play('muestra', [lang === 'es'
    ? { text: 'Hola. Así sonará la explicación de cada pregunta.', lang }
    : { text: 'Which Kubernetes component assigns Pods to nodes?', lang }]);
}
