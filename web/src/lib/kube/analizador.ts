// Analizador de comandos del curso. Dos usos:
//   analizar(línea, clúster?)   explica POR QUÉ un comando está mal escrito (la Terminal lo muestra como "Tutor").
//   comparar(intento, aceptados) corrige un comando escrito de memoria contra los que se aceptan, parte por parte
//                               (verbo, recurso, nombre, flags), sin ejecutar nada: sirve para labs estáticos
//                               (helm, podman, kcna.ps1 y los kubectl que el simulador no modela).
// No depende de kubectl.ts (que sí depende de este archivo).
import { type Cluster, PRELOADED_IMAGES } from './cluster.ts';
import { parseFlags, kindOf, KINDS, SHORT, VALUE, BOOL_IN, flag, has, listOf, parseSelector, type Parsed } from './common.ts';
import { tokenize } from './exec.ts';

export interface Nota {
  nivel: 'error' | 'aviso';
  clave: string;
  /** explicación en español: qué pasa y por qué */
  msg: string;
  /** comando corregido (la interfaz lo ofrece tras la explicación, no antes) */
  fix?: string;
  /** mensaje que imprimiría kubectl de verdad; si existe, el simulador rechaza el comando con él */
  real?: string;
}

// ---------- utilidades ----------
/** Distancia de edición; la transposición de dos letras vecinas ("gte" por "get") cuenta como un solo error. */
export function dist(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}

/** La palabra de `lista` más parecida a `w`, si está a 1 error (palabras cortas) o 2 (de 5 letras o más). */
export function cercano(w: string, lista: Iterable<string>, max = w.length >= 5 ? 2 : 1): string | undefined {
  let best: string | undefined; let bd = max + 1;
  for (const x of lista) { if (Math.abs(x.length - w.length) > max) continue; const d = dist(w, x); if (d < bd) { bd = d; best = x; } }
  return best;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Sustituye la primera aparición de un token completo en la línea. */
const sust = (line: string, viejo: string, nuevo: string) => line.replace(new RegExp(`(^|\\s)${esc(viejo)}(?=\\s|=|$)`), `$1${nuevo}`);
/** Primer tramo de la línea (antes de una tubería fuera de comillas) y el resto. */
function tramos(line: string): [string, string] {
  let q: string | null = null;
  for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === q) q = null; continue; } if (ch === '"' || ch === "'") { q = ch; continue; } if (ch === '|') return [line.slice(0, i), line.slice(i)]; }
  return [line, ''];
}

export const VERBOS = ['annotate', 'api-resources', 'api-versions', 'apply', 'attach', 'auth', 'autoscale', 'certificate', 'cluster-info', 'completion', 'config', 'cordon', 'cp', 'create', 'debug', 'delete', 'describe', 'diff', 'drain', 'edit', 'events', 'exec', 'explain', 'expose', 'get', 'help', 'kustomize', 'label', 'logs', 'options', 'patch', 'plugin', 'port-forward', 'proxy', 'replace', 'rollout', 'run', 'scale', 'set', 'taint', 'top', 'uncordon', 'version', 'wait'];

/** Flags largos que kubectl conoce (unión de los comandos del curso). Solo se marca como desconocido lo que se parece a uno de estos. */
const BOOLEANOS = ['all', 'all-namespaces', 'all-containers', 'allow-missing-template-keys', 'append-hash', 'attach', 'cached', 'client', 'containers', 'current', 'delete-emptydir-data', 'disable-eviction', 'dry-run', 'edit-last-applied', 'expose', 'flatten', 'follow', 'force', 'force-conflicts', 'help', 'ignore-daemonsets', 'ignore-errors', 'ignore-not-found', 'insecure-skip-tls-verify', 'leave-stdin-open', 'list', 'local', 'merge', 'minify', 'namespaced', 'no-headers', 'now', 'output-watch-events', 'overwrite', 'prefix', 'previous', 'privileged', 'prune', 'quiet', 'raw', 'record', 'recursive', 'rm', 'save-config', 'server-side', 'short', 'show-events', 'show-kind', 'show-labels', 'show-managed-fields', 'stdin', 'tcp', 'timestamps', 'tty', 'validate', 'wait', 'watch', 'watch-only', 'windows-line-endings'];
const OTROS_VALOR = ['api-group', 'as-group', 'audience', 'bound-object-kind', 'cache-dir', 'cert', 'certificate-authority', 'class', 'client-certificate', 'client-key', 'clusterrole', 'container', 'default-backend', 'docker-email', 'docker-password', 'docker-server', 'docker-username', 'duration', 'field-manager', 'group', 'hard', 'key', 'limit-bytes', 'load-balancer-ip', 'max-log-requests', 'node-port', 'password', 'patch', 'patch-file', 'profile', 'request-timeout', 'resource-version', 'role', 'rule', 'scopes', 'session-affinity', 'since-time', 'subresource', 'tls-server-name', 'token', 'type', 'username', 'v', 'verbs', 'allow-privilege-escalation', 'env-from', 'set-image', 'mode', 'ttl', 'from', 'prefix-length', 'to', 'tolerations', 'node-name', 'address', 'pod-selector', 'match', 'http-method', 'jsonpath', 'value', 'description', 'preemption-policy', 'global-default', 'min-available', 'max-unavailable', 'max-surge'];
const CONOCIDOS = new Set<string>([...VALUE, ...BOOLEANOS, ...OTROS_VALOR]);
/** Flags con valor cuyo valor nunca empieza por guion: si les sigue otro flag, falta el valor. */
const ESTRICTOS = new Set(['namespace', 'output', 'image', 'replicas', 'selector', 'port', 'type', 'filename', 'container', 'name']);

