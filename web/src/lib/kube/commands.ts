// Comandos que modifican el clúster (run, create, expose, scale, set, rollout, delete, label, annotate, taint, apply)
// y los que entran en los contenedores (logs, exec).
import { type Cluster, type Pod, type Deployment, type PodTemplate, type Labels, containerNameFrom } from './cluster.ts';
import { type Parsed, type Result, type Kind, ok, fail, flag, has, nsOf, kindOf, typeAndName, parseSelector, notFound, alreadyExists, noType, nsNotFound, prefix, fullName, listOf } from './common.ts';
import { toYaml, iso } from './format.ts';
import { FILES, type Manifest } from './files.ts';
import { logsOf, runInContainer } from './exec.ts';

const S = 1000;
const dryRun = (p: Parsed) => has(p, 'dry-run') && flag(p, 'dry-run') !== 'none';
const yamlOut = (p: Parsed) => ['yaml', 'json'].includes(flag(p, 'output') ?? '');
const emit = (p: Parsed, obj: unknown) => ok(flag(p, 'output') === 'json' ? JSON.stringify(obj, null, 4) : toYaml(obj));
const parseKV = (s: string): [string, string] | null => { const i = s.indexOf('='); return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : null; };
const ensureNs = (c: Cluster, ns: string) => (c.ns(ns) && c.ns(ns)!.status === 'Active' ? null : nsNotFound(ns));
const invalidName = (name: string) => (/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name) ? null : fail(`The ${'Pod'} "${name}" is invalid: metadata.name: Invalid value: "${name}": a lowercase RFC 1123 subdomain must consist of lower case alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character (e.g. 'example.com', regex used for validation is '[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*')`));

function containerYaml(image: string, name: string, ports: number[], env: Labels, command?: string[]) {
  const o: Record<string, unknown> = { image, name, resources: {} };
  if (ports.length) o.ports = ports.map((containerPort) => ({ containerPort }));
  if (Object.keys(env).length) o.env = Object.entries(env).map(([n, value]) => ({ name: n, value }));
  if (command?.length) o.command = command;
  return o;
}

// ---------- run ----------
export function run(c: Cluster, p: Parsed): Result {
  const name = p.args[0];
  if (!name) return fail('error: NAME is required for run');
  const image = flag(p, 'image');
  if (!image) return fail('error: required flag(s) "image" not set');
  const bad = invalidName(name); if (bad) return bad;
  const ns = nsOf(c, p);
  const labels: Labels = {};
  // en `run`, -l significa --labels (en get/delete es --selector)
  for (const l of [...(p.flags['labels'] ?? []), ...(p.flags['selector'] ?? [])]) for (const kv of l.split(',')) { const e = parseKV(kv); if (e) labels[e[0]] = e[1]; }
  if (!Object.keys(labels).length) labels.run = name;
  const env: Labels = {};
  for (const e of p.flags['env'] ?? []) { const kv = parseKV(e); if (kv) env[kv[0]] = kv[1]; }
  const ports = flag(p, 'port') ? [Number(flag(p, 'port'))] : [];
  const restart = (flag(p, 'restart') as PodTemplate['restartPolicy']) ?? 'Always';
  if (!['Always', 'Never', 'OnFailure'].includes(restart)) return fail(`error: invalid restart policy: ${restart}`);
  const command = p.rest.length ? p.rest : undefined;
  if (dryRun(p) && !yamlOut(p)) return ok(`pod/${name} created (dry run)`);
  if (dryRun(p)) {
    const o: Record<string, unknown> = { apiVersion: 'v1', kind: 'Pod', metadata: { creationTimestamp: null, labels, name, ...(flag(p, 'namespace') ? { namespace: ns } : {}) }, spec: { containers: [containerYaml(image, name, ports, env, has(p, 'command') ? command : undefined)], dnsPolicy: 'ClusterFirst', restartPolicy: restart }, status: {} };
    if (command && !has(p, 'command')) (o.spec as Record<string, unknown[]>).containers[0] = { ...containerYaml(image, name, ports, env), args: command };
    return emit(p, o);
  }
  const nsErr = ensureNs(c, ns); if (nsErr) return nsErr;
  if (c.pod(ns, name)) return alreadyExists(kindOf('pods')!, name);
  const pod = c.createPod(ns, name, { labels, annotations: {}, containers: [{ name, image, ports, env, command }], restartPolicy: restart, tolerations: [] });
  void pod;
  c.reconcile();
  const lines = [`pod/${name} created`];
  if (has(p, 'tty') || has(p, 'stdin')) lines.unshift('Unable to use a TTY - la terminal simulada no admite sesiones interactivas; el pod se crea igualmente.');
  if (has(p, 'rm')) lines.push('(--rm ignorado: sin sesión interactiva el pod no se borra solo)');
  return ok(lines);
}

