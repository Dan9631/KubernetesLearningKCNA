<script lang="ts">
  // Juego: diagnostica los 6 workloads rotos del lab 09 con una consola de comandos simulada.
  // Todo vive en memoria; reiniciar vuelve a romper el namespace.
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { wait } from '../../lib/motion';
  import { progress, addReto } from '../../lib/progress.svelte';

  type CaseKey = 'frontend' | 'api' | 'cache' | 'worker' | 'reporter' | 'shop';
  type Cmd = 'get' | 'describe' | 'events' | 'logs' | 'prev' | 'exec' | 'svc' | 'cm' | 'top';
  interface SimPod extends PodSpec { caseKey: CaseKey; real: string; ready: string; ip: string; age: string }
  interface Option { text: string; ok: boolean; why: string }
  interface Ev { age: number; type: string; reason: string; obj: string; msg: string }
  interface Case {
    key: CaseKey; n: number; file: string; symptom: string;
    causes: Option[]; fixes: Option[];
    hints: [string, string];
    chain: string;
    events: Ev[];
    describe: (pod: SimPod) => string;
    logs: (pod: SimPod) => string;
    prev: (pod: SimPod) => string;
    exec: (pod: SimPod) => string;
    top: (pod: SimPod) => string;
    okLog: string;
    okEnv: string;
    fixed: Omit<SimPod, 'caseKey'>[];
  }

  const nodes: NodeSpec[] = [
    { name: 'kcna-control-plane', role: 'control-plane', taints: ['node-role.kubernetes.io/control-plane:NoSchedule'] },
    { name: 'kcna-worker', role: 'worker', labels: { disktype: 'ssd', zone: 'zona-a' } },
    { name: 'kcna-worker2', role: 'worker', labels: { disktype: 'hdd', zone: 'zona-b' } },
  ];

  const INITIAL: SimPod[] = [
    { id: 'fe1', caseKey: 'frontend', name: 'frontend-56dbbc8bcc-hmzm9', node: 'kcna-worker2', status: 'ImagePullBackOff', real: 'ImagePullBackOff', ready: '0/1', restarts: 0, ip: '10.244.1.5', age: '72s' },
    { id: 'fe2', caseKey: 'frontend', name: 'frontend-56dbbc8bcc-hrx7n', node: 'kcna-worker', status: 'ImagePullBackOff', real: 'ErrImagePull', ready: '0/1', restarts: 0, ip: '10.244.2.8', age: '72s' },
    { id: 'api1', caseKey: 'api', name: 'api-5d6c56d657-8tzbk', node: 'kcna-worker', status: 'CrashLoopBackOff', real: 'CrashLoopBackOff', ready: '0/1', restarts: 3, ip: '10.244.2.9', age: '71s' },
    { id: 'cache1', caseKey: 'cache', name: 'cache-854b994f8f-fw58h', status: 'Pending', real: 'Pending', ready: '0/1', restarts: 0, ip: '<none>', age: '70s' },
    { id: 'wk1', caseKey: 'worker', name: 'worker-69c876967-wbrlh', node: 'kcna-worker', status: 'OOMKilled', real: 'OOMKilled', ready: '0/1', restarts: 2, ip: '10.244.2.10', age: '69s' },
    { id: 'rep1', caseKey: 'reporter', name: 'reporter-54b6b5cfc8-scldj', node: 'kcna-worker', status: 'ContainerCreating', tag: 'ConfigError', real: 'CreateContainerConfigError', ready: '0/1', restarts: 0, ip: '10.244.2.11', age: '68s' },
    { id: 'shop1', caseKey: 'shop', name: 'shop-5dc894c86f-dfrxn', node: 'kcna-worker', status: 'Running', real: 'Running', ready: '1/1', restarts: 3, ip: '10.244.2.12', age: '67s' },
    { id: 'shop2', caseKey: 'shop', name: 'shop-5dc894c86f-vzqkl', node: 'kcna-worker2', status: 'CrashLoopBackOff', real: 'CrashLoopBackOff', ready: '0/1', restarts: 3, ip: '10.244.1.6', age: '67s' },
  ];

  const notRunning = (c: string) => (p: SimPod) => `error: unable to upgrade connection: container not found ("${c}")`;
  const noMetrics = (p: SimPod) => `Error from server (NotFound): podmetrics.metrics.k8s.io "lab-09/${p.name}" not found`;
  const head = (p: SimPod, extra = '') => `Name:             ${p.name}
Namespace:        lab-09
Node:             ${p.node ? `${p.node}/172.18.0.${p.node === 'kcna-worker' ? 2 : 3}` : '<none>'}
Labels:           app=${p.caseKey}${p.caseKey === 'shop' ? '\n                  tier=web' : ''}
                  pod-template-hash=${p.name.split('-')[1]}
Status:           ${p.real === 'Running' || p.real === 'CrashLoopBackOff' || p.real === 'OOMKilled' ? 'Running' : 'Pending'}
IP:               ${p.ip === '<none>' ? '' : p.ip}
Controlled By:    ReplicaSet/${p.name.split('-').slice(0, 2).join('-')}${extra}`;

  const CASES: Case[] = [
    {
      key: 'frontend', n: 1, file: '01-frontend.yaml', symptom: 'no arranca: no consigue la imagen',
      causes: [
        { text: 'El nodo no tiene red hacia el registro de imágenes', ok: false, why: 'Sería un timeout o un error de proxy en el evento Failed. Aquí el mensaje termina en "not found": el registro respondió, pero esa referencia no existe.' },
        { text: 'El tag de la imagen no existe: nginx:1.27-alpinee (sobra una "e")', ok: true, why: '' },
        { text: 'Falta imagePullSecrets para un registro privado', ok: false, why: 'Un registro privado respondería "unauthorized" o "pull access denied". nginx está en Docker Hub, público.' },
        { text: 'El pod no cabe en ningún nodo', ok: false, why: 'El evento Scheduled dice que sí tiene nodo (kcna-worker2). Lo que falla ocurre después: el kubelet no puede bajar la imagen.' },
      ],
      fixes: [
        { text: 'Crear un Secret docker-registry y añadirlo como imagePullSecrets', ok: false, why: 'No resuelve nada: el tag seguiría sin existir en el registro.' },
        { text: 'kubectl rollout restart deployment/frontend -n lab-09', ok: false, why: 'Reiniciar crea pods nuevos con el mismo template roto: volverán a ImagePullBackOff.' },
        { text: 'kubectl set image deployment/frontend nginx=nginx:1.27-alpine -n lab-09 (y corregir el YAML)', ok: true, why: '' },
        { text: 'Cambiar imagePullPolicy a Always', ok: false, why: 'La política solo decide cuándo intentar descargar; el tag inexistente fallará igual.' },
      ],
      hints: ['Mira la sección Events de describe pod: ¿qué dice exactamente el mensaje del evento Warning Failed?', 'Compara letra a letra la imagen del evento ("nginx:1.27-alpinee") con la que precarga el lab ("nginx:1.27-alpine").'],
      chain: 'get mostró ImagePullBackOff con nodo e IP asignados: el scheduler ya hizo su trabajo. describe confirmó State Waiting, Reason ImagePullBackOff, y en Events el kubelet dijo "nginx:1.27-alpinee: not found" seguido de BackOff. logs no existe porque el contenedor nunca arrancó. Arreglo: set image con el tag correcto; el Deployment creó un ReplicaSet nuevo (hash distinto) y los pods pasaron a Running.',
      events: [
        { age: 30, type: 'Normal', reason: 'Pulling', obj: 'pod/frontend-56dbbc8bcc-hmzm9', msg: 'Pulling image "nginx:1.27-alpinee"' },
        { age: 29, type: 'Warning', reason: 'Failed', obj: 'pod/frontend-56dbbc8bcc-hmzm9', msg: 'Failed to pull image "nginx:1.27-alpinee": docker.io/library/nginx:1.27-alpinee: not found' },
        { age: 2, type: 'Warning', reason: 'Failed', obj: 'pod/frontend-56dbbc8bcc-hmzm9', msg: 'Error: ImagePullBackOff' },
        { age: 1, type: 'Normal', reason: 'BackOff', obj: 'pod/frontend-56dbbc8bcc-hrx7n', msg: 'Back-off pulling image "nginx:1.27-alpinee"' },
      ],
      describe: (p) => `${head(p)}
Containers:
  nginx:
    Image:          nginx:1.27-alpinee
    Port:           80/TCP
    State:          Waiting
      Reason:       ${p.real}
    Ready:          False
    Restart Count:  0
    Limits:
      memory:  64Mi
    Requests:
      cpu:     10m
      memory:  16Mi
Conditions:
  Type              Status
  PodScheduled      True
  Initialized       True
  Ready             False
  ContainersReady   False
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  72s                default-scheduler  Successfully assigned lab-09/${p.name} to ${p.node}
  Normal   Pulling    30s (x3 over 71s)  kubelet            Pulling image "nginx:1.27-alpinee"
  Warning  Failed     29s (x3 over 70s)  kubelet            Failed to pull image "nginx:1.27-alpinee": failed to pull and unpack image "docker.io/library/nginx:1.27-alpinee": failed to resolve reference "docker.io/library/nginx:1.27-alpinee": docker.io/library/nginx:1.27-alpinee: not found
  Warning  Failed     29s (x3 over 70s)  kubelet            Error: ErrImagePull
  Normal   BackOff    2s (x5 over 69s)   kubelet            Back-off pulling image "nginx:1.27-alpinee"
  Warning  Failed     2s (x5 over 69s)   kubelet            Error: ImagePullBackOff`,
      logs: (p) => `Error from server (BadRequest): container "nginx" in pod "${p.name}" is waiting to start: trying and failing to pull image`,
      prev: (p) => `Error from server (BadRequest): previous terminated container "nginx" in pod "${p.name}" not found`,
      exec: notRunning('nginx'),
      top: noMetrics,
      okLog: '2026/10/23 15:43:46 [notice] 1#1: nginx/1.27.5\n2026/10/23 15:43:46 [notice] 1#1: start worker process 36',
      okEnv: 'NGINX_VERSION=1.27.5',
      fixed: [
        { id: 'fe3', name: 'frontend-7bb584f994-47mg7', node: 'kcna-worker2', status: 'Running', real: 'Running', ready: '1/1', restarts: 0, ip: '10.244.1.11', age: '19s' },
        { id: 'fe4', name: 'frontend-7bb584f994-hzrdq', node: 'kcna-worker', status: 'Running', real: 'Running', ready: '1/1', restarts: 0, ip: '10.244.2.20', age: '13s' },
      ],
    },
    {
      key: 'api', n: 2, file: '02-api.yaml', symptom: 'se cae al arrancar una y otra vez',
      causes: [
        { text: 'La imagen busybox:1.37 no existe en el registro', ok: false, why: 'Los eventos dicen "Container image already present" y "Started container": la imagen está y el proceso llegó a ejecutarse.' },
        { text: 'El límite de memoria es demasiado bajo y el kernel lo mata (OOMKilled)', ok: false, why: 'Un OOM termina con Reason OOMKilled y Exit Code 137. Aquí el Last State dice Reason Error, Exit Code 1: la aplicación decidió salir.' },
        { text: 'La livenessProbe mata el contenedor', ok: false, why: 'api no define ninguna sonda (no hay Liveness en describe ni eventos Unhealthy). El proceso termina solo.' },
        { text: 'Falta la variable de entorno DB_HOST y el proceso sale con código 1', ok: true, why: '' },
      ],
      fixes: [
        { text: 'kubectl set resources deployment/api --limits=memory=128Mi -n lab-09', ok: false, why: 'La memoria no es el problema (exit code 1, no 137). Seguiría abortando por la variable.' },
        { text: 'kubectl set env deployment/api DB_HOST=postgres.lab-09.svc.cluster.local -n lab-09', ok: true, why: '' },
        { text: 'Quitar la livenessProbe del Deployment', ok: false, why: 'No tiene ninguna: nada que quitar. La causa está en los logs, no en las sondas.' },
        { text: 'kubectl delete pod api-5d6c56d657-8tzbk -n lab-09 para que el ReplicaSet lo recree', ok: false, why: 'El ReplicaSet crea otro pod con el mismo template, sin DB_HOST: vuelve a caerse. Borrar pods no arregla configuraciones.' },
      ],
      hints: ['El contenedor sí arranca (hay eventos Started). Cuando algo falla después de arrancar, la respuesta está en los logs: prueba logs --previous.', 'Los logs dicen literalmente qué variable falta. Compara con "Environment: <none>" en describe.'],
      chain: 'get mostró CrashLoopBackOff con 3 reinicios. describe dio la pista doble: Last State Terminated, Reason Error, Exit Code 1 (la app salió por decisión propia, no la mataron) y Environment: <none>. events solo mostró BackOff restarting failed container: el kubelet reintenta con espera creciente. logs --previous reveló el motivo: "la variable DB_HOST no esta definida". Arreglo: set env añade la variable al template y el pod nuevo arranca.',
      events: [
        { age: 25, type: 'Normal', reason: 'Started', obj: 'pod/api-5d6c56d657-8tzbk', msg: 'Started container api' },
        { age: 3, type: 'Warning', reason: 'BackOff', obj: 'pod/api-5d6c56d657-8tzbk', msg: 'Back-off restarting failed container api in pod api-5d6c56d657-8tzbk_lab-09' },
      ],
      describe: (p) => `${head(p)}
Containers:
  api:
    Image:          busybox:1.37
    Command:
      sh
      -c
      echo "[api] iniciando..."
      if [ -z "$DB_HOST" ]; then
        echo "[api] ERROR: la variable DB_HOST no esta definida. Abortando."
        exit 1
      fi
      ...
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       Error
      Exit Code:    1
      Started:      Thu, 23 Oct 2026 15:40:41 +0000
      Finished:     Thu, 23 Oct 2026 15:40:41 +0000
    Ready:          False
    Restart Count:  3
    Limits:
      memory:  32Mi
    Requests:
      cpu:     10m
      memory:  16Mi
    Environment:    <none>
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  71s                default-scheduler  Successfully assigned lab-09/${p.name} to kcna-worker
  Normal   Pulled     25s (x4 over 70s)  kubelet            Container image "busybox:1.37" already present on machine
  Normal   Created    25s (x4 over 70s)  kubelet            Created container: api
  Normal   Started    25s (x4 over 70s)  kubelet            Started container api
  Warning  BackOff    3s (x6 over 60s)   kubelet            Back-off restarting failed container api in pod ${p.name}_lab-09`,
      logs: () => '[api] iniciando...\n[api] ERROR: la variable DB_HOST no esta definida. Abortando.',
      prev: () => '[api] iniciando...\n[api] ERROR: la variable DB_HOST no esta definida. Abortando.',
      exec: notRunning('api'),
      top: noMetrics,
      okLog: '[api] iniciando...\n[api] conectado a postgres.lab-09.svc.cluster.local. Atendiendo peticiones.',
      okEnv: 'DB_HOST=postgres.lab-09.svc.cluster.local',
      fixed: [{ id: 'api2', name: 'api-6f8d9b7c4d-q2xkp', node: 'kcna-worker', status: 'Running', real: 'Running', ready: '1/1', restarts: 0, ip: '10.244.2.21', age: '12s' }],
    },
    {
      key: 'cache', n: 3, file: '03-cache.yaml', symptom: 'nunca llega a arrancar',
      causes: [
        { text: 'No hay CPU suficiente en los nodos (Insufficient cpu)', ok: false, why: 'Entonces el evento FailedScheduling diría "Insufficient cpu". Dice "didn\'t match Pod\'s node affinity/selector".' },
        { text: 'La imagen redis:7.4-alpine no está precargada', ok: false, why: 'La imagen ni se intenta descargar: el pod no tiene nodo (Node: <none>), así que ningún kubelet lo ha visto.' },
        { text: 'El nodeSelector pide disktype=nvme y ningún nodo tiene esa label', ok: true, why: '' },
        { text: 'El PVC no se puede enlazar a un volumen', ok: false, why: 'cache no monta ningún volumen. Un PVC sin enlazar daría un evento distinto ("unbound immediate PersistentVolumeClaims").' },
      ],
      fixes: [
        { text: 'kubectl label node kcna-worker disktype=nvme', ok: false, why: 'Técnicamente desbloquearía el pod, pero mentirías sobre el hardware y el reto prohíbe tocar nodos. Arregla el manifiesto, no el clúster.' },
        { text: 'Bajar requests.cpu a 5m', ok: false, why: 'No es un problema de recursos: los nodos tienen CPU libre pero no cumplen el selector.' },
        { text: 'Añadir una toleration al taint del control-plane', ok: false, why: 'El control-plane tampoco tiene disktype=nvme: seguiría sin coincidir. Y no se corre carga de usuario ahí.' },
        { text: 'Cambiar nodeSelector a disktype: ssd (o quitarlo) y kubectl apply -f 03-cache.yaml', ok: true, why: '' },
      ],
      hints: ['Un pod Pending sin nodo ni IP es cosa del scheduler. describe pod: lee el evento FailedScheduling completo, cuenta cuántos nodos descarta y por qué.', 'Compara Node-Selectors de describe (disktype=nvme) con las labels de los nodos del lienzo (ssd y hdd).'],
      chain: 'get mostró Pending sin IP ni nodo: nunca fue programado. describe enseñó Node-Selectors: disktype=nvme y el evento FailedScheduling: "0/3 nodes are available: 1 node(s) had untolerated taint, 2 node(s) didn\'t match Pod\'s node affinity/selector". events repitió lo mismo cada ~30 s (el scheduler reintenta). logs no aplica: sin nodo no hay contenedor. Arreglo: corregir el selector en el YAML y aplicar; el pod cayó en kcna-worker (disktype=ssd).',
      events: [
        { age: 12, type: 'Warning', reason: 'FailedScheduling', obj: 'pod/cache-854b994f8f-fw58h', msg: "0/3 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 node(s) didn't match Pod's node affinity/selector." },
      ],
      describe: (p) => `${head(p)}
Node-Selectors:   disktype=nvme
Tolerations:      node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                  node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Containers:
  redis:
    Image:        redis:7.4-alpine
    Port:         6379/TCP
    Limits:
      memory:  128Mi
    Requests:
      cpu:     20m
      memory:  32Mi
Conditions:
  Type           Status
  PodScheduled   False
Events:
  Type     Reason            Age                From               Message
  ----     ------            ----               ----               -------
  Warning  FailedScheduling  12s (x3 over 70s)  default-scheduler  0/3 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 node(s) didn't match Pod's node affinity/selector. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.`,
      logs: (p) => `Error from server (BadRequest): container "redis" in pod "${p.name}" is waiting to start: ContainerCreating`,
      prev: (p) => `Error from server (BadRequest): previous terminated container "redis" in pod "${p.name}" not found`,
      exec: notRunning('redis'),
      top: noMetrics,
      okLog: '1:M 23 Oct 2026 15:45:02.117 * Ready to accept connections tcp',
      okEnv: 'REDIS_VERSION=7.4.5',
      fixed: [{ id: 'cache2', name: 'cache-7c9f6d5b8e-l4mzr', node: 'kcna-worker', status: 'Running', real: 'Running', ready: '1/1', restarts: 0, ip: '10.244.2.22', age: '9s', tag: 'ssd' }],
    },
    {
      key: 'worker', n: 4, file: '04-worker.yaml', symptom: 'arranca, carga datos y muere',
      causes: [
        { text: 'Error de la aplicación: sale con código 1', ok: false, why: 'Exit Code 1 sería una salida voluntaria. Aquí es 137 = 128 + 9 (SIGKILL) y Reason OOMKilled: lo mató el kernel.' },
        { text: 'Supera su limits.memory (32Mi): el kernel lo mata con SIGKILL (exit 137)', ok: true, why: '' },
        { text: 'El nodo tiene MemoryPressure y expulsa el pod', ok: false, why: 'Una expulsión por presión del nodo deja el pod en estado Evicted, no OOMKilled con reinicios. El límite es del contenedor.' },
        { text: 'Falta un ConfigMap referenciado', ok: false, why: 'Eso daría CreateContainerConfigError y el contenedor nunca arrancaría. Este arrancó y escribió logs.' },
      ],
      fixes: [
        { text: 'Subir requests.cpu a 500m', ok: false, why: 'La CPU no tiene nada que ver con un OOM; el límite que cuenta es limits.memory.' },
        { text: 'kubectl set resources deployment/worker -c worker --limits=memory=128Mi -n lab-09', ok: true, why: '' },
        { text: 'kubectl set env deployment/worker DB_HOST=postgres', ok: false, why: 'Ese era el caso de api. worker no lee variables: muere por memoria.' },
        { text: 'Añadir una startupProbe con failureThreshold alto', ok: false, why: 'Las sondas no evitan que el kernel mate un proceso que supera su límite de memoria.' },
      ],
      hints: ['describe pod: en Last State fíjate en Reason y Exit Code. 137 = 128 + 9: una señal SIGKILL.', 'Los logs --previous se cortan justo después de "cargando 64 MiB"; el límite del contenedor es 32Mi. Haz la cuenta.'],
      chain: 'get mostró OOMKilled con 2 reinicios (a ratos verás CrashLoopBackOff: alternan). describe fue concluyente: Last State Terminated, Reason OOMKilled, Exit Code 137, Limits memory 32Mi. events solo añadió BackOff. logs --previous mostró "cargando 64 MiB de datos en memoria..." y nada más: murió a mitad de carga. top no sirve aquí (solo lista pods en ejecución). Arreglo: subir limits.memory a 128Mi; el pod nuevo cargó sus datos y siguió procesando.',
      events: [
        { age: 47, type: 'Normal', reason: 'Started', obj: 'pod/worker-69c876967-wbrlh', msg: 'Started container worker' },
        { age: 15, type: 'Warning', reason: 'BackOff', obj: 'pod/worker-69c876967-wbrlh', msg: 'Back-off restarting failed container worker in pod worker-69c876967-wbrlh_lab-09' },
      ],
      describe: (p) => `${head(p)}
Containers:
  worker:
    Image:          busybox:1.37
    Command:
      sh
      -c
      echo "[worker] cargando 64 MiB de datos en memoria..."
      head -c 64m /dev/zero | tail > /dev/null
      ...
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       OOMKilled
      Exit Code:    137
      Started:      Thu, 23 Oct 2026 15:40:55 +0000
      Finished:     Thu, 23 Oct 2026 15:40:56 +0000
    Ready:          False
    Restart Count:  2
    Limits:
      memory:  32Mi
    Requests:
      cpu:     10m
      memory:  16Mi
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  69s                default-scheduler  Successfully assigned lab-09/${p.name} to kcna-worker
  Normal   Pulled     47s (x3 over 68s)  kubelet            Container image "busybox:1.37" already present on machine
  Normal   Created    47s (x3 over 68s)  kubelet            Created container: worker
  Normal   Started    47s (x3 over 68s)  kubelet            Started container worker
  Warning  BackOff    15s (x4 over 55s)  kubelet            Back-off restarting failed container worker in pod ${p.name}_lab-09`,
      logs: () => '[worker] cargando 64 MiB de datos en memoria...',
      prev: () => '[worker] cargando 64 MiB de datos en memoria...',
      exec: notRunning('worker'),
      top: noMetrics,
      okLog: '[worker] cargando 64 MiB de datos en memoria...\n[worker] datos cargados. Procesando cola.',
      okEnv: 'HOME=/root',
      fixed: [{ id: 'wk2', name: 'worker-5b8c7d6f9a-t7nvw', node: 'kcna-worker2', status: 'Running', real: 'Running', ready: '1/1', restarts: 0, ip: '10.244.1.12', age: '14s' }],
    },
    {
      key: 'reporter', n: 5, file: '05-reporter.yaml', symptom: 'se queda "creando el contenedor"',
      causes: [
        { text: 'La imagen no se puede descargar', ok: false, why: 'El evento Pulled dice "already present on machine". El fallo viene al construir la configuración del contenedor.' },
        { text: 'El Deployment referencia el ConfigMap reporter-config, pero el que existe se llama report-config', ok: true, why: '' },
        { text: 'La variable REPORT_EVERY no es numérica', ok: false, why: 'El contenedor ni siquiera arranca, así que nunca llega a leer esa variable. El evento habla de un ConfigMap que no existe.' },
        { text: 'El pod no tiene permisos RBAC para leer el ConfigMap', ok: false, why: 'Quien lee el ConfigMap es el kubelet, no el pod; no hace falta RBAC. El mensaje es "not found", no "forbidden".' },
      ],
      fixes: [
        { text: 'kubectl rollout restart deployment/reporter -n lab-09', ok: false, why: 'Los pods nuevos buscarían el mismo ConfigMap inexistente: mismo error.' },
        { text: 'Crear un Role que permita get configmaps', ok: false, why: 'No es un problema de permisos: el ConfigMap con ese nombre no existe.' },
        { text: 'Corregir configMapRef.name a report-config en 05-reporter.yaml y aplicar', ok: true, why: '' },
        { text: 'Quitar envFrom y escribir los valores fijos en el comando', ok: false, why: 'Arrancaría, pero pierdes la separación entre configuración y código que da el ConfigMap. No es el arreglo esperado.' },
      ],
      hints: ['describe pod: State Waiting con Reason CreateContainerConfigError. El evento Warning Failed dice qué objeto no encuentra.', 'kubectl get configmap -n lab-09 lista los que existen. Compara el nombre con el que pide el evento.'],
      chain: 'get mostró CreateContainerConfigError. describe indicó State Waiting, Reason CreateContainerConfigError, y en Environment Variables from: reporter-config (Optional: false). events dio el mensaje exacto: Error: configmap "reporter-config" not found. get configmap mostró que el existente es report-config. logs no existe: el kubelet no pudo ni crear el contenedor. Arreglo: corregir configMapRef.name en el YAML (o crear el ConfigMap con el nombre esperado) y aplicar.',
      events: [
        { age: 4, type: 'Warning', reason: 'Failed', obj: 'pod/reporter-54b6b5cfc8-scldj', msg: 'Error: configmap "reporter-config" not found' },
      ],
      describe: (p) => `${head(p)}
Containers:
  reporter:
    Image:          busybox:1.37
    Command:
      sh
      -c
      while true; do echo "[reporter] generando reporte $REPORT_FORMAT"; sleep $REPORT_EVERY; done
    State:          Waiting
      Reason:       CreateContainerConfigError
    Ready:          False
    Restart Count:  0
    Limits:
      memory:  32Mi
    Requests:
      cpu:     10m
      memory:  16Mi
    Environment Variables from:
      reporter-config  ConfigMap  Optional: false
Events:
  Type     Reason     Age               From               Message
  ----     ------     ----              ----               -------
  Normal   Scheduled  68s               default-scheduler  Successfully assigned lab-09/${p.name} to kcna-worker
  Normal   Pulled     4s (x8 over 67s)  kubelet            Container image "busybox:1.37" already present on machine
  Warning  Failed     4s (x8 over 67s)  kubelet            Error: configmap "reporter-config" not found`,
      logs: (p) => `Error from server (BadRequest): container "reporter" in pod "${p.name}" is waiting to start: CreateContainerConfigError`,
      prev: (p) => `Error from server (BadRequest): previous terminated container "reporter" in pod "${p.name}" not found`,
      exec: notRunning('reporter'),
      top: noMetrics,
      okLog: '[reporter] generando reporte pdf',
      okEnv: 'REPORT_FORMAT=pdf\nREPORT_EVERY=60',
      fixed: [{ id: 'rep2', name: 'reporter-68d7c9b5f4-m9kzq', node: 'kcna-worker', status: 'Running', real: 'Running', ready: '1/1', restarts: 0, ip: '10.244.2.23', age: '8s' }],
    },
    {
      key: 'shop', n: 6, file: '06-shop.yaml', symptom: 'se reinicia solo y su Service no responde (dos fallos)',
      causes: [
        { text: 'Solo la liveness: apunta al puerto 8080 y nginx escucha en el 80', ok: false, why: 'Es la mitad. Aunque dejara de reiniciarse, el Service seguiría sin endpoints: mira su selector.' },
        { text: 'nginx se cae por falta de memoria', ok: false, why: 'Last State dice Reason Completed, Exit Code 0: nginx terminó limpiamente cuando el kubelet le mandó SIGTERM. Nadie lo mató por memoria.' },
        { text: 'Dos fallos: la liveness apunta al puerto 8080 (nginx escucha en 80) y el Service selecciona app=tienda (los pods tienen app=shop)', ok: true, why: '' },
        { text: 'El Service no define targetPort', ok: false, why: 'Sí lo define (targetPort: http). El problema del Service es que su selector no coincide con ninguna label de pod.' },
      ],
      fixes: [
        { text: 'kubectl label pod shop-5dc894c86f-dfrxn app=tienda --overwrite', ok: false, why: 'Cambiarías la label de un pod suelto (el ReplicaSet lo abandonaría) y la liveness seguiría matando contenedores. Corrige el Service y la sonda.' },
        { text: 'Cambiar el puerto de la liveness a http (80) y el selector del Service a app: shop, luego kubectl apply -f 06-shop.yaml', ok: true, why: '' },
        { text: 'Quitar la readinessProbe', ok: false, why: 'La readiness funciona bien (pregunta al puerto http y recibe 200). La que falla es la liveness, y el selector del Service sigue mal.' },
        { text: 'Cambiar containerPort a 8080', ok: false, why: 'Declarar un puerto no hace que nginx escuche en él; la sonda seguiría recibiendo connection refused.' },
      ],
      hints: ['Hay dos problemas independientes. describe pod: compara el puerto de Liveness con el de Readiness y lee los eventos Unhealthy y Killing. Luego get svc -o wide: ¿qué selector tiene shop?', 'Liveness http-get :8080 vs Readiness :http (80). Service selector app=tienda vs label del pod app=shop. Ambas cosas en 06-shop.yaml.'],
      chain: 'get mostró shop oscilando entre Running 1/1 y CrashLoopBackOff con reinicios subiendo. describe enseñó Liveness en :8080 y Readiness en :http, y Last State Reason Completed, Exit Code 0 (SIGTERM: lo apagó el kubelet). events lo confirmó: "Liveness probe failed: ... :8080: connection refused" y "Container web failed liveness probe, will be restarted". logs de nginx no mostraron ningún error, solo los GET 200 de la readiness y "signal 15 (SIGTERM) received". Para el segundo fallo, get svc -o wide mostró Selector app=tienda y el EndpointSlice vacío. Arreglo: puerto http en la liveness y selector app: shop; el Service ya tiene 2 endpoints.',
      events: [
        { age: 42, type: 'Warning', reason: 'Unhealthy', obj: 'pod/shop-5dc894c86f-vzqkl', msg: 'Liveness probe failed: Get "http://10.244.1.6:8080/": dial tcp 10.244.1.6:8080: connect: connection refused' },
        { age: 42, type: 'Normal', reason: 'Killing', obj: 'pod/shop-5dc894c86f-vzqkl', msg: 'Container web failed liveness probe, will be restarted' },
        { age: 11, type: 'Normal', reason: 'Started', obj: 'pod/shop-5dc894c86f-dfrxn', msg: 'Started container web' },
        { age: 6, type: 'Warning', reason: 'BackOff', obj: 'pod/shop-5dc894c86f-vzqkl', msg: 'Back-off restarting failed container web in pod shop-5dc894c86f-vzqkl_lab-09' },
      ],
      describe: (p) => `${head(p)}
Containers:
  web:
    Image:          nginx:1.27-alpine
    Port:           80/TCP (http)
    State:          ${p.real === 'Running' ? 'Running' : 'Waiting\n      Reason:       CrashLoopBackOff'}
    Last State:     Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Thu, 23 Oct 2026 15:40:40 +0000
      Finished:     Thu, 23 Oct 2026 15:40:52 +0000
    Ready:          ${p.real === 'Running' ? 'True' : 'False'}
    Restart Count:  3
    Liveness:       http-get http://:8080/ delay=5s timeout=1s period=5s #success=1 #failure=2
    Readiness:      http-get http://:http/ delay=0s timeout=1s period=5s #success=1 #failure=3
    Limits:
      memory:  64Mi
    Requests:
      cpu:     10m
      memory:  16Mi
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  67s                default-scheduler  Successfully assigned lab-09/${p.name} to ${p.node}
  Normal   Pulled     11s (x4 over 66s)  kubelet            Container image "nginx:1.27-alpine" already present on machine
  Normal   Created    11s (x4 over 66s)  kubelet            Created container: web
  Normal   Started    11s (x4 over 66s)  kubelet            Started container web
  Warning  Unhealthy  42s (x8 over 57s)  kubelet            Liveness probe failed: Get "http://${p.ip}:8080/": dial tcp ${p.ip}:8080: connect: connection refused
  Normal   Killing    42s (x4 over 52s)  kubelet            Container web failed liveness probe, will be restarted
  Warning  BackOff    6s (x3 over 20s)   kubelet            Back-off restarting failed container web in pod ${p.name}_lab-09`,
      logs: () => `/docker-entrypoint.sh: Configuration complete; ready for start up
2026/10/23 15:40:40 [notice] 1#1: nginx/1.27.5
2026/10/23 15:40:40 [notice] 1#1: start worker processes
2026/10/23 15:40:40 [notice] 1#1: start worker process 36
10.244.1.1 - - [23/Oct/2026:15:40:45 +0000] "GET / HTTP/1.1" 200 615 "-" "kube-probe/1.33" "-"
10.244.1.1 - - [23/Oct/2026:15:40:50 +0000] "GET / HTTP/1.1" 200 615 "-" "kube-probe/1.33" "-"
2026/10/23 15:40:52 [notice] 1#1: signal 15 (SIGTERM) received, exiting`,
      prev: () => `/docker-entrypoint.sh: Configuration complete; ready for start up
2026/10/23 15:40:25 [notice] 1#1: nginx/1.27.5
10.244.1.1 - - [23/Oct/2026:15:40:30 +0000] "GET / HTTP/1.1" 200 615 "-" "kube-probe/1.33" "-"
2026/10/23 15:40:37 [notice] 1#1: signal 15 (SIGTERM) received, exiting`,
      exec: (p) => p.real === 'Running' ? `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOSTNAME=${p.name}
NGINX_VERSION=1.27.5
SHOP_SERVICE_HOST=10.96.126.219
SHOP_SERVICE_PORT=80
KUBERNETES_SERVICE_HOST=10.96.0.1
KUBERNETES_SERVICE_PORT=443
HOME=/root` : notRunning('web')(p),
      top: (p) => p.real === 'Running' ? `NAME                    CPU(cores)   MEMORY(bytes)
${p.name}   1m           3Mi` : noMetrics(p),
      okLog: '10.244.1.1 - - [23/Oct/2026:15:48:05 +0000] "GET / HTTP/1.1" 200 615 "-" "kube-probe/1.33" "-"',
      okEnv: 'NGINX_VERSION=1.27.5\nSHOP_SERVICE_HOST=10.96.126.219',
      fixed: [
        { id: 'shop3', name: 'shop-7d9c8b6f5e-a1b2c', node: 'kcna-worker', status: 'Running', real: 'Running', ready: '1/1', restarts: 0, ip: '10.244.2.24', age: '16s' },
        { id: 'shop4', name: 'shop-7d9c8b6f5e-d3e4f', node: 'kcna-worker2', status: 'Running', real: 'Running', ready: '1/1', restarts: 0, ip: '10.244.1.13', age: '11s' },
      ],
    },
  ];

  const COMMANDS: { id: Cmd; label: string; needsPod: boolean }[] = [
    { id: 'get', label: 'kubectl get pods -o wide', needsPod: false },
    { id: 'describe', label: 'kubectl describe pod <pod>', needsPod: true },
    { id: 'events', label: 'kubectl get events --sort-by=.lastTimestamp', needsPod: false },
    { id: 'logs', label: 'kubectl logs <pod>', needsPod: true },
    { id: 'prev', label: 'kubectl logs <pod> --previous', needsPod: true },
    { id: 'exec', label: 'kubectl exec <pod> -- env', needsPod: true },
    { id: 'svc', label: 'kubectl get svc -o wide; get endpointslices', needsPod: false },
    { id: 'cm', label: 'kubectl get configmap', needsPod: false },
    { id: 'top', label: 'kubectl top pod <pod>', needsPod: true },
  ];

  interface CaseState { solved: boolean; fails: number; phase: 'investigate' | 'cause' | 'fix' }
  const freshState = (): Record<CaseKey, CaseState> =>
    Object.fromEntries(CASES.map((c) => [c.key, { solved: false, fails: 0, phase: 'investigate' }])) as Record<CaseKey, CaseState>;

  let pods = $state<SimPod[]>(INITIAL.map((p) => ({ ...p })));
  let st = $state<Record<CaseKey, CaseState>>(freshState());
  let selId = $state<string | null>(null);
  let consoleLog = $state<{ cmd: string; out: string }[]>([]);
  let feedback = $state<{ kind: 'ok' | 'fail' | 'warn' | ''; text: string }>({ kind: '', text: 'Pulsa un pod del lienzo para empezar. Recuerda el orden: get, describe, events, logs, exec.' });
  let busy = $state(false);
  let preEl = $state<HTMLPreElement>();

  const selPod = $derived(pods.find((p) => p.id === selId) ?? null);
  const sel = $derived(selPod ? CASES.find((c) => c.key === selPod.caseKey)! : null);
  const solvedCount = $derived(CASES.filter((c) => st[c.key].solved).length);
  const totalFails = $derived(CASES.reduce((a, c) => a + st[c.key].fails, 0));
  // casos resueltos en cualquier sesión o dispositivo (la ronda actual siempre empieza con el namespace roto, para repetirla)
  const everSolved = $derived(CASES.filter((c) => progress.retos.includes(`diag:${c.key}`)).length);
  const hintLevel = $derived(sel ? (st[sel.key].fails >= 4 ? 2 : st[sel.key].fails >= 2 ? 1 : 0) : 0);

  $effect(() => { consoleLog.length; if (preEl) preEl.scrollTop = preEl.scrollHeight; });

  function table(headers: string[], rows: string[][]) {
    const w = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
    const line = (r: string[]) => r.map((c, i) => c.padEnd(w[i])).join('   ').trimEnd();
    return [line(headers), ...rows.map(line)].join('\n');
  }
  function getPodsOut() {
    const rows = [...pods].sort((a, b) => a.name.localeCompare(b.name)).map((p) => [p.name, p.ready, p.real, String(p.restarts ?? 0), p.age, p.ip, p.node ?? '<none>']);
    return table(['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE', 'IP', 'NODE'], rows);
  }
  function eventsOut() {
    const evs: Ev[] = [];
    for (const c of CASES) {
      if (st[c.key].solved) {
        for (const f of c.fixed) evs.push({ age: 9, type: 'Normal', reason: 'Started', obj: `pod/${f.name}`, msg: `Started container ${c.key === 'frontend' ? 'nginx' : c.key === 'shop' ? 'web' : c.key === 'cache' ? 'redis' : c.key}` });
      } else evs.push(...c.events);
    }
    evs.sort((a, b) => b.age - a.age);
    return table(['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE'], evs.map((e) => [`${e.age}s`, e.type, e.reason, e.obj, e.msg]));
  }
  function svcOut() {
    const fe = st.frontend.solved, sh = st.shop.solved;
    return `${table(['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE', 'SELECTOR'], [
      ['frontend', 'ClusterIP', '10.96.201.14', '<none>', '80/TCP', '72s', 'app=frontend'],
      ['shop', 'ClusterIP', '10.96.126.219', '<none>', '80/TCP', '67s', sh ? 'app=shop' : 'app=tienda'],
    ])}

${table(['NAME', 'ADDRESSTYPE', 'PORTS', 'ENDPOINTS', 'AGE'], [
      ['frontend-bdvtf', 'IPv4', '80', fe ? '10.244.1.11,10.244.2.20' : '<unset>', '72s'],
      ['shop-k7m2x', 'IPv4', sh ? '80' : '<unset>', sh ? '10.244.2.24,10.244.1.13' : '<unset>', '67s'],
    ])}`;
  }
  const cmOut = () => table(['NAME', 'DATA', 'AGE'], [['kube-root-ca.crt', '1', '3m12s'], ['report-config', '2', '68s']]);
  function healthyDescribe(c: Case, p: SimPod) {
    const cont = c.key === 'frontend' ? 'nginx' : c.key === 'shop' ? 'web' : c.key === 'cache' ? 'redis' : c.key;
    return `${head(p)}
Containers:
  ${cont}:
    State:          Running
    Ready:          True
    Restart Count:  0
Conditions:
  Type              Status
  PodScheduled      True
  Ready             True
  ContainersReady   True
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  ${p.age}   default-scheduler  Successfully assigned lab-09/${p.name} to ${p.node}
  Normal  Pulled     ${p.age}   kubelet            Container image already present on machine
  Normal  Created    ${p.age}   kubelet            Created container: ${cont}
  Normal  Started    ${p.age}   kubelet            Started container ${cont}`;
  }

  function run(cmd: Cmd) {
    if (!sel || !selPod) return;
    const c = sel, p = selPod, ok = st[c.key].solved;
    const line = COMMANDS.find((k) => k.id === cmd)!.label.replace('<pod>', p.name).replace(/;/g, ' -n lab-09;') + ' -n lab-09';
    let out = '';
    switch (cmd) {
      case 'get': out = getPodsOut(); break;
      case 'events': out = eventsOut(); break;
      case 'svc': out = svcOut(); break;
      case 'cm': out = cmOut(); break;
      case 'describe': out = ok ? healthyDescribe(c, p) : c.describe(p); break;
      case 'logs': out = ok ? c.okLog : c.logs(p); break;
      case 'prev': out = ok ? `Error from server (BadRequest): previous terminated container in pod "${p.name}" not found` : c.prev(p); break;
      case 'exec': out = ok ? `HOSTNAME=${p.name}\n${c.okEnv}\nKUBERNETES_SERVICE_HOST=10.96.0.1` : c.exec(p); break;
      case 'top': out = ok ? `NAME                        CPU(cores)   MEMORY(bytes)\n${p.name.padEnd(28)}2m           ${c.key === 'worker' ? '70Mi' : '4Mi'}` : c.top(p); break;
    }
    consoleLog = [...consoleLog, { cmd: line, out }].slice(-8);
    feedback = { kind: '', text: tip(cmd, c, ok) };
  }
  function tip(cmd: Cmd, c: Case, ok: boolean) {
    if (ok) return `Caso ${c.n} ya resuelto: la salida muestra el pod nuevo, sano. Elige otro pod del lienzo.`;
    switch (cmd) {
      case 'get': return 'get responde "¿en qué estado está y dónde?". Fíjate en IP y NODE: si están vacíos, el problema es del scheduler; si existen, es posterior (imagen, configuración, proceso).';
      case 'describe': return 'describe junta condiciones, State/Last State (con Exit Code) y los eventos del pod. Funciona aunque el contenedor nunca haya arrancado.';
      case 'events': return 'Los eventos del namespace, ordenados en el tiempo, cuentan la película completa. Aquí ya ves pistas de los demás casos; se conservan solo ~1 hora.';
      case 'logs': return 'logs solo tiene algo si el contenedor llegó a ejecutarse. Si devuelve "waiting to start", vuelve a describe y a los eventos.';
      case 'prev': return '--previous muestra el contenedor anterior, el que acaba de morir: imprescindible en CrashLoopBackOff, donde el actual puede ni haber arrancado.';
      case 'exec': return 'exec necesita un contenedor vivo. Si falla, usa kubectl debug --copy-to para explorar una copia del pod con una shell.';
      case 'svc': return 'Un Service solo reparte tráfico a pods que coinciden con su selector y están Ready. Sin ENDPOINTS en el EndpointSlice, el cliente recibe connection refused.';
      case 'cm': return 'Compara los nombres que existen con los que referencia el Deployment (envFrom, volumes).';
      case 'top': return 'top necesita metrics-server y solo lista pods en ejecución. Útil para comparar el consumo real con requests/limits.';
    }
  }

  function select(p: PodSpec) {
    if (busy) return;
    selId = p.id;
    const c = CASES.find((k) => k.key === (p as SimPod).caseKey)!;
    const s = st[c.key];
    feedback = s.solved
      ? { kind: 'ok', text: `Caso ${c.n} resuelto. ${c.chain}` }
      : { kind: '', text: `Caso ${c.n} (${c.file}): ${c.symptom}. Investiga con la consola y, cuando lo tengas claro, pulsa "Ya sé la causa".` };
  }

  function answer(kind: 'cause' | 'fix', o: Option) {
    if (!sel || busy) return;
    const s = st[sel.key];
    if (!o.ok) {
      s.fails += 1;
      feedback = { kind: 'fail', text: `No es eso. ${o.why}` };
      return;
    }
    if (kind === 'cause') {
      s.phase = 'fix';
      feedback = { kind: 'ok', text: 'Causa correcta. Ahora elige el arreglo que ataca esa causa (y no solo el síntoma).' };
    } else {
      resolve(sel);
    }
  }

  async function resolve(c: Case) {
    busy = true;
    const old = pods.filter((p) => p.caseKey === c.key).map((p) => p.id);
    pods = pods.map((p) => (old.includes(p.id) ? { ...p, status: 'Terminating', real: 'Terminating', tag: undefined } : p));
    feedback = { kind: 'warn', text: 'Aplicado. El Deployment crea un ReplicaSet nuevo y termina los pods viejos...' };
    await wait(700);
    pods = pods.filter((p) => !old.includes(p.id));
    const fresh: SimPod[] = c.fixed.map((f) => ({ ...f, caseKey: c.key, status: 'ContainerCreating', real: 'ContainerCreating', ready: '0/1' }));
    pods = [...pods, ...fresh];
    await wait(800);
    pods = pods.map((p) => (fresh.some((f) => f.id === p.id) ? { ...p, status: 'Running', real: 'Running', ready: '1/1' } : p));
    st[c.key].solved = true;
    addReto(`diag:${c.key}`);
    selId = fresh[0].id;
    busy = false;
    const done = CASES.filter((k) => st[k.key].solved).length;
    feedback = { kind: 'ok', text: `Caso ${c.n} resuelto. Cadena de diagnóstico: ${c.chain}${done === 6 ? ' Namespace sano: .\\kcna.ps1 check 09 daría "Lab completado: 6/6".' : ''}` };
  }

  function reset() {
    if (busy) return;
    pods = INITIAL.map((p) => ({ ...p }));
    st = freshState();
    selId = null;
    consoleLog = [];
    feedback = { kind: '', text: 'Namespace lab-09 roto de nuevo. Pulsa un pod para empezar.' };
  }