interface Cmd { tokens: string[]; bin: string; verb: string; p: Parsed }
function leer(line: string): Cmd {
  const tokens = tokenize(tramos(line.trim())[0].trim());
  const bin = tokens[0] ?? '';
  const first = parseFlags(tokens.slice(1));
  const verb = first.args[0] ?? '';
  const p = parseFlags(tokens.slice(1), verb);
  p.args = p.args.slice(1);
  return { tokens, bin, verb, p };
}

/** Errores de flags que kubectl rechaza antes de hablar con el clúster (los usa también el simulador). */
export function erroresDeFlags(line: string, verb: string, tokens: string[]): Nota[] {
  const out: Nota[] = [];
  const esValor = (k: string) => VALUE.has(k) && !BOOL_IN[verb]?.has(k) && k !== 'dry-run';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]; const next = tokens[i + 1];
    if (t === '--') break;
    if (t.startsWith('--')) {
      const eq = t.indexOf('='); const key = eq > 0 ? t.slice(2, eq) : t.slice(2);
      if (!CONOCIDOS.has(key)) {
        const near = cercano(key, CONOCIDOS);
        if (near) out.push({ nivel: 'error', clave: 'flag-desconocido', real: `error: unknown flag: --${key}`, msg: `kubectl no tiene ningún flag --${key}, y no lo ignora: rechaza el comando entero. El más parecido es --${near}.`, fix: sust(line, `--${key}`, `--${near}`) });
        continue;
      }
      if (esValor(key) && eq < 0) {
        if (next === undefined || (ESTRICTOS.has(key) && next.startsWith('-'))) out.push({ nivel: 'error', clave: 'flag-sin-valor', real: `error: flag needs an argument: --${key}`, msg: `--${key} necesita un valor y no se lo diste. Escríbelo pegado con = (--${key}=VALOR) o separado por un espacio (--${key} VALOR).` });
        else i++;
      }
      continue;
    }
    if (t.startsWith('-') && t.length > 1 && !/^-\d/.test(t)) {
      const body = t.slice(1); const name = body.split('=')[0];
      if (name.length > 2 && CONOCIDOS.has(name)) { out.push({ nivel: 'error', clave: 'guion-simple', real: `error: unknown shorthand flag: '${name[0]}' in -${body}`, msg: `Los flags con nombre completo llevan dos guiones: --${name}. Con un solo guion kubectl lee cada letra como un flag corto distinto (-${name[0]}, -${name[1]}...).`, fix: sust(line, t, `-${t}`) }); continue; }
      // flags cortos: el primero que lleva valor se queda con el resto del token o, si es el último, con el token siguiente
      const k = [...body].findIndex((ch) => esValor(SHORT[ch] ?? ''));
      if (k < 0 || k < body.length - 1) continue;
      const key = SHORT[body[k]];
      if (next === undefined || (ESTRICTOS.has(key) && next.startsWith('-'))) out.push({ nivel: 'error', clave: 'flag-sin-valor', real: `error: flag needs an argument: '${body[k]}' in -${body}`, msg: `-${body[k]} es la forma corta de --${key} y necesita un valor detrás (por ejemplo -${body[k]} ${key === 'namespace' ? 'kube-system' : key === 'output' ? 'wide' : 'VALOR'}).` });
      else i++;
    }
  }
  return out;
}