// ---------- create ----------
export function create(c: Cluster, p: Parsed): Result {
  if (flag(p, 'filename')) return applyFiles(c, p, 'create');
  const sub = p.args[0];
  const ns = nsOf(c, p);
  if (!sub) return fail(['error: must specify one of -f and -k', '', 'Ejemplos: kubectl create deployment web --image=nginx:1.27-alpine --replicas=3', '          kubectl create namespace lab', '          kubectl create configmap cfg --from-literal=k=v', '          kubectl create secret generic db --from-literal=PASSWORD=x']);
  const name = p.args[1];
  switch (sub) {
    case 'deployment': case 'deploy': {
      if (!name) return fail('error: NAME is required.');
      const image = flag(p, 'image');
      if (!image) return fail('error: required flag(s) "image" not set');
      const replicas = flag(p, 'replicas') !== undefined ? Number(flag(p, 'replicas')) : 1;
      if (!Number.isInteger(replicas) || replicas < 0) return fail(`error: invalid argument "${flag(p, 'replicas')}" for "-r, --replicas" flag: strconv.ParseInt: parsing "${flag(p, 'replicas')}": invalid syntax`);
      const ports = flag(p, 'port') ? [Number(flag(p, 'port'))] : [];
      const cname = containerNameFrom(image);
      if (dryRun(p) && !yamlOut(p)) return ok(`deployment.apps/${name} created (dry run)`);
      if (dryRun(p)) return emit(p, { apiVersion: 'apps/v1', kind: 'Deployment', metadata: { creationTimestamp: null, labels: { app: name }, name, ...(flag(p, 'namespace') ? { namespace: ns } : {}) }, spec: { replicas, selector: { matchLabels: { app: name } }, strategy: {}, template: { metadata: { creationTimestamp: null, labels: { app: name } }, spec: { containers: [containerYaml(image, cname, ports, {}, p.rest.length ? p.rest : undefined)] } } }, status: {} });
      const nsErr = ensureNs(c, ns); if (nsErr) return nsErr;
      if (c.deployment(ns, name)) return alreadyExists(kindOf('deployments')!, name);
      const d = c.createDeployment(ns, name, image, replicas);
      d.spec.template.containers[0].ports = ports;
      if (p.rest.length) d.spec.template.containers[0].command = p.rest;
      c.reconcile();
      return ok(`deployment.apps/${name} created`);
    }
    case 'namespace': case 'ns': {
      if (!name) return fail('error: NAME is required.');
      if (dryRun(p) && !yamlOut(p)) return ok(`namespace/${name} created (dry run)`);
      if (dryRun(p)) return emit(p, { apiVersion: 'v1', kind: 'Namespace', metadata: { creationTimestamp: null, name }, spec: {}, status: {} });
      if (c.ns(name)) return alreadyExists(kindOf('namespaces')!, name);
      c.createNamespace(name);
      return ok(`namespace/${name} created`);
    }
    case 'configmap': case 'cm': case 'secret': {
      let n = name;
      let type = 'Opaque';
      if (sub === 'secret') {
        if (!name) return fail(['error: must specify a secret type: generic, tls or docker-registry', 'Ejemplo: kubectl create secret generic db --from-literal=PASSWORD=valor']);
        if (name !== 'generic') return fail(`error: el simulador solo admite "kubectl create secret generic" (recibido: ${name})`);
        n = p.args[2];
        type = 'Opaque';
      }
      if (!n) return fail('error: NAME is required.');
      const data: Labels = {};
      for (const kv of p.flags['from-literal'] ?? []) { const e = parseKV(kv); if (!e) return fail(`error: invalid literal source ${kv}, expected key=value`); data[e[0]] = e[1]; }
      for (const f of p.flags['from-file'] ?? []) { const [k, file] = f.includes('=') ? f.split('=') : [f.split(/[\\/]/).pop()!, f]; const F = FILES[file]; if (!F) return fail(`error: error reading ${file}: no such file or directory`); data[k] = F.text; }
      if (dryRun(p) && !yamlOut(p)) return ok(`${sub === 'secret' ? 'secret' : 'configmap'}/${n} created (dry run)`);
      if (dryRun(p)) return emit(p, sub === 'secret' ? { apiVersion: 'v1', data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, btoa(v)])), kind: 'Secret', metadata: { creationTimestamp: null, name: n, ...(flag(p, 'namespace') ? { namespace: ns } : {}) }, type } : { apiVersion: 'v1', data, kind: 'ConfigMap', metadata: { creationTimestamp: null, name: n, ...(flag(p, 'namespace') ? { namespace: ns } : {}) } });
      const nsErr = ensureNs(c, ns); if (nsErr) return nsErr;
      if (sub === 'secret') { if (c.secret(ns, n)) return alreadyExists(kindOf('secrets')!, n); c.createSecret(ns, n, data, c.now, type); return ok(`secret/${n} created`); }
      if (c.configmap(ns, n)) return alreadyExists(kindOf('configmaps')!, n);
      c.createConfigMap(ns, n, data);
      return ok(`configmap/${n} created`);
    }
    case 'service': case 'svc': return fail(['error: el simulador no implementa "kubectl create service"; usa kubectl expose deployment <nombre> --port=80 [--type=NodePort]']);
    default: return fail([`error: unknown command "${sub}" for "kubectl create"`, '', "Run 'kubectl create --help' for usage."]);
  }
}

