// Parser y ejecutor de la terminal: kubectl (get, describe, explain, config, top, api-resources...),
// comandos de la "shell" (ls, cat, clear, help) y filtros con tubería (| grep, | Select-String, | head...).
import { type Cluster, type Pod, type Service, KUBE_VERSION, CONTEXT, imageTag } from './cluster.ts';
import { type Parsed, type Result, type Kind, type Item, ok, fail, parseFlags, flag, has, nsOf, kindOf, KINDS, fullName, prefix, notFound, noType, parseSelector, listOf, labelsText } from './common.ts';
import { age, table, toYaml, jsonpath, hash } from './format.ts';
import { podObject, deploymentObject, replicaSetObject, serviceObject, configMapObject, secretObject, namespaceObject, nodeObject, eventObject, OS_IMAGE, KERNEL, RUNTIME } from './objects.ts';
import { describePod, describeDeployment, describeReplicaSet, describeService, describeNode, describeNamespace, describeConfigMap, describeSecret } from './describe.ts';
import { FILES, fileNames, EXPLAIN, wrap } from './files.ts';
import { tokenize } from './exec.ts';
import { run, create, expose, scale, setImage, rollout, del, label, annotate, taint, applyFiles, logs, exec } from './commands.ts';

export type { Result } from './common.ts';
export { FILES } from './files.ts';

export const PROMPT = `[kcna:${CONTEXT}] PS> `;

export const HELP = [
  'Terminal simulada del curso KCNA. Comandos disponibles:',
  '',
  '  kubectl (o k) get|describe|run|create|apply|expose|scale|set image|rollout|delete|logs|exec|label|annotate|taint|explain|config|top|api-resources|version|cluster-info',
  '  kubectl get <recurso> [nombre] [-n ns | -A] [-o wide|yaml|json|name|jsonpath=...] [-l k=v] [--show-labels]',
  '  kubectl describe pod|deploy|rs|svc|node|ns <nombre>',
  '  kubectl run <n> --image=<img> [--port=80] [-l k=v] [--restart=Never] [--dry-run=client -o yaml] [-- cmd]',
  '  kubectl create deployment|namespace|configmap|secret generic ...   kubectl apply -f <archivo>',
  '  kubectl expose deployment <n> --port=80 [--target-port=80] [--type=NodePort] [--name=x]',
  '  kubectl scale deployment <n> --replicas=N     kubectl set image deployment/<n> <contenedor>=<imagen>',
  '  kubectl rollout status|history|undo|restart deployment/<n>',
  '  kubectl logs <pod> [-c x] [--previous]        kubectl exec <pod> -- env|ls|cat /etc/hostname|nslookup web|wget -qO- http://web',
  '  kubectl config get-contexts|current-context|set-context --current --namespace=<ns>',
  '  ls, cat <archivo>   manifiestos de ejemplo (pod.yaml, deployment.yaml, service.yaml, broken-image.yaml, ...)',
  '  clear, help         | grep <texto>, | Select-String <texto>, | head -n N, | tail -n N, | wc -l',
  '',
  'Recursos: pods (po), deployments (deploy), replicasets (rs), services (svc), configmaps (cm), secrets, namespaces (ns), nodes (no), events (ev).',
  'Imágenes disponibles sin internet: nginx:1.27-alpine, nginx:1.28-alpine, busybox:1.37, traefik/whoami:v1.11, redis:7.4-alpine.',
];

const KUBECTL_USAGE = [
  'kubectl controls the Kubernetes cluster manager.', '', ' Find more information at: https://kubernetes.io/docs/reference/kubectl/', '',
  'Basic Commands (Beginner):', '  create          Create a resource from a file or from stdin', '  expose          Take a replication controller, service, deployment or pod and expose it as a new Kubernetes service', '  run             Run a particular image on the cluster', '  set             Set specific features on objects', '',
  'Basic Commands (Intermediate):', '  explain         Get documentation for a resource', '  get             Display one or many resources', '  edit            Edit a resource on the server', '  delete          Delete resources by file names, stdin, resources and names, or by resources and label selector', '',
  'Deploy Commands:', '  rollout         Manage the rollout of a resource', '  scale           Set a new size for a deployment, replica set, or replication controller', '  autoscale       Auto-scale a deployment, replica set, stateful set, or replication controller', '',
  'Cluster Management Commands:', '  top             Display resource (CPU/memory) usage', '  cordon          Mark node as unschedulable', '  uncordon        Mark node as schedulable', '  drain           Drain node in preparation for maintenance', '  taint           Update the taints on one or more nodes', '',
  'Troubleshooting and Debugging Commands:', '  describe        Show details of a specific resource or group of resources', '  logs            Print the logs for a container in a pod', '  exec            Execute a command in a container', '  port-forward    Forward one or more local ports to a pod', '  debug           Create debugging sessions for troubleshooting workloads and nodes', '  events          List events', '',
  'Other Commands:', '  api-resources   Print the supported API resources on the server', '  api-versions    Print the supported API versions on the server, in the form of "group/version"', '  config          Modify kubeconfig files', '  version         Print the client and server version information', '',
  'Usage:', '  kubectl [flags] [options]', '', 'Use "kubectl <command> --help" for more information about a given command.',
];

