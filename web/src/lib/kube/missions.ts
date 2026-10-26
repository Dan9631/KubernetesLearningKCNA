// Misiones guiadas de la terminal: se verifican contra el estado del clúster simulado (y, en dos casos, contra los comandos ejecutados).
import type { Cluster } from './cluster.ts';

export interface MissionCtx { ran: (re: RegExp) => boolean }
export interface Mission { id: string; title: string; hint: string; check: (c: Cluster, ctx: MissionCtx) => boolean }

const api = (c: Cluster) => c.deployment('default', 'api');
const image = (c: Cluster) => api(c)?.spec.template.containers[0].image;

export const MISSIONS: Mission[] = [
  { id: 'crear', title: 'Crea un deployment api con 3 réplicas de nginx:1.28-alpine', hint: 'kubectl create deployment api --image=nginx:1.28-alpine --replicas=3',
    check: (c) => !!api(c) && api(c)!.spec.replicas >= 3 && (image(c) === 'nginx:1.28-alpine' || c.rsOf(api(c)!).some((r) => r.spec.template.containers[0].image === 'nginx:1.28-alpine')) },
  { id: 'exponer', title: 'Exponlo como ClusterIP en el puerto 80', hint: 'kubectl expose deployment api --port=80',
    check: (c) => { const s = c.service('default', 'api'); return !!s && s.spec.type === 'ClusterIP' && s.spec.ports.some((p) => p.port === 80) && s.spec.selector.app === 'api'; } },
  { id: 'escalar', title: 'Escálalo a 5 réplicas', hint: 'kubectl scale deployment api --replicas=5',
    check: (c) => !!api(c) && api(c)!.spec.replicas === 5 },
  { id: 'rollout', title: 'Cambia su imagen a nginx:1.27-alpine y consulta el rollout history', hint: 'kubectl set image deployment/api nginx=nginx:1.27-alpine, luego kubectl rollout history deployment/api',
    check: (c, ctx) => image(c) === 'nginx:1.27-alpine' && c.rsOf(api(c)!).length >= 2 && ctx.ran(/^(kubectl|k)\s+rollout\s+history\s+(deployment|deploy|deployments)(\/|\s+)api\b/) },
  { id: 'arreglar', title: 'Arregla el deployment catalogo: su pod está en ImagePullBackOff', hint: 'kubectl describe pod <pod de catalogo> para ver la imagen; la que hay cargada es redis:7.4-alpine (kubectl set image deployment/catalogo redis=...)',
    check: (c) => { const d = c.deployment('default', 'catalogo'); if (!d) return false; const st = c.deploymentStatus(d); return st.ready >= 1 && st.ready === d.spec.replicas && !c.pods.some((p) => p.meta.namespace === 'default' && p.meta.labels.app === 'catalogo' && ['ImagePullBackOff', 'ErrImagePull'].includes(c.podStatus(p))); } },
  { id: 'namespace', title: 'Crea un namespace lab y cambia el contexto a él', hint: 'kubectl create namespace lab, luego kubectl config set-context --current --namespace=lab',
    check: (c) => !!c.ns('lab') && c.ns('lab')!.status === 'Active' && c.currentNamespace === 'lab' },
  { id: 'nodos', title: 'Averigua en qué nodo corre cada pod', hint: 'kubectl get pods -o wide (la columna NODE)',
    check: (_c, ctx) => ctx.ran(/^(kubectl|k)\s+get\s+(pods?|po|all)\b(?=.*(-o\s*wide|--output[= ]wide|-owide))/) },
  { id: 'env', title: 'Lee las variables de entorno de un pod', hint: 'kubectl exec <pod> -- env',
    check: (_c, ctx) => ctx.ran(/^(kubectl|k)\s+exec\s+\S+.*--\s+(env|printenv)\b/) },
];