// ---------- análisis de estructura ----------
const ALIAS = () => KINDS.flatMap((k) => k.aliases);
const SUB_ROLLOUT = ['status', 'history', 'undo', 'restart', 'pause', 'resume'];
const SUB_CONFIG = ['current-context', 'get-contexts', 'set-context', 'use-context', 'view', 'get-clusters', 'get-users', 'set-cluster', 'set-credentials', 'delete-context', 'rename-context', 'unset', 'set'];
const SUB_CREATE = ['deployment', 'deploy', 'namespace', 'ns', 'configmap', 'cm', 'secret', 'job', 'cronjob', 'cj', 'service', 'svc', 'serviceaccount', 'sa', 'role', 'rolebinding', 'clusterrole', 'clusterrolebinding', 'ingress', 'ing', 'quota', 'resourcequota', 'priorityclass', 'poddisruptionbudget', 'pdb', 'token'];
const EFECTOS = ['NoSchedule', 'PreferNoSchedule', 'NoExecute'];
/** Tipos que existen en Kubernetes pero que el simulador no modela: el tutor no debe decir que no existen */
const REALES = new Set(['endpointslices', 'endpointslice', 'priorityclasses', 'priorityclass', 'pc', 'ingressclasses', 'ingressclass', 'gateways', 'gateway', 'gtw', 'gatewayclasses', 'gatewayclass', 'gc', 'httproutes', 'httproute', 'leases', 'lease', 'runtimeclasses', 'runtimeclass', 'poddisruptionbudgets', 'poddisruptionbudget', 'pdb', 'replicationcontrollers', 'rc', 'componentstatuses', 'cs', 'applications', 'application', 'certificatesigningrequests', 'csr', 'csidrivers', 'csinodes', 'volumeattachments', 'apiservices', 'controllerrevisions', 'podtemplates', 'validatingwebhookconfigurations', 'mutatingwebhookconfigurations', 'verticalpodautoscalers', 'vpa', 'servicemonitors', 'prometheusrules', 'virtualservices', 'destinationrules']);

function tipoDe(c: Cluster, ns: string, name: string, prefer?: string): string | undefined {
  const all: [string, unknown][] = [['deployment', c.deployment(ns, name)], ['pod', c.pod(ns, name)], ['service', c.service(ns, name)], ['replicaset', c.replicaset(ns, name)], ['configmap', c.configmap(ns, name)], ['secret', c.secret(ns, name)], ['node', c.node(name)], ['namespace', c.ns(name)]];
  const hit = all.filter(([, o]) => o).map(([k]) => k);
  return prefer && hit.includes(prefer) ? prefer : hit[0];
}

/** Comprueba que `args[0]` sea un tipo de recurso; si no, explica si falta el tipo o está mal escrito. */
function tipo(line: string, verbTxt: string, args: string[], c: Cluster | undefined, ns: string, opts: { prefer?: string; insertar?: string } = {}): Nota | null {
  const a = args[0];
  if (!a || a === 'all' || a.startsWith('-')) return null;
  const t = a.includes('/') ? a.split('/')[0] : a;
  if (t.split(',').every((x) => kindOf(x) || x === 'all')) return null;
  const malo = t.split(',').find((x) => !kindOf(x) && x !== 'all')!;
  if (REALES.has(malo.toLowerCase().split('.')[0])) return c ? { nivel: 'aviso', clave: 'no-simulado', msg: `El tipo «${malo}» existe en Kubernetes o en sus extensiones (CRD), pero este simulador no lo modela: por eso responde que no lo conoce. Practícalo en el clúster real del curso (.\\kcna.ps1 up).` } : null;
  if (!a.includes('/') && !a.includes(',')) {
    const real = c ? tipoDe(c, ns, a, opts.prefer) : undefined;
    const ins = real ?? (args.length === 1 ? opts.insertar : undefined);
    if (ins) return { nivel: 'error', clave: 'falta-tipo', msg: `kubectl leyó «${a}» como TIPO de recurso, y ese tipo no existe${real ? `: «${a}» es el NOMBRE de un ${real}` : ''}. El orden siempre es VERBO TIPO NOMBRE (o TIPO/NOMBRE): falta decir de qué tipo es.`, fix: line.replace(new RegExp(`(\\s${esc(verbTxt)}\\s+)${esc(a)}(?=\\s|$)`), `$1${ins} ${a}`) };
  }
  const near = cercano(malo.toLowerCase(), ALIAS());
  if (near) return { nivel: 'error', clave: 'tipo-mal-escrito', msg: `No existe el tipo de recurso «${malo}». ¿Querías decir ${near}? La lista completa, con sus abreviaturas, sale con kubectl api-resources.`, fix: line.replace(malo, near) };
  if (!a.includes('/') && args.length === 1) return { nivel: 'error', clave: 'falta-tipo', msg: `«${a}» no es un tipo de recurso. Si es el nombre de un objeto, falta el tipo delante (VERBO TIPO NOMBRE); los tipos se listan con kubectl api-resources.` };
  return null;
}

function sinTag(image: string | undefined): Nota | null {
  if (!image || image.includes('@')) return null;
  const i = image.lastIndexOf(':'); const tag = i < 0 || image.lastIndexOf('/') > i ? '' : image.slice(i + 1);
  if (tag && tag !== 'latest') return null;
  const base = tag ? image.slice(0, i) : image;
  const sug = PRELOADED_IMAGES.find((x) => x.startsWith(base + ':'));
  return { nivel: 'aviso', clave: 'imagen-sin-tag', msg: `La imagen «${image}» ${tag ? 'usa el tag latest' : 'no lleva tag, así que Kubernetes asume :latest'}; con latest la imagePullPolicy por defecto es Always y el nodo intenta descargarla siempre. En el clúster del curso los nodos no tienen internet: acabará en ImagePullBackOff. Usa un tag explícito${sug ? `, por ejemplo ${sug}` : ''}.` };
}

