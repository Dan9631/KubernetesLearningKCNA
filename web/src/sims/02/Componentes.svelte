<script lang="ts">
  // Explora el control plane: qué hace cada componente, con quién habla y qué pasa si se apaga.
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { wait } from '../../lib/motion';
  import { fade } from 'svelte/transition';

  interface Comp { id: string; where: 'cp' | 'node'; how: string; does: string; talks: string; down: string; cmd: string; kill: boolean }
  const COMPS: Comp[] = [
    { id: 'kube-apiserver', where: 'cp', how: 'static pod', does: 'Puerta de entrada de la API REST (puerto 6443). Autentica, autoriza (RBAC), ejecuta los controladores de admisión, valida y guarda en etcd. Escala horizontalmente.', talks: 'Con todos: kubectl, scheduler, controller-manager, kubelets y kube-proxy le hablan a él. Es el único que lee y escribe en etcd.', down: 'kubectl falla (connection refused) y ningún componente puede leer ni escribir el estado: no se crea, escala ni borra nada. Los Pods que ya corren siguen corriendo, porque cada kubelet los mantiene con lo que ya sabía.', cmd: 'kubectl get pods -n kube-system -l component=kube-apiserver\npodman exec kcna-control-plane ls /etc/kubernetes/manifests\nkubectl get --raw /readyz?verbose', kill: true },
    { id: 'etcd', where: 'cp', how: 'static pod', does: 'Base de datos clave-valor distribuida y consistente (algoritmo Raft) que guarda todo el estado del clúster bajo claves como /registry/pods/lab-02/hola-xxx. Se despliega en número impar y hay que hacerle backups.', talks: 'Solo con el kube-apiserver (puerto 2379). Nadie más conoce su dirección.', down: 'El API server pierde su almacén: /readyz falla ([-]etcd failed) y toda petición que lea o escriba estado devuelve error. Los contenedores siguen corriendo, pero si pierdes etcd sin backup pierdes la definición de todo el clúster.', cmd: 'kubectl get --raw /readyz?verbose | Select-String etcd\npodman exec kcna-control-plane grep -e image: -e data-dir /etc/kubernetes/manifests/etcd.yaml', kill: true },
    { id: 'kube-scheduler', where: 'cp', how: 'static pod', does: 'Decide en qué nodo va cada Pod nuevo sin nodo asignado: filtra los nodos posibles y puntúa los candidatos. Solo escribe spec.nodeName (Binding). No arranca el Pod.', talks: 'Observa Pods sin nodeName en el API server y le escribe el Binding. Nunca habla con los kubelets.', down: 'Los Pods nuevos quedan Pending sin nodo (NODE <none>) y sin evento Scheduled. Los Pods que ya corren siguen: el scheduler ya no interviene una vez asignado el nodo.', cmd: 'kubectl get pods -n kube-system -l component=kube-scheduler\nkubectl get events -n lab-02 --sort-by=.lastTimestamp | Select-String Scheduled', kill: true },
    { id: 'kube-controller-manager', where: 'cp', how: 'static pod', does: 'Un solo binario con muchos bucles de control: controladores de Deployment, ReplicaSet, Node, Job, EndpointSlice, Namespace, ServiceAccount... Cada uno compara spec con status y actúa.', talks: 'Solo con el API server (watch y escrituras). No habla con nodos ni con etcd.', down: 'Se para la reconciliación: si borras un Pod de un Deployment nadie lo repone, un nodo caído no se marca NotReady, los Jobs no avanzan y los namespaces no se borran. Lo que ya corre sigue igual.', cmd: 'kubectl get pods -n kube-system -l component=kube-controller-manager\nkubectl get deploy hola -n lab-02 -o jsonpath=\'{.spec.replicas} {.status.readyReplicas}\'', kill: true },
    { id: 'cloud-controller-manager', where: 'cp', how: 'solo en nubes', does: 'Integra con el proveedor de nube: crea balanceadores para Services LoadBalancer, detecta nodos borrados en la nube, configura rutas.', talks: 'Con el API server y con la API del proveedor (AWS, Azure, GCP).', down: 'En kind no existe, así que no hay nada que apagar. En una nube, los Services LoadBalancer nuevos se quedarían sin IP externa (pending) y los nodos borrados en la consola no desaparecerían del clúster.', cmd: 'kubectl get pods -n kube-system | Select-String cloud\n(no devuelve nada en kind)', kill: false },
    { id: 'kubelet', where: 'node', how: 'servicio systemd', does: 'Agente del nodo: registra el nodo, observa los Pods con su nodeName, pide al runtime que los arranque (CRI), ejecuta las probes e informa del status. También ejecuta los static pods de /etc/kubernetes/manifests.', talks: 'Con el API server (watch de sus Pods, heartbeats mediante un Lease cada 10 s, status) y con containerd por CRI (gRPC).', down: 'Deja de renovar su Lease: a los ~40 s el node controller marca el nodo NotReady y le pone el taint not-ready:NoExecute. Pasados 300 s (tolerationSeconds por defecto) sus Pods se marcan para borrar y el ReplicaSet crea sustitutos en otro nodo. Los contenedores viejos siguen corriendo en el nodo, pero nadie los gestiona.', cmd: 'podman exec kcna-worker systemctl is-active kubelet\nkubectl get nodes\nkubectl get lease -n kube-node-lease', kill: true },
    { id: 'kube-proxy', where: 'node', how: 'DaemonSet', does: 'Implementa los Services: programa reglas (iptables, IPVS o nftables) para que la IP virtual de un Service reparta tráfico entre sus Pods.', talks: 'Observa Services y EndpointSlices en el API server y escribe reglas en el kernel del nodo. No habla con el kubelet.', down: 'Las reglas ya programadas siguen en el kernel, así que el tráfico a Services existentes funciona. Pero si cambian los endpoints (un Pod nuevo o borrado), ese nodo no se entera y puede enviar tráfico a IPs que ya no existen. Los Pods no se ven afectados.', cmd: 'kubectl get ds kube-proxy -n kube-system\nkubectl get pods -n kube-system -l k8s-app=kube-proxy -o wide', kill: true },
    { id: 'containerd', where: 'node', how: 'servicio systemd', does: 'Runtime de alto nivel: descarga y guarda imágenes, prepara el filesystem (overlayfs) y llama a runc para crear cada contenedor. Implementa CRI para el kubelet.', talks: 'Recibe llamadas CRI del kubelet y ejecuta runc. crictl permite hablarle directamente para depurar.', down: 'El kubelet pierde el runtime: no puede crear, parar ni inspeccionar contenedores y reporta "container runtime is down"; el nodo pasa a NotReady. Los contenedores que ya corren siguen vivos (los sostiene containerd-shim), pero nadie puede gestionarlos.', cmd: 'podman exec kcna-worker systemctl is-active containerd\npodman exec kcna-worker crictl ps\nkubectl get nodes -o wide', kill: true },
  ];

  const CP = 'kcna-control-plane';
  const baseNodes = (): NodeSpec[] => [
    { name: CP, role: 'control-plane' },
    { name: 'kcna-worker', role: 'worker' },
    { name: 'kcna-worker2', role: 'worker' },
  ];
  const basePods = (): PodSpec[] => [
    { id: 'etcd', name: 'etcd-kcna-control-plane', node: CP, status: 'Running', tag: 'static' },
    { id: 'api', name: 'kube-apiserver-kcna-control-plane', node: CP, status: 'Running', tag: 'static' },
    { id: 'cm', name: 'kube-controller-manager-kcna-control-plane', node: CP, status: 'Running', tag: 'static' },
    { id: 'sch', name: 'kube-scheduler-kcna-control-plane', node: CP, status: 'Running', tag: 'static' },
    { id: 'h1', name: 'hola-6ddd88c97d-5hk6d', node: 'kcna-worker', status: 'Running', tag: 'hola', color: 'b' },
    { id: 'h2', name: 'hola-6ddd88c97d-6w5hf', node: 'kcna-worker2', status: 'Running', tag: 'hola', color: 'b' },
  ];
  const baseDaemons = () => ({ kubelet: true, containerd: true, proxy: true });

  let nodes = $state<NodeSpec[]>(baseNodes());
  let pods = $state<PodSpec[]>(basePods());
  let daemons = $state(baseDaemons()); // estado de los servicios de kcna-worker
  let sel = $state<string>('kube-apiserver');
  let killed = $state<string>('');
  let busy = $state(false);
  let log = $state<string[]>([]);
  let term = $state('');

  const comp = $derived(COMPS.find((c) => c.id === sel)!);
  const podId: Record<string, string> = { 'kube-apiserver': 'api', etcd: 'etcd', 'kube-scheduler': 'sch', 'kube-controller-manager': 'cm' };
  const say = (s: string) => (log = [...log, s]);
  const setNode = (name: string, status: NodeSpec['status']) => (nodes = nodes.map((n) => (n.name === name ? { ...n, status } : n)));
  const setPod = (id: string, patch: Partial<PodSpec>) => (pods = pods.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function shutdown() {
    if (busy || killed || !comp.kill) return;
    busy = true; killed = comp.id; log = []; term = '';
    const id = comp.id;
    if (podId[id]) {
      setPod(podId[id], { status: 'Failed' });
      say(`t+0s   el static pod ${id} se para (p. ej. mueves su manifiesto fuera de /etc/kubernetes/manifests)`);
      await wait(900);
    }
    switch (id) {
      case 'kube-apiserver':
        term = '$ kubectl get pods -n lab-02\nThe connection to the server 127.0.0.1:63817 was refused - did you specify the right host or port?';
        say('t+1s   kubectl, scheduler, controller-manager y kubelets reciben connection refused: el hub está caído');
        await wait(1000);
        say('t+1m   los Pods hola siguen Running: cada kubelet los mantiene con lo que ya sabía, pero no se puede crear, escalar ni borrar nada');
        break;
      case 'etcd':
        term = '$ kubectl get --raw /readyz?verbose\n[-]etcd failed: reason withheld\n[-]etcd-readiness failed: reason withheld\n$ kubectl get pods -n lab-02\nError from server: etcdserver: request timed out';
        say('t+1s   el API server sigue vivo (/livez ok) pero no está listo (/readyz falla): no puede leer ni escribir estado');
        await wait(1000);
        say('t+1m   los contenedores siguen corriendo; sin backup de /var/lib/etcd el clúster no sabría qué debe existir');
        break;
      case 'kube-scheduler':
        say('t+5s   kubectl scale deploy hola --replicas=3: el controlador de ReplicaSet crea un Pod nuevo sin nodeName');
        pods = [...pods, { id: 'h3', name: 'hola-6ddd88c97d-zq9p1', status: 'Pending', tag: 'hola', color: 'b' }];
        await wait(1000);
        term = '$ kubectl get pods -n lab-02 -o wide\nNAME                    READY   STATUS    NODE\nhola-6ddd88c97d-5hk6d   1/1     Running   kcna-worker\nhola-6ddd88c97d-6w5hf   1/1     Running   kcna-worker2\nhola-6ddd88c97d-zq9p1   0/1     Pending   <none>';
        say('t+1m   el Pod nuevo sigue Pending: nadie escribe spec.nodeName ni emite el evento Scheduled. Los dos que ya corren no se enteran');
        break;
      case 'kube-controller-manager':
        say('t+5s   kubectl delete pod hola-6ddd88c97d-5hk6d');
        setPod('h1', { status: 'Terminating' });
        await wait(800);
        pods = pods.filter((p) => p.id !== 'h1');
        await wait(900);
        term = '$ kubectl get deploy hola -n lab-02\nNAME   READY   UP-TO-DATE   AVAILABLE\nhola   1/2     2            1';
        say('t+1m   nadie repone el Pod: el controlador de ReplicaSet vive dentro del controller-manager. spec.replicas 2, readyReplicas 1, y así se queda');
        break;
      case 'kubelet':
        daemons.kubelet = false;
        say('t+0s   systemctl stop kubelet en kcna-worker: deja de renovar su Lease en kube-node-lease (heartbeat cada 10 s)');
        await wait(1100);
        setNode('kcna-worker', 'NotReady');
        term = '$ kubectl get nodes\nNAME                 STATUS     ROLES           VERSION\nkcna-control-plane   Ready      control-plane   v1.37.0\nkcna-worker          NotReady   <none>          v1.37.0\nkcna-worker2         Ready      <none>          v1.37.0';
        say('t+40s  el node controller (dentro del kube-controller-manager) marca el nodo NotReady y le pone el taint node.kubernetes.io/not-ready:NoExecute');
        await wait(1300);
        setPod('h1', { status: 'Terminating' });
        say('t+5m   vence tolerationSeconds=300: los Pods del nodo se marcan para borrar (Terminating). Su contenedor sigue corriendo de verdad en kcna-worker, pero sin gestor');
        await wait(1000);
        pods = [...pods.filter((p) => p.id !== 'h1'), { id: 'h4', name: 'hola-6ddd88c97d-pbgzp', node: 'kcna-worker2', status: 'ContainerCreating', tag: 'hola', color: 'b' }];
        await wait(900);
        setPod('h4', { status: 'Running' });
        say('t+5m   el ReplicaSet ve 1 réplica donde quiere 2 y crea hola-6ddd88c97d-pbgzp; el scheduler solo puede elegir kcna-worker2. Es el self-healing en acción');
        break;
      case 'kube-proxy':
        daemons.proxy = false;
        say('t+0s   el Pod kube-proxy-mg8bd del DaemonSet muere en kcna-worker (y el DaemonSet intentaría recrearlo)');
        await wait(1000);
        term = '$ kubectl get ds kube-proxy -n kube-system\nNAME         DESIRED   CURRENT   READY\nkube-proxy   3         3         2';
        say('t+1s   las reglas iptables ya programadas siguen en el kernel: el tráfico a Services existentes desde kcna-worker funciona');
        await wait(1000);
        say('t+1m   si un Service cambia de endpoints, kcna-worker no actualiza sus reglas y puede enviar tráfico a IPs de Pods que ya no existen. Los Pods hola no se ven afectados');
        break;
      case 'containerd':
        daemons.containerd = false;
        say('t+0s   systemctl stop containerd en kcna-worker: el kubelet pierde el socket CRI');
        await wait(1000);
        say('t+10s  los contenedores siguen vivos (los sostiene containerd-shim), pero el kubelet no puede crear, parar ni inspeccionar nada: crictl ps falla');
        await wait(1100);
        setNode('kcna-worker', 'NotReady');
        term = '$ kubectl describe node kcna-worker | Select-String -Pattern Ready\n  Ready   False   KubeletNotReady   container runtime is down';
        say('t+40s  el kubelet reporta runtime not ready y el nodo pasa a NotReady: a partir de aquí ocurre lo mismo que al apagar el kubelet (eviction a los 5 min)');
        break;
    }
    busy = false;
  }
  function restore() {
    nodes = baseNodes(); pods = basePods(); daemons = baseDaemons(); killed = ''; log = []; term = '';
  }
  function choose(id: string) { sel = id; }
</script>

<div class="boxes">
  <div class="group">
    <div class="gtitle mono">control plane · kcna-control-plane</div>
    <div class="row">
      {#each COMPS.filter((c) => c.where === 'cp') as c (c.id)}
        <button type="button" class="box mono" class:on={sel === c.id} class:down={killed === c.id} class:ghost={!c.kill} onclick={() => choose(c.id)} aria-pressed={sel === c.id}>{c.id}{#if killed === c.id}<span class="st">apagado</span>{/if}</button>
      {/each}
    </div>
  </div>
  <div class="group">
    <div class="gtitle mono">nodo · kcna-worker</div>
    <div class="row">
      {#each COMPS.filter((c) => c.where === 'node') as c (c.id)}
        <button type="button" class="box mono" class:on={sel === c.id} class:down={killed === c.id} onclick={() => choose(c.id)} aria-pressed={sel === c.id}>{c.id}{#if killed === c.id}<span class="st">apagado</span>{/if}</button>
      {/each}
    </div>
  </div>
</div>

<div class="panel" aria-live="polite">
  <div class="phead">
    <strong class="mono">{comp.id}</strong>
    <span class="chip">{comp.how}</span>
    <span class="chip">{comp.where === 'cp' ? 'control plane' : 'cada nodo'}</span>
    <div class="actions">
      <button type="button" class="btn small" onclick={shutdown} disabled={busy || !!killed || !comp.kill}>Apagar este componente</button>
      {#if killed}<button type="button" class="btn small primary" onclick={restore} disabled={busy}>Restaurar</button>{/if}
    </div>
  </div>
  <dl>
    <dt>Qué hace</dt><dd>{comp.does}</dd>
    <dt>Con quién habla</dt><dd>{comp.talks}</dd>
    <dt>Si se cae</dt><dd>{comp.down}</dd>
    <dt>Verlo en el lab</dt><dd><pre>{comp.cmd}</pre></dd>
  </dl>
</div>

<ClusterCanvas {nodes} {pods} compact showLabels={false} pendingTitle="Sin nodo (Pending)">
  {#snippet nodeFooter(n: NodeSpec)}
    {@const w = n.name === 'kcna-worker'}
    <span class="d" class:off={w && !daemons.kubelet} class:on={sel === 'kubelet' && w}>kubelet</span>
    <span class="d" class:off={w && !daemons.containerd} class:on={sel === 'containerd' && w}>containerd</span>
    <span class="d" class:off={w && !daemons.proxy} class:on={sel === 'kube-proxy' && w}>kube-proxy</span>
  {/snippet}
</ClusterCanvas>

{#if log.length || term}
  <div class="out" transition:fade>
    {#if term}<pre>{term}</pre>{/if}
    <ol class="log" aria-live="polite">
      {#each log as l, k (k)}<li in:fade>{l}</li>{/each}
    </ol>
  </div>
{/if}

<div class="explain {killed ? (busy ? 'warn' : 'fail') : ''}">
  {#if !killed}
    Pulsa un componente para ver su papel y el comando con el que lo verás en tu clúster. Con "Apagar este componente" simulas su caída y observas qué sigue funcionando: casi siempre, los contenedores que ya corren.
  {:else if busy}
    Simulando la caída de {killed}: el tiempo está comprimido (t+40s y t+5m son los plazos reales del node controller y de tolerationSeconds).
  {:else}
    {comp.id === killed ? comp.down : COMPS.find((c) => c.id === killed)?.down} Pulsa Restaurar para volver al estado sano.
  {/if}
</div>

<style>
  .boxes { display: grid; gap: 10px; margin-bottom: 12px; }
  .gtitle { font-size: 0.72rem; color: var(--ink-3); margin-bottom: 4px; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; }
  .box { font-size: 0.8rem; padding: 6px 10px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); cursor: pointer; display: inline-flex; gap: 6px; align-items: center; transition: border-color var(--dur), background var(--dur); }
  .box:hover { border-color: var(--helm); }
  .box.on { border-color: var(--helm); background: var(--helm-2); color: var(--helm-ink); font-weight: 600; }
  .box.down { border-color: var(--fail); background: var(--fail-2); text-decoration: line-through; }
  .box.ghost { border-style: dashed; color: var(--ink-3); }
  .st { font: 600 0.66rem var(--sans); color: var(--fail); text-decoration: none; }
  .panel { border: 1px solid var(--line); border-radius: var(--r-m); padding: 12px 14px; margin-bottom: 12px; background: var(--panel-2); }
  .phead { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
  .phead strong { font-size: 0.95rem; }
  .actions { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
  dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 6px 12px; font-size: 0.9rem; }
  dt { color: var(--ink-3); font-size: 0.8rem; font-weight: 500; }
  dd { margin: 0; color: var(--ink); }
  dd pre { font-size: 0.76rem; }
  @media (max-width: 480px) { dl { grid-template-columns: 1fr; gap: 2px; } dt { margin-top: 6px; } }
  .d { display: inline-block; margin-right: 6px; padding: 0 5px; border-radius: 4px; border: 1px solid var(--line-2); font-family: var(--mono); font-size: 0.68rem; transition: all var(--dur); }
  .d.on { border-color: var(--helm); color: var(--helm-ink); background: var(--helm-2); }
  .d.off { border-color: var(--fail); color: var(--fail); text-decoration: line-through; }
  .out { margin-top: 12px; display: grid; gap: 8px; }
  .log { margin: 0; padding: 0 0 0 1.2em; font: 0.8rem var(--mono); color: var(--ink-2); display: grid; gap: 3px; }
</style>
