# Auditoría del orden del banco de preguntas

Noviembre de 2026. Se revisaron las 367 preguntas y 165 flashcards contra el texto de cada módulo con una regla: una pregunta del módulo N solo puede tratar lo que explican los módulos 00 a N (explicar, no mencionar de pasada). Motivo: F039 (finalizers) salía en el examen del módulo 02 y los finalizers no se explican hasta el 08.

La protección automática está en `quiz/src/conceptos.js` (la comprueba `quiz/src/validate.js`): un mapa de conceptos con el primer módulo que los explica. Detecta 21 de los 28 casos movidos; los otros 7 usan términos demasiado generales para una regla (namespace, label, `-A`).

## Resuelto con contenido nuevo

- **Probes** (03 §2, «Probes: cómo sabe el kubelet si tu contenedor está sano»): liveness, readiness y startup se explican ya en workloads. F024, F025, F026 y las flashcards de las tres probes vuelven al 03 (la auditoría las había movido al 06 y al 09). D050 (diagnosticar una liveness mal configurada) sigue en el 09.
- **Mantenimiento de nodos** (04, «Mantenimiento de nodos: cordon, drain y PodDisruptionBudget»): resuelve los huecos F046, F047, F074 y las flashcards PDB y drain, y la debilidad de F073 y la flashcard cordon. F046 y F047 pasan del 02 al 04; el 02 ahora remite a esa sección.
- **Módulo 02** (§9, §10 y §11): política de deprecación de la API (F099), fusión de varios archivos en `KUBECONFIG` (F100), backup de etcd con `etcdctl snapshot save` (F051), Kubernetes gestionado (F058) y orden de actualización de un clúster kubeadm (F049, que estaba débil). Todas siguen en el 02.
- **Módulo 01** (§6): RuntimeClass y `spec.runtimeClassName` (F091 y su flashcard) y que desde v1.26 el kubelet exige CRI v1 y si no, no registra el nodo (F098). Siguen en el 01.
- **Módulo 04**: scheduling gates (F075) y Dynamic Resource Allocation (F076), en una sección breve antes del mantenimiento de nodos.
- **Módulo 05**: Policy as Code tras los admission controllers (flashcard PaC) y una sección nueva de auditoría del API server (O099, que estaba débil).
- **Módulo 06**: `externalTrafficPolicy` en Services (O111), descubrimiento por variables de entorno junto al DNS (O114) y el Secret `kubernetes.io/tls` en Ingress (O108).
- Falco (O034 y su flashcard) se queda en el 10, donde se presenta la seguridad en runtime.
- **Módulo 07**: API gateway frente a service mesh (O126), identidad de Istio por ServiceAccount (O131) y modos PERMISSIVE/STRICT de PeerAuthentication (O132).
- **Módulo 08**: los volúmenes secret van en tmpfs (O087).
- **Módulo 09**: los pods siguen corriendo si cae el apiserver (O073), `kubectl events --types=Warning` (D054), `terminationMessagePolicy: FallbackToLogsOnError` (D055) y `kubectl cp` necesita `tar` (D056).
- **Módulo 10**: requisitos para Graduated (A033) y el Release Team de SIG Release (A031).
- **Módulo 11**: muestreo de trazas (A055) e instrumentación sin código frente a manual (A057).
- **Módulo 12**: precedencia de values en Helm (D040) y charts en registries OCI (D042).

Con esto quedan cubiertos todos los huecos y temas débiles de la auditoría.

## Movidas a un módulo posterior (28)

Ya aplicado en `quiz/src/src_*.js` (15 preguntas y 13 flashcards; el resumen de abajo cuenta cada una): el número de módulo de cada una pasa al primer módulo que explica el concepto.