function estructura(line: string, { verb, p }: Cmd, c?: Cluster): Nota[] {
  const out: Nota[] = [];
  const add = (n: Nota | null | undefined) => { if (n) out.push(n); };
  const E = (clave: string, msg: string, fix?: string): Nota => ({ nivel: 'error', clave, msg, fix });
  const ns = flag(p, 'namespace') ?? c?.currentNamespace ?? 'default';
  const a = p.args;
  const podPrefijo = (name: string | undefined, cmd: string) => {
    if (!c || !name || name.includes('/') || c.pod(ns, name)) return;
    const pods = c.pods.filter((x) => x.meta.namespace === ns && x.meta.name.startsWith(name + '-'));
    if (!pods.length) return;
    const d = c.deployment(ns, name);
    const target = d && cmd !== 'delete' ? `deployment/${name}` : pods[0].meta.name;
    add(E('pod-prefijo', `No hay ningún Pod llamado «${name}»: los Pods de un Deployment llevan un sufijo generado (${pods[0].meta.name}). Completa el nombre con Tab${d && cmd !== 'delete' ? `, o apunta al Deployment y kubectl elige uno de sus Pods: ${cmd} deployment/${name}` : ''}.`, sust(line, name, target)));
  };

  switch (verb) {
    case 'get': case 'describe': case 'delete': case 'label': case 'annotate': case 'edit': {
      if (verb === 'delete' && (has(p, 'filename') || has(p, 'kustomize'))) break;
      const n = tipo(line, verb, a, c, ns);
      add(n);
      if (!n && kindOf(a[0] ?? '')?.kind === 'Pod' && verb !== 'get' && verb !== 'describe') podPrefijo(a[1], verb);
      // describe sin eventos: kubectl los omite si encontró el objeto por prefijo o si describe varios a la vez
      const k = kindOf((a[0] ?? '').split('/')[0]);
      if (!n && c && verb === 'describe' && k && !k.synthetic && !has(p, 'show-events')) {
        const todos = listOf(c, k).filter((x) => !k.namespaced || has(p, 'all-namespaces') || x.meta.namespace === ns);
        const nombre = (a[0] ?? '').includes('/') ? a[0].split('/')[1] : a[1];
        const sel = flag(p, 'selector'); const match = sel ? parseSelector(sel) : null;
        if (nombre && !todos.some((x) => x.meta.name === nombre) && todos.some((x) => x.meta.name.startsWith(nombre))) add({ nivel: 'aviso', clave: 'describe-prefijo', msg: `No hay ningún objeto llamado exactamente «${nombre}»: kubectl lo encontró por prefijo, y en ese caso describe no muestra la sección Events. Para ver los eventos usa el nombre completo (Tab lo completa), un selector que dé un solo objeto (-l) o añade --show-events.`, fix: `${line.trim()} --show-events` });
        else if (!nombre && (match ? todos.filter((x) => match(x.meta.labels)) : todos).length > 1) add({ nivel: 'aviso', clave: 'describe-varios', msg: 'Al describir varios objetos a la vez kubectl no muestra la sección Events de cada uno. Describe uno solo (por nombre completo) o añade --show-events.', fix: `${line.trim()} --show-events` });
      }
      const o = flag(p, 'output');
      if (verb === 'get' && o && !/^(wide|yaml|kyaml|json|name|jsonpath|custom-columns|go-template|template)/.test(o)) { const near = cercano(o, ['wide', 'yaml', 'json', 'name', 'jsonpath']); add(E('salida', `«${o}» no es un formato de salida de -o. Los que más vas a usar: wide (más columnas), yaml y json (el objeto completo), name y jsonpath='{...}' (un campo).`, near ? line.replace(new RegExp(`${esc(o)}(?=\\s|$)`), near) : undefined)); }
      break;
    }
    case 'run': {
      if (!a[0]) add(E('run-nombre', 'kubectl run necesita el nombre del Pod justo después: kubectl run NOMBRE --image=IMAGEN.'));
      else if (!has(p, 'image')) add(E('run-imagen', 'Falta --image: un Pod es, como mínimo, un contenedor, y un contenedor no existe sin imagen. kubectl run NOMBRE --image=IMAGEN:TAG.'));
      add(sinTag(flag(p, 'image')));
      break;
    }
    case 'create': {
      if (has(p, 'filename') || has(p, 'kustomize') || !a[0]) break;
      const sub = a[0];
      if (['pod', 'pods', 'po'].includes(sub)) { add(E('create-pod', 'No existe kubectl create pod. Un Pod suelto se crea de forma imperativa con kubectl run NOMBRE --image=IMAGEN, o de forma declarativa con kubectl apply -f pod.yaml.', line.replace(/create\s+(pods?|po)\b/, 'run'))); break; }
      if (!SUB_CREATE.includes(sub)) { const near = cercano(sub, SUB_CREATE); add(E('create-sub', `kubectl create no sabe crear «${sub}»${near ? `. ¿Querías decir ${near}?` : '. Crea de forma imperativa, entre otros: deployment, namespace, configmap, secret, job, cronjob, service, serviceaccount, role, rolebinding. Para el resto, kubectl apply -f archivo.yaml.'}`, near ? sust(line, sub, near) : undefined)); break; }
      if (['deployment', 'deploy'].includes(sub)) {
        if (!a[1]) add(E('create-nombre', 'Falta el nombre del Deployment: kubectl create deployment NOMBRE --image=IMAGEN.'));
        else if (!has(p, 'image')) add(E('create-imagen', 'Falta --image: el Deployment necesita saber qué imagen llevan sus Pods. kubectl create deployment NOMBRE --image=IMAGEN:TAG [--replicas=N].'));
        add(sinTag(flag(p, 'image')));
      }
      if (sub === 'secret' && a[1] && !['generic', 'tls', 'docker-registry'].includes(a[1])) add(E('secret-subtipo', `kubectl create secret pide el subtipo antes del nombre: generic (claves y valores cualesquiera, tipo Opaque), tls o docker-registry.`, line.replace(/(\ssecret\s+)/, '$1generic ')));
      break;
    }
    case 'expose': case 'scale': case 'autoscale': {
      if (has(p, 'filename')) break;
      const n = tipo(line, verb, a, c, ns, { prefer: 'deployment', insertar: 'deployment' });
      add(n);
      if (!n && verb === 'scale' && a[0] && !has(p, 'replicas')) add(E('scale-replicas', 'scale no adivina el número: indícalo con --replicas=N. Es el campo spec.replicas del objeto, el estado deseado que el controlador va a perseguir.'));
      break;
    }
    case 'rollout': {
      const sub = a[0];
      if (!sub) break;
      if (!SUB_ROLLOUT.includes(sub)) { const near = cercano(sub, SUB_ROLLOUT); add(E('rollout-sub', `kubectl rollout no tiene «${sub}»${near ? `: ¿querías decir ${near}?` : ''}. Sus acciones: status (¿ya terminó?), history (revisiones), undo (volver atrás), restart, pause y resume.`, near ? sust(line, sub, near) : undefined)); break; }
      add(tipo(line, sub, a.slice(1), c, ns, { prefer: 'deployment', insertar: 'deployment' }));
      break;
    }
    case 'set': {
      const sub = a[0];
      if (!sub) break;
      if (sub !== 'image') { const near = cercano(sub, ['image', 'env', 'resources', 'selector', 'serviceaccount', 'subject']); if (near && near !== sub) add(E('set-sub', `kubectl set no tiene «${sub}»: ¿querías decir ${near}?`, sust(line, sub, near))); break; }
      const n = tipo(line, 'image', a.slice(1), c, ns, { prefer: 'deployment', insertar: 'deployment' });
      if (n) { add(n); break; }
      const slash = (a[1] ?? '').includes('/');
      const name = slash ? a[1].split('/')[1] : a[2];
      const pairs = a.slice(slash ? 2 : 3);
      const d = c && name ? c.deployment(ns, name) : undefined;
      const conts = d?.spec.template.containers.map((x) => x.name) ?? [];
      const como = `Míralo en la columna CONTAINERS de kubectl get deployment ${name ?? 'NOMBRE'} -o wide`;
      if (name && !pairs.length) add(E('set-par', `Falta decir qué contenedor cambia y a qué imagen: CONTENEDOR=IMAGEN. Un Pod puede tener varios contenedores, por eso hay que nombrarlo. ${conts.length ? `En ${name} se llama ${conts.join(', ')}.` : como + '.'}`));
      for (const pr of pairs) {
        if (!pr.includes('=')) { add(E('set-par', `«${pr}» es solo la imagen. kubectl set image espera CONTENEDOR=IMAGEN, porque un Pod puede tener varios contenedores y hay que decir cuál cambia. ${conts.length ? `En ${name} el contenedor se llama ${conts.join(', ')}.` : como + '.'}`, conts.length === 1 ? sust(line, pr, `${conts[0]}=${pr}`) : undefined)); continue; }
        const [cn, img] = [pr.slice(0, pr.indexOf('=')), pr.slice(pr.indexOf('=') + 1)];
        if (d && cn !== '*' && !conts.includes(cn)) add(E('set-contenedor', `El Deployment ${name} no tiene ningún contenedor llamado «${cn}»: se llama ${conts.join(', ')}. El nombre del contenedor no tiene por qué coincidir con el del Deployment. ${como}.`, conts.length === 1 ? sust(line, pr, `${conts[0]}=${img}`) : undefined));
        add(sinTag(img));
      }
      break;
    }
    case 'logs': podPrefijo(a[0], 'kubectl logs'); break;
    case 'exec': {
      if (a.length > 1 && !p.rest.length) add(E('exec-separador', 'Falta el separador --. Lo que va antes de -- son opciones de kubectl; lo que va después es el comando que se ejecuta dentro del contenedor. Sin él, kubectl no sabe dónde termina una cosa y empieza la otra.', line.replace(new RegExp(`(\\s${esc(a[0])})(\\s)`), '$1 --$2')));
      podPrefijo(a[0], 'kubectl exec');
      break;
    }
    case 'apply': if (!has(p, 'filename') && !has(p, 'kustomize')) add(E('apply-archivo', 'apply es declarativo: no recibe un tipo y un nombre, sino un manifiesto con el estado deseado. kubectl apply -f archivo.yaml (ls muestra los manifiestos de este simulador).')); break;
    case 'taint': {
      const n = tipo(line, verb, a, c, ns, { prefer: 'node', insertar: 'node' });
      if (n) { add(n); break; }
      for (const t of a.slice((a[0] ?? '').includes('/') ? 1 : 2)) {
        if (t.endsWith('-')) continue;
        const ef = t.includes(':') ? t.slice(t.lastIndexOf(':') + 1) : undefined;
        if (ef === undefined) add(E('taint-efecto', `Un taint tiene tres partes: clave=valor:Efecto. Falta el efecto en «${t}»: NoSchedule (no entran Pods nuevos sin toleration), PreferNoSchedule (se evita si se puede) o NoExecute (además expulsa a los que ya están).`));
        else if (!EFECTOS.includes(ef)) { const near = EFECTOS.find((x) => x.toLowerCase() === ef.toLowerCase()) ?? cercano(ef, EFECTOS); add(E('taint-efecto', `«${ef}» no es un efecto de taint. Los tres que existen, con mayúsculas exactas: NoSchedule, PreferNoSchedule y NoExecute.`, near ? line.replace(`:${ef}`, `:${near}`) : undefined)); }
      }
      break;
    }
    case 'config': { const sub = a[0]; if (sub && !SUB_CONFIG.includes(sub)) { const near = cercano(sub, SUB_CONFIG); if (near) add(E('config-sub', `kubectl config no tiene «${sub}»: ¿querías decir ${near}?`, sust(line, sub, near))); } break; }
  }
  // el objeto existe, pero en otro namespace que el del contexto (clásico tras "config set-context --namespace")
  if (c && !flag(p, 'namespace') && !has(p, 'all-namespaces') && ['get', 'describe', 'delete', 'logs', 'exec', 'scale', 'expose', 'set', 'rollout', 'label', 'annotate'].includes(verb)) {
    for (const raw of a) {
      const name = raw.includes('/') ? raw.split('/')[1] : raw;
      if (!name || name.includes('=') || kindOf(raw) || tipoDe(c, ns, name)) continue;
      const otro = [...c.pods, ...c.deployments, ...c.services].find((x) => x.meta.name === name && x.meta.namespace !== ns)?.meta.namespace;
      if (otro) { out.push({ nivel: 'aviso', clave: 'otro-namespace', msg: `«${name}» existe, pero en el namespace ${otro}. Tu contexto apunta a ${ns}, y sin -n kubectl solo mira ahí. Añade -n ${otro} al comando o cambia el namespace del contexto: kubectl config set-context --current --namespace=${otro}.`, fix: `${line.trim()} -n ${otro}` }); break; }
    }
  }
  // un namespace que no existe devuelve "No resources found", que parece "está vacío"
  const nsFlag = flag(p, 'namespace');
  if (c && nsFlag && nsFlag !== 'true' && !c.ns(nsFlag) && ['get', 'describe', 'logs', 'top', 'events'].includes(verb)) out.push({ nivel: 'aviso', clave: 'ns-inexistente', msg: `El namespace «${nsFlag}» no existe en este clúster. kubectl no lo avisa al listar: responde «No resources found», igual que si existiera y estuviera vacío. Compruébalo con kubectl get namespaces.` });
  return out;
}

