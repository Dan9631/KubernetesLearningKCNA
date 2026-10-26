# Módulo 13 — Estrategia para aprobar la KCNA

> **Dominio KCNA:** transversal (todos los dominios) · **Tiempo:** 1 h de lectura + el plan de 6 semanas · **Prerrequisitos:** ninguno; vuelve a este módulo al empezar y al final del curso · **Sin laboratorio ni check**
> **Verificado:** 2026-10-26 contra la documentación oficial (Kubernetes v1.37). Fuentes al final del módulo.

## Objetivos

Al terminar podrás:

- Saber exactamente cómo es el examen (formato, duración, reglas de la supervisión online) y qué hacer el día anterior y el mismo día.
- Relacionar cada competencia del temario oficial con su módulo del curso y repartir tu tiempo según los pesos.
- Seguir un plan de estudio de 6 semanas con labs, retos y simulacros en la app de quiz.
- Aplicar técnicas para preguntas de opción múltiple en inglés y reconocer las trampas típicas.
- Repasar el vocabulario inglés-español que más aparece en el examen.

## 1. El examen en una tabla

| Aspecto | Detalle |
|---|---|
| Nombre | **KCNA — Kubernetes and Cloud Native Associate** (CNCF + Linux Foundation) |
| Formato | Examen **de opción múltiple** (página oficial). **60 preguntas** según las instrucciones generales de la Linux Foundation para sus exámenes de opción múltiple; la página de la KCNA no da el número ni si hay preguntas de varias respuestas: **verifícalo en la web oficial** |
| Duración | **90 minutos** → 1,5 minutos por pregunta |
| Modalidad | **Online, supervisado en remoto** (*online proctored*), desde tu ordenador, con webcam y micrófono. Los exámenes de opción múltiple de la LF usan la plataforma **PSI Bridge** con el navegador seguro de PSI (la página de la KCNA no nombra al proveedor: verifícalo al reservar) |
| Aprobado | **75%** (45 de 60), según el FAQ de exámenes de opción múltiple de la LF |
| Idioma | Inglés; también existen versiones en **japonés** y **chino simplificado**, que se compran por separado |
| Reintento | La compra incluye **dos intentos** (un *retake* si no apruebas el primero) |
| Precio de referencia | **USD 250** solo el examen (USD 299 con el curso LFS250) — cambia con frecuencia y hay descuentos habituales (Cyber Monday, KubeCon, bundles con curso). **Verifica el precio actual en la web oficial de la Linux Foundation** (training.linuxfoundation.org) |
| Plazo | **12 meses** desde la compra para programar y presentar el examen (y el retake si lo necesitas) |
| Resultado | Por correo, en las 24 horas siguientes |
| Vigencia | **2 años**. Aprobar la CKA o la CKAD renueva automáticamente la KCNA |
| Requisitos previos | Ninguno |

Es un examen **teórico**: no hay terminal ni clúster. Pero las preguntas están escritas por gente que usa Kubernetes a diario, y muchas se responden mucho más rápido si "has visto" el comportamiento en un lab (por ejemplo, qué hace `selfHeal` o qué pasa con un pod en `CrashLoopBackOff`).

### Reglas de la supervisión (resumen práctico)

Verifica siempre la versión actual en el *Candidate Handbook* de la Linux Foundation, pero en general:

- **Identificación oficial** con foto y nombre igual al de tu cuenta (pasaporte o documento de identidad). El nombre del registro debe coincidir exactamente.
- **Una sola pantalla**: desconecta monitores extra. Escritorio y alrededores despejados: ni papeles, ni móvil al alcance, ni relojes inteligentes. Te pedirán mostrar la habitación con la webcam.
- **Sin otras personas** en la sala, sin auriculares, sin comida (agua en vaso transparente suele estar permitida).
- **Navegador seguro de PSI**: hay que instalarlo y pasar la prueba de compatibilidad **días antes**. En portátiles corporativos el antivirus, la VPN o las políticas de empresa suelen bloquearlo: usa un equipo personal si puedes.
- Presentarse unos 15-30 minutos antes para el *check-in*, que puede tardar.

## 2. Temario oficial y mapa con el curso

