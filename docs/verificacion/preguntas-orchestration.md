# Verificación: banco de preguntas Container Orchestration (`quiz/src/src_o.js`)

> **Verificado:** 2026-10-26 contra la documentación oficial (Kubernetes v1.37). Cada pregunta lleva su `source`.

## Resumen

| Concepto | Cantidad |
|---|---|
| Preguntas revisadas (O001-O062) | 62 |
| Correctas (solo se añadió `source` y, como mucho, un retoque de redacción) | 52 |
| Corregidas (explicación u opción con error o dato impreciso) | 10 |
| Reescritas | 0 |
| Añadidas al final (O063-O073) | 11 (8 del módulo 07 + 3 de troubleshooting del clúster, módulo 09) |

Todas las preguntas O001-O073 tienen fuente oficial (`node quiz/src/validate.js` → `VALIDATION OK`). Además se comprobó con un script que las 85 URLs distintas responden 200 y que cada ancla `#...` existe en la página.

Reparto tras los cambios: Networking 25 (módulo 07: 2 → 10), Security 19, Troubleshooting 15, Storage 14.

## Tabla de cambios

| id | Problema encontrado | Corrección | Fuente |
|---|---|---|---|
| O008 | Afirmaba que CoreDNS "corre como Deployment"; la doc oficial solo dice que es la implementación por defecto y que sus Pods están en kube-system con la etiqueta `k8s-app=kube-dns` | Explicación precisada (implementación por defecto, kube-system, Service kube-dns) | https://kubernetes.io/docs/tasks/administer-cluster/coredns/ · https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/ |
| O016 | "LoadBalancer a su vez usa NodePorts" es absoluto; la asignación de NodePorts se puede desactivar con `spec.allocateLoadBalancerNodePorts: false` | "que normalmente se apoya en NodePorts" | https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer |
| O017 | El distractor `winkernel` no es un modo de kube-proxy; el modo de Windows se llama `kernelspace`. La explicación no indicaba que `iptables` sigue siendo el modo por defecto en 1.37 ni que `ipvs` está obsoleto | Opción cambiada a `kernelspace`; explicación: nftables estable desde 1.33 (kernel 5.13+), iptables por defecto en 1.37, ipvs obsoleto desde 1.35 | https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-modes · https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/ |
| O018 | El modelo de las 4C ya no aparece en la documentación vigente de Kubernetes (la página de seguridad actual se organiza por fases del ciclo de vida); solo está en la doc hasta v1.28 | Se mantiene la pregunta (orden correcto según la fuente), explicación ampliada con ese matiz y fuente archivada de release-1.28 | https://github.com/kubernetes/website/blob/release-1.28/content/en/docs/concepts/security/overview.md · https://kubernetes.io/docs/concepts/security/cloud-native-security/ |
| O027 | "audit registra la violación en el log de auditoría": la doc precisa que añade una anotación al evento de auditoría; tampoco decía que PSA solo valida | Explicación precisada | https://kubernetes.io/docs/concepts/security/pod-security-admission/#pod-security-levels |
| O029 | Presentaba PSA como reemplazo único; la doc de PSP indica PSA **o** un admission plugin de terceros | Explicación ampliada (PSA estable desde 1.25, alternativa de terceros) | https://kubernetes.io/docs/concepts/security/pod-security-policy/ |
| O035 | "vía eBPF" presentado como único mecanismo; Falco usa por defecto una sonda eBPF moderna y también admite módulo del kernel | Explicación precisada; añadido que es graduado (2024) | https://www.cncf.io/projects/falco/ · https://falco.org/docs/ |
| O044 | Atribuía CreateContainerConfigError también a volúmenes; el kubelet devuelve ese error cuando falla la generación de la configuración del contenedor (p. ej. variables de entorno que referencian un ConfigMap/Secret o clave inexistente) | Explicación centrada en referencias de env sin `optional: true` | https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#restrictions · https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/kuberuntime/kuberuntime_container.go |
| O047 | Incluía "127 indica comando no encontrado", convención de shell sin respaldo en fuentes oficiales | Retirado; añadido que `lastState.terminated` muestra exitCode 137 y reason OOMKilled | https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/#exceed-a-container-s-memory-limit |
| O048 | Omitía que el kubelet primero recolecta Pods/contenedores muertos (no solo imágenes) antes de desalojar | Explicación precisada | https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/#node-conditions |

Retoques menores sin error de fondo (cuentan como correctas): O010 (añadido que la API Ingress está congelada y se recomienda Gateway API), O011 (fecha de GA oct-2023 e instalación como CRDs), O013 (sin releases ni parches tras marzo de 2026), O022 (token con rotación automática), O034 ("control plane" en lugar de "controlador"), O037 (journalctl en sistemas con systemd), O043 (back-off hasta 5 min), O056 (Immediate es el modo por defecto).

