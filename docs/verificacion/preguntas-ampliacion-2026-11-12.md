# Verificación: ampliación del banco (Scheduling, Security, Networking, service mesh, Observability)

Fecha: 2026-11-12. Referencia: Kubernetes v1.37, temario KCNA vigente desde nov-2025. Método: [VERIFICACION-GUIA.md](../VERIFICACION-GUIA.md).

## Por qué

Con el examen por módulo (10 preguntas, sale del mismo banco que la práctica), cinco módulos se quedaban cortos: el 07 tenía 7 preguntas para practicar, y el 04, 05, 06 y 11 entre 12 y 15. Se añadieron 75 preguntas **al final** de los archivos (los ids son posicionales y ninguno de los anteriores cambia). El banco reservado para el Examen de graduación no se tocó.

| Módulo | Para practicar antes | Añadidas | Para practicar ahora |
|---|---|---|---|
| 04 Scheduling (`src_f.js`, F102-F116) | 13 | 15 | 28 |
| 05 Security (`src_o.js`, O088-O100) | 15 | 13 | 28 |
| 06 Networking: Services (`src_o.js`, O101-O114) | 12 | 14 | 26 |
| 07 Networking: service mesh y microservicios (`src_o.js`, O115-O132) | 7 | 18 | 25 |
| 11 Observability (`src_a.js`, A044-A058) | 12 | 15 | 27 |
| **Banco completo** | **292** | **75** | **367** |

## Cómo se redactaron y verificaron

Las preguntas son originales: no se copiaron de exámenes reales ni de bancos de terceros (el contenido del examen KCNA es confidencial). Se escribieron a partir del temario oficial, del módulo del curso correspondiente y de la documentación oficial, leyendo antes las preguntas existentes para no duplicarlas.

Para cada pregunta se descargó la página citada y se comprobó de forma automática que responde, que no redirige a otra ruta, que existe el ancla (`#...`) y que el texto contiene las expresiones que respaldan la respuesta correcta. Ocho fuentes fallaron esa comprobación y se corrigieron:

- Cinco direcciones se habían movido (sondas de Pods, traffic splitting y mesh de Gateway API, telemetría de Linkerd) o no eran legibles sin JavaScript (Cilium, sustituida por su documentación).
- La pregunta de la toleration con `operator: Exists` era imprecisa: con la key vacía coincide con todas las claves y valores, pero el efecto se sigue comparando. Se reescribió para indicar que tampoco lleva `effect`.
- En dos casos solo cambió la expresión buscada, porque la documentación lo dice con otras palabras.

Lo que la comprobación automática no cubre es que ningún distractor sea también correcto: eso se revisó al redactar, no contra la fuente.

## Tabla de verificación