// ---------- expose ----------
export function expose(c: Cluster, p: Parsed): Result {
  const { kind, name, typeText } = typeAndName(p.args);
  if (!typeText) return fail(['error: You must provide one or more resources by argument or filename.', 'Example resource specifications include:', "   '-f rsrc.yaml'", "   '--filename=rsrc.json'", "   '<resource> <name>'", "   '<resource>'"]);
  if (!kind) return noType(typeText);
  if (!name) return fail('error: You must provide one or more resources by argument or filename.');
  const ns = nsOf(c, p);
  let selector: Labels; let targetPorts: number[] = []; let labels: Labels = {};
  if (kind.kind === 'Deployment') {
    const d = c.deployment(ns, name); if (!d) return notFound(kind, name);
    selector = { ...d.spec.selector }; targetPorts = d.spec.template.containers[0].ports; labels = { ...d.meta.labels };
  } else if (kind.kind === 'Pod') {
    const pod = c.pod(ns, name); if (!pod) return notFound(kind, name);
    selector = { ...pod.meta.labels }; targetPorts = pod.spec.containers[0].ports; labels = { ...pod.meta.labels };
  } else if (kind.kind === 'ReplicaSet') {
    const rs = c.replicaset(ns, name); if (!rs) return notFound(kind, name);
    selector = { ...rs.spec.selector }; targetPorts = rs.spec.template.containers[0].ports; labels = { ...rs.meta.labels };
  } else if (kind.kind === 'Service') {
    const s = c.service(ns, name); if (!s) return notFound(kind, name);
    selector = { ...s.spec.selector }; targetPorts = s.spec.ports.map((x) => x.targetPort); labels = { ...s.meta.labels };
  } else return fail(`error: cannot expose a ${kind.kind}`);
  const port = flag(p, 'port') ? Number(flag(p, 'port')) : targetPorts[0];
  if (!port) return fail('error: couldn\'t find port via --port flag or introspection');
  const targetPort = flag(p, 'target-port') ? Number(flag(p, 'target-port')) : port;
  const type = (flag(p, 'type') ?? 'ClusterIP') as 'ClusterIP' | 'NodePort';
  if (!['ClusterIP', 'NodePort', 'LoadBalancer'].includes(type)) return fail(`error: invalid service type: ${type}`);
  const svcName = flag(p, 'name') ?? name;
  const svcType = type === ('LoadBalancer' as string) ? 'NodePort' : type;
  if (dryRun(p) && !yamlOut(p)) return ok(`service/${svcName} exposed (dry run)`);
  if (dryRun(p)) return emit(p, { apiVersion: 'v1', kind: 'Service', metadata: { creationTimestamp: null, labels, name: svcName, ...(flag(p, 'namespace') ? { namespace: ns } : {}) }, spec: { ports: [{ port, protocol: 'TCP', targetPort }], selector, ...(type !== 'ClusterIP' ? { type } : {}) }, status: { loadBalancer: {} } });
  if (c.service(ns, svcName)) return alreadyExists(kindOf('services')!, svcName);
  const s = c.createService(ns, svcName, selector, [{ port, targetPort, protocol: 'TCP' }], svcType);
  s.meta.labels = labels;
  return ok(`service/${svcName} exposed`);
}

// ---------- scale ----------
export function scale(c: Cluster, p: Parsed): Result {
  const { kind, name, typeText } = typeAndName(p.args);
  if (!typeText) return fail('error: You must provide one or more resources by argument or filename.');
  if (!kind) return noType(typeText);
  if (!name) return fail('error: You must provide one or more resources by argument or filename.');
  const r = flag(p, 'replicas');
  if (r === undefined) return fail('error: required flag(s) "replicas" not set');
  const n = Number(r);
  if (!Number.isInteger(n) || n < 0) return fail(`error: invalid argument "${r}" for "--replicas" flag: strconv.ParseInt: parsing "${r}": invalid syntax`);
  const ns = nsOf(c, p);
  if (kind.kind === 'Deployment') { const d = c.deployment(ns, name); if (!d) return notFound(kind, name); if (dryRun(p)) return ok(`deployment.apps/${name} scaled (dry run)`); d.spec.replicas = n; c.reconcile(); return ok(`deployment.apps/${name} scaled`); }
  if (kind.kind === 'ReplicaSet') { const rs = c.replicaset(ns, name); if (!rs) return notFound(kind, name); rs.spec.replicas = n; c.reconcile(); return ok(`replicaset.apps/${name} scaled`); }
  return fail(`error: the server doesn't have a resource type "${typeText}"`.replace("doesn't have a resource type", 'could not find the requested resource (scale)'));
}

// ---------- set image ----------
export function setImage(c: Cluster, p: Parsed): Result {
  if (p.args[0] !== 'image') return fail([`error: unknown command "${p.args[0] ?? ''}" for "kubectl set"`, 'El simulador solo admite: kubectl set image deployment/<nombre> <contenedor>=<imagen>']);
  const { kind, name, typeText, rest } = typeAndName(p.args.slice(1));
  if (!typeText) return fail('error: You must provide one or more resources by argument or filename.');
  if (!kind) return noType(typeText);
  if (!name) return fail('error: You must provide one or more resources by argument or filename.');
  const pairs = rest.map(parseKV);
  if (!pairs.length || pairs.some((x) => !x)) return fail('error: all resources must be specified before image changes: <container>=<image>');
  const ns = nsOf(c, p);
  const apply = (containers: { name: string; image: string }[]): Result | null => {
    for (const [cn, img] of pairs as [string, string][]) {
      const targets = cn === '*' ? containers : containers.filter((x) => x.name === cn);
      if (!targets.length) return fail(`error: unable to find container named "${cn}"`);
      for (const t of targets) t.image = img;
    }
    return null;
  };
  if (kind.kind === 'Deployment') {
    const d = c.deployment(ns, name); if (!d) return notFound(kind, name);
    if (dryRun(p)) return ok(`deployment.apps/${name} image updated (dry run)`);
    const err = apply(d.spec.template.containers); if (err) return err;
    c.reconcile();
    return ok(`deployment.apps/${name} image updated`);
  }
  if (kind.kind === 'Pod') {
    const pod = c.pod(ns, name); if (!pod) return notFound(kind, name);
    const err = apply(pod.spec.containers); if (err) return err;
    // cambiar la imagen de un pod en vivo: el kubelet reinicia el contenedor
    pod.status.reason = 'ContainerCreating'; pod.status.ready = false; pod.status.phase = 'Pending'; pod.status.nextTransition = c.now + 2 * S; pod.status.restarts++; pod.status.lastRestart = c.now;
    return ok(`pod/${name} image updated`);
  }
  return fail(`error: ${kind.plural} no admiten "set image" en el simulador`);
}

// ---------- rollout ----------
function rolloutStatusLine(c: Cluster, d: Deployment): string | null {
  const st = c.deploymentStatus(d);
  const old = st.replicas - st.updated;
  if (st.updated < d.spec.replicas) return `Waiting for deployment "${d.meta.name}" rollout to finish: ${st.updated} out of ${d.spec.replicas} new replicas have been updated...`;
  if (old > 0) return `Waiting for deployment "${d.meta.name}" rollout to finish: ${old} old replicas are pending termination...`;
  if (st.available < d.spec.replicas) return `Waiting for deployment "${d.meta.name}" rollout to finish: ${st.available} of ${d.spec.replicas} updated replicas are available...`;
  return null;
}

