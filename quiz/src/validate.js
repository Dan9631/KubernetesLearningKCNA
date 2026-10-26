global.window = {};
require(require('path').join(__dirname, '..', 'preguntas.js'));
require(require('path').join(__dirname, '..', 'flashcards.js'));
const q = window.KCNA_QUESTIONS, fc = window.KCNA_FLASHCARDS;
const DOM = ['fundamentals', 'orchestration', 'delivery', 'architecture'];
const PRE = { fundamentals: 'F', orchestration: 'O', delivery: 'D', architecture: 'A' };
const errs = [];
const ids = new Set();
const byDom = {}, byTopic = {}, pos = { single: [0, 0, 0, 0], multi: [0, 0, 0, 0] };
let multi = 0, multiNoHint = 0;
const noSource = [];
// Dominios aceptados como fuente: docs oficiales de Kubernetes, CNCF, Linux Foundation y de cada proyecto
const OFFICIAL = /^https:\/\/([a-z0-9-]+\.)*(kubernetes\.io|k8s\.io|cncf\.io|linuxfoundation\.org|github\.com\/(kubernetes|kubernetes-sigs|cncf|opencontainers|containernetworking|container-storage-interface|opengitops|argoproj|fluxcd|helm|prometheus|open-telemetry|istio|linkerd|envoyproxy|kedacore|knative|containerd|etcd-io|coredns|cilium|projectcalico)\/|prometheus\.io|opentelemetry\.io|helm\.sh|argo-cd\.readthedocs\.io|argoproj\.github\.io|fluxcd\.io|opengitops\.dev|istio\.io|linkerd\.io|envoyproxy\.io|gateway-api\.sigs\.k8s\.io|keda\.sh|knative\.dev|opencontainers\.org|containerd\.io|etcd\.io|coredns\.io|cilium\.io|docs\.tigera\.io|kubectl\.docs\.kubernetes\.io|kustomize\.io|podman\.io|docs\.podman\.io|docs\.docker\.com|man7\.org\/linux\/man-pages|cd\.foundation|kubernetes-csi\.github\.io|tekton\.dev|backstage\.io|kind\.sigs\.k8s\.io|opencost\.io|grafana\.com\/docs|jaegertracing\.io|fluentbit\.io|docs\.fluentd\.org|falco\.org|sre\.google|12factor\.net|landscape\.cncf\.io|glossary\.cncf\.io|contribute\.cncf\.io|tag-[a-z-]+\.cncf\.io)\b/;
for (const x of q) {
  if (ids.has(x.id)) errs.push('dup id ' + x.id); ids.add(x.id);
  if (!DOM.includes(x.domain)) errs.push(x.id + ' bad domain');
  if (!/^[FODA]\d{3}$/.test(x.id) || x.id[0] !== PRE[x.domain]) errs.push(x.id + ' bad id/prefix');
  if (!x.topic) errs.push(x.id + ' no topic');
  if (!(Number.isInteger(x.module) && x.module >= 1 && x.module <= 12)) errs.push(x.id + ' bad module');
  if (!x.q || !x.q.trim()) errs.push(x.id + ' empty q');
  if (!Array.isArray(x.options) || x.options.length < 3) errs.push(x.id + ' options<3');
  if (new Set(x.options).size !== x.options.length) errs.push(x.id + ' dup options');
  if (!Array.isArray(x.answer) || !x.answer.length || x.answer.some(i => !Number.isInteger(i) || i < 0 || i >= x.options.length) || new Set(x.answer).size !== x.answer.length) errs.push(x.id + ' bad answer');
  if (!x.explanation || !x.explanation.trim()) errs.push(x.id + ' empty explanation');
  // Fuente oficial obligatoria: documentación de Kubernetes, CNCF o del propio proyecto
  if (!Array.isArray(x.source) || !x.source.length) noSource.push(x.id);
  else for (const u of x.source) if (!OFFICIAL.test(u)) errs.push(x.id + ' source no oficial: ' + u);
  const isMulti = x.answer.length > 1;
  const hint = /\((Choose|Select) (two|2)\)/i.test(x.q);
  if (isMulti !== hint) errs.push(x.id + ' multi/hint mismatch');
  if (isMulti) { multi++; x.answer.forEach(i => pos.multi[i]++); } else pos.single[x.answer[0]]++;
  byDom[x.domain] = (byDom[x.domain] || 0) + 1;
  const k = x.domain + ' / ' + x.topic; byTopic[k] = (byTopic[k] || 0) + 1;
}
const fdom = {};
fc.forEach((c, i) => {
  if (!c.term || !c.def || !DOM.includes(c.domain) || !(c.module >= 1 && c.module <= 12)) errs.push('flashcard ' + i + ' invalid');
  if (!c.source) errs.push('flashcard ' + c.term + ' sin fuente');
  else if (!OFFICIAL.test(c.source)) errs.push('flashcard ' + c.term + ' source no oficial: ' + c.source);
  fdom[c.domain] = (fdom[c.domain] || 0) + 1;
});
const terms = fc.map(c => c.term.toLowerCase());
if (new Set(terms).size !== terms.length) errs.push('duplicate flashcard terms');
console.log('Questions:', q.length, 'unique ids:', ids.size);
console.log('By domain:', byDom);
console.log('By topic:'); Object.entries(byTopic).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
console.log('Multi-answer:', multi, '(' + (100 * multi / q.length).toFixed(1) + '%)');
console.log('Answer positions A-D (single):', pos.single.join(' / '));
console.log('Answer positions A-D (multi, per index):', pos.multi.join(' / '));
console.log('Flashcards:', fc.length, fdom);
console.log('Con fuente oficial:', q.length - noSource.length, '/', q.length + (noSource.length ? '  (sin fuente: ' + noSource.slice(0, 12).join(', ') + (noSource.length > 12 ? ', ...' : '') + ')' : ''));
if (process.argv.includes('--strict') && noSource.length) errs.push(noSource.length + ' preguntas sin fuente');
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'VALIDATION OK');
if (errs.length) process.exitCode = 1;   // para que CI falle