| Elemento | Módulo | Qué falta |
|---|---|---|
| F088 | 01 → 03 | El módulo 01 solo nombra imagePullSecrets de pasada; el Secret de tipo kubernetes.io/dockerconfigjson para imagePullSecrets se explica en 03-workloads-pods-deployments.md §9 ConfigMaps y Secrets (y la herencia vía ServiceAccount en 05-seguridad.md). |
| F036 | 02 → 03 | Los namespaces iniciales (default, kube-system, kube-public, kube-node-lease) se explican en 03-workloads-pods-deployments.md §7 Namespaces; el 02 solo usa kube-system. |
| F053 | 02 → 03 | -A / --all-namespaces se explica en 03-workloads-pods-deployments.md, laboratorio §13 Namespaces y el resto de controladores; no aparece en 00-02. |
| F055 | 02 → 03 | --dry-run=client -o yaml se explica en 03-workloads-pods-deployments.md §6 Imperativo vs declarativo. |
| Flashcard «Namespace» | 02 → 03 | El namespace como partición con cuotas y RBAC se explica en 03-workloads-pods-deployments.md §7 Namespaces; 02 solo distingue namespaced/cluster-scoped. |
| Flashcard «Label» | 02 → 03 | 02 solo pone un comentario en el YAML ('para seleccionar/agrupar'); los labels y su uso por selectores se explican en 03-workloads-pods-deployments.md §8 Labels, selectors y annotations. |
| Flashcard «Selector» | 02 → 03 | Selectores de igualdad y de conjunto se explican en 03-workloads-pods-deployments.md §8 (y más a fondo en 04). |
| Flashcard «Annotation» | 02 → 03 | 02 solo comenta 'metadatos libres'; que las annotations no sirven para seleccionar se explica en 03-workloads-pods-deployments.md §8. |
| F056 | 02 → 04 | ResourceQuota solo se nombra en 03 §7; se explica (y se contrasta con LimitRange) en 04-scheduling.md §LimitRange y ResourceQuota. |
| F057 | 02 → 04 | La inyección de valores por defecto de LimitRange se explica en 04-scheduling.md §LimitRange y ResourceQuota (y paso 9 del lab); 02 no lo trata. |
| F027 | 03 → 04 | Las reglas de las QoS classes (Guaranteed = requests == limits en todo) se explican en 04-scheduling.md §requests/limits y QoS; 03 solo muestra BestEffort en una nota del lab. |
| F028 | 03 → 04 | 03 solo dice en una nota del lab §2 que BestEffort es 'lo primero que se expulsa'; el orden de desalojo por QoS se explica en 04-scheduling.md §QoS class. |
| F030 | 03 → 04 | El throttling de CPU al alcanzar el límite se explica en 04-scheduling.md §requests y limits; 01 solo muestra cpu.max sin explicar el efecto. |
| Flashcard «ResourceQuota» | 02 → 04 | Se explica en 04-scheduling.md §LimitRange y ResourceQuota; 02 no lo menciona. |
| Flashcard «LimitRange» | 02 → 04 | Se explica en 04-scheduling.md §LimitRange y ResourceQuota; 02 no lo menciona. |
| Flashcard «Resource limits» | 03 → 04 | El OOMKilled está en 01, pero el throttling de CPU al superar el límite se explica en 04-scheduling.md §requests y limits. |
| Flashcard «QoS class» | 03 → 04 | Las reglas Guaranteed/Burstable/BestEffort y el orden de desalojo se explican en 04-scheduling.md §QoS class; 03 solo muestra BestEffort en el lab. |
| F024 | 03 → 06 | 03 §2 solo nombra las probes y remite a troubleshooting; que una readiness fallida saca el Pod de los endpoints se explica en 06-networking-services.md (EndpointSlices) y la tabla completa está en 09 §probes. |
| Flashcard «Readiness probe» | 03 → 06 | El efecto de la readiness (salir de los endpoints) se explica en 06-networking-services.md (EndpointSlices) y en detalle en 09. |
| F039 | 02 → 08 | Los finalizers no aparecen en 00-02; el primero que los trata es 08-storage.md (Protección en uso, finalizer pvc-protection) y luego 09-troubleshooting-debugging.md (Terminating atascado); aun así ninguno explica el mecanismo genérico (deletionTimestamp, el controlador retira el finalizer). |
| Flashcard «Finalizer» | 02 → 08 | Los finalizers aparecen por primera vez en 08-storage.md (Protección en uso, pvc-protection) y en 09 (Terminating atascado); no están en 00-02. |
| F025 | 03 → 09 | El comportamiento de livenessProbe (el kubelet reinicia el contenedor) se explica en 09-troubleshooting-debugging.md (tabla liveness/readiness/startup); 03 solo la nombra. |
| F026 | 03 → 09 | startupProbe se explica en 09-troubleshooting-debugging.md (tabla de probes); 07 solo la nombra de pasada y 03 no la explica. |
| D050 | 03 → 09 | Diagnosticar reinicios por una livenessProbe mal configurada requiere la explicación de probes y eventos de 09-troubleshooting-debugging.md (tabla de probes y estados). |
| Flashcard «Liveness probe» | 03 → 09 | 03 solo nombra las probes; se explican en 09-troubleshooting-debugging.md (tabla de probes). |
| Flashcard «Startup probe» | 03 → 09 | startupProbe se explica en 09-troubleshooting-debugging.md (tabla de probes). |
| O034 | 05 → 10 | Falco no aparece en 05-seguridad.md (solo de pasada en 06 como herramienta eBPF); el primer módulo que lo identifica como proyecto graduado de seguridad en runtime es 10-arquitectura-cloud-native.md (lista de proyectos graduados y tabla de roles «runtime security (Falco)»); alternativa: añadir una subsección de seguridad en runtime en 05. |
| Flashcard «Falco» | 05 → 10 | Falco no se trata en 05-seguridad.md; 10-arquitectura-cloud-native.md es el primero que lo presenta como proyecto graduado de seguridad en runtime (aunque tampoco explica el análisis de syscalls); alternativa: añadir subsección de runtime security en 05. |