// ---------- get ----------
function rowOf(c: Cluster, it: Item, wide: boolean): string[] {
  const a = age(c.now - it.meta.created);
  switch (it.kind) {
    case 'Pod': {
      const restarts = it.status.restarts ? `${it.status.restarts} (${age(c.now - (it.status.lastRestart ?? c.now))} ago)` : '0';
      const r = [it.meta.name, c.podReady(it), c.podStatus(it), restarts, a];
      if (wide) r.push(it.spec.nodeName && it.status.ip ? it.status.ip : '<none>', it.spec.nodeName ?? '<none>', '<none>', '<none>');
      return r;
    }
    case 'Deployment': {
      const st = c.deploymentStatus(it);
      const r = [it.meta.name, `${st.ready}/${it.spec.replicas}`, String(st.updated), String(st.available), a];
      if (wide) r.push(it.spec.template.containers.map((x) => x.name).join(','), it.spec.template.containers.map((x) => x.image).join(','), labelsText(it.spec.selector));
      return r;
    }
    case 'ReplicaSet': {
      const pods = c.podsOf(it).filter((p) => !p.status.deleting);
      const r = [it.meta.name, String(it.spec.replicas), String(pods.length), String(pods.filter((p) => p.status.ready).length), a];
      if (wide) r.push(it.spec.template.containers.map((x) => x.name).join(','), it.spec.template.containers.map((x) => x.image).join(','), labelsText(it.spec.selector));
      return r;
    }
    case 'Service': {
      const ports = it.spec.ports.map((p) => (p.nodePort ? `${p.port}:${p.nodePort}/${p.protocol}` : `${p.port}/${p.protocol}`)).join(',');
      const r = [it.meta.name, it.spec.type, it.spec.clusterIP, '<none>', ports, a];
      if (wide) r.push(Object.keys(it.spec.selector).length ? labelsText(it.spec.selector) : '<none>');
      return r;
    }
    case 'ConfigMap': return [it.meta.name, String(Object.keys(it.data).length), a];
    case 'Secret': return [it.meta.name, it.type, String(Object.keys(it.data).length), a];
    case 'Namespace': return [it.meta.name, it.status, a];
    case 'Node': {
      const r = [it.meta.name, it.ready ? 'Ready' : 'NotReady', it.role === 'control-plane' ? 'control-plane' : '<none>', a, KUBE_VERSION];
      if (wide) r.push(it.internalIP, '<none>', OS_IMAGE, KERNEL, RUNTIME);
      return r;
    }
  }
}
const HEADERS: Record<string, { base: string[]; wide: string[] }> = {
  Pod: { base: ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'], wide: ['IP', 'NODE', 'NOMINATED NODE', 'READINESS GATES'] },
  Deployment: { base: ['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE'], wide: ['CONTAINERS', 'IMAGES', 'SELECTOR'] },
  ReplicaSet: { base: ['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE'], wide: ['CONTAINERS', 'IMAGES', 'SELECTOR'] },
  Service: { base: ['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE'], wide: ['SELECTOR'] },
  ConfigMap: { base: ['NAME', 'DATA', 'AGE'], wide: [] },
  Secret: { base: ['NAME', 'TYPE', 'DATA', 'AGE'], wide: [] },
  Namespace: { base: ['NAME', 'STATUS', 'AGE'], wide: [] },
  Node: { base: ['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION'], wide: ['INTERNAL-IP', 'EXTERNAL-IP', 'OS-IMAGE', 'KERNEL-VERSION', 'CONTAINER-RUNTIME'] },
};

function objectOf(c: Cluster, it: Item): Record<string, unknown> {
  switch (it.kind) {
    case 'Pod': return podObject(c, it);
    case 'Deployment': return deploymentObject(c, it);
    case 'ReplicaSet': return replicaSetObject(c, it);
    case 'Service': return serviceObject(c, it);
    case 'ConfigMap': return configMapObject(c, it);
    case 'Secret': return secretObject(c, it);
    case 'Namespace': return namespaceObject(c, it);
    case 'Node': return nodeObject(c, it);
  }
}

/** Tablas sintéticas de tipos que el clúster no modela pero que el alumno consulta (sa, ep, ds, sc). */
function syntheticRows(c: Cluster, k: Kind, ns: string | null): { headers: string[]; rows: string[][]; nsCol: string[] } {
  const rows: string[][] = []; const nsCol: string[] = [];
  const inNs = (n: string) => ns === null || n === ns;
  switch (k.kind) {
    case 'ServiceAccount': for (const n of c.namespaces) if (inNs(n.meta.name)) { rows.push(['default', '0', age(c.now - n.meta.created)]); nsCol.push(n.meta.name); } return { headers: ['NAME', 'SECRETS', 'AGE'], rows, nsCol };
    case 'Endpoints': for (const s of c.services) if (inNs(s.meta.namespace!)) { const eps = s.meta.name === 'kubernetes' ? ['172.18.0.2:6443'] : c.endpoints(s).flatMap((p) => s.spec.ports.map((pt) => `${p.status.ip}:${pt.targetPort}`)); rows.push([s.meta.name, eps.length ? (eps.length > 3 ? eps.slice(0, 3).join(',') + ` + ${eps.length - 3} more...` : eps.join(',')) : '<none>', age(c.now - s.meta.created)]); nsCol.push(s.meta.namespace!); } return { headers: ['NAME', 'ENDPOINTS', 'AGE'], rows, nsCol };
    case 'DaemonSet': if (inNs('kube-system')) for (const n of ['kindnet', 'kube-proxy']) { rows.push([n, '3', '3', '3', '3', '3', 'kubernetes.io/os=linux', age(c.now - c.nodes[0].meta.created)]); nsCol.push('kube-system'); } return { headers: ['NAME', 'DESIRED', 'CURRENT', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'NODE SELECTOR', 'AGE'], rows, nsCol };
    case 'StorageClass': rows.push(['standard (default)', 'rancher.io/local-path', 'Delete', 'WaitForFirstConsumer', 'false', age(c.now - c.nodes[0].meta.created)]); return { headers: ['NAME', 'PROVISIONER', 'RECLAIMPOLICY', 'VOLUMEBINDINGMODE', 'ALLOWVOLUMEEXPANSION', 'AGE'], rows, nsCol };
    default: return { headers: ['NAME', 'AGE'], rows, nsCol };
  }
}

function get(c: Cluster, p: Parsed): Result {
  if (!p.args.length) return fail(['error: Required resource not specified.', 'Use "kubectl explain <resource>" for a detailed description of that resource (e.g. kubectl explain pods).', "See 'kubectl get -h' for help and examples"]);
  const allNs = has(p, 'all-namespaces');
  const ns = allNs ? null : nsOf(c, p);
  const output = flag(p, 'output') ?? '';
  const wide = output === 'wide';
  const sel = flag(p, 'selector');
  const match = sel ? parseSelector(sel) : null;
  if (sel && !match) return fail(`error: unable to parse requirement: ${sel}`);
  const showLabels = has(p, 'show-labels');
  const extraCols = (flag(p, 'label-columns') ?? '').split(',').filter(Boolean);
  // tipos y nombres
  const targets: { kind: Kind; names: string[]; text: string }[] = [];
  if (p.args[0].includes('/')) for (const a of p.args) { const [t, n] = a.split('/'); const k = kindOf(t); if (!k && t !== 'all') return noType(t); if (!k) continue; targets.push({ kind: k, names: [n], text: t }); }
  else {
    const types = p.args[0].split(',');
    const names = p.args.slice(1);
    for (const t of types) {
      if (t === 'all') { for (const kk of ['pods', 'services', 'deployments', 'replicasets']) targets.push({ kind: kindOf(kk)!, names, text: kk }); continue; }
      const k = kindOf(t); if (!k) return noType(t);
      targets.push({ kind: k, names, text: t });
    }
  }
  const multi = targets.length > 1;
  const lines: string[] = []; const errors: string[] = []; const objects: Record<string, unknown>[] = [];
  let printed = 0;
  for (const { kind, names } of targets) {
    if (kind.kind === 'Event') { const r = getEvents(c, p, ns); if (r.ok) lines.push(r.out); else errors.push(r.out); continue; }
    if (kind.synthetic) {
      const { headers, rows, nsCol } = syntheticRows(c, kind, kind.namespaced ? ns : null);
      let sr = rows.map((r, i) => (allNs && kind.namespaced ? [nsCol[i], ...r] : r));
      if (names.length) { const found = sr.filter((r) => names.includes(r[allNs && kind.namespaced ? 1 : 0])); for (const n of names) if (!found.some((r) => r[allNs && kind.namespaced ? 1 : 0] === n)) errors.push(`Error from server (NotFound): ${fullName(kind)} "${n}" not found`); sr = found; }
      if (!sr.length) { if (!names.length) lines.push(kind.namespaced && !allNs ? `No resources found in ${ns} namespace.` : 'No resources found'); continue; }
      if (output === 'name') { lines.push(...sr.map((r) => `${prefix(kind)}/${r[allNs && kind.namespaced ? 1 : 0]}`)); continue; }
      if (printed++ && multi) lines.push('');
      lines.push(...table([allNs && kind.namespaced ? ['NAMESPACE', ...headers] : headers, ...sr.map((r) => multi ? r.map((x, i) => (i === (allNs && kind.namespaced ? 1 : 0) ? `${prefix(kind)}/${x}` : x)) : r)]));
      continue;
    }
    let items = listOf(c, kind).filter((it) => !kind.namespaced || ns === null || it.meta.namespace === ns);
    if (kind.namespaced && ns !== null && !c.ns(ns) && !names.length) { lines.push(`No resources found in ${ns} namespace.`); continue; }
    if (names.length) {
      const found: Item[] = [];
      for (const n of names) { const it = items.find((x) => x.meta.name === n); if (it) found.push(it); else errors.push(`Error from server (NotFound): ${fullName(kind)} "${n}" not found`); }
      items = found;
    } else {
      if (match) items = items.filter((it) => match(it.meta.labels));
      const fs = flag(p, 'field-selector');
      if (fs) for (const cond of fs.split(',')) { const m = cond.match(/^([\w.]+)(!?=)=?(.*)$/); if (!m) return fail(`error: field selector "${cond}" is invalid`); items = items.filter((it) => { const v = String(jsonpath(`{.${m[1]}}`, objectOf(c, it))); return m[2] === '=' ? v === m[3] : v !== m[3]; }); }
    }
    items = [...items].sort((a, b) => (a.meta.namespace ?? '').localeCompare(b.meta.namespace ?? '') || a.meta.name.localeCompare(b.meta.name));
    const sortBy = flag(p, 'sort-by');
    if (sortBy) items.sort((a, b) => { const va = String(jsonpath(`{${sortBy.startsWith('.') ? '' : '.'}${sortBy}}`, objectOf(c, a))); const vb = String(jsonpath(`{${sortBy.startsWith('.') ? '' : '.'}${sortBy}}`, objectOf(c, b))); return va < vb ? -1 : va > vb ? 1 : 0; });
    if (!items.length) { if (!names.length) lines.push(kind.namespaced && !allNs ? `No resources found in ${ns} namespace.` : 'No resources found'); continue; }
    if (output === 'name') { lines.push(...items.map((it) => `${prefix(kind)}/${it.meta.name}`)); continue; }
    if (output === 'yaml' || output === 'json' || output.startsWith('jsonpath') || output.startsWith('custom-columns')) { objects.push(...items.map((it) => objectOf(c, it))); continue; }
    if (output && !wide) return fail(`error: unable to match a printer suitable for the output format "${output}", allowed formats are: custom-columns,custom-columns-file,go-template,go-template-file,json,jsonpath,jsonpath-as-json,jsonpath-file,name,template,templatefile,wide,yaml`);
    const H = HEADERS[kind.kind];
    const headers = [...(allNs && kind.namespaced ? ['NAMESPACE'] : []), ...H.base, ...(wide ? H.wide : []), ...extraCols.map((x) => x.toUpperCase()), ...(showLabels ? ['LABELS'] : [])];
    const rows = items.map((it) => { const r = rowOf(c, it, wide); if (multi) r[0] = `${prefix(kind)}/${r[0]}`; return [...(allNs && kind.namespaced ? [it.meta.namespace!] : []), ...r, ...extraCols.map((x) => it.meta.labels[x] ?? ''), ...(showLabels ? [labelsText(it.meta.labels)] : [])]; });
    if (printed++ && multi) lines.push('');
    lines.push(...table([headers, ...rows]));
  }
  if (objects.length) {
    const single = objects.length === 1 && targets.length === 1 && targets[0].names.length === 1;
    const data = single ? objects[0] : { apiVersion: 'v1', items: objects, kind: 'List', metadata: { resourceVersion: '' } };
    if (output === 'yaml') lines.push(...toYaml(data));
    else if (output === 'json') lines.push(JSON.stringify(data, null, 4));
    else if (output.startsWith('jsonpath')) { const expr = output.replace(/^jsonpath=/, ''); const res = jsonpath(expr, data); lines.push(...res.split('\n')); if (lines.length && lines[lines.length - 1] === '') lines.pop(); }
    else if (output.startsWith('custom-columns')) {
      const cols = output.replace(/^custom-columns=/, '').split(',').map((cc) => { const i = cc.indexOf(':'); return [cc.slice(0, i), cc.slice(i + 1)]; });
      lines.push(...table([cols.map(([h]) => h), ...objects.map((o) => cols.map(([, pth]) => { const v = jsonpath(`{${pth}}`, o); return v === '' ? '<none>' : v; }))]));
    }
  }
  if (has(p, 'watch')) lines.push('(el simulador no admite --watch; repite el comando para ver cambios)');
  if (errors.length) return fail([...lines, ...errors]);
  return ok(lines);
}

function getEvents(c: Cluster, p: Parsed, ns: string | null): Result {
  let evs = c.events.filter((e) => ns === null || e.namespace === ns);
  const fs = flag(p, 'field-selector');
  if (fs) for (const cond of fs.split(',')) { const m = cond.match(/^([\w.]+)=(.*)$/); if (!m) return fail(`error: field selector "${cond}" is invalid`); evs = evs.filter((e) => { const o = eventObject(c, e); return String(jsonpath(`{.${m[1]}}`, o)) === m[2]; }); }
  const sortBy = flag(p, 'sort-by');
  if (sortBy) { const key = sortBy.replace(/^\./, ''); evs = [...evs].sort((a, b) => (key.includes('last') || key.includes('creation') ? a.time - b.time : 0)); }
  if (!evs.length) return ok(ns === null ? 'No resources found' : `No resources found in ${ns} namespace.`);
  const output = flag(p, 'output') ?? '';
  if (output === 'yaml') return ok(toYaml({ apiVersion: 'v1', items: evs.map((e) => eventObject(c, e)), kind: 'List', metadata: { resourceVersion: '' } }));
  if (output === 'json') return ok(JSON.stringify({ apiVersion: 'v1', items: evs.map((e) => eventObject(c, e)), kind: 'List', metadata: { resourceVersion: '' } }, null, 4));
  const wide = output === 'wide';
  const headers = [...(ns === null ? ['NAMESPACE'] : []), 'LAST SEEN', 'TYPE', 'REASON', 'OBJECT', ...(wide ? ['SUBOBJECT', 'SOURCE', 'MESSAGE', 'FIRST SEEN', 'COUNT', 'NAME'] : ['MESSAGE'])];
  const rows = evs.map((e) => [...(ns === null ? [e.namespace] : []), age(c.now - e.time), e.type, e.reason, e.object, ...(wide ? ['', e.from, e.message, age(c.now - e.first), String(e.count), `${e.object.split('/')[1]}.${hash(e.object + e.reason).toString(16)}`] : [e.message])]);
  return ok(table([headers, ...rows]));
}

// ---------- describe ----------
function describe(c: Cluster, p: Parsed): Result {
  if (!p.args.length) return fail(['error: You must specify the type of resource to describe. Use "kubectl api-resources" for a complete list of supported resources.', '', "error: Required resource not specified."]);
  const targets: { kind: Kind; names: string[] }[] = [];
  if (p.args[0].includes('/')) for (const a of p.args) { const [t, n] = a.split('/'); const k = kindOf(t); if (!k) return noType(t); targets.push({ kind: k, names: [n] }); }
  else { const k = kindOf(p.args[0]); if (!k) return noType(p.args[0]); targets.push({ kind: k, names: p.args.slice(1) }); }
  const ns = has(p, 'all-namespaces') ? null : nsOf(c, p);
  const sel = flag(p, 'selector');
  const match = sel ? parseSelector(sel) : null;
  const out: string[] = []; let failed = false;
  for (const { kind, names } of targets) {
    if (kind.synthetic) { for (const n of names) out.push(`Error from server (NotFound): ${fullName(kind)} "${n}" not found`); if (!names.length) out.push(`No resources found in ${ns} namespace.`); failed = names.length > 0; continue; }
    let items = listOf(c, kind).filter((it) => !kind.namespaced || ns === null || it.meta.namespace === ns);
    if (names.length) {
      const found: Item[] = [];
      for (const n of names) { const exact = items.find((x) => x.meta.name === n); const pref = exact ? [exact] : items.filter((x) => x.meta.name.startsWith(n)); if (!pref.length) { out.push(`Error from server (NotFound): ${fullName(kind)} "${n}" not found`); failed = true; } found.push(...pref); }
      items = found;
    } else if (match) items = items.filter((it) => match(it.meta.labels));
    if (!items.length && !names.length) { out.push(`No resources found in ${ns} namespace.`); continue; }
    items.forEach((it, i) => {
      if (i > 0 || out.length) out.push('', '');
      switch (it.kind) {
        case 'Pod': out.push(...describePod(c, it)); break;
        case 'Deployment': out.push(...describeDeployment(c, it)); break;
        case 'ReplicaSet': out.push(...describeReplicaSet(c, it)); break;
        case 'Service': out.push(...describeService(c, it)); break;
        case 'Node': out.push(...describeNode(c, it)); break;
        case 'Namespace': out.push(...describeNamespace(c, it)); break;
        case 'ConfigMap': out.push(...describeConfigMap(c, it)); break;
        case 'Secret': out.push(...describeSecret(c, it)); break;
      }
    });
  }
  return failed ? fail(out) : ok(out);
}

// ---------- explain ----------
function explain(p: Parsed): Result {
  const arg = p.args[0];
  if (!arg) return fail(['error: You must specify the type of resource to explain. Use "kubectl api-resources" for a complete list of supported resources.', '', 'Ejemplos: kubectl explain pod.spec.containers   kubectl explain deployment.spec.strategy']);
  const [res, ...fields] = arg.split('.');
  const k = kindOf(res);
  if (!k) return noType(res);
  const key = [k.plural, ...fields].join('.');
  const e = EXPLAIN[key];
  if (!e) {
    if (!EXPLAIN[k.plural]) return fail(`error: el simulador solo documenta pods, deployments y services (recibido: ${res})`);
    return fail(`error: field "${fields[fields.length - 1]}" does not exist`);
  }
  const lines = [`KIND:       ${e.kind}`, `VERSION:    ${e.version}`, ''];
  if (fields.length) lines.push(`FIELD: ${fields[fields.length - 1]} ${e.fields ? `<${e.fields.length ? 'Object' : 'string'}>` : '<string>'}`.replace(/ <Object>$/, ` <${key.endsWith('containers') || key.endsWith('volumes') || key.endsWith('ports') ? '[]Object' : 'Object'}>`), '');
  lines.push('DESCRIPTION:', ...wrap(e.description, 80, '    '));
  if (e.fields) {
    lines.push('', 'FIELDS:');
    for (const [name, type, desc] of e.fields) lines.push(`  ${name}\t${type}`, ...wrap(desc, 80, '    '), '');
    lines.pop();
  }
  return ok(lines);
}

// ---------- config ----------
function config(c: Cluster, p: Parsed): Result {
  const sub = p.args[0];
  switch (sub) {
    case 'current-context': return ok(CONTEXT);
    case 'get-contexts': return ok(table([['CURRENT', 'NAME', 'CLUSTER', 'AUTHINFO', 'NAMESPACE'], ['*', CONTEXT, CONTEXT, CONTEXT, c.currentNamespace === 'default' ? '' : c.currentNamespace]]));
    case 'use-context': { const n = p.args[1]; if (!n) return fail('error: empty context names are not allowed'); if (n !== CONTEXT) return fail(`error: no context exists with the name: "${n}"`); return ok(`Switched to context "${CONTEXT}".`); }
    case 'set-context': {
      const target = has(p, 'current') ? CONTEXT : p.args[1];
      if (!target) return fail('error: you must specify a non-empty context name or --current');
      if (target !== CONTEXT) return ok(`Context "${target}" created.`);
      const ns = flag(p, 'namespace');
      if (ns !== undefined) c.currentNamespace = ns;
      return ok(`Context "${CONTEXT}" modified.`);
    }
    case 'view': return ok(toYaml({ apiVersion: 'v1', clusters: [{ cluster: { 'certificate-authority-data': 'DATA+OMITTED', server: 'https://127.0.0.1:6443' }, name: CONTEXT }], contexts: [{ context: { cluster: CONTEXT, user: CONTEXT, ...(c.currentNamespace !== 'default' ? { namespace: c.currentNamespace } : {}) }, name: CONTEXT }], 'current-context': CONTEXT, kind: 'Config', preferences: {}, users: [{ name: CONTEXT, user: { 'client-certificate-data': 'DATA+OMITTED', 'client-key-data': 'DATA+OMITTED' } }] }));
    case undefined: return fail(['Modify kubeconfig files using subcommands like "kubectl config set current-context my-context".', '', 'Available Commands:', '  current-context   Display the current-context', '  get-contexts      Describe one or many contexts', '  set-context       Set a context entry in kubeconfig', '  use-context       Set the current-context in a kubeconfig file', '  view              Display merged kubeconfig settings or a specified kubeconfig file']);
    default: return fail([`error: unknown command "${sub}" for "kubectl config"`, '', "Run 'kubectl config --help' for usage."]);
  }
}

// ---------- api-resources / top / misc ----------
function apiResources(): Result {
  const rows = [['NAME', 'SHORTNAMES', 'APIVERSION', 'NAMESPACED', 'KIND'], ...KINDS.filter((k) => k.kind !== 'Endpoints' || true).sort((a, b) => (a.group || '').localeCompare(b.group || '') || a.plural.localeCompare(b.plural)).map((k) => [k.plural, k.short, k.apiVersion, String(k.namespaced), k.kind])];
  return ok(table(rows));
}

function top(c: Cluster, p: Parsed): Result {
  const what = p.args[0];
  if (!what) return fail(['error: el simulador admite "kubectl top pods" y "kubectl top nodes"']);
  const k = kindOf(what);
  if (!k || !['Pod', 'Node'].includes(k.kind)) return fail([`error: unknown command "${what}" for "kubectl top"`, '', "Run 'kubectl top --help' for usage."]);
  const sel = flag(p, 'selector'); const match = sel ? parseSelector(sel) : null;
  if (k.kind === 'Node') {
    const rows = c.nodes.map((n) => { const pods = c.pods.filter((x) => x.spec.nodeName === n.meta.name && x.status.phase === 'Running').length; const cpu = (n.role === 'control-plane' ? 180 : 40) + pods * 7 + (hash(n.meta.name) % 20); const mem = (n.role === 'control-plane' ? 1150 : 520) + pods * 12; return [n.meta.name, `${cpu}m`, `${Math.round((cpu / n.cpu) * 100)}%`, `${mem}Mi`, `${Math.round((mem / n.mem) * 100)}%`]; });
    return ok(table([['NAME', 'CPU(cores)', 'CPU(%)', 'MEMORY(bytes)', 'MEMORY(%)'], ...rows]));
  }
  const allNs = has(p, 'all-namespaces'); const ns = allNs ? null : nsOf(c, p);
  let pods = c.pods.filter((x) => (ns === null || x.meta.namespace === ns) && x.status.phase === 'Running' && !x.status.deleting);
  if (match) pods = pods.filter((x) => match(x.meta.labels));
  if (p.args[1]) { pods = pods.filter((x) => x.meta.name === p.args[1]); if (!pods.length) return fail(`Error from server (NotFound): pods "${p.args[1]}" not found`); }
  if (!pods.length) return fail(ns === null ? 'No resources found' : `No resources found in ${ns} namespace.`);
  const usage = (x: Pod) => { const b = x.spec.containers[0].image; const h = hash(x.meta.name); const sys = x.meta.namespace === 'kube-system'; const cpu = b.includes('apiserver') ? 45 + (h % 20) : b.includes('etcd') ? 20 + (h % 10) : sys ? 1 + (h % 5) : b.startsWith('redis') ? 3 + (h % 4) : 1 + (h % 3); const mem = b.includes('apiserver') ? 260 + (h % 40) : b.includes('etcd') ? 60 + (h % 20) : sys ? 12 + (h % 30) : b.startsWith('redis') ? 8 + (h % 4) : b.startsWith('busybox') ? 0 : 3 + (h % 5); return [`${cpu}m`, `${mem}Mi`]; };
  const sortBy = flag(p, 'sort-by');
  pods = [...pods].sort((a, b) => (a.meta.namespace ?? '').localeCompare(b.meta.namespace ?? '') || a.meta.name.localeCompare(b.meta.name));
  if (sortBy === 'memory' || sortBy === 'cpu') pods.sort((a, b) => parseInt(usage(b)[sortBy === 'cpu' ? 0 : 1]) - parseInt(usage(a)[sortBy === 'cpu' ? 0 : 1]));
  const rows = pods.map((x) => [...(allNs ? [x.meta.namespace!] : []), x.meta.name, ...(has(p, 'containers') ? [x.spec.containers[0].name] : []), ...usage(x)]);
  return ok(table([[...(allNs ? ['NAMESPACE'] : []), has(p, 'containers') ? 'POD' : 'NAME', ...(has(p, 'containers') ? ['NAME'] : []), 'CPU(cores)', 'MEMORY(bytes)'], ...rows]));
}

const SUBCOMMANDS = ['annotate', 'api-resources', 'api-versions', 'apply', 'attach', 'auth', 'autoscale', 'certificate', 'cluster-info', 'completion', 'config', 'cordon', 'cp', 'create', 'debug', 'delete', 'describe', 'diff', 'drain', 'edit', 'events', 'exec', 'explain', 'expose', 'get', 'help', 'kustomize', 'label', 'logs', 'options', 'patch', 'plugin', 'port-forward', 'proxy', 'replace', 'rollout', 'run', 'scale', 'set', 'taint', 'top', 'uncordon', 'version', 'wait'];

function kubectl(c: Cluster, tokens: string[]): Result {
  const cmd = tokens[0];
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return ok(KUBECTL_USAGE);
  const p = parseFlags(tokens.slice(1), cmd);
  if (has(p, 'help')) return ok([`Ayuda de "kubectl ${cmd}" en la documentación oficial: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_${cmd.replace(/-/g, '_')}/`, ...HELP.filter((l) => l.includes(`kubectl ${cmd}`))]);
  const ns = flag(p, 'namespace');
  if (ns && !c.ns(ns) && ['run', 'create', 'expose', 'apply'].includes(cmd) && !has(p, 'dry-run')) { /* cada comando reporta el NotFound con su formato */ }
  switch (cmd) {
    case 'get': return get(c, p);
    case 'describe': return describe(c, p);
    case 'run': return run(c, p);
    case 'create': return create(c, p);
    case 'apply': return has(p, 'kustomize') ? fail('error: el simulador no admite -k (kustomize); usa kubectl apply -f <archivo>') : applyFiles(c, p, 'apply');
    case 'replace': return applyFiles(c, p, 'apply');
    case 'expose': return expose(c, p);
    case 'scale': return scale(c, p);
    case 'set': return setImage(c, p);
    case 'rollout': return rollout(c, p);
    case 'delete': return del(c, p);
    case 'logs': return logs(c, p);
    case 'exec': return exec(c, p);
    case 'label': return label(c, p);
    case 'annotate': return annotate(c, p);
    case 'taint': return taint(c, p);
    case 'explain': return explain(p);
    case 'config': return config(c, p);
    case 'api-resources': return apiResources();
    case 'api-versions': return ok(['admissionregistration.k8s.io/v1', 'apiextensions.k8s.io/v1', 'apiregistration.k8s.io/v1', 'apps/v1', 'authentication.k8s.io/v1', 'authorization.k8s.io/v1', 'autoscaling/v1', 'autoscaling/v2', 'batch/v1', 'certificates.k8s.io/v1', 'coordination.k8s.io/v1', 'discovery.k8s.io/v1', 'events.k8s.io/v1', 'flowcontrol.apiserver.k8s.io/v1', 'gateway.networking.k8s.io/v1', 'metrics.k8s.io/v1beta1', 'networking.k8s.io/v1', 'node.k8s.io/v1', 'policy/v1', 'rbac.authorization.k8s.io/v1', 'scheduling.k8s.io/v1', 'storage.k8s.io/v1', 'v1']);
    case 'top': return top(c, p);
    case 'events': return getEvents(c, p, has(p, 'all-namespaces') ? null : nsOf(c, p));
    case 'version': return ok([`Client Version: ${KUBE_VERSION}`, 'Kustomize Version: v5.7.1', `Server Version: ${KUBE_VERSION}`]);
    case 'cluster-info': return ok(['Kubernetes control plane is running at https://127.0.0.1:6443', 'CoreDNS is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy', '', "To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'."]);
    case 'auth': return p.args[0] === 'whoami' ? ok(table([['ATTRIBUTE', 'VALUE'], ['Username', 'kubernetes-admin'], ['Groups', '[kubeadm:cluster-admins system:authenticated]']])) : p.args[0] === 'can-i' ? ok('yes') : fail(`error: unknown command "${p.args[0] ?? ''}" for "kubectl auth"`);
    case 'cordon': case 'uncordon': { const n = c.node(p.args[0] ?? ''); if (!n) return p.args[0] ? notFound(kindOf('nodes')!, p.args[0]) : fail('error: USAGE: cordon NODE'); n.ready = cmd === 'uncordon'; return ok(`node/${n.meta.name} ${cmd === 'cordon' ? 'cordoned' : 'uncordoned'}`); }
    case 'edit': return fail(['error: el simulador no abre un editor. Alternativas: kubectl set image, kubectl scale, kubectl label, kubectl apply -f <archivo>']);
    case 'port-forward': return fail(['error: el simulador no puede abrir puertos locales. Prueba desde dentro del clúster: kubectl exec <pod> -- wget -qO- http://<service>']);
    case 'wait': { const m = (p.args[0] ?? '').split('/'); const k = kindOf(m[0] ?? ''); if (!k || !m[1]) return fail('error: el simulador admite kubectl wait --for=condition=Ready pod/<nombre>'); const target = listOf(c, k).find((x) => x.meta.name === m[1] && x.meta.namespace === nsOf(c, p)); if (!target) return notFound(k, m[1]); for (let i = 0; i < 60; i++) { if (target.kind === 'Pod' ? target.status.ready : target.kind === 'Deployment' ? c.deploymentStatus(target).ready === target.spec.replicas : true) return ok(`${prefix(k)}/${m[1]} condition met`); c.tick(1000); } return fail(`error: timed out waiting for the condition on ${k.plural}/${m[1]}`); }
    case 'debug': case 'cp': case 'attach': case 'patch': case 'diff': case 'drain': case 'autoscale': case 'proxy': case 'certificate': case 'kustomize': case 'plugin': case 'completion': case 'options': return fail([`error: "kubectl ${cmd}" no está implementado en el simulador. Practícalo en el clúster real del curso (.\\kcna.ps1 up).`]);
    default: return fail([`error: unknown command "${cmd}" for "kubectl"`, '', "Run 'kubectl --help' for usage."]);
  }
}

// ---------- shell ----------
function applyPipe(lines: string[], pipe: string[]): string[] {
  const [cmd, ...args] = pipe;
  switch (cmd?.toLowerCase()) {
    case 'grep': case 'select-string': case 'findstr': case 'sls': {
      const ci = args.includes('-i') || args.includes('/i') || cmd.toLowerCase() !== 'grep';
      const neg = args.includes('-v') || args.includes('-notmatch');
      const count = args.includes('-c');
      const pats = args.filter((a) => !a.startsWith('-') && !a.startsWith('/'));
      if (!pats.length) return [`Uso: | ${cmd} <texto>`];
      const pat = pats[0];
      const pattern = cmd.toLowerCase() === 'grep' && pats[0].includes('\\|') ? new RegExp(pats[0].replace(/\\\|/g, '|'), ci ? 'i' : '') : null;
      const m = (l: string) => (pattern ? pattern.test(l) : ci ? l.toLowerCase().includes(pat.toLowerCase()) : l.includes(pat));
      const out = lines.filter((l) => (neg ? !m(l) : m(l)));
      return count ? [String(out.length)] : out;
    }
    case 'head': { const n = args.includes('-n') ? Number(args[args.indexOf('-n') + 1]) : args[0]?.startsWith('-') ? Number(args[0].slice(1)) : 10; return lines.slice(0, n); }
    case 'tail': { const n = args.includes('-n') ? Number(args[args.indexOf('-n') + 1]) : args[0]?.startsWith('-') ? Number(args[0].slice(1)) : 10; return lines.slice(-n); }
    case 'select-object': case 'select': { const i = args.findIndex((a) => /^-(first|last)$/i.test(a)); if (i < 0) return lines; const n = Number(args[i + 1]); return /first/i.test(args[i]) ? lines.slice(0, n) : lines.slice(-n); }
    case 'wc': return [String(args.includes('-l') ? lines.length : lines.join('\n').length)];
    case 'measure-object': return [String(lines.length)];
    case 'sort': case 'sort-object': return [...lines].sort();
    case 'uniq': return lines.filter((l, i) => i === 0 || l !== lines[i - 1]);
    default: return [`${cmd}: filtro no soportado tras "|". Usa grep, Select-String, head, tail, wc -l o sort.`];
  }
}

/** Divide por "|" fuera de comillas. */
function splitPipes(line: string): string[] {
  const parts: string[] = []; let cur = ''; let q: string | null = null;
  for (const ch of line) { if (q) { if (ch === q) q = null; cur += ch; continue; } if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; } if (ch === '|') { parts.push(cur); cur = ''; continue; } cur += ch; }
  parts.push(cur);
  return parts;
}