| id | Módulo | Pregunta | Fuente |
|---|---|---|---|
| F102 | 04 | In requiredDuringSchedulingIgnoredDuringExecution, what does the IgnoredDuringExecution part mean? | https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity |
| F103 | 04 | A Pod only has a preferredDuringSchedulingIgnoredDuringExecution node affinity rule, and no node matches it. What happens? | https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity |
| F104 | 04 | A Pod has a toleration that sets only operator: Exists, with no key and no effect. Which taints does it tolerate? | https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/ |
| F105 | 04 | A Pod tolerates a NoExecute taint with tolerationSeconds: 60. What happens when that taint is added to the node where the Pod is running? | https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/ |
| F106 | 04 | What is the behavior of the PreferNoSchedule taint effect? | https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/ |
| F107 | 04 | Which command adds a taint to node1 so that Pods without a matching toleration are not scheduled on it? | https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/ |
| F108 | 04 | A node becomes NotReady. By default, how long do its Pods stay bound to it before they are evicted? | https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/#taint-based-evictions |
| F109 | 04 | In inter-pod affinity and anti-affinity rules, what does topologyKey specify? | https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity |
| F110 | 04 | A node is running out of memory. Which component proactively terminates Pods on that node to reclaim resources? | https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/ |
| F111 | 04 | A pending Pod with a high priority does not fit on any node. What can the scheduler do? | https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#preemption |
| F112 | 04 | Which well-known node label is commonly used as topologyKey to spread Pods across availability zones? | https://kubernetes.io/docs/reference/labels-annotations-taints/#topologykubernetesiozone |
| F113 | 04 | Which QoS class is assigned to a Pod whose containers set no CPU or memory requests and limits? | https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/#besteffort |
| F114 | 04 | What must be true for a Pod to receive the Guaranteed QoS class? | https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/#guaranteed |
| F115 | 04 | What happens when a container tries to use more CPU than its CPU limit? | https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ |
| F116 | 04 | Which two objects let an administrator control resource consumption inside a namespace? (Choose 2) | https://kubernetes.io/docs/concepts/policy/resource-quotas/ · https://kubernetes.io/docs/concepts/policy/limit-range/ |
| O088 | 05 | In which order does the Kubernetes API server process a request? | https://kubernetes.io/docs/concepts/security/controlling-access/ |
| O089 | 05 | How are Kubernetes Secrets stored by default? | https://kubernetes.io/docs/concepts/configuration/secret/ |
| O090 | 05 | Where is encryption at rest for Secrets configured? | https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/ |
| O091 | 05 | How does Kubernetes represent normal (human) users? | https://kubernetes.io/docs/reference/access-authn-authz/authentication/#users-in-kubernetes |
| O092 | 05 | You need to let a monitoring tool list Nodes, which are cluster-scoped resources. Which RBAC objects do you use? | https://kubernetes.io/docs/reference/access-authn-authz/rbac/#role-and-clusterrole |
| O093 | 05 | In which order do admission controllers run? | https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#admission-control-phases |
| O094 | 05 | A Pod does not specify a ServiceAccount. Which one does it use? | https://kubernetes.io/docs/concepts/security/service-accounts/#default-service-accounts |
| O095 | 05 | Which statement describes the ServiceAccount tokens that the kubelet mounts into Pods in current Kubernetes versions? | https://kubernetes.io/docs/concepts/security/service-accounts/ |
| O096 | 05 | Which two selectors can a NetworkPolicy ingress rule use in its from section? (Choose 2) | https://kubernetes.io/docs/concepts/services-networking/network-policies/#behavior-of-to-and-from-selectors |
| O097 | 05 | Two NetworkPolicies select the same Pod. One allows ingress from Pods labeled app=web and the other from Pods labeled app=batch. What is the result? | https://kubernetes.io/docs/concepts/services-networking/network-policies/ |
| O098 | 05 | What is the least restrictive Pod Security Standard that already forbids privileged containers? | https://kubernetes.io/docs/concepts/security/pod-security-standards/#baseline |
| O099 | 05 | What does Kubernetes audit logging record? | https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/ |
| O100 | 05 | Which seccomp profile type applies the container runtime's default system call filter to a container? | https://kubernetes.io/docs/tutorials/security/seccomp/ |
| O101 | 06 | How does a Service decide which Pods receive its traffic? | https://kubernetes.io/docs/concepts/services-networking/service/#defining-a-service |
| O102 | 06 | In a Service spec, what is the difference between port and targetPort? | https://kubernetes.io/docs/concepts/services-networking/service/#defining-a-service |
| O103 | 06 | A Service of type LoadBalancer stays with its external IP in <pending> in a bare-metal cluster. What is the most likely reason? | https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer |
| O104 | 06 | What is the role of kube-proxy? | https://kubernetes.io/docs/reference/networking/virtual-ips/ |
| O105 | 06 | A StatefulSet named web uses the headless Service nginx in the namespace default. What is the DNS name of its first Pod? | https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id |
| O106 | 06 | A Pod in the namespace web needs to reach the Service api in the namespace shop. Which is the shortest DNS name that works? | https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#namespaces-of-services |
| O107 | 06 | What kind of traffic is an Ingress designed to route? | https://kubernetes.io/docs/concepts/services-networking/ingress/#what-is-ingress |
| O108 | 06 | How do you provide the certificate for TLS termination in an Ingress? | https://kubernetes.io/docs/concepts/services-networking/ingress/#tls |
| O109 | 06 | A cluster runs two Ingress controllers. How does an Ingress indicate which one should implement it? | https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class |
| O110 | 06 | What is a typical use for a Service without a selector? | https://kubernetes.io/docs/concepts/services-networking/service/#services-without-selectors |
| O111 | 06 | Which setting on a NodePort or LoadBalancer Service preserves the client source IP by only routing to Pods on the node that received the traffic? | https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/#preserving-the-client-source-ip |
| O112 | 06 | How can two containers in the same Pod communicate with each other? | https://kubernetes.io/docs/concepts/workloads/pods/#pod-networking |
| O113 | 06 | The readiness probe of a Pod starts failing. What does Kubernetes do? | https://kubernetes.io/docs/concepts/workloads/pods/probes/ |
| O114 | 06 | Besides DNS, which mechanism lets a Pod discover Services that existed when the Pod was created? | https://kubernetes.io/docs/concepts/services-networking/service/#environment-variables |
| O115 | 07 | What does mutual TLS (mTLS) between two services provide? | https://istio.io/latest/docs/concepts/security/#mutual-tls-authentication |
| O116 | 07 | In a service mesh, what is the data plane? | https://istio.io/latest/docs/ops/deployment/architecture/ |
| O117 | 07 | With the Gateway API, how do you send 90% of the requests to version 1 of a service and 10% to version 2? | https://gateway-api.sigs.k8s.io/guides/user-guides/traffic-splitting/ |
| O118 | 07 | What is the purpose of a circuit breaker in a service mesh? | https://istio.io/latest/docs/concepts/traffic-management/#circuit-breakers |
| O119 | 07 | What is fault injection used for in a service mesh? | https://istio.io/latest/docs/concepts/traffic-management/#fault-injection |
| O120 | 07 | What is east-west traffic? | https://gateway-api.sigs.k8s.io/docs/mesh/mesh-overview/ |
| O121 | 07 | Which technology does Cilium use to provide service mesh features without a sidecar proxy in every Pod? | https://docs.cilium.io/en/stable/network/servicemesh/ |
| O122 | 07 | Which drawback of the sidecar model do sidecarless designs such as Istio ambient mode try to reduce? | https://istio.io/latest/docs/ambient/overview/ |
| O123 | 07 | Which challenge typically grows when an application is split into microservices? | https://glossary.cncf.io/microservices-architecture/ |
| O124 | 07 | Which statement describes a monolithic application? | https://glossary.cncf.io/monolithic-apps/ |
| O125 | 07 | In an environment where service instances are created and destroyed constantly, what keeps track of where each service can be reached? | https://glossary.cncf.io/service-discovery/ |
| O126 | 07 | What is the main role of an API gateway? | https://glossary.cncf.io/api-gateway/ |
| O127 | 07 | Which metrics does a service mesh such as Linkerd record automatically for the traffic between services? | https://linkerd.io/docs/features/telemetry/ |
| O128 | 07 | What happened to the Service Mesh Interface (SMI) project? | https://www.cncf.io/blog/2023/10/03/cncf-archives-the-service-mesh-interface-smi-project/ |
| O129 | 07 | Compared with running a proxy as a regular container, what does a native sidecar container guarantee? | https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/ |
| O130 | 07 | In Istio ambient mode, what do you deploy when workloads need L7 features such as HTTP routing or L7 authorization policies? | https://istio.io/latest/docs/ambient/overview/ |
| O131 | 07 | In Istio on Kubernetes, what is the identity of a workload based on? | https://istio.io/latest/docs/concepts/security/#istio-identity |
| O132 | 07 | What does the PERMISSIVE mutual TLS mode of Istio allow? | https://istio.io/latest/docs/concepts/security/#permissive-mode |
| A044 | 11 | Which Prometheus metric type represents a value that can go up and down, such as current memory usage or the number of items in a queue? | https://prometheus.io/docs/concepts/metric_types/#gauge |
| A045 | 11 | The counter http_requests_total only shows the accumulated number of requests. Which PromQL function gives the per-second rate over the last five minutes? | https://prometheus.io/docs/prometheus/latest/querying/functions/#rate |
| A046 | 11 | What is a Prometheus exporter? | https://prometheus.io/docs/instrumenting/exporters/ |
| A047 | 11 | Prometheus pulls metrics from its targets. What is the Pushgateway meant for? | https://prometheus.io/docs/practices/pushing/ |
| A048 | 11 | Why should values such as user IDs or email addresses not be used as Prometheus label values? | https://prometheus.io/docs/practices/naming/#labels |
| A049 | 11 | Which tool is commonly used to build dashboards on top of Prometheus metrics? | https://prometheus.io/docs/visualization/grafana/ |
| A050 | 11 | What is Jaeger? | https://www.jaegertracing.io/ |
| A051 | 11 | Which is the most common approach for collecting the logs of all Pods in a cluster? | https://kubernetes.io/docs/concepts/cluster-administration/logging/#using-a-node-logging-agent |
| A052 | 11 | Why does a cluster need cluster-level logging in addition to kubectl logs? | https://kubernetes.io/docs/concepts/cluster-administration/logging/#cluster-level-logging-architectures |
| A053 | 11 | In distributed tracing, what makes it possible to join the spans created by different services into a single trace? | https://opentelemetry.io/docs/concepts/context-propagation/ |
| A054 | 11 | Which component evaluates Prometheus alerting rules and decides that an alert is firing? | https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ |
| A055 | 11 | Why is sampling used in distributed tracing? | https://opentelemetry.io/docs/concepts/sampling/ |
| A056 | 11 | What is OTLP? | https://opentelemetry.io/docs/specs/otlp/ |
| A057 | 11 | What does zero-code (automatic) instrumentation mean in OpenTelemetry? | https://opentelemetry.io/docs/concepts/instrumentation/zero-code/ |
| A058 | 11 | How do Kubernetes components such as the kube-apiserver and the kubelet expose their own metrics? | https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/ |