## Huecos de contenido (27)

Pendiente. Ningún módulo explica lo suficiente para responder. Se quedan en su módulo; hay que añadir el contenido donde se indica (o moverlas si se decide no cubrirlo).

| Elemento | Módulo | Qué falta |
|---|---|---|
| F091 | 01 | El recurso RuntimeClass (spec.runtimeClassName) no aparece en ningún módulo; el 01 solo cita Kata/gVisor como runtimes sandbox. Debería añadirse en 01-contenedores-y-cloud-native.md §6 Runtimes de contenedores. |
| F098 | 01 | Que desde v1.26 el kubelet exige la API CRI v1 y no registra el nodo si el runtime no la soporta solo figura en las fuentes de 01 y 02, no en el texto; añadirlo en 01-contenedores-y-cloud-native.md §6 (párrafo CRI). |
| Flashcard «RuntimeClass» | 01 | RuntimeClass no se explica en ningún módulo; añadirlo en 01-contenedores-y-cloud-native.md §6 Runtimes (junto a Kata/gVisor). |
| F051 | 02 | El curso dice que hay que hacer backups de etcd pero nunca muestra etcdctl snapshot save / etcdutl snapshot restore; añadirlo en 02 §2 (etcd en dos frases) o §11 Pinceladas de administración. |
| F058 | 02 | Ningún módulo explica Kubernetes gestionado (EKS/AKS/GKE: el proveedor opera el control plane); 01 solo cita EKS/GKE/AKS en una tabla. Añadirlo en 02 §1 Vista general o §11 Pinceladas de administración. |
| F099 | 02 | La política de deprecación de APIs (GA no se elimina dentro de una versión mayor; beta 9 meses/3 versiones) no se explica; 02 §9 y 10 §5 solo dan los niveles alpha/beta/GA. Añadirla en 02 §9 Grupos y versiones de la API. |
| F100 | 02 | 02 §10 y 05 explican el orden --kubeconfig > KUBECONFIG > ~/.kube/config, pero no que KUBECONFIG puede listar varios archivos que se fusionan (gana el primero); añadirlo en 02 §10 kubeconfig. |
| F046 | 02 → 04 | kubectl drain (desalojar Pods, --ignore-daemonsets, PDB) solo se menciona en 02 §11 con la promesa 'se ve en el módulo de scheduling', pero 04-scheduling.md no lo explica; añadir una sección de mantenimiento de nodos (cordon/drain/uncordon) en 04. |
| F047 | 02 → 04 | kubectl uncordon no aparece en ningún módulo (04 solo dice que cordon pone el taint unschedulable); añadirlo junto a cordon/drain en 04-scheduling.md (sección de taints o una nueva de mantenimiento de nodos). |
| Flashcard «In-place Pod resize» | 03 → 04 | El in-place Pod resize solo se nombra de pasada en 10-arquitectura-cloud-native.md (modo InPlaceOrRecreate del VPA); ningún módulo lo explica. Añadirlo en 04-scheduling.md §requests y limits. |
| F074 | 04 | PodDisruptionBudget no se explica en ningún módulo (solo se nombra en la tabla de resiliencia de 10-arquitectura-cloud-native.md y como distractor en 08); debería añadirse a 04-scheduling.md una sección de mantenimiento de nodos (cordon/drain/PDB con minAvailable/maxUnavailable y disrupciones voluntarias). |
| F075 | 04 | Los scheduling gates (spec.schedulingGates, estado SchedulingGated) no aparecen en ningún módulo; encajaría en 04-scheduling.md dentro de «El trabajo del scheduler» o junto a «Múltiples schedulers y scheduler profiles». |
| F076 | 04 | Dynamic Resource Allocation (ResourceClaim, DeviceClass, device plugins/recursos extendidos como nvidia.com/gpu) no se menciona en ningún módulo; debería añadirse a 04-scheduling.md en «Requests, limits y QoS classes» o una sección breve sobre hardware especializado. |
| Flashcard «PodDisruptionBudget (PDB)» | 04 | PDB no se explica en ningún módulo (solo nombrado en 10-arquitectura-cloud-native.md, tabla de resiliencia); añadir a 04-scheduling.md una sección de mantenimiento de nodos con cordon/drain/PDB. |
| Flashcard «kubectl drain» | 04 | kubectl drain solo se nombra en 02-arquitectura-kubernetes.md («se ve en el módulo de scheduling»), pero 04-scheduling.md no lo explica; añadir en 04 la sección de mantenimiento (drain = cordon + desalojo respetando PDBs). |
| Flashcard «Policy as Code (PaC)» | 05 | El concepto Policy as Code no se explica en ningún módulo (05 solo nombra OPA Gatekeeper y Kyverno como webhooks en «Admission controllers» y 10 los lista como graduados); debería añadirse en 05-seguridad.md, sección «Admission controllers». |
| O108 | 06 | 06-networking-services.md («Ingress e Ingress Controller») solo dice «con terminación TLS opcional»; ningún módulo explica el Secret de tipo kubernetes.io/tls (tls.crt/tls.key) referenciado en spec.tls del Ingress; debería añadirse en esa sección. |
| O111 | 06 | externalTrafficPolicy: Local solo aparece como opción de una pregunta tipo examen en 06; ningún módulo explica que conserva la IP de origen y enruta solo a Pods del nodo receptor; debería añadirse en 06-networking-services.md, sección «Services» (tipos NodePort/LoadBalancer). |
| O114 | 06 | El descubrimiento de Services por variables de entorno ({SVC}_SERVICE_HOST/_PORT, solo de Services previos al Pod) no se explica en ningún módulo; debería añadirse en 06-networking-services.md, sección «DNS en Kubernetes: CoreDNS», como mecanismo alternativo al DNS. |
| O131 | 07 | Ningún módulo dice que Istio usa el ServiceAccount del Pod como identidad del workload en su certificado mTLS (SPIFFE); 07 §5 Istio debería añadirlo junto a istiod como CA. |
| O132 | 07 | Los modos PERMISSIVE/STRICT de mTLS no aparecen en ningún módulo (07 §5 solo nombra PeerAuthentication); 07 §5 Istio debería explicar los modos de PeerAuthentication y la migración gradual a mTLS. |
| O087 | 08 | Ningún módulo explica que los volúmenes secret se montan en tmpfs (RAM) y nunca se escriben en el disco del nodo (en 08 tmpfs solo sale en §2 para Podman); debería añadirse en la fila configMap/secret de la tabla de 08 §4. |
| D055 | 09 | terminationMessagePolicy (File / FallbackToLogsOnError) y /dev/termination-log no aparecen en ningún módulo; 09 §3 (catálogo de estados, Last State/lastState.terminated) debería añadirlo. |
| D056 | 09 | kubectl cp y su dependencia del binario tar dentro del contenedor no se explican en ningún módulo; 09 §6 (herramientas de debugging) debería incluirlo junto a exec/debug y las imágenes distroless. |
| A031 | 10 | El Release Team (dentro de SIG Release, roles Enhancements/Release Signal/Docs/Comms) no aparece en ningún módulo; solo se nombra SIG Release. Debería añadirse en curso/10-arquitectura-cloud-native.md, sección 5 'Gobierno de Kubernetes y de la CNCF' (bloque 'Ciclo de releases de Kubernetes'). |
| A055 | 11 | El muestreo (sampling) de trazas no se explica en ningún módulo; debería añadirse en curso/11-observabilidad.md, sección 10 'Tracing distribuido'. |
| D040 | 12 | Ningún módulo explica la precedencia de valores en Helm (values.yaml < -f/--values < --set); curso/12-application-delivery-gitops.md sección 6 (tabla de Helm, fila 'Values') debería añadirla. |