/** Ejecuta una línea completa escrita en la terminal. */
export function execute(c: Cluster, line: string): Result {
  const trimmed = line.trim();
  if (!trimmed) return ok('');
  const [first, ...pipes] = splitPipes(trimmed);
  const tokens = tokenize(first.trim());
  const cmd = tokens[0];
  let r: Result;
  switch (cmd) {
    case 'kubectl': case 'k': c.reconcile(); r = kubectl(c, tokens.slice(1)); break;
    case 'clear': case 'cls': case 'Clear-Host': return { out: '', ok: true, clear: true };
    case 'help': case '?': r = ok(HELP); break;
    case 'ls': case 'dir': case 'Get-ChildItem': case 'gci': r = ok(fileNames()); break;
    case 'cat': case 'type': case 'Get-Content': case 'gc': { const f = tokens[1]; if (!f) { r = fail('cat: falta el nombre del archivo (prueba: ls)'); break; } const F = FILES[f.replace(/^\.[\\/]/, '')]; r = F ? ok(F.text.replace(/\n$/, '')) : fail(`cat: ${f}: No such file or directory`); break; }
    case 'echo': case 'Write-Host': case 'Write-Output': r = ok(tokens.slice(1).join(' ')); break;
    case 'pwd': case 'Get-Location': r = ok('C:\\Users\\alumno\\KubernetesLearning'); break;
    case 'cd': case 'Set-Location': r = ok(''); break;
    case 'helm': r = fail(['helm no está en el simulador: se practica en el módulo 12 con el clúster real.']); break;
    case 'podman': case 'docker': r = fail([`${cmd} no está en el simulador: esta terminal solo habla con el clúster (kubectl). El módulo 01 usa Podman en tu máquina.`]); break;
    case 'kind': r = fail(['kind no está en el simulador: el clúster ya está "encendido". Usa kubectl get nodes.']); break;
    case 'exit': case 'logout': r = ok('Esta terminal vive en la página: no hay sesión que cerrar. Escribe clear para limpiar.'); break;
    case 'kcna': case '.\\kcna.ps1': r = fail(['kcna.ps1 es el CLI del laboratorio real (PowerShell). Aquí el clúster simulado ya está listo: prueba kubectl get nodes.']); break;
    case 'kubect': case 'kubctl': case 'kubelet': case 'kubeclt': r = fail([`${cmd}: comando no reconocido. ¿Querías decir kubectl?`]); break;
    default: r = fail([`${cmd}: comando no reconocido. Escribe help para ver los comandos del simulador.`]);
  }
  if (pipes.length && r.out) {
    let lines = r.out.split('\n');
    for (const pz of pipes) lines = applyPipe(lines, tokenize(pz.trim()));
    r = { ...r, out: lines.join('\n') };
  }
  return r;
}