export function rollout(c: Cluster, p: Parsed): Result {
  const sub = p.args[0];
  const subs = ['status', 'history', 'undo', 'restart', 'pause', 'resume'];
  if (!sub) return fail(['Manage the rollout of one or many resources.', '', 'Available Commands:', '  history     View rollout history', '  pause       Mark the provided resource as paused', '  restart     Restart a resource', '  resume      Resume a paused resource', '  status      Show the status of the rollout', '  undo        Undo a previous rollout']);
  if (!subs.includes(sub)) return fail([`error: unknown command "${sub}" for "kubectl rollout"`, '', "Run 'kubectl rollout --help' for usage."]);
  const { kind, name, typeText } = typeAndName(p.args.slice(1));
  if (!typeText) return fail(['error: required resource not specified.', `Ejemplo: kubectl rollout ${sub} deployment/web`]);
  if (!kind) return noType(typeText);
  if (!name) return fail('error: required resource not specified.');
  if (kind.kind !== 'Deployment') return fail(`error: ${fullName(kind)} "${name}" no admite rollout en el simulador (solo deployments)`);
  const ns = nsOf(c, p);
  const d = c.deployment(ns, name); if (!d) return notFound(kind, name);
  switch (sub) {
    case 'status': {
      const lines: string[] = [];
      const timeout = flag(p, 'timeout') ? parseInt(flag(p, 'timeout')!) : 60;
      let last = '';
      for (let i = 0; i <= timeout; i++) {
        const l = rolloutStatusLine(c, d);
        if (!l) { lines.push(`deployment "${name}" successfully rolled out`); return ok(lines); }
        if (l !== last) { lines.push(l); last = l; }
        if (i < timeout) c.tick(S);
      }
      lines.push('error: timed out waiting for the condition');
      return fail(lines);
    }
    case 'history': {
      const rss = c.rsOf(d);
      const rev = flag(p, 'revision');
      if (rev) {
        const rs = rss.find((r) => String(r.revision) === rev);
        if (!rs) return fail(`error: unable to find the specified revision`);
        const t = rs.spec.template;
        const lines = [`deployment.apps/${name} with revision #${rev}`, 'Pod Template:', `  Labels:\t${Object.entries(t.labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n\t')}`];
        if (rs.meta.annotations['kubernetes.io/change-cause']) lines.push(`  Annotations:\tkubernetes.io/change-cause: ${rs.meta.annotations['kubernetes.io/change-cause']}`);
        lines.push('  Containers:');
        for (const ct of t.containers) lines.push(`   ${ct.name}:`, `    Image:\t${ct.image}`, `    Port:\t${ct.ports.length ? ct.ports.map((x) => x + '/TCP').join(', ') : '<none>'}`, `    Host Port:\t${ct.ports.length ? ct.ports.map(() => '0/TCP').join(', ') : '<none>'}`, '    Environment:\t<none>', '    Mounts:\t<none>');
        lines.push('  Volumes:\t<none>', '  Node-Selectors:\t<none>', '  Tolerations:\t<none>');
        return ok(lines.map((l) => l.replace(/\t/g, '  ')));
      }
      const rows = [['REVISION', 'CHANGE-CAUSE'], ...rss.map((r) => [String(r.revision), r.meta.annotations['kubernetes.io/change-cause'] ?? '<none>'])];
      const w = Math.max(...rows.map((r) => r[0].length)) + 2;
      return ok([`deployment.apps/${name} `, ...rows.map((r) => r[0].padEnd(w) + r[1])]);
    }
    case 'undo': {
      const rss = c.rsOf(d);
      const cur = c.newRs(d);
      const to = flag(p, 'to-revision');
      let target;
      if (to !== undefined && to !== '0') { target = rss.find((r) => String(r.revision) === to); if (!target) return fail(`error: unable to find specified revision ${to} in history`); }
      else { const prev = rss.filter((r) => r !== cur).sort((a, b) => b.revision - a.revision); target = prev[0]; if (!target) return fail(`error: no rollout history found for deployment "${name}"`); }
      if (target === cur) return ok([`deployment.apps/${name} skipped rollback (current template already matches revision ${target.revision})`]);
      if (dryRun(p)) return ok(`deployment.apps/${name} rolled back (dry run)`);
      const t = target.spec.template;
      d.spec.template = { ...t, labels: Object.fromEntries(Object.entries(t.labels).filter(([k]) => k !== 'pod-template-hash')), containers: t.containers.map((x) => ({ ...x, ports: [...x.ports], env: { ...x.env } })) };
      const nextRev = Math.max(...rss.map((r) => r.revision)) + 1;
      target.revision = nextRev; target.meta.annotations['deployment.kubernetes.io/revision'] = String(nextRev);
      c.reconcile();
      return ok(`deployment.apps/${name} rolled back`);
    }
    case 'restart': { d.spec.template.annotations['kubectl.kubernetes.io/restartedAt'] = iso(c.now); c.reconcile(); return ok(`deployment.apps/${name} restarted`); }
    case 'pause': { if (d.paused) return fail(`error: deployments.apps "${name}" is already paused`); d.paused = true; return ok(`deployment.apps/${name} paused`); }
    case 'resume': { if (!d.paused) return fail(`error: deployments.apps "${name}" is not paused`); d.paused = false; c.reconcile(); return ok(`deployment.apps/${name} resumed`); }
  }
  return fail('error: unreachable');
}