/** Notas sobre un comando: primero lo que kubectl rechazaría; después, avisos. Sin clúster solo se analiza la forma. */
export function analizar(line: string, c?: Cluster): Nota[] {
  const cmd = leer(line);
  const { bin, verb, tokens } = cmd;
  if (!bin) return [];
  if (bin !== 'kubectl' && bin !== 'k') {
    if (dist(bin.toLowerCase(), 'kubectl') <= 2) return [{ nivel: 'error', clave: 'binario', msg: `«${bin}» no existe: el cliente se llama kubectl (kube + control). En el curso también vale el alias k.`, fix: line.replace(bin, 'kubectl') }];
    return [];
  }
  if (!verb) return [];
  if (!VERBOS.includes(verb)) {
    const near = cercano(verb, VERBOS);
    return near ? [{ nivel: 'error', clave: 'verbo', msg: `kubectl no tiene el comando «${verb}». ¿Querías decir ${near}? El primer argumento siempre es el verbo: qué quieres hacer (get, describe, create, apply, delete...).`, fix: sust(line, verb, near) }] : [];
  }
  const flags = erroresDeFlags(line, verb, tokens.slice(1));
  if (flags.length) return flags;
  const notas = estructura(line, cmd, c);
  return [...notas.filter((n) => n.nivel === 'error'), ...notas.filter((n) => n.nivel === 'aviso')];
}

