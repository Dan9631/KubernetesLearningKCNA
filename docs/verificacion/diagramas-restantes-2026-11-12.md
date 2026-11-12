# Verificación de las guías de diagramas restantes (2026-11-12)

**Referencia:** Kubernetes v1.37 · **Método:** [VERIFICACION-GUIA.md](../VERIFICACION-GUIA.md)

Se contrastaron los textos añadidos a `web/src/lib/diagramas.ts` el 2026-11-12: las 13 guías nuevas (recorrido, pistas de los huecos y distractores), la explicación paso a paso de las tres secuencias (02-1, 07-0 y 12-3) y los huecos añadidos a cinco guías que solo tenían recorrido (04-1, 04-2, 06-3, 08-0 y 09-2). Con esto los 37 diagramas del curso tienen guía verificada.

| Guía | Revisados | Correctos | Corregidos |
|---|---|---|---|
| 00-0 Cómo está montado tu laboratorio | 11 | 10 | 1 |
| 03-0 Las fases de un Pod | 12 | 12 | 0 |
| 07-1 Service mesh: data plane y control plane | 11 | 11 | 0 |
| 07-2 Canary con Gateway API | 10 | 10 | 0 |
| 10-0 Las cuatro dimensiones del autoscaling | 11 | 10 | 1 |
| 10-1 Niveles de madurez de un proyecto CNCF | 8 | 8 | 0 |
| 11-0 Cómo trabaja Prometheus | 15 | 15 | 0 |
| 11-1 El camino de un log | 9 | 9 | 0 |
| 12-0 El pipeline, del push a producción | 11 | 11 | 0 |
| 12-1 Blue/green frente a canary | 10 | 10 | 0 |
| 12-2 Modelo push frente a modelo pull | 9 | 9 | 0 |
| 12-4 Kustomize: base y overlays | 8 | 8 | 0 |
| 12-5 GitOps con Argo CD en tu laboratorio | 10 | 10 | 0 |
| 02-1 Del kubectl apply al contenedor en marcha | 10 | 10 | 0 |
| 07-0 Orden de arranque y parada con sidecar | 5 | 5 | 0 |
| 12-3 CI/CD con GitOps: quién hace qué | 8 | 8 | 0 |
| 04-1 Taints y node affinity: nodo dedicado | 5 | 5 | 0 |
| 04-2 ¿Qué herramienta de scheduling uso? | 7 | 7 | 0 |
| 06-3 Dos caminos para entrar desde fuera | 5 | 5 | 0 |
| 08-0 Por qué se pierden los datos de un contenedor | 4 | 4 | 0 |
| 09-2 Por qué un Service se queda sin endpoints | 5 | 5 | 0 |
| **Total** | **184** | **182** | **2** |

Ningún error de hecho sobre Kubernetes. Las dos correcciones son un nombre de label del laboratorio y una descripción imprecisa de Karpenter.

## Cómo se verificó

Los textos se agruparon en 58 datos comprobables. Para cada uno se descargó la página oficial y se comprobó que contiene la frase que lo respalda; cuando la comprobación falló, se leyó el pasaje para decidir si el texto estaba mal o solo lo decía con otras palabras. Los datos propios del laboratorio (puertos, labels de los nodos, servidor Git del módulo 12) se cruzaron con los archivos del repositorio: `cluster/kind-kcna.yaml`, `cluster/traefik-values.yaml`, `kcna.ps1` y `labs/12-application-delivery-gitops/gitops/git-server.yaml`.

Lo que este método no cubre: que cada distractor de «Completar de memoria» sea indefendible frente a todas las pistas. Se revisó al redactar, pero no contra la fuente.

## Correcciones

| Texto | Antes | Ahora | Motivo | Fuente |
|---|---|---|---|---|
| 00-0 paso 6 | …labels distintas (disktype y zona)… | …labels distintas (disktype y zone)… | La label de los workers se llama `zone`; `zona-a` y `zona-b` son sus valores. | `cluster/kind-kcna.yaml` |
| 10-0 paso 5 | …crea el nodo del tamaño que necesitan esos Pods pendientes. | …aprovisiona directamente nodos a la medida de esos Pods pendientes, dentro de los límites que fija el operador (NodePools). | Karpenter aprovisiona nodos según la configuración de NodePools; no elige un tamaño sin restricciones. | [Node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/) |

## Matices anotados sin cambio