Pesos vigentes desde noviembre de 2025 (los dominios, pesos y competencias de la tabla coinciden con la página oficial del examen). Comparado con el temario anterior, **Application Delivery pasó del 8% a formar parte de un dominio del 16%** y **Container Orchestration subió al 28%**: no los descuides.

| Dominio (peso) | Competencia | Módulo(s) del curso |
|---|---|---|
| **Kubernetes Fundamentals (44%)** | Core Concepts | [02 Arquitectura](02-arquitectura-kubernetes.md), [03 Workloads](03-workloads-pods-deployments.md) |
| | Administration | [00 Entorno](00-preparacion-entorno.md), [02 Arquitectura](02-arquitectura-kubernetes.md), [03 Workloads](03-workloads-pods-deployments.md) |
| | Scheduling | [04 Scheduling](04-scheduling.md) |
| | Containerization | [01 Contenedores y cloud native](01-contenedores-y-cloud-native.md) |
| **Container Orchestration (28%)** | Networking | [06 Networking y Services](06-networking-services.md), [07 Service mesh](07-service-mesh-microservicios.md) |
| | Security | [05 Seguridad](05-seguridad.md) |
| | Troubleshooting | [09 Troubleshooting](09-troubleshooting-debugging.md) |
| | Storage | [08 Storage](08-storage.md) |
| **Cloud Native Application Delivery (16%)** | Application Delivery | [12 Application Delivery y GitOps](12-application-delivery-gitops.md) |
| | Debugging | [09 Troubleshooting y debugging](09-troubleshooting-debugging.md) |
| **Cloud Native Architecture (12%)** | Observability | [11 Observabilidad](11-observabilidad.md) |
| | Cloud Native Ecosystem and Principles | [10 Arquitectura cloud native](10-arquitectura-cloud-native.md), [01 Contenedores y cloud native](01-contenedores-y-cloud-native.md) |
| | Cloud Native Community and Collaboration | [10 Arquitectura cloud native](10-arquitectura-cloud-native.md) y la sección de recursos de este módulo |
| Transversal | Estrategia de examen | 13 (este módulo) |

Cómo leer los pesos: con 60 preguntas, **Kubernetes Fundamentals son unas 26 preguntas**, Orchestration unas 17, Application Delivery unas 10 y Architecture unas 7. Si dominas a fondo Fundamentals y Orchestration (unas 43 preguntas), ya estás cerca del 75% necesario.

## 3. Plan de estudio de 6 semanas

Pensado para **7-8 horas por semana** (por ejemplo, 1 hora de lunes a viernes y 2-3 horas el fin de semana). Si tienes más tiempo, comprime a 4 semanas; si tienes menos, estira a 8 sin saltarte los labs.

Rutina de cada módulo: leer *Conceptos* → `.\kcna.ps1 lab NN` → laboratorio guiado → reto → `.\kcna.ps1 check NN` → preguntas tipo examen → `.\kcna.ps1 reset NN` → 20 preguntas del módulo en la app (`.\kcna.ps1 quiz` → *Práctica* → *Módulo NN*).

| Semana | Horas | Módulos | Labs y retos | Uso de la app de quiz |
|---|---|---|---|---|
| **1** | 7 | [00](00-preparacion-entorno.md), [01](01-contenedores-y-cloud-native.md), [02](02-arquitectura-kubernetes.md) | Montar el entorno; labs 01 y 02 completos | *Práctica* por módulo al terminar cada uno. Empieza las *Flashcards* (10 min/día) |
| **2** | 8 | [03](03-workloads-pods-deployments.md), [04](04-scheduling.md) | Labs 03 y 04; repite el reto 03 sin mirar la solución | *Práctica* por módulo + *Práctica* del dominio Kubernetes Fundamentals |
| **3** | 8 | [05](05-seguridad.md), [06](06-networking-services.md), [07](07-service-mesh-microservicios.md) | Labs 05, 06 y 07 | *Práctica* por módulo; *Repasar falladas* el fin de semana |
| **4** | 8 | [08](08-storage.md), [09](09-troubleshooting-debugging.md), [11](11-observabilidad.md) | Labs 08, 09 y 11 | *Práctica* del dominio Container Orchestration. Fin de semana: **primer simulacro** completo como diagnóstico (no importa la nota, importa ver huecos) |
| **5** | 8 | [10](10-arquitectura-cloud-native.md), [12](12-application-delivery-gitops.md) | Labs 10 y 12 (incluida la parte de Argo CD) | *Práctica* de los dominios Application Delivery y Architecture. **Segundo simulacro** el domingo |
| **6** | 7 | 13 (este) + repaso | Repite 3-4 retos al azar desde cero (`reset` + `lab` + reto + `check`) | **Simulacros 3 y 4** en condiciones reales (90 min, sin interrupciones, sin apuntes). Entre medias, *Repasar falladas* y *Flashcards*. Lee los *Resumen para repasar* de los 13 módulos |