// ---------- comparar un comando escrito de memoria ----------
export interface Canon { bin: string; verb: string; res: string; args: string[]; flags: Record<string, string>; rest: string; kubectl: boolean; toks: string[] }

const RES0 = new Set(['get', 'describe', 'delete', 'scale', 'expose', 'label', 'annotate', 'edit', 'autoscale', 'taint', 'top', 'patch', 'create', 'cordon', 'uncordon', 'drain']);
const RES1 = new Set(['rollout', 'set']);
const LISTAS = new Set(['selector', 'labels', 'label-columns', 'verb', 'resource']);
/** Formas largas de los flags más usados en helm y podman, para que -n y --namespace cuenten igual */
const LARGOS: Record<string, string> = { '--namespace': '-n', '--values': '-f', '--file': '-f', '--tag': '-t', '--publish': '-p', '--detach': '-d', '--all': '-a', '--interactive': '-i', '--tty': '-t', '--env': '-e', '--volume': '-v' };
const plural = (t: string) => t.split(',').map((x) => kindOf(x)?.plural ?? x).sort().join(',');

/** Forma canónica: alias de recurso, tipo/nombre, flags cortos y largos y su orden dejan de importar. */
export function canon(line: string): Canon {
  const { tokens, bin, verb, p } = leer(line);
  const b = bin.replace(/^\.[\\/]/, '').toLowerCase();
  if (b !== 'kubectl' && b !== 'k') {
    // otros clientes (helm, podman, kind, kcna.ps1): "--k=v" equivale a "--k v"; sin más reglas
    const toks = tokens.slice(1).flatMap((t) => (t.startsWith('--') && t.includes('=') ? [t.slice(0, t.indexOf('=')), t.slice(t.indexOf('=') + 1)] : [t]))
      .map((t) => LARGOS[t] ?? (/^-[a-zA-Z]{2,}$/.test(t) ? '-' + [...t.slice(1)].sort().join('') : t.replace(/\\/g, '/')));
    return { bin: b, verb: toks.find((t) => !t.startsWith('-')) ?? '', res: '', args: [], flags: {}, rest: '', kubectl: false, toks };
  }
  let args = p.args.flatMap((x) => {
    if (x.includes('/') && !x.includes('=') && !/^(https?:|\.|\/)/.test(x)) { const [t, n] = x.split('/'); const k = kindOf(t); if (k) return [k.plural, n]; }
    return [x];
  });
  if (verb === 'explain' && args[0]) { const [t, ...f] = args[0].split('.'); args[0] = [kindOf(t)?.plural ?? t, ...f].join('.'); }
  if ((verb === 'logs' || verb === 'exec' || verb === 'port-forward') && args[0] === 'pods') args = args.slice(1);
  if ((verb === 'cordon' || verb === 'uncordon' || verb === 'drain') && args[0] !== 'nodes') args = ['nodes', ...args];
  const ri = RES0.has(verb) ? 0 : RES1.has(verb) ? 1 : -1;
  let res = '';
  if (ri >= 0 && args[ri] !== undefined) { res = plural(args[ri]); args = args.filter((_, i) => i !== ri); }
  const flags: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.flags)) flags[k] = [...new Set(LISTAS.has(k) ? v.flatMap((x) => x.split(',')) : v)].sort().join(LISTAS.has(k) ? ',' : ' ');
  // en logs, -f es --follow (el parser compartido lo guarda como "filename")
  if (verb === 'logs' && flags.filename === 'true') { delete flags.filename; flags.follow = 'true'; }
  return { bin: 'kubectl', verb, res, args, flags, rest: p.rest.join(' '), kubectl: true, toks: [] };
}

