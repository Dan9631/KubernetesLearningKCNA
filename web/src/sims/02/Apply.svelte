<script lang="ts">
  // El viaje de un kubectl apply: ocho etapas desde el cliente hasta el contenedor en marcha y el status de vuelta.
  import Stepper, { type Stage } from '../Stepper.svelte';
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { ms, wait } from '../../lib/motion';

  const stages: Stage[] = [
    { title: 'kubectl envía el manifiesto', text: 'kubectl lee el kubeconfig (URL del API server y credenciales) y hace una petición HTTPS al puerto 6443. Solo habla con el kube-apiserver; nunca con etcd ni con los nodos.', hold: 2600 },
    { title: 'El API server autentica, autoriza y admite', text: 'Tres filtros en orden: autenticación (quién eres: el certificado kind-kcna), autorización (puedes crear Deployments: RBAC) y control de admisión (políticas que pueden modificar o rechazar). Después valida el esquema.', hold: 3200 },
    { title: 'etcd guarda el Deployment', text: 'El API server es el único que escribe en etcd. Guarda el objeto con su spec y un status vacío y responde a kubectl: deployment.apps/hola created. kubectl ya terminó; el trabajo real ocurre después, de forma asíncrona.', hold: 3000 },
    { title: 'El controller-manager crea ReplicaSet y Pods', text: 'Nadie le da órdenes: observa (watch) el API server. El controlador de Deployments ve un Deployment sin ReplicaSet y lo crea; el de ReplicaSets ve 0 Pods donde el spec pide 2 y crea dos Pods sin nodeName. Nacen en Pending.', hold: 3200 },
    { title: 'El scheduler elige nodo y hace el binding', text: 'El kube-scheduler vigila Pods sin nodo. Filtra los nodos posibles (recursos, taints, selectores), puntúa los candidatos y escribe spec.nodeName mediante un Binding. No arranca nada: el Pod sigue Pending, pero ya tiene nodo.', hold: 3000 },
    { title: 'El kubelet de kcna-worker ve su Pod', text: 'Cada kubelet observa solo los Pods con su nodeName. Encuentra los dos nuevos y pasa a ContainerCreating: pide al runtime, vía CRI, el sandbox del Pod y sus contenedores.', hold: 2800 },
    { title: 'containerd arranca el contenedor', text: 'containerd crea el sandbox (el plugin CNI kindnet le da la IP), comprueba la imagen (nginx:1.27-alpine ya está en el nodo) y lanza el contenedor con runc. El proceso ya corre, aunque la API todavía no lo sabe.', hold: 3000 },
    { title: 'El status vuelve al API server', text: 'El kubelet escribe el status del Pod (Running, IP, Ready) y el API server lo guarda en etcd. Los controladores lo ven y actualizan el status del Deployment: readyReplicas 2 = spec.replicas 2. Estado real y deseado coinciden.', hold: 3000 },
  ];

  // Cajas del plano de control (coordenadas del viewBox 600 x 230)
  interface Box { x: number; y: number; w: number; h: number; label: string }
  const B: Record<string, Box> = {
    kubectl: { x: 8, y: 24, w: 104, h: 40, label: 'kubectl' },
    api: { x: 230, y: 24, w: 150, h: 40, label: 'kube-apiserver' },
    etcd: { x: 488, y: 24, w: 104, h: 40, label: 'etcd' },
    sch: { x: 92, y: 140, w: 150, h: 40, label: 'kube-scheduler' },
    cm: { x: 330, y: 140, w: 210, h: 40, label: 'kube-controller-manager' },
  };
  const c = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const P = { kubectl: c(B.kubectl), api: c(B.api), etcd: c(B.etcd), sch: c(B.sch), cm: c(B.cm), node: { x: 305, y: 222 } };
  // Componente resaltado y trayecto del mensaje en cada etapa
  const active: string[][] = [['kubectl', 'api'], ['api'], ['api', 'etcd'], ['cm', 'api'], ['sch', 'api'], ['api', 'kubelet'], ['kubelet', 'containerd'], ['kubelet', 'api', 'etcd']];
  const routes: { x: number; y: number }[][] = [
    [P.kubectl, P.api], [P.api], [P.api, P.etcd], [P.cm, P.api], [P.sch, P.api], [P.api, P.node], [P.node], [P.node, P.api, P.etcd],
  ];
  const isOn = (i: number, k: string) => active[i].includes(k);

  const nodes: NodeSpec[] = [
    { name: 'kcna-worker', role: 'worker' },
    { name: 'kcna-worker2', role: 'worker' },
  ];
  const NAMES = ['hola-6ddd88c97d-5hk6d', 'hola-6ddd88c97d-6w5hf'];
  function podsFor(i: number): PodSpec[] {
    if (i < 3) return [];
    const status = i < 5 ? 'Pending' : i === 5 ? 'ContainerCreating' : 'Running';
    return NAMES.map((name, k) => ({ id: `p${k}`, name, node: i >= 4 ? 'kcna-worker' : undefined, status, tag: '1.27', highlight: i >= 5 }));
  }
  let pods = $state<PodSpec[]>([]);
  let stageIdx = $state(0);
  let msg = $state(P.kubectl);
  let msgOn = $state(true);
  let run = 0;

  async function applyStage(i: number) {
    stageIdx = i;
    pods = podsFor(i);
    const my = ++run;
    const r = routes[i];
    msg = r[0];
    msgOn = true;
    for (let k = 1; k < r.length; k++) {
      await wait(k === 1 ? 40 : 720);
      if (my !== run) return;
      msg = r[k];
    }
  }
  $effect(() => {
    const t = setTimeout(() => { if (run === 0) msg = P.api; }, ms(400));
    return () => clearTimeout(t);
  });

  const OBJ: string[] = [
`# kubectl apply -f deployment.yaml
POST /apis/apps/v1/namespaces/lab-02/deployments
Authorization: (certificado de cliente kind-kcna)

(todavía no hay nada guardado en etcd)`,
`# kube-apiserver procesa la petición
authn      certificado del kubeconfig -> usuario kubernetes-admin   ok
authz      RBAC: create deployments en lab-02                       ok
admission  mutating (defaults) + validating (políticas)             ok
validación esquema apps/v1 Deployment                               ok

(todavía no se ha escrito en etcd)`,
`/registry/deployments/lab-02/hola
apiVersion: apps/v1
kind: Deployment
metadata: { name: hola, namespace: lab-02, generation: 1 }
spec:
  replicas: 2
  template: { containers: [ { image: nginx:1.27-alpine } ] }
status: {}                       <- nadie ha actuado aún

kubectl: deployment.apps/hola created`,
`/registry/replicasets/lab-02/hola-6ddd88c97d
spec: { replicas: 2 }            ownerReferences: Deployment/hola

/registry/pods/lab-02/hola-6ddd88c97d-5hk6d   (y ...-6w5hf)
spec:
  nodeName: ""                   <- sin nodo
  containers: [ { image: nginx:1.27-alpine } ]
status: { phase: Pending }

eventos: ScalingReplicaSet (Deployment), SuccessfulCreate (ReplicaSet)`,
`/registry/pods/lab-02/hola-6ddd88c97d-5hk6d
spec:
  nodeName: kcna-worker          <- lo escribió el scheduler (Binding)
status:
  phase: Pending
  conditions: [ PodScheduled=True ]

evento: Scheduled  Successfully assigned lab-02/hola-6ddd88c97d-5hk6d to kcna-worker`,
`/registry/pods/lab-02/hola-6ddd88c97d-5hk6d
status:
  phase: Pending
  conditions: [ PodScheduled=True, Initialized=True, Ready=False ]
  containerStatuses:
    - name: nginx
      state: { waiting: { reason: ContainerCreating } }`,
`(etcd no cambia en esta etapa: todo ocurre en el nodo)

kubelet -> containerd (CRI, gRPC):
  RunPodSandbox     -> red vía CNI (kindnet): IP 10.244.2.15
  PullImage         -> "already present on machine"
  CreateContainer   -> containerd prepara el bundle OCI
  StartContainer    -> runc crea el proceso (namespaces + cgroups)

eventos: Pulled, Created, Started (kubelet)`,
`/registry/pods/lab-02/hola-6ddd88c97d-5hk6d
status:
  phase: Running
  podIP: 10.244.2.15     hostIP: 10.89.4.2
  conditions: [ Ready=True, ContainersReady=True ]
  containerStatuses: [ { state: { running: {} }, ready: true } ]

/registry/deployments/lab-02/hola
status: { replicas: 2, readyReplicas: 2, availableReplicas: 2, observedGeneration: 1 }`,
  ];
