# Verificación de flashcards (`quiz/src/src_fc.js`)

Fecha: 2026-10-26. Referencia: Kubernetes v1.37, temario KCNA de noviembre de 2025.

## Resumen

| Concepto | Cantidad |
|---|---|
| Tarjetas revisadas | 150 |
| Correctas sin cambios | 135 |
| Corregidas o precisadas | 15 |
| Añadidas al final | 15 (total: 165) |

- Todas las tarjetas llevan ahora un 5.º elemento `source` con una URL oficial. `quiz/src/build.js` lo copia como `source` en cada objeto de `quiz/flashcards.js`.
- No se ha reordenado ni borrado ninguna tarjeta, y los términos de las 150 originales no cambian.
- Niveles de madurez CNCF comprobados en cncf.io/projects el 2026-10-26: graduados Kubernetes, containerd, CRI-O, CoreDNS, etcd, Envoy, Istio, Linkerd, Prometheus, OpenTelemetry, Jaeger, Fluentd, Helm, Argo, Flux, Falco, KEDA, Knative, Cilium, CloudEvents, Harbor, OPA y Kyverno; incubating OpenCost y Backstage.

## Tabla de cambios

| Tarjeta | Problema encontrado | Corrección | Fuente |
|---|---|---|---|
| kube-proxy | No decía que IPVS está obsoleto ni que kube-proxy es opcional | Se marca como "(opcional)" y se indica que el modo IPVS está obsoleto desde v1.35 (deshabilitado por defecto en v1.40 y eliminado en v1.43) | https://kubernetes.io/docs/reference/networking/virtual-ips/ |
| OpenTelemetry | Desactualizada: nivel CNCF sin indicar (era incubating) | Proyecto **graduado** (11 de mayo de 2026) | https://www.cncf.io/projects/opentelemetry/ |
| Kubernetes release cadence | "Ciclos de unas 15 semanas" no aparece en ninguna fuente oficial; los 14 meses no se explicaban | Unas tres versiones menores al año; se mantienen las tres más recientes y cada una tiene unos 14 meses de parches (12 de soporte estándar + 2 de mantenimiento) | https://kubernetes.io/releases/patch-releases/ , https://kubernetes.io/releases/release/ |
| Image digest | Decía "hash del contenido de la imagen" con SHA-256 fijo | Hash criptográfico (normalmente SHA-256) del **manifiesto** de la imagen | https://glossary.cncf.io/image-digest/ |
| Ingress | Faltaba su estado actual | API congelada (sigue siendo GA, no se eliminará); el proyecto recomienda Gateway API | https://kubernetes.io/docs/concepts/services-networking/ingress/ |
| Ingress controller | "Se retiró en marzo de 2026" era impreciso | Mantenimiento best-effort hasta marzo de 2026; después, sin releases, sin correcciones de errores y sin parches de seguridad | https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/ |
| 4C's of cloud native security | La página inglesa actual de kubernetes.io ya no incluye el modelo de las 4C | Se mantiene el modelo y se añade que la documentación inglesa actual lo sustituyó por las fases del ciclo de vida (Develop, Distribute, Deploy, Runtime); fuente: la versión en español, que sí lo conserva | https://kubernetes.io/es/docs/concepts/security/overview/ , https://kubernetes.io/docs/concepts/security/cloud-native-security/ |
| Secret | "Solo está codificado en base64" mezclaba codificación y almacenamiento | Se guarda sin cifrar en etcd por defecto; los valores solo van codificados en base64 | https://kubernetes.io/docs/concepts/configuration/secret/ |
| OpenCost | Faltaba el nivel CNCF; "en tiempo real" no coincide con la fuente | Proyecto **incubating** que da visibilidad del gasto actual e histórico | https://www.cncf.io/projects/opencost/ |
| CRI-O | Faltaba el nivel CNCF | Graduado (2023) | https://www.cncf.io/projects/cri-o/ |
| Knative | Faltaba el nivel CNCF | Graduado (septiembre de 2025) | https://www.cncf.io/projects/knative/ |
| Vertical Pod Autoscaler (VPA) | No aclaraba que es un complemento | No viene con Kubernetes por defecto: es un complemento | https://kubernetes.io/docs/concepts/workloads/autoscaling/ |
| CrashLoopBackOff | El tope de 5 minutos es un valor por defecto: desde v1.35 es configurable (KubeletCrashLoopBackOffMax, beta) | Secuencia 10 s, 20 s, 40 s... hasta 5 minutos **por defecto** | https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/ |
| TAG | La lista de ejemplos era vaga | Se nombran los cinco TAG actuales: Developer Experience, Infrastructure, Operational Resilience, Security and Compliance y Workloads Foundation | https://github.com/cncf/toc/tree/main/tags |
| CSI | "Reemplazó a los plugins in-tree" exageraba | Sustituye a los antiguos plugins in-tree, que se han migrado a CSI | https://kubernetes.io/docs/concepts/storage/volumes/#csi |