export interface Parte { clave: 'comando' | 'verbo' | 'recurso' | 'nombre' | 'flags' | 'interior'; etiqueta: string; ok: boolean; detalle?: string }
export interface Veredicto { ok: boolean; partes: Parte[]; /** el comando aceptado más parecido al intento */ mejor: string }

function partes(a: Canon, e: Canon): Parte[] {
  if (a.bin !== e.bin) return [{ clave: 'comando', etiqueta: 'Herramienta', ok: false, detalle: `Este comando no se hace con ${a.bin || 'eso'}.` }];
  const out: Parte[] = [{ clave: 'verbo', etiqueta: e.kubectl ? 'Verbo' : 'Subcomando', ok: a.verb === e.verb, detalle: a.verb === e.verb ? undefined : a.verb ? `«${a.verb}» no es la acción que pide la tarea.` : 'Falta la acción.' }];
  // con el verbo equivocado, comparar el resto solo añade ruido: primero se corrige la acción
  if (!out[0].ok) return out;
  if (!e.kubectl) {
    const need = [...e.toks]; const extra: string[] = [];
    for (const t of a.toks) { const i = need.indexOf(t); if (i >= 0) need.splice(i, 1); else extra.push(t); }
    // el orden solo importa entre argumentos posicionales (los que no son un flag ni el valor que le sigue)
    const pos = (ts: string[]) => ts.filter((t, i) => !t.startsWith('-') && !(ts[i - 1] ?? '').startsWith('-')).join(' ');
    const orden = pos(a.toks) === pos(e.toks);
    const ok = !need.length && !extra.length && orden;
    out.push({ clave: 'flags', etiqueta: 'Argumentos', ok, detalle: ok ? undefined : [need.length ? `falta${need.length > 1 ? 'n' : ''} ${need.length} elemento${need.length > 1 ? 's' : ''}` : '', extra.length ? `no encaja: ${extra.join(' ')}` : '', !need.length && !extra.length ? 'el orden no es el esperado' : ''].filter(Boolean).join('; ') + '.' });
    return out;
  }
  if (e.res || a.res) out.push({ clave: 'recurso', etiqueta: 'Recurso', ok: a.res === e.res, detalle: a.res === e.res ? undefined : a.res ? `«${a.res}» no es el tipo de recurso de la tarea.` : 'Falta el tipo de recurso.' });
  if (e.args.length || a.args.length) {
    const ok = a.args.length === e.args.length && a.args.every((x, i) => x === e.args[i]);
    out.push({ clave: 'nombre', etiqueta: 'Nombre y argumentos', ok, detalle: ok ? undefined : a.args.length < e.args.length ? 'Falta algún nombre o argumento.' : a.args.length > e.args.length ? 'Sobra algún argumento.' : 'Revisa el nombre o los argumentos: no coinciden con la tarea.' });
  }
  const ek = Object.keys(e.flags), ak = Object.keys(a.flags);
  const faltan = ek.filter((k) => !(k in a.flags)), sobran = ak.filter((k) => !(k in e.flags)), mal = ek.filter((k) => k in a.flags && a.flags[k] !== e.flags[k]);
  if (ek.length || ak.length) out.push({ clave: 'flags', etiqueta: 'Flags', ok: !faltan.length && !sobran.length && !mal.length,
    detalle: [faltan.length ? `falta${faltan.length > 1 ? 'n' : ''} ${faltan.length} flag${faltan.length > 1 ? 's' : ''}` : '', sobran.length ? `sobra ${sobran.map((k) => '--' + k).join(', ')}` : '', mal.length ? `revisa el valor de ${mal.map((k) => '--' + k).join(', ')}` : ''].filter(Boolean).join('; ') || undefined });
  if (e.rest || a.rest) out.push({ clave: 'interior', etiqueta: 'Comando tras --', ok: a.rest === e.rest, detalle: a.rest === e.rest ? undefined : a.rest ? 'El comando que va después de -- no coincide.' : 'Falta el comando que se ejecuta dentro (después de --).' });
  return out;
}