</script>

<Stepper {stages} onchange={applyStage}>
  {#snippet scene(i)}
    <div class="scene">
      <svg viewBox="0 0 600 236" class="map" role="img" aria-label="Mapa del plano de control">
        <defs>
          <marker id="apply-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        <rect x="124" y="6" width="472" height="192" rx="10" class="cp" />
        <text x="132" y="20" class="cplabel">control plane · kcna-control-plane</text>
        <!-- flechas -->
        <line x1={B.kubectl.x + B.kubectl.w} y1={P.kubectl.y} x2={B.api.x} y2={P.api.y} class="edge" class:on={i === 0} marker-end="url(#apply-arrow)" />
        <line x1={B.api.x + B.api.w} y1={P.api.y} x2={B.etcd.x} y2={P.etcd.y} class="edge" class:on={i === 2 || i === 7} marker-end="url(#apply-arrow)" />
        <line x1={P.sch.x} y1={B.sch.y} x2={P.api.x - 30} y2={B.api.y + B.api.h} class="edge" class:on={i === 4} marker-end="url(#apply-arrow)" />
        <line x1={P.cm.x} y1={B.cm.y} x2={P.api.x + 30} y2={B.api.y + B.api.h} class="edge" class:on={i === 3} marker-end="url(#apply-arrow)" />
        <line x1={P.api.x} y1={B.api.y + B.api.h} x2={P.node.x} y2={P.node.y - 6} class="edge" class:on={i === 5 || i === 7} marker-end="url(#apply-arrow)" />
        <text x={P.api.x + 8} y="118" class="elabel">watch</text>
        <text x={P.sch.x + 20} y="118" class="elabel">watch</text>
        <text x={P.cm.x - 60} y="118" class="elabel">watch</text>
        <text x={P.api.x + 8} y="212" class="elabel">watch del kubelet · status</text>
        <!-- cajas -->
        {#each Object.entries(B) as [k, b] (k)}
          <g class="box" class:on={isOn(i, k)}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="7" />
            <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 4}>{b.label}</text>
          </g>
        {/each}
        <!-- mensaje -->
        {#if msgOn}
          <g class="msg" style={`transform: translate(${msg.x}px, ${msg.y}px); transition-duration: ${ms(700)}ms`}>
            <circle r="8" />
          </g>
        {/if}
      </svg>

      <ClusterCanvas {nodes} {pods} compact showLabels={false} pendingTitle="Sin nodo (Pending): esperan al scheduler">
        {#snippet nodeFooter(n: NodeSpec)}
          <span class="d" class:on={n.name === 'kcna-worker' && isOn(i, 'kubelet')}>kubelet</span>
          <span class="d" class:on={n.name === 'kcna-worker' && isOn(i, 'containerd')}>containerd</span>
          <span class="d">kube-proxy</span>
        {/snippet}
      </ClusterCanvas>

      <div class="obj">
        <div class="objtitle">{i === 6 ? 'En el nodo (CRI)' : i < 2 ? 'Petición en curso' : 'Lo que hay en etcd (a través del API server)'}</div>
        <pre aria-live="polite">{OBJ[i]}</pre>
      </div>
    </div>
  {/snippet}
</Stepper>

<div class="explain {stageIdx === 7 ? 'ok' : ''}">
  {#if stageIdx <= 2}
    Regla de oro: todos los componentes hablan con el kube-apiserver y solo él habla con etcd (modelo hub and spoke). Ni kubectl ni los controladores ni el kubelet tocan etcd.
  {:else if stageIdx <= 4}
    Los controladores no reciben órdenes: cada uno observa el API server y hace una sola cosa. El de Deployments crea ReplicaSets, el de ReplicaSets crea Pods, el scheduler escribe nodeName. Ninguno arranca contenedores.
  {:else if stageIdx <= 6}
    El kubelet es un servicio de systemd del nodo (no un Pod) y es el único que habla con el runtime, por CRI. containerd descarga imágenes y llama a runc, que crea el proceso aislado del módulo 01.
  {:else}
    spec (deseado, lo escribes tú) y status (real, lo escriben kubelet y controladores) coinciden: el bucle de reconciliación ha convergido. Si ahora borras un Pod, el ReplicaSet verá 1 donde quiere 2 y repetirá las etapas 4 a 8.
  {/if}
</div>

<style>
  .scene { display: grid; gap: 12px; }
  .map { width: 100%; height: auto; display: block; color: var(--ink-3); }
  .cp { fill: none; stroke: var(--line); stroke-dasharray: 5 4; }
  .cplabel { font: 500 10px var(--mono); fill: var(--ink-3); }
  .edge { stroke: var(--line); stroke-width: 1.5; transition: stroke var(--dur); color: var(--line); }
  .edge.on { stroke: var(--helm); color: var(--helm); stroke-width: 2.2; }
  .elabel { font: 9px var(--mono); fill: var(--ink-3); }
  .box rect { fill: var(--panel); stroke: var(--line); stroke-width: 1.4; transition: fill var(--dur), stroke var(--dur); }
  .box text { font: 500 12px var(--mono); fill: var(--ink); text-anchor: middle; }
  .box.on rect { fill: var(--helm-2); stroke: var(--helm); stroke-width: 2.2; }
  .box.on text { fill: var(--helm-ink); }
  .msg { transition-property: transform; transition-timing-function: var(--ease); }
  .msg circle { fill: var(--wait); stroke: var(--panel); stroke-width: 2; }
  .d { display: inline-block; margin-right: 6px; padding: 0 5px; border-radius: 4px; border: 1px solid var(--line-2); font-family: var(--mono); font-size: 0.68rem; transition: all var(--dur); }
  .d.on { border-color: var(--helm); background: var(--helm-2); color: var(--helm-ink); font-weight: 600; }
  .objtitle { font-size: 0.76rem; color: var(--ink-3); margin-bottom: 4px; }
  .obj pre { min-height: 150px; font-size: 0.78rem; }
</style>