// ---------- delete ----------
export function del(c: Cluster, p: Parsed): Result {
  if (flag(p, 'filename')) return applyFiles(c, p, 'delete');
  if (!p.args.length) return fail(['error: resource(s) were provided, but no name was specified'.replace('resource(s) were provided, but no name was specified', 'You must provide one or more resources by argument or filename.'), 'Example resource specifications include:', "   '-f rsrc.yaml'", "   '--filename=rsrc.json'", "   '<resource> <name>'", "   '<resource>'"]);
  const ns = nsOf(c, p);
  const all = has(p, 'all');
  const sel = flag(p, 'selector');
  const match = sel ? parseSelector(sel) : null;
  if (sel && !match) return fail(`error: unable to parse requirement: ${sel}`);
  const lines: string[] = []; let failed = false;
  // tipos y nombres: "pod a b", "pod/a svc/b", "pod,svc -l app=x"
  const targets: { kind: Kind; names: string[] }[] = [];
  if (p.args[0].includes('/')) for (const a of p.args) { const [t, n] = a.split('/'); const k = kindOf(t); if (!k) return noType(t); targets.push({ kind: k, names: [n] }); }
  else { const kinds = p.args[0].split(','); for (const t of kinds) { const k = kindOf(t); if (!k) return noType(t); targets.push({ kind: k, names: p.args.slice(1) }); } }
  if (targets.every((t) => !t.names.length) && !all && !match) return fail('error: resource(s) were provided, but no name was specified');
  for (const { kind, names } of targets) {
    let items = listOf(c, kind).filter((it) => !kind.namespaced || has(p, 'all-namespaces') || it.meta.namespace === ns);
    if (names.length) {
      for (const n of names) {
        const it = items.find((x) => x.meta.name === n);
        if (!it) { lines.push(`Error from server (NotFound): ${fullName(kind)} "${n}" not found`); failed = true; continue; }
        lines.push(deleteItem(c, kind, it as Parameters<typeof deleteItem>[2], p));
      }
      continue;
    }
    if (match) items = items.filter((it) => match(it.meta.labels));
    if (kind.kind === 'Namespace' || kind.kind === 'Node') items = items.filter((it) => !['default', 'kube-system', 'kube-public', 'kube-node-lease', 'local-path-storage'].includes(it.meta.name));
    if (!items.length) { lines.push(kind.namespaced && !has(p, 'all-namespaces') ? `No resources found in ${ns} namespace.` : 'No resources found'); continue; }
    for (const it of items) lines.push(deleteItem(c, kind, it as Parameters<typeof deleteItem>[2], p));
  }
  c.reconcile();
  return failed ? fail(lines) : ok(lines);
}

function deleteItem(c: Cluster, kind: Kind, it: ReturnType<typeof listOf>[number], p: Parsed): string {
  const suffix = kind.namespaced ? ` from ${it.meta.namespace} namespace` : '';
  if (dryRun(p)) return `${prefix(kind)} "${it.meta.name}" deleted${suffix} (dry run)`;
  switch (it.kind) {
    case 'Pod': c.deletePod(it, has(p, 'force') || flag(p, 'grace-period') === '0' ? 0 : 1); break;
    case 'Deployment': c.deleteDeployment(it); break;
    case 'ReplicaSet': c.deleteReplicaSet(it); break;
    case 'Service': c.deleteService(it); break;
    case 'ConfigMap': c.deleteConfigMap(it); break;
    case 'Secret': c.deleteSecret(it); break;
    case 'Namespace': if (['default', 'kube-system', 'kube-public', 'kube-node-lease'].includes(it.meta.name)) return `Error from server (Forbidden): namespaces "${it.meta.name}" is forbidden: this namespace may not be deleted`; c.deleteNamespace(it); if (c.currentNamespace === it.meta.name) { /* el contexto sigue apuntando al namespace borrado, como en la realidad */ } break;
    case 'Node': return `error: el simulador no permite borrar nodos (node "${it.meta.name}")`;
  }
  return `${prefix(kind)} "${it.meta.name}" deleted${suffix}`;
}

// ---------- label / annotate / taint ----------
function editMeta(c: Cluster, p: Parsed, what: 'labels' | 'annotations'): Result {
  const { kind, name, typeText, rest } = typeAndName(p.args);
  if (!typeText) return fail(['error: You must provide one or more resources by argument or filename.', `Ejemplo: kubectl ${what === 'labels' ? 'label pod web env=dev' : 'annotate deployment web kubernetes.io/change-cause=\'version 1\''}`]);
  if (!kind) return noType(typeText);
  const sel = flag(p, 'selector');
  const pairs = (name && !name.includes('=') && !name.endsWith('-') ? rest : name ? [name, ...rest] : rest);
  const nameArg = name && !name.includes('=') && !name.endsWith('-') ? name : undefined;
  if (!pairs.length) return fail(`error: at least one ${what === 'labels' ? 'label' : 'annotation'} update is required`);
  const ns = nsOf(c, p);
  let items = listOf(c, kind).filter((it) => !kind.namespaced || has(p, 'all-namespaces') || it.meta.namespace === ns);
  if (nameArg) { const it = items.find((x) => x.meta.name === nameArg); if (!it) return notFound(kind, nameArg); items = [it]; }
  else if (sel) { const m = parseSelector(sel); if (!m) return fail(`error: unable to parse requirement: ${sel}`); items = items.filter((it) => m(it.meta.labels)); if (!items.length) return fail(`No resources found in ${ns} namespace.`); }
  else if (!has(p, 'all')) return fail('error: resource(s) were provided, but no name was specified');
  const lines: string[] = [];
  for (const it of items) {
    const map = it.meta[what];
    let removedOnly = true;
    for (const pr of pairs) {
      if (pr.endsWith('-') && !pr.includes('=')) { delete map[pr.slice(0, -1)]; continue; }
      const kv = parseKV(pr); if (!kv) return fail(`error: invalid ${what === 'labels' ? 'label' : 'annotation'} spec: ${pr}`);
      if (what === 'labels' && !/^[a-z0-9A-Z]([-a-z0-9A-Z_.]*[a-z0-9A-Z])?$/.test(kv[1]) && kv[1] !== '') return fail(`The ${kind.kind} "${it.meta.name}" is invalid: metadata.labels: Invalid value: "${kv[1]}": a valid label must be an empty string or consist of alphanumeric characters, '-', '_' or '.', and must start and end with an alphanumeric character (e.g. 'MyValue',  or 'my_value',  or '12345', regex used for validation is '(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?')`);
      if (kv[0] in map && map[kv[0]] !== kv[1] && !has(p, 'overwrite')) return fail(`error: '${kv[0]}' already has a value (${map[kv[0]]}), and --overwrite is false`);
      map[kv[0]] = kv[1]; removedOnly = false;
    }
    if (what === 'labels' && it.kind === 'Pod' && it.meta.owner) {
      const rs = c.replicaset(it.meta.namespace!, it.meta.owner.name);
      if (rs && !Object.entries(rs.spec.selector).every(([k, v]) => it.meta.labels[k] === v)) it.meta.owner = undefined; // el RS deja de "verlo": creará otro
    }
    lines.push(`${prefix(kind)}/${it.meta.name} ${what === 'labels' ? (removedOnly ? 'unlabeled' : 'labeled') : (removedOnly ? 'annotated' : 'annotated')}`);
  }
  c.reconcile();
  return ok(lines);
}
export const label = (c: Cluster, p: Parsed) => editMeta(c, p, 'labels');
export const annotate = (c: Cluster, p: Parsed) => editMeta(c, p, 'annotations');