### Tarjetas añadidas (al final)

Faltaban estos términos del temario y de los módulos. Gateway API, HTTPRoute, native sidecar, PSA, OpenGitOps, KEP, SIG, TAG, TOC, OpenCost, EndpointSlice y ValidatingAdmissionPolicy ya tenían tarjeta.

| Término | Dominio / módulo | Fuente |
|---|---|---|
| GatewayClass | orchestration / 6 | https://kubernetes.io/docs/concepts/services-networking/gateway/ |
| Gateway | orchestration / 6 | https://kubernetes.io/docs/concepts/services-networking/gateway/ |
| eBPF | orchestration / 6 | https://glossary.cncf.io/ebpf/ |
| Istio ambient mode (GA desde Istio 1.24) | orchestration / 7 | https://istio.io/latest/docs/ambient/overview/ , https://istio.io/latest/news/releases/1.24.x/announcing-1.24/ |
| ztunnel | orchestration / 7 | https://istio.io/latest/docs/ambient/overview/ |
| Linkerd | orchestration / 7 | https://linkerd.io/what-is-a-service-mesh/ |
| Cilium | orchestration / 6 | https://docs.cilium.io/en/stable/overview/intro/ , https://www.cncf.io/projects/cilium/ |
| Policy as Code (PaC) | orchestration / 5 | https://glossary.cncf.io/policy-as-code/ , https://www.cncf.io/projects/kyverno/ , https://www.cncf.io/projects/open-policy-agent-opa/ |
| In-place Pod resize (estable desde v1.35) | fundamentals / 3 | https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/ |
| Harbor | fundamentals / 1 | https://www.cncf.io/projects/harbor/ |
| CloudEvents | architecture / 10 | https://www.cncf.io/projects/cloudevents/ |
| Serverless | architecture / 10 | https://glossary.cncf.io/serverless/ |
| Observability | architecture / 11 | https://opentelemetry.io/docs/concepts/observability-primer/ |
| Jaeger | architecture / 11 | https://www.jaegertracing.io/docs/latest/ |
| Fluent Bit | architecture / 11 | https://fluentbit.io/ |

### Comprobaciones relevantes que confirman tarjetas sin cambios

- Native sidecar: estable desde v1.33. ValidatingAdmissionPolicy: estable desde v1.30. PSA: estable desde v1.25; PodSecurityPolicy se eliminó en v1.25.
- API Endpoints: obsoleta desde v1.33 (página de EndpointSlices y blog del 24 de abril de 2025). EndpointSlice: estable desde v1.21.
- NodePort usa por defecto el rango 30000-32767. ConfigMap admite como máximo 1 MiB. maxSurge y maxUnavailable valen 25 % por defecto. ReadWriteOncePod es estable desde v1.29. La reclaim policy por defecto en el aprovisionamiento dinámico es Delete.
- QoS: los criterios de las clases y el orden de desalojo (BestEffort, después Burstable, después Guaranteed) coinciden con la fuente. Los cuatro principios de OpenGitOps y las definiciones SLI/SLO/SLA de sre.google también.

## Dudas sin resolver

- **Fuentes fuera de la lista `OFFICIAL` del validador.** El validador no comprueba las fuentes de las flashcards, así que no falla, pero estas dos están fuera de la lista:
  - "Linux namespaces": https://man7.org/linux/man-pages/man7/namespaces.7.html (man-pages oficiales de Linux).
  - "Multi-stage build": https://docs.docker.com/build/building/multi-stage/ (documentación oficial de Docker).
  - Ninguna fuente aceptada describe estos conceptos de forma directa. Valdría la pena añadir `man7.org` y `docs.docker.com` a `OFFICIAL`.
- **4C's.** La documentación inglesa vigente de kubernetes.io ya no presenta el modelo de las 4C (sí lo hacen la localización en español y las versiones antiguas). Conviene confirmar si el temario KCNA de 2025 lo sigue preguntando o si debe reforzarse el enfoque por fases del ciclo de vida.
- **DRA (no añadida).** El blog oficial dice que pasó a GA en v1.34, pero la página de conceptos de v1.37 indica "Stable since v1.35". No la añadí porque los módulos no la tratan. MutatingAdmissionPolicy (estable desde v1.36) tampoco aparece en los módulos y quedó fuera.
- **Anclas no abiertas.** Algunas URL apuntan a secciones con ancla que no abrí una por una, por ejemplo `#type-nodeport`, `#volume-binding-mode` o `#container-probes`. Las páginas sí las abrí; las anclas siguen la convención de kubernetes.io.