Comprobaciones clave confirmadas: rango NodePort 30000-32767 y `--service-node-port-range`; ClusterIP por defecto; ExternalName = CNAME sin proxy; headless = `clusterIP: None`; Endpoints obsoleta desde 1.33; Ingress requiere controlador y está congelada; Gateway API con 4 kinds estables (GatewayClass, Gateway, HTTPRoute, GRPCRoute), GatewayClass definida por el proveedor de infraestructura y Gateway por el operador; ingress-nginx sin mantenimiento desde marzo de 2026 con migración recomendada a Gateway API; PSS Privileged/Baseline/Restricted; PSA modos enforce/audit/warn y label `pod-security.kubernetes.io/<MODE>: <LEVEL>`; PSP eliminado en 1.25; RBAC aditivo, RoleBinding a ClusterRole limitado al namespace; RWOP estable desde 1.29 y solo CSI; RWO permite varios Pods en el mismo nodo; Retain → Released; reclaimPolicy por defecto Delete; WaitForFirstConsumer; expansión solo para crecer; ValidatingAdmissionPolicy estable desde 1.30; native sidecars estables desde 1.33.

## Preguntas añadidas

| id | Tema | Fuente |
|---|---|---|
| O063 | Microservicios frente a monolito (despliegue/escalado independiente) | https://glossary.cncf.io/microservices-architecture/ |
| O064 | Native sidecar: initContainer con `restartPolicy: Always` | https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/ |
| O065 | Envoy como proxy L7 del data plane | https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy · https://www.cncf.io/projects/envoy/ |
| O066 | Control plane (istiod) frente a data plane | https://istio.io/latest/docs/ops/deployment/architecture/ · https://istio.io/latest/docs/ambient/overview/ |
| O067 | Retries/timeouts y traffic splitting por pesos (Choose 2) | https://istio.io/latest/docs/concepts/traffic-management/ |
| O068 | Istio ambient: ztunnel por nodo (L4) y waypoints opcionales (L7) | https://istio.io/latest/docs/ambient/overview/ · https://istio.io/latest/docs/overview/dataplane-modes/ |
| O069 | Linkerd: graduado CNCF, micro-proxy en Rust (no Envoy) | https://linkerd.io/2/reference/architecture/ · https://www.cncf.io/projects/linkerd/ |
| O070 | GAMMA: HTTPRoute con `parentRefs` a un Service | https://gateway-api.sigs.k8s.io/docs/mesh/ · https://gateway-api.sigs.k8s.io/docs/mesh/gamma/ |
| O071 | Nodo con Ready=Unknown "Kubelet stopped posting node status" | https://kubernetes.io/docs/tasks/debug/debug-cluster/#example-debugging-a-down-unreachable-node |
| O072 | Nodo inalcanzable: taints unreachable y desalojo tras ~5 min | https://kubernetes.io/docs/tasks/debug/debug-cluster/#example-debugging-a-down-unreachable-node |
| O073 | Caída del API server: los Pods existentes siguen funcionando | https://kubernetes.io/docs/tasks/debug/debug-cluster/#cluster-failure-modes |

## Dudas sin resolver con fuente oficial

- **4C de la seguridad cloud native (O018):** el modelo solo está en la documentación de Kubernetes hasta v1.28; la vigente usa fases del ciclo de vida (develop, distribute, deploy, runtime). Se mantiene porque sigue siendo materia habitual de KCNA, pero conviene que quien mantenga el curso decida si sustituirla.
- **Código 137 = 128 + 9 (O047):** kubernetes.io muestra el ejemplo `exitCode: 137` / `reason: OOMKilled`, pero no documenta la convención 128 + número de señal. Se mantuvo por ser convención estándar de Linux.
- **CreateContainerConfigError (O044):** la cadena no aparece en el texto de kubernetes.io; se respalda con la doc de ConfigMap ("el Pod no arrancará") y con el código del kubelet. No se encontró fuente oficial para el comportamiento con volúmenes (que suele dejar el Pod en ContainerCreating), así que se omitió.
- **Estado GA de la mesh en Gateway API:** la página de mesh dice que GAMMA está en el canal Standard desde v1.1.0 y "se considera GA", pero el índice de conceptos de la misma web la sigue llamando "Experimental".
- **Versión GA de Istio ambient:** istio.io/latest/docs/overview/dataplane-modes/ habla de "production-ready" desde Istio 1.22 para un solo clúster, mientras que el módulo 07 dice "GA desde Istio 1.24". No afecta a las preguntas (no citan versión), pero lo debe revisar quien verifique el módulo 07.
- La página https://kubernetes.io/docs/concepts/services-networking/gateway/ dice en el texto "cuatro kinds estables" y en el pie de figura "tres"; las preguntas no dependen de ese número.