// ---------- autocompletado ----------
const FLAGS: Record<string, string[]> = {
  get: ['-n', '-A', '-o', '-l', '--show-labels', '--all-namespaces', '--namespace=', '--output=', '--selector=', '--sort-by=', '--field-selector=', '-L', '-w'],
  describe: ['-n', '-l', '--namespace='],
  run: ['--image=', '--port=', '--labels=', '--restart=Never', '--env=', '--dry-run=client', '-o', '-n', '--command'],
  create: ['--image=', '--replicas=', '--from-literal=', '--dry-run=client', '-o', '-n', '-f', '--port='],
  expose: ['--port=', '--target-port=', '--type=NodePort', '--type=ClusterIP', '--name=', '--dry-run=client', '-o', '-n'],
  scale: ['--replicas=', '-n'],
  rollout: ['--to-revision=', '--revision=', '-n', '--timeout='],
  delete: ['-n', '-l', '--all', '-f', '--force', '--grace-period=0'],
  logs: ['-c', '--previous', '--tail=', '-l', '--prefix', '-n', '-f'],
  exec: ['-c', '-n', '-it', '--'],
  label: ['--overwrite', '-n', '-l'],
  annotate: ['--overwrite', '-n'],
  apply: ['-f', '-n', '--dry-run=client', '--server-side'],
  config: ['--current', '--namespace='],
  top: ['-n', '-A', '--sort-by=cpu', '--sort-by=memory', '--containers'],
  set: ['-n'],
};
const RESOURCE_WORDS = ['pods', 'po', 'deployments', 'deploy', 'replicasets', 'rs', 'services', 'svc', 'configmaps', 'cm', 'secrets', 'namespaces', 'ns', 'nodes', 'no', 'events', 'ev', 'all', 'endpoints', 'ep', 'serviceaccounts', 'sa', 'daemonsets', 'ds'];