Cuándo reservar fecha: cuando saques **85% o más en dos simulacros seguidos** de la app (el margen sobre el 75% absorbe los nervios y las preguntas con redacción rara). Reserva al inicio de la semana 5 para tener una fecha que te comprometa; puedes reprogramar con antelación si hace falta.

Cómo usar el simulacro de la app:

1. Siempre cronometrado y de una sentada: el objetivo es también entrenar el ritmo de 1,5 min por pregunta.
2. Marca (*Marcar para revisar*) las dudosas en lugar de quedarte atascado.
3. Al terminar, revisa **todas** las falladas y también las acertadas por intuición. Por cada fallo, apunta el concepto (no la respuesta) y vuelve a la sección del módulo.
4. No repitas el mismo simulacro hasta memorizar respuestas: eso infla la nota sin enseñarte nada.

## 4. Técnicas para preguntas de opción múltiple en inglés

**Antes de leer las opciones**

- Lee **la última frase del enunciado primero**: ahí está la pregunta real. El resto suele ser contexto.
- Subraya mentalmente las palabras que cambian el sentido: **NOT**, **EXCEPT**, **LEAST**, **MOST**, **BEST**, **FIRST**, **default**, **by default**, **primary**, **responsible for**.
- Intenta responder antes de ver las opciones. Si tu respuesta aparece tal cual, probablemente es esa.

**Descartar**

- Busca las dos opciones claramente falsas (componentes que no existen, comandos inventados, proyectos de otra área) y decide entre las otras dos.
- Desconfía de los **absolutos**: *always*, *never*, *only*, *all*, *guarantees*. En sistemas distribuidos casi nada es absoluto.
- Cuando dos opciones son casi iguales, la diferencia suele ser la clave de la pregunta (por ejemplo *ReplicaSet* vs *Deployment*, *liveness* vs *readiness*, *Continuous Delivery* vs *Continuous Deployment*).
- Si una opción mezcla responsabilidades (por ejemplo, "the scheduler starts the containers"), es falsa: cada componente hace una cosa. El scheduler **elige nodo**; el **kubelet** arranca los contenedores a través del **container runtime**.

**Patrones frecuentes**

- "¿Qué componente...?" → piensa en el flujo: `kubectl` → **kube-apiserver** → **etcd**; **scheduler** asigna nodo; **controller-manager** reconcilia; **kubelet** ejecuta; **kube-proxy** programa reglas de Service.
- "¿Qué proyecto de la CNCF...?" → asocia proyecto con categoría: Prometheus (métricas), Fluentd/Fluent Bit (logs), Jaeger (trazas), OpenTelemetry (instrumentación), Envoy (proxy), Istio/Linkerd (mesh), Helm (paquetes), Argo/Flux (GitOps), Harbor (registry), containerd/CRI-O (runtime), CoreDNS (DNS), etcd (almacén), Falco (seguridad en runtime), OPA/Kyverno (políticas), Knative (serverless), KEDA (autoescalado por eventos), Cilium/Calico (CNI), Rook (almacenamiento), Tekton (pipelines CI, incubating), OpenCost (costos, incubating). Todos los citados sin nivel son graduados (Calico no es proyecto CNCF).
- "¿Cuál es el valor por defecto...?" → Service `ClusterIP`; estrategia `RollingUpdate`; `imagePullPolicy` `IfNotPresent` (salvo `latest` → `Always`); `restartPolicy` `Always` en pods; namespace `default`.
- Preguntas de "comunidad": niveles de madurez **Sandbox → Incubating → Graduated**; el **TOC** (Technical Oversight Committee) decide; los **TAGs** asesoran por área; los **SIGs** son los grupos de Kubernetes; los cambios grandes se proponen como **KEP**.