export function taint(c: Cluster, p: Parsed): Result {
  const { kind, name, typeText, rest } = typeAndName(p.args);
  if (!typeText) return fail(['error: at least one taint update is required', 'Ejemplo: kubectl taint node kcna-worker2 dedicated=db:NoSchedule  (y "dedicated:NoSchedule-" para quitarlo)']);
  if (!kind || kind.kind !== 'Node') return fail(`error: invalid resource type ${typeText}, only "node"/"nodes" can be tainted`);
  if (!name) return fail('error: at least one taint update is required');
  const n = c.node(name); if (!n) return notFound(kind, name);
  if (!rest.length) return fail('error: at least one taint update is required');
  const lines: string[] = [];
  for (const t of rest) {
    if (t.endsWith('-')) {
      const key = t.slice(0, -1).split(':')[0].split('=')[0];
      const before = n.taints.length;
      n.taints = n.taints.filter((x) => x.split(':')[0].split('=')[0] !== key);
      if (before === n.taints.length) return fail(`error: taint "${key}" not found`);
      lines.push(`node/${name} untainted`);
    } else {
      const m = t.match(/^([\w./-]+)(?:=([\w.-]*))?:(NoSchedule|PreferNoSchedule|NoExecute)$/);
      if (!m) return fail(`error: invalid taint effect: ${t.split(':')[1] ?? ''}, unsupported taint effect`);
      const key = m[1];
      if (n.taints.some((x) => x.split(':')[0].split('=')[0] === key && x.endsWith(':' + m[3])) && !has(p, 'overwrite')) return fail(`error: node ${name} already has ${key} taint(s) with same effect(s) and --overwrite is false`);
      n.taints = n.taints.filter((x) => !(x.split(':')[0].split('=')[0] === key && x.endsWith(':' + m[3])));
      n.taints.push(t);
      lines.push(`node/${name} tainted`);
    }
  }
  if (n.taints.some((t) => t.endsWith(':NoExecute'))) for (const pod of c.pods) if (pod.spec.nodeName === name && !pod.spec.tolerations.some((tl) => n.taints.some((t) => t.split(':')[0].split('=')[0] === tl.split(':')[0].split('=')[0]))) c.deletePod(pod);
  c.reconcile();
  return ok(lines);
}

// ---------- apply / create -f / delete -f ----------
function manifestTemplate(m: Manifest): PodTemplate {
  return { labels: { ...m.labels }, annotations: {}, containers: [{ name: m.kind === 'Deployment' ? containerNameFrom(m.image!) : (m.name === 'nginx' || m.name === 'roto' ? 'nginx' : containerNameFrom(m.image!)), image: m.image!, ports: m.ports ?? [], env: {}, command: m.command }], nodeSelector: m.nodeSelector, restartPolicy: 'Always', tolerations: [] };
}

