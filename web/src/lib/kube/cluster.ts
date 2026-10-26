// Clúster de Kubernetes en memoria para el simulador de kubectl.
// TypeScript puro (sin Svelte): se puede probar con node. Un reloj simulado (tick) hace avanzar
// a los "controladores": Deployment -> ReplicaSet -> Pods, scheduler y kubelet.

export type Labels = Record<string, string>;

export interface Meta {
  uid: string;
  name: string;
  namespace?: string;
  labels: Labels;
  annotations: Labels;
  created: number; // ms del reloj simulado
  owner?: { kind: 'ReplicaSet' | 'Deployment'; name: string };
}

export interface Container {
  name: string;
  image: string;
  ports: number[];
  env: Labels;
  command?: string[];
}

export interface PodTemplate {
  labels: Labels;
  annotations: Labels;
  containers: Container[];
  nodeSelector?: Labels;
  restartPolicy: 'Always' | 'Never' | 'OnFailure';
  tolerations: string[]; // "key:Effect" o "key=value:Effect"
}

export type PodReason = 'ContainerCreating' | 'ErrImagePull' | 'ImagePullBackOff' | 'CrashLoopBackOff' | 'Completed' | 'Error';

export interface Pod {
  kind: 'Pod';
  meta: Meta;
  spec: PodTemplate & { nodeName?: string };
  status: {
    phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed';
    reason?: PodReason;
    ip?: string;
    ready: boolean;
    restarts: number;
    scheduledAt?: number;
    startedAt?: number;
    lastRestart?: number;
    deleting?: boolean;
    deletedAt?: number;
    nextTransition?: number;
    pulls: number;
    /** líneas extra de log generadas por la actividad del alumno (peticiones HTTP, etc.) */
    logs: string[];
  };
}

export interface ReplicaSet {
  kind: 'ReplicaSet';
  meta: Meta;
  spec: { replicas: number; selector: Labels; template: PodTemplate };
  revision: number;
}

export interface Deployment {
  kind: 'Deployment';
  meta: Meta;
  spec: { replicas: number; selector: Labels; template: PodTemplate; maxSurge: string; maxUnavailable: string; strategy: 'RollingUpdate' | 'Recreate' };
  paused: boolean;
}

export interface Service {
  kind: 'Service';
  meta: Meta;
  spec: { type: 'ClusterIP' | 'NodePort'; selector: Labels; ports: { port: number; targetPort: number; nodePort?: number; protocol: 'TCP' }[]; clusterIP: string };
}

export interface ConfigMap { kind: 'ConfigMap'; meta: Meta; data: Labels }
export interface Secret { kind: 'Secret'; meta: Meta; type: string; data: Labels }
export interface Namespace { kind: 'Namespace'; meta: Meta; status: 'Active' | 'Terminating' }
export interface Node {
  kind: 'Node';
  meta: Meta;
  role: 'control-plane' | 'worker';
  taints: string[];
  internalIP: string;
  ready: boolean;
  cpu: number; // milicores asignables
  mem: number; // MiB asignables
}

export interface Event {
  namespace: string;
  time: number;
  first: number;
  type: 'Normal' | 'Warning';
  reason: string;
  object: string; // "pod/web-xxx"
  from: string;
  message: string;
  count: number;
}

export type AnyObject = Pod | ReplicaSet | Deployment | Service | ConfigMap | Secret | Namespace | Node;

export const KUBE_VERSION = 'v1.37.0';
export const CONTEXT = 'kind-kcna';

/** Imágenes precargadas en los nodos (el clúster del curso no tiene salida a internet). */
export const PRELOADED_IMAGES = ['nginx:1.27-alpine', 'nginx:1.28-alpine', 'busybox:1.37', 'traefik/whoami:v1.11', 'redis:7.4-alpine',
  'registry.k8s.io/coredns/coredns:v1.12.0', 'registry.k8s.io/etcd:3.5.16-0', 'registry.k8s.io/kube-apiserver:v1.37.0',
  'registry.k8s.io/kube-controller-manager:v1.37.0', 'registry.k8s.io/kube-scheduler:v1.37.0', 'registry.k8s.io/kube-proxy:v1.37.0',
  'docker.io/kindest/kindnetd:v20250512-df8de77b', 'docker.io/kindest/local-path-provisioner:v20250214-acbabc1a'];

export const imageAvailable = (image: string) => PRELOADED_IMAGES.includes(image);

