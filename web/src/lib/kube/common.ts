// Piezas compartidas del ejecutor: parseo de flags, registro de tipos de recurso, errores con formato real.
import type { Cluster, Pod, Deployment, ReplicaSet, Service, ConfigMap, Secret, Namespace, Node, Labels } from './cluster.ts';

export interface Result { out: string; ok: boolean; clear?: boolean }
export const ok = (lines: string[] | string): Result => ({ out: Array.isArray(lines) ? lines.join('\n') : lines, ok: true });
export const fail = (lines: string[] | string): Result => ({ out: Array.isArray(lines) ? lines.join('\n') : lines, ok: false });

// ---------- flags ----------
export interface Parsed { args: string[]; flags: Record<string, string[]>; rest: string[] }

const SHORT: Record<string, string> = { n: 'namespace', o: 'output', l: 'selector', L: 'label-columns', c: 'container', f: 'filename', A: 'all-namespaces', p: 'previous', w: 'watch', h: 'help', i: 'stdin', t: 'tty', k: 'kustomize', R: 'recursive' };
const VALUE = new Set(['namespace', 'output', 'selector', 'label-columns', 'container', 'filename', 'image', 'replicas', 'port', 'target-port', 'type', 'name', 'from-literal', 'from-file', 'from-env-file', 'restart', 'env', 'to-revision', 'revision', 'timeout', 'tail', 'sort-by', 'field-selector', 'grace-period', 'cascade', 'schedule', 'labels', 'annotations', 'command', 'kustomize', 'since', 'limit', 'min', 'max', 'cpu-percent', 'protocol', 'external-ip', 'cluster-ip', 'selector-labels', 'overrides', 'requests', 'limits', 'serviceaccount', 'verb', 'resource', 'template', 'as', 'context', 'cluster', 'user', 'kubeconfig', 'server', 'current-replicas', 'max-replicas', 'min-replicas', 'image-pull-policy', 'port-name', 'for', 'chunk-size', 'pod-running-timeout', 'target', 'copy-to', 'share-processes', 'retries']);

/** Flags que en `logs` son booleanos aunque en otros comandos lleven valor. */
const BOOL_IN: Record<string, Set<string>> = { logs: new Set(['filename', 'previous']), exec: new Set([]), run: new Set(['command']), delete: new Set(['selector-labels']) };

export function parseFlags(tokens: string[], cmd = ''): Parsed {
  const args: string[] = []; const flags: Record<string, string[]> = {}; let rest: string[] = [];
  const add = (k: string, v: string) => { (flags[k] ??= []).push(v); };
  const isValue = (k: string) => VALUE.has(k) && !BOOL_IN[cmd]?.has(k);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '--') { rest = tokens.slice(i + 1); break; }
    if (t.startsWith('--')) {
      const eq = t.indexOf('=');
      const key = eq > 0 ? t.slice(2, eq) : t.slice(2);
      if (eq > 0) add(key, t.slice(eq + 1));
      else if (key === 'dry-run') add(key, ['client', 'server', 'none'].includes(tokens[i + 1] ?? '') ? tokens[++i] : 'client');
      else if (isValue(key) && i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) add(key, tokens[++i]);
      else add(key, 'true');
      continue;
    }
    if (t.startsWith('-') && t.length > 1 && !/^-\d/.test(t)) {
      const chars = t.slice(1);
      for (let j = 0; j < chars.length; j++) {
        const key = SHORT[chars[j]] ?? chars[j];
        if (isValue(key)) {
          const restOf = chars.slice(j + 1).replace(/^=/, '');
          if (restOf) add(key, restOf); else if (i + 1 < tokens.length) add(key, tokens[++i]); else add(key, '');
          break;
        }
        add(key, 'true');
      }
      continue;
    }
    args.push(t);
  }
  return { args, flags, rest };
}
export const flag = (p: Parsed, k: string) => p.flags[k]?.at(-1);
export const has = (p: Parsed, k: string) => !!p.flags[k];
export const nsOf = (c: Cluster, p: Parsed) => flag(p, 'namespace') ?? c.currentNamespace;