**Gestión del tiempo**

- Primera pasada: responde todo lo que sepas en menos de un minuto y **marca** lo dudoso. Objetivo: terminar la primera pasada en ~60 minutos.
- Segunda pasada: solo las marcadas. Cambia una respuesta únicamente si encuentras una razón concreta, no por intuición.
- **Nunca dejes preguntas en blanco**: una respuesta en blanco seguro que no suma.

**Falsos amigos del inglés técnico**

| Inglés | Significa | No significa |
|---|---|---|
| *actual state* | estado **real** | "estado actual" en el sentido de "de ahora" (aunque coincida) |
| *eventually consistent* | **a la larga** consistente | "eventualmente" (= quizá) |
| *deprecated* | **obsoleto**, se retirará | "depreciado" (de valor) |
| *graceful shutdown* | apagado **ordenado** | "gracioso" |
| *ephemeral* | **temporal**, se pierde al recrear | — |
| *provision* | **aprovisionar** (crear y preparar) | "provisión" de alimentos |
| *issue* | **incidencia**, problema | "emisión" |
| *drain a node* | **vaciar** un nodo de pods | "drenar" agua |

## 5. Glosario inglés-español (los términos más preguntados)

| Inglés | Español | Nota rápida |
|---|---|---|
| Cloud native | Nativo de la nube | Apps escalables y resilientes en entornos dinámicos: contenedores, microservicios, APIs declarativas |
| Cluster | Clúster | Conjunto de nodos gestionados por un plano de control |
| Control plane | Plano de control | apiserver, etcd, scheduler, controller-manager (y cloud-controller-manager) |
| Worker node | Nodo de trabajo | Ejecuta kubelet, kube-proxy y el container runtime |
| kube-apiserver | Servidor de API | Única puerta de entrada; el único que habla con etcd |
| etcd | Almacén clave-valor | Guarda todo el estado del clúster; usa consenso Raft |
| kube-scheduler | Planificador | Decide en qué nodo va cada pod |
| kube-controller-manager | Gestor de controladores | Ejecuta los bucles de reconciliación (Deployment, Node, Job...) |
| kubelet | Agente del nodo | Arranca y vigila los pods del nodo vía CRI |
| kube-proxy | Proxy de red del nodo | Programa las reglas (iptables/IPVS/nftables) de los Services |
| Container runtime | Entorno de ejecución de contenedores | containerd, CRI-O; se conecta por **CRI** |
| Container image | Imagen de contenedor | Plantilla inmutable por capas, formato **OCI** |
| Registry | Registro de imágenes | Docker Hub, Quay, Harbor... |
| Pod | Pod | Unidad mínima desplegable: 1+ contenedores que comparten red y volúmenes |
| Sidecar container | Contenedor auxiliar | Acompaña al principal (proxy, logs); nativo con `restartPolicy: Always` en initContainers |
| Init container | Contenedor de inicialización | Se ejecuta y termina antes que los principales |
| Namespace | Espacio de nombres | Aislamiento lógico de nombres, cuotas y permisos |
| Label / Selector | Etiqueta / selector | Pares clave-valor para agrupar y seleccionar objetos |
| Annotation | Anotación | Metadatos no seleccionables (para herramientas) |
| Deployment | Deployment | Gestiona ReplicaSets; rolling updates y rollback |
| ReplicaSet | ReplicaSet | Mantiene N réplicas idénticas |
| StatefulSet | StatefulSet | Pods con identidad estable y almacenamiento propio |
| DaemonSet | DaemonSet | Un pod por nodo (agentes de logs, CNI) |
| Job / CronJob | Tarea / tarea programada | Ejecución hasta completar / con horario cron |
| Rolling update | Actualización gradual | Estrategia por defecto; `maxSurge`, `maxUnavailable` |
| Rollback | Reversión | `kubectl rollout undo`, `helm rollback`, `git revert` |
| Desired state | Estado deseado | Lo declarado en el spec (o en Git) |
| Reconciliation loop | Bucle de reconciliación | Observar → comparar → actuar |
| Controller | Controlador | Proceso que lleva el estado real al deseado |
| Operator | Operador | Controlador + CRD con conocimiento operativo de una app |
| Custom Resource Definition (CRD) | Definición de recurso personalizado | Extiende la API con tipos nuevos |
| Declarative / Imperative | Declarativo / imperativo | `apply -f` (qué quiero) vs `create/run/scale` (qué hacer) |
| Idempotent | Idempotente | Aplicarlo varias veces da el mismo resultado |
| Service | Servicio | IP y DNS estables para un grupo de pods: ClusterIP, NodePort, LoadBalancer, ExternalName |
| Headless Service | Servicio sin IP de clúster | `clusterIP: None`; DNS devuelve las IPs de los pods |
| EndpointSlice | Porción de endpoints | Lista de IPs:puertos detrás de un Service |
| Ingress | Ingress | Enrutamiento HTTP(S) por host/ruta; requiere un Ingress controller |
| Gateway API | Gateway API | Sucesora de Ingress: GatewayClass, Gateway, HTTPRoute |
| CNI | Interfaz de red de contenedores | Plugins de red: Calico, Cilium, Flannel |
| CoreDNS | CoreDNS | DNS del clúster: `svc.ns.svc.cluster.local` |
| NetworkPolicy | Política de red | Firewall de pods por labels; requiere CNI compatible |
| Service mesh | Malla de servicios | mTLS, reintentos, tráfico y telemetría entre servicios (Istio, Linkerd) |
| mTLS | TLS mutuo | Ambos extremos se autentican con certificado |
| Persistent Volume (PV) | Volumen persistente | Pieza de almacenamiento del clúster |
| PersistentVolumeClaim (PVC) | Reclamación de volumen | Petición de almacenamiento de un pod |
| StorageClass | Clase de almacenamiento | Permite el **dynamic provisioning** (aprovisionamiento dinámico) |
| Access modes | Modos de acceso | RWO, ROX, RWX, RWOP |
| Reclaim policy | Política de recuperación | Retain o Delete al liberar el PV |
| CSI | Interfaz de almacenamiento de contenedores | Estándar para drivers de almacenamiento |
| ConfigMap / Secret | Mapa de configuración / secreto | Configuración no sensible / sensible (base64 no es cifrado) |
| RBAC | Control de acceso basado en roles | Role/ClusterRole + RoleBinding/ClusterRoleBinding |
| ServiceAccount | Cuenta de servicio | Identidad de los pods ante la API |
| Authentication / Authorization | Autenticación / autorización | ¿Quién eres? / ¿Qué puedes hacer? |
| Admission controller | Controlador de admisión | Valida o modifica peticiones antes de guardarlas en etcd |
| Pod Security Standards | Estándares de seguridad de pods | Privileged, Baseline, Restricted (aplicados por Pod Security Admission) |
| Least privilege | Mínimo privilegio | Solo los permisos imprescindibles |
| Taint / Toleration | Marca (taint) / tolerancia | El nodo repele pods salvo los que la toleran |
| Node affinity | Afinidad de nodo | El pod prefiere o exige nodos con ciertas labels |
| Requests / Limits | Solicitudes / límites | Reserva para planificar / tope de consumo |
| QoS class | Clase de calidad de servicio | Guaranteed, Burstable, BestEffort |
| OOMKilled | Matado por falta de memoria | Superó su límite de memoria |
| HPA / VPA / Cluster Autoscaler | Escalado horizontal / vertical / de nodos | Más pods / más recursos por pod / más nodos |
| Probe (liveness, readiness, startup) | Sonda (vida, disponibilidad, arranque) | Reinicia / saca del Service / da tiempo al arranque |
| CrashLoopBackOff | Bucle de fallos con espera | El contenedor arranca y muere una y otra vez |
| ImagePullBackOff | Fallo al descargar la imagen | Tag inexistente, registry privado sin credenciales, sin red |
| Ephemeral container | Contenedor efímero | Para depurar en caliente: `kubectl debug` |
| Observability | Observabilidad | Entender el sistema por sus salidas: **logs, metrics, traces** |
| Telemetry | Telemetría | Datos emitidos por el sistema; **OpenTelemetry** es el estándar |
| Distributed tracing / Span | Trazas distribuidas / tramo | Sigue una petición entre servicios (Jaeger) |
| SLI / SLO / SLA | Indicador / objetivo / acuerdo de nivel de servicio | Métrica / meta interna / compromiso contractual |
| Microservices | Microservicios | Servicios pequeños, desplegables por separado |
| Serverless / FaaS | Sin servidor / funciones como servicio | Escala a cero, pago por uso; Knative |
| Immutable infrastructure | Infraestructura inmutable | No se parchea en caliente: se reemplaza |
| Scalability / Elasticity | Escalabilidad / elasticidad | Capacidad de crecer / de crecer y decrecer según demanda |
| Self-healing | Autorreparación | Reinicio y reprogramación automáticos |
| CI/CD | Integración y entrega/despliegue continuos | Ver módulo 12 |
| GitOps | GitOps | Git como fuente de verdad + agente que reconcilia (pull) |
| Drift | Deriva | Diferencia entre estado deseado y real |
| Blue/green, Canary | Azul/verde, canario | Estrategias de despliegue sin corte |
| Helm chart / release | Chart / release de Helm | Paquete / instalación con nombre |
| Kustomize overlay | Capa (overlay) de Kustomize | Diferencias por entorno sobre una base |
| Sandbox / Incubating / Graduated | Sandbox / en incubación / graduado | Niveles de madurez de proyectos CNCF |
| TOC / TAG / SIG / KEP | Comité técnico / grupo asesor técnico / grupo de interés especial / propuesta de mejora | Gobernanza de CNCF y de Kubernetes |
| Vendor lock-in | Dependencia de proveedor | Lo que los estándares abiertos (OCI, CRI, CNI, CSI) ayudan a evitar |