- **02-1 paso 3**: «el API server es el único componente que lee y escribe en etcd». La documentación lo describe como la puerta de entrada del control plane y a etcd como su almacén; la tabla de puertos indica que la API cliente de etcd la usan el kube-apiserver y el propio etcd. Es la misma formulación que ya se aceptó en la guía 02-0.
- **03-0 paso 6**: la documentación nombra `CrashLoopBackOff` y `Terminating` como valores del campo Status de kubectl que no son fases. `ImagePullBackOff` no aparece en ese pasaje; es, igual que el primero, un motivo de espera de un contenedor.
- **07-0 paso 5**: la documentación dice que los sidecars reciben la señal cuando el último contenedor principal ha terminado y que, entre ellos, se detienen en orden inverso al de su definición. El texto lo resume como «en orden inverso al de arranque».
- **07-1 paso 5**: la página de arquitectura de Istio habla de la «Envoy API»; el nombre xDS es el que usa el módulo y la documentación de Envoy.
- **12-0 paso 6**: el glosario de la CNCF define continuous delivery como despliegue automático a un entorno de aceptación y continuous deployment como despliegue directo a producción. «Aprobación manual» es la forma en que el módulo y su diagrama expresan esa diferencia.
- **00-0 paso 1**: el puerto 6443 es el del API server dentro del nodo; kind lo publica en la máquina con un puerto que elige él. Se mantiene como en el diagrama del módulo.
- **12-5 paso 5**: el puerto 8443 para la interfaz de Argo CD coincide con el que el clúster publica para Traefik (HTTPS). Es lo que indica el módulo; no se probó en el clúster en esta verificación.

## Tabla de verificación

