// Banco de preguntas de práctica KCNA (Kubernetes and Cloud Native Associate)
// Temario CNCF vigente desde nov-2025. Preguntas y opciones en inglés; explicaciones en español.
// answer: índices 0-based de las opciones correctas (más de uno => multi-respuesta).
// Total: 252 preguntas.
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
    explanation: "etcd es el almacén clave-valor consistente y de alta disponibilidad (consenso Raft) donde se persiste todo el estado del clúster. El scheduler asigna Pods, el kubelet gestiona contenedores en el nodo y el controller-manager ejecuta los bucles de control; ninguno almacena el estado.",
    source: ["https://kubernetes.io/docs/concepts/architecture/#etcd","https://kubernetes.io/docs/concepts/overview/components/#control-plane-components"]
  },
  {
    id: "F002",
    domain: "fundamentals",
    topic: "Core Concepts",
    module: 2,
    q: "In a standard Kubernetes architecture, which control plane component is the only one that should access etcd directly, with all other components going through it?",
    options: [
      "kubelet",
      "kube-apiserver",
      "kube-scheduler",
      "kube-controller-manager"
    ],
    answer: [1],
    explanation: "Usuarios, componentes del clúster (scheduler, controllers, kubelets) y clientes externos se comunican a través del kube-apiserver, que es quien persiste el estado en etcd. La documentación recomienda que idealmente solo el API server tenga acceso a etcd, porque acceder a etcd equivale a ser root en el clúster.",
    source: ["https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/#securing-etcd-clusters","https://kubernetes.io/docs/concepts/overview/kubernetes-api/#persistence"]
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
    explanation: "kube-scheduler vigila los Pods recién creados sin nodo asignado, filtra los nodos viables y los puntúa para elegir el mejor. El kubelet solo arranca el Pod una vez que ya está asignado a su nodo.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/#scheduling"]
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
    explanation: "El kubelet es el agente de cada nodo: recibe los PodSpecs asignados, pide al runtime (vía CRI) que cree los contenedores, ejecuta las probes y reporta el estado. kube-proxy solo gestiona reglas de red para los Services.",
    source: ["https://kubernetes.io/docs/concepts/architecture/#kubelet","https://kubernetes.io/docs/concepts/architecture/cri/"]
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
    explanation: "kube-proxy mantiene reglas de red en cada nodo para implementar las IP virtuales de los Services (modos iptables, que es el predeterminado en v1.37, nftables o IPVS, este último obsoleto desde v1.35). La asignación de IPs a Pods la hace el plugin CNI, y algunos plugins de red traen su propia implementación y hacen innecesario kube-proxy.",
    source: ["https://kubernetes.io/docs/concepts/architecture/#kube-proxy","https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-modes"]
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
    explanation: "El cloud-controller-manager separa la lógica específica del proveedor cloud (controladores de nodos, rutas y servicios/load balancers) del núcleo de Kubernetes, para que cada proveedor evolucione su integración de forma independiente.",
    source: ["https://kubernetes.io/docs/concepts/architecture/cloud-controller/#design"]
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
    explanation: "kube-controller-manager es un único binario que ejecuta los controladores integrados (job-controller, endpointslice-controller, node-lifecycle-controller, etc.); cada uno es un bucle de reconciliación que acerca el estado actual al deseado.",
    source: ["https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/","https://kubernetes.io/docs/concepts/architecture/controller/#running-controllers"]
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
    explanation: "El Pod es la unidad mínima: uno o más contenedores que comparten red y almacenamiento y se programan juntos en el mismo nodo. Kubernetes no gestiona contenedores sueltos.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/#what-is-a-pod"]
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
    explanation: "Los contenedores de un Pod comparten el network namespace, con la IP y los puertos (pueden hablar por localhost), y pueden montar los mismos volúmenes. Cada contenedor tiene su propia imagen y su propio sistema de archivos raíz.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/#pod-networking","https://kubernetes.io/docs/concepts/workloads/pods/#pod-storage"]
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
    explanation: "Un Deployment gestiona ReplicaSets, y cada ReplicaSet mantiene el número deseado de Pods. En un rolling update el Deployment crea un ReplicaSet nuevo y escala el antiguo hacia cero.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#use-case","https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#updating-a-deployment"]
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
    explanation: "Un DaemonSet asegura que todos (o algunos) nodos ejecuten una copia del Pod y la crea automáticamente en los nodos nuevos. Es típico para agentes de logs, monitoreo o almacenamiento.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/"]
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
    explanation: "StatefulSet da nombres ordinales estables, un orden de despliegue predecible y un PVC por réplica mediante volumeClaimTemplates. Requiere un Service headless para la identidad de red de los Pods.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#using-statefulsets","https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#volume-claim-templates"]
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
    explanation: "Un Job crea Pods que se ejecutan hasta completarse y reintenta según backoffLimit (6 por defecto). CronJob es para ejecuciones programadas recurrentes y Deployment mantiene procesos de larga duración que nunca 'terminan'.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/job/","https://kubernetes.io/docs/concepts/workloads/controllers/job/#pod-backoff-failure-policy"]
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
    explanation: "CronJob crea Jobs según una programación en formato cron (por ejemplo '0 2 * * *'). Un Job no admite restartPolicy: Always y no tiene programación propia.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#schedule-syntax","https://kubernetes.io/docs/concepts/workloads/controllers/job/#pod-template"]
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
    explanation: "Por defecto los Secrets se guardan sin cifrar en etcd; los valores de data solo están codificados en base64, lo cual no es cifrado. Para protegerlos hay que habilitar el cifrado en reposo y restringir el acceso con RBAC. Los Secrets son namespaced y pueden montarse como volumen, como variables o usarse para descargar imágenes.",
    source: ["https://kubernetes.io/docs/concepts/configuration/secret/"]
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
    explanation: "Cada nodo ejecuta el kubelet y un runtime de contenedores compatible con CRI (además de kube-proxy, que es opcional si el plugin de red lo reemplaza). kube-scheduler y etcd forman parte del control plane.",
    source: ["https://kubernetes.io/docs/concepts/architecture/#node-components"]
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
    explanation: "Node y PersistentVolume son recursos de ámbito de clúster. PVC y ConfigMap pertenecen a un namespace. Puede verificarse con kubectl api-resources --namespaced=false.",
    source: ["https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#not-all-objects-are-in-a-namespace"]
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
    explanation: "Los Services usan un selector de labels; el controlador busca continuamente los Pods que coinciden y actualiza las EndpointSlices del Service (solo los endpoints listos reciben tráfico). Las anotaciones no sirven para seleccionar objetos.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/service/#defining-a-service","https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors"]
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
    explanation: "Los labels identifican y agrupan objetos y se consultan con selectores. Las anotaciones guardan metadatos arbitrarios, pequeños o grandes (información de herramientas, build, contacto), y no se usan para identificar ni seleccionar.",
    source: ["https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/","https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#motivation"]
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
    explanation: "Un controlador es un bucle de control que no termina: observa el estado real a través de la API, lo compara con el spec deseado y actúa para acercarlo, de forma continua y no una sola vez.",
    source: ["https://kubernetes.io/docs/concepts/architecture/controller/#controller-pattern"]
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
    explanation: "Los init containers se ejecutan en orden y cada uno debe terminar con éxito antes de que empiece el siguiente y, al final, los contenedores de la aplicación. Si uno falla, el kubelet lo reinicia hasta que tenga éxito, salvo con restartPolicy: Never, en cuyo caso el Pod se marca como fallido.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#understanding-init-containers"]
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
    explanation: "Los sidecars nativos (estables desde Kubernetes 1.33) son init containers con restartPolicy: Always: arrancan antes que la app, siguen corriendo durante toda la vida del Pod y no impiden que un Job se complete. Los ephemeral containers son solo para depuración.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#pod-sidecar-containers","https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#jobs-with-sidecar-containers"]
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
    explanation: "Las fases de un Pod son Pending, Running, Succeeded, Failed y Unknown. CrashLoopBackOff es un motivo (reason) del estado Waiting de un contenedor, no una fase del Pod.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-phase","https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-state-waiting"]
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
    explanation: "La readinessProbe indica si el contenedor puede recibir tráfico; mientras falla, el Pod no está Ready y se retira de los endpoints del Service. Una livenessProbe fallida reiniciaría el contenedor, que no es lo deseado; preStop y el grace period actúan al terminar.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes"]
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
    explanation: "Un fallo de liveness hace que el kubelet mate el contenedor y lo reinicie en el mismo nodo según la restartPolicy. Retirar el Pod de los endpoints es el efecto de la readinessProbe, y ninguna probe provoca un rollback.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes"]
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
    explanation: "La startupProbe deshabilita las comprobaciones de liveness y readiness hasta que tiene éxito, dando tiempo al arranque sin reinicios prematuros.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes"]
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
    explanation: "Guaranteed requiere que todos los contenedores tengan requests y limits de CPU y memoria, y que sean iguales. Sin requests ni limits es BestEffort; cualquier otra combinación es Burstable. 'Critical' no es una clase QoS.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/#guaranteed"]
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
    explanation: "Cuando un nodo se queda sin recursos se desalojan primero los Pods BestEffort, luego los Burstable y por último los Guaranteed; por presión de recursos solo son candidatos los Pods que superan sus requests.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/#quality-of-service-classes"]
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
    explanation: "La memoria no es un recurso comprimible: los límites de memoria se aplican con OOM kills del kernel, así que un contenedor que supera su límite puede ser terminado (OOMKilled). La CPU, en cambio, se limita mediante throttling.",
    source: ["https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#how-pods-with-resource-limits-are-run"]
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
    explanation: "Los límites de CPU se aplican con throttling: al acercarse al límite, el kernel restringe su acceso a la CPU y el contenedor se vuelve más lento, pero no se mata.",
    source: ["https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#how-pods-with-resource-limits-are-run"]
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
    explanation: "Deployment, ReplicaSet, StatefulSet y DaemonSet están en apps/v1. Job y CronJob están en batch/v1, y extensions/v1beta1 dejó de servirse para Deployments en Kubernetes 1.16.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#creating-a-deployment","https://kubernetes.io/docs/reference/using-api/deprecation-guide/#v1-16"]
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
    explanation: "kubectl explain obtiene del servidor el esquema OpenAPI y documenta cada campo (por ejemplo kubectl explain pods.spec.containers). kubectl describe muestra el estado de un objeto concreto, no la documentación del esquema.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/"]
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
    explanation: "El kubelet vigila un directorio local (staticPodPath, por ejemplo /etc/kubernetes/manifests) y ejecuta los manifiestos que encuentra; el API server solo ve un 'mirror Pod' que no sirve para controlarlo. Su uso principal es ejecutar el control plane, como hace kubeadm.",
    source: ["https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/","https://kubernetes.io/docs/concepts/workloads/pods/#static-pods"]
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
    explanation: "Un CRD registra un nuevo tipo de recurso en el API server, que luego se gestiona con kubectl y RBAC como cualquier objeto nativo.",
    source: ["https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/#customresourcedefinitions"]
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
    explanation: "Un Operator combina uno o más recursos personalizados con un controlador que los reconcilia aplicando conocimiento operativo (backups, upgrades, failover) como lo haría un operador humano.",
    source: ["https://kubernetes.io/docs/concepts/extend-kubernetes/operator/#motivation","https://kubernetes.io/docs/concepts/extend-kubernetes/operator/#operators-in-kubernetes"]
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
    explanation: "Un clúster nuevo trae cuatro namespaces: default, kube-system, kube-public y kube-node-lease. kube-monitoring y kube-apps no existen por defecto.",
    source: ["https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#initial-namespaces"]
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
    explanation: "El quórum es la mayoría (⌊n/2⌋ + 1). Con 3 miembros se necesitan 2, así que tolera 1 fallo; con 5 tolera 2. Por eso se recomienda un número impar de miembros: pasar a un número par no añade tolerancia.",
    source: ["https://etcd.io/docs/v3.6/faq/#what-is-failure-tolerance","https://etcd.io/docs/v3.6/faq/#why-an-odd-number-of-cluster-members"]
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
    explanation: "envFrom con configMapRef carga todas las claves del ConfigMap como variables de entorno. env.valueFrom.configMapKeyRef sirve para una sola clave y secretKeyRef es para Secrets.",
    source: ["https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#configure-all-key-value-pairs-in-a-configmap-as-container-environment-variables","https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#define-a-container-environment-variable-with-data-from-a-single-configmap"]
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
    explanation: "Mientras existan finalizers, el objeto queda con deletionTimestamp en estado Terminating; el controlador responsable hace la limpieza (por ejemplo, liberar un recurso externo) y quita el finalizer; cuando la lista queda vacía, el borrado se completa.",
    source: ["https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/#how-finalizers-work"]
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
    explanation: "Un Job solo admite Never u OnFailure, ya que Always contradiría la idea de ejecutar hasta completarse. UntilSuccess no existe.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/job/#pod-template"]
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
    explanation: "Por defecto kubectl lee $HOME/.kube/config. La variable KUBECONFIG (que puede listar varios archivos para fusionarlos) o la opción --kubeconfig permiten usar otros archivos.",
    source: ["https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/","https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/#the-kubeconfig-environment-variable"]
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
    explanation: "Un contexto agrupa con un nombre tres parámetros: cluster, user y namespace (opcional). Cambiar de contexto cambia a qué clúster y con qué identidad se conecta kubectl.",
    source: ["https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/#context"]
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
    explanation: "kubectl config use-context cambia el current-context del kubeconfig. kubectl config get-contexts lista los disponibles; set-cluster solo define una entrada de clúster.",
    source: ["https://kubernetes.io/docs/reference/kubectl/quick-reference/#kubectl-context-and-configuration"]
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
    explanation: "Modifica el contexto actual en el kubeconfig para que los comandos sin -n usen dev. Las otras opciones no son comandos válidos de kubectl.",
    source: ["https://kubernetes.io/docs/reference/kubectl/quick-reference/#kubectl-context-and-configuration","https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#setting-the-namespace-preference"]
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
    explanation: "Primero se identifica al cliente (autenticación, 401 si falla), luego se comprueba si puede realizar la acción (autorización, por ejemplo RBAC; 403 si se deniega) y finalmente los admission controllers pueden modificar o rechazar el objeto antes de validarlo y persistirlo en etcd.",
    source: ["https://kubernetes.io/docs/concepts/security/controlling-access/"]
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
    explanation: "drain marca el nodo como no programable y desaloja los Pods respetando los PodDisruptionBudgets (--ignore-daemonsets es necesario si hay Pods de DaemonSet). cordon solo impide nuevos Pods sin desalojar los existentes, y borrar el nodo no desaloja de forma ordenada.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/","https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/#use-kubectl-drain-to-remove-a-node-from-service"]
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
    explanation: "uncordon elimina la marca unschedulable del nodo. Los Pods desalojados no vuelven solos; los nuevos Pods podrán colocarse ahí.",
    source: ["https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/#use-kubectl-drain-to-remove-a-node-from-service"]
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
    explanation: "kubeadm init crea el control plane y kubeadm join añade nodos al clúster. minikube y kind crean clústeres locales de desarrollo, y kubectl es el cliente de la API.",
    source: ["https://kubernetes.io/docs/reference/setup-tools/kubeadm/"]
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
    explanation: "Primero se actualizan los nodos de control plane y después los workers, porque el kubelet nunca debe ser más nuevo que el kube-apiserver; saltarse versiones menores no está soportado (por ejemplo 1.35 -> 1.36 -> 1.37).",
    source: ["https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/","https://kubernetes.io/releases/version-skew-policy/#supported-component-upgrade-order"]
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
    explanation: "El kubelet no debe ser más nuevo que el kube-apiserver y puede ir hasta tres versiones menores por detrás (por ejemplo, kubelet 1.34 con kube-apiserver 1.37).",
    source: ["https://kubernetes.io/releases/version-skew-policy/#kubelet"]
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
    explanation: "etcdctl snapshot save (indicando endpoints y certificados) genera una copia del keyspace; la restauración se hace con etcdutl snapshot restore, ya que restaurar con etcdctl está obsoleto. Las otras opciones no existen.",
    source: ["https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/#backing-up-an-etcd-cluster","https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/#restoring-an-etcd-cluster"]
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
    explanation: "kubectl api-resources imprime los tipos de recurso que soporta el servidor, con shortnames, grupo/versión API y si son namespaced. api-versions solo lista grupos/versiones, y 'get all' muestra solo algunos tipos de objetos existentes.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/"]
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
    explanation: "-A es la forma corta de --all-namespaces. 'all' o 'any' no son nombres especiales de namespace; kubectl buscaría un namespace con ese nombre.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/","https://kubernetes.io/docs/reference/kubectl/quick-reference/#viewing-and-finding-resources"]
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
    explanation: "Con kubectl apply -f sobre archivos de configuración, kubectl detecta por objeto qué crear, actualizar o borrar; es la base de GitOps. run, create y scale son comandos imperativos.",
    source: ["https://kubernetes.io/docs/concepts/overview/working-with-objects/object-management/#declarative-object-configuration"]
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
    explanation: "--dry-run=client -o yaml imprime el objeto que se enviaría sin enviarlo al servidor. kubectl get ya no tiene la opción --export y explain solo muestra documentación.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/","https://kubernetes.io/docs/reference/kubectl/conventions/#kubectl-run"]
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
    explanation: "ResourceQuota fija topes agregados por namespace (recursos de cómputo y número de objetos por tipo). LimitRange define valores por defecto y mínimos/máximos por contenedor o Pod, no el total del namespace.",
    source: ["https://kubernetes.io/docs/concepts/policy/resource-quotas/","https://kubernetes.io/docs/concepts/policy/limit-range/"]
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
    explanation: "El admission controller de LimitRange (LimitRanger) inyecta los valores por defecto en los contenedores que no los declaran y rechaza los que violen mínimos o máximos.",
    source: ["https://kubernetes.io/docs/concepts/policy/limit-range/#constraints-on-resource-limits-and-requests"]
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
    explanation: "Con un control plane gestionado, el proveedor se encarga de su escalado, disponibilidad, parches y upgrades; el usuario gestiona sus cargas de trabajo y, según el modo, también los nodos.",
    source: ["https://kubernetes.io/docs/setup/production-environment/#production-considerations"]
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
    explanation: "Las versiones vX sin sufijo (v1, v2) son estables y siguen disponibles en todas las versiones futuras dentro de la versión mayor. Las alpha están deshabilitadas por defecto y pueden desaparecer sin aviso; las beta nuevas también están deshabilitadas por defecto y sus detalles aún pueden cambiar.",
    source: ["https://kubernetes.io/docs/reference/using-api/#api-versioning"]
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
    explanation: "nodeSelector es la forma más simple recomendada: exige que el nodo tenga todos los labels indicados. Las tolerations solo permiten tolerar taints, priorityClassName define la prioridad y topologySpreadConstraints reparte réplicas.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodeselector"]
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
    explanation: "En el filtrado se descartan nodos que no cumplen requisitos (recursos, taints, afinidad); en la puntuación se ordenan los restantes y se elige el de mayor puntaje. Luego se notifica al API server la decisión (binding).",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/#kube-scheduler-implementation"]
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
    explanation: "Los taints repelen Pods y solo los que tienen una toleration coincidente pueden programarse ahí. Ojo: la toleration permite pero no obliga; para atraer el Pod al nodo se combina con node affinity o nodeSelector.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/"]
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
    explanation: "NoExecute impide nuevos Pods y desaloja los existentes sin toleration (o tras tolerationSeconds si la toleration lo indica). NoSchedule solo afecta a nuevos Pods y PreferNoSchedule es una preferencia blanda. NoEvict no existe.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/"]
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
    explanation: "kubeadm aplica ese taint a los nodos de control plane; solo los Pods que lo toleran se programan allí (se puede quitar, por ejemplo, en un clúster de un solo nodo). Esos nodos sí tienen kubelet y runtime para ejecutar los static Pods.",
    source: ["https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#control-plane-node-isolation"]
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
    explanation: "'IgnoredDuringExecution' significa que cambios posteriores en los labels no desalojan Pods ya en ejecución. La afinidad admite operadores como In, NotIn, Exists, DoesNotExist, Gt y Lt, con múltiples valores.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity"]
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
    explanation: "La anti-afinidad de Pods con topologyKey kubernetes.io/hostname evita que dos réplicas coincidan en el mismo nodo. podAffinity haría lo contrario (agruparlas). topologySpreadConstraints es otra alternativa válida, pero no está entre las opciones.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity"]
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
    explanation: "topologySpreadConstraints limita la diferencia (maxSkew) de Pods entre dominios de topología definidos por un topologyKey, por ejemplo topology.kubernetes.io/zone.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/#spread-constraint-definition"]
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
    explanation: "El kube-scheduler usa los requests para decidir en qué nodo cabe el Pod, comparando su suma con la capacidad asignable del nodo. Los limits los aplica el kubelet en ejecución y no se usan para decidir la colocación.",
    source: ["https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#how-pods-with-resource-requests-are-scheduled"]
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
    explanation: "El mensaje indica que ningún nodo tiene memoria asignable suficiente para el request del Pod. Soluciones: reducir requests, liberar capacidad o añadir nodos (por ejemplo con Cluster Autoscaler).",
    source: ["https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#my-pods-are-pending-with-event-message-failedscheduling"]
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
    explanation: "Con nodeName fijado el Pod ya está asignado, así que el scheduler no interviene y el kubelet de ese nodo intenta ejecutarlo; si no hay recursos suficientes, el Pod puede fallar (por ejemplo con OutOfcpu).",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodename"]
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
    explanation: "Un PriorityClass (objeto sin namespace) asigna un valor entero de prioridad; si un Pod de alta prioridad no cabe, el scheduler puede desalojar (preempt) Pods de menor prioridad.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#priorityclass"]
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
    explanation: "Kubernetes permite varios schedulers; cada Pod elige el suyo con spec.schedulerName (si se omite, se usa 'default-scheduler').",
    source: ["https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/#specify-schedulers-for-pods"]
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
    explanation: "cordon marca el nodo como unschedulable; los Pods existentes siguen corriendo. Para desalojarlos de forma ordenada se usa kubectl drain.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/"]
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
    explanation: "Un PodDisruptionBudget define minAvailable o maxUnavailable para disrupciones voluntarias (drain, upgrades de nodos). No puede evitar disrupciones involuntarias como la caída de un nodo, aunque estas cuentan contra el presupuesto.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/disruptions/#pod-disruption-budgets"]
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
    explanation: "Mientras existan schedulingGates el Pod queda en estado SchedulingGated y el scheduler no lo considera; los gates solo se pueden quitar, no añadir tras la creación. Es útil para gestores de colas o cuotas externas (estable desde Kubernetes 1.30).",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/pod-scheduling-readiness/"]
  },
  {
    id: "F076",
    domain: "fundamentals",
    topic: "Scheduling",
    module: 4,
    q: "Which stable Kubernetes feature lets Pods request specialized hardware such as GPUs through ResourceClaims and DeviceClasses?",
    options: [
      "Dynamic Resource Allocation (DRA)",
      "PriorityClass",
      "Device Plugin API v1alpha1",
      "RuntimeClass"
    ],
    answer: [0],
    explanation: "DRA permite reclamar dispositivos de forma flexible mediante ResourceClaims y DeviceClasses, con filtrado por atributos y dispositivos compartidos. Su API principal (resource.k8s.io/v1) pasó a GA en v1.34 y complementa al modelo clásico de device plugins con recursos extendidos (por ejemplo nvidia.com/gpu).",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/","https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/"]
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
    explanation: "nodeSelector y node affinity se basan en labels de los nodos. Los taints son una propiedad distinta del nodo que repele Pods (no se basan en labels) y un PDB solo limita disrupciones voluntarias.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodeselector","https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity"]
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
    explanation: "Los contenedores son procesos aislados que comparten el sistema operativo (kernel) del host, por lo que son ligeros. Cada VM es una máquina completa con su propio sistema operativo sobre hardware virtualizado.",
    source: ["https://kubernetes.io/docs/concepts/overview/#going-back-in-time"]
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
    explanation: "Los namespaces aíslan lo que ve el proceso (PID, red, mount, usuario, etc.) y los cgroups limitan los recursos asignados a los procesos, como CPU y memoria. systemd y cron no proporcionan aislamiento.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/#what-is-a-pod","https://kubernetes.io/docs/concepts/architecture/cgroups/"]
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
    explanation: "La OCI (bajo la Linux Foundation) mantiene la Image Spec, la Runtime Spec y la Distribution Spec, que permiten que imágenes y runtimes de distintos proveedores sean interoperables.",
    source: ["https://opencontainers.org/about/overview/"]
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
    explanation: "runc es la herramienta de línea de comandos (donada por Docker a la OCI) que crea y ejecuta contenedores en Linux según la especificación OCI. containerd y CRI-O son runtimes de alto nivel que implementan CRI y delegan la creación del contenedor en runc (u otro runtime OCI como crun).",
    source: ["https://github.com/opencontainers/runc","https://opencontainers.org/about/overview/"]
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
    explanation: "La Container Runtime Interface (CRI) es el protocolo gRPC entre el kubelet y el runtime. CNI es para red, CSI para almacenamiento y la Distribution Spec define cómo se distribuyen imágenes desde registries.",
    source: ["https://kubernetes.io/docs/concepts/architecture/cri/"]
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
    explanation: "Se eliminó solo el adaptador que permitía al kubelet usar Docker Engine como runtime. Las imágenes producidas con docker build funcionan con todas las implementaciones de CRI, como containerd o CRI-O.",
    source: ["https://kubernetes.io/blog/2022/02/17/dockershim-faq/#will-my-existing-container-images-still-work","https://kubernetes.io/docs/setup/production-environment/container-runtimes/"]
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
    explanation: "Las etapas de compilación incluyen compiladores y dependencias de build; la etapa final copia solo el binario o artefacto (COPY --from), reduciendo tamaño y superficie de ataque.",
    source: ["https://docs.podman.io/en/latest/markdown/podman-build.1.html"]
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
    explanation: "El digest identifica de forma única una versión concreta de la imagen, así que siempre se ejecuta el mismo código. Una etiqueta puede moverse para apuntar a otra imagen, lo que rompe la reproducibilidad.",
    source: ["https://kubernetes.io/docs/concepts/containers/images/#image-names"]
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
    explanation: "Si se omite imagePullPolicy y la etiqueta es :latest o no hay etiqueta, el valor por defecto es Always; con cualquier otra etiqueta o con un digest es IfNotPresent. OnFailure no es un valor de imagePullPolicy.",
    source: ["https://kubernetes.io/docs/concepts/containers/images/#image-pull-policy"]
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
    explanation: "CMD define el comando o los argumentos por defecto; en Kubernetes el campo 'args' corresponde a CMD y 'command' a ENTRYPOINT. RUN se ejecuta durante la construcción de la imagen, no al arrancar el contenedor.",
    source: ["https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/#define-a-command-and-arguments-when-you-create-a-pod"]
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
    explanation: "imagePullSecrets referencia un Secret (tipo kubernetes.io/dockerconfigjson o dockercfg) del mismo namespace con las credenciales del registry; puede declararse en el Pod o en la ServiceAccount para que se aplique a todos sus Pods.",
    source: ["https://kubernetes.io/docs/concepts/containers/images/#specifying-imagepullsecrets-on-a-pod"]
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
    explanation: "crictl es una CLI para runtimes compatibles con CRI (containerd, CRI-O) que permite listar Pods, contenedores e imágenes en el nodo. En nodos sin Docker Engine el comando docker no ve esos contenedores.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/"]
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
    explanation: "Una capa es un conjunto serializado de cambios del sistema de archivos; las capas se apilan para formar el sistema de archivos completo, y como son inmutables se cachean y se comparten (al hacer pull solo se descargan las que faltan).",
    source: ["https://github.com/opencontainers/image-spec/blob/main/layer.md","https://kubernetes.io/docs/concepts/containers/images/#image-pull-policy"]
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
    explanation: "RuntimeClass mapea un nombre a un handler configurado en el runtime del nodo; los Pods lo seleccionan con spec.runtimeClassName para obtener, por ejemplo, el aislamiento reforzado de runtimes sandbox como gVisor o Kata Containers.",
    source: ["https://kubernetes.io/docs/concepts/containers/runtime-class/#usage","https://kubernetes.io/blog/2018/10/10/kubernetes-v1.12-introducing-runtimeclass/"]
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
    explanation: "Imágenes mínimas reducen vulnerabilidades, no-root (runAsNonRoot) limita el impacto de un compromiso y un proceso por contenedor simplifica logs, probes y escalado. El estado y la configuración deben vivir fuera de la imagen (config separada del código).",
    source: ["https://kubernetes.io/docs/concepts/security/application-security-checklist/#security-context-pod","https://12factor.net/config","https://12factor.net/processes"]
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
    explanation: "La definición de cloud native de la CNCF (v1.1, 2024) cita como tecnologías típicas contenedores, service meshes, multi-tenancy, microservicios, infraestructura inmutable, serverless y APIs declarativas, para lograr sistemas seguros, resilientes, gestionables, sostenibles y observables.",
    source: ["https://github.com/cncf/toc/blob/main/DEFINITION.md"]
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
    explanation: "La infraestructura inmutable (VMs, contenedores, appliances) no se modifica una vez desplegada: se construye una nueva versión y se reemplaza la anterior, lo que elimina la deriva de configuración y facilita los rollbacks.",
    source: ["https://glossary.cncf.io/immutable-infrastructure/"]
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
    explanation: "containerd y CRI-O implementan CRI y gestionan imágenes y ciclo de vida. runc y crun son runtimes OCI de bajo nivel que ellos invocan para crear los contenedores.",
    source: ["https://kubernetes.io/docs/setup/production-environment/container-runtimes/#containerd","https://kubernetes.io/docs/setup/production-environment/container-runtimes/#cri-o"]
  },
  {
    id: "F096",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "Which OCI specification standardizes the API protocol that registries and clients use to push and pull container images?",
    options: [
      "Container Runtime Interface (CRI)",
      "OCI Runtime Specification",
      "OCI Image Specification",
      "OCI Distribution Specification"
    ],
    answer: [3],
    explanation: "La Distribution Spec define el protocolo de API para distribuir contenido (push/pull en registries). La Image Spec define el formato de la imagen y la Runtime Spec cómo ejecutar un bundle; CRI es una API de Kubernetes, no de la OCI.",
    source: ["https://github.com/opencontainers/distribution-spec","https://opencontainers.org/about/overview/"]
  },
  {
    id: "F097",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "A Pod uses image: busybox with no registry hostname and no tag. Which image does Kubernetes pull by default?",
    options: [
      "docker.io/library/busybox:latest",
      "quay.io/busybox:latest",
      "The Pod is rejected because the registry is mandatory",
      "registry.k8s.io/busybox:stable"
    ],
    answer: [0],
    explanation: "Si no se indica registry, Kubernetes asume el registro público de Docker (configurable en el runtime), y si no hay etiqueta usa latest; por eso busybox equivale a docker.io/library/busybox:latest.",
    source: ["https://kubernetes.io/docs/concepts/containers/images/#image-names"]
  },
  {
    id: "F098",
    domain: "fundamentals",
    topic: "Containerization",
    module: 1,
    q: "In Kubernetes v1.26 and later, what happens if a node's container runtime does not support the v1 CRI API?",
    options: [
      "The API server converts the requests to v1alpha2",
      "The kubelet does not register the node",
      "Pods run without resource limits",
      "The kubelet falls back to dockershim"
    ],
    answer: [1],
    explanation: "Desde v1.26 el kubelet exige que el runtime soporte la API CRI v1; si no la soporta, el kubelet no registra el nodo. dockershim ya no existe desde v1.24.",
    source: ["https://kubernetes.io/docs/concepts/architecture/cri/#api","https://kubernetes.io/docs/setup/production-environment/container-runtimes/#cri-versions"]
  },
  {
    id: "F099",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "According to the Kubernetes API deprecation policy, which statement about GA (stable) API versions such as v1 is correct?",
    options: [
      "They can be removed in any minor release without notice",
      "They are disabled by default and must be enabled in the kube-apiserver",
      "They may be deprecated but must not be removed within a major version of Kubernetes",
      "They are removed 9 months or 3 minor releases after deprecation"
    ],
    answer: [2],
    explanation: "Las versiones GA pueden marcarse como obsoletas pero no eliminarse dentro de una versión mayor. Las beta dejan de servirse 9 meses o 3 versiones menores después de su deprecación, y las alpha pueden eliminarse en cualquier versión sin aviso previo.",
    source: ["https://kubernetes.io/docs/reference/using-api/deprecation-policy/#deprecating-parts-of-the-api","https://kubernetes.io/docs/reference/using-api/#api-versioning"]
  },
  {
    id: "F100",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "The KUBECONFIG environment variable lists several kubeconfig files and no --kubeconfig flag is used. How does kubectl treat them?",
    options: [
      "It merges them, and the first file that sets a particular value wins",
      "It fails because only one file is allowed",
      "It uses only the last file in the list",
      "It merges them, and the last file that sets a value always overrides earlier ones"
    ],
    answer: [0],
    explanation: "Con KUBECONFIG kubectl fusiona la lista de archivos (separados por ':' en Linux/macOS y ';' en Windows) y gana el primer archivo que define cada valor. En cambio, --kubeconfig usa un único archivo sin fusionar.",
    source: ["https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/#merging-kubeconfig-files"]
  },
  {
    id: "F101",
    domain: "fundamentals",
    topic: "Administration",
    module: 2,
    q: "Your cluster's kube-apiserver runs version 1.37. According to the version skew policy, which kubectl versions are supported against it?",
    options: [
      "Any kubectl from 1.34 to 1.37",
      "Any kubectl version, because the API is backward compatible",
      "kubectl 1.36, 1.37 and 1.38",
      "Only kubectl 1.37"
    ],
    answer: [2],
    explanation: "kubectl está soportado dentro de una versión menor (más antigua o más nueva) respecto al kube-apiserver. La regla de hasta tres versiones menores por detrás aplica al kubelet y a kube-proxy, no a kubectl.",
    source: ["https://kubernetes.io/releases/version-skew-policy/#kubectl"]
  },
  {
    id: "O001",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which statement reflects the Kubernetes networking model?",
    options: [
      "Pods can only communicate with Pods in the same namespace",
      "Every Pod gets its own IP address and can reach all other Pods without NAT",
      "Each container in a Pod gets a different IP address",
      "Pods on different nodes must use NAT to communicate"
    ],
    answer: [1],
    explanation: "El modelo de red de Kubernetes exige una red plana: cada Pod tiene su propia IP y puede comunicarse con cualquier otro Pod sin NAT. Los contenedores de un Pod comparten IP, y el aislamiento por namespace solo se logra con NetworkPolicies.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/#the-kubernetes-network-model"]
  },
  {
    id: "O002",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which component is responsible for assigning Pod IP addresses and wiring the Pod network interfaces?",
    options: [
      "CoreDNS",
      "kube-scheduler",
      "kube-proxy",
      "The CNI plugin invoked by the container runtime"
    ],
    answer: [3],
    explanation: "Al crear el sandbox del Pod, el runtime invoca el plugin CNI (Calico, Cilium, Flannel, etc.), que crea la interfaz y asigna la IP (IPAM). kube-proxy solo implementa Services y CoreDNS resuelve nombres.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/#the-kubernetes-network-model"]
  },
  {
    id: "O003",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "What is the default Service type when none is specified?",
    options: [
      "ExternalName",
      "NodePort",
      "ClusterIP",
      "LoadBalancer"
    ],
    answer: [2],
    explanation: "ClusterIP es el tipo por defecto: asigna una IP virtual accesible solo dentro del clúster. NodePort y LoadBalancer exponen el Service hacia fuera, y ExternalName es un alias DNS.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types"]
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
    explanation: "Por defecto el API server asigna NodePorts en el rango 30000-32767 (configurable con --service-node-port-range). Ese puerto se abre en todos los nodos.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport"]
  },
  {
    id: "O005",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which Service type maps a Service to an external DNS name by returning a CNAME record, without any proxying?",
    options: [
      "LoadBalancer",
      "NodePort",
      "ClusterIP",
      "ExternalName"
    ],
    answer: [3],
    explanation: "Un Service ExternalName no tiene selector ni IP: el DNS del clúster responde con un CNAME hacia el nombre externo (por ejemplo, una base de datos gestionada) y no se configura ningún proxy.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/service/#externalname"]
  },
  {
    id: "O006",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "How do you create a headless Service?",
    options: [
      "Set externalTrafficPolicy: Local",
      "Set clusterIP: None",
      "Set type: Headless",
      "Omit the ports section"
    ],
    answer: [1],
    explanation: "Con clusterIP: None no se asigna IP virtual ni hay balanceo de kube-proxy; el DNS devuelve directamente las IPs de los Pods. Es lo que usan los StatefulSets para nombres estables por Pod. 'Headless' no es un valor válido de type.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/service/#headless-services"]
  },
  {
    id: "O007",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "What is the fully qualified DNS name of a Service named api in the namespace shop, assuming the default cluster domain?",
    options: [
      "api.shop.svc.cluster.local",
      "api.svc.shop.local",
      "api.shop.cluster.local",
      "shop.api.svc.cluster.local"
    ],
    answer: [0],
    explanation: "El formato es <service>.<namespace>.svc.<dominio-del-clúster>. Desde el mismo namespace basta con 'api' y desde otro con 'api.shop', gracias a los dominios de búsqueda configurados en el Pod.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#services"]
  },
  {
    id: "O008",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which component provides DNS-based service discovery in most Kubernetes clusters?",
    options: [
      "etcd",
      "CoreDNS",
      "Envoy",
      "kube-dns-proxy"
    ],
    answer: [1],
    explanation: "CoreDNS (proyecto graduado de la CNCF) es la implementación por defecto del DNS del clúster; corre en kube-system (Pods con la etiqueta k8s-app=kube-dns, detrás del Service kube-dns) y resuelve nombres de Services y Pods.",
    source: ["https://kubernetes.io/docs/tasks/administer-cluster/coredns/","https://www.cncf.io/projects/coredns/"]
  },
  {
    id: "O009",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which resource tracks, in a scalable way, the network endpoints (Pod IPs and ports) that back a Service?",
    options: [
      "ServicePort",
      "NetworkPolicy",
      "EndpointSlice",
      "IngressClass"
    ],
    answer: [2],
    explanation: "EndpointSlice divide los endpoints en porciones para escalar a miles de Pods; kube-proxy y otros consumidores la leen. La API v1 Endpoints está obsoleta desde Kubernetes 1.33.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/","https://kubernetes.io/docs/concepts/services-networking/service/#endpoints"]
  },
  {
    id: "O010",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "What is required for an Ingress resource to have any effect?",
    options: [
      "An Ingress controller running in the cluster",
      "A dedicated LoadBalancer Service per Ingress",
      "A special CoreDNS plugin",
      "A service mesh"
    ],
    answer: [0],
    explanation: "El objeto Ingress solo declara reglas HTTP; un controlador (por ejemplo Traefik, HAProxy, Contour o el de un proveedor cloud) debe leerlas y configurar el proxy. Sin controlador el Ingress no hace nada. La API Ingress está congelada y el proyecto recomienda Gateway API.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/ingress/#prerequisites"]
  },
  {
    id: "O011",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which statement about the Gateway API is correct?",
    options: [
      "It is a deprecated alpha API that was replaced by Ingress",
      "It is built into kube-proxy and needs no controller",
      "It only supports raw TCP traffic",
      "It is a GA, role-oriented API that uses resources such as GatewayClass, Gateway and HTTPRoute"
    ],
    answer: [3],
    explanation: "Gateway API (GA desde v1.0, octubre de 2023) es el sucesor de Ingress: se instala como CRDs, separa responsabilidades por rol, es más expresivo (cabeceras, pesos, gRPC, TLS) y, como Ingress, necesita una implementación que la controle.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/gateway/","https://kubernetes.io/blog/2023/10/31/gateway-api-ga/"]
  },
  {
    id: "O012",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which two Gateway API resources are typically owned by infrastructure providers or cluster operators rather than by application developers? (Choose 2)",
    options: [
      "HTTPRoute",
      "GatewayClass",
      "Gateway",
      "Service"
    ],
    answer: [1,2],
    explanation: "En el modelo de roles, el proveedor de infraestructura define la GatewayClass y el operador del clúster despliega el Gateway (listeners, puertos, TLS). Los desarrolladores gestionan sus HTTPRoute y Services.",
    source: ["https://gateway-api.sigs.k8s.io/reference/api-types/gatewayclass/","https://gateway-api.sigs.k8s.io/docs/concepts/api-overview/"]
  },
  {
    id: "O013",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "The community ingress-nginx controller was retired in 2026. What is the recommended long-term direction for new HTTP routing configurations?",
    options: [
      "Adopt the Gateway API with a conformant implementation",
      "Expose every application with hostNetwork Pods",
      "Switch all Services to NodePort",
      "Use ExternalName Services for routing"
    ],
    answer: [0],
    explanation: "El proyecto ingress-nginx de Kubernetes dejó de recibir mantenimiento en marzo de 2026 (sin releases ni parches de seguridad); la comunidad recomienda migrar a Gateway API (o a otro controlador mantenido). Las otras opciones no ofrecen enrutamiento HTTP L7.",
    source: ["https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/"]
  },
  {
    id: "O014",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "What does a service mesh such as Istio or Linkerd typically provide without changes to application code?",
    options: [
      "Container image builds",
      "Persistent storage for microservices",
      "Automatic node provisioning",
      "Mutual TLS, traffic management, retries and observability between services"
    ],
    answer: [3],
    explanation: "Una service mesh añade una capa de infraestructura para la comunicación entre servicios: mTLS automático, enrutamiento, reintentos, timeouts, circuit breaking y métricas/trazas uniformes.",
    source: ["https://istio.io/latest/about/service-mesh/","https://linkerd.io/what-is-a-service-mesh/"]
  },
  {
    id: "O015",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "Traditional service meshes inject a proxy container into every application Pod. What is this pattern called?",
    options: [
      "Init container",
      "Ambassador node",
      "Sidecar",
      "DaemonSet gateway"
    ],
    answer: [2],
    explanation: "El proxy sidecar (por ejemplo Envoy o linkerd2-proxy) intercepta el tráfico del Pod. Istio también ofrece el modo ambient, sin sidecars, con un proxy por nodo (ztunnel) y waypoints L7 opcionales.",
    source: ["https://linkerd.io/what-is-a-service-mesh/","https://istio.io/latest/docs/overview/dataplane-modes/"]
  },
  {
    id: "O016",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which two Service types expose an application to clients outside the cluster? (Choose 2)",
    options: [
      "LoadBalancer",
      "Headless (clusterIP: None)",
      "ClusterIP",
      "NodePort"
    ],
    answer: [0,3],
    explanation: "NodePort abre un puerto en cada nodo y LoadBalancer provisiona un balanceador externo (que normalmente se apoya en NodePorts). ClusterIP y los Services headless solo son accesibles dentro del clúster.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types"]
  },
  {
    id: "O017",
    domain: "orchestration",
    topic: "Networking",
    module: 6,
    q: "Which kube-proxy mode, generally available since Kubernetes 1.33, uses the modern Linux packet-filtering framework as the successor to iptables?",
    options: [
      "kernelspace",
      "nftables",
      "userspace",
      "ipfw"
    ],
    answer: [1],
    explanation: "El modo nftables es estable desde 1.33 (requiere kernel 5.13+) y resuelve problemas de rendimiento de iptables, que sigue siendo el modo por defecto en 1.37. userspace ya no existe, ipfw no es un modo de kube-proxy y kernelspace es el modo para nodos Windows; ipvs está obsoleto desde 1.35.",
    source: ["https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-modes","https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/"]
  },
  {
    id: "O018",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "What are the 4C's of cloud native security, from the outermost to the innermost layer?",
    options: [
      "Cloud, Container, Cluster, Code",
      "Cluster, Cloud, Code, Container",
      "Cloud, Cluster, Container, Code",
      "Code, Container, Cluster, Cloud"
    ],
    answer: [2],
    explanation: "El modelo de capas es Cloud (o centro de datos), Cluster, Container y Code; cada capa se apoya en la seguridad de la capa exterior. La documentación actual de Kubernetes organiza la seguridad por fases del ciclo de vida, pero el modelo 4C (documentado hasta v1.28) sigue siendo materia de examen.",
    source: ["https://github.com/kubernetes/website/blob/release-1.28/content/en/docs/concepts/security/overview.md","https://kubernetes.io/docs/concepts/security/cloud-native-security/"]
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
      "ServiceAccount",
      "ClusterRole"
    ],
    answer: [0],
    explanation: "Un Role define reglas (verbos sobre recursos) en un namespace concreto. ClusterRole es de ámbito de clúster, ClusterRoleBinding asigna permisos en todo el clúster y una ServiceAccount es una identidad, no un permiso.",
    source: ["https://kubernetes.io/docs/reference/access-authn-authz/rbac/#role-and-clusterrole"]
  },
  {
    id: "O020",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "A RoleBinding in the namespace dev references the ClusterRole named view. Which permissions does the subject receive?",
    options: [
      "cluster-admin permissions",
      "The view permissions only in the dev namespace",
      "No permissions, because a RoleBinding cannot reference a ClusterRole",
      "The view permissions in all namespaces"
    ],
    answer: [1],
    explanation: "Un RoleBinding puede referenciar un ClusterRole para reutilizar sus reglas, pero los permisos quedan limitados al namespace del RoleBinding. Para todo el clúster se necesitaría un ClusterRoleBinding.",
    source: ["https://kubernetes.io/docs/reference/access-authn-authz/rbac/#rolebinding-and-clusterrolebinding"]
  },
  {
    id: "O021",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which two statements about Kubernetes RBAC are correct? (Choose 2)",
    options: [
      "A ClusterRoleBinding grants the referenced permissions across the whole cluster",
      "RBAC permissions are purely additive; there are no deny rules",
      "RBAC rules are defined in NetworkPolicy objects",
      "A Role can contain explicit deny rules"
    ],
    answer: [0,1],
    explanation: "RBAC solo concede permisos (todo lo no permitido está denegado) y un ClusterRoleBinding aplica en todos los namespaces. No hay reglas 'deny' y NetworkPolicy controla tráfico de red, no acceso a la API.",
    source: ["https://kubernetes.io/docs/reference/access-authn-authz/rbac/"]
  },
  {
    id: "O022",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which identity do processes running inside a Pod use to authenticate to the Kubernetes API?",
    options: [
      "The kubeconfig of the node",
      "The Node object",
      "A User object",
      "A ServiceAccount"
    ],
    answer: [3],
    explanation: "Cada Pod se ejecuta con una ServiceAccount (default si no se indica) y recibe un token proyectado, de duración limitada y rotación automática, para autenticarse. Kubernetes no tiene objetos User.",
    source: ["https://kubernetes.io/docs/concepts/security/service-accounts/"]
  },
  {
    id: "O023",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "How can you check whether your current identity is allowed to delete Deployments in the namespace prod?",
    options: [
      "kubectl describe user me",
      "kubectl auth can-i delete deployments -n prod",
      "kubectl rbac verify deployments",
      "kubectl get rolebindings --check"
    ],
    answer: [1],
    explanation: "kubectl auth can-i consulta al API server (SelfSubjectAccessReview) si la acción está permitida; con --as se puede comprobar en nombre de otro usuario o ServiceAccount. Las demás opciones no existen.",
    source: ["https://kubernetes.io/docs/reference/access-authn-authz/authorization/#checking-api-access"]
  },
  {
    id: "O024",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which policy levels are defined by the Pod Security Standards?",
    options: [
      "Privileged, Baseline and Restricted",
      "Low, Medium and High",
      "Open, Standard and Hardened",
      "Permissive, Enforcing and Disabled"
    ],
    answer: [0],
    explanation: "Privileged no impone restricciones, Baseline evita escaladas de privilegio conocidas y Restricted aplica las mejores prácticas de endurecimiento (no-root, sin capabilities, seccomp, etc.).",
    source: ["https://kubernetes.io/docs/concepts/security/pod-security-standards/"]
  },
  {
    id: "O025",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which namespace label makes Pod Security Admission reject Pods that violate the restricted standard?",
    options: [
      "psp.kubernetes.io/level: restricted",
      "security.kubernetes.io/policy: restricted",
      "admission.k8s.io/restricted: true",
      "pod-security.kubernetes.io/enforce: restricted"
    ],
    answer: [3],
    explanation: "Pod Security Admission se configura con labels en el namespace con el formato pod-security.kubernetes.io/<modo>: <nivel>. Las otras etiquetas no son reconocidas por el controlador.",
    source: ["https://kubernetes.io/docs/concepts/security/pod-security-admission/#pod-security-admission-labels-for-namespaces"]
  },
  {
    id: "O026",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Besides enforce, which two Pod Security Admission modes exist? (Choose 2)",
    options: [
      "mutate",
      "warn",
      "audit",
      "dry-run"
    ],
    answer: [1,2],
    explanation: "enforce rechaza los Pods que violan el nivel, audit añade una anotación al evento del log de auditoría y warn devuelve una advertencia al usuario. Pod Security Admission valida, no muta Pods.",
    source: ["https://kubernetes.io/docs/concepts/security/pod-security-admission/#pod-security-levels"]
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
    explanation: "Pod Security Admission (estable desde 1.25) es el controlador integrado que aplica los Pod Security Standards por namespace; la alternativa es un admission plugin de terceros. SecurityContextConstraints es propio de OpenShift, y NetworkPolicy y RuntimeClass resuelven otros problemas.",
    source: ["https://kubernetes.io/docs/concepts/security/pod-security-policy/","https://kubernetes.io/docs/concepts/security/pod-security-admission/"]
  },
  {
    id: "O028",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which securityContext setting prevents a container from running as UID 0?",
    options: [
      "allowPrivilegeEscalation: true",
      "privileged: false",
      "runAsNonRoot: true",
      "readOnlyRootFilesystem: true"
    ],
    answer: [2],
    explanation: "Con runAsNonRoot: true el kubelet valida la imagen y se niega a arrancar el contenedor si fuera a ejecutarse como root. readOnlyRootFilesystem protege el sistema de archivos, pero no cambia el usuario.",
    source: ["https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#SecurityContext"]
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
    explanation: "Impedir la escalada de privilegios y eliminar todas las capabilities de Linux reducen la superficie de ataque (ambos son exigidos por el nivel restricted). privileged: true y ejecutar como UID 0 hacen lo contrario.",
    source: ["https://kubernetes.io/docs/concepts/security/pod-security-standards/#restricted","https://kubernetes.io/docs/tasks/configure-pod-container/security-context/"]
  },
  {
    id: "O030",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "When no NetworkPolicy selects the Pods in a namespace, how is their traffic treated?",
    options: [
      "All traffic is allowed",
      "All ingress and egress traffic is denied",
      "Only DNS traffic is allowed",
      "Only traffic within the same namespace is allowed"
    ],
    answer: [0],
    explanation: "Por defecto Kubernetes permite todo el tráfico entre Pods. Solo cuando una NetworkPolicy selecciona un Pod, ese Pod pasa a aceptar únicamente el tráfico explícitamente permitido.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/network-policies/#the-two-sorts-of-pod-isolation"]
  },
  {
    id: "O031",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "A NetworkPolicy has podSelector: {}, policyTypes: [Ingress] and no ingress rules. What is its effect?",
    options: [
      "It has no effect because the podSelector is empty",
      "All Pods in the namespace keep allowing all ingress traffic",
      "It applies to Pods in all namespaces",
      "All ingress traffic to every Pod in the namespace is denied"
    ],
    answer: [3],
    explanation: "Un podSelector vacío selecciona todos los Pods del namespace y, al no haber reglas de ingress, no se permite ninguna entrada: es la política 'default deny ingress'. Las NetworkPolicies son namespaced.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/network-policies/#default-deny-all-ingress-traffic"]
  },
  {
    id: "O032",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "NetworkPolicies have been created, but they have no effect on traffic. What is the most likely reason?",
    options: [
      "kube-proxy runs in iptables mode",
      "The CNI plugin in use does not implement NetworkPolicy",
      "CoreDNS is not running",
      "The Pods do not have resource limits"
    ],
    answer: [1],
    explanation: "El API server acepta NetworkPolicies, pero quien las aplica es el plugin de red. CNIs como Calico o Cilium las implementan; otros, como Flannel por sí solo, no.",
    source: ["https://kubernetes.io/docs/concepts/services-networking/network-policies/#prerequisites"]
  },
  {
    id: "O033",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "How can you prevent a Pod from automatically mounting a ServiceAccount token that it does not need?",
    options: [
      "Set hostPID: true",
      "Delete the default ServiceAccount",
      "Set imagePullPolicy: Never",
      "Set automountServiceAccountToken: false"
    ],
    answer: [3],
    explanation: "automountServiceAccountToken: false (en el Pod o en la ServiceAccount) evita montar el token, aplicando mínimo privilegio. Borrar la ServiceAccount default no es viable porque el control plane la recrea.",
    source: ["https://kubernetes.io/docs/concepts/security/service-accounts/"]
  },
  {
    id: "O034",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which CNCF graduated project performs runtime threat detection, for example alerting when a shell is spawned inside a container?",
    options: [
      "Falco",
      "Trivy",
      "Harbor",
      "Notary"
    ],
    answer: [0],
    explanation: "Falco (graduado en 2024) analiza las llamadas al sistema del kernel (por defecto con una sonda eBPF moderna) y genera alertas según reglas. Trivy es un escáner de vulnerabilidades, Harbor un registry y Notary firma de contenido; ninguno detecta comportamiento en tiempo de ejecución.",
    source: ["https://www.cncf.io/projects/falco/","https://falco.org/docs/"]
  },
  {
    id: "O035",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "Which native, in-process admission mechanism (GA since Kubernetes 1.30) lets administrators write validation rules in CEL without running a webhook?",
    options: [
      "MutatingWebhookConfiguration",
      "ValidatingAdmissionPolicy",
      "PodSecurityPolicy",
      "AdmissionReview"
    ],
    answer: [1],
    explanation: "ValidatingAdmissionPolicy evalúa expresiones CEL dentro del API server, evitando la latencia y la operación de un webhook externo. PodSecurityPolicy fue eliminado y AdmissionReview es el formato de mensaje de los webhooks.",
    source: ["https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/"]
  },
  {
    id: "O036",
    domain: "orchestration",
    topic: "Security",
    module: 5,
    q: "What is the purpose of signing container images with tools such as Sigstore cosign?",
    options: [
      "To speed up image pulls",
      "To encrypt image layers at rest",
      "To verify image provenance and integrity before deployment",
      "To compress image layers"
    ],
    answer: [2],
    explanation: "La firma permite comprobar quién construyó la imagen y que no fue alterada; políticas de admisión (por ejemplo el policy-controller de Sigstore) pueden exigir firmas válidas. Forma parte de la seguridad de la cadena de suministro junto con SBOMs y escaneo.",
    source: ["https://kubernetes.io/docs/tasks/administer-cluster/verify-signed-artifacts/"]
  },
  {
    id: "O037",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A node shows STATUS NotReady. What should you check first on that node?",
    options: [
      "The kubelet service and its logs, for example with systemctl status kubelet and journalctl -u kubelet",
      "The CoreDNS configuration",
      "The kube-scheduler logs",
      "The Ingress controller"
    ],
    answer: [0],
    explanation: "El estado Ready lo reporta el kubelet; si se detiene, pierde conexión o el runtime/CNI falla, el nodo pasa a NotReady. kubectl describe node muestra las condiciones y los logs del kubelet (journalctl en sistemas con systemd) suelen revelar la causa.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-cluster/"]
  },
  {
    id: "O038",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A Service exists but requests to it time out, and kubectl get endpointslices shows no endpoints for it. What is the most likely cause?",
    options: [
      "The Service type is ClusterIP",
      "The Pods have resource limits",
      "The Service selector does not match the labels of any Ready Pods",
      "CoreDNS is down"
    ],
    answer: [2],
    explanation: "Sin endpoints, kube-proxy no tiene backends a los que enviar tráfico. Suele deberse a labels que no coinciden con el selector o a Pods que no están Ready. Un fallo de DNS daría error de resolución, no timeouts con endpoints vacíos.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/#does-the-service-have-any-endpointslices"]
  },
  {
    id: "O039",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 6,
    q: "Applications cannot resolve Service names, but connecting by IP address works. Where should you look first?",
    options: [
      "The etcd database",
      "The CoreDNS Pods and their logs in the kube-system namespace",
      "The kube-scheduler logs",
      "The container registry"
    ],
    answer: [1],
    explanation: "Si la conectividad por IP funciona pero la resolución falla, el problema está en el DNS del clúster: Pods de CoreDNS caídos, su Service kube-dns, su ConfigMap o el /etc/resolv.conf del Pod.",
    source: ["https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/"]
  },
  {
    id: "O040",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "Which command shows the current CPU and memory usage of nodes, and what does it depend on?",
    options: [
      "kubectl describe nodes, which depends on Prometheus",
      "kubectl get nodes -o metrics, which depends on kube-state-metrics",
      "kubectl usage nodes, which depends on the Dashboard",
      "kubectl top nodes, which depends on metrics-server"
    ],
    answer: [3],
    explanation: "kubectl top consulta la Metrics API (metrics.k8s.io), que normalmente sirve metrics-server. Sin él, el comando devuelve un error de que la API de métricas no está disponible.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/"]
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
      "The Service type",
      "The image tag"
    ],
    answer: [1],
    explanation: "El Pod no puede programarse hasta que su PVC esté Bound. Hay que revisar kubectl describe pvc: StorageClass inexistente, provisionador CSI caído o ningún PV que cumpla tamaño y access mode.",
    source: ["https://kubernetes.io/docs/concepts/storage/persistent-volumes/#binding","https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode"]
  },
  {
    id: "O042",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A Pod shows ImagePullBackOff. Which two causes are most likely? (Choose 2)",
    options: [
      "Credentials for a private registry are missing or invalid",
      "The image name or tag does not exist in the registry",
      "The container exceeded its memory limit",
      "The readiness probe is failing"
    ],
    answer: [0,1],
    explanation: "ImagePullBackOff indica que el kubelet no pudo descargar la imagen y reintenta con back-off creciente (hasta 5 minutos): nombre o tag erróneo, registry inaccesible o falta de imagePullSecrets. Los problemas de memoria o probes ocurren cuando el contenedor ya existe.",
    source: ["https://kubernetes.io/docs/concepts/containers/images/#imagepullbackoff"]
  },
  {
    id: "O043",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A Pod reports CreateContainerConfigError. What is a common cause?",
    options: [
      "The Service has no endpoints",
      "The image is too large",
      "The node is out of disk space",
      "A referenced ConfigMap or Secret (or one of its keys) does not exist"
    ],
    answer: [3],
    explanation: "Este error lo devuelve el kubelet cuando no puede generar la configuración del contenedor, típicamente porque una variable de entorno referencia un ConfigMap/Secret o una clave inexistente (sin optional: true). kubectl describe pod muestra el detalle en los eventos.",
    source: ["https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#restrictions","https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/kuberuntime/kuberuntime_container.go"]
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
    explanation: "kubeadm ejecuta el API server, el scheduler, el controller-manager y etcd como static Pods gestionados por el kubelet. Si el API server cae, se revisa el manifiesto, los logs del contenedor (crictl logs) y los del kubelet.",
    source: ["https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/","https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/"]
  },
  {
    id: "O045",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 5,
    q: "Two Pods in different namespaces can no longer communicate after a security change, while DNS resolution still works. What is the most likely cause?",
    options: [
      "A LimitRange in one of the namespaces",
      "A missing PriorityClass",
      "A NetworkPolicy that does not allow that traffic",
      "An incorrect imagePullPolicy"
    ],
    answer: [2],
    explanation: "Tras introducir NetworkPolicies, el tráfico no permitido explícitamente se bloquea. Hay que revisar las políticas de ingress del destino y de egress del origen (incluyendo namespaceSelector).",
    source: ["https://kubernetes.io/docs/concepts/services-networking/network-policies/"]
  },
  {
    id: "O046",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 4,
    q: "A Pod is stuck in Pending. Which two causes are plausible? (Choose 2)",
    options: [
      "The application inside the container throws exceptions at startup",
      "No node has enough allocatable CPU or memory for the Pod's requests",
      "The liveness probe is misconfigured",
      "The Pod does not tolerate the taints present on the available nodes"
    ],
    answer: [1,3],
    explanation: "Pending significa que el Pod aún no se ha programado (o no se han creado sus contenedores): falta de recursos, taints sin toleration, afinidad imposible o PVC sin enlazar. Las excepciones y probes solo afectan a contenedores ya en ejecución.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-phase","https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/"]
  },
  {
    id: "O047",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A container terminated with exit code 137. What does that usually indicate?",
    options: [
      "It was killed with SIGKILL, frequently because it ran out of memory (OOMKilled)",
      "A DNS lookup failed",
      "The command was not found in the image",
      "Successful completion"
    ],
    answer: [0],
    explanation: "137 = 128 + 9 (SIGKILL). Suele deberse a OOMKilled por superar el límite de memoria: el estado lastState.terminated muestra exitCode 137 y reason OOMKilled. El código 0 indica éxito.",
    source: ["https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/#exceed-a-container-s-memory-limit"]
  },
  {
    id: "O048",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "Pods on a node are being evicted and the node condition shows DiskPressure=True. What is happening?",
    options: [
      "A NetworkPolicy is blocking the node",
      "etcd has run out of space",
      "The scheduler is rebalancing Pods across nodes",
      "The node is low on available disk space or inodes and the kubelet is reclaiming resources"
    ],
    answer: [3],
    explanation: "Cuando el espacio o los inodos caen por debajo de los umbrales de desalojo, el kubelet marca DiskPressure, elimina Pods/contenedores muertos e imágenes sin uso y, si no basta, desaloja Pods.",
    source: ["https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/#node-conditions"]
  },
  {
    id: "O049",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "What is the lifetime of an emptyDir volume?",
    options: [
      "It persists after the Pod is deleted",
      "It exists while the Pod runs on that node and is deleted when the Pod is removed",
      "It is shared by all Pods in the namespace",
      "It is always backed by a cloud disk"
    ],
    answer: [1],
    explanation: "emptyDir se crea vacío al asignar el Pod a un nodo, sobrevive a reinicios de contenedores y se borra al eliminar el Pod. Sirve para caché o para compartir archivos entre contenedores del mismo Pod.",
    source: ["https://kubernetes.io/docs/concepts/storage/volumes/#emptydir"]
  },
  {
    id: "O050",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which object represents a user's request for storage, specifying size and access mode?",
    options: [
      "PersistentVolume",
      "VolumeAttachment",
      "PersistentVolumeClaim",
      "StorageClass"
    ],
    answer: [2],
    explanation: "El PVC es la solicitud que hace el usuario; se enlaza a un PV que cumpla los requisitos (o provoca su aprovisionamiento dinámico). El PV es el recurso de almacenamiento en sí.",
    source: ["https://kubernetes.io/docs/concepts/storage/persistent-volumes/#introduction"]
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
      "ConfigMap",
      "StorageClass"
    ],
    answer: [3],
    explanation: "La StorageClass define el provisionador (normalmente un driver CSI), parámetros como el tipo de disco, la reclaimPolicy y el volumeBindingMode. Un PVC que la referencia provoca la creación automática del PV.",
    source: ["https://kubernetes.io/docs/concepts/storage/storage-classes/"]
  },
  {
    id: "O052",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which access mode allows a volume to be mounted read-write by many nodes at the same time?",
    options: [
      "ReadWriteMany",
      "ReadWriteOnce",
      "ReadWriteOncePod",
      "ReadOnlyMany"
    ],
    answer: [0],
    explanation: "ReadWriteMany (RWX) permite lectura y escritura desde múltiples nodos; requiere un backend que lo soporte, como NFS o CephFS. ReadOnlyMany solo permite lectura.",
    source: ["https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes"]
  },
  {
    id: "O053",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which access mode guarantees that only a single Pod in the whole cluster can read and write the volume?",
    options: [
      "ReadOnlyMany",
      "ReadWriteOnce",
      "ReadWriteOncePod",
      "ReadWriteMany"
    ],
    answer: [2],
    explanation: "ReadWriteOncePod (GA desde 1.29, solo volúmenes CSI) restringe el acceso a un único Pod. ReadWriteOnce restringe a un nodo, por lo que varios Pods en ese nodo podrían montarlo.",
    source: ["https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes"]
  },
  {
    id: "O054",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "With persistentVolumeReclaimPolicy: Retain, what happens when the bound PVC is deleted?",
    options: [
      "The PV and its data are deleted",
      "The PV and its data are kept; the PV becomes Released and needs manual cleanup before reuse",
      "The PV is automatically bound to a new PVC",
      "The data is wiped and the PV becomes Available"
    ],
    answer: [1],
    explanation: "Retain conserva el volumen y los datos para recuperación manual; el PV queda Released y no se reutiliza automáticamente. Delete borraría el PV y el disco subyacente.",
    source: ["https://kubernetes.io/docs/concepts/storage/persistent-volumes/#retain"]
  },
  {
    id: "O055",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "What is the default reclaim policy for dynamically provisioned PersistentVolumes?",
    options: [
      "Retain",
      "Archive",
      "Delete",
      "Recycle"
    ],
    answer: [2],
    explanation: "Los PV dinámicos heredan la reclaimPolicy de la StorageClass, cuyo valor por defecto es Delete. Recycle está obsoleto y Archive no existe.",
    source: ["https://kubernetes.io/docs/concepts/storage/persistent-volumes/#reclaim-policy","https://kubernetes.io/docs/concepts/storage/storage-classes/#reclaim-policy"]
  },
  {
    id: "O056",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "What does volumeBindingMode: WaitForFirstConsumer in a StorageClass do?",
    options: [
      "It delays provisioning and binding until a Pod that uses the PVC is scheduled, so topology constraints are respected",
      "It deletes the volume after the first Pod finishes",
      "It mounts the volume read-only first",
      "It waits for an administrator to approve the PVC"
    ],
    answer: [0],
    explanation: "Con WaitForFirstConsumer el volumen se crea en la zona del nodo donde se programa el Pod, evitando discos creados en una zona distinta. El modo Immediate (por defecto) aprovisiona en cuanto se crea el PVC.",
    source: ["https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode"]
  },
  {
    id: "O057",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which standard interface allows storage vendors to write plugins that work with Kubernetes without changing Kubernetes core code?",
    options: [
      "CNI",
      "SMI",
      "CRI",
      "CSI"
    ],
    answer: [3],
    explanation: "La Container Storage Interface sustituyó a los plugins 'in-tree'; los proveedores entregan drivers CSI independientes. CRI es para runtimes, CNI para red y SMI fue una especificación de service mesh.",
    source: ["https://kubernetes.io/docs/concepts/storage/volumes/#csi"]
  },
  {
    id: "O058",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "How does a StatefulSet give each replica its own PersistentVolumeClaim?",
    options: [
      "Using a ConfigMap per replica",
      "Using volumeClaimTemplates",
      "Using an emptyDir per Pod",
      "Using a shared hostPath volume"
    ],
    answer: [1],
    explanation: "volumeClaimTemplates genera un PVC por réplica (por ejemplo data-db-0, data-db-1) que se conserva aunque el Pod se reprograme, manteniendo su identidad y sus datos.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#volume-claim-templates"]
  },
  {
    id: "O059",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "A PVC remains in Pending status. Which is a likely reason?",
    options: [
      "The Service is headless",
      "No PV matches its size or access mode and no StorageClass can provision one",
      "The node is cordoned",
      "The Pod has no readiness probe"
    ],
    answer: [1],
    explanation: "Un PVC queda Pending si no hay PV compatible ni aprovisionamiento dinámico posible (StorageClass inexistente o provisionador fallando). Con WaitForFirstConsumer también queda Pending hasta que un Pod lo use, lo cual es normal.",
    source: ["https://kubernetes.io/docs/concepts/storage/persistent-volumes/#binding"]
  },
  {
    id: "O060",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Why is hostPath generally discouraged for application workloads?",
    options: [
      "It is slower than emptyDir",
      "It requires a CSI driver",
      "It exposes the node's filesystem to the Pod, creating security risks and tying data to a single node",
      "It cannot be mounted read-only"
    ],
    answer: [2],
    explanation: "hostPath monta rutas del nodo dentro del Pod: puede permitir escapar al host y los datos quedan atados a ese nodo. El nivel baseline de Pod Security lo prohíbe.",
    source: ["https://kubernetes.io/docs/concepts/storage/volumes/#hostpath","https://kubernetes.io/docs/concepts/security/pod-security-standards/#baseline"]
  },
  {
    id: "O061",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which two statements about PersistentVolumes and PersistentVolumeClaims are correct? (Choose 2)",
    options: [
      "Only cluster administrators can create PVCs",
      "A PV can be bound to several PVCs at the same time",
      "A PV is a cluster-scoped object",
      "A PVC is a namespaced object"
    ],
    answer: [2,3],
    explanation: "Los PVC viven en el namespace de la aplicación y los PV son recursos del clúster. La relación PV-PVC es uno a uno, y cualquier usuario con permisos RBAC puede crear PVCs.",
    source: ["https://kubernetes.io/docs/concepts/storage/persistent-volumes/"]
  },
  {
    id: "O062",
    domain: "orchestration",
    topic: "Storage",
    module: 8,
    q: "Which StorageClass field must be enabled so that users can grow a PVC by editing its requested size?",
    options: [
      "allowVolumeExpansion: true",
      "volumeBindingMode: Immediate",
      "mountOptions: resize",
      "reclaimPolicy: Retain"
    ],
    answer: [0],
    explanation: "Con allowVolumeExpansion: true se puede aumentar spec.resources.requests.storage del PVC y el driver CSI amplía el volumen. Reducir el tamaño no está soportado.",
    source: ["https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims"]
  },
  {
    id: "O063",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "Which is a key advantage of a microservices architecture compared with a monolith?",
    options: [
      "All services must share the same language and release cycle",
      "Network communication between components is eliminated",
      "There are fewer components to deploy and operate",
      "Each service can be deployed, updated and scaled independently"
    ],
    answer: [3],
    explanation: "Los microservicios dividen la aplicación en servicios independientes que se despliegan y escalan por separado. A cambio aumentan los componentes y la comunicación por red, la complejidad operativa que un service mesh ayuda a gestionar.",
    source: ["https://glossary.cncf.io/microservices-architecture/"]
  },
  {
    id: "O064",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "How is a native sidecar container (stable since Kubernetes 1.33) declared in a Pod spec?",
    options: [
      "As an entry in initContainers with restartPolicy: Always",
      "As a separate Pod placed on the same node with podAffinity",
      "As a regular container with the annotation sidecar: \"true\"",
      "As an ephemeral container added with kubectl debug"
    ],
    answer: [0],
    explanation: "Un native sidecar es un init container con restartPolicy: Always: arranca antes que los contenedores de la app, sigue corriendo toda la vida del Pod, se detiene después de ellos y no impide que un Job se complete.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/"]
  },
  {
    id: "O065",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "What is Envoy, as used by service meshes such as Istio?",
    options: [
      "A container runtime that implements the CRI",
      "A high-performance L7 proxy that commonly acts as the mesh data plane",
      "The control plane component that issues mTLS certificates",
      "A CNI plugin that assigns Pod IP addresses"
    ],
    answer: [1],
    explanation: "Envoy (proyecto graduado de la CNCF) es un proxy L7 que corre fuera del proceso de la aplicación y recibe su configuración dinámicamente desde un control plane. Istio lo usa como sidecar y en los waypoints.",
    source: ["https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy","https://www.cncf.io/projects/envoy/"]
  },
  {
    id: "O066",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "In Istio, which component belongs to the control plane rather than the data plane?",
    options: [
      "A waypoint proxy deployed for L7 traffic",
      "The Envoy sidecar proxy running in each Pod",
      "The ztunnel proxy running on each node",
      "istiod, which distributes proxy configuration and issues mTLS certificates"
    ],
    answer: [3],
    explanation: "El data plane son los proxies que tocan el tráfico (sidecars Envoy, ztunnel, waypoints). istiod es el control plane: descubrimiento de servicios, distribución de configuración y CA de certificados para mTLS.",
    source: ["https://istio.io/latest/docs/ops/deployment/architecture/","https://istio.io/latest/docs/ambient/overview/"]
  },
  {
    id: "O067",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "Which two traffic-management features can a service mesh apply between services without changing application code? (Choose 2)",
    options: [
      "Dynamic provisioning of PersistentVolumes",
      "Weighted traffic splitting for canary releases",
      "Automatic retries and request timeouts",
      "Building and signing container images"
    ],
    answer: [1,2],
    explanation: "La mesh configura en los proxies reintentos, timeouts, circuit breaking y reparto de tráfico por pesos (canary, A/B) sin tocar el código. Construir imágenes o aprovisionar volúmenes no es función de una service mesh.",
    source: ["https://istio.io/latest/docs/concepts/traffic-management/"]
  },
  {
    id: "O068",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "In Istio ambient mode, what provides L4 features such as mTLS to workloads without sidecars?",
    options: [
      "A waypoint proxy injected into every Pod",
      "kube-proxy running in nftables mode",
      "ztunnel, a purpose-built per-node proxy",
      "CoreDNS"
    ],
    answer: [2],
    explanation: "En ambient no hay sidecars: ztunnel, un proxy por nodo, aporta mTLS, identidad y telemetría L4. Los waypoint proxies (Envoy) son opcionales, no se inyectan en cada Pod y solo se despliegan cuando hacen falta funciones L7.",
    source: ["https://istio.io/latest/docs/ambient/overview/","https://istio.io/latest/docs/overview/dataplane-modes/"]
  },
  {
    id: "O069",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "Which statement about Linkerd is correct?",
    options: [
      "It is a CNCF graduated service mesh whose data plane is a lightweight micro-proxy written in Rust",
      "It is a CNCF sandbox Ingress controller",
      "It uses Envoy as its sidecar proxy",
      "It is a container runtime that replaces containerd"
    ],
    answer: [0],
    explanation: "Linkerd (graduado en la CNCF en 2021) usa linkerd2-proxy, un micro-proxy en Rust inyectado como sidecar, no Envoy. Su control plane emite los certificados para el mTLS entre proxies.",
    source: ["https://linkerd.io/2/reference/architecture/","https://www.cncf.io/projects/linkerd/"]
  },
  {
    id: "O070",
    domain: "orchestration",
    topic: "Networking",
    module: 7,
    q: "Following the Gateway API GAMMA initiative, how is an HTTPRoute attached to manage east-west (mesh) traffic for a Service?",
    options: [
      "It must reference a GatewayClass named mesh",
      "It is converted into an Ingress object by the mesh",
      "It is attached to a NetworkPolicy",
      "Its parentRefs point to the Service instead of a Gateway"
    ],
    answer: [3],
    explanation: "En GAMMA las rutas (HTTPRoute, GRPCRoute) se asocian directamente a un Service mediante parentRefs y aplican al tráfico dirigido a él; en mesh no se suelen usar Gateway ni GatewayClass. El soporte de mesh es GA desde Gateway API v1.1.",
    source: ["https://gateway-api.sigs.k8s.io/docs/mesh/","https://gateway-api.sigs.k8s.io/docs/mesh/gamma/"]
  },
  {
    id: "O071",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "kubectl describe node shows the Ready condition as Unknown with the message 'Kubelet stopped posting node status'. What does this indicate?",
    options: [
      "The node has run out of disk space",
      "The control plane is no longer receiving status updates from that node's kubelet",
      "CoreDNS cannot resolve the node's hostname",
      "The node was cordoned for maintenance"
    ],
    answer: [1],
    explanation: "El kubelet informa periódicamente del estado del nodo; si deja de hacerlo (nodo apagado, kubelet caído o problema de red), la condición Ready pasa a Unknown y el nodo aparece NotReady. La falta de disco se refleja como DiskPressure.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-cluster/#example-debugging-a-down-unreachable-node"]
  },
  {
    id: "O072",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "A worker node has become unreachable and shows NotReady. What happens to the Pods running on it, by default?",
    options: [
      "The node object is deleted immediately",
      "The running containers are live-migrated to another node",
      "The node is tainted as unreachable and its Pods are evicted after about five minutes",
      "The control plane restarts the kubelet remotely"
    ],
    answer: [2],
    explanation: "El control plane añade los taints node.kubernetes.io/unreachable (NoSchedule y NoExecute) y, por defecto, los Pods se desalojan tras unos cinco minutos para que sus controladores los recreen en otros nodos. Kubernetes no migra contenedores en caliente.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-cluster/#example-debugging-a-down-unreachable-node"]
  },
  {
    id: "O073",
    domain: "orchestration",
    topic: "Troubleshooting",
    module: 9,
    q: "The kube-apiserver of a cluster crashes. What happens to the Pods that are already running on the worker nodes?",
    options: [
      "The Pods are paused until etcd is restored from a backup",
      "They keep running, but Pods cannot be created, updated or stopped through the API until it recovers",
      "All Pods are terminated immediately",
      "All Pods are rescheduled onto the control plane nodes"
    ],
    answer: [1],
    explanation: "Si cae el API server no se pueden crear, actualizar ni detener Pods, pero los Pods y Services existentes siguen funcionando salvo que dependan de la API. Por eso se recomienda un control plane en alta disponibilidad.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-cluster/#cluster-failure-modes"]
  },
  {
    id: "D001",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "What is the main difference between Continuous Delivery and Continuous Deployment?",
    options: [
      "With Continuous Deployment every change that passes the pipeline is released to production automatically, while Continuous Delivery keeps a manual approval before production",
      "They are two names for exactly the same practice",
      "Continuous Delivery skips automated testing",
      "Continuous Deployment only applies to infrastructure code"
    ],
    answer: [0],
    explanation: "En ambos casos el software está siempre listo para liberarse; la diferencia es si el paso final a producción es automático (deployment) o requiere aprobación humana (delivery).",
    source: ["https://glossary.cncf.io/continuous-delivery/","https://glossary.cncf.io/continuous-deployment/"]
  },
  {
    id: "D002",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which two are among the four OpenGitOps principles? (Choose 2)",
    options: [
      "Manually approved",
      "Imperatively scripted",
      "Declarative",
      "Pulled automatically"
    ],
    answer: [2,3],
    explanation: "Los cuatro principios de OpenGitOps son: Declarative, Versioned and Immutable, Pulled Automatically y Continuously Reconciled. Los scripts imperativos y las aprobaciones manuales no forman parte de ellos.",
    source: ["https://opengitops.dev/"]
  },
  {
    id: "D003",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "In GitOps, what is the role of the Git repository?",
    options: [
      "It stores only application source code, never configuration",
      "It replaces etcd as the cluster datastore",
      "It is the versioned single source of truth for the desired state of the system",
      "It is used only to store audit logs"
    ],
    answer: [2],
    explanation: "El estado deseado (manifiestos, Helm values, overlays) se versiona en Git; cada cambio pasa por commits y revisiones, lo que da trazabilidad y rollback mediante git revert. etcd sigue siendo el almacén del clúster.",
    source: ["https://opengitops.dev/","https://glossary.cncf.io/gitops/"]
  },
  {
    id: "D004",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "How does a pull-based GitOps agent such as Argo CD or Flux deploy changes?",
    options: [
      "A CI server pushes manifests to the cluster using admin credentials",
      "The kubelet pulls manifests directly from Git",
      "Developers run kubectl apply manually after each merge",
      "An agent running in the cluster watches the Git repository and reconciles the cluster to match it"
    ],
    answer: [3],
    explanation: "En el modelo pull el agente vive dentro del clúster y tira de los cambios, de modo que el CI no necesita credenciales del clúster. El modelo push (CI ejecutando kubectl) expone esas credenciales fuera.",
    source: ["https://opengitops.dev/","https://argo-cd.readthedocs.io/en/stable/"]
  },
  {
    id: "D005",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Someone edits a Deployment manually with kubectl edit in a GitOps-managed cluster. What will a GitOps controller with self-heal enabled do?",
    options: [
      "Detect the drift and revert the live object to the state declared in Git",
      "Delete the Deployment",
      "Ignore the change permanently",
      "Commit the change back to Git automatically"
    ],
    answer: [0],
    explanation: "La reconciliación continua detecta la deriva (drift) entre el estado real y Git y, con self-heal activado (en Argo CD no lo está por defecto), restaura lo declarado. Para cambiar algo de forma persistente hay que hacerlo en Git.",
    source: ["https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/"]
  },
  {
    id: "D006",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which two tools are CNCF graduated GitOps projects for Kubernetes? (Choose 2)",
    options: [
      "Jenkins",
      "Argo CD (part of the Argo project)",
      "Spinnaker",
      "Flux"
    ],
    answer: [1,3],
    explanation: "Flux (noviembre de 2022) y Argo (diciembre de 2022) son proyectos graduados de la CNCF. Jenkins y Spinnaker no son proyectos de la CNCF y no siguen por sí mismos el modelo GitOps de reconciliación continua.",
    source: ["https://www.cncf.io/projects/argo/","https://www.cncf.io/projects/flux/"]
  },
  {
    id: "D007",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "What is Helm?",
    options: [
      "A service mesh",
      "A continuous integration server",
      "A container runtime",
      "A package manager for Kubernetes that templates manifests and manages releases of charts"
    ],
    answer: [3],
    explanation: "Helm empaqueta aplicaciones como charts (plantillas + valores), las instala como releases versionadas y permite upgrade y rollback. Es un proyecto graduado de la CNCF.",
    source: ["https://helm.sh/docs/intro/using_helm/","https://www.cncf.io/projects/helm/"]
  },
  {
    id: "D008",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "In a Helm chart, which file holds the default configuration values that users can override?",
    options: [
      "Chart.yaml",
      "values.yaml",
      "Chart.lock",
      "templates/_helpers.tpl"
    ],
    answer: [1],
    explanation: "values.yaml contiene los valores por defecto que se inyectan en las plantillas; se sobrescriben con -f archivo.yaml o --set. Chart.yaml guarda los metadatos del chart (nombre, versión, dependencias).",
    source: ["https://helm.sh/docs/topics/charts/","https://helm.sh/docs/intro/using_helm/"]
  },
  {
    id: "D009",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which command reverts a Helm release named web to revision 2?",
    options: [
      "helm upgrade web --revision 2",
      "helm revert web --to 2",
      "helm rollback web 2",
      "helm undo web 2"
    ],
    answer: [2],
    explanation: "helm rollback <release> <revisión> vuelve a una revisión anterior; helm history web muestra las revisiones disponibles. Las otras variantes no son comandos válidos de Helm.",
    source: ["https://helm.sh/docs/intro/using_helm/"]
  },
  {
    id: "D010",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which in-cluster server component was removed in Helm 3, simplifying its security model?",
    options: [
      "ChartMuseum",
      "Artifact Hub",
      "Kubeapps",
      "Tiller"
    ],
    answer: [3],
    explanation: "Helm 2 necesitaba Tiller dentro del clúster, normalmente con permisos amplios. Desde Helm 3 el cliente habla directamente con el API server y sus permisos se evalúan con el kubeconfig del usuario (RBAC).",
    source: ["https://helm.sh/docs/faq/changes_since_helm2/"]
  },
  {
    id: "D011",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which two statements about Kustomize are correct? (Choose 2)",
    options: [
      "It is integrated into kubectl through the -k flag",
      "It uses Go templates fed by a values.yaml file",
      "It is template-free and customizes plain YAML through bases, overlays and patches",
      "It requires a server-side component in the cluster"
    ],
    answer: [0,2],
    explanation: "Kustomize compone una base con overlays por entorno aplicando parches sobre YAML puro, sin plantillas, y está integrado en kubectl desde la 1.14 (kubectl apply -k, kubectl kustomize). Las plantillas Go con values.yaml son propias de Helm.",
    source: ["https://kustomize.io/","https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/"]
  },
  {
    id: "D012",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which command applies a Kustomize directory using the support built into kubectl?",
    options: [
      "kubectl apply -k ./overlays/prod",
      "kubectl kustomize --apply prod",
      "kubectl apply -f kustomization.yaml --template",
      "kubectl helm apply prod"
    ],
    answer: [0],
    explanation: "kubectl apply -k procesa el kustomization.yaml del directorio y aplica el resultado. kubectl kustomize <dir> solo renderiza la salida sin aplicarla.",
    source: ["https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/"]
  },
  {
    id: "D013",
    domain: "delivery",
    topic: "Application Delivery",
    module: 3,
    q: "Which pair lists the strategy types natively supported by a Deployment's spec.strategy.type?",
    options: [
      "Rolling and Shadow",
      "BlueGreen and Canary",
      "RollingUpdate and Recreate",
      "Recreate and A/B"
    ],
    answer: [2],
    explanation: "Un Deployment solo admite RollingUpdate (por defecto) y Recreate. Blue/green y canary se implementan con varios objetos, una service mesh o herramientas como Argo Rollouts o Flagger.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy"]
  },
  {
    id: "D014",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "A Deployment uses the Recreate strategy. What happens during an update?",
    options: [
      "Traffic is mirrored to the new Pods",
      "All existing Pods are terminated before new Pods are created, causing a brief downtime",
      "Only half of the Pods are updated",
      "New Pods are created before the old ones are removed"
    ],
    answer: [1],
    explanation: "Recreate elimina primero todos los Pods antiguos y luego crea los nuevos; es útil cuando dos versiones no pueden coexistir, a costa de una interrupción.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#recreate-deployment"]
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
    explanation: "Ambos valen 25% por defecto: puede haber hasta un 25% de Pods extra durante la actualización y como máximo un 25% no disponibles.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment"]
  },
  {
    id: "D016",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which deployment strategy first routes a small percentage of traffic to the new version and increases it gradually while monitoring metrics?",
    options: [
      "Recreate",
      "Canary",
      "Blue/green",
      "Big bang"
    ],
    answer: [1],
    explanation: "Canary expone la nueva versión a un subconjunto de usuarios y amplía el porcentaje si las métricas son buenas, limitando el impacto de un fallo. Blue/green cambia todo el tráfico de una vez.",
    source: ["https://glossary.cncf.io/canary-deployment/"]
  },
  {
    id: "D017",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which strategy runs two complete environments side by side and switches all traffic at once from the old version to the new one?",
    options: [
      "Rolling update",
      "Recreate",
      "Blue/green",
      "Canary"
    ],
    answer: [2],
    explanation: "En blue/green la versión nueva (green) se despliega completa junto a la actual (blue) y el tráfico se conmuta de golpe, por ejemplo cambiando el selector del Service; el rollback es volver a conmutar.",
    source: ["https://glossary.cncf.io/blue-green-deployment/"]
  },
  {
    id: "D018",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which command shows the revision history of a Deployment named web?",
    options: [
      "kubectl rollout history deployment/web",
      "kubectl describe rs web --revisions",
      "kubectl get deployment web --history",
      "kubectl logs deployment/web --history"
    ],
    answer: [0],
    explanation: "kubectl rollout history lista las revisiones (una por ReplicaSet conservado, según revisionHistoryLimit, que por defecto es 10); con --revision=N se ve el detalle de una.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#checking-rollout-history-of-a-deployment","https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#revision-history-limit"]
  },
  {
    id: "D019",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which command rolls a Deployment back to its previous revision?",
    options: [
      "kubectl apply --undo deployment/web",
      "kubectl rollback deployment/web",
      "kubectl rollout revert deployment/web",
      "kubectl rollout undo deployment/web"
    ],
    answer: [3],
    explanation: "kubectl rollout undo vuelve a la revisión anterior (o a una concreta con --to-revision=N) escalando de nuevo el ReplicaSet correspondiente. En un entorno GitOps, lo correcto es revertir el cambio en Git.",
    source: ["https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-to-a-previous-revision"]
  },
  {
    id: "D020",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which projects extend Kubernetes with automated progressive delivery, such as canary analysis and blue/green, beyond what Deployments provide?",
    options: [
      "CoreDNS and etcd",
      "Velero and Rook",
      "Harbor and Notary",
      "Argo Rollouts and Flagger"
    ],
    answer: [3],
    explanation: "Argo Rollouts (con su CRD Rollout) y Flagger (parte de la familia de herramientas Flux) automatizan canary y blue/green usando métricas para promover o revertir. Los demás pares resuelven DNS, almacenamiento, registros o backups.",
    source: ["https://argoproj.github.io/argo-rollouts/","https://fluxcd.io/flagger/"]
  },
  {
    id: "D021",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Which open source project provides Kubernetes-native CI/CD building blocks defined as custom resources, such as Task and Pipeline?",
    options: [
      "Tekton",
      "Prometheus",
      "Cilium",
      "Envoy"
    ],
    answer: [0],
    explanation: "Tekton define pipelines como CRDs que se ejecutan en Pods dentro del clúster; desde marzo de 2026 es un proyecto incubating de la CNCF. Prometheus es monitoreo, Envoy un proxy y Cilium un CNI.",
    source: ["https://www.cncf.io/projects/tekton/","https://www.cncf.io/blog/2026/03/24/tekton-becomes-a-cncf-incubating-project/"]
  },
  {
    id: "D022",
    domain: "delivery",
    topic: "Application Delivery",
    module: 12,
    q: "Why should CI pipelines produce immutable, uniquely tagged images (for example tagged with the Git commit SHA) instead of reusing a tag such as latest?",
    options: [
      "Registries reject the latest tag",
      "It makes deployments reproducible and traceable and enables reliable rollbacks",
      "It reduces the image size",
      "Kubernetes requires semantic version tags"
    ],
    answer: [1],
    explanation: "Una etiqueta única por build (o mejor aún, el digest) permite saber exactamente qué código corre y volver a una versión anterior con certeza. Reutilizar latest hace que dos despliegues 'iguales' puedan ejecutar imágenes distintas.",
    source: ["https://kubernetes.io/docs/concepts/containers/images/#updating-images"]
  },
  {
    id: "D023",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "A container keeps crashing. Which command shows the logs of the previous, terminated instance of the container?",
    options: [
      "kubectl describe logs mypod",
      "kubectl get logs mypod",
      "kubectl logs mypod --previous",
      "kubectl logs mypod --last"
    ],
    answer: [2],
    explanation: "--previous (o -p) muestra los logs de la instancia anterior del contenedor, que suelen contener el error que provocó el reinicio. Los logs actuales pueden estar vacíos si acaba de arrancar.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/"]
  },
  {
    id: "D024",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command streams the logs of the container named sidecar in a multi-container Pod?",
    options: [
      "kubectl exec mypod logs sidecar",
      "kubectl attach mypod --logs sidecar",
      "kubectl logs sidecar/mypod",
      "kubectl logs mypod -c sidecar -f"
    ],
    answer: [3],
    explanation: "-c selecciona el contenedor y -f sigue la salida en tiempo real. Sin -c en un Pod con varios contenedores, kubectl usa el contenedor por defecto del Pod (por ejemplo, el indicado con la anotación kubectl.kubernetes.io/default-container); con --all-containers se ven todos.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/","https://kubernetes.io/docs/reference/labels-annotations-taints/#kubectl-kubernetes-io-default-container"]
  },
  {
    id: "D025",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "A Pod is in CrashLoopBackOff. What does this status mean?",
    options: [
      "The image cannot be downloaded",
      "The Pod is waiting to be assigned to a node",
      "The container starts and exits repeatedly, and the kubelet waits with increasing back-off delays between restarts",
      "The Pod was evicted from its node"
    ],
    answer: [2],
    explanation: "El contenedor arranca y termina una y otra vez (error de la app, configuración incorrecta, comando erróneo o liveness fallida) y el kubelet espera cada vez más entre reinicios (10 s, 20 s, 40 s... hasta 5 minutos por defecto; el máximo es configurable por nodo). Se diagnostica con kubectl logs --previous y kubectl describe.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-restarts"]
  },
  {
    id: "D026",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command is most useful to see a Pod's events, conditions, container states and restart counts in a single view?",
    options: [
      "kubectl describe pod mypod",
      "kubectl top pod mypod",
      "kubectl get pod mypod",
      "kubectl logs mypod"
    ],
    answer: [0],
    explanation: "kubectl describe agrega el estado detallado y los eventos recientes (scheduling, pulls, probes fallidas). get da un resumen de una línea, logs muestra la salida de la aplicación y top el consumo.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/"]
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
      "kubectl run -it mypod /bin/sh",
      "kubectl attach mypod --shell"
    ],
    answer: [1],
    explanation: "kubectl exec -it ejecuta un proceso dentro del contenedor existente con TTY interactivo; '--' separa las opciones de kubectl del comando. kubectl run crearía un Pod nuevo.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-application/get-shell-running-container/"]
  },
  {
    id: "D028",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "The application image is distroless and has no shell. How can you troubleshoot inside the running Pod?",
    options: [
      "Rebuild the production image with a shell and redeploy it",
      "kubectl debug -it mypod --image=busybox --target=app, which adds an ephemeral container",
      "kubectl exec -it mypod -- bash",
      "kubectl logs mypod --shell"
    ],
    answer: [1],
    explanation: "kubectl debug inyecta un ephemeral container con herramientas; con --target comparte el espacio de procesos del contenedor indicado (si el runtime lo soporta). exec fallaría porque no hay shell en la imagen.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/#ephemeral-container","https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/"]
  },
  {
    id: "D029",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command starts a debugging Pod on a specific node, with the node's root filesystem mounted under /host?",
    options: [
      "kubectl ssh node1",
      "kubectl attach node/node1",
      "kubectl exec node/node1 -- sh",
      "kubectl debug node/node1 -it --image=busybox"
    ],
    answer: [3],
    explanation: "kubectl debug node/<nodo> crea un Pod en ese nodo que usa sus namespaces de host (IPC, red y PID) y monta su sistema de archivos raíz en /host, sin necesidad de SSH. Los demás comandos no existen o no aplican a nodos.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/#node-shell-session"]
  },
  {
    id: "D030",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "A Pod is Running but shows READY 0/1, and its Service does not send traffic to it. What is the most likely reason?",
    options: [
      "The node is cordoned",
      "The image failed to pull",
      "The readiness probe is failing",
      "The Pod has the BestEffort QoS class"
    ],
    answer: [2],
    explanation: "Running indica que el contenedor arrancó; READY 0/1 indica que la readinessProbe no pasa, así que el controlador de EndpointSlice retira la IP del Pod de los endpoints del Service. Un fallo de pull impediría llegar a Running.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes"]
  },
  {
    id: "D031",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command forwards local port 8080 to port 80 of a Pod for quick testing?",
    options: [
      "kubectl port-forward pod/mypod 8080:80",
      "kubectl forward mypod 80:8080",
      "kubectl proxy pod/mypod 8080",
      "kubectl expose pod mypod --port=8080:80"
    ],
    answer: [0],
    explanation: "El formato es puerto_local:puerto_remoto y también funciona con svc/ y deploy/. kubectl expose crea un Service y kubectl proxy expone la API de Kubernetes, no un Pod.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/"]
  },
  {
    id: "D032",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "A Pod has been stuck in Terminating for a long time after it was deleted. What is a common cause?",
    options: [
      "A finalizer that has not been removed, or a node that is unreachable",
      "Too many replicas in its Deployment",
      "A missing readiness probe",
      "An ImagePullBackOff error"
    ],
    answer: [0],
    explanation: "El Pod queda Terminating si un finalizer no se retira o si el kubelet de su nodo no puede confirmar la terminación (nodo caído). Se investiga con kubectl get pod -o yaml (finalizers) y el estado del nodo.",
    source: ["https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/","https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination"]
  },
  {
    id: "D033",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command lists recent events in a namespace sorted by time?",
    options: [
      "kubectl logs events",
      "kubectl top events",
      "kubectl get events --sort-by=.metadata.creationTimestamp",
      "kubectl describe events --latest"
    ],
    answer: [2],
    explanation: "Los eventos se ordenan con --sort-by; también existe el comando kubectl events, específico para listarlos. Por defecto el API server conserva los eventos solo una hora (--event-ttl=1h).",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/","https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/"]
  },
  {
    id: "D034",
    domain: "delivery",
    topic: "Debugging",
    module: 3,
    q: "A Pod shows the status Completed. Which two statements are true? (Choose 2)",
    options: [
      "The container was OOMKilled",
      "Its containers exited with exit code 0",
      "This is expected for Pods created by a Job that finished its task",
      "The Pod is still waiting to be scheduled"
    ],
    answer: [1,2],
    explanation: "Completed (fase Succeeded) significa que todos los contenedores terminaron con éxito y no se reiniciarán; es el estado final normal de un Job. OOMKilled y Pending indican otros problemas.",
    source: ["https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-phase","https://kubernetes.io/docs/concepts/workloads/controllers/job/"]
  },
  {
    id: "D035",
    domain: "delivery",
    topic: "Debugging",
    module: 9,
    q: "Which command prints the logs of a Pod belonging to the Deployment named web without looking up the Pod name first?",
    options: [
      "kubectl describe deployment web --logs",
      "kubectl logs deployment/web",
      "kubectl logs web --all",
      "kubectl get logs deploy web"
    ],
    answer: [1],
    explanation: "kubectl logs acepta referencias tipo/nombre (deployment/web, job/x) y elige uno de sus Pods. Para ver todos los Pods se usa --all-pods=true o un selector, por ejemplo -l app=web.",
    source: ["https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/"]
  },
  {
    id: "A001",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Besides metrics, which two signals are commonly cited as pillars of observability? (Choose 2)",
    options: [
      "Logs",
      "Backups",
      "Firewall rules",
      "Traces"
    ],
    answer: [0,3],
    explanation: "Métricas, logs y trazas son las tres señales clásicas de la observabilidad (OpenTelemetry soporta además baggage, y los perfiles siguen en desarrollo). Backups y reglas de firewall no son señales de telemetría.",
    source: ["https://opentelemetry.io/docs/concepts/signals/"]
  },
  {
    id: "A002",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "How does Prometheus collect metrics by default?",
    options: [
      "The kubelet writes metrics into etcd for Prometheus",
      "Prometheus parses container log files",
      "Applications push metrics to Prometheus over SMTP",
      "Prometheus pulls (scrapes) metrics over HTTP from the /metrics endpoints of its targets"
    ],
    answer: [3],
    explanation: "Prometheus usa un modelo pull: descubre objetivos (por ejemplo vía la API de Kubernetes) y los consulta periódicamente. Para trabajos batch efímeros que no pueden ser 'scrapeados' existe el Pushgateway.",
    source: ["https://prometheus.io/docs/introduction/overview/"]
  },
  {
    id: "A003",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which two statements about Prometheus are correct? (Choose 2)",
    options: [
      "It stores data as time series identified by a metric name and key-value labels",
      "It provides PromQL to query and aggregate time series",
      "It is primarily designed to store and index application log lines",
      "It is a CNCF sandbox project"
    ],
    answer: [0,1],
    explanation: "Prometheus es una base de datos de series temporales con modelo de labels y el lenguaje PromQL. No es un sistema de logs (para eso existen Loki o Elasticsearch) y es un proyecto graduado de la CNCF desde 2018.",
    source: ["https://prometheus.io/docs/introduction/overview/","https://www.cncf.io/projects/prometheus/"]
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
      "Summary",
      "Histogram"
    ],
    answer: [1],
    explanation: "Un counter solo crece; se analiza con rate() o increase() para obtener tasas. Un gauge puede subir y bajar (por ejemplo memoria en uso).",
    source: ["https://prometheus.io/docs/concepts/metric_types/#counter"]
  },
  {
    id: "A005",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which Prometheus metric type samples observations into configurable buckets so that quantiles such as p95 latency can be calculated on the server side?",
    options: [
      "Gauge",
      "Info",
      "Counter",
      "Histogram"
    ],
    answer: [3],
    explanation: "Un histogram cuenta observaciones en buckets y permite calcular percentiles en el servidor con histogram_quantile(), incluso agregando entre instancias. El summary calcula cuantiles en el cliente y no se puede agregar entre instancias.",
    source: ["https://prometheus.io/docs/concepts/metric_types/#histogram","https://prometheus.io/docs/practices/histograms/"]
  },
  {
    id: "A006",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which component deduplicates, groups and routes the alerts fired by Prometheus to receivers such as email, Slack or PagerDuty?",
    options: [
      "Grafana",
      "Thanos",
      "Alertmanager",
      "Pushgateway"
    ],
    answer: [2],
    explanation: "Prometheus evalúa las reglas de alerta y envía las alertas a Alertmanager, que las agrupa, silencia, inhibe y enruta. Grafana visualiza datos y Thanos aporta almacenamiento a largo plazo y vista global.",
    source: ["https://prometheus.io/docs/alerting/latest/alertmanager/"]
  },
  {
    id: "A007",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "What is OpenTelemetry?",
    options: [
      "A CNCF project providing vendor-neutral APIs, SDKs and a Collector to generate, collect and export traces, metrics and logs",
      "A commercial APM product",
      "A Prometheus storage backend",
      "A Kubernetes logging driver"
    ],
    answer: [0],
    explanation: "OpenTelemetry (fusión de OpenTracing y OpenCensus) es el estándar abierto de instrumentación y no es un backend; su Collector recibe, procesa y exporta telemetría a cualquier backend. Es proyecto graduado de la CNCF desde mayo de 2026.",
    source: ["https://opentelemetry.io/docs/what-is-opentelemetry/","https://www.cncf.io/projects/opentelemetry/"]
  },
  {
    id: "A008",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which statement correctly distinguishes SLI, SLO and SLA?",
    options: [
      "They are synonyms",
      "The SLA is the measurement, the SLI is the contract and the SLO is the penalty",
      "The SLO is set by customers and the SLI by vendors",
      "An SLI is a measured indicator such as request latency, an SLO is the target set for it, and an SLA is a contractual agreement with consequences if it is not met"
    ],
    answer: [3],
    explanation: "El SLI mide (por ejemplo, % de peticiones con éxito), el SLO fija el objetivo (99.9% en 30 días) y el SLA es el contrato con consecuencias (p. ej. penalizaciones) si no se cumplen los SLOs que incluye. Lo que queda hasta el 100% del SLO es el error budget.",
    source: ["https://sre.google/sre-book/service-level-objectives/","https://sre.google/sre-book/embracing-risk/"]
  },
  {
    id: "A009",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "What is the difference between metrics-server and kube-state-metrics?",
    options: [
      "kube-state-metrics is required by the HPA, and metrics-server is only used by Prometheus",
      "metrics-server stores long-term metric history",
      "metrics-server provides current CPU and memory usage for autoscaling and kubectl top, while kube-state-metrics exposes the state of Kubernetes objects (such as desired versus available replicas) for Prometheus",
      "They are two names for the same project"
    ],
    answer: [2],
    explanation: "metrics-server alimenta la Metrics API con lo mínimo (CPU y memoria) para HPA, VPA y kubectl top; no es una solución de monitoreo con histórico. kube-state-metrics lee la API y publica métricas sobre el estado de los objetos para que Prometheus las recoja.",
    source: ["https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/","https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/"]
  },
  {
    id: "A010",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which CNCF project provides real-time cost monitoring and allocation for Kubernetes workloads, supporting FinOps practices?",
    options: [
      "OpenCost",
      "Litmus",
      "Keptn",
      "Thanos"
    ],
    answer: [0],
    explanation: "OpenCost (proyecto incubating de la CNCF desde octubre de 2024) da visibilidad del gasto actual e histórico de Kubernetes y lo asigna a namespaces, workloads y labels. Thanos es almacenamiento de métricas y Litmus ingeniería del caos.",
    source: ["https://www.cncf.io/projects/opencost/","https://opencost.io/"]
  },
  {
    id: "A011",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "What is the recommended way for containerized applications to emit logs in Kubernetes?",
    options: [
      "Write logs into a ConfigMap",
      "Write to stdout and stderr, where the runtime captures them and node-level agents can ship them",
      "Send logs directly to etcd",
      "Write log files inside the container filesystem"
    ],
    answer: [1],
    explanation: "El runtime redirige stdout/stderr a archivos en el nodo, kubectl logs los lee y un agente por nodo (por ejemplo Fluent Bit como DaemonSet) los envía a un backend central. Escribir en archivos dentro del contenedor complica la recolección y se pierde al reiniciar.",
    source: ["https://kubernetes.io/docs/concepts/cluster-administration/logging/"]
  },
  {
    id: "A012",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which autoscaler adjusts the number of Pod replicas of a Deployment based on observed metrics such as CPU utilization?",
    options: [
      "Descheduler",
      "Cluster Autoscaler",
      "Vertical Pod Autoscaler",
      "Horizontal Pod Autoscaler"
    ],
    answer: [3],
    explanation: "El HPA escala horizontalmente (más o menos réplicas) según métricas de recursos, personalizadas o externas. El VPA ajusta requests, el Cluster Autoscaler añade nodos y el descheduler reubica Pods.",
    source: ["https://kubernetes.io/docs/concepts/workloads/autoscaling/"]
  },
  {
    id: "A013",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "An HPA that targets CPU utilization shows <unknown> as its current value. What is most likely missing?",
    options: [
      "A PersistentVolume",
      "metrics-server (or another provider of the resource metrics API), or CPU requests on the target containers",
      "An Ingress controller",
      "A PodDisruptionBudget"
    ],
    answer: [1],
    explanation: "El HPA obtiene el uso de la Metrics API (metrics.k8s.io), que normalmente sirve metrics-server, y calcula la utilización como porcentaje de los requests; sin cualquiera de los dos no puede calcular la métrica.",
    source: ["https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/"]
  },
  {
    id: "A014",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which component adds nodes when Pods cannot be scheduled because of insufficient resources, and removes underutilized nodes?",
    options: [
      "Cluster Autoscaler",
      "Horizontal Pod Autoscaler",
      "kube-scheduler",
      "Vertical Pod Autoscaler"
    ],
    answer: [0],
    explanation: "El Cluster Autoscaler (o Karpenter, ambos patrocinados por SIG Autoscaling) aprovisiona nodos para Pods que no caben y consolida nodos infrautilizados, basándose en los requests. El scheduler solo coloca Pods en los nodos existentes.",
    source: ["https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/"]
  },
  {
    id: "A015",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "What does the Vertical Pod Autoscaler (VPA) adjust?",
    options: [
      "The number of Pod replicas",
      "The number of nodes in the cluster",
      "The CPU and memory requests (and proportionally the limits) of containers",
      "The number of namespaces"
    ],
    answer: [2],
    explanation: "El VPA (un add-on que no viene con Kubernetes) recomienda o aplica requests adecuados según el uso; por defecto escala también los limits de forma proporcional. No debe combinarse con un HPA que escale por la misma métrica de CPU o memoria.",
    source: ["https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/","https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md"]
  },
  {
    id: "A016",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which CNCF project enables event-driven autoscaling, including scaling to zero, based on sources such as message queue length?",
    options: [
      "Harbor",
      "KEDA",
      "Kustomize",
      "Contour"
    ],
    answer: [1],
    explanation: "KEDA (Kubernetes Event-Driven Autoscaling, graduado en la CNCF en 2023) usa más de 70 'scalers' (Kafka, RabbitMQ, colas cloud, Prometheus...) y trabaja junto al HPA, extendiéndolo, lo que permite escalar de 0 a N.",
    source: ["https://keda.sh/","https://www.cncf.io/projects/keda/"]
  },
  {
    id: "A017",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which project provides a serverless platform on Kubernetes with request-driven autoscaling, including scale to zero, and an eventing component?",
    options: [
      "Longhorn",
      "Rook",
      "Knative",
      "etcd"
    ],
    answer: [2],
    explanation: "Knative Serving ejecuta servicios que escalan según las peticiones (incluso a cero) y Knative Eventing enruta eventos CloudEvents sobre HTTP; es proyecto graduado de la CNCF desde septiembre de 2025. etcd es un almacén clave-valor y Rook/Longhorn son soluciones de almacenamiento.",
    source: ["https://knative.dev/docs/","https://www.cncf.io/projects/knative/"]
  },
  {
    id: "A018",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which two statements describe serverless computing? (Choose 2)",
    options: [
      "Developers must provision and patch the underlying virtual machines",
      "Developers focus on code while the platform manages servers and scaling",
      "Serverless applications cannot be event-driven",
      "Workloads can scale to zero when idle and are often billed per use"
    ],
    answer: [1,3],
    explanation: "En serverless (FaaS o contenedores gestionados) la plataforma abstrae los servidores, escala automáticamente, a menudo hasta cero, y se paga por uso. Es especialmente adecuado para cargas dirigidas por eventos.",
    source: ["https://glossary.cncf.io/serverless/","https://knative.dev/docs/"]
  },
  {
    id: "A019",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which two are open interfaces that decouple Kubernetes from specific networking and storage implementations? (Choose 2)",
    options: [
      "Kubernetes Dashboard",
      "Container Network Interface (CNI)",
      "kubeadm",
      "Container Storage Interface (CSI)"
    ],
    answer: [1,3],
    explanation: "CNI y CSI (junto con CRI para runtimes) son estándares que permiten conectar implementaciones de distintos proveedores sin modificar Kubernetes. El Dashboard y kubeadm son herramientas, no interfaces estándar.",
    source: ["https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/","https://kubernetes.io/docs/concepts/storage/volumes/#csi"]
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
    explanation: "Los proyectos entran como Sandbox, pasan a Incubating al demostrar adopción y estabilidad, y llegan a Graduated (con revisión de seguridad de un tercero y voto de 2/3 del TOC); los inactivos pasan a Archived. Alpha/Beta/Stable son niveles de las APIs de Kubernetes.",
    source: ["https://github.com/cncf/toc/blob/main/process/README.md","https://www.cncf.io/projects/"]
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
    explanation: "Desde 2021 Kubernetes publica unas tres versiones menores al año (ciclos de unas 15 semanas), gestionadas por el Release Team de SIG Release.",
    source: ["https://kubernetes.io/releases/release/","https://kubernetes.io/blog/2021/07/20/new-kubernetes-release-cadence/"]
  },
  {
    id: "A022",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "What is a Kubernetes Enhancement Proposal (KEP)?",
    options: [
      "A bug report template",
      "A security vulnerability notice",
      "A marketing announcement for a release",
      "A design document and process used to propose, discuss and track significant changes to Kubernetes"
    ],
    answer: [3],
    explanation: "Los KEPs (en el repositorio kubernetes/enhancements) describen la motivación, el diseño y los criterios de graduación (alpha, beta, GA) de cada mejora, y los patrocina una SIG.",
    source: ["https://github.com/kubernetes/enhancements/blob/master/keps/README.md"]
  },
  {
    id: "A023",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "In the Kubernetes project, what is a Special Interest Group (SIG)?",
    options: [
      "A community group that owns and develops a specific area, such as SIG Network or SIG Node",
      "A paid support tier",
      "The CNCF governing board",
      "A vendor certification program"
    ],
    answer: [0],
    explanation: "Las SIGs organizan el trabajo del proyecto por áreas (red, nodo, almacenamiento, seguridad, release...), con reuniones públicas, canales de Slack y propiedad sobre código y KEPs.",
    source: ["https://github.com/kubernetes/community/blob/master/governance.md","https://github.com/kubernetes/community/blob/master/sig-list.md"]
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
      "Technical Oversight Committee (TOC)",
      "End User Technical Advisory Board"
    ],
    answer: [2],
    explanation: "El TOC define la visión técnica de la CNCF y vota la aceptación y graduación de proyectos. El Governing Board gestiona presupuesto y asuntos de negocio, y el Steering Committee gobierna solo el proyecto Kubernetes.",
    source: ["https://www.cncf.io/about/who-we-are/","https://github.com/cncf/toc"]
  },
  {
    id: "A025",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "What is the role of the CNCF Technical Advisory Groups (TAGs)?",
    options: [
      "They organize KubeCon venues",
      "They cut Kubernetes releases",
      "They sell CNCF memberships",
      "They support the TOC with domain expertise, for example in security or operational resilience, and help evaluate projects"
    ],
    answer: [3],
    explanation: "Los TAGs (por ejemplo TAG Security and Compliance o TAG Operational Resilience) reúnen expertos que asesoran al TOC, revisan proyectos y publican guías para la comunidad. Las versiones de Kubernetes las publica SIG Release.",
    source: ["https://github.com/cncf/toc"]
  },
  {
    id: "A026",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "Which role applies software engineering to operations and uses SLOs and error budgets to balance reliability with feature velocity?",
    options: [
      "Product owner",
      "Site Reliability Engineer (SRE)",
      "Database administrator",
      "Scrum Master"
    ],
    answer: [1],
    explanation: "SRE, popularizado por Google, automatiza la operación, reduce el trabajo repetitivo (toil) y usa el error budget para decidir cuándo priorizar estabilidad frente a nuevas funcionalidades.",
    source: ["https://sre.google/sre-book/introduction/"]
  },
  {
    id: "A027",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "What is the main goal of platform engineering?",
    options: [
      "Managing physical data center hardware",
      "Building an internal developer platform with self-service capabilities and golden paths that reduce cognitive load for application teams",
      "Replacing application developers with automation",
      "Writing Kubernetes core code"
    ],
    answer: [1],
    explanation: "Un equipo de plataforma ofrece capacidades (despliegue, observabilidad, entornos) como producto interno de autoservicio, por ejemplo con un portal como Backstage, para que los equipos de aplicación entreguen más rápido.",
    source: ["https://tag-app-delivery.cncf.io/whitepapers/platforms/"]
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
    explanation: "La comunidad mantiene las tres versiones menores más recientes; cada una recibe parches durante aproximadamente 14 meses (12 de soporte más 2 de margen para actualizar).",
    source: ["https://kubernetes.io/releases/","https://kubernetes.io/releases/patch-releases/"]
  },
  {
    id: "A029",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "Which statement about Kubernetes Working Groups (WGs) is correct?",
    options: [
      "They are temporary groups that facilitate collaboration across SIGs and do not own code, which stays with the sponsoring SIGs",
      "They replace SIGs once a KEP reaches GA",
      "They are permanent groups that own repositories and subprojects",
      "They are elected by the CNCF Governing Board"
    ],
    answer: [0],
    explanation: "Un WG es temporal: se disuelve al cumplir su objetivo, sirve para temas que cruzan varias SIGs y no posee código ni repositorios (eso queda en las SIGs patrocinadoras).",
    source: ["https://github.com/kubernetes/community/blob/master/committee-steering/governance/wg-governance.md"]
  },
  {
    id: "A030",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "Which body oversees the overall governance of the Kubernetes project, resolving escalations between SIGs and chartering committees?",
    options: [
      "The Release Team",
      "The CNCF Technical Oversight Committee",
      "SIG Architecture",
      "The Kubernetes Steering Committee"
    ],
    answer: [3],
    explanation: "El Steering Committee (7 miembros) supervisa el gobierno del proyecto Kubernetes, crea comités y decide cuando hay bloqueos entre SIGs. El TOC actúa sobre la CNCF en su conjunto y SIG Architecture sobre el diseño técnico.",
    source: ["https://github.com/kubernetes/steering","https://github.com/kubernetes/community/blob/master/governance.md"]
  },
  {
    id: "A031",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "Which group, embedded in SIG Release, does the day-to-day work of shipping each Kubernetes minor release, with roles such as Enhancements, Release Signal, Docs and Communications?",
    options: [
      "The Security Response Committee",
      "The Steering Committee",
      "The Release Team",
      "CNCF TAG Infrastructure"
    ],
    answer: [2],
    explanation: "El Release Team forma parte de SIG Release y se renueva en cada ciclo; incluye roles como Release Team Lead, Enhancements, Release Signal, Docs y Communications, y un programa de shadows para formar a nuevos miembros.",
    source: ["https://github.com/kubernetes/sig-release/blob/master/release-team/README.md"]
  },
  {
    id: "A032",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "In the Kubernetes community, who is responsible for enforcing the community Code of Conduct and handling reports of violations?",
    options: [
      "SIG Docs",
      "The CNCF Governing Board",
      "The Security Response Committee",
      "The Code of Conduct Committee"
    ],
    answer: [3],
    explanation: "El Code of Conduct Committee aplica y mantiene el código de conducta de Kubernetes; los incidentes se reportan en privado (conduct@kubernetes.io). El Security Response Committee gestiona vulnerabilidades, no conducta.",
    source: ["https://github.com/kubernetes/community/tree/master/committee-code-of-conduct","https://github.com/kubernetes/community/blob/master/sig-list.md"]
  },
  {
    id: "A033",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "Which two are required for a CNCF project to move to the Graduated maturity level? (Choose 2)",
    options: [
      "Maintainers from at least two organizations",
      "A completed third-party security review",
      "Approval by the Kubernetes Steering Committee",
      "The project must be written in Go"
    ],
    answer: [0,1],
    explanation: "La solicitud de graduación exige, entre otros, una revisión de seguridad de un tercero, mantenedores de al menos dos organizaciones y el badge OpenSSF Best Practices (passing); la aprueba el TOC con mayoría de 2/3. El Steering Committee solo gobierna Kubernetes.",
    source: ["https://github.com/cncf/toc/blob/main/.github/ISSUE_TEMPLATE/template-graduation-application.md","https://github.com/cncf/toc/blob/main/process/README.md"]
  },
  {
    id: "A034",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "A project is listed at the CNCF Sandbox maturity level. What does this indicate?",
    options: [
      "It has demonstrated broad production adoption and passed a security audit",
      "It is inactive and no longer supported by the TOC",
      "It is an early-stage, experimental project whose production use is decided case by case",
      "It is a commercial product certified by the CNCF"
    ],
    answer: [2],
    explanation: "Sandbox es el punto de entrada para proyectos experimentales o tempranos; Graduated indica madurez demostrada en producción y Archived, proyectos inactivos que el TOC ya no respalda.",
    source: ["https://github.com/cncf/toc/blob/main/process/README.md"]
  },
  {
    id: "A035",
    domain: "architecture",
    topic: "Cloud Native Community and Collaboration",
    module: 10,
    q: "What is KubeCon + CloudNativeCon?",
    options: [
      "The CNCF's flagship conference, held in several regions, that brings together adopters, maintainers and technologists of cloud native projects",
      "A Kubernetes SIG responsible for community events",
      "The certification exam required to become a Kubernetes maintainer",
      "A managed Kubernetes service offered by the CNCF"
    ],
    answer: [0],
    explanation: "KubeCon + CloudNativeCon es la conferencia insignia de la CNCF (Norteamérica y Europa, además de ediciones en China, Japón e India). No es una certificación, una SIG ni un servicio.",
    source: ["https://www.cncf.io/kubecon-cloudnativecon-events/"]
  },
  {
    id: "A036",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which three specifications are maintained by the Open Container Initiative (OCI)?",
    options: [
      "Gateway, HTTPRoute and GRPCRoute",
      "Runtime, image and distribution specifications",
      "Helm chart, Kustomize and OLM formats",
      "CNI, CSI and CRI"
    ],
    answer: [1],
    explanation: "La OCI, bajo la Linux Foundation, mantiene la runtime-spec, la image-spec y la distribution-spec, que permiten que imágenes y runtimes de distintos proveedores sean intercambiables. CNI/CSI/CRI son interfaces del ecosistema Kubernetes.",
    source: ["https://opencontainers.org/"]
  },
  {
    id: "A037",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "Which interface does the kubelet use to talk to container runtimes such as containerd or CRI-O?",
    options: [
      "The Container Storage Interface (CSI), a gRPC protocol",
      "The Container Network Interface (CNI), a REST API",
      "The OCI distribution specification over HTTP",
      "The Container Runtime Interface (CRI), a gRPC protocol"
    ],
    answer: [3],
    explanation: "El CRI es la interfaz de plugins (gRPC) entre el kubelet y el runtime, que permite usar distintos runtimes sin recompilar Kubernetes. CNI es para red, CSI para almacenamiento y la distribution-spec para registros.",
    source: ["https://kubernetes.io/docs/concepts/architecture/cri/"]
  },
  {
    id: "A038",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "The CNCF archived the Service Mesh Interface (SMI) project in 2023. Where did its maintainers consolidate the effort to standardize service mesh configuration on Kubernetes?",
    options: [
      "The GAMMA initiative of Gateway API (Kubernetes SIG Network)",
      "The OpenTelemetry project",
      "The Open Container Initiative",
      "The Container Network Interface specification"
    ],
    answer: [0],
    explanation: "Los mantenedores de SMI se unieron a GAMMA (Gateway API for Mesh Management and Administration) en 2022, y la CNCF archivó SMI en 2023. GAMMA define cómo usar Gateway API para configurar una service mesh (tráfico este-oeste).",
    source: ["https://www.cncf.io/blog/2023/10/03/cncf-archives-the-service-mesh-interface-smi-project/","https://gateway-api.sigs.k8s.io/docs/mesh/gamma/"]
  },
  {
    id: "A039",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "What is CloudEvents?",
    options: [
      "A Kubernetes API for cluster events such as Pod scheduling",
      "A Prometheus exporter for cloud provider metrics",
      "A CNCF graduated specification for describing event data in a common way, used for example by Knative Eventing",
      "A managed serverless service offered by the CNCF"
    ],
    answer: [2],
    explanation: "CloudEvents estandariza los metadatos comunes de los eventos para facilitar su identificación y enrutado; se graduó en la CNCF en enero de 2024 y Knative Eventing lo usa sobre HTTP. No tiene relación con los objetos Event de Kubernetes.",
    source: ["https://www.cncf.io/projects/cloudevents/","https://knative.dev/docs/"]
  },
  {
    id: "A040",
    domain: "architecture",
    topic: "Cloud Native Ecosystem and Principles",
    module: 10,
    q: "According to the CNCF Cloud Native Definition, which two statements describe cloud native systems? (Choose 2)",
    options: [
      "They require a single vendor's public cloud",
      "They are built as tightly coupled monoliths on long-lived, manually configured servers",
      "Combined with robust automation, they allow frequent, predictable high-impact changes with minimal toil",
      "They are loosely coupled systems that are resilient, manageable and observable"
    ],
    answer: [2,3],
    explanation: "La definición de la CNCF habla de sistemas débilmente acoplados, seguros, resilientes, gestionables, sostenibles y observables (contenedores, service meshes, microservicios, infraestructura inmutable, APIs declarativas) que, con automatización, permiten cambios frecuentes y predecibles en nubes públicas, privadas o híbridas.",
    source: ["https://github.com/cncf/toc/blob/main/DEFINITION.md"]
  },
  {
    id: "A041",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "Which OpenTelemetry component is a vendor-agnostic proxy that receives, processes and exports telemetry data to one or more backends?",
    options: [
      "The OpenTelemetry API",
      "The OpenTelemetry Collector",
      "Alertmanager",
      "kube-state-metrics"
    ],
    answer: [1],
    explanation: "El Collector se compone de receivers, processors y exporters (entre otros) y envía la telemetría a backends open source o comerciales. La API solo define cómo instrumentar el código.",
    source: ["https://opentelemetry.io/docs/collector/"]
  },
  {
    id: "A042",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "In distributed tracing with OpenTelemetry, what is a span?",
    options: [
      "A unit of work or operation within a trace, carrying a span context with the trace ID",
      "The total retention period of trace data",
      "A log file rotated by the kubelet",
      "A Prometheus label used to group time series"
    ],
    answer: [0],
    explanation: "Una traza se compone de spans enlazados (padre-hijo); cada span representa una operación y lleva un span context con el trace ID y su propio ID, que se propaga entre servicios para unirlos en la misma traza.",
    source: ["https://opentelemetry.io/docs/concepts/signals/traces/"]
  },
  {
    id: "A043",
    domain: "architecture",
    topic: "Observability",
    module: 11,
    q: "A service has an availability SLO of 99.9% over 30 days. Approximately how much unavailability does its error budget allow in that period?",
    options: [
      "About 3 days",
      "About 7 hours",
      "About 43 minutes",
      "About 4 minutes"
    ],
    answer: [2],
    explanation: "El error budget es 100% menos el SLO: 0,1% de 30 días (43.200 minutos) son unos 43 minutos. Si se agota, se prioriza la fiabilidad frente a nuevos lanzamientos.",
    source: ["https://sre.google/sre-book/embracing-risk/","https://sre.google/sre-book/introduction/"]
  }
];