## 6. Checklist final: estoy listo si...

- [ ] Saco **85% o más en dos simulacros seguidos** de la app, cronometrados y sin apuntes.
- [ ] Puedo dibujar de memoria la arquitectura de Kubernetes y explicar qué hace cada componente del plano de control y del nodo.
- [ ] Explico la diferencia entre Pod, ReplicaSet, Deployment, StatefulSet, DaemonSet y Job, y cuándo usar cada uno.
- [ ] Sé qué tipo de Service usar en cada caso y cómo funciona el DNS interno.
- [ ] Distingo liveness, readiness y startup probes, y requests vs limits (y sus clases QoS).
- [ ] Sé cómo funcionan RBAC (Role, ClusterRole, bindings, ServiceAccounts), NetworkPolicies y Pod Security Standards.
- [ ] Puedo explicar PV, PVC, StorageClass y aprovisionamiento dinámico.
- [ ] Sé diagnosticar `Pending`, `CrashLoopBackOff`, `ImagePullBackOff` y `OOMKilled` con `describe`, `logs`, `events` y `debug`.
- [ ] Recito los cuatro principios de OpenGitOps y explico push vs pull, Helm vs Kustomize y las estrategias de despliegue.
- [ ] Asocio los proyectos CNCF más conocidos con su categoría y sé qué significa Sandbox/Incubating/Graduated.
- [ ] Distingo logs, métricas y trazas, y conozco Prometheus, OpenTelemetry, Jaeger y Fluentd.
- [ ] Entiendo los términos del glosario sin traducirlos mentalmente.
- [ ] He completado todos los retos (`.\kcna.ps1 check NN`) al menos una vez.
- [ ] Hice la prueba de compatibilidad de PSI en el equipo y la red que usaré, tengo la identificación lista y la habitación preparada.
- [ ] Dormí bien la noche anterior y no estudio temas nuevos el último día (solo los *Resumen para repasar* y las flashcards).

