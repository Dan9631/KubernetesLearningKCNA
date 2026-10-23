// Banco de preguntas de práctica KCNA (Kubernetes and Cloud Native Associate)
// Temario CNCF vigente desde nov-2025. Preguntas y opciones en inglés; explicaciones en español.
// answer: índices 0-based de las opciones correctas (más de uno => multi-respuesta).
// Total: 220 preguntas.
window.KCNA_QUESTIONS = [
  {
    id: "F001",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which Kubernetes component is the consistent and highly available key-value store that holds all cluster data?",
    options: [
      "kube-controller-manager",
      "kubelet",
      "etcd",
      "kube-scheduler"
    ],
    answer: [2],
    explanation: "etcd es el almacén clave-valor distribuido (consenso Raft) donde se persiste todo el estado del clúster. El scheduler asigna Pods, el kubelet gestiona contenedores en el nodo y el controller-manager ejecuta los bucles de control; ninguno almacena el estado."
  },
  {
    id: "F002",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which control plane component is the only one that communicates directly with etcd?",
    options: [
      "kubelet",
      "kube-apiserver",
      "kube-scheduler",
      "kube-controller-manager"
    ],
    answer: [1],
    explanation: "Todos los componentes (scheduler, controllers, kubelets, kubectl) leen y escriben el estado a través del kube-apiserver; solo el API server habla directamente con etcd."
  },
  {
    id: "F003",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "A newly created Pod has no node assigned. Which component selects a suitable node for it?",
    options: [
      "kube-scheduler",
      "kube-proxy",
      "cloud-controller-manager",
      "kubelet"
    ],
    answer: [0],
    explanation: "kube-scheduler vigila los Pods sin spec.nodeName, filtra los nodos viables y los puntúa para elegir el mejor. El kubelet solo arranca el Pod una vez que ya está asignado a su nodo."
  },
  {
    id: "F004",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which component runs on every node and ensures that the containers described in PodSpecs are running and healthy?",
    options: [
      "etcd",
      "kube-proxy",
      "kube-apiserver",
      "kubelet"
    ],
    answer: [3],
    explanation: "El kubelet es el agente de cada nodo: recibe los PodSpecs asignados, pide al runtime (vía CRI) que cree los contenedores, ejecuta las probes y reporta el estado. kube-proxy solo gestiona reglas de red para los Services."
  },
  {
    id: "F005",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "What is the primary responsibility of kube-proxy?",
    options: [
      "Proxying kubectl requests to the API server",
      "Scheduling Pods onto nodes",
      "Maintaining network rules on nodes so that traffic to Service IPs reaches backend Pods",
      "Assigning IP addresses to Pods"
    ],
    answer: [2],
    explanation: "kube-proxy programa reglas (iptables, nftables o IPVS) en cada nodo para implementar las IP virtuales de los Services. La asignación de IPs a Pods la hace el plugin CNI. Algunos CNI, como Cilium, pueden reemplazar a kube-proxy."
  },
  {
    id: "F006",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which component embeds cloud-specific control logic, such as provisioning load balancers and managing node lifecycle with the underlying cloud provider?",
    options: [
      "cloud-controller-manager",
      "kube-controller-manager",
      "kube-scheduler",
      "CoreDNS"
    ],
    answer: [0],
    explanation: "El cloud-controller-manager separa la lógica específica del proveedor cloud (nodos, rutas, load balancers) del núcleo de Kubernetes, para que cada proveedor evolucione su integración de forma independiente."
  },
  {
    id: "F007",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which component runs built-in controllers such as the Node controller, the Job controller and the EndpointSlice controller?",
    options: [
      "kube-apiserver",
      "kubelet",
      "etcd",
      "kube-controller-manager"
    ],
    answer: [3],
    explanation: "kube-controller-manager es un único binario que ejecuta muchos controladores del núcleo; cada uno es un bucle de reconciliación que acerca el estado actual al deseado."
  },
  {
    id: "F008",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "What is the smallest deployable unit of computing that you can create and manage in Kubernetes?",
    options: [
      "Container",
      "Pod",
      "Deployment",
      "Node"
    ],
    answer: [1],
    explanation: "El Pod es la unidad mínima: uno o más contenedores que comparten red y almacenamiento y se programan juntos en el mismo nodo. Kubernetes no gestiona contenedores sueltos."
  },
  {
    id: "F009",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Which two resources are shared by all containers in the same Pod? (Choose 2)",
    options: [
      "The root filesystem of each container",
      "Volumes declared in the Pod spec",
      "The network namespace, including the Pod IP address and port space",
      "The container image"
    ],
    answer: [1,2],
    explanation: "Los contenedores de un Pod comparten IP y espacio de puertos (pueden hablar por localhost) y pueden montar los mismos volúmenes. Cada contenedor tiene su propia imagen y su propio sistema de archivos raíz."
  },
  {
    id: "F010",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "A Deployment is created with replicas: 3. Which object does the Deployment create directly to maintain those three Pods?",
    options: [
      "ReplicaSet",
      "DaemonSet",
      "StatefulSet",
      "ReplicationController"
    ],
    answer: [0],
    explanation: "Un Deployment gestiona ReplicaSets, y cada ReplicaSet mantiene el número deseado de Pods. En un rolling update el Deployment crea un ReplicaSet nuevo y escala el antiguo hacia cero."
  },
  {
    id: "F011",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "You need to run exactly one log-collection agent Pod on every node, including nodes added later. Which workload resource fits best?",
    options: [
      "Job",
      "DaemonSet",
      "Deployment",
      "StatefulSet"
    ],
    answer: [1],
    explanation: "Un DaemonSet asegura que todos (o algunos) nodos ejecuten una copia del Pod y la crea automáticamente en los nodos nuevos. Es típico para agentes de logs, monitoreo o plugins de red."
  },
  {
    id: "F012",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Which workload resource provides Pods with stable, unique network identities (such as db-0 and db-1) and stable per-Pod persistent storage?",
    options: [
      "DaemonSet",
      "ReplicaSet",
      "StatefulSet",
      "Deployment"
    ],
    answer: [2],
    explanation: "StatefulSet da nombres ordinales estables, un orden de despliegue predecible y un PVC por réplica mediante volumeClaimTemplates. Normalmente se combina con un Service headless."
  },
  {
    id: "F013",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Which resource should be used to run a database migration task once until it completes successfully?",
    options: [
      "CronJob",
      "Deployment",
      "DaemonSet",
      "Job"
    ],
    answer: [3],
    explanation: "Un Job crea Pods que se ejecutan hasta completarse y reintenta según backoffLimit. CronJob es para ejecuciones programadas recurrentes y Deployment mantiene procesos de larga duración que nunca 'terminan'."
  },
  {
    id: "F014",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "A report must be generated every day at 02:00. Which resource is designed for this?",
    options: [
      "CronJob",
      "DaemonSet",
      "StatefulSet",
      "A Job with restartPolicy: Always"
    ],
    answer: [0],
    explanation: "CronJob crea Jobs según una programación en formato cron (por ejemplo '0 2 * * *'). Un Job no admite restartPolicy: Always y no tiene programación propia."
  },
  {
    id: "F015",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Which statement about Kubernetes Secrets is correct by default?",
    options: [
      "Secret data is automatically encrypted with AES in etcd",
      "Secrets are cluster-scoped objects",
      "Secret data is only base64-encoded and is stored unencrypted in etcd unless encryption at rest is configured",
      "Secrets can only be consumed as environment variables"
    ],
    answer: [2],
    explanation: "Por defecto los valores de un Secret solo están codificados en base64, lo cual no es cifrado. Para protegerlos hay que habilitar el cifrado en reposo (EncryptionConfiguration o KMS) y restringir el acceso con RBAC. Los Secrets son namespaced y pueden montarse como volumen o variables."
  },
  {
    id: "F016",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which two components run on every worker node in a typical Kubernetes cluster? (Choose 2)",
    options: [
      "kube-scheduler",
      "A container runtime such as containerd",
      "etcd",
      "kubelet"
    ],
    answer: [1,3],
    explanation: "Cada nodo worker ejecuta el kubelet y un runtime de contenedores compatible con CRI (además de kube-proxy o un reemplazo provisto por el CNI). kube-scheduler y etcd forman parte del control plane."
  },
  {
    id: "F017",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which two of the following resources are cluster-scoped rather than namespaced? (Choose 2)",
    options: [
      "ConfigMap",
      "PersistentVolume",
      "Node",
      "PersistentVolumeClaim"
    ],
    answer: [1,2],
    explanation: "Node y PersistentVolume son recursos de ámbito de clúster. PVC y ConfigMap pertenecen a un namespace. Puede verificarse con kubectl api-resources --namespaced=false."
  },
  {
    id: "F018",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "How does a Service determine which Pods should receive its traffic?",
    options: [
      "By the node the Pods run on",
      "By a label selector that matches Pod labels",
      "By matching Pod names",
      "By annotations on the Pods"
    ],
    answer: [1],
    explanation: "Los Services usan un selector de labels; el controlador de EndpointSlices registra las IPs de los Pods Ready que coinciden. Las anotaciones no sirven para seleccionar objetos."
  },
  {
    id: "F019",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "What is the main difference between labels and annotations?",
    options: [
      "Annotations are limited to 63 characters while labels have no limit",
      "There is no difference; they are aliases",
      "Labels store non-identifying metadata, while annotations are used by selectors",
      "Labels identify and group objects for selection, while annotations store non-identifying metadata that selectors cannot use"
    ],
    answer: [3],
    explanation: "Los labels identifican y agrupan objetos y se consultan con selectores. Las anotaciones guardan metadatos arbitrarios (información de herramientas, build, contacto) y no se usan para seleccionar."
  },
  {
    id: "F020",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which statement best describes the Kubernetes controller pattern?",
    options: [
      "Controllers replace the API server when it is unavailable",
      "Controllers execute a one-time script when an object is created",
      "Controllers only run on worker nodes",
      "Controllers continuously watch the current state and act to move it toward the desired state declared in objects"
    ],
    answer: [3],
    explanation: "Un controlador es un bucle de reconciliación: observa el estado real a través de la API, lo compara con el spec deseado y actúa para cerrar la diferencia, de forma continua y no una sola vez."
  },
  {
    id: "F021",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Which statement about init containers is correct?",
    options: [
      "They run sequentially and each must complete successfully before the application containers start",
      "They keep running for the whole life of the Pod by default",
      "They run in parallel with the application containers",
      "They can only be used in StatefulSets"
    ],
    answer: [0],
    explanation: "Los init containers se ejecutan en orden, uno tras otro, y cada uno debe terminar con éxito antes de arrancar los contenedores de la aplicación. Si uno falla, el Pod se reintenta según su restartPolicy."
  },
  {
    id: "F022",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "In recent Kubernetes versions, how do you declare a native sidecar container that starts before the main container and keeps running alongside it?",
    options: [
      "Define it under ephemeralContainers",
      "Define it under initContainers with restartPolicy: Always",
      "Add the annotation sidecar.kubernetes.io/enabled: true",
      "Use a separate Pod with podAffinity"
    ],
    answer: [1],
    explanation: "Los sidecars nativos (estables desde Kubernetes 1.33) son init containers con restartPolicy: Always: arrancan antes que la app, siguen corriendo durante toda la vida del Pod y no impiden que un Job se complete. Los ephemeral containers son solo para depuración."
  },
  {
    id: "F023",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Which of the following is NOT a valid Pod phase?",
    options: [
      "Pending",
      "Succeeded",
      "CrashLoopBackOff",
      "Unknown"
    ],
    answer: [2],
    explanation: "Las fases de un Pod son Pending, Running, Succeeded, Failed y Unknown. CrashLoopBackOff es un motivo (reason) del estado 'waiting' de un contenedor, no una fase del Pod."
  },
  {
    id: "F024",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "A container is alive but needs 30 seconds to warm its cache before it can serve requests. Which mechanism prevents Service traffic from reaching it during that time?",
    options: [
      "A preStop hook",
      "terminationGracePeriodSeconds",
      "livenessProbe",
      "readinessProbe"
    ],
    answer: [3],
    explanation: "La readinessProbe indica si el contenedor puede recibir tráfico; mientras falla, el Pod se retira de los endpoints del Service. Una livenessProbe fallida reiniciaría el contenedor, que no es lo deseado; preStop y el grace period actúan al terminar."
  },
  {
    id: "F025",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "What happens when a container's livenessProbe keeps failing beyond its failureThreshold?",
    options: [
      "The Pod is rescheduled to a different node",
      "The kubelet kills the container and restarts it according to the Pod's restartPolicy",
      "The Deployment is rolled back automatically",
      "The Pod is removed from Service endpoints but keeps running"
    ],
    answer: [1],
    explanation: "Un fallo de liveness hace que el kubelet reinicie el contenedor en el mismo nodo. Retirar el Pod de los endpoints es el efecto de la readinessProbe, y ninguna probe provoca un rollback."
  },
  {
    id: "F026",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "A slow-starting legacy application takes up to 3 minutes to boot. Which probe should be used so that liveness checks do not kill it during startup?",
    options: [
      "readinessProbe",
      "An exec readiness gate",
      "startupProbe",
      "A postStart lifecycle hook"
    ],
    answer: [2],
    explanation: "La startupProbe deshabilita las comprobaciones de liveness y readiness hasta que tiene éxito, dando tiempo al arranque sin reinicios prematuros."
  },
  {
    id: "F027",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Every container in a Pod sets CPU and memory requests equal to their limits. Which QoS class is assigned to the Pod?",
    options: [
      "Guaranteed",
      "Critical",
      "BestEffort",
      "Burstable"
    ],
    answer: [0],
    explanation: "Guaranteed requiere que todos los contenedores tengan requests y limits de CPU y memoria, y que sean iguales. Sin requests ni limits es BestEffort; cualquier otra combinación es Burstable. 'Critical' no es una clase QoS."
  },
  {
    id: "F028",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Under node memory pressure, Pods of which QoS class are generally evicted first by the kubelet?",
    options: [
      "System",
      "Burstable",
      "Guaranteed",
      "BestEffort"
    ],
    answer: [3],
    explanation: "Los Pods BestEffort (sin requests ni limits) son los primeros candidatos a desalojo, luego los Burstable que exceden sus requests; los Guaranteed son los últimos."
  },
  {
    id: "F029",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "A container exceeds its memory limit. What typically happens?",
    options: [
      "It is terminated with the reason OOMKilled",
      "It is moved to another node",
      "Its limit is automatically increased",
      "It is throttled"
    ],
    answer: [0],
    explanation: "La memoria no es un recurso comprimible: si el contenedor supera su límite, el kernel lo mata (OOMKilled, código de salida 137). La CPU, en cambio, se limita mediante throttling."
  },
  {
    id: "F030",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "A container repeatedly reaches its CPU limit. What is the effect?",
    options: [
      "The node is cordoned",
      "It is OOMKilled",
      "Its CPU usage is throttled, slowing it down, but it is not killed",
      "The Pod is evicted immediately"
    ],
    answer: [2],
    explanation: "La CPU es un recurso comprimible: al alcanzar el límite el contenedor sufre throttling (CFS quota) y se vuelve más lento, pero no se mata."
  },
  {
    id: "F031",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "In which API group and version is the Deployment resource served?",
    options: [
      "v1 (core group)",
      "apps/v1",
      "extensions/v1beta1",
      "batch/v1"
    ],
    answer: [1],
    explanation: "Deployment, ReplicaSet, StatefulSet y DaemonSet están en apps/v1. Job y CronJob están en batch/v1, y extensions/v1beta1 fue eliminado hace años."
  },
  {
    id: "F032",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which command displays documentation for the fields of a resource, for example the spec of a Pod?",
    options: [
      "kubectl describe pod",
      "kubectl explain pod.spec",
      "kubectl api-versions pod",
      "kubectl get pod --docs"
    ],
    answer: [1],
    explanation: "kubectl explain consulta el esquema OpenAPI del servidor y documenta cada campo (por ejemplo kubectl explain pod.spec.containers). kubectl describe muestra el estado de un objeto concreto, no la documentación del esquema."
  },
  {
    id: "F033",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which statement about static Pods is correct?",
    options: [
      "They are Pods without labels",
      "They can only run on worker nodes",
      "They are created by the scheduler and cannot be deleted",
      "They are managed directly by the kubelet from manifest files on the node, such as /etc/kubernetes/manifests"
    ],
    answer: [3],
    explanation: "El kubelet vigila un directorio local y ejecuta los manifiestos que encuentra; el API server solo ve un 'mirror Pod' de solo lectura. kubeadm despliega así los componentes del control plane."
  },
  {
    id: "F034",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "What is the primary purpose of a CustomResourceDefinition (CRD)?",
    options: [
      "To extend the Kubernetes API with new resource types",
      "To define a new container runtime",
      "To define custom DNS records",
      "To customize the scheduler's scoring algorithm"
    ],
    answer: [0],
    explanation: "Un CRD registra un nuevo tipo de recurso en el API server, que luego se gestiona con kubectl y RBAC como cualquier objeto nativo."
  },
  {
    id: "F035",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "What does the Operator pattern combine to automate the management of a complex application?",
    options: [
      "An admission webhook and a PodDisruptionBudget",
      "A Helm chart and a CI pipeline",
      "Custom resources and a custom controller that encodes operational knowledge",
      "A DaemonSet and a NodePort Service"
    ],
    answer: [2],
    explanation: "Un Operator combina uno o más CRDs con un controlador que los reconcilia aplicando conocimiento operativo (backups, upgrades, failover) como lo haría un operador humano."
  },
  {
    id: "F036",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "Which two namespaces exist by default in a newly created cluster? (Choose 2)",
    options: [
      "kube-monitoring",
      "kube-apps",
      "kube-system",
      "kube-public"
    ],
    answer: [2,3],
    explanation: "Un clúster nuevo trae default, kube-system, kube-public y kube-node-lease. kube-monitoring y kube-apps no existen por defecto."
  },
  {
    id: "F037",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "An etcd cluster has 3 members. How many member failures can it tolerate while keeping quorum?",
    options: [
      "0",
      "1",
      "2",
      "3"
    ],
    answer: [1],
    explanation: "El quórum es la mayoría (n/2 + 1). Con 3 miembros se necesitan 2, así que tolera 1 fallo; con 5 tolera 2. Por eso se usan números impares de miembros."
  },
  {
    id: "F038",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Which container spec field injects all key-value pairs of a ConfigMap as environment variables?",
    options: [
      "envFrom with configMapRef",
      "volumeMounts",
      "args",
      "env with valueFrom.secretKeyRef"
    ],
    answer: [0],
    explanation: "envFrom con configMapRef carga todas las claves del ConfigMap como variables de entorno. env.valueFrom.configMapKeyRef sirve para una sola clave y secretKeyRef es para Secrets."
  },
  {
    id: "F039",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "What is the purpose of a finalizer in an object's metadata?",
    options: [
      "To mark an object as read-only",
      "To define the last container to stop in a Pod",
      "To set the object's time-to-live",
      "To block deletion until a controller performs cleanup and removes the finalizer"
    ],
    answer: [3],
    explanation: "Mientras existan finalizers, el objeto queda con deletionTimestamp en estado Terminating; el controlador responsable hace la limpieza (por ejemplo, liberar un recurso externo) y quita el finalizer para que el borrado se complete."
  },
  {
    id: "F040",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 3,
    q: "Which two restartPolicy values are valid for the Pod template of a Job? (Choose 2)",
    options: [
      "Never",
      "OnFailure",
      "Always",
      "UntilSuccess"
    ],
    answer: [0,1],
    explanation: "Un Job solo admite Never u OnFailure, ya que Always contradiría la idea de ejecutar hasta completarse. UntilSuccess no existe."
  },
  {
    id: "F041",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Where does kubectl look for its configuration by default when the KUBECONFIG environment variable is not set?",
    options: [
      "./kubeconfig.yaml in the current directory",
      "$HOME/.kube/config",
      "/var/lib/kubelet/config.yaml",
      "/etc/kubernetes/admin.conf"
    ],
    answer: [1],
    explanation: "Por defecto kubectl lee ~/.kube/config. La variable KUBECONFIG o la opción --kubeconfig permiten usar otros archivos (incluso fusionar varios)."
  },
  {
    id: "F042",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "A context in a kubeconfig file is a combination of which elements?",
    options: [
      "A user, a Role and a RoleBinding",
      "A server, a port and a token",
      "A cluster, a user and an optional default namespace",
      "A cluster, a node and a Pod"
    ],
    answer: [2],
    explanation: "Un contexto asocia una entrada de cluster (servidor y CA), unas credenciales de usuario y opcionalmente un namespace por defecto. Cambiar de contexto cambia a qué clúster y con qué identidad se conecta kubectl."
  },
  {
    id: "F043",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Which command switches kubectl to a different context named staging?",
    options: [
      "kubectl context staging",
      "kubectl switch staging",
      "kubectl config set-cluster staging",
      "kubectl config use-context staging"
    ],
    answer: [3],
    explanation: "kubectl config use-context cambia el current-context del kubeconfig. kubectl config get-contexts lista los disponibles; set-cluster solo define una entrada de clúster."
  },
  {
    id: "F044",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Which command sets the default namespace to dev for the current context?",
    options: [
      "kubectl config use-namespace dev",
      "kubectl config set-context --current --namespace=dev",
      "kubectl namespace dev",
      "kubectl set namespace dev"
    ],
    answer: [1],
    explanation: "Modifica el contexto actual en el kubeconfig para que los comandos sin -n usen dev. Las otras opciones no son comandos válidos de kubectl."
  },
  {
    id: "F045",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "In what order does the API server process an incoming write request?",
    options: [
      "Admission control, authentication, authorization",
      "Authentication, admission control, authorization",
      "Authentication, authorization, admission control",
      "Authorization, authentication, admission control"
    ],
    answer: [2],
    explanation: "Primero se identifica al cliente (autenticación), luego se comprueba si puede realizar la acción (autorización, por ejemplo RBAC) y finalmente los admission controllers mutan y validan el objeto antes de persistirlo en etcd."
  },
  {
    id: "F046",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Before performing maintenance on a node, you want to safely evict its Pods and mark it unschedulable. Which command does this?",
    options: [
      "kubectl drain node1 --ignore-daemonsets",
      "kubectl cordon node1",
      "kubectl taint node node1 maintenance=true:PreferNoSchedule",
      "kubectl delete node node1"
    ],
    answer: [0],
    explanation: "drain marca el nodo como no programable y desaloja los Pods respetando los PodDisruptionBudgets. cordon solo impide nuevos Pods sin desalojar los existentes, y borrar el nodo no desaloja de forma ordenada."
  },
  {
    id: "F047",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "After node maintenance is finished, which command allows new Pods to be scheduled on the node again?",
    options: [
      "kubectl resume node1",
      "kubectl schedule node1",
      "kubectl undrain node1",
      "kubectl uncordon node1"
    ],
    answer: [3],
    explanation: "uncordon elimina la marca unschedulable del nodo. Los Pods desalojados no vuelven solos; los nuevos Pods podrán colocarse ahí."
  },
  {
    id: "F048",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Which tool from the Kubernetes project bootstraps a cluster with 'init' on the first control plane node and 'join' on the remaining nodes?",
    options: [
      "kubectl",
      "kubelet",
      "kubeadm",
      "minikube"
    ],
    answer: [2],
    explanation: "kubeadm init crea el control plane y kubeadm join añade nodos. minikube y kind crean clústeres locales de desarrollo, y kubectl es el cliente de la API."
  },
  {
    id: "F049",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "When upgrading a kubeadm-based cluster, which approach is recommended?",
    options: [
      "Upgrade etcd last, after all worker nodes",
      "Upgrade the control plane first, then the nodes, one minor version at a time",
      "Upgrade all components simultaneously, skipping minor versions if needed",
      "Upgrade the worker kubelets first, then the control plane"
    ],
    answer: [1],
    explanation: "El control plane va primero porque el kubelet nunca debe ser más nuevo que el kube-apiserver, y no se deben saltar versiones menores (por ejemplo 1.33 -> 1.34 -> 1.35)."
  },
  {
    id: "F050",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "According to the Kubernetes version skew policy, which statement about the kubelet is correct?",
    options: [
      "The kubelet must not be newer than the kube-apiserver and may be up to three minor versions older",
      "The kubelet may be newer than the kube-apiserver",
      "The kubelet may be up to five minor versions older",
      "The kubelet must always match the kube-apiserver version exactly"
    ],
    answer: [0],
    explanation: "Desde Kubernetes 1.28 el kubelet puede ir hasta tres versiones menores por detrás del kube-apiserver, pero nunca por delante."
  },
  {
    id: "F051",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Which command creates a snapshot backup of etcd?",
    options: [
      "etcdctl snapshot save backup.db",
      "kubeadm etcd export",
      "kubectl backup etcd",
      "etcd --dump-all"
    ],
    answer: [0],
    explanation: "etcdctl snapshot save (indicando endpoints y certificados) genera una copia consistente del keyspace; la restauración se hace con etcdutl snapshot restore. Las otras opciones no existen."
  },
  {
    id: "F052",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Which command lists all resource types available in the cluster, including their short names, API group and whether they are namespaced?",
    options: [
      "kubectl api-versions",
      "kubectl api-resources",
      "kubectl get all",
      "kubectl cluster-info"
    ],
    answer: [1],
    explanation: "kubectl api-resources lista tipos, shortnames, grupo API y si son namespaced. api-versions solo lista grupos/versiones, y 'get all' muestra solo algunos tipos de objetos existentes."
  },
  {
    id: "F053",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Which two commands list Pods across all namespaces? (Choose 2)",
    options: [
      "kubectl get pods --all-namespaces",
      "kubectl get pods --namespace=any",
      "kubectl get pods -n all",
      "kubectl get pods -A"
    ],
    answer: [0,3],
    explanation: "-A es la forma corta de --all-namespaces. 'all' o 'any' no son nombres especiales de namespace; kubectl buscaría un namespace con ese nombre."
  },
  {
    id: "F054",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Which kubectl usage follows the declarative approach?",
    options: [
      "kubectl run nginx --image=nginx",
      "kubectl create deployment web --image=nginx",
      "kubectl apply -f manifests/",
      "kubectl scale deployment web --replicas=3"
    ],
    answer: [2],
    explanation: "kubectl apply -f compara el estado deseado de los manifiestos con el del clúster y aplica las diferencias; es la base de GitOps. run, create y scale son comandos imperativos."
  },
  {
    id: "F055",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "How can you generate a Deployment manifest without creating the object in the cluster?",
    options: [
      "kubectl explain deployment -o yaml",
      "kubectl get deployment web --export",
      "kubectl apply --preview deployment web",
      "kubectl create deployment web --image=nginx --dry-run=client -o yaml"
    ],
    answer: [3],
    explanation: "--dry-run=client -o yaml imprime el objeto que se crearía sin enviarlo al servidor. La opción --export fue eliminada y explain solo muestra documentación."
  },
  {
    id: "F056",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Which object limits the total CPU, memory and number of objects that can be consumed in a namespace?",
    options: [
      "ResourceQuota",
      "LimitRange",
      "PodDisruptionBudget",
      "PriorityClass"
    ],
    answer: [0],
    explanation: "ResourceQuota fija topes agregados por namespace. LimitRange define valores por defecto y mínimos/máximos por contenedor o Pod, no el total del namespace."
  },
  {
    id: "F057",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "A namespace has a LimitRange with default requests and limits. What happens when a Pod without resource settings is created there?",
    options: [
      "It becomes Guaranteed regardless of the values",
      "It is scheduled only on control plane nodes",
      "It is rejected",
      "The default requests and limits are applied to its containers"
    ],
    answer: [3],
    explanation: "El admission controller LimitRanger inyecta los valores por defecto en los contenedores que no los declaran (y rechaza los que violen mínimos o máximos)."
  },
  {
    id: "F058",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "In a managed Kubernetes service such as EKS, AKS or GKE, which part is typically operated by the cloud provider?",
    options: [
      "The application Deployments",
      "The Helm charts of the applications",
      "The control plane (API server, etcd, scheduler and controllers)",
      "The container images"
    ],
    answer: [2],
    explanation: "En los servicios gestionados el proveedor opera, escala y actualiza el control plane; el usuario gestiona sus cargas de trabajo y, según el modo, también los nodos."
  },
  {
    id: "F059",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Which API version naming indicates a stable, generally available API suitable for production?",
    options: [
      "v2beta1",
      "v1",
      "v1beta3",
      "v1alpha1"
    ],
    answer: [1],
    explanation: "Las versiones sin sufijo (v1, v2) son GA/estables. Las alpha pueden cambiar o desaparecer y suelen estar deshabilitadas por defecto; las beta están probadas pero aún pueden cambiar."
  },
  {
    id: "F060",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Which Pod spec field provides the simplest way to constrain a Pod to nodes that have a specific label?",
    options: [
      "nodeSelector",
      "topologySpreadConstraints",
      "priorityClassName",
      "tolerations"
    ],
    answer: [0],
    explanation: "nodeSelector exige que el nodo tenga todos los labels indicados. Las tolerations solo permiten tolerar taints, priorityClassName define la prioridad y topologySpreadConstraints reparte réplicas."
  },
  {
    id: "F061",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "What are the two main phases the kube-scheduler uses to place a Pod?",
    options: [
      "Pulling and running",
      "Admission and validation",
      "Filtering to find feasible nodes, then scoring to rank them",
      "Draining and cordoning"
    ],
    answer: [2],
    explanation: "En el filtrado se descartan nodos que no cumplen requisitos (recursos, taints, afinidad); en la puntuación se ordenan los restantes y se elige el de mayor puntaje. Luego se hace el binding del Pod al nodo."
  },
  {
    id: "F062",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "A node has the taint dedicated=gpu:NoSchedule. What does a Pod need in order to be scheduled on that node?",
    options: [
      "Nothing; taints only affect DaemonSets",
      "A matching nodeSelector",
      "A PriorityClass with a value above 1000",
      "A toleration that matches the taint"
    ],
    answer: [3],
    explanation: "Los taints repelen Pods y solo los que tienen una toleration coincidente pueden programarse ahí. Ojo: la toleration permite pero no obliga; para atraer el Pod al nodo se combina con node affinity o nodeSelector."
  },
  {
    id: "F063",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Which taint effect also evicts Pods that are already running on the node and do not tolerate the taint?",
    options: [
      "PreferNoSchedule",
      "NoExecute",
      "NoSchedule",
      "NoEvict"
    ],
    answer: [1],
    explanation: "NoExecute impide nuevos Pods y desaloja los existentes sin toleration (opcionalmente tras tolerationSeconds). NoSchedule solo afecta a nuevos Pods y PreferNoSchedule es una preferencia blanda. NoEvict no existe."
  },
  {
    id: "F064",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Why are application Pods normally not scheduled on kubeadm control plane nodes?",
    options: [
      "Control plane nodes have no container runtime",
      "They carry the taint node-role.kubernetes.io/control-plane:NoSchedule",
      "The scheduler ignores nodes that run etcd",
      "Control plane nodes do not run a kubelet"
    ],
    answer: [1],
    explanation: "kubeadm aplica ese taint a los nodos de control plane; solo los Pods que lo toleran (componentes del sistema) se programan allí. Esos nodos sí tienen kubelet y runtime para ejecutar los static Pods."
  },
  {
    id: "F065",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Which two statements about node affinity are correct? (Choose 2)",
    options: [
      "requiredDuringSchedulingIgnoredDuringExecution is a hard rule that must be met for the Pod to be scheduled",
      "Node affinity can only match a single label value",
      "preferredDuringSchedulingIgnoredDuringExecution expresses a soft preference with a weight",
      "Node affinity evicts running Pods when node labels change"
    ],
    answer: [0,2],
    explanation: "'IgnoredDuringExecution' significa que cambios posteriores en los labels no desalojan Pods ya en ejecución. La afinidad admite operadores como In, NotIn, Exists, Gt y Lt, con múltiples valores."
  },
  {
    id: "F066",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "You want the replicas of a web Deployment to run on different nodes so that a single node failure does not take down all of them. What should you configure?",
    options: [
      "podAntiAffinity with topologyKey kubernetes.io/hostname",
      "podAffinity with topologyKey kubernetes.io/hostname",
      "A NoExecute taint on every node",
      "A fixed nodeName for each replica"
    ],
    answer: [0],
    explanation: "La anti-afinidad de Pods con topologyKey kubernetes.io/hostname evita que dos réplicas coincidan en el mismo nodo. podAffinity haría lo contrario (agruparlas). topologySpreadConstraints es otra alternativa válida."
  },
  {
    id: "F067",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Which feature spreads Pods evenly across failure domains such as zones or nodes, controlled by a maxSkew value?",
    options: [
      "podAffinity",
      "ResourceQuota",
      "DaemonSet",
      "topologySpreadConstraints"
    ],
    answer: [3],
    explanation: "topologySpreadConstraints limita la diferencia (maxSkew) de Pods entre dominios de topología definidos por un topologyKey, por ejemplo topology.kubernetes.io/zone."
  },
  {
    id: "F068",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "When deciding whether a Pod fits on a node, which values does the scheduler use?",
    options: [
      "The size of the container image",
      "The current usage reported by metrics-server",
      "The containers' requests",
      "The containers' limits"
    ],
    answer: [2],
    explanation: "El scheduler compara la suma de requests con la capacidad asignable (allocatable) del nodo. Los limits y el uso real no se usan para decidir la colocación."
  },
  {
    id: "F069",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "A Pod stays in Pending and its events show '0/3 nodes are available: 3 Insufficient memory.' What is the most likely cause?",
    options: [
      "The Pod's memory request is larger than the allocatable memory still available on every node",
      "The Service selector is wrong",
      "The image cannot be pulled",
      "The liveness probe is failing"
    ],
    answer: [0],
    explanation: "El mensaje indica que ningún nodo tiene memoria asignable suficiente para el request del Pod. Soluciones: reducir requests, liberar capacidad o añadir nodos (por ejemplo con Cluster Autoscaler)."
  },
  {
    id: "F070",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "What happens when spec.nodeName is set directly in a Pod manifest?",
    options: [
      "The Pod is converted into a DaemonSet",
      "The Pod is rejected by the API server",
      "The scheduler still scores all nodes and may choose another one",
      "The scheduler is bypassed and the kubelet on that node runs the Pod"
    ],
    answer: [3],
    explanation: "Con nodeName fijado el Pod ya está 'asignado', así que el scheduler lo ignora y el kubelet de ese nodo intenta ejecutarlo, aunque no haya recursos suficientes."
  },
  {
    id: "F071",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Which object assigns a relative importance to Pods so that the scheduler can preempt lower-priority Pods when resources are scarce?",
    options: [
      "ResourceQuota",
      "PriorityClass",
      "PodDisruptionBudget",
      "RuntimeClass"
    ],
    answer: [1],
    explanation: "Un PriorityClass asigna un valor numérico de prioridad; si un Pod de alta prioridad no cabe, el scheduler puede desalojar (preempt) Pods de menor prioridad."
  },
  {
    id: "F072",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "How can a Pod be scheduled by a custom scheduler instead of the default one?",
    options: [
      "Create the Pod in the kube-system namespace",
      "Set nodeSelector scheduler=custom",
      "Set spec.schedulerName to the custom scheduler's name",
      "Add a toleration named custom-scheduler"
    ],
    answer: [2],
    explanation: "Kubernetes permite varios schedulers; cada Pod elige el suyo con spec.schedulerName (por defecto 'default-scheduler')."
  },
  {
    id: "F073",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "What does kubectl cordon do to a node?",
    options: [
      "Deletes all Pods running on it",
      "Adds a NoExecute taint that evicts all Pods",
      "Removes it from the cluster",
      "Marks it unschedulable so no new Pods are placed there, while existing Pods keep running"
    ],
    answer: [3],
    explanation: "cordon marca el nodo como unschedulable; los Pods existentes siguen corriendo. Para desalojarlos de forma ordenada se usa kubectl drain."
  },
  {
    id: "F074",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Which object limits how many Pods of an application can be voluntarily disrupted at the same time, for example during a node drain?",
    options: [
      "LimitRange",
      "HorizontalPodAutoscaler",
      "PodDisruptionBudget",
      "PriorityClass"
    ],
    answer: [2],
    explanation: "Un PodDisruptionBudget define minAvailable o maxUnavailable para disrupciones voluntarias (drain, upgrades). No protege contra fallos involuntarios como la caída de un nodo."
  },
  {
    id: "F075",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "What is the purpose of Pod scheduling gates (spec.schedulingGates)?",
    options: [
      "To limit the number of Pods per node",
      "To hold a Pod back from scheduling until a controller removes all of its gates",
      "To make Pods skip the scheduler entirely",
      "To choose the container runtime for the Pod"
    ],
    answer: [1],
    explanation: "Mientras existan schedulingGates el Pod queda en estado SchedulingGated y el scheduler no lo considera; es útil para gestores de colas o cuotas externas (GA desde Kubernetes 1.30)."
  },
  {
    id: "F076",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Which Kubernetes feature, generally available since v1.34, lets Pods request specialized hardware such as GPUs through ResourceClaims and DeviceClasses?",
    options: [
      "Dynamic Resource Allocation (DRA)",
      "PriorityClass",
      "Device Plugin API v1alpha1",
      "RuntimeClass"
    ],
    answer: [0],
    explanation: "DRA permite reclamar dispositivos de forma flexible mediante ResourceClaims y DeviceClasses, y el scheduler los asigna. Complementa al modelo clásico de device plugins con recursos extendidos (por ejemplo nvidia.com/gpu)."
  },
  {
    id: "F077",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Which two mechanisms constrain or attract Pods to particular nodes based on node labels? (Choose 2)",
    options: [
      "PodDisruptionBudget",
      "nodeSelector",
      "Node affinity",
      "Taints"
    ],
    answer: [1,2],
    explanation: "nodeSelector y node affinity se basan en labels de los nodos. Los taints son una propiedad distinta del nodo que repele Pods (no se basan en labels) y un PDB solo limita disrupciones voluntarias."
  },
  {
    id: "F078",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "What is the key difference between containers and virtual machines?",
    options: [
      "Containers require a hypervisor to run",
      "Containers share the host kernel and isolate processes, while VMs run a full guest OS on a hypervisor",
      "Containers include a full guest operating system",
      "VMs usually start faster than containers"
    ],
    answer: [1],
    explanation: "Los contenedores son procesos aislados que comparten el kernel del host, por lo que son ligeros y arrancan en segundos. Las VMs virtualizan hardware y cada una ejecuta su propio sistema operativo invitado."
  },
  {
    id: "F079",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which two Linux kernel features are the foundation of container isolation and resource control? (Choose 2)",
    options: [
      "Namespaces",
      "systemd units",
      "Cron tables",
      "Control groups (cgroups)"
    ],
    answer: [0,3],
    explanation: "Los namespaces aíslan lo que ve el proceso (PID, red, mount, usuario, etc.) y los cgroups limitan y contabilizan recursos como CPU y memoria. systemd y cron no proporcionan aislamiento."
  },
  {
    id: "F080",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which organization defines the open industry specifications for container image format, runtime and distribution?",
    options: [
      "Cloud Native Computing Foundation (CNCF)",
      "Docker Inc.",
      "Open Container Initiative (OCI)",
      "Internet Engineering Task Force (IETF)"
    ],
    answer: [2],
    explanation: "La OCI (bajo la Linux Foundation) mantiene la Image Spec, la Runtime Spec y la Distribution Spec, que permiten que imágenes y runtimes de distintos proveedores sean interoperables."
  },
  {
    id: "F081",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which component is a low-level OCI runtime that actually creates containers using namespaces and cgroups?",
    options: [
      "containerd",
      "kubelet",
      "CRI-O",
      "runc"
    ],
    answer: [3],
    explanation: "runc es la implementación de referencia de la OCI Runtime Spec. containerd y CRI-O son runtimes de alto nivel que implementan CRI y delegan la creación del contenedor en runc (u otro runtime OCI como crun)."
  },
  {
    id: "F082",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which interface does the kubelet use to talk to container runtimes such as containerd and CRI-O?",
    options: [
      "CRI",
      "CSI",
      "CNI",
      "OCI Distribution Spec"
    ],
    answer: [0],
    explanation: "La Container Runtime Interface (CRI) es una API gRPC entre el kubelet y el runtime. CNI es para red, CSI para almacenamiento y la Distribution Spec define cómo se distribuyen imágenes desde registries."
  },
  {
    id: "F083",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Kubernetes 1.24 removed dockershim. What does this mean for images built with Docker?",
    options: [
      "They can no longer run on Kubernetes",
      "They must be converted to VM images",
      "They must be rebuilt with Podman",
      "They still run, because Docker builds OCI-compliant images that containerd and CRI-O can run"
    ],
    answer: [3],
    explanation: "Se eliminó solo el adaptador que permitía al kubelet usar Docker Engine como runtime. Las imágenes construidas con Docker siguen el estándar OCI y funcionan igual con containerd o CRI-O."
  },
  {
    id: "F084",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "In a Dockerfile, what is the main benefit of a multi-stage build?",
    options: [
      "It runs the container on multiple nodes",
      "It enables automatic horizontal scaling",
      "It produces a smaller final image by copying only the required artifacts from earlier build stages",
      "It allows multiple ENTRYPOINT instructions to run in parallel"
    ],
    answer: [2],
    explanation: "Las etapas de compilación incluyen compiladores y dependencias de build; la etapa final copia solo el binario o artefacto, reduciendo tamaño y superficie de ataque."
  },
  {
    id: "F085",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Why is referencing an image by digest (image@sha256:...) considered more reliable than using a tag such as :latest?",
    options: [
      "Digests skip registry authentication",
      "A digest identifies immutable image content, while tags can be moved to point to different images",
      "Tags are not supported by containerd",
      "Digests download faster"
    ],
    answer: [1],
    explanation: "El digest es el hash del contenido: siempre resuelve exactamente a la misma imagen. Una etiqueta es un puntero mutable que puede reasignarse, lo que rompe la reproducibilidad."
  },
  {
    id: "F086",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "What is the default imagePullPolicy for a container whose image uses the :latest tag or no tag at all?",
    options: [
      "Always",
      "Never",
      "IfNotPresent",
      "OnFailure"
    ],
    answer: [0],
    explanation: "Si la etiqueta es :latest o se omite, el valor por defecto es Always; con cualquier otra etiqueta (o un digest) es IfNotPresent. OnFailure no es un valor de imagePullPolicy."
  },
  {
    id: "F087",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which Dockerfile instruction provides default arguments that are easily overridden at runtime and is often combined with ENTRYPOINT?",
    options: [
      "FROM",
      "COPY",
      "RUN",
      "CMD"
    ],
    answer: [3],
    explanation: "CMD define el comando o los argumentos por defecto; en Kubernetes se sobrescribe con 'args' (y ENTRYPOINT con 'command'). RUN se ejecuta durante la construcción de la imagen, no al arrancar el contenedor."
  },
  {
    id: "F088",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "How should a Pod authenticate to a private container registry in order to pull images?",
    options: [
      "Reference a Secret of type kubernetes.io/dockerconfigjson in imagePullSecrets, directly or through the ServiceAccount",
      "Store the password in a Pod annotation",
      "Put the credentials in a ConfigMap",
      "Set imagePullPolicy: Never"
    ],
    answer: [0],
    explanation: "imagePullSecrets referencia un Secret con las credenciales del registry; puede declararse en el Pod o asociarse a la ServiceAccount para que se aplique a todos sus Pods."
  },
  {
    id: "F089",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which command-line tool is designed to inspect and debug containers through the CRI directly on a Kubernetes node?",
    options: [
      "kubeadm",
      "docker",
      "crictl",
      "helm"
    ],
    answer: [2],
    explanation: "crictl habla con cualquier runtime compatible con CRI (containerd, CRI-O) y permite listar Pods, contenedores e imágenes en el nodo. En nodos sin Docker Engine el comando docker no ve esos contenedores."
  },
  {
    id: "F090",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "What is an image layer?",
    options: [
      "A network namespace assigned to a container",
      "A read-only set of filesystem changes produced by a build instruction, which can be cached and shared between images",
      "A Kubernetes volume type",
      "A running process inside a container"
    ],
    answer: [1],
    explanation: "Cada instrucción que modifica el sistema de archivos crea una capa inmutable; las capas se apilan, se cachean y se comparten entre imágenes, ahorrando espacio y tiempo de descarga."
  },
  {
    id: "F091",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which Kubernetes resource lets you choose a different container runtime configuration, such as gVisor or Kata Containers, for specific Pods?",
    options: [
      "PriorityClass",
      "IngressClass",
      "StorageClass",
      "RuntimeClass"
    ],
    answer: [3],
    explanation: "RuntimeClass mapea un nombre a un handler configurado en el runtime del nodo; los Pods lo seleccionan con spec.runtimeClassName para obtener, por ejemplo, aislamiento reforzado con sandboxes."
  },
  {
    id: "F092",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which practice best follows cloud native container guidelines?",
    options: [
      "Run several unrelated processes in one container managed by a supervisor",
      "Use a minimal base image, run as a non-root user and run one main process per container",
      "Bake environment-specific configuration into the image",
      "Store application state inside the container's writable layer"
    ],
    answer: [1],
    explanation: "Imágenes mínimas reducen vulnerabilidades, no-root limita el impacto de un compromiso y un proceso por contenedor simplifica logs, probes y escalado. El estado y la configuración deben vivir fuera de la imagen."
  },
  {
    id: "F093",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "According to the CNCF definition, which technologies exemplify the cloud native approach?",
    options: [
      "Bare-metal servers configured manually",
      "Mainframes, batch windows and tape backups",
      "Containers, service meshes, microservices, immutable infrastructure and declarative APIs",
      "Monolithic applications deployed via FTP"
    ],
    answer: [2],
    explanation: "La definición de la CNCF menciona contenedores, service meshes, microservicios, infraestructura inmutable y APIs declarativas como ejemplos que permiten sistemas resilientes, gestionables y observables."
  },
  {
    id: "F094",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "What does 'immutable infrastructure' mean in a cloud native context?",
    options: [
      "Components are replaced with new versions built from a definition instead of being modified after deployment",
      "Servers are patched in place via SSH",
      "Infrastructure can never be scaled",
      "Configuration can only be stored inside container images"
    ],
    answer: [0],
    explanation: "En lugar de modificar instancias en ejecución, se construye una nueva versión (imagen o nodo) y se reemplaza la anterior; esto elimina la deriva de configuración y facilita los rollbacks."
  },
  {
    id: "F095",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which two are high-level container runtimes that implement the Kubernetes CRI? (Choose 2)",
    options: [
      "crun",
      "containerd",
      "CRI-O",
      "runc"
    ],
    answer: [1,2],
    explanation: "containerd y CRI-O implementan CRI y gestionan imágenes y ciclo de vida. runc y crun son runtimes OCI de bajo nivel que ellos invocan para crear los contenedores."
  },
  {
    id: "O001",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which statement reflects the Kubernetes networking model?",
    options: [
      "Pods can only communicate with Pods in the same namespace",
      "Pods on different nodes must use NAT to communicate",
      "Each container in a Pod gets a different IP address",
      "Every Pod gets its own IP address and can reach all other Pods without NAT"
    ],
    answer: [3],
    explanation: "El modelo de red de Kubernetes exige una red plana: cada Pod tiene su propia IP y puede comunicarse con cualquier otro Pod sin NAT. Los contenedores de un Pod comparten IP, y el aislamiento por namespace solo se logra con NetworkPolicies."
  },
  {
    id: "O002",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which component is responsible for assigning Pod IP addresses and wiring the Pod network interfaces?",
    options: [
      "The CNI plugin invoked by the container runtime",
      "CoreDNS",
      "kube-scheduler",
      "kube-proxy"
    ],
    answer: [0],
    explanation: "Al crear el sandbox del Pod, el runtime invoca el plugin CNI (Calico, Cilium, Flannel, etc.), que crea la interfaz y asigna la IP (IPAM). kube-proxy solo implementa Services y CoreDNS resuelve nombres."
  },
  {
    id: "O003",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "What is the default Service type when none is specified?",
    options: [
      "ExternalName",
      "ClusterIP",
      "LoadBalancer",
      "NodePort"
    ],
    answer: [1],
    explanation: "ClusterIP es el tipo por defecto: asigna una IP virtual accesible solo dentro del clúster. NodePort y LoadBalancer exponen el Service hacia fuera, y ExternalName es un alias DNS."
  },
  {
    id: "O004",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "What is the default port range used for NodePort Services?",
    options: [
      "1-1024",
      "8000-9000",
      "30000-32767",
      "49152-65535"
    ],
    answer: [2],
    explanation: "Por defecto el API server asigna NodePorts en el rango 30000-32767 (configurable con --service-node-port-range). Ese puerto se abre en todos los nodos."
  },
  {
    id: "O005",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which Service type maps a Service to an external DNS name by returning a CNAME record, without any proxying?",
    options: [
      "ClusterIP",
      "LoadBalancer",
      "ExternalName",
      "NodePort"
    ],
    answer: [2],
    explanation: "Un Service ExternalName no tiene selector ni IP: CoreDNS responde con un CNAME hacia el nombre externo (por ejemplo, una base de datos gestionada)."
  },
  {
    id: "O006",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "How do you create a headless Service?",
    options: [
      "Set clusterIP: None",
      "Omit the ports section",
      "Set type: Headless",
      "Set externalTrafficPolicy: Local"
    ],
    answer: [0],
    explanation: "Con clusterIP: None no se asigna IP virtual ni hay balanceo de kube-proxy; el DNS devuelve directamente las IPs de los Pods. Es lo que usan los StatefulSets para nombres estables por Pod. 'Headless' no es un valor válido de type."
  },
  {
    id: "O007",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "What is the fully qualified DNS name of a Service named api in the namespace shop, assuming the default cluster domain?",
    options: [
      "shop.api.svc.cluster.local",
      "api.svc.shop.local",
      "api.shop.svc.cluster.local",
      "api.shop.cluster.local"
    ],
    answer: [2],
    explanation: "El formato es <service>.<namespace>.svc.<dominio-del-clúster>. Desde el mismo namespace basta con 'api' y desde otro con 'api.shop', gracias a los dominios de búsqueda configurados en el Pod."
  },
  {
    id: "O008",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which component provides DNS-based service discovery in most Kubernetes clusters?",
    options: [
      "Envoy",
      "CoreDNS",
      "etcd",
      "kube-dns-proxy"
    ],
    answer: [1],
    explanation: "CoreDNS (proyecto graduado de la CNCF) es el DNS por defecto del clúster; corre como Deployment en kube-system y resuelve nombres de Services y Pods."
  },
  {
    id: "O009",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which resource tracks, in a scalable way, the network endpoints (Pod IPs and ports) that back a Service?",
    options: [
      "NetworkPolicy",
      "ServicePort",
      "IngressClass",
      "EndpointSlice"
    ],
    answer: [3],
    explanation: "EndpointSlice divide los endpoints en porciones para escalar a miles de Pods; kube-proxy y otros consumidores la leen. La API v1 Endpoints está obsoleta desde Kubernetes 1.33."
  },
  {
    id: "O010",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "What is required for an Ingress resource to have any effect?",
    options: [
      "A special CoreDNS plugin",
      "A dedicated LoadBalancer Service per Ingress",
      "An Ingress controller running in the cluster",
      "A service mesh"
    ],
    answer: [2],
    explanation: "El objeto Ingress solo declara reglas HTTP; un controlador (por ejemplo Traefik, HAProxy, Contour o el de un proveedor cloud) debe leerlas y configurar el proxy. Sin controlador el Ingress no hace nada."
  },
  {
    id: "O011",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which statement about the Gateway API is correct?",
    options: [
      "It is built into kube-proxy and needs no controller",
      "It only supports raw TCP traffic",
      "It is a deprecated alpha API that was replaced by Ingress",
      "It is a GA, role-oriented API that uses resources such as GatewayClass, Gateway and HTTPRoute"
    ],
    answer: [3],
    explanation: "Gateway API (GA desde v1.0 en 2023) es el sucesor de Ingress: separa responsabilidades por rol, es más expresivo (cabeceras, pesos, gRPC, TLS) y, como Ingress, necesita una implementación que la controle."
  },
  {
    id: "O012",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which two Gateway API resources are typically owned by infrastructure providers or cluster operators rather than by application developers? (Choose 2)",
    options: [
      "Service",
      "Gateway",
      "GatewayClass",
      "HTTPRoute"
    ],
    answer: [1,2],
    explanation: "En el modelo de roles, el proveedor de infraestructura define la GatewayClass y el operador del clúster despliega el Gateway (listeners, puertos, TLS). Los desarrolladores gestionan sus HTTPRoute y Services."
  },
  {
    id: "O013",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "The community ingress-nginx controller was retired in 2026. What is the recommended long-term direction for new HTTP routing configurations?",
    options: [
      "Use ExternalName Services for routing",
      "Adopt the Gateway API with a conformant implementation",
      "Expose every application with hostNetwork Pods",
      "Switch all Services to NodePort"
    ],
    answer: [1],
    explanation: "El proyecto ingress-nginx de Kubernetes dejó de recibir mantenimiento en marzo de 2026; la comunidad recomienda migrar a Gateway API (o a otro controlador mantenido). Las otras opciones no ofrecen enrutamiento HTTP L7."
  },
  {
    id: "O014",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "What does a service mesh such as Istio or Linkerd typically provide without changes to application code?",
    options: [
      "Mutual TLS, traffic management, retries and observability between services",
      "Container image builds",
      "Automatic node provisioning",
      "Persistent storage for microservices"
    ],
    answer: [0],
    explanation: "Una service mesh añade una capa de infraestructura para la comunicación entre servicios: mTLS automático, enrutamiento, reintentos, timeouts, circuit breaking y métricas/trazas uniformes."
  },
  {
    id: "O015",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "Traditional service meshes inject a proxy container into every application Pod. What is this pattern called?",
    options: [
      "Init container",
      "DaemonSet gateway",
      "Sidecar",
      "Ambassador node"
    ],
    answer: [2],
    explanation: "El proxy sidecar (por ejemplo Envoy o linkerd2-proxy) intercepta el tráfico del Pod. Istio también ofrece el modo ambient, sin sidecars, con un proxy por nodo (ztunnel) y waypoints L7 opcionales."
  },
  {
    id: "O016",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which two Service types expose an application to clients outside the cluster? (Choose 2)",
    options: [
      "NodePort",
      "ClusterIP",
      "LoadBalancer",
      "Headless (clusterIP: None)"
    ],
    answer: [0,2],
    explanation: "NodePort abre un puerto en cada nodo y LoadBalancer provisiona un balanceador externo (que a su vez usa NodePorts). ClusterIP y los Services headless solo son accesibles dentro del clúster."
  },
  {
    id: "O017",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which kube-proxy mode, generally available since Kubernetes 1.33, uses the modern Linux packet-filtering framework as the successor to iptables?",
    options: [
      "userspace",
      "ipfw",
      "winkernel",
      "nftables"
    ],
    answer: [3],
    explanation: "El modo nftables es GA desde 1.33 y ofrece mejor rendimiento y escalabilidad que iptables. El modo userspace fue eliminado, ipfw no es un modo de kube-proxy y winkernel es el modo para nodos Windows."
  },
  {
    id: "O018",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "What are the 4C's of cloud native security, from the outermost to the innermost layer?",
    options: [
      "Code, Container, Cluster, Cloud",
      "Cloud, Cluster, Container, Code",
      "Cloud, Container, Cluster, Code",
      "Cluster, Cloud, Code, Container"
    ],
    answer: [1],
    explanation: "El modelo de capas es Cloud (o centro de datos), Cluster, Container y Code; cada capa depende de la seguridad de la capa exterior que la contiene."
  },
  {
    id: "O019",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which RBAC object grants permissions within a single namespace?",
    options: [
      "Role",
      "ClusterRoleBinding",
      "ClusterRole",
      "ServiceAccount"
    ],
    answer: [0],
    explanation: "Un Role define reglas (verbos sobre recursos) en un namespace concreto. ClusterRole es de ámbito de clúster, ClusterRoleBinding asigna permisos en todo el clúster y una ServiceAccount es una identidad, no un permiso."
  },
  {
    id: "O020",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "A RoleBinding in the namespace dev references the ClusterRole named view. Which permissions does the subject receive?",
    options: [
      "The view permissions only in the dev namespace",
      "The view permissions in all namespaces",
      "No permissions, because a RoleBinding cannot reference a ClusterRole",
      "cluster-admin permissions"
    ],
    answer: [0],
    explanation: "Un RoleBinding puede referenciar un ClusterRole para reutilizar sus reglas, pero los permisos quedan limitados al namespace del RoleBinding. Para todo el clúster se necesitaría un ClusterRoleBinding."
  },
  {
    id: "O021",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which two statements about Kubernetes RBAC are correct? (Choose 2)",
    options: [
      "A Role can contain explicit deny rules",
      "A ClusterRoleBinding grants the referenced permissions across the whole cluster",
      "RBAC rules are defined in NetworkPolicy objects",
      "RBAC permissions are purely additive; there are no deny rules"
    ],
    answer: [1,3],
    explanation: "RBAC solo concede permisos (todo lo no permitido está denegado) y un ClusterRoleBinding aplica en todos los namespaces. No hay reglas 'deny' y NetworkPolicy controla tráfico de red, no acceso a la API."
  },
  {
    id: "O022",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which identity do processes running inside a Pod use to authenticate to the Kubernetes API?",
    options: [
      "The kubeconfig of the node",
      "A ServiceAccount",
      "The Node object",
      "A User object"
    ],
    answer: [1],
    explanation: "Cada Pod se ejecuta con una ServiceAccount (default si no se indica) y recibe un token proyectado, de duración limitada, para autenticarse. Kubernetes no tiene objetos User."
  },
  {
    id: "O023",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "How can you check whether your current identity is allowed to delete Deployments in the namespace prod?",
    options: [
      "kubectl describe user me",
      "kubectl rbac verify deployments",
      "kubectl auth can-i delete deployments -n prod",
      "kubectl get rolebindings --check"
    ],
    answer: [2],
    explanation: "kubectl auth can-i consulta al API server (SelfSubjectAccessReview) si la acción está permitida; con --as se puede comprobar en nombre de otro usuario o ServiceAccount. Las demás opciones no existen."
  },
  {
    id: "O024",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which policy levels are defined by the Pod Security Standards?",
    options: [
      "Low, Medium and High",
      "Permissive, Enforcing and Disabled",
      "Open, Standard and Hardened",
      "Privileged, Baseline and Restricted"
    ],
    answer: [3],
    explanation: "Privileged no impone restricciones, Baseline evita escaladas de privilegio conocidas y Restricted aplica las mejores prácticas de endurecimiento (no-root, sin capabilities, seccomp, etc.)."
  },
  {
    id: "O025",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which namespace label makes Pod Security Admission reject Pods that violate the restricted standard?",
    options: [
      "admission.k8s.io/restricted: true",
      "security.kubernetes.io/policy: restricted",
      "psp.kubernetes.io/level: restricted",
      "pod-security.kubernetes.io/enforce: restricted"
    ],
    answer: [3],
    explanation: "Pod Security Admission se configura con labels en el namespace con el formato pod-security.kubernetes.io/<modo>: <nivel>. Las otras etiquetas no son reconocidas por el controlador."
  },
  {
    id: "O026",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Besides enforce, which two Pod Security Admission modes exist? (Choose 2)",
    options: [
      "audit",
      "dry-run",
      "warn",
      "mutate"
    ],
    answer: [0,2],
    explanation: "enforce rechaza los Pods que violan el nivel, audit registra la violación en el log de auditoría y warn devuelve una advertencia al usuario. Pod Security Admission no muta Pods."
  },
  {
    id: "O027",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which built-in mechanism replaced PodSecurityPolicy, which was removed in Kubernetes 1.25?",
    options: [
      "SecurityContextConstraints",
      "NetworkPolicy",
      "Pod Security Admission",
      "RuntimeClass"
    ],
    answer: [2],
    explanation: "Pod Security Admission aplica los Pod Security Standards por namespace. SecurityContextConstraints es un mecanismo propio de OpenShift, y NetworkPolicy y RuntimeClass resuelven otros problemas."
  },
  {
    id: "O028",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which securityContext setting prevents a container from running as UID 0?",
    options: [
      "runAsNonRoot: true",
      "readOnlyRootFilesystem: true",
      "privileged: false",
      "allowPrivilegeEscalation: true"
    ],
    answer: [0],
    explanation: "Con runAsNonRoot: true el kubelet se niega a arrancar el contenedor si fuera a ejecutarse como root. readOnlyRootFilesystem protege el sistema de archivos, pero no cambia el usuario."
  },
  {
    id: "O029",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which two securityContext settings help harden a container? (Choose 2)",
    options: [
      "runAsUser: 0",
      "privileged: true",
      "capabilities with drop: ['ALL']",
      "allowPrivilegeEscalation: false"
    ],
    answer: [2,3],
    explanation: "Impedir la escalada de privilegios y eliminar todas las capabilities de Linux reducen la superficie de ataque (ambos son exigidos por el nivel restricted). privileged: true y ejecutar como UID 0 hacen lo contrario."
  },
  {
    id: "O030",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "When no NetworkPolicy selects the Pods in a namespace, how is their traffic treated?",
    options: [
      "Only DNS traffic is allowed",
      "All traffic is allowed",
      "All ingress and egress traffic is denied",
      "Only traffic within the same namespace is allowed"
    ],
    answer: [1],
    explanation: "Por defecto Kubernetes permite todo el tráfico entre Pods. Solo cuando una NetworkPolicy selecciona un Pod, ese Pod pasa a aceptar únicamente el tráfico explícitamente permitido."
  },
  {
    id: "O031",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "A NetworkPolicy has podSelector: {}, policyTypes: [Ingress] and no ingress rules. What is its effect?",
    options: [
      "All Pods in the namespace keep allowing all ingress traffic",
      "All ingress traffic to every Pod in the namespace is denied",
      "It applies to Pods in all namespaces",
      "It has no effect because the podSelector is empty"
    ],
    answer: [1],
    explanation: "Un podSelector vacío selecciona todos los Pods del namespace y, al no haber reglas de ingress, no se permite ninguna entrada: es la política 'default deny ingress'. Las NetworkPolicies son namespaced."
  },
  {
    id: "O032",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "NetworkPolicies have been created, but they have no effect on traffic. What is the most likely reason?",
    options: [
      "kube-proxy runs in iptables mode",
      "CoreDNS is not running",
      "The Pods do not have resource limits",
      "The CNI plugin in use does not implement NetworkPolicy"
    ],
    answer: [3],
    explanation: "El API server acepta NetworkPolicies, pero quien las aplica es el plugin de red. CNIs como Calico o Cilium las implementan; otros, como Flannel por sí solo, no."
  },
  {
    id: "O033",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "How can you prevent a Pod from automatically mounting a ServiceAccount token that it does not need?",
    options: [
      "Set hostPID: true",
      "Set imagePullPolicy: Never",
      "Set automountServiceAccountToken: false",
      "Delete the default ServiceAccount"
    ],
    answer: [2],
    explanation: "automountServiceAccountToken: false (en el Pod o en la ServiceAccount) evita montar el token, aplicando mínimo privilegio. Borrar la ServiceAccount default no es viable porque el controlador la recrea."
  },
  {
    id: "O034",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which CNCF graduated project performs runtime threat detection, for example alerting when a shell is spawned inside a container?",
    options: [
      "Falco",
      "Harbor",
      "Notary",
      "Trivy"
    ],
    answer: [0],
    explanation: "Falco observa llamadas al sistema (vía eBPF) y genera alertas según reglas. Trivy es un escáner de vulnerabilidades, Harbor un registry y Notary firma de contenido; ninguno detecta comportamiento en tiempo de ejecución."
  },
  {
    id: "O035",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which native, in-process admission mechanism (GA since Kubernetes 1.30) lets administrators write validation rules in CEL without running a webhook?",
    options: [
      "AdmissionReview",
      "PodSecurityPolicy",
      "MutatingWebhookConfiguration",
      "ValidatingAdmissionPolicy"
    ],
    answer: [3],
    explanation: "ValidatingAdmissionPolicy evalúa expresiones CEL dentro del API server, evitando la latencia y la operación de un webhook externo. PodSecurityPolicy fue eliminado y AdmissionReview es el formato de mensaje de los webhooks."
  },
  {
    id: "O036",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "What is the purpose of signing container images with tools such as Sigstore cosign?",
    options: [
      "To compress image layers",
      "To speed up image pulls",
      "To verify image provenance and integrity before deployment",
      "To encrypt image layers at rest"
    ],
    answer: [2],
    explanation: "La firma permite comprobar quién construyó la imagen y que no fue alterada; políticas de admisión pueden exigir firmas válidas. Forma parte de la seguridad de la cadena de suministro junto con SBOMs y escaneo."
  },
  {
    id: "O037",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A node shows STATUS NotReady. What should you check first on that node?",
    options: [
      "The Ingress controller",
      "The kubelet service and its logs, for example with systemctl status kubelet and journalctl -u kubelet",
      "The kube-scheduler logs",
      "The CoreDNS configuration"
    ],
    answer: [1],
    explanation: "El estado Ready lo reporta el kubelet; si se detiene, pierde conexión o el runtime/CNI falla, el nodo pasa a NotReady. kubectl describe node muestra las condiciones y los logs del kubelet suelen revelar la causa."
  },
  {
    id: "O038",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A Service exists but requests to it time out, and kubectl get endpointslices shows no endpoints for it. What is the most likely cause?",
    options: [
      "The Service selector does not match the labels of any Ready Pods",
      "The Service type is ClusterIP",
      "CoreDNS is down",
      "The Pods have resource limits"
    ],
    answer: [0],
    explanation: "Sin endpoints, kube-proxy no tiene backends a los que enviar tráfico. Suele deberse a labels que no coinciden con el selector o a Pods que no están Ready. Un fallo de DNS daría error de resolución, no timeouts con endpoints vacíos."
  },
  {
    id: "O039",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 6,
    q: "Applications cannot resolve Service names, but connecting by IP address works. Where should you look first?",
    options: [
      "The kube-scheduler logs",
      "The etcd database",
      "The container registry",
      "The CoreDNS Pods and their logs in the kube-system namespace"
    ],
    answer: [3],
    explanation: "Si la conectividad por IP funciona pero la resolución falla, el problema está en el DNS del clúster: Pods de CoreDNS caídos, su Service kube-dns, su ConfigMap o el /etc/resolv.conf del Pod."
  },
  {
    id: "O040",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "Which command shows the current CPU and memory usage of nodes, and what does it depend on?",
    options: [
      "kubectl top nodes, which depends on metrics-server",
      "kubectl describe nodes, which depends on Prometheus",
      "kubectl get nodes -o metrics, which depends on kube-state-metrics",
      "kubectl usage nodes, which depends on the Dashboard"
    ],
    answer: [0],
    explanation: "kubectl top consulta la Metrics API (metrics.k8s.io), que normalmente sirve metrics-server. Sin él, el comando devuelve un error de que la API de métricas no está disponible."
  },
  {
    id: "O041",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 8,
    q: "A Pod is stuck in Pending and its events say 'pod has unbound immediate PersistentVolumeClaims'. What should you investigate?",
    options: [
      "The liveness probe",
      "The PVC, its StorageClass and whether a matching PV or a working provisioner is available",
      "The image tag",
      "The Service type"
    ],
    answer: [1],
    explanation: "El Pod no puede programarse hasta que su PVC esté Bound. Hay que revisar kubectl describe pvc: StorageClass inexistente, provisionador CSI caído o ningún PV que cumpla tamaño y access mode."
  },
  {
    id: "O042",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A Pod shows ImagePullBackOff. Which two causes are most likely? (Choose 2)",
    options: [
      "The readiness probe is failing",
      "Credentials for a private registry are missing or invalid",
      "The container exceeded its memory limit",
      "The image name or tag does not exist in the registry"
    ],
    answer: [1,3],
    explanation: "ImagePullBackOff indica que el kubelet no pudo descargar la imagen y espera con back-off: nombre o tag erróneo, registry inaccesible o falta de imagePullSecrets. Los problemas de memoria o probes ocurren cuando el contenedor ya existe."
  },
  {
    id: "O043",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A Pod reports CreateContainerConfigError. What is a common cause?",
    options: [
      "The node is out of disk space",
      "The Service has no endpoints",
      "A referenced ConfigMap or Secret (or one of its keys) does not exist",
      "The image is too large"
    ],
    answer: [2],
    explanation: "Este error ocurre al preparar la configuración del contenedor, típicamente porque una variable o volumen referencia un ConfigMap/Secret o una clave inexistente. kubectl describe pod muestra el detalle en los eventos."
  },
  {
    id: "O044",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "In a kubeadm cluster the kube-apiserver is not responding. How is it usually deployed, which tells you where to look?",
    options: [
      "As a static Pod whose manifest lives in /etc/kubernetes/manifests on the control plane node",
      "As a Deployment in the default namespace",
      "As a DaemonSet running on every node",
      "As a systemd service on the worker nodes"
    ],
    answer: [0],
    explanation: "kubeadm ejecuta el API server, el scheduler, el controller-manager y etcd como static Pods gestionados por el kubelet. Si el API server cae, se revisa el manifiesto, los logs del contenedor (crictl logs) y los del kubelet."
  },
  {
    id: "O045",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 5,
    q: "Two Pods in different namespaces can no longer communicate after a security change, while DNS resolution still works. What is the most likely cause?",
    options: [
      "An incorrect imagePullPolicy",
      "A missing PriorityClass",
      "A LimitRange in one of the namespaces",
      "A NetworkPolicy that does not allow that traffic"
    ],
    answer: [3],
    explanation: "Tras introducir NetworkPolicies, el tráfico no permitido explícitamente se bloquea. Hay que revisar las políticas de ingress del destino y de egress del origen (incluyendo namespaceSelector)."
  },
  {
    id: "O046",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 4,
    q: "A Pod is stuck in Pending. Which two causes are plausible? (Choose 2)",
    options: [
      "The Pod does not tolerate the taints present on the available nodes",
      "The application inside the container throws exceptions at startup",
      "No node has enough allocatable CPU or memory for the Pod's requests",
      "The liveness probe is misconfigured"
    ],
    answer: [0,2],
    explanation: "Pending significa que el Pod aún no se ha programado (o no se han creado sus contenedores): falta de recursos, taints sin toleration, afinidad imposible o PVC sin enlazar. Las excepciones y probes solo afectan a contenedores ya en ejecución."
  },
  {
    id: "O047",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A container terminated with exit code 137. What does that usually indicate?",
    options: [
      "A DNS lookup failed",
      "It was killed with SIGKILL, frequently because it ran out of memory (OOMKilled)",
      "Successful completion",
      "The command was not found in the image"
    ],
    answer: [1],
    explanation: "137 = 128 + 9 (SIGKILL). Suele deberse a OOMKilled por superar el límite de memoria. El código 0 es éxito y 127 indica comando no encontrado."
  },
  {
    id: "O048",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "Pods on a node are being evicted and the node condition shows DiskPressure=True. What is happening?",
    options: [
      "etcd has run out of space",
      "A NetworkPolicy is blocking the node",
      "The node is low on available disk space or inodes and the kubelet is reclaiming resources",
      "The scheduler is rebalancing Pods across nodes"
    ],
    answer: [2],
    explanation: "Cuando el espacio o los inodos caen por debajo de los umbrales de desalojo, el kubelet marca DiskPressure, elimina imágenes y contenedores sin uso y desaloja Pods si es necesario."
  },
  {
    id: "O049",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "What is the lifetime of an emptyDir volume?",
    options: [
      "It is shared by all Pods in the namespace",
      "It persists after the Pod is deleted",
      "It is always backed by a cloud disk",
      "It exists while the Pod runs on that node and is deleted when the Pod is removed"
    ],
    answer: [3],
    explanation: "emptyDir se crea vacío al asignar el Pod a un nodo, sobrevive a reinicios de contenedores y se borra al eliminar el Pod. Sirve para caché o para compartir archivos entre contenedores del mismo Pod."
  },
  {
    id: "O050",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which object represents a user's request for storage, specifying size and access mode?",
    options: [
      "VolumeAttachment",
      "PersistentVolumeClaim",
      "PersistentVolume",
      "StorageClass"
    ],
    answer: [1],
    explanation: "El PVC es la solicitud que hace el usuario; se enlaza a un PV que cumpla los requisitos (o provoca su aprovisionamiento dinámico). El PV es el recurso de almacenamiento en sí."
  },
  {
    id: "O051",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which object enables dynamic provisioning of PersistentVolumes by naming a provisioner and its parameters?",
    options: [
      "CSIDriver",
      "PersistentVolumeClaim",
      "StorageClass",
      "ConfigMap"
    ],
    answer: [2],
    explanation: "La StorageClass define el provisionador (normalmente un driver CSI), parámetros como el tipo de disco, la reclaimPolicy y el volumeBindingMode. Un PVC que la referencia provoca la creación automática del PV."
  },
  {
    id: "O052",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which access mode allows a volume to be mounted read-write by many nodes at the same time?",
    options: [
      "ReadWriteMany",
      "ReadWriteOncePod",
      "ReadWriteOnce",
      "ReadOnlyMany"
    ],
    answer: [0],
    explanation: "ReadWriteMany (RWX) permite lectura y escritura desde múltiples nodos; requiere un backend que lo soporte, como NFS o CephFS. ReadOnlyMany solo permite lectura."
  },
  {
    id: "O053",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which access mode guarantees that only a single Pod in the whole cluster can read and write the volume?",
    options: [
      "ReadWriteOncePod",
      "ReadWriteMany",
      "ReadOnlyMany",
      "ReadWriteOnce"
    ],
    answer: [0],
    explanation: "ReadWriteOncePod (GA desde 1.29, solo volúmenes CSI) restringe el acceso a un único Pod. ReadWriteOnce restringe a un nodo, por lo que varios Pods en ese nodo podrían montarlo."
  },
  {
    id: "O054",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "With persistentVolumeReclaimPolicy: Retain, what happens when the bound PVC is deleted?",
    options: [
      "The PV is automatically bound to a new PVC",
      "The data is wiped and the PV becomes Available",
      "The PV and its data are deleted",
      "The PV and its data are kept; the PV becomes Released and needs manual cleanup before reuse"
    ],
    answer: [3],
    explanation: "Retain conserva el volumen y los datos para recuperación manual; el PV queda Released y no se reutiliza automáticamente. Delete borraría el PV y el disco subyacente."
  },
  {
    id: "O055",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "What is the default reclaim policy for dynamically provisioned PersistentVolumes?",
    options: [
      "Retain",
      "Delete",
      "Recycle",
      "Archive"
    ],
    answer: [1],
    explanation: "Los PV dinámicos heredan la reclaimPolicy de la StorageClass, cuyo valor por defecto es Delete. Recycle está obsoleto y Archive no existe."
  },
  {
    id: "O056",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "What does volumeBindingMode: WaitForFirstConsumer in a StorageClass do?",
    options: [
      "It waits for an administrator to approve the PVC",
      "It deletes the volume after the first Pod finishes",
      "It delays provisioning and binding until a Pod that uses the PVC is scheduled, so topology constraints are respected",
      "It mounts the volume read-only first"
    ],
    answer: [2],
    explanation: "Con WaitForFirstConsumer el volumen se crea en la zona del nodo donde se programa el Pod, evitando discos creados en una zona distinta. El modo Immediate aprovisiona en cuanto se crea el PVC."
  },
  {
    id: "O057",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which standard interface allows storage vendors to write plugins that work with Kubernetes without changing Kubernetes core code?",
    options: [
      "CNI",
      "CRI",
      "SMI",
      "CSI"
    ],
    answer: [3],
    explanation: "La Container Storage Interface sustituyó a los plugins 'in-tree'; los proveedores entregan drivers CSI independientes. CRI es para runtimes, CNI para red y SMI fue una especificación de service mesh."
  },
  {
    id: "O058",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "How does a StatefulSet give each replica its own PersistentVolumeClaim?",
    options: [
      "Using volumeClaimTemplates",
      "Using a shared hostPath volume",
      "Using a ConfigMap per replica",
      "Using an emptyDir per Pod"
    ],
    answer: [0],
    explanation: "volumeClaimTemplates genera un PVC por réplica (por ejemplo data-db-0, data-db-1) que se conserva aunque el Pod se reprograme, manteniendo su identidad y sus datos."
  },
  {
    id: "O059",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "A PVC remains in Pending status. Which is a likely reason?",
    options: [
      "The Service is headless",
      "The Pod has no readiness probe",
      "No PV matches its size or access mode and no StorageClass can provision one",
      "The node is cordoned"
    ],
    answer: [2],
    explanation: "Un PVC queda Pending si no hay PV compatible ni aprovisionamiento dinámico posible (StorageClass inexistente o provisionador fallando). Con WaitForFirstConsumer también queda Pending hasta que un Pod lo use, lo cual es normal."
  },
  {
    id: "O060",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Why is hostPath generally discouraged for application workloads?",
    options: [
      "It is slower than emptyDir",
      "It exposes the node's filesystem to the Pod, creating security risks and tying data to a single node",
      "It requires a CSI driver",
      "It cannot be mounted read-only"
    ],
    answer: [1],
    explanation: "hostPath monta rutas del nodo dentro del Pod: puede permitir escapar al host y los datos quedan atados a ese nodo. El nivel baseline de Pod Security lo prohíbe."
  },
  {
    id: "O061",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which two statements about PersistentVolumes and PersistentVolumeClaims are correct? (Choose 2)",
    options: [
      "A PV can be bound to several PVCs at the same time",
      "A PVC is a namespaced object",
      "Only cluster administrators can create PVCs",
      "A PV is a cluster-scoped object"
    ],
    answer: [1,3],
    explanation: "Los PVC viven en el namespace de la aplicación y los PV son recursos del clúster. La relación PV-PVC es uno a uno, y cualquier usuario con permisos RBAC puede crear PVCs."
  },
  {
    id: "O062",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which StorageClass field must be enabled so that users can grow a PVC by editing its requested size?",
    options: [
      "mountOptions: resize",
      "allowVolumeExpansion: true",
      "reclaimPolicy: Retain",
      "volumeBindingMode: Immediate"
    ],
    answer: [1],
    explanation: "Con allowVolumeExpansion: true se puede aumentar spec.resources.requests.storage del PVC y el driver CSI amplía el volumen. Reducir el tamaño no está soportado."
  },
  {
    id: "D001",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "What is the main difference between Continuous Delivery and Continuous Deployment?",
    options: [
      "They are two names for exactly the same practice",
      "Continuous Deployment only applies to infrastructure code",
      "Continuous Delivery skips automated testing",
      "With Continuous Deployment every change that passes the pipeline is released to production automatically, while Continuous Delivery keeps a manual approval before production"
    ],
    answer: [3],
    explanation: "En ambos casos el software está siempre listo para liberarse; la diferencia es si el paso final a producción es automático (deployment) o requiere aprobación humana (delivery)."
  },
  {
    id: "D002",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which two are among the four OpenGitOps principles? (Choose 2)",
    options: [
      "Pulled automatically",
      "Imperatively scripted",
      "Declarative",
      "Manually approved"
    ],
    answer: [0,2],
    explanation: "Los cuatro principios de OpenGitOps son: Declarative, Versioned and Immutable, Pulled Automatically y Continuously Reconciled. Los scripts imperativos y las aprobaciones manuales no forman parte de ellos."
  },
  {
    id: "D003",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "In GitOps, what is the role of the Git repository?",
    options: [
      "It replaces etcd as the cluster datastore",
      "It stores only application source code, never configuration",
      "It is the versioned single source of truth for the desired state of the system",
      "It is used only to store audit logs"
    ],
    answer: [2],
    explanation: "El estado deseado (manifiestos, Helm values, overlays) se versiona en Git; cada cambio pasa por commits y revisiones, lo que da trazabilidad y rollback mediante git revert. etcd sigue siendo el almacén del clúster."
  },
  {
    id: "D004",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "How does a pull-based GitOps agent such as Argo CD or Flux deploy changes?",
    options: [
      "An agent running in the cluster watches the Git repository and reconciles the cluster to match it",
      "A CI server pushes manifests to the cluster using admin credentials",
      "The kubelet pulls manifests directly from Git",
      "Developers run kubectl apply manually after each merge"
    ],
    answer: [0],
    explanation: "En el modelo pull el agente vive dentro del clúster y tira de los cambios, de modo que el CI no necesita credenciales del clúster. El modelo push (CI ejecutando kubectl) expone esas credenciales fuera."
  },
  {
    id: "D005",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Someone edits a Deployment manually with kubectl edit in a GitOps-managed cluster. What will a GitOps controller with self-heal enabled do?",
    options: [
      "Delete the Deployment",
      "Detect the drift and revert the live object to the state declared in Git",
      "Commit the change back to Git automatically",
      "Ignore the change permanently"
    ],
    answer: [1],
    explanation: "La reconciliación continua detecta la deriva (drift) entre el estado real y Git y, con self-heal/auto-sync, restaura lo declarado. Para cambiar algo de forma persistente hay que hacerlo en Git."
  },
  {
    id: "D006",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which two tools are CNCF graduated GitOps projects for Kubernetes? (Choose 2)",
    options: [
      "Spinnaker",
      "Jenkins",
      "Argo CD (part of the Argo project)",
      "Flux"
    ],
    answer: [2,3],
    explanation: "Argo y Flux se graduaron en la CNCF en 2022. Jenkins y Spinnaker son herramientas de CI/CD de la CD Foundation y no siguen por sí mismas el modelo GitOps de reconciliación continua."
  },
  {
    id: "D007",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "What is Helm?",
    options: [
      "A package manager for Kubernetes that templates manifests and manages releases of charts",
      "A continuous integration server",
      "A container runtime",
      "A service mesh"
    ],
    answer: [0],
    explanation: "Helm empaqueta aplicaciones como charts (plantillas + valores), las instala como releases versionadas y permite upgrade y rollback. Es un proyecto graduado de la CNCF."
  },
  {
    id: "D008",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "In a Helm chart, which file holds the default configuration values that users can override?",
    options: [
      "Chart.yaml",
      "Chart.lock",
      "templates/_helpers.tpl",
      "values.yaml"
    ],
    answer: [3],
    explanation: "values.yaml contiene los valores por defecto que se inyectan en las plantillas; se sobrescriben con -f archivo.yaml o --set. Chart.yaml guarda los metadatos del chart (nombre, versión, dependencias)."
  },
  {
    id: "D009",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which command reverts a Helm release named web to revision 2?",
    options: [
      "helm undo web 2",
      "helm upgrade web --revision 2",
      "helm rollback web 2",
      "helm revert web --to 2"
    ],
    answer: [2],
    explanation: "helm rollback <release> <revisión> vuelve a una revisión anterior; helm history web muestra las revisiones disponibles. Las otras variantes no son comandos válidos de Helm."
  },
  {
    id: "D010",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which in-cluster server component was removed in Helm 3, simplifying its security model?",
    options: [
      "Artifact Hub",
      "Tiller",
      "ChartMuseum",
      "Kubeapps"
    ],
    answer: [1],
    explanation: "Helm 2 necesitaba Tiller dentro del clúster, normalmente con permisos amplios. Desde Helm 3 el cliente habla directamente con el API server usando los permisos RBAC del usuario."
  },
  {
    id: "D011",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which two statements about Kustomize are correct? (Choose 2)",
    options: [
      "It is template-free and customizes plain YAML through bases, overlays and patches",
      "It is integrated into kubectl through the -k flag",
      "It uses Go templates fed by a values.yaml file",
      "It requires a server-side component in the cluster"
    ],
    answer: [0,1],
    explanation: "Kustomize compone una base con overlays por entorno aplicando parches sobre YAML puro, sin plantillas, y está integrado en kubectl (kubectl apply -k, kubectl kustomize). Las plantillas Go con values.yaml son propias de Helm."
  },
  {
    id: "D012",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which command applies a Kustomize directory using the support built into kubectl?",
    options: [
      "kubectl apply -f kustomization.yaml --template",
      "kubectl kustomize --apply prod",
      "kubectl helm apply prod",
      "kubectl apply -k ./overlays/prod"
    ],
    answer: [3],
    explanation: "kubectl apply -k procesa el kustomization.yaml del directorio y aplica el resultado. kubectl kustomize <dir> solo renderiza la salida sin aplicarla."
  },
  {
    id: "D013",
    domain: "delivery",
    topic: "Application Delivery",
    module: 3,
    q: "Which pair lists the strategy types natively supported by a Deployment's spec.strategy.type?",
    options: [
      "BlueGreen and Canary",
      "Recreate and A/B",
      "RollingUpdate and Recreate",
      "Rolling and Shadow"
    ],
    answer: [2],
    explanation: "Un Deployment solo admite RollingUpdate (por defecto) y Recreate. Blue/green y canary se implementan con varios objetos, una service mesh o herramientas como Argo Rollouts o Flagger."
  },
  {
    id: "D014",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "A Deployment uses the Recreate strategy. What happens during an update?",
    options: [
      "All existing Pods are terminated before new Pods are created, causing a brief downtime",
      "New Pods are created before the old ones are removed",
      "Traffic is mirrored to the new Pods",
      "Only half of the Pods are updated"
    ],
    answer: [0],
    explanation: "Recreate elimina primero todos los Pods antiguos y luego crea los nuevos; es útil cuando dos versiones no pueden coexistir, a costa de una interrupción."
  },
  {
    id: "D015",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "In a Deployment's RollingUpdate strategy, what are the default values of maxSurge and maxUnavailable?",
    options: [
      "0 and 1",
      "1 and 1",
      "25% and 25%",
      "50% and 0%"
    ],
    answer: [2],
    explanation: "Ambos valen 25% por defecto: puede haber hasta un 25% de Pods extra durante la actualización y como máximo un 25% no disponibles."
  },
  {
    id: "D016",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which deployment strategy first routes a small percentage of traffic to the new version and increases it gradually while monitoring metrics?",
    options: [
      "Canary",
      "Big bang",
      "Recreate",
      "Blue/green"
    ],
    answer: [0],
    explanation: "Canary expone la nueva versión a un subconjunto de usuarios y amplía el porcentaje si las métricas son buenas, limitando el impacto de un fallo. Blue/green cambia todo el tráfico de una vez."
  },
  {
    id: "D017",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which strategy runs two complete environments side by side and switches all traffic at once from the old version to the new one?",
    options: [
      "Recreate",
      "Canary",
      "Rolling update",
      "Blue/green"
    ],
    answer: [3],
    explanation: "En blue/green la versión nueva (green) se despliega completa junto a la actual (blue) y el tráfico se conmuta de golpe, por ejemplo cambiando el selector del Service; el rollback es volver a conmutar."
  },
  {
    id: "D018",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which command shows the revision history of a Deployment named web?",
    options: [
      "kubectl get deployment web --history",
      "kubectl rollout history deployment/web",
      "kubectl describe rs web --revisions",
      "kubectl logs deployment/web --history"
    ],
    answer: [1],
    explanation: "kubectl rollout history lista las revisiones (una por ReplicaSet conservado, según revisionHistoryLimit, que por defecto es 10); con --revision=N se ve el detalle de una."
  },
  {
    id: "D019",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which command rolls a Deployment back to its previous revision?",
    options: [
      "kubectl apply --undo deployment/web",
      "kubectl rollout revert deployment/web",
      "kubectl rollout undo deployment/web",
      "kubectl rollback deployment/web"
    ],
    answer: [2],
    explanation: "kubectl rollout undo vuelve a la revisión anterior (o a una concreta con --to-revision=N) escalando de nuevo el ReplicaSet correspondiente. En un entorno GitOps, lo correcto es revertir el cambio en Git."
  },
  {
    id: "D020",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which projects extend Kubernetes with automated progressive delivery, such as canary analysis and blue/green, beyond what Deployments provide?",
    options: [
      "Harbor and Notary",
      "Velero and Rook",
      "Argo Rollouts and Flagger",
      "CoreDNS and etcd"
    ],
    answer: [2],
    explanation: "Argo Rollouts (con su CRD Rollout) y Flagger (parte del ecosistema Flux) automatizan canary y blue/green usando métricas para promover o revertir. Los demás pares resuelven DNS, almacenamiento, registros o backups."
  },
  {
    id: "D021",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which open source project provides Kubernetes-native CI/CD building blocks defined as custom resources, such as Task and Pipeline?",
    options: [
      "Prometheus",
      "Tekton",
      "Cilium",
      "Envoy"
    ],
    answer: [1],
    explanation: "Tekton (de la CD Foundation) define pipelines como CRDs que se ejecutan en Pods dentro del clúster. Prometheus es monitoreo, Envoy un proxy y Cilium un CNI."
  },
  {
    id: "D022",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Why should CI pipelines produce immutable, uniquely tagged images (for example tagged with the Git commit SHA) instead of reusing a tag such as latest?",
    options: [
      "It reduces the image size",
      "Registries reject the latest tag",
      "Kubernetes requires semantic version tags",
      "It makes deployments reproducible and traceable and enables reliable rollbacks"
    ],
    answer: [3],
    explanation: "Una etiqueta única por build permite saber exactamente qué código corre y volver a una versión anterior con certeza. Reutilizar latest hace que dos despliegues 'iguales' puedan ejecutar imágenes distintas."
  },
  {
    id: "D023",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "A container keeps crashing. Which command shows the logs of the previous, terminated instance of the container?",
    options: [
      "kubectl logs mypod --previous",
      "kubectl get logs mypod",
      "kubectl describe logs mypod",
      "kubectl logs mypod --last"
    ],
    answer: [0],
    explanation: "--previous (o -p) muestra los logs de la instancia anterior del contenedor, que suelen contener el error que provocó el reinicio. Los logs actuales pueden estar vacíos si acaba de arrancar."
  },
  {
    id: "D024",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command streams the logs of the container named sidecar in a multi-container Pod?",
    options: [
      "kubectl logs sidecar/mypod",
      "kubectl attach mypod --logs sidecar",
      "kubectl logs mypod -c sidecar -f",
      "kubectl exec mypod logs sidecar"
    ],
    answer: [2],
    explanation: "-c selecciona el contenedor y -f sigue la salida en tiempo real. Sin -c en un Pod con varios contenedores, kubectl usa el contenedor por defecto o pide que se especifique uno."
  },
  {
    id: "D025",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "A Pod is in CrashLoopBackOff. What does this status mean?",
    options: [
      "The container starts and exits repeatedly, and the kubelet waits with increasing back-off delays between restarts",
      "The Pod is waiting to be assigned to a node",
      "The Pod was evicted from its node",
      "The image cannot be downloaded"
    ],
    answer: [0],
    explanation: "El contenedor arranca y termina una y otra vez (error de la app, configuración incorrecta, comando erróneo o liveness fallida) y el kubelet espera cada vez más (hasta 5 minutos) entre reinicios. Se diagnostica con kubectl logs --previous y kubectl describe."
  },
  {
    id: "D026",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command is most useful to see a Pod's events, conditions, container states and restart counts in a single view?",
    options: [
      "kubectl get pod mypod",
      "kubectl top pod mypod",
      "kubectl logs mypod",
      "kubectl describe pod mypod"
    ],
    answer: [3],
    explanation: "kubectl describe agrega el estado detallado y los eventos recientes (scheduling, pulls, probes fallidas). get da un resumen de una línea, logs muestra la salida de la aplicación y top el consumo."
  },
  {
    id: "D027",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command opens an interactive shell inside a running container?",
    options: [
      "kubectl logs -it mypod",
      "kubectl exec -it mypod -- /bin/sh",
      "kubectl attach mypod --shell",
      "kubectl run -it mypod /bin/sh"
    ],
    answer: [1],
    explanation: "kubectl exec -it ejecuta un proceso dentro del contenedor existente con TTY interactivo; '--' separa las opciones de kubectl del comando. kubectl run crearía un Pod nuevo."
  },
  {
    id: "D028",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "The application image is distroless and has no shell. How can you troubleshoot inside the running Pod?",
    options: [
      "kubectl exec -it mypod -- bash",
      "kubectl logs mypod --shell",
      "Rebuild the production image with a shell and redeploy it",
      "kubectl debug -it mypod --image=busybox --target=app, which adds an ephemeral container"
    ],
    answer: [3],
    explanation: "kubectl debug inyecta un ephemeral container con herramientas; con --target comparte el espacio de procesos del contenedor indicado. exec fallaría porque no hay bash en la imagen."
  },
  {
    id: "D029",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command starts a debugging Pod on a specific node, with the node's root filesystem mounted under /host?",
    options: [
      "kubectl debug node/node1 -it --image=busybox",
      "kubectl ssh node1",
      "kubectl exec node/node1 -- sh",
      "kubectl attach node/node1"
    ],
    answer: [0],
    explanation: "kubectl debug node/<nodo> crea un Pod en ese nodo que comparte sus namespaces de host y monta su sistema de archivos en /host, sin necesidad de SSH. Los demás comandos no existen o no aplican a nodos."
  },
  {
    id: "D030",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "A Pod is Running but shows READY 0/1, and its Service does not send traffic to it. What is the most likely reason?",
    options: [
      "The node is cordoned",
      "The Pod has the BestEffort QoS class",
      "The readiness probe is failing",
      "The image failed to pull"
    ],
    answer: [2],
    explanation: "Running indica que el contenedor arrancó; READY 0/1 indica que la readinessProbe no pasa, así que el Pod se excluye de los endpoints. Un fallo de pull impediría llegar a Running."
  },
  {
    id: "D031",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command forwards local port 8080 to port 80 of a Pod for quick testing?",
    options: [
      "kubectl expose pod mypod --port=8080:80",
      "kubectl port-forward pod/mypod 8080:80",
      "kubectl proxy pod/mypod 8080",
      "kubectl forward mypod 80:8080"
    ],
    answer: [1],
    explanation: "El formato es puerto_local:puerto_remoto y también funciona con svc/ y deploy/. kubectl expose crea un Service y kubectl proxy expone la API de Kubernetes, no un Pod."
  },
  {
    id: "D032",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "A Pod has been stuck in Terminating for a long time after it was deleted. What is a common cause?",
    options: [
      "A finalizer that has not been removed, or a node that is unreachable",
      "An ImagePullBackOff error",
      "Too many replicas in its Deployment",
      "A missing readiness probe"
    ],
    answer: [0],
    explanation: "El Pod queda Terminating si un finalizer no se retira o si el kubelet de su nodo no puede confirmar la terminación (nodo caído). Se investiga con kubectl get pod -o yaml (finalizers) y el estado del nodo."
  },
  {
    id: "D033",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command lists recent events in a namespace sorted by time?",
    options: [
      "kubectl describe events --latest",
      "kubectl get events --sort-by=.metadata.creationTimestamp",
      "kubectl logs events",
      "kubectl top events"
    ],
    answer: [1],
    explanation: "Los eventos se ordenan con --sort-by; también existe kubectl events, que los muestra ordenados. Por defecto los eventos se conservan solo durante un tiempo limitado (alrededor de una hora)."
  },
  {
    id: "D034",
    domain: "delivery",
    topic: "Debugging",
    module: 3,
    q: "A Pod shows the status Completed. Which two statements are true? (Choose 2)",
    options: [
      "This is expected for Pods created by a Job that finished its task",
      "The container was OOMKilled",
      "The Pod is still waiting to be scheduled",
      "Its containers exited with exit code 0"
    ],
    answer: [0,3],
    explanation: "Completed (fase Succeeded) significa que todos los contenedores terminaron con éxito y no se reiniciarán; es el estado final normal de un Job. OOMKilled y Pending indican otros problemas."
  },
  {
    id: "D035",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command prints the logs of a Pod belonging to the Deployment named web without looking up the Pod name first?",
    options: [
      "kubectl describe deployment web --logs",
      "kubectl logs web --all",
      "kubectl logs deployment/web",
      "kubectl get logs deploy web"
    ],
    answer: [2],
    explanation: "kubectl logs acepta referencias tipo/nombre (deployment/web, job/x) y elige uno de sus Pods. Para ver varios Pods a la vez se usa un selector, por ejemplo -l app=web."
  },
  {
    id: "A001",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Besides metrics, which two signals are commonly cited as pillars of observability? (Choose 2)",
    options: [
      "Firewall rules",
      "Backups",
      "Logs",
      "Traces"
    ],
    answer: [2,3],
    explanation: "Métricas, logs y trazas son las tres señales clásicas de la observabilidad (OpenTelemetry añade también perfiles). Backups y reglas de firewall no son señales de telemetría."
  },
  {
    id: "A002",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "How does Prometheus collect metrics by default?",
    options: [
      "Applications push metrics to Prometheus over SMTP",
      "Prometheus parses container log files",
      "The kubelet writes metrics into etcd for Prometheus",
      "Prometheus pulls (scrapes) metrics over HTTP from the /metrics endpoints of its targets"
    ],
    answer: [3],
    explanation: "Prometheus usa un modelo pull: descubre objetivos (por ejemplo vía la API de Kubernetes) y los consulta periódicamente. Para trabajos batch efímeros que no pueden ser 'scrapeados' existe el Pushgateway."
  },
  {
    id: "A003",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which two statements about Prometheus are correct? (Choose 2)",
    options: [
      "It is a CNCF sandbox project",
      "It is primarily designed to store and index application log lines",
      "It stores data as time series identified by a metric name and key-value labels",
      "It provides PromQL to query and aggregate time series"
    ],
    answer: [2,3],
    explanation: "Prometheus es una base de datos de series temporales con modelo de labels y el lenguaje PromQL. No es un sistema de logs (para eso existen Loki o Elasticsearch) y es un proyecto graduado de la CNCF desde 2018."
  },
  {
    id: "A004",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which Prometheus metric type represents a value that only increases (or resets to zero on restart), such as the total number of HTTP requests?",
    options: [
      "Gauge",
      "Counter",
      "Histogram",
      "Summary"
    ],
    answer: [1],
    explanation: "Un counter solo crece; se analiza con rate() o increase() para obtener tasas. Un gauge puede subir y bajar (por ejemplo memoria en uso)."
  },
  {
    id: "A005",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which Prometheus metric type samples observations into configurable buckets so that quantiles such as p95 latency can be calculated on the server side?",
    options: [
      "Counter",
      "Info",
      "Histogram",
      "Gauge"
    ],
    answer: [2],
    explanation: "Un histogram cuenta observaciones en buckets y permite calcular percentiles con histogram_quantile() agregando entre instancias. El summary calcula cuantiles en el cliente y no se puede agregar igual."
  },
  {
    id: "A006",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which component deduplicates, groups and routes the alerts fired by Prometheus to receivers such as email, Slack or PagerDuty?",
    options: [
      "Alertmanager",
      "Thanos",
      "Pushgateway",
      "Grafana"
    ],
    answer: [0],
    explanation: "Prometheus evalúa las reglas de alerta y envía las alertas a Alertmanager, que las agrupa, silencia, inhibe y enruta. Grafana visualiza datos y Thanos aporta almacenamiento a largo plazo y vista global."
  },
  {
    id: "A007",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "What is OpenTelemetry?",
    options: [
      "A Prometheus storage backend",
      "A commercial APM product",
      "A Kubernetes logging driver",
      "A CNCF project providing vendor-neutral APIs, SDKs and a Collector to generate, collect and export traces, metrics and logs"
    ],
    answer: [3],
    explanation: "OpenTelemetry (fusión de OpenTracing y OpenCensus) es el estándar abierto de instrumentación; su Collector recibe, procesa y exporta telemetría a cualquier backend (Prometheus, Jaeger, proveedores comerciales)."
  },
  {
    id: "A008",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which statement correctly distinguishes SLI, SLO and SLA?",
    options: [
      "The SLO is set by customers and the SLI by vendors",
      "The SLA is the measurement, the SLI is the contract and the SLO is the penalty",
      "An SLI is a measured indicator such as request latency, an SLO is the target set for it, and an SLA is a contractual agreement with consequences if it is not met",
      "They are synonyms"
    ],
    answer: [2],
    explanation: "El SLI mide (por ejemplo, % de peticiones con éxito), el SLO fija el objetivo (99.9% en 30 días) y el SLA es el compromiso contractual, normalmente menos estricto que el SLO. La diferencia hasta el 100% es el error budget."
  },
  {
    id: "A009",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "What is the difference between metrics-server and kube-state-metrics?",
    options: [
      "kube-state-metrics is required by the HPA, and metrics-server is only used by Prometheus",
      "They are two names for the same project",
      "metrics-server stores long-term metric history",
      "metrics-server provides current CPU and memory usage for autoscaling and kubectl top, while kube-state-metrics exposes the state of Kubernetes objects (such as desired versus available replicas) for Prometheus"
    ],
    answer: [3],
    explanation: "metrics-server alimenta la Metrics API en memoria (sin histórico) para HPA y kubectl top. kube-state-metrics lee la API y publica métricas sobre el estado de los objetos para que Prometheus las recoja."
  },
  {
    id: "A010",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which CNCF project provides real-time cost monitoring and allocation for Kubernetes workloads, supporting FinOps practices?",
    options: [
      "Keptn",
      "OpenCost",
      "Litmus",
      "Thanos"
    ],
    answer: [1],
    explanation: "OpenCost asigna costes de infraestructura a namespaces, workloads y labels a partir de requests, uso real y precios del proveedor. Thanos es almacenamiento de métricas y Litmus ingeniería del caos."
  },
  {
    id: "A011",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "What is the recommended way for containerized applications to emit logs in Kubernetes?",
    options: [
      "Write to stdout and stderr, where the runtime captures them and node-level agents can ship them",
      "Send logs directly to etcd",
      "Write logs into a ConfigMap",
      "Write log files inside the container filesystem"
    ],
    answer: [0],
    explanation: "El runtime guarda stdout/stderr en el nodo, kubectl logs los lee y un agente por nodo (por ejemplo Fluent Bit como DaemonSet) los envía a un backend central. Escribir en archivos dentro del contenedor complica la recolección y se pierde al reiniciar."
  },
  {
    id: "A012",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which autoscaler adjusts the number of Pod replicas of a Deployment based on observed metrics such as CPU utilization?",
    options: [
      "Cluster Autoscaler",
      "Descheduler",
      "Horizontal Pod Autoscaler",
      "Vertical Pod Autoscaler"
    ],
    answer: [2],
    explanation: "El HPA escala horizontalmente (más o menos réplicas) según métricas de recursos, personalizadas o externas. El VPA ajusta requests, el Cluster Autoscaler añade nodos y el descheduler reubica Pods."
  },
  {
    id: "A013",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "An HPA that targets CPU utilization shows <unknown> as its current value. What is most likely missing?",
    options: [
      "A PersistentVolume",
      "An Ingress controller",
      "A PodDisruptionBudget",
      "metrics-server (or another provider of the resource metrics API), or CPU requests on the target containers"
    ],
    answer: [3],
    explanation: "El HPA obtiene el uso de la Metrics API, que normalmente sirve metrics-server, y calcula la utilización como porcentaje de los requests; sin cualquiera de los dos no puede calcular la métrica."
  },
  {
    id: "A014",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which component adds nodes when Pods cannot be scheduled because of insufficient resources, and removes underutilized nodes?",
    options: [
      "Cluster Autoscaler",
      "Vertical Pod Autoscaler",
      "Horizontal Pod Autoscaler",
      "kube-scheduler"
    ],
    answer: [0],
    explanation: "El Cluster Autoscaler (o alternativas como Karpenter) ajusta el tamaño del clúster reaccionando a Pods Pending y a nodos infrautilizados. El scheduler solo coloca Pods en los nodos existentes."
  },
  {
    id: "A015",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "What does the Vertical Pod Autoscaler (VPA) adjust?",
    options: [
      "The number of namespaces",
      "The CPU and memory requests (and proportionally the limits) of containers",
      "The number of nodes in the cluster",
      "The number of Pod replicas"
    ],
    answer: [1],
    explanation: "El VPA recomienda o aplica requests adecuados según el uso histórico. No conviene combinarlo con un HPA que escale por la misma métrica de CPU o memoria."
  },
  {
    id: "A016",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which CNCF project enables event-driven autoscaling, including scaling to zero, based on sources such as message queue length?",
    options: [
      "Kustomize",
      "Harbor",
      "Contour",
      "KEDA"
    ],
    answer: [3],
    explanation: "KEDA (Kubernetes Event-Driven Autoscaling) usa 'scalers' para decenas de fuentes (Kafka, RabbitMQ, colas cloud, Prometheus) y gestiona un HPA por debajo, permitiendo escalar de 0 a N."
  },
  {
    id: "A017",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which project provides a serverless platform on Kubernetes with request-driven autoscaling, including scale to zero, and an eventing component?",
    options: [
      "Rook",
      "Knative",
      "Longhorn",
      "etcd"
    ],
    answer: [1],
    explanation: "Knative Serving ejecuta servicios que escalan según las peticiones (incluso a cero) y Knative Eventing enruta eventos estilo CloudEvents. etcd es un almacén clave-valor y Rook/Longhorn son soluciones de almacenamiento."
  },
  {
    id: "A018",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which two statements describe serverless computing? (Choose 2)",
    options: [
      "Serverless applications cannot be event-driven",
      "Developers focus on code while the platform manages servers and scaling",
      "Developers must provision and patch the underlying virtual machines",
      "Workloads can scale to zero when idle and are often billed per use"
    ],
    answer: [1,3],
    explanation: "En serverless (FaaS o contenedores gestionados) la plataforma abstrae los servidores, escala automáticamente, a menudo hasta cero, y se paga por uso. Es especialmente adecuado para cargas dirigidas por eventos."
  },
  {
    id: "A019",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which two are open interfaces that decouple Kubernetes from specific networking and storage implementations? (Choose 2)",
    options: [
      "Container Network Interface (CNI)",
      "kubeadm",
      "Kubernetes Dashboard",
      "Container Storage Interface (CSI)"
    ],
    answer: [0,3],
    explanation: "CNI y CSI (junto con CRI para runtimes) son estándares que permiten conectar implementaciones de distintos proveedores sin modificar Kubernetes. El Dashboard y kubeadm son herramientas, no interfaces estándar."
  },
  {
    id: "A020",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "What are the CNCF project maturity levels, from least to most mature?",
    options: [
      "Sandbox, Incubating, Graduated",
      "Alpha, Beta, Stable",
      "Experimental, Supported, Certified",
      "Seed, Growth, Mature"
    ],
    answer: [0],
    explanation: "Los proyectos entran como Sandbox, pasan a Incubating al demostrar adopción y gobernanza, y llegan a Graduated tras una auditoría de seguridad y la aprobación del TOC. Alpha/Beta/Stable son niveles de las APIs de Kubernetes."
  },
  {
    id: "A021",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "How many Kubernetes minor releases are published per year under the current release cadence?",
    options: [
      "1",
      "2",
      "3",
      "4"
    ],
    answer: [2],
    explanation: "Desde 2021 Kubernetes publica tres versiones menores al año (ciclos de unas 15 semanas), gestionadas por el Release Team de SIG Release."
  },
  {
    id: "A022",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "What is a Kubernetes Enhancement Proposal (KEP)?",
    options: [
      "A security vulnerability notice",
      "A bug report template",
      "A design document and process used to propose, discuss and track significant changes to Kubernetes",
      "A marketing announcement for a release"
    ],
    answer: [2],
    explanation: "Los KEPs (en el repositorio kubernetes/enhancements) describen la motivación, el diseño y los criterios de graduación (alpha, beta, GA) de cada mejora, y son propiedad de una SIG."
  },
  {
    id: "A023",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "In the Kubernetes project, what is a Special Interest Group (SIG)?",
    options: [
      "A community group that owns and develops a specific area, such as SIG Network or SIG Node",
      "The CNCF governing board",
      "A paid support tier",
      "A vendor certification program"
    ],
    answer: [0],
    explanation: "Las SIGs organizan el trabajo del proyecto por áreas (red, nodo, almacenamiento, seguridad, release...), con reuniones públicas, canales de Slack y propiedad sobre código y KEPs."
  },
  {
    id: "A024",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "Which CNCF body provides technical leadership, including accepting projects and approving their moves between maturity levels?",
    options: [
      "Governing Board",
      "Kubernetes Steering Committee",
      "End User Technical Advisory Board",
      "Technical Oversight Committee (TOC)"
    ],
    answer: [3],
    explanation: "El TOC define la visión técnica de la CNCF y vota la aceptación y graduación de proyectos. El Governing Board gestiona presupuesto y asuntos de negocio, y el Steering Committee gobierna solo el proyecto Kubernetes."
  },
  {
    id: "A025",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "What is the role of the CNCF Technical Advisory Groups (TAGs)?",
    options: [
      "They organize KubeCon venues",
      "They support the TOC with domain expertise, for example in security or operational resilience, and help evaluate projects",
      "They cut Kubernetes releases",
      "They sell CNCF memberships"
    ],
    answer: [1],
    explanation: "Los TAGs (por ejemplo TAG Security and Compliance o TAG Operational Resilience) reúnen expertos que asesoran al TOC, revisan proyectos y publican guías para la comunidad. Las versiones de Kubernetes las publica SIG Release."
  },
  {
    id: "A026",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "Which role applies software engineering to operations and uses SLOs and error budgets to balance reliability with feature velocity?",
    options: [
      "Database administrator",
      "Product owner",
      "Site Reliability Engineer (SRE)",
      "Scrum Master"
    ],
    answer: [2],
    explanation: "SRE, popularizado por Google, automatiza la operación, reduce el trabajo repetitivo (toil) y usa el error budget para decidir cuándo priorizar estabilidad frente a nuevas funcionalidades."
  },
  {
    id: "A027",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "What is the main goal of platform engineering?",
    options: [
      "Managing physical data center hardware",
      "Writing Kubernetes core code",
      "Building an internal developer platform with self-service capabilities and golden paths that reduce cognitive load for application teams",
      "Replacing application developers with automation"
    ],
    answer: [2],
    explanation: "Un equipo de plataforma ofrece capacidades (despliegue, observabilidad, entornos) como producto interno de autoservicio, por ejemplo con un portal como Backstage, para que los equipos de aplicación entreguen más rápido."
  },
  {
    id: "A028",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "How many of the most recent Kubernetes minor releases are maintained by the community with patch releases?",
    options: [
      "1",
      "2",
      "3",
      "5"
    ],
    answer: [2],
    explanation: "La comunidad mantiene las tres versiones menores más recientes; cada una recibe parches durante aproximadamente 14 meses (12 de soporte más 2 de margen para actualizar)."
  }
];