export function applyFiles(c: Cluster, p: Parsed, mode: 'apply' | 'create' | 'delete'): Result {
  const files = p.flags['filename'] ?? [];
  if (!files.length) return fail(`error: must specify one of -f and -k`);
  const lines: string[] = []; let failed = false;
  for (const f of files) {
    const F = FILES[f.replace(/^\.[\\/]/, '')];
    if (!F) { lines.push(`error: the path "${f}" does not exist`); failed = true; continue; }
    for (const m of F.objects) {
      const ns = m.namespace ?? nsOf(c, p);
      const kind = kindOf(m.kind)!;
      const pre = prefix(kind);
      if (mode === 'delete') {
        const it = listOf(c, kind).find((x) => x.meta.name === m.name && (!kind.namespaced || x.meta.namespace === ns));
        if (!it) { lines.push(`Error from server (NotFound): ${fullName(kind)} "${m.name}" not found`); failed = true; continue; }
        lines.push(deleteItem(c, kind, it, p)); continue;
      }
      if (dryRun(p) && !yamlOut(p)) { lines.push(`${pre}/${m.name} ${mode === 'create' ? 'created' : 'configured'} (dry run)`); continue; }
      if (kind.namespaced && (!c.ns(ns) || c.ns(ns)!.status !== 'Active')) { lines.push(`Error from server (NotFound): error when creating "${f}": namespaces "${ns}" not found`); failed = true; continue; }
      const existing = listOf(c, kind).find((x) => x.meta.name === m.name && (!kind.namespaced || x.meta.namespace === ns));
      if (existing && mode === 'create') { lines.push(`Error from server (AlreadyExists): error when creating "${f}": ${fullName(kind)} "${m.name}" already exists`); failed = true; continue; }
      const applied = `kubectl.kubernetes.io/last-applied-configuration`;
      if (m.kind === 'Pod') {
        if (existing && existing.kind === 'Pod') { const ct = existing.spec.containers[0]; let changed = false; if (ct.image !== m.image) { ct.image = m.image!; existing.status.reason = 'ContainerCreating'; existing.status.ready = false; existing.status.phase = 'Pending'; existing.status.nextTransition = c.now + 2 * S; changed = true; } if (JSON.stringify(existing.meta.labels) !== JSON.stringify(m.labels)) { existing.meta.labels = { ...m.labels }; changed = true; } lines.push(`pod/${m.name} ${changed ? 'configured' : 'unchanged'}`); continue; }
        const pod = c.createPod(ns, m.name, manifestTemplate(m)); pod.meta.annotations[applied] = JSON.stringify({ apiVersion: 'v1', kind: 'Pod', metadata: { annotations: {}, labels: m.labels, name: m.name, namespace: ns }, spec: { containers: [{ image: m.image, name: pod.spec.containers[0].name, ...(m.ports ? { ports: m.ports.map((x) => ({ containerPort: x })) } : {}) }], ...(m.nodeSelector ? { nodeSelector: m.nodeSelector } : {}) } });
        lines.push(`pod/${m.name} created`);
      } else if (m.kind === 'Deployment') {
        if (existing && existing.kind === 'Deployment') { let changed = false; if (existing.spec.replicas !== m.replicas) { existing.spec.replicas = m.replicas!; changed = true; } const ct = existing.spec.template.containers[0]; if (ct.image !== m.image) { ct.image = m.image!; changed = true; } if (JSON.stringify(ct.ports) !== JSON.stringify(m.ports ?? [])) { ct.ports = m.ports ?? []; changed = true; } lines.push(`deployment.apps/${m.name} ${changed ? 'configured' : 'unchanged'}`); continue; }
        const d = c.createDeployment(ns, m.name, m.image!, m.replicas ?? 1, m.labels); d.spec.template.containers[0].ports = m.ports ?? []; d.meta.annotations[applied] = JSON.stringify({ apiVersion: 'apps/v1', kind: 'Deployment', metadata: { annotations: {}, labels: m.labels, name: m.name, namespace: ns }, spec: { replicas: m.replicas, selector: { matchLabels: m.labels }, template: { metadata: { labels: m.labels }, spec: { containers: [{ image: m.image, name: d.spec.template.containers[0].name, ports: (m.ports ?? []).map((x) => ({ containerPort: x })) }] } } } });
        lines.push(`deployment.apps/${m.name} created`);
      } else if (m.kind === 'Service') {
        if (existing && existing.kind === 'Service') { let changed = false; if (JSON.stringify(existing.spec.selector) !== JSON.stringify(m.selector)) { existing.spec.selector = { ...m.selector }; changed = true; } if (existing.spec.type !== m.type) { existing.spec.type = m.type!; changed = true; } lines.push(`service/${m.name} ${changed ? 'configured' : 'unchanged'}`); continue; }
        c.createService(ns, m.name, m.selector ?? {}, (m.svcPorts ?? []).map((x) => ({ ...x, protocol: 'TCP' as const })), m.type ?? 'ClusterIP');
        lines.push(`service/${m.name} created`);
      } else if (m.kind === 'ConfigMap') {
        if (existing && existing.kind === 'ConfigMap') { const changed = JSON.stringify(existing.data) !== JSON.stringify(m.data); existing.data = { ...m.data }; lines.push(`configmap/${m.name} ${changed ? 'configured' : 'unchanged'}`); continue; }
        c.createConfigMap(ns, m.name, m.data ?? {});
        lines.push(`configmap/${m.name} created`);
      } else if (m.kind === 'Namespace') {
        if (existing) { lines.push(`namespace/${m.name} unchanged`); continue; }
        c.createNamespace(m.name); lines.push(`namespace/${m.name} created`);
      }
    }
  }
  c.reconcile();
  return failed ? fail(lines) : ok(lines);
}

