// Misiones guiadas de la terminal: se verifican contra el estado del clúster simulado (y, en las de solo lectura,
// contra los comandos que se ejecutaron con éxito y mostraron algo).
// Cada misión lleva la ayuda en tres escalones: `idea` (qué concepto usar), el esqueleto del comando (lo calcula la
// Terminal a partir de `hint`) y `hint` (la solución). Los ids no se cambian: están guardados en el progreso.
import type { Cluster } from './cluster.ts';

export interface MissionCtx { ran: (re: RegExp) => boolean }
export interface Mission { id: string; group: string; title: string; idea: string; hint: string; check: (c: Cluster, ctx: MissionCtx) => boolean }
/** Grupos en el orden en que se muestran, con el módulo del curso que practican */
export const GROUPS: { id: string; title: string; module: number }[] = [
  { id: 'workloads', title: 'Workloads', module: 3 },
  { id: 'scheduling', title: 'Scheduling', module: 4 },
  { id: 'networking', title: 'Networking', module: 6 },
  { id: 'diagnostico', title: 'Diagnóstico', module: 9 },
];

const api = (c: Cluster) => c.deployment('default', 'api');
const image = (c: Cluster) => api(c)?.spec.template.containers[0].image;
const K = '^(kubectl|k)\\s+';

export const MISSIONS: Mission[] = [
  { id: 'crear', group: 'workloads', title: 'Crea un deployment api con 3 réplicas de nginx:1.28-alpine',
    idea: 'Es un create imperativo: el tipo, el nombre y dos flags, uno para la imagen y otro para el número de copias.',
    hint: 'kubectl create deployment api --image=nginx:1.28-alpine --replicas=3',
    check: (c) => !!api(c) && api(c)!.spec.replicas >= 3 && (image(c) === 'nginx:1.28-alpine' || c.rsOf(api(c)!).some((r) => r.spec.template.containers[0].image === 'nginx:1.28-alpine')) },
  { id: 'exponer', group: 'workloads', title: 'Exponlo como ClusterIP en el puerto 80',
    idea: 'Un Service da una IP estable a Pods que cambian. kubectl lo crea a partir del Deployment y copia su selector; ClusterIP es el tipo por defecto.',
    hint: 'kubectl expose deployment api --port=80',
    check: (c) => { const s = c.service('default', 'api'); return !!s && s.spec.type === 'ClusterIP' && s.spec.ports.some((p) => p.port === 80) && s.spec.selector.app === 'api'; } },
  { id: 'escalar', group: 'workloads', title: 'Escálalo a 5 réplicas',
    idea: 'Cambias el estado deseado (spec.replicas); el ReplicaSet crea los Pods que faltan.',
    hint: 'kubectl scale deployment api --replicas=5',
    check: (c) => !!api(c) && api(c)!.spec.replicas === 5 },
  { id: 'rollout', group: 'workloads', title: 'Cambia su imagen a nginx:1.27-alpine y consulta el rollout history',
    idea: 'Cambiar la plantilla del Pod lanza un rollout: aparece un ReplicaSet nuevo y una revisión más. La imagen se cambia indicando CONTENEDOR=IMAGEN.',
    hint: 'kubectl set image deployment/api nginx=nginx:1.27-alpine, luego kubectl rollout history deployment/api',
    check: (c, ctx) => image(c) === 'nginx:1.27-alpine' && c.rsOf(api(c)!).length >= 2 && ctx.ran(new RegExp(K + 'rollout\\s+history\\s+(deployment|deploy|deployments)(\\/|\\s+)api\\b')) },
  { id: 'env', group: 'workloads', title: 'Lee las variables de entorno de un pod',
    idea: 'Hay que ejecutar un comando dentro del contenedor. Lo que va después de -- se ejecuta dentro.',
    hint: 'kubectl exec tools -- env',
    check: (_c, ctx) => ctx.ran(new RegExp(K + 'exec\\s+\\S+.*--\\s+(env|printenv)\\b')) },

  { id: 'namespace', group: 'workloads', title: 'Crea un namespace lab, cambia el contexto a él, lista sus pods y vuelve a default',
    idea: 'El namespace por defecto vive en el contexto del kubeconfig, no en el clúster: se cambia con kubectl config. Mientras apuntes a lab, los objetos de default dejan de salir en get.',
    hint: 'kubectl create namespace lab, luego kubectl config set-context --current --namespace=lab, luego kubectl get pods, luego kubectl config set-context --current --namespace=default',
    check: (c, ctx) => !!c.ns('lab') && c.currentNamespace === 'default' && ctx.ran(new RegExp(K + 'config\\s+set-context\\s+.*--namespace[= ]lab\\b')) },

  { id: 'nodos', group: 'scheduling', title: 'Averigua en qué nodo corre cada pod',
    idea: 'La tabla normal de get no trae el nodo: hay un formato de salida con más columnas.',
    hint: 'kubectl get pods -o wide',
    check: (_c, ctx) => ctx.ran(new RegExp(K + 'get\\s+(pods?|po|all)\\b(?=.*(-o\\s*wide|--output[= ]wide|-owide))')) },
  { id: 'sched-ssd', group: 'scheduling', title: 'Aplica ssd-pod.yaml y comprueba que el pod cache cae en el nodo con disktype=ssd',
    idea: 'El manifiesto lleva un nodeSelector: el scheduler solo considera los nodos cuyas labels coinciden. Léelo con cat antes de aplicarlo.',
    hint: 'kubectl apply -f ssd-pod.yaml, luego kubectl get pod cache -o wide',
    check: (c, ctx) => c.pods.some((p) => p.meta.name === 'cache' && p.spec.nodeName === 'kcna-worker') && ctx.ran(new RegExp(K + '(get\\s+(pods?|po)\\b(?=.*(-o\\s*wide|--output[= ]wide|-owide))|describe\\s+(pods?|po)\\s+cache)')) },
  { id: 'sched-label', group: 'scheduling', title: 'Pon la label tier=datos al nodo kcna-worker2',
    idea: 'Los nodos también son objetos con labels; se etiquetan igual que un Pod. Es lo que después usan nodeSelector y la afinidad.',
    hint: 'kubectl label node kcna-worker2 tier=datos',
    check: (c) => c.node('kcna-worker2')?.meta.labels.tier === 'datos' },
  { id: 'sched-taint', group: 'scheduling', title: 'Reserva kcna-worker2 con un taint dedicated=db de efecto NoSchedule',
    idea: 'Un taint repele: ningún Pod nuevo entra en el nodo salvo que declare una toleration. Formato clave=valor:Efecto.',
    hint: 'kubectl taint node kcna-worker2 dedicated=db:NoSchedule',
    check: (c) => !!c.node('kcna-worker2')?.taints.includes('dedicated=db:NoSchedule') },

  { id: 'net-dns', group: 'networking', title: 'Desde el pod tools, resuelve por DNS el Service web',
    idea: 'Cada Service tiene un nombre DNS que CoreDNS resuelve a su ClusterIP. Hay que preguntar desde dentro de un Pod.',
    hint: 'kubectl exec tools -- nslookup web',
    check: (_c, ctx) => ctx.ran(new RegExp(K + 'exec\\s+.*--\\s+nslookup\\s+web\\b')) },
  { id: 'net-ep', group: 'networking', title: 'Mira qué Pods hay detrás del Service web (sus endpoints)',
    idea: 'El Service no guarda Pods: su selector produce una lista de IP:puerto de los Pods listos. Esa lista es un recurso que puedes consultar.',
    hint: 'kubectl get endpoints web',
    check: (_c, ctx) => ctx.ran(new RegExp(K + '(get\\s+(endpoints|ep)\\b|describe\\s+(svc|services?)\\s+web\\b)')) },
  { id: 'net-nodeport', group: 'networking', title: 'Publica el deployment web fuera del clúster con un Service NodePort llamado web-np',
    idea: 'NodePort abre el mismo puerto en todos los nodos. Es el mismo comando que para ClusterIP, con el tipo y otro nombre para no chocar con el Service web que ya existe.',
    hint: 'kubectl expose deployment web --port=80 --type=NodePort --name=web-np',
    check: (c) => { const s = c.service('default', 'web-np'); return !!s && s.spec.type === 'NodePort' && s.spec.selector.app === 'web'; } },

  { id: 'diag-causa', group: 'diagnostico', title: 'Averigua por qué el pod de catalogo no arranca: lee sus eventos',
    idea: 'El estado de get dice qué pasa; el porqué está en los eventos, al final de la descripción del Pod.',
    hint: 'kubectl describe pod catalogo',
    check: (_c, ctx) => ctx.ran(new RegExp(K + '(describe\\s+(pods?|po)(\\s+|\\/)catalogo|describe\\s+(pods?|po)\\s+-l\\s*app=catalogo|(get\\s+)?events\\b)')) },
  { id: 'arreglar', group: 'diagnostico', title: 'Arregla el deployment catalogo: su pod está en ImagePullBackOff',
    idea: 'La imagen que pide no está en los nodos. Corrige la imagen en el Deployment (no en el Pod: el ReplicaSet lo recrearía igual). La que hay cargada es redis:7.4-alpine.',
    hint: 'kubectl set image deployment/catalogo redis=redis:7.4-alpine',
    check: (c) => { const d = c.deployment('default', 'catalogo'); if (!d) return false; const st = c.deploymentStatus(d); return st.ready >= 1 && st.ready === d.spec.replicas && !c.pods.some((p) => p.meta.namespace === 'default' && p.meta.labels.app === 'catalogo' && ['ImagePullBackOff', 'ErrImagePull'].includes(c.podStatus(p))); } },
  { id: 'diag-eventos', group: 'diagnostico', title: 'Lista los eventos del namespace ordenados por tiempo',
    idea: 'Los eventos son objetos: se listan con get y se ordenan por un campo con --sort-by.',
    hint: 'kubectl get events --sort-by=.lastTimestamp',
    check: (_c, ctx) => ctx.ran(new RegExp(K + '(get\\s+)?(events|ev)\\b.*--sort-by')) },
];