## 7. Recursos oficiales y gratuitos

| Recurso | Para qué |
|---|---|
| **kubernetes.io/docs** — sobre todo *Concepts* y el *Glossary* (kubernetes.io/docs/reference/glossary) | La fuente oficial. Muchas preguntas usan su mismo vocabulario |
| **Currículo oficial de la KCNA** (repositorio github.com/cncf/curriculum) | El temario exacto con dominios y competencias; compruébalo por si se actualiza |
| **Página del examen y Candidate Handbook** (training.linuxfoundation.org y docs.linuxfoundation.org) | Precio, reglas, requisitos de PSI, política de retake y vigencia |
| **CNCF Landscape** (landscape.cncf.io) | Mapa de proyectos por categoría y nivel de madurez |
| **CNCF Glossary** (glossary.cncf.io) | Definiciones de términos cloud native (también en español) |
| **cncf.io/projects** | Lista oficial de proyectos Graduated, Incubating y Sandbox |
| **LFS250 — Kubernetes and Cloud Native Essentials** (Linux Foundation) | El curso oficial asociado a la KCNA. Es de pago (USD 99 suelto o USD 299 en bundle con el examen; verifica el precio actual). La alternativa gratuita es **LFS158 Introduction to Kubernetes** (USD 0). LFS151 *Introduction to Cloud Infrastructure Technologies* ya no aparece en el catálogo oficial |
| **opengitops.dev** | Los principios GitOps de primera mano |
| **Blog de Kubernetes** (kubernetes.io/blog) y notas de versión | Novedades y funcionalidades que pasan a GA |
| **Kubernetes Slack** (slack.k8s.io) y **CNCF Slack** | Comunidad; canales de grupos de estudio de certificaciones |
| Este curso: `.\kcna.ps1 quiz` y el [CHEATSHEET](../CHEATSHEET.md) | Simulacros, flashcards y referencia rápida de comandos |