// ---------- logs ----------
export function logs(c: Cluster, p: Parsed): Result {
  const ns = nsOf(c, p);
  const sel = flag(p, 'selector');
  let pods: Pod[] = [];
  const lines: string[] = [];
  if (sel) { const m = parseSelector(sel); if (!m) return fail(`error: unable to parse requirement: ${sel}`); pods = c.pods.filter((x) => x.meta.namespace === ns && m(x.meta.labels) && !x.status.deleting); if (!pods.length) return fail(`No resources found in ${ns} namespace.`); }
  else {
    const target = p.args[0];
    if (!target) return fail(['error: expected \'logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER]\'.', 'POD or TYPE/NAME is a required argument for the logs command', "See 'kubectl logs -h' for help and examples"]);
    if (target.includes('/')) {
      const [t, n] = target.split('/'); const k = kindOf(t); if (!k) return noType(t);
      let sel2: Labels | undefined;
      if (k.kind === 'Deployment') { const d = c.deployment(ns, n); if (!d) return notFound(k, n); sel2 = d.spec.selector; }
      else if (k.kind === 'ReplicaSet') { const rs = c.replicaset(ns, n); if (!rs) return notFound(k, n); sel2 = rs.spec.selector; }
      else if (k.kind === 'Service') { const s = c.service(ns, n); if (!s) return notFound(k, n); sel2 = s.spec.selector; }
      else if (k.kind === 'Pod') { const pod = c.pod(ns, n); if (!pod) return notFound(k, n); pods = [pod]; }
      else return fail(`error: cannot get the logs from ${k.kind}: no pods`);
      if (sel2) { const all = c.pods.filter((x) => x.meta.namespace === ns && Object.entries(sel2!).every(([a, b]) => x.meta.labels[a] === b) && !x.status.deleting).sort((a, b) => a.meta.name.localeCompare(b.meta.name)); if (!all.length) return fail(`error: no pods found for ${t}/${n}`); pods = [all[0]]; if (all.length > 1) lines.push(`Found ${all.length} pods, using pod/${all[0].meta.name}`); }
    } else { const pod = c.pod(ns, target); if (!pod) return notFound(kindOf('pods')!, target); pods = [pod]; }
  }
  const cname = flag(p, 'container');
  const tail = flag(p, 'tail') ? Number(flag(p, 'tail')) : -1;
  let failed = false;
  for (const pod of pods) {
    const ct = cname ? pod.spec.containers.find((x) => x.name === cname) : pod.spec.containers[0];
    if (!ct) { lines.push(`error: container ${cname} is not valid for pod ${pod.meta.name}`); failed = true; continue; }
    const st = c.podStatus(pod);
    if (has(p, 'previous')) {
      if (!pod.status.restarts) { lines.push(`Error from server (BadRequest): previous terminated container "${ct.name}" in pod "${pod.meta.name}" not found`); failed = true; continue; }
      lines.push(...logsOf(c, pod, ct).slice(0, 12));
      continue;
    }
    if (!pod.spec.nodeName) { lines.push(`Error from server (BadRequest): container "${ct.name}" in pod "${pod.meta.name}" is waiting to start: ContainerCreating`); failed = true; continue; }
    if (['ContainerCreating', 'ErrImagePull', 'ImagePullBackOff'].includes(st)) { lines.push(`Error from server (BadRequest): container "${ct.name}" in pod "${pod.meta.name}" is waiting to start: ${st === 'ContainerCreating' ? 'ContainerCreating' : 'trying and failing to pull image'}`); failed = true; continue; }
    if (st === 'CrashLoopBackOff' && !has(p, 'previous')) { lines.push(...logsOf(c, pod, ct)); continue; }
    let out = logsOf(c, pod, ct);
    if (tail >= 0) out = out.slice(-tail);
    if (has(p, 'prefix') || (sel && pods.length > 1 && has(p, 'prefix'))) out = out.map((l) => `[pod/${pod.meta.name}/${ct.name}] ${l}`);
    if (has(p, 'timestamps')) out = out.map((l) => `${iso(pod.status.startedAt ?? c.now).replace('Z', '.000000000Z')} ${l}`);
    lines.push(...out);
  }
  if (has(p, 'follow')) lines.push('(el simulador no admite -f/--follow: la salida termina aquí)');
  return failed ? fail(lines) : ok(lines);
}

// ---------- exec ----------
export function exec(c: Cluster, p: Parsed): Result {
  const ns = nsOf(c, p);
  const target = p.args[0];
  if (!target) return fail(['error: expected \'exec (POD | TYPE/NAME) [-c CONTAINER] [flags] -- COMMAND [args...]\'.', 'POD or TYPE/NAME is a required argument for the exec command', "See 'kubectl exec -h' for help and examples"]);
  if (p.args.length > 1 && !p.rest.length) return fail(`error: exec [POD] [COMMAND] is not supported anymore. Use exec [POD] -- [COMMAND] instead.`);
  let pod: Pod | undefined;
  if (target.includes('/')) {
    const [t, n] = target.split('/'); const k = kindOf(t); if (!k) return noType(t);
    if (k.kind === 'Pod') pod = c.pod(ns, n);
    else if (k.kind === 'Deployment') { const d = c.deployment(ns, n); if (!d) return notFound(k, n); pod = c.pods.filter((x) => x.meta.namespace === ns && Object.entries(d.spec.selector).every(([a, b]) => x.meta.labels[a] === b) && x.status.ready).sort((a, b) => a.meta.name.localeCompare(b.meta.name))[0]; if (!pod) return fail(`error: no pods found for ${t}/${n}`); }
    else if (k.kind === 'Service') { const s = c.service(ns, n); if (!s) return notFound(k, n); pod = c.endpoints(s)[0]; if (!pod) return fail(`error: no pods found for ${t}/${n}`); }
    else return fail(`error: cannot exec into a ${k.kind}`);
    if (!pod) return notFound(k, n);
  } else { pod = c.pod(ns, target); if (!pod) return notFound(kindOf('pods')!, target); }
  const cname = flag(p, 'container');
  const ct = cname ? pod.spec.containers.find((x) => x.name === cname) : pod.spec.containers[0];
  if (!ct) return fail(`error: container ${cname} is not valid for pod ${pod.meta.name}`);
  if (!p.rest.length) return fail(['error: you must specify at least one command for the container', `Ejemplo: kubectl exec ${pod.meta.name} -- env`]);
  const st = c.podStatus(pod);
  if (st !== 'Running' && !(st === 'Completed' && false)) {
    if (!pod.spec.nodeName || st === 'ContainerCreating') return fail(`error: unable to upgrade connection: container not found ("${ct.name}")`);
    if (['ErrImagePull', 'ImagePullBackOff'].includes(st)) return fail(`error: unable to upgrade connection: container not found ("${ct.name}")`);
    if (st === 'CrashLoopBackOff' || st === 'Completed' || st === 'Error') return fail(`error: unable to upgrade connection: container not found ("${ct.name}")`);
    if (st === 'Terminating') return fail(`error: unable to upgrade connection: container not found ("${ct.name}")`);
  }
  if ((has(p, 'tty') || has(p, 'stdin')) && ['sh', 'ash', 'bash', '/bin/sh', '/bin/bash'].includes(p.rest[0]) && p.rest.length === 1) {
    return fail(['Unable to use a TTY - la terminal simulada no admite sesiones interactivas.', `Ejecuta comandos sueltos: kubectl exec ${pod.meta.name} -- <comando>   (env, ls, cat /etc/hostname, nslookup web, wget -qO- http://web)`]);
  }
  const r = runInContainer(c, pod, ct, p.rest.map((x) => x.replace(/^\/bin\//, '')));
  return r.code ? fail(r.lines) : ok(r.lines);
}