## Contenido débil (10)

Pendiente. El concepto aparece, pero de pasada: conviene ampliar la explicación.

| Elemento | Módulo | Qué falta |
|---|---|---|
| F049 | 02 | 02 §11 da la política de version skew (kubelet nunca más nuevo que el apiserver) pero no explica el procedimiento de upgrade con kubeadm (control plane primero, luego nodos, de una versión menor en una); añadirlo en 02 §11 Pinceladas de administración. |
| F073 | 04 | kubectl cordon solo aparece de pasada en 04-scheduling.md («Taints y tolerations»: el taint unschedulable lo pone kubectl cordon) y en 02 («se ve en el módulo de scheduling»); falta explicar que marca el nodo como no programable sin desalojar los Pods existentes y cómo se revierte con uncordon. |
| Flashcard «kubectl cordon» | 04 | cordon solo aparece de pasada en 04-scheduling.md («Taints y tolerations», taint unschedulable); falta explicar que no desaloja los Pods existentes y que uncordon revierte la marca. |
| O099 | 05 | La auditoría solo se menciona de pasada en 05-seguridad.md (tabla de las 4C y modo audit de PSA «lo anota en el log de auditoría»); falta explicar qué registra el audit log del kube-apiserver (quién, qué, cuándo, sobre qué recurso) y para qué sirve. |
| O126 | 07 | El API gateway solo aparece de pasada en 07 §3 Envoy ('muchos API gateways'); falta definirlo como punto de entrada único para clientes externos que agrupa las APIs y aplica autenticación y límites de peticiones, frente al mesh (este-oeste), p. ej. en 07 §1 o §4. |
| O073 | 09 | 09 §7 solo dice que si cae el apiserver kubectl no responde; falta indicar que los Pods ya en marcha siguen funcionando (el kubelet los mantiene) pero no se pueden crear, cambiar ni parar por la API. |
| D054 | 09 | 09 §1 y Comandos clave muestran kubectl events --for y get events --sort-by, pero no el filtro --types=Warning ni --field-selector type=Warning (los field selectors solo salen de pasada en 07 con involvedObject.name). |
| A033 | 10 | curso/10-arquitectura-cloud-native.md sección 5 solo dice 'auditoría de seguridad' para Graduated; falta el requisito de mantenedores de al menos dos organizaciones (y badge OpenSSF, voto 2/3 del TOC), necesario para la segunda opción. |
| A057 | 11 | curso/11-observabilidad.md sección 10 solo menciona 'auto-instrumentación' en una lista; falta explicar la instrumentación sin código (zero-code: agentes/librerías sin tocar el código fuente) frente a la manual. |
| D042 | 12 | curso/12-application-delivery-gitops.md (secciones 1 y 6) solo dice que un repositorio de charts puede ser un registry OCI; falta explicar helm package + helm push oci:// y helm install oci://. |