/** Referencia completa de una imagen, como la escribe containerd en los errores. */
export function imageRef(image: string): string {
  let [name, tag] = image.includes('@') ? [image, ''] : splitTag(image);
  if (!tag) tag = 'latest';
  const first = name.split('/')[0];
  if (!name.includes('/')) name = 'docker.io/library/' + name;
  else if (!first.includes('.') && !first.includes(':') && first !== 'localhost') name = 'docker.io/' + name;
  return `${name}:${tag}`;
}
function splitTag(image: string): [string, string] {
  const i = image.lastIndexOf(':');
  if (i < 0 || image.lastIndexOf('/') > i) return [image, ''];
  return [image.slice(0, i), image.slice(i + 1)];
}
/** Etiqueta (tag) de la imagen: "nginx:1.27-alpine" -> "1.27-alpine". */
export const imageTag = (image: string) => splitTag(image)[1] || 'latest';
/** Nombre de contenedor que kubectl deriva de la imagen: "traefik/whoami:v1.11" -> "whoami". */
export function containerNameFrom(image: string): string {
  const name = splitTag(image)[0].split('/').pop() || 'app';
  return name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

// kubectl usa este alfabeto para el hash de plantilla y los sufijos de los pods
const ALPHABET = 'bcdfghjklmnpqrstvwxz2456789';

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** Hash de plantilla al estilo de Kubernetes (SafeEncodeString del hash FNV en decimal). */
export function templateHash(t: PodTemplate): string {
  const key = JSON.stringify({ l: t.labels, c: t.containers, ns: t.nodeSelector ?? null, rp: t.restartPolicy, a: t.annotations });
  return String(fnv1a(key)).split('').map((ch) => ALPHABET[ch.charCodeAt(0) % ALPHABET.length]).join('');
}

/** Generador pseudoaleatorio con semilla (resultados reproducibles en las pruebas). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const matches = (selector: Labels, labels: Labels) => Object.entries(selector).every(([k, v]) => labels[k] === v);

const S = 1000;

export interface ClusterOptions { seed?: number; now?: number }

export class Cluster {
  now: number;
  private rnd: () => number;
  private uidN = 0;
  private ipN: Record<string, number> = {};
  private svcIpN = 10;
  private nodePortN = 30080;

  nodes: Node[] = [];
  namespaces: Namespace[] = [];
  pods: Pod[] = [];
  replicasets: ReplicaSet[] = [];
  deployments: Deployment[] = [];
  services: Service[] = [];
  configmaps: ConfigMap[] = [];
  secrets: Secret[] = [];
  events: Event[] = [];
  /** namespace actual del contexto (kubectl config set-context --current --namespace) */
  currentNamespace = 'default';

  constructor(opts: ClusterOptions = {}) {
    this.now = opts.now ?? Date.now();
    this.rnd = mulberry32(opts.seed ?? (Date.now() & 0xffffffff));
    this.seed();
  }

  // ---------- utilidades ----------
  private uid() { this.uidN++; const r = () => Math.floor(this.rnd() * 0xffff).toString(16).padStart(4, '0'); return `${r()}${r()}-${r()}-4${r().slice(1)}-${r()}-${r()}${r()}${r()}`; }
  private suffix(n = 5) { let s = ''; for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(this.rnd() * ALPHABET.length)]; return s; }
  private meta(name: string, namespace: string | undefined, labels: Labels = {}, created = this.now): Meta {
    return { uid: this.uid(), name, namespace, labels: { ...labels }, annotations: {}, created };
  }
  event(namespace: string, type: Event['type'], reason: string, object: string, from: string, message: string) {
    const last = this.events.find((e) => e.namespace === namespace && e.reason === reason && e.object === object && e.message === message);
    if (last) { last.count++; last.time = this.now; return; }
    this.events.push({ namespace, time: this.now, first: this.now, type, reason, object, from, message, count: 1 });
    if (this.events.length > 400) this.events.splice(0, this.events.length - 400);
  }
  private podIp(node: string) {
    const idx = Math.max(0, this.nodes.findIndex((n) => n.meta.name === node));
    this.ipN[node] = (this.ipN[node] ?? 1) + 1;
    return `10.244.${idx}.${this.ipN[node]}`;
  }
  private clusterIp() { this.svcIpN++; return `10.96.${Math.floor(this.svcIpN / 250)}.${this.svcIpN % 250 + 1}`; }

  // ---------- consultas ----------
  ns(name: string) { return this.namespaces.find((n) => n.meta.name === name); }
  node(name: string) { return this.nodes.find((n) => n.meta.name === name); }
  pod(ns: string, name: string) { return this.pods.find((p) => p.meta.namespace === ns && p.meta.name === name); }
  deployment(ns: string, name: string) { return this.deployments.find((d) => d.meta.namespace === ns && d.meta.name === name); }
  replicaset(ns: string, name: string) { return this.replicasets.find((r) => r.meta.namespace === ns && r.meta.name === name); }
  service(ns: string, name: string) { return this.services.find((s) => s.meta.namespace === ns && s.meta.name === name); }
  configmap(ns: string, name: string) { return this.configmaps.find((c) => c.meta.namespace === ns && c.meta.name === name); }
  secret(ns: string, name: string) { return this.secrets.find((s) => s.meta.namespace === ns && s.meta.name === name); }
  podsOf(rs: ReplicaSet) { return this.pods.filter((p) => p.meta.namespace === rs.meta.namespace && p.meta.owner?.kind === 'ReplicaSet' && p.meta.owner.name === rs.meta.name); }
  rsOf(d: Deployment) { return this.replicasets.filter((r) => r.meta.namespace === d.meta.namespace && r.meta.owner?.name === d.meta.name).sort((a, b) => a.revision - b.revision); }
  newRs(d: Deployment) { const h = templateHash(d.spec.template); return this.rsOf(d).find((r) => r.meta.labels['pod-template-hash'] === h); }
  endpoints(s: Service) { return this.pods.filter((p) => p.meta.namespace === s.meta.namespace && Object.keys(s.spec.selector).length && matches(s.spec.selector, p.meta.labels) && p.status.ready && !p.status.deleting); }

  /** Columna STATUS de kubectl get pods. */
  podStatus(p: Pod): string {
    if (p.status.deleting) return 'Terminating';
    if (p.status.reason) return p.status.reason;
    return p.status.phase;
  }
  podReady(p: Pod) { return `${p.status.ready ? p.spec.containers.length : 0}/${p.spec.containers.length}`; }

  deploymentStatus(d: Deployment) {
    const rss = this.rsOf(d);
    const nrs = this.newRs(d);
    const all = rss.flatMap((r) => this.podsOf(r)).filter((p) => !p.status.deleting);
    const ready = all.filter((p) => p.status.ready).length;
    const updated = nrs ? this.podsOf(nrs).filter((p) => !p.status.deleting).length : 0;
    return { replicas: all.length, ready, updated, available: ready, unavailable: Math.max(0, d.spec.replicas - ready), revision: nrs?.revision ?? 0 };
  }

  // ---------- semilla ----------
  private seed() {
    const t0 = this.now - 3 * 3600 * S; // el clúster lleva 3 h encendido
    const nodeLabels = (host: string, extra: Labels = {}): Labels => ({ 'beta.kubernetes.io/arch': 'amd64', 'beta.kubernetes.io/os': 'linux', 'kubernetes.io/arch': 'amd64', 'kubernetes.io/hostname': host, 'kubernetes.io/os': 'linux', ...extra });
    this.nodes = [
      { kind: 'Node', meta: this.meta('kcna-control-plane', undefined, nodeLabels('kcna-control-plane', { 'node-role.kubernetes.io/control-plane': '' }), t0), role: 'control-plane', taints: ['node-role.kubernetes.io/control-plane:NoSchedule'], internalIP: '172.18.0.2', ready: true, cpu: 8000, mem: 7939 },
      { kind: 'Node', meta: this.meta('kcna-worker', undefined, nodeLabels('kcna-worker', { disktype: 'ssd', zone: 'zona-a' }), t0 + 20 * S), role: 'worker', taints: [], internalIP: '172.18.0.3', ready: true, cpu: 8000, mem: 7939 },
      { kind: 'Node', meta: this.meta('kcna-worker2', undefined, nodeLabels('kcna-worker2', { disktype: 'hdd', zone: 'zona-b' }), t0 + 20 * S), role: 'worker', taints: [], internalIP: '172.18.0.4', ready: true, cpu: 8000, mem: 7939 },
    ];
    for (const n of ['default', 'kube-node-lease', 'kube-public', 'kube-system', 'local-path-storage', 'lab-03']) {
      this.namespaces.push({ kind: 'Namespace', meta: this.meta(n, undefined, { 'kubernetes.io/metadata.name': n }, n === 'lab-03' ? this.now - 25 * 60 * S : t0 + (n === 'local-path-storage' ? 30 * S : 0)), status: 'Active' });
    }
    // Pods del sistema (estáticos y DaemonSets), ya Running
    const sys = (name: string, node: string, image: string, labels: Labels, owner?: Meta['owner']) => {
      const p = this.makePod('kube-system', name, { labels, annotations: {}, containers: [{ name: name.split('-')[0] === 'kube' ? name.split('-').slice(0, 2).join('-') : name.split('-')[0], image, ports: [], env: {} }], restartPolicy: 'Always', tolerations: ['node-role.kubernetes.io/control-plane:NoSchedule'] }, t0 + 15 * S, owner);
      p.spec.nodeName = node; p.status.phase = 'Running'; p.status.ready = true; p.status.ip = labels.tier === 'control-plane' || labels['k8s-app'] === 'kube-proxy' || labels.app === 'kindnet' ? this.node(node)!.internalIP : this.podIp(node); p.status.scheduledAt = p.meta.created; p.status.startedAt = p.meta.created + 2 * S;
      return p;
    };
    const kh = (n: string) => `${n}-${this.suffix()}`;
    sys('etcd-kcna-control-plane', 'kcna-control-plane', 'registry.k8s.io/etcd:3.5.16-0', { component: 'etcd', tier: 'control-plane' });
    sys('kube-apiserver-kcna-control-plane', 'kcna-control-plane', 'registry.k8s.io/kube-apiserver:v1.37.0', { component: 'kube-apiserver', tier: 'control-plane' });
    sys('kube-controller-manager-kcna-control-plane', 'kcna-control-plane', 'registry.k8s.io/kube-controller-manager:v1.37.0', { component: 'kube-controller-manager', tier: 'control-plane' });
    sys('kube-scheduler-kcna-control-plane', 'kcna-control-plane', 'registry.k8s.io/kube-scheduler:v1.37.0', { component: 'kube-scheduler', tier: 'control-plane' });
    for (const n of ['kcna-control-plane', 'kcna-worker', 'kcna-worker2']) {
      sys(kh('kube-proxy'), n, 'registry.k8s.io/kube-proxy:v1.37.0', { 'k8s-app': 'kube-proxy', 'controller-revision-hash': '7d4f8c9b6d', 'pod-template-generation': '1' });
      sys(kh('kindnet'), n, 'docker.io/kindest/kindnetd:v20250512-df8de77b', { app: 'kindnet', 'controller-revision-hash': '5b6c7d8e9f', 'k8s-app': 'kindnet', tier: 'node' });
    }
    // coredns como Deployment real en kube-system
    const dns = this.createDeployment('kube-system', 'coredns', 'registry.k8s.io/coredns/coredns:v1.12.0', 2, { 'k8s-app': 'kube-dns' }, t0 + 15 * S);
    dns.spec.template.containers[0].name = 'coredns';
    dns.spec.template.tolerations = ['node-role.kubernetes.io/control-plane:NoSchedule'];
    const lps = this.makePod('local-path-storage', kh('local-path-provisioner-7dc846544d'), { labels: { app: 'local-path-provisioner', 'pod-template-hash': '7dc846544d' }, annotations: {}, containers: [{ name: 'local-path-provisioner', image: 'docker.io/kindest/local-path-provisioner:v20250214-acbabc1a', ports: [], env: {} }], restartPolicy: 'Always', tolerations: ['node-role.kubernetes.io/control-plane:NoSchedule'] }, t0 + 40 * S);
    lps.spec.nodeName = 'kcna-control-plane'; lps.status.phase = 'Running'; lps.status.ready = true; lps.status.ip = this.podIp('kcna-control-plane'); lps.status.startedAt = lps.meta.created + 3 * S;
    this.createService('kube-system', 'kube-dns', { 'k8s-app': 'kube-dns' }, [{ port: 53, targetPort: 53, protocol: 'TCP' }, { port: 9153, targetPort: 9153, protocol: 'TCP' }], 'ClusterIP', t0 + 15 * S, '10.96.0.10');
    const api = this.createService('default', 'kubernetes', {}, [{ port: 443, targetPort: 6443, protocol: 'TCP' }], 'ClusterIP', t0, '10.96.0.1');
    api.meta.labels = { component: 'apiserver', provider: 'kubernetes' };

    // Semilla del alumno: deployment web + service web en default, un pod suelto y un deployment roto
    const web = this.createDeployment('default', 'web', 'nginx:1.27-alpine', 2, { app: 'web' }, this.now - 25 * 60 * S);
    web.spec.template.containers[0].ports = [80];
    this.createService('default', 'web', { app: 'web' }, [{ port: 80, targetPort: 80, protocol: 'TCP' }], 'ClusterIP', this.now - 24 * 60 * S);
    const tools = this.makePod('default', 'tools', { labels: { run: 'tools' }, annotations: {}, containers: [{ name: 'tools', image: 'busybox:1.37', ports: [], env: {}, command: ['sleep', '3600'] }], restartPolicy: 'Always', tolerations: [] }, this.now - 12 * 60 * S);
    void tools;
    const cat = this.createDeployment('default', 'catalogo', 'redis:7.4', 1, { app: 'catalogo' }, this.now - 8 * 60 * S);
    cat.spec.template.containers[0].ports = [6379];
    // lab-03: algo que ver con -A
    const fe = this.createDeployment('lab-03', 'frontend', 'nginx:1.28-alpine', 3, { app: 'frontend' }, this.now - 20 * 60 * S);
    void fe;
    this.createConfigMap('lab-03', 'app-config', { APP_COLOR: 'azul', APP_MODE: 'desarrollo', 'app.properties': 'idioma=es\nreintentos=3\n' }, this.now - 21 * 60 * S);
    this.createSecret('lab-03', 'app-secret', { DB_USER: 'app', DB_PASSWORD: 'S3cr3t0-de-lab' }, this.now - 21 * 60 * S);
    for (const n of this.namespaces) this.createConfigMap(n.meta.name, 'kube-root-ca.crt', { 'ca.crt': '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----\n' }, n.meta.created);
    // Deja que todo arranque: 26 minutos simulados en pasos de 1 s (sin eventos ruidosos de arranque)
    const saved = this.now;
    this.now -= 26 * 60 * S;
    while (this.now < saved) { this.now += S; this.reconcile(); }
    this.now = saved;
    this.reconcile();
    // los eventos de la semilla se consideran antiguos: solo conservamos los de los últimos 10 minutos
    this.events = this.events.filter((e) => e.time > this.now - 10 * 60 * S);
    for (const e of this.events) e.first = Math.max(e.first, this.now - 10 * 60 * S);
  }

  // ---------- creación de objetos ----------
  makePod(ns: string, name: string, template: PodTemplate, created = this.now, owner?: Meta['owner']): Pod {
    const p: Pod = {
      kind: 'Pod',
      meta: { ...this.meta(name, ns, template.labels, created), annotations: { ...template.annotations }, owner },
      spec: { ...template, labels: { ...template.labels }, containers: template.containers.map((c) => ({ ...c, ports: [...c.ports], env: { ...c.env } })) },
      status: { phase: 'Pending', ready: false, restarts: 0, pulls: 0, logs: [] },
    };
    this.pods.push(p);
    return p;
  }

  createPod(ns: string, name: string, template: PodTemplate): Pod {
    return this.makePod(ns, name, template);
  }

  createDeployment(ns: string, name: string, image: string, replicas: number, labels: Labels = { app: name }, created = this.now, extra: Partial<PodTemplate> = {}): Deployment {
    const d: Deployment = {
      kind: 'Deployment',
      meta: this.meta(name, ns, labels, created),
      spec: { replicas, selector: { ...labels }, template: { labels: { ...labels }, annotations: {}, containers: [{ name: containerNameFrom(image), image, ports: [], env: {} }], restartPolicy: 'Always', tolerations: [], ...extra }, maxSurge: '25%', maxUnavailable: '25%', strategy: 'RollingUpdate' },
      paused: false,
    };
    this.deployments.push(d);
    return d;
  }

  createService(ns: string, name: string, selector: Labels, ports: Service['spec']['ports'], type: Service['spec']['type'] = 'ClusterIP', created = this.now, clusterIP?: string): Service {
    const s: Service = { kind: 'Service', meta: this.meta(name, ns, Object.keys(selector).length ? { ...selector } : {}, created), spec: { type, selector: { ...selector }, ports: ports.map((p) => ({ ...p })), clusterIP: clusterIP ?? this.clusterIp() } };
    if (type === 'NodePort') for (const p of s.spec.ports) if (!p.nodePort) p.nodePort = this.nodePortN++;
    this.services.push(s);
    return s;
  }

  createConfigMap(ns: string, name: string, data: Labels, created = this.now): ConfigMap {
    const c: ConfigMap = { kind: 'ConfigMap', meta: this.meta(name, ns, {}, created), data: { ...data } };
    this.configmaps.push(c);
    return c;
  }

  createSecret(ns: string, name: string, data: Labels, created = this.now, type = 'Opaque'): Secret {
    const s: Secret = { kind: 'Secret', meta: this.meta(name, ns, {}, created), type, data: { ...data } };
    this.secrets.push(s);
    return s;
  }

  createNamespace(name: string): Namespace {
    const n: Namespace = { kind: 'Namespace', meta: this.meta(name, undefined, { 'kubernetes.io/metadata.name': name }), status: 'Active' };
    this.namespaces.push(n);
    this.createConfigMap(name, 'kube-root-ca.crt', { 'ca.crt': '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----\n' });
    return n;
  }

  // ---------- borrado ----------
  deletePod(p: Pod, grace = 1) {
    if (p.status.deleting) return;
    p.status.deleting = true;
    p.status.deletedAt = this.now + grace * S;
    if (p.status.phase === 'Running' || p.status.reason === 'ContainerCreating') this.event(p.meta.namespace!, 'Normal', 'Killing', `pod/${p.meta.name}`, 'kubelet', `Stopping container ${p.spec.containers[0].name}`);
    if (!p.spec.nodeName) { this.pods = this.pods.filter((x) => x !== p); }
  }
  deleteReplicaSet(rs: ReplicaSet) {
    for (const p of this.podsOf(rs)) this.deletePod(p);
    this.replicasets = this.replicasets.filter((r) => r !== rs);
  }
  deleteDeployment(d: Deployment) {
    for (const rs of this.rsOf(d)) this.deleteReplicaSet(rs);
    this.deployments = this.deployments.filter((x) => x !== d);
  }
  deleteService(s: Service) { this.services = this.services.filter((x) => x !== s); }
  deleteConfigMap(c: ConfigMap) { this.configmaps = this.configmaps.filter((x) => x !== c); }
  deleteSecret(s: Secret) { this.secrets = this.secrets.filter((x) => x !== s); }
  deleteNamespace(n: Namespace) {
    n.status = 'Terminating';
    const ns = n.meta.name;
    for (const d of this.deployments.filter((d) => d.meta.namespace === ns)) this.deleteDeployment(d);
    for (const r of this.replicasets.filter((r) => r.meta.namespace === ns)) this.deleteReplicaSet(r);
    for (const p of this.pods.filter((p) => p.meta.namespace === ns)) this.deletePod(p);
    this.services = this.services.filter((s) => s.meta.namespace !== ns);
    this.configmaps = this.configmaps.filter((c) => c.meta.namespace !== ns);
    this.secrets = this.secrets.filter((s) => s.meta.namespace !== ns);
    this.events = this.events.filter((e) => e.namespace !== ns);
    n.meta.annotations['__deleteAt'] = String(this.now + 3 * S);
  }

  // ---------- reloj y controladores ----------
  /** Avanza el reloj simulado (ms) ejecutando los controladores una vez por segundo. */
  tick(ms: number) {
    let left = ms;
    while (left > 0) { const step = Math.min(S, left); this.now += step; left -= step; this.reconcile(); }
    if (ms <= 0) this.reconcile();
  }

  reconcile() {
    this.reconcileDeployments();
    this.reconcileReplicaSets();
    this.schedule();
    this.kubelet();
    this.gc();
  }

  private surge(d: Deployment) {
    const r = d.spec.replicas;
    const pct = (v: string, up: boolean) => v.endsWith('%') ? (up ? Math.ceil : Math.floor)((r * parseInt(v)) / 100) : parseInt(v);
    let maxSurge = pct(d.spec.maxSurge, true), maxUnavailable = pct(d.spec.maxUnavailable, false);
    if (maxSurge === 0 && maxUnavailable === 0) maxUnavailable = 1;
    if (d.spec.strategy === 'Recreate') { maxSurge = 0; maxUnavailable = r; }
    return { maxSurge, maxUnavailable };
  }

  private reconcileDeployments() {
    for (const d of this.deployments) {
      if (d.paused || d.meta.created > this.now) continue;
      const hash = templateHash(d.spec.template);
      let nrs = this.newRs(d);
      const rss = this.rsOf(d);
      if (!nrs) {
        const rev = Math.max(0, ...rss.map((r) => r.revision)) + 1;
        nrs = { kind: 'ReplicaSet', meta: { ...this.meta(`${d.meta.name}-${hash}`, d.meta.namespace, { ...d.spec.template.labels, 'pod-template-hash': hash }), owner: { kind: 'Deployment', name: d.meta.name } }, spec: { replicas: 0, selector: { ...d.spec.selector, 'pod-template-hash': hash }, template: { ...d.spec.template, labels: { ...d.spec.template.labels, 'pod-template-hash': hash }, containers: d.spec.template.containers.map((c) => ({ ...c })) } }, revision: rev };
        nrs.meta.annotations['deployment.kubernetes.io/revision'] = String(rev);
        if (d.meta.annotations['kubernetes.io/change-cause']) nrs.meta.annotations['kubernetes.io/change-cause'] = d.meta.annotations['kubernetes.io/change-cause'];
        this.replicasets.push(nrs);
      }
      const old = this.rsOf(d).filter((r) => r !== nrs);
      const { maxSurge, maxUnavailable } = this.surge(d);
      const desired = d.spec.replicas;
      const total = () => this.rsOf(d).reduce((a, r) => a + r.spec.replicas, 0);
      const readyOf = (r: ReplicaSet) => this.podsOf(r).filter((p) => p.status.ready && !p.status.deleting).length;
      // escalar el RS nuevo hasta donde permita maxSurge
      if (nrs.spec.replicas < desired) {
        const room = desired + maxSurge - total();
        if (room > 0) { const to = Math.min(desired, nrs.spec.replicas + room); this.scaleRs(d, nrs, to); }
      } else if (nrs.spec.replicas > desired) {
        this.scaleRs(d, nrs, desired);
      }
      // reducir los RS viejos sin bajar de desired - maxUnavailable réplicas disponibles
      const minAvailable = desired - maxUnavailable;
      let available = this.rsOf(d).reduce((a, r) => a + readyOf(r), 0);
      for (const r of old) {
        if (r.spec.replicas === 0) continue;
        // los pods viejos que no están listos se pueden quitar siempre
        const notReady = r.spec.replicas - readyOf(r);
        let down = Math.max(0, notReady);
        const canRemoveReady = Math.max(0, available - minAvailable);
        down += Math.min(readyOf(r), canRemoveReady);
        // con Recreate se bajan todos de golpe
        if (d.spec.strategy === 'Recreate') down = r.spec.replicas;
        if (down > 0) { this.scaleRs(d, r, Math.max(0, r.spec.replicas - down)); available -= Math.min(readyOf(r), canRemoveReady); }
      }
      // con Recreate no se crea nada nuevo hasta que desaparezcan los viejos
      if (d.spec.strategy === 'Recreate' && old.some((r) => this.podsOf(r).length) && nrs.spec.replicas > 0) this.scaleRs(d, nrs, 0);
      // limpiar RS viejos de más (revisionHistoryLimit 10)
      const zero = old.filter((r) => r.spec.replicas === 0);
      while (zero.length > 10) { const r = zero.shift()!; this.replicasets = this.replicasets.filter((x) => x !== r); }
    }
  }

  private scaleRs(d: Deployment, rs: ReplicaSet, to: number) {
    if (rs.spec.replicas === to) return;
    const from = rs.spec.replicas;
    rs.spec.replicas = to;
    this.event(d.meta.namespace!, 'Normal', 'ScalingReplicaSet', `deployment/${d.meta.name}`, 'deployment-controller', `Scaled ${to > from ? 'up' : 'down'} replica set ${rs.meta.name} from ${from} to ${to}`);
  }

  private reconcileReplicaSets() {
    for (const rs of this.replicasets) {
      // adopción de pods huérfanos cuyas labels coinciden con el selector
      for (const p of this.pods) {
        if (p.meta.namespace === rs.meta.namespace && !p.meta.owner && !p.status.deleting && matches(rs.spec.selector, p.meta.labels)) p.meta.owner = { kind: 'ReplicaSet', name: rs.meta.name };
      }
      const live = this.podsOf(rs).filter((p) => !p.status.deleting);
      if (live.length < rs.spec.replicas) {
        for (let i = live.length; i < rs.spec.replicas; i++) {
          const name = `${rs.meta.name}-${this.suffix()}`;
          this.makePod(rs.meta.namespace!, name, rs.spec.template, this.now, { kind: 'ReplicaSet', name: rs.meta.name });
          this.event(rs.meta.namespace!, 'Normal', 'SuccessfulCreate', `replicaset/${rs.meta.name}`, 'replicaset-controller', `Created pod: ${name}`);
        }
      } else if (live.length > rs.spec.replicas) {
        // sobran: primero los no listos, luego los más nuevos
        const victims = [...live].sort((a, b) => Number(a.status.ready) - Number(b.status.ready) || b.meta.created - a.meta.created).slice(0, live.length - rs.spec.replicas);
        for (const v of victims) { this.deletePod(v); this.event(rs.meta.namespace!, 'Normal', 'SuccessfulDelete', `replicaset/${rs.meta.name}`, 'replicaset-controller', `Deleted pod: ${v.meta.name}`); }
      }
    }
  }

  /** Nodos en los que podría caer un pod (nodeSelector y taints básicos). */
  candidates(p: Pod) {
    return this.nodes.filter((n) => {
      if (!n.ready) return false;
      if (p.spec.nodeSelector && !matches(p.spec.nodeSelector, n.meta.labels)) return false;
      for (const t of n.taints) { const key = t.split(':')[0].split('=')[0]; if (!p.spec.tolerations.some((tol) => tol.split(':')[0].split('=')[0] === key)) return false; }
      return true;
    });
  }

  private schedule() {
    for (const p of this.pods) {
      if (p.spec.nodeName || p.status.deleting || p.meta.created > this.now) continue;
      const cands = this.candidates(p);
      if (!cands.length) {
        const untol = this.nodes.filter((n) => n.taints.length && !p.spec.tolerations.length).length;
        const nosel = this.nodes.length - untol;
        const parts = [untol ? `${untol} node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }` : '', p.spec.nodeSelector && nosel ? `${nosel} node(s) didn't match Pod's node affinity/selector` : ''].filter(Boolean);
        this.event(p.meta.namespace!, 'Warning', 'FailedScheduling', `pod/${p.meta.name}`, 'default-scheduler', `0/${this.nodes.length} nodes are available: ${parts.join(', ')}. preemption: 0/${this.nodes.length} nodes are available: ${this.nodes.length} Preemption is not helpful for scheduling.`);
        continue;
      }
      // menos cargado primero (número de pods)
      const load = (n: Node) => this.pods.filter((x) => x.spec.nodeName === n.meta.name && !x.status.deleting).length;
      const n = [...cands].sort((a, b) => load(a) - load(b) || a.meta.name.localeCompare(b.meta.name))[0];
      p.spec.nodeName = n.meta.name;
      p.status.scheduledAt = this.now;
      p.status.reason = 'ContainerCreating';
      p.status.nextTransition = this.now + 2 * S;
      p.status.ip = this.podIp(n.meta.name);
      this.event(p.meta.namespace!, 'Normal', 'Scheduled', `pod/${p.meta.name}`, 'default-scheduler', `Successfully assigned ${p.meta.namespace}/${p.meta.name} to ${n.meta.name}`);
    }
  }

  private kubelet() {
    for (const p of this.pods) {
      if (!p.spec.nodeName || p.status.deleting) continue;
      const c = p.spec.containers[0];
      const ns = p.meta.namespace!;
      const ev = (type: Event['type'], reason: string, msg: string) => this.event(ns, type, reason, `pod/${p.meta.name}`, 'kubelet', msg);
      if (p.status.nextTransition === undefined || this.now < p.status.nextTransition) continue;
      switch (p.status.reason) {
        case 'ContainerCreating': {
          if (imageAvailable(c.image)) {
            ev('Normal', 'Pulled', `Container image "${c.image}" already present on machine`);
            ev('Normal', 'Created', `Created container: ${c.name}`);
            ev('Normal', 'Started', `Started container ${c.name}`);
            this.start(p);
          } else {
            p.status.pulls++;
            ev('Normal', 'Pulling', `Pulling image "${c.image}"`);
            ev('Warning', 'Failed', `Failed to pull image "${c.image}": failed to pull and unpack image "${imageRef(c.image)}": failed to resolve reference "${imageRef(c.image)}": failed to do request: Head "https://${imageRef(c.image).split('/')[0] === 'docker.io' ? 'registry-1.docker.io' : imageRef(c.image).split('/')[0]}/v2/${imageRef(c.image).split('/').slice(1).join('/').split(':')[0]}/manifests/${imageTag(c.image)}": dial tcp: lookup ${imageRef(c.image).split('/')[0] === 'docker.io' ? 'registry-1.docker.io' : imageRef(c.image).split('/')[0]}: no such host`);
            ev('Warning', 'Failed', 'Error: ErrImagePull');
            p.status.reason = 'ErrImagePull';
            p.status.nextTransition = this.now + 2 * S;
          }
          break;
        }
        case 'ErrImagePull': {
          ev('Normal', 'BackOff', `Back-off pulling image "${c.image}"`);
          ev('Warning', 'Failed', 'Error: ImagePullBackOff');
          p.status.reason = 'ImagePullBackOff';
          p.status.nextTransition = this.now + Math.min(300, 10 * 2 ** Math.min(5, p.status.pulls)) * S;
          break;
        }
        case 'ImagePullBackOff': {
          // vuelve a intentarlo (y vuelve a fallar) salvo que la imagen ya esté
          if (imageAvailable(c.image)) { p.status.reason = 'ContainerCreating'; p.status.nextTransition = this.now; }
          else { p.status.reason = 'ErrImagePull'; p.status.pulls++; ev('Normal', 'Pulling', `Pulling image "${c.image}"`); ev('Warning', 'Failed', 'Error: ErrImagePull'); p.status.nextTransition = this.now + 2 * S; }
          break;
        }
        case undefined: {
          // Running: contenedores que terminan solos (busybox sin comando de larga duración)
          if (p.status.phase === 'Running' && this.exitsImmediately(c)) {
            p.status.ready = false;
            if (p.spec.restartPolicy === 'Never') { p.status.phase = 'Succeeded'; p.status.reason = 'Completed'; p.status.nextTransition = undefined; }
            else { p.status.reason = 'Completed'; p.status.nextTransition = this.now + 2 * S; }
          } else p.status.nextTransition = undefined;
          break;
        }
        case 'Completed': {
          if (p.spec.restartPolicy === 'Never') { p.status.nextTransition = undefined; break; }
          // restartPolicy Always: reinicia con espera exponencial -> CrashLoopBackOff
          p.status.restarts++;
          p.status.lastRestart = this.now;
          if (p.status.restarts >= 2) { ev('Warning', 'BackOff', `Back-off restarting failed container ${c.name} in pod ${p.meta.name}_${ns}(${p.meta.uid})`); p.status.reason = 'CrashLoopBackOff'; p.status.nextTransition = this.now + Math.min(300, 10 * 2 ** Math.min(5, p.status.restarts - 1)) * S; }
          else { ev('Normal', 'Pulled', `Container image "${c.image}" already present on machine`); ev('Normal', 'Created', `Created container: ${c.name}`); ev('Normal', 'Started', `Started container ${c.name}`); this.start(p); }
          break;
        }
        case 'CrashLoopBackOff': {
          ev('Normal', 'Pulled', `Container image "${c.image}" already present on machine`);
          ev('Normal', 'Created', `Created container: ${c.name}`);
          ev('Normal', 'Started', `Started container ${c.name}`);
          this.start(p);
          break;
        }
        default: p.status.nextTransition = undefined;
      }
    }
  }

  private start(p: Pod) {
    p.status.phase = 'Running';
    p.status.reason = undefined;
    p.status.ready = true;
    p.status.startedAt = p.status.startedAt ?? this.now;
    const c = p.spec.containers[0];
    p.status.nextTransition = this.exitsImmediately(c) ? this.now + 1 * S : undefined;
  }

  /** busybox/alpine sin comando (o con uno corto) terminan enseguida: con restartPolicy Always acaban en CrashLoopBackOff. */
  exitsImmediately(c: Container) {
    const base = containerNameFrom(c.image);
    if (!['busybox', 'alpine'].includes(base)) return false;
    const cmd = c.command ?? [];
    if (!cmd.length) return true;
    if (['sleep', 'tail', 'sh', 'httpd', 'nc'].includes(cmd[0]) && cmd.length > 1) return false;
    return true;
  }

  private gc() {
    this.pods = this.pods.filter((p) => !(p.status.deleting && p.status.deletedAt !== undefined && this.now >= p.status.deletedAt));
    this.namespaces = this.namespaces.filter((n) => !(n.status === 'Terminating' && this.now >= Number(n.meta.annotations['__deleteAt'])));
  }
}