export function comparar(intento: string, acepta: string[]): Veredicto {
  const a = canon(intento);
  let best: { p: Parte[]; s: number; cmd: string } | undefined;
  for (const cmd of acepta) {
    const p = partes(a, canon(cmd));
    const s = p.filter((x) => x.ok).length - p.filter((x) => !x.ok).length;
    if (!best || s > best.s) best = { p, s, cmd };
  }
  return { ok: !!best && best.p.every((x) => x.ok), partes: best?.p ?? [], mejor: best?.cmd ?? '' };
}

const PALABRAS = new Set([...SUB_ROLLOUT, ...SUB_CONFIG, 'image', 'generic', 'tls', 'docker-registry', 'can-i', 'whoami', 'all']);
/** Esqueleto de un comando para dar una pista sin dar la respuesta: conserva la forma y oculta nombres y valores. */
export function esqueleto(cmd: string): string {
  const t = tokenize(cmd);
  const kube = t[0] === 'kubectl' || t[0] === 'k';
  const out = t.slice(0, 2);
  for (let i = 2; i < t.length; i++) {
    const x = t[i];
    if (x === '--') { out.push('-- ___'); break; }
    if (x.startsWith('--')) { const eq = x.indexOf('='); if (eq > 0) out.push(`${x.slice(0, eq)}=___`); else if ((!kube || VALUE.has(x.slice(2))) && t[i + 1] !== undefined && !t[i + 1].startsWith('-')) { out.push(`${x} ___`); i++; } else out.push(x); continue; }
    if (x.startsWith('-') && x.length === 2) { if ((!kube || VALUE.has(SHORT[x[1]] ?? '')) && t[i + 1] !== undefined && !t[i + 1].startsWith('-')) { out.push(`${x} ___`); i++; } else out.push(x); continue; }
    if (x.startsWith('-')) { out.push(x); continue; }
    if (kube && (kindOf(x) || PALABRAS.has(x) || SUB_CREATE.includes(x))) out.push(x);
    else if (kube && x.includes('/') && kindOf(x.split('/')[0])) out.push(`${x.split('/')[0]}/___`);
    else if (out[out.length - 1] !== '___') out.push('___');
  }
  return out.join(' ');
}