## Resumen para repasar

- 60 preguntas (instrucciones generales de la LF), 90 minutos, 75% para aprobar, online supervisado (PSI Bridge), dos intentos incluidos, 12 meses para presentarlo, vigencia 2 años; precio de referencia USD 250 (verifícalo siempre).
- Pesos: Fundamentals 44% · Orchestration 28% · Application Delivery 16% · Architecture 12%. Fundamentals + Orchestration son unas 43 preguntas.
- Plan: 6 semanas, 7-8 h/semana; un simulacro diagnóstico en la semana 4, y reservar fecha con 85% o más en dos simulacros seguidos.
- Lee primero la pregunta real (última frase), vigila NOT/EXCEPT/BEST/default, descarta absolutos, marca y vuelve, nunca dejes en blanco.
- Prepara la logística de PSI con días de antelación: navegador seguro, una pantalla, identificación, habitación despejada.
- Domina el vocabulario en inglés: el examen no traduce nada (las versiones en japonés y chino son exámenes aparte).

## Fuentes oficiales

- [KCNA — training.linuxfoundation.org](https://training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/): precio (USD 250), opción múltiple online supervisado, 90 min, dos intentos / un retake, 12 meses de elegibilidad, vigencia 2 años, sin requisitos, dominios y pesos.
- [Multiple Choice Exams: FAQ — docs.linuxfoundation.org](https://docs.linuxfoundation.org/tc-docs/certification/faq-mc): 75% para aprobar, resultados en 24 h, PSI Bridge, vigencia 2 años, CKA/CKAD renuevan la KCNA.
- [Multiple Choice Exams: Important Instructions — docs.linuxfoundation.org](https://docs.linuxfoundation.org/tc-docs/certification/important-instructions-mc): 60 preguntas y 90 minutos (valores generales), supervisión remota con PSI Secure Browser.
- [Candidate Handbook: Language — docs.linuxfoundation.org](https://docs.linuxfoundation.org/tc-docs/certification/lf-handbook2/language): KCNA en inglés, japonés y chino simplificado.
- [Candidate Handbook: Repurchasing the exam — docs.linuxfoundation.org](https://docs.linuxfoundation.org/tc-docs/certification/lf-handbook2/repurchasing-the-exam): una orden activa con primer y segundo intento.
- [CNCF curriculum — github.com/cncf](https://github.com/cncf/curriculum): repositorio oficial del temario (`KCNA_Curriculum.pdf`).
- [LFS250 — training.linuxfoundation.org](https://training.linuxfoundation.org/training/kubernetes-and-cloud-native-essentials-lfs250/) y [LFS158 — training.linuxfoundation.org](https://training.linuxfoundation.org/training/introduction-to-kubernetes/): LFS250 de pago, LFS158 gratuito.
- [CNCF Projects — cncf.io](https://www.cncf.io/projects/): niveles de madurez actuales de los proyectos citados.
- [Glosario Cloud Native en español — glossary.cncf.io](https://glossary.cncf.io/es/): glosario oficial de la CNCF traducido.