// ---------- tipos de recurso ----------
export interface Kind { kind: string; plural: string; group: string; apiVersion: string; short: string; namespaced: boolean; aliases: string[]; synthetic?: boolean }
const K = (kind: string, plural: string, group: string, apiVersion: string, short: string, namespaced: boolean, extra: string[] = [], synthetic = false): Kind => ({ kind, plural, group, apiVersion, short, namespaced, aliases: [plural, plural.replace(/s$/, ''), kind.toLowerCase(), ...(short ? [short] : []), ...extra], synthetic });
export const KINDS: Kind[] = [
  K('Pod', 'pods', '', 'v1', 'po', true),
  K('Deployment', 'deployments', 'apps', 'apps/v1', 'deploy', true),
  K('ReplicaSet', 'replicasets', 'apps', 'apps/v1', 'rs', true),
  K('Service', 'services', '', 'v1', 'svc', true),
  K('ConfigMap', 'configmaps', '', 'v1', 'cm', true),
  K('Secret', 'secrets', '', 'v1', '', true),
  K('Namespace', 'namespaces', '', 'v1', 'ns', false),
  K('Node', 'nodes', '', 'v1', 'no', false),
  K('Event', 'events', '', 'v1', 'ev', true),
  K('ServiceAccount', 'serviceaccounts', '', 'v1', 'sa', true, [], true),
  K('Endpoints', 'endpoints', '', 'v1', 'ep', true, [], true),
  K('DaemonSet', 'daemonsets', 'apps', 'apps/v1', 'ds', true, [], true),
  K('StatefulSet', 'statefulsets', 'apps', 'apps/v1', 'sts', true, [], true),
  K('Job', 'jobs', 'batch', 'batch/v1', '', true, [], true),
  K('CronJob', 'cronjobs', 'batch', 'batch/v1', 'cj', true, [], true),
  K('Ingress', 'ingresses', 'networking.k8s.io', 'networking.k8s.io/v1', 'ing', true, [], true),
  K('NetworkPolicy', 'networkpolicies', 'networking.k8s.io', 'networking.k8s.io/v1', 'netpol', true, [], true),
  K('PersistentVolumeClaim', 'persistentvolumeclaims', '', 'v1', 'pvc', true, [], true),
  K('PersistentVolume', 'persistentvolumes', '', 'v1', 'pv', false, [], true),
  K('StorageClass', 'storageclasses', 'storage.k8s.io', 'storage.k8s.io/v1', 'sc', false, [], true),
  K('HorizontalPodAutoscaler', 'horizontalpodautoscalers', 'autoscaling', 'autoscaling/v2', 'hpa', true, [], true),
  K('Role', 'roles', 'rbac.authorization.k8s.io', 'rbac.authorization.k8s.io/v1', '', true, [], true),
  K('RoleBinding', 'rolebindings', 'rbac.authorization.k8s.io', 'rbac.authorization.k8s.io/v1', '', true, [], true),
  K('ClusterRole', 'clusterroles', 'rbac.authorization.k8s.io', 'rbac.authorization.k8s.io/v1', '', false, [], true),
  K('ClusterRoleBinding', 'clusterrolebindings', 'rbac.authorization.k8s.io', 'rbac.authorization.k8s.io/v1', '', false, [], true),
  K('ResourceQuota', 'resourcequotas', '', 'v1', 'quota', true, [], true),
  K('LimitRange', 'limitranges', '', 'v1', 'limits', true, [], true),
  K('CustomResourceDefinition', 'customresourcedefinitions', 'apiextensions.k8s.io', 'apiextensions.k8s.io/v1', 'crd', false, ['crds'], true),
];
export function kindOf(name: string): Kind | undefined {
  const base = name.toLowerCase().replace(/\.(apps|v1|batch|networking\.k8s\.io|storage\.k8s\.io|autoscaling|rbac\.authorization\.k8s\.io)(\.\S*)?$/, '');
  return KINDS.find((k) => k.aliases.includes(base));
}
/** "deployments.apps" para mensajes de error; "deployment.apps/" como prefijo de nombre. */
export const fullName = (k: Kind) => k.group ? `${k.plural}.${k.group}` : k.plural;
export const prefix = (k: Kind) => (k.group ? `${k.kind.toLowerCase()}.${k.group}` : k.kind.toLowerCase());

export const notFound = (k: Kind, name: string) => fail(`Error from server (NotFound): ${fullName(k)} "${name}" not found`);
export const alreadyExists = (k: Kind, name: string) => fail(`Error from server (AlreadyExists): ${fullName(k)} "${name}" already exists`);
export const noType = (t: string) => fail(`error: the server doesn't have a resource type "${t}"`);
export const nsNotFound = (ns: string) => fail(`Error from server (NotFound): namespaces "${ns}" not found`);

/** Acepta "tipo nombre", "tipo/nombre" y abreviaturas. */
export function typeAndName(args: string[]): { kind?: Kind; name?: string; typeText: string; rest: string[] } {
  if (!args.length) return { typeText: '', rest: [] };
  if (args[0].includes('/')) { const [t, n] = args[0].split('/'); return { kind: kindOf(t), name: n, typeText: t, rest: args.slice(1) }; }
  return { kind: kindOf(args[0]), name: args[1], typeText: args[0], rest: args.slice(2) };
}

// ---------- selectores ----------
export function parseSelector(sel: string): ((l: Labels) => boolean) | null {
  const conds: ((l: Labels) => boolean)[] = [];
  for (const raw of sel.split(/,(?![^(]*\))/)) {
    const s = raw.trim();
    if (!s) continue;
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^([\w./-]+)\s*(notin|in)\s*\(([^)]*)\)$/i))) { const key = m[1]; const vals = m[3].split(',').map((v) => v.trim()); const neg = m[2].toLowerCase() === 'notin'; conds.push((l) => neg ? !(key in l && vals.includes(l[key])) : key in l && vals.includes(l[key])); }
    else if ((m = s.match(/^([\w./-]+)\s*!=\s*(.*)$/))) { const [, k, v] = m; conds.push((l) => l[k] !== v); }
    else if ((m = s.match(/^([\w./-]+)\s*==?\s*(.*)$/))) { const [, k, v] = m; conds.push((l) => l[k] === v); }
    else if ((m = s.match(/^!([\w./-]+)$/))) { const k = m[1]; conds.push((l) => !(k in l)); }
    else if (/^[\w./-]+$/.test(s)) conds.push((l) => s in l);
    else return null;
  }
  return (l) => conds.every((f) => f(l));
}

export type Item = Pod | Deployment | ReplicaSet | Service | ConfigMap | Secret | Namespace | Node;
export function listOf(c: Cluster, k: Kind): Item[] {
  switch (k.kind) {
    case 'Pod': return c.pods;
    case 'Deployment': return c.deployments;
    case 'ReplicaSet': return c.replicasets;
    case 'Service': return c.services;
    case 'ConfigMap': return c.configmaps;
    case 'Secret': return c.secrets;
    case 'Namespace': return c.namespaces;
    case 'Node': return c.nodes;
    default: return [];
  }
}
export const labelsText = (l: Labels) => { const e = Object.entries(l).sort(([a], [b]) => a.localeCompare(b)); return e.length ? e.map(([k, v]) => `${k}=${v}`).join(',') : '<none>'; };
