# Verificación de misiones, tutor de la Terminal y diagramas con guía (2026-11-10)

**Referencia:** Kubernetes v1.37 · **Método:** [VERIFICACION-GUIA.md](../VERIFICACION-GUIA.md)

Se contrastó con documentación oficial el texto que quedaba pendiente tras la verificación de los [comandos de memoria](comandos-2026-11-10.md): las pistas de las misiones (`web/src/lib/kube/missions.ts`), los mensajes del tutor (`web/src/lib/kube/analizador.ts`) y las guías de los diagramas del módulo 02 (`web/src/lib/diagramas.ts`).

| Archivo | Revisados | Correctos | Corregidos |
|---|---|---|---|
| `missions.ts` | 16 | 14 | 2 |
| `diagramas.ts` | 22 | 22 | 0 |
| `analizador.ts` | 29 | 27 | 2 |
| **Total** | **67** | **63** | **4** |

## Hallazgo principal: `kubectl describe` no siempre muestra eventos

En kubectl v1.37, `--show-events` vale «true for a single object, false for multiple objects and prefix matching» ([referencia](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/); en el código, [`describe.go`](https://github.com/kubernetes/kubernetes/blob/release-1.37/staging/src/k8s.io/kubectl/pkg/cmd/describe/describe.go): `if (err != nil || len(infos) > 1) && !o.ShowEventsExplicitlySet { ShowEvents = false }`). Consecuencias, todas corregidas:

- **Misión `diag-causa`**: la solución era `kubectl describe pod catalogo` (prefijo), que en un kubectl real no enseña los eventos que la misión pide leer. Ahora es `kubectl describe pod -l app=catalogo` y la misión ya no se completa con la forma por prefijo.
- **Simulador**: `describe` omite `Events` cuando encuentra el objeto por prefijo o describe varios, y acepta `--show-events`.
- **Tutor**: explica por qué no salen los eventos y ofrece la corrección.
- **Laboratorio del módulo 09, paso 4**: `k describe pod -n lab-09 -l app=frontend` describe dos réplicas; se añadió `--show-events` y una frase que lo explica. El kubectl del laboratorio es v1.37.1. **Conviene ejecutarlo en el clúster para confirmarlo.**

## Textos corregidos

| Texto | Antes | Ahora | Motivo | Fuente |
|---|---|---|---|---|
| `missions.ts` · diag-causa | hint: 'kubectl describe pod catalogo', | hint: 'kubectl describe pod -l app=catalogo', | La idea es correcta. El problema es el hint: ningún Pod se llama exactamente «catalogo» (es catalogo-HASH-xxxxx), así que kubectl describe lo resuelve por prefijo, y en v1.37 --show-events 'Defaults to true for a single object, false for multiple objects and prefix matching' (en describe.go: si la búsqueda exacta falla o hay más de un objeto y el flag no se puso, ShowEvents = false). En un kubectl real ese comando describe el Pod SIN eventos, justo lo que la misión pide leer. Con -l app=catalogo hay un único objeto y los eventos sí salen; el check de la misión ya acepta esa forma (alternativa: añadir --show-events). Aviso de código: el simulador muestra eventos con el prefijo, cosa que kubectl 1.37 no hace. | [enlace](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/) |
| `missions.ts` · arreglar | (no en el Pod: el ReplicaSet lo recrearía igual) | (no en el Pod: los Pods nuevos seguirían saliendo de la plantilla, con la imagen mala) | Impreciso: spec.containers[*].image es uno de los pocos campos que sí se pueden cambiar en un Pod vivo ('Pod updates may not change fields other than spec.containers[*].image, ...'), y el ReplicaSet no recrea un Pod por editarlo. Lo que ocurre es que cualquier Pod nuevo se crea a partir de la plantilla del Deployment, que seguiría teniendo la imagen incorrecta. | [enlace](https://kubernetes.io/docs/concepts/workloads/pods/) |
| `analizador.ts` · no-simulado | El tipo «${malo}» existe en Kubernetes, pero este simulador no lo modela | El tipo «${malo}» existe en Kubernetes o en sus extensiones (CRD), pero este simulador no lo modela | La lista REALES mezcla tipos nativos con recursos personalizados que solo existen si se instala su CRD (gateways, httproutes, gatewayclasses, applications de Argo CD, servicemonitors y prometheusrules, virtualservices y destinationrules de Istio, verticalpodautoscalers). 'A custom resource is an extension of the Kubernetes API that is not necessarily available in a default Kubernetes installation'. | [enlace](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) |
| `analizador.ts` · create-sub | Lo que crea de forma imperativa: deployment, namespace | Crea de forma imperativa, entre otros: deployment, namespace | La lista se presentaba como completa y no lo es: kubectl create tiene 17 subcomandos; faltaban clusterrole, clusterrolebinding, ingress, poddisruptionbudget, priorityclass, quota y token. Todos los que cita sí existen. | [enlace](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/) |

## Otros cambios derivados

- El tutor ya no marca `-o kyaml` como formato desconocido (es válido en v1.37).

## Matices anotados en textos que se dieron por correctos

- `missions.ts` · net-dns: Matiz sin corregir: vale para los Services normales ('This resolves to the cluster IP of the Service'); un Service headless también tiene nombre DNS, pero resuelve a las IP de sus Pods. El Service web de la misión es normal.
- `missions.ts` · net-ep: El texto y el comando son válidos, pero la API Endpoints está 'Deprecated since Kubernetes v1.33' y la documentación recomienda EndpointSlice (kubectl get endpointslices -l kubernetes.io/service-name=web). No se propone cambio porque el check de la misión solo acepta endpoints/ep; queda a criterio del autor.
- `diagramas.ts` · guía 02-0 paso 1: Simplificación aceptable: el kubelet también expone su propia API (10250), pero solo la usa el control plane. 6443 es el puerto por defecto ('All default port numbers can be overridden').
- `diagramas.ts` · guía 02-0 paso 2: La tabla de puertos indica que la API cliente de etcd (2379-2380) la usan 'kube-apiserver, etcd'.
- `diagramas.ts` · guía 02-0 paso 8: Matiz sin corregir: kube-proxy es opcional si el plugin de red implementa los Services por su cuenta; en el clúster kind del curso sí está.
- `analizador.ts` · flag-desconocido: kubernetes.io no lo documenta; se confirma en la biblioteca de flags que kubectl lleva incluida: NotExistError produce 'unknown flag: --%s' y el análisis falla.
- `analizador.ts` · guion-simple: El msg es correcto ('Single dashes signify a series of shorthand letters for flags'). Aviso de código, no de texto: el campo real dice siempre «unknown shorthand flag: 'primera letra'», pero si la primera letra es un flag corto con valor (-namespace: -n), kubectl real no falla ahí: toma el resto («amespace») como valor de -n; y si es un booleano válido (-image en run: -i), el error nombra la primera letra desconocida ('m' in -mage).
- `analizador.ts` · falta-tipo: Vale para las dos variantes del mensaje: sintaxis 'kubectl [command] [TYPE] [NAME] [flags]' y forma TYPE/NAME.
- `analizador.ts` · imagen-sin-tag: Confirmado: 'If you don't specify a tag, Kubernetes assumes you mean the tag latest'; con :latest o sin tag imagePullPolicy 'is automatically set to Always'; con Always el kubelet pide la descarga al runtime en cada arranque (el runtime contacta con el registro y solo baja las capas que falten); ImagePullBackOff es el estado cuando no se puede descargar.
- `analizador.ts` · pod-prefijo: exec: la referencia dice 'from the first pod of the deployment'. logs: la referencia no dice qué Pod se usa; el código elige el primero y avisa 'Found N pods, using pod/NOMBRE' (o todos con --all-pods). Sufijo generado: los Pods toman como base el nombre del ReplicaSet, [DEPLOYMENT-NAME]-[HASH].
- `analizador.ts` · salida: El msg es correcto. Aviso de código: en v1.37 -o admite también kyaml, que la expresión regular del analizador rechaza (y le sugiere yaml).
- `analizador.ts` · set-par: Vale para las dos variantes. La columna CONTAINERS de get deployment -o wide no está en la documentación; se confirma en el código de las tablas (columna Containers con Priority 1, solo en wide).
- `analizador.ts` · exec-separador: Confirmado que hoy es un error y no un aviso: 'exec [POD] [COMMAND] is not supported anymore. Use exec [POD] -- [COMMAND] instead'.
- `analizador.ts` · taint-efecto (falta el efecto): Matiz sin corregir: el valor es opcional ('The value is optional'; clave:Efecto también es válido). El efecto sí es obligatorio, que es lo que explica el mensaje.
- `analizador.ts` · config-sub: Los 13 subcomandos de SUB_CONFIG existen; la referencia lista además delete-cluster y delete-user.
- `analizador.ts` · ns-inexistente: kubernetes.io no lo documenta. En el código de get, 'No resources found in %s namespace.' se imprime cuando no se escribió nada y no hubo errores, sin comprobar que el namespace exista. Solo queda respaldado para get (listar), que es lo que dice el mensaje; el aviso también se muestra con describe, logs, top y events.
- `analizador.ts` · binario: El nombre kubectl es correcto. La glosa «kube + control» no aparece como tal en ninguna fuente oficial; lo más cercano es la descripción de la referencia: 'kubectl controls the Kubernetes cluster manager'.

## Sin corregir (limitaciones conocidas)

- Mensaje `guion-simple` del tutor: el error «real» que imita siempre nombra la primera letra del flag; kubectl puede nombrar otra según el flag.
- Misión `net-ep`: `kubectl get endpoints` funciona, pero la API Endpoints está obsoleta desde v1.33 en favor de EndpointSlice; la misión acepta también `describe svc`.
- Glosa «kube + control» del mensaje `binario`: no aparece en ninguna fuente oficial.

## Fuente de cada texto

| Archivo | Texto | Fuente |
|---|---|---|
| `missions.ts` | crear | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/> |
| `missions.ts` | exponer | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/> · <https://kubernetes.io/docs/concepts/services-networking/service/> |
| `missions.ts` | escalar | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/> · <https://kubernetes.io/docs/concepts/workloads/controllers/deployment/> |
| `missions.ts` | rollout | <https://kubernetes.io/docs/concepts/workloads/controllers/deployment/> · <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/> |
| `missions.ts` | env | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/> |
| `missions.ts` | namespace | <https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/> · <https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/> |
| `missions.ts` | nodos | <https://kubernetes.io/docs/reference/kubectl/> · <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/> |
| `missions.ts` | sched-ssd | <https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/> · <https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes/> |
| `missions.ts` | sched-label | <https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/> · <https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes/> |
| `missions.ts` | sched-taint | <https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/> · <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/> |
| `missions.ts` | net-dns | <https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/> · <https://kubernetes.io/docs/concepts/services-networking/service/> |
| `missions.ts` | net-ep | <https://kubernetes.io/docs/concepts/services-networking/service/> |
| `missions.ts` | net-nodeport | <https://kubernetes.io/docs/concepts/services-networking/service/> · <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/> |
| `missions.ts` | diag-causa | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/> · <https://github.com/kubernetes/kubectl/blob/release-1.37/pkg/cmd/describe/describe.go> |
| `missions.ts` | arreglar | <https://kubernetes.io/docs/concepts/workloads/pods/> · <https://kubernetes.io/docs/concepts/workloads/controllers/deployment/> |
| `missions.ts` | diag-eventos | <https://kubernetes.io/docs/reference/kubectl/> · <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/> |
| `diagramas.ts` | guía 02-0 paso 1 | <https://kubernetes.io/docs/concepts/architecture/> · <https://kubernetes.io/docs/reference/networking/ports-and-protocols/> |
| `diagramas.ts` | guía 02-0 paso 2 | <https://kubernetes.io/docs/reference/networking/ports-and-protocols/> · <https://kubernetes.io/docs/concepts/architecture/> |
| `diagramas.ts` | guía 02-0 paso 3 | <https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/> |
| `diagramas.ts` | guía 02-0 paso 4 | <https://kubernetes.io/docs/concepts/architecture/controller/> · <https://kubernetes.io/docs/concepts/architecture/> |
| `diagramas.ts` | guía 02-0 paso 5 | <https://kubernetes.io/docs/concepts/architecture/> |
| `diagramas.ts` | guía 02-0 paso 6 | <https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/> · <https://kubernetes.io/docs/concepts/architecture/nodes/> |
| `diagramas.ts` | guía 02-0 paso 7 | <https://kubernetes.io/docs/concepts/architecture/cri/> · <https://kubernetes.io/docs/concepts/architecture/> |
| `diagramas.ts` | guía 02-0 paso 8 | <https://kubernetes.io/docs/concepts/architecture/> · <https://kubernetes.io/docs/concepts/overview/components/> |
| `diagramas.ts` | guía 02-0 hueco API | <https://kubernetes.io/docs/concepts/architecture/> · <https://kubernetes.io/docs/reference/networking/ports-and-protocols/> |
| `diagramas.ts` | guía 02-0 hueco ETCD | <https://kubernetes.io/docs/concepts/architecture/> |
| `diagramas.ts` | guía 02-0 hueco SCH | <https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/> |
| `diagramas.ts` | guía 02-0 hueco CM | <https://kubernetes.io/docs/concepts/architecture/controller/> |
| `diagramas.ts` | guía 02-0 hueco KL1/KL2 | <https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/> · <https://kubernetes.io/docs/concepts/architecture/nodes/> |
| `diagramas.ts` | guía 02-0 hueco CR1/CR2 | <https://kubernetes.io/docs/concepts/architecture/cri/> · <https://kubernetes.io/docs/concepts/containers/images/> |
| `diagramas.ts` | guía 02-0 hueco KP1/KP2 | <https://kubernetes.io/docs/concepts/overview/components/> |
| `diagramas.ts` | guía 02-2 paso 1 | <https://kubernetes.io/docs/concepts/architecture/controller/> |
| `diagramas.ts` | guía 02-2 paso 2 | <https://kubernetes.io/docs/concepts/architecture/controller/> |
| `diagramas.ts` | guía 02-2 paso 3 | <https://kubernetes.io/docs/concepts/architecture/controller/> |
| `diagramas.ts` | guía 02-2 paso 4 | <https://kubernetes.io/docs/concepts/architecture/controller/> · <https://kubernetes.io/docs/concepts/workloads/controllers/deployment/> |
| `diagramas.ts` | guía 02-2 hueco O | <https://kubernetes.io/docs/concepts/architecture/controller/> |
| `diagramas.ts` | guía 02-2 hueco D | <https://kubernetes.io/docs/concepts/architecture/controller/> |
| `diagramas.ts` | guía 02-2 hueco A | <https://kubernetes.io/docs/concepts/architecture/controller/> |
| `analizador.ts` | flag-desconocido | <https://github.com/kubernetes/kubernetes/blob/master/vendor/github.com/spf13/pflag/errors.go> |
| `analizador.ts` | guion-simple | <https://github.com/kubernetes/kubernetes/blob/master/vendor/github.com/spf13/pflag/flag.go> · <https://github.com/kubernetes/kubernetes/blob/master/vendor/github.com/spf13/pflag/errors.go> |
| `analizador.ts` | no-simulado | <https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/> |
| `analizador.ts` | falta-tipo | <https://kubernetes.io/docs/reference/kubectl/> |
| `analizador.ts` | tipo-mal-escrito | <https://kubernetes.io/docs/reference/kubectl/> |
| `analizador.ts` | imagen-sin-tag | <https://kubernetes.io/docs/concepts/containers/images/> |
| `analizador.ts` | pod-prefijo | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/> · <https://github.com/kubernetes/kubectl/blob/master/pkg/polymorphichelpers/logsforobject.go> |
| `analizador.ts` | salida | <https://kubernetes.io/docs/reference/kubectl/> · <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/> |
| `analizador.ts` | run-nombre | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/> |
| `analizador.ts` | run-imagen | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/> |
| `analizador.ts` | create-pod | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/> · <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/> |
| `analizador.ts` | create-sub | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/> |
| `analizador.ts` | create-nombre | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/> |
| `analizador.ts` | create-imagen | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/> |
| `analizador.ts` | secret-subtipo | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret/> |
| `analizador.ts` | scale-replicas | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/> |
| `analizador.ts` | rollout-sub | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/> |
| `analizador.ts` | set-sub | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/> |
| `analizador.ts` | set-par | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/> · <https://github.com/kubernetes/kubernetes/blob/master/pkg/printers/internalversion/printers.go> |
| `analizador.ts` | set-contenedor | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/> · <https://kubernetes.io/docs/concepts/workloads/controllers/deployment/> |
| `analizador.ts` | exec-separador | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/> · <https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/exec/exec.go> |
| `analizador.ts` | apply-archivo | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/> |
| `analizador.ts` | taint-efecto (falta el efecto) | <https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/> · <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/> |
| `analizador.ts` | taint-efecto (efecto inválido) | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/> |
| `analizador.ts` | config-sub | <https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/> |
| `analizador.ts` | otro-namespace | <https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/> |
| `analizador.ts` | ns-inexistente | <https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/get/get.go> |
| `analizador.ts` | binario | <https://kubernetes.io/docs/reference/kubectl/> |
| `analizador.ts` | verbo | <https://kubernetes.io/docs/reference/kubectl/> |