/** Candidatos para completar el último token de la línea. */
export function complete(c: Cluster, line: string): { candidates: string[]; prefix: string } {
  const endsWithSpace = /\s$/.test(line);
  const tokens = tokenize(line);
  const prefix = endsWithSpace ? '' : (tokens[tokens.length - 1] ?? '');
  const prev = endsWithSpace ? tokens : tokens.slice(0, -1);
  const p = parseFlags(prev.slice(2));
  const ns = flag(p, 'namespace') ?? c.currentNamespace;
  const allNs = has(p, 'all-namespaces');
  let cands: string[] = [];
  const names = (kinds: string[]) => kinds.flatMap((kk) => { const k = kindOf(kk); return k ? listOf(c, k).filter((it) => !k.namespaced || allNs || it.meta.namespace === ns).map((it) => it.meta.name) : []; });
  const lastPrev = prev[prev.length - 1] ?? '';
  if (!prev.length) cands = ['kubectl', 'k', 'clear', 'help', 'ls', 'cat'];
  else if (prev[0] === 'cat' || prev[0] === 'type') cands = fileNames();
  else if (prev[0] === 'kubectl' || prev[0] === 'k') {
    const sub = prev[1];
    const args = p.args;
    if (!sub) cands = SUBCOMMANDS;
    else if (['-n', '--namespace', '-n='].includes(lastPrev) || lastPrev.startsWith('--namespace=')) cands = c.namespaces.map((n) => n.meta.name);
    else if (lastPrev === '-f' || lastPrev === '--filename') cands = fileNames();
    else if (lastPrev === '-o' || lastPrev === '--output') cands = ['wide', 'yaml', 'json', 'name', 'jsonpath='];
    else if (lastPrev === '-c' || lastPrev === '--container') cands = c.pods.flatMap((x) => x.spec.containers.map((ct) => ct.name));
    else if (prefix.startsWith('-')) cands = ['--namespace=', ...(FLAGS[sub] ?? ['-n'])];
    else switch (sub) {
      case 'get': case 'describe': case 'delete': case 'edit': case 'label': case 'annotate': case 'explain':
        if (!args.length) cands = RESOURCE_WORDS.concat(sub === 'explain' ? ['pod.spec', 'pod.spec.containers', 'deployment.spec', 'deployment.spec.strategy', 'service.spec'] : []);
        else if (sub === 'explain') cands = Object.keys(EXPLAIN).flatMap((k) => [k, k.replace(/^pods/, 'pod').replace(/^deployments/, 'deployment').replace(/^services/, 'service')]);
        else cands = names(args[0].split(','));
        break;
      case 'logs': case 'exec': case 'port-forward': case 'top':
        if (sub === 'top' && !args.length) cands = ['pods', 'nodes'];
        else if (sub === 'exec' && args.length >= 1 && !prev.includes('--')) cands = ['--'];
        else if (prev.includes('--')) cands = ['env', 'ls', 'cat', 'hostname', 'nslookup', 'wget', 'sh', 'ps', 'id', 'cat /etc/hostname', 'cat /etc/resolv.conf', 'nslookup web', 'wget -qO- http://web'];
        else cands = names(['pods']).concat(sub === 'logs' ? c.deployments.filter((d) => d.meta.namespace === ns).map((d) => `deployment/${d.meta.name}`) : []);
        break;
      case 'scale': case 'expose': case 'autoscale':
        if (!args.length) cands = ['deployment', 'deploy', 'rs', 'pod', ...c.deployments.filter((d) => d.meta.namespace === ns).map((d) => `deployment/${d.meta.name}`)];
        else cands = names([args[0]]);
        break;
      case 'rollout':
        if (!args.length) cands = ['status', 'history', 'undo', 'restart', 'pause', 'resume'];
        else if (args.length === 1) cands = ['deployment', ...c.deployments.filter((d) => d.meta.namespace === ns).map((d) => `deployment/${d.meta.name}`)];
        else cands = names(['deployments']);
        break;
      case 'set':
        if (!args.length) cands = ['image'];
        else if (args.length === 1) cands = ['deployment', ...c.deployments.filter((d) => d.meta.namespace === ns).map((d) => `deployment/${d.meta.name}`)];
        else if (args.length === 2 && !args[1].includes('/')) cands = names(['deployments']);
        else { const dn = args[1].includes('/') ? args[1].split('/')[1] : args[2]; const d = c.deployment(ns, dn ?? ''); cands = d ? d.spec.template.containers.map((ct) => `${ct.name}=`) : []; }
        break;
      case 'create':
        if (!args.length) cands = ['deployment', 'namespace', 'configmap', 'secret', '-f'];
        else if (args[0] === 'secret' && args.length === 1) cands = ['generic'];
        break;
      case 'config':
        if (!args.length) cands = ['get-contexts', 'current-context', 'set-context', 'use-context', 'view'];
        else if (args[0] === 'set-context') cands = ['--current', '--namespace='];
        else if (args[0] === 'use-context') cands = [CONTEXT];
        break;
      case 'run': cands = ['--image=']; break;
      case 'apply': cands = ['-f']; break;
      case 'taint': case 'cordon': case 'uncordon': cands = args.length ? names(['nodes']) : ['node', ...c.nodes.map((n) => n.meta.name)]; break;
      default: cands = [];
    }
  }
  if (prefix.startsWith('--image=')) cands = ['nginx:1.27-alpine', 'nginx:1.28-alpine', 'busybox:1.37', 'traefik/whoami:v1.11', 'redis:7.4-alpine'].map((i) => '--image=' + i);
  const uniq = [...new Set(cands)].filter((x) => x.startsWith(prefix) && x !== prefix).sort();
  return { candidates: uniq, prefix };
}

export const imageTagOf = imageTag;
export type { Pod, Service };