</script>

<div class="diag">
  <div class="controls top">
    <span class="score">Resueltos <strong class="mono">{solvedCount}/6</strong> · fallos <strong class="mono">{totalFails}</strong>{#if everSolved > solvedCount}<span class="ever"> · alguna vez: {everSolved}/6</span>{/if}</span>
    <span class="hint ns mono">namespace lab-09</span>
    <button type="button" class="btn small" onclick={reset} disabled={busy}>Reiniciar</button>
  </div>

  <ClusterCanvas {nodes} {pods} onpodclick={select} />

  <ol class="legend" aria-label="Casos">
    {#each CASES as c (c.key)}
      <li class:done={st[c.key].solved} class:cur={sel?.key === c.key}>
        <button type="button" onclick={() => { const p = pods.find((x) => x.caseKey === c.key); if (p) select(p); }} disabled={busy}>
          <span class="n mono">{c.n}</span> {c.key} <span class="sym">{st[c.key].solved ? 'resuelto' : c.symptom}</span>
        </button>
      </li>
    {/each}
  </ol>

  {#if sel && selPod}
    <div class="case">
      <div class="casehead">
        <strong class="mono">{selPod.name}</strong>
        <span class="st mono" class:bad={selPod.real !== 'Running'}>{selPod.real}</span>
        <span class="hint">caso {sel.n} · {sel.file}</span>
      </div>

      <div class="controls cmds" aria-label="Comandos">
        {#each COMMANDS as k (k.id)}
          <button type="button" class="btn small mono" onclick={() => run(k.id)} disabled={busy}>{k.label}</button>
        {/each}
      </div>

      <pre bind:this={preEl} class="console" aria-live="polite">{#if consoleLog.length === 0}$ _{:else}{#each consoleLog as e, i (i)}<span class="prompt">$ {e.cmd}</span>
{e.out}

{/each}{/if}</pre>

      {#if !st[sel.key].solved}
        {#if st[sel.key].phase === 'investigate'}
          <div class="controls">
            <button type="button" class="btn primary" onclick={() => (st[sel!.key].phase = 'cause')}>Ya sé la causa</button>
            <span class="hint">Ejecuta los comandos que necesites antes; no hay penalización por mirar.</span>
          </div>
        {:else if st[sel.key].phase === 'cause'}
          <p class="q">¿Cuál es la causa?</p>
          <div class="opts">
            {#each sel.causes as o, i (i)}
              <button type="button" class="btn opt" onclick={() => answer('cause', o)} disabled={busy}>{o.text}</button>
            {/each}
          </div>
        {:else}
          <p class="q">¿Cómo lo arreglas?</p>
          <div class="opts">
            {#each sel.fixes as o, i (i)}
              <button type="button" class="btn opt mono" onclick={() => answer('fix', o)} disabled={busy}>{o.text}</button>
            {/each}
          </div>
        {/if}
        {#if hintLevel > 0}
          <div class="explain warn">Pista {hintLevel}: {sel.hints[hintLevel - 1]}</div>
        {/if}
      {/if}
    </div>
  {/if}

  <div class="explain {feedback.kind}" aria-live="polite">{feedback.text}</div>
</div>

<style>
  .diag { display: grid; gap: 12px; }
  .top { margin-bottom: 0; justify-content: space-between; }
  .score { font-size: 0.92rem; color: var(--ink-2); }
  .ever { color: var(--ready); }
  .ns { font-size: 0.8rem; }
  .legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .legend button { font: inherit; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 6px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); color: var(--ink-2); cursor: pointer; }
  .legend button:hover { border-color: var(--helm); }
  .legend .n { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: var(--fail-2); color: var(--fail); font-size: 0.7rem; }
  .legend .done .n { background: var(--ready-2); color: var(--ready); }
  .legend .cur button { border-color: var(--helm); color: var(--ink); }
  .legend .sym { color: var(--ink-3); }
  .case { display: grid; gap: 10px; border: 1px solid var(--line); border-radius: var(--r-m); padding: 12px; background: var(--panel-2); }
  .casehead { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: baseline; }
  .st { font-size: 0.8rem; padding: 1px 8px; border-radius: 4px; background: var(--ready-2); color: var(--ready); }
  .st.bad { background: var(--fail-2); color: var(--fail); }
  .cmds { margin-bottom: 0; gap: 6px; }
  .cmds .btn { font-size: 0.78rem; padding: 4px 8px; }
  .console { max-height: 300px; overflow: auto; white-space: pre; font-size: 0.78rem; }
  .prompt { color: #8fd3a3; }
  .q { font-weight: 500; }
  .opts { display: grid; gap: 6px; }
  .opt { text-align: left; justify-content: flex-start; white-space: normal; line-height: 1.35; font-size: 0.9rem; }
  .opt.mono { font-size: 0.82rem; }
  .explain { margin-top: 0; }
</style>