| Guía | Dato comprobado | Fuente |
|---|---|---|
| 02-1 | kubectl toma del kubeconfig el clúster y las credenciales | <https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/> |
| 02-1 | Orden: autenticación, autorización, admisión | <https://kubernetes.io/docs/concepts/security/controlling-access/> |
| 02-1 | El API server es la puerta de entrada del control plane y etcd su almacén | <https://kubernetes.io/docs/concepts/architecture/> |
| 02-1 | El Deployment crea un ReplicaSet y este, los Pods | <https://kubernetes.io/docs/concepts/workloads/controllers/deployment/> |
| 02-1 | El scheduler observa Pods sin nodo, filtra, puntúa y hace el binding | <https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/> |
| 02-1 | El kubelet habla con el runtime por CRI (gRPC) | <https://kubernetes.io/docs/concepts/architecture/cri/> |
| 02-1 | La red del Pod la configura el plugin CNI | <https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/> |
| 02-1 | El kubelet mantiene el estado del Pod (fase, condición Ready) | <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/> |
| 07-0 | Sidecar nativo: init container con restartPolicy Always | <https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/> |
| 07-0 | Basta con que el sidecar haya arrancado para seguir con el siguiente contenedor | <https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/> |
| 07-0 | Los sidecars se detienen después de los contenedores principales, en orden inverso | <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/> |
| 03-0 | Pending: aceptado, pero con contenedores aún sin preparar | <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/> |
| 03-0 | Running: ligado a un nodo y al menos un contenedor en marcha | <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/> |
| 03-0 | Succeeded: todos terminaron bien y no se reinician | <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/> |
| 03-0 | Failed: todos terminaron y al menos uno falló | <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/> |
| 03-0 | Unknown: no se pudo obtener el estado, típico de un fallo de comunicación con el nodo | <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/> |
| 03-0 | CrashLoopBackOff y Terminating no son fases del Pod | <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/> |
| 07-1 | Data plane: proxies que median el tráfico; control plane: los configura | <https://istio.io/latest/docs/ops/deployment/architecture/> |
| 07-1 | istiod: descubrimiento de servicios, configuración y certificados (CA) | <https://istio.io/latest/docs/ops/deployment/architecture/> |
| 07-1 | mTLS entre proxies: cifrado e identidad verificada | <https://istio.io/latest/docs/concepts/security/> |
| 07-2 | HTTPRoute reparte por weight entre backendRefs | <https://gateway-api.sigs.k8s.io/guides/user-guides/traffic-splitting/> |
| 10-0 | HPA: más o menos réplicas según métricas | <https://kubernetes.io/docs/concepts/workloads/autoscaling/> |
| 10-0 | VPA: ajusta los recursos de los Pods | <https://kubernetes.io/docs/concepts/workloads/autoscaling/> |
| 10-0 | KEDA: escala por eventos, como una cola | <https://kubernetes.io/docs/concepts/workloads/autoscaling/> |
| 10-0 | KEDA puede escalar a cero | <https://keda.sh/docs/latest/concepts/> |
| 10-0 | Cluster Autoscaler y Karpenter añaden nodos para Pods que no caben | <https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/> |
| 10-1 | Tres niveles de madurez: sandbox, incubating, graduated | <https://www.cncf.io/project-metrics/> |
| 10-1 | Kubernetes fue el primer proyecto graduado (2018) | <https://www.cncf.io/announcements/2018/03/06/cloud-native-computing-foundation-announces-kubernetes-first-graduated-project/> |
| 11-0 | Modelo pull por HTTP; push solo mediante una pasarela intermedia | <https://prometheus.io/docs/introduction/overview/> |
| 11-0 | Los objetivos se descubren por service discovery | <https://prometheus.io/docs/introduction/overview/> |
| 11-0 | Almacenamiento local en disco | <https://prometheus.io/docs/prometheus/latest/storage/> |
| 11-0 | Pushgateway: para trabajos efímeros | <https://prometheus.io/docs/practices/pushing/> |
| 11-0 | Las reglas de alerta se evalúan en Prometheus, que envía las alertas a Alertmanager | <https://prometheus.io/docs/alerting/latest/overview/> |
| 11-0 | Alertmanager agrupa, silencia y enruta | <https://prometheus.io/docs/alerting/latest/alertmanager/> |
| 11-0 | kube-state-metrics expone el estado de los objetos | <https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/> |
| 11-1 | Las apps escriben en stdout/stderr y el runtime lo guarda en el nodo | <https://kubernetes.io/docs/concepts/cluster-administration/logging/> |
| 11-1 | Agente de nodo como DaemonSet; no exige cambiar las aplicaciones | <https://kubernetes.io/docs/concepts/cluster-administration/logging/> |
| 11-1 | Kubernetes no trae almacenamiento de logs a nivel de clúster | <https://kubernetes.io/docs/concepts/cluster-administration/logging/> |
| 12-0 | Continuous delivery: el despliegue a producción puede requerir un paso manual | <https://glossary.cncf.io/continuous-delivery/> |
| 12-0 | Continuous deployment: llega a producción sin intervención | <https://glossary.cncf.io/continuous-deployment/> |
| 12-1 | Blue/green: dos entornos y cambio de todo el tráfico | <https://glossary.cncf.io/blue-green-deployment/> |
| 12-1 | Canary: primero una parte pequeña del tráfico | <https://glossary.cncf.io/canary-deployment/> |
| 12-2 | GitOps: los agentes obtienen el estado deseado (pull) y reconcilian de forma continua | <https://opengitops.dev/> |
| 12-3 | El estado deseado se guarda versionado e inmutable | <https://opengitops.dev/> |
| 12-4 | Kustomize: bases y overlays, dentro de kubectl (apply -k) | <https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/> |
| 12-5 | repo-server: clona el repositorio y genera los manifiestos | <https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/> |
| 12-5 | application-controller: compara el estado real con el deseado | <https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/> |
| 12-5 | Sincronización automática con self-heal y prune | <https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/> |
| 00-0 | kind crea clústeres cuyos nodos son contenedores | <https://kind.sigs.k8s.io/> |
| 04-1 | Una toleration permite, pero no obliga; para dedicar un nodo hace falta además node affinity | <https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/> |
| 04-2 | nodeSelector, node affinity, pod affinity y anti-affinity | <https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/> |
| 04-2 | topologySpreadConstraints reparte Pods entre dominios de fallo | <https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/> |
| 04-2 | Un DaemonSet garantiza una copia del Pod en cada nodo | <https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/> |
| 06-3 | Ingress enruta HTTP por host y path | <https://kubernetes.io/docs/concepts/services-networking/ingress/> |
| 06-3 | NodePort abre el mismo puerto en todos los nodos | <https://kubernetes.io/docs/concepts/services-networking/service/> |
| 08-0 | El contenedor añade una capa escribible que se pierde al borrarlo | <https://docs.docker.com/engine/storage/drivers/> |
| 09-2 | EndpointSlice: las direcciones de los Pods de un Service | <https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/> |
| 09-2 | Un Pod que falla su readiness se retira de los endpoints del Service | <https://kubernetes.io/docs/concepts/workloads/pods/probes/> |
