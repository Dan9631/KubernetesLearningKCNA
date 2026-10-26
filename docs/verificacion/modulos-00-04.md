# Verificación de los módulos 00-04

Fecha: 2026-10-26 · Referencia: Kubernetes v1.37 (la documentación de `kubernetes/website` en `main` corresponde a v1.37) y definición cloud native de la CNCF v1.1.

Archivos: `curso/00-preparacion-entorno.md`, `curso/01-contenedores-y-cloud-native.md`, `curso/02-arquitectura-kubernetes.md`, `curso/03-workloads-pods-deployments.md`, `curso/04-scheduling.md`.

## Resumen

| Módulo | Afirmaciones revisadas (aprox.) | Preguntas tipo examen | Correctas | Corregidas | Ampliadas o matizadas | Comandos de lab cambiados |
|---|---|---|---|---|---|---|
| 00 | 15 | no tiene | 14 | 1 | 0 | 0 |
| 01 | 50 | 11 | 54 | 5 | 2 (+1 explicación) | 0 |
| 02 | 45 | 12 | 53 | 2 | 1 (+1 explicación) | 0 |
| 03 | 50 | 13 | 59 | 3 | 1 (+1 explicación) | 0 |
| 04 | 60 | 12 | 70 | 1 | 1 | 0 |

Todas las preguntas tipo examen tienen una sola respuesta defendible; ninguna se reescribió ni se sustituyó (solo se precisaron dos explicaciones). No se cambió ningún comando de laboratorio, así que no hizo falta volver a probar en el clúster. En cada módulo se añadió la línea "Verificado" y la sección "## Fuentes oficiales" (entre 8 y 15 enlaces).

## Tabla de cambios

| Módulo / sección | Problema encontrado | Corrección | Fuente |
|---|---|---|---|
| 00 · Las imágenes se precargan | "con `latest` el kubelet intentaría descargarla siempre": impreciso. Con `Always`, el runtime consulta el registry en cada arranque pero no vuelve a bajar las capas que ya tiene. Faltaba que un digest también da `IfNotPresent` | Redactado con precisión; añadido el caso del digest | https://kubernetes.io/docs/concepts/containers/images/ |
| 01 · 6. Runtimes (tabla) | CRI-O aparecía como "incubado en CNCF" | Graduado en la CNCF desde el 19-07-2023 (containerd, desde 2019) | https://www.cncf.io/projects/cri-o/ · https://www.cncf.io/projects/containerd/ |
| 01 · 6. Runtimes (tabla) | "runc (referencia, de Docker/OCI)": ninguna fuente oficial lo llama "implementación de referencia" | "el original: Docker lo donó a la OCI en 2015"; crun es el runtime por defecto de Podman | https://opencontainers.org/about/overview/ · https://docs.podman.io/en/latest/markdown/podman.1.html |
| 01 · 8. Cloud native | Se daba la definición v1.0 como si fuera la vigente | Ahora resume la v1.1 (2024): seguro y sostenible, multi-tenancy, serverless, "a escala, de forma programática y repetible". Se mantiene una nota con la v1.0 | https://github.com/cncf/toc/blob/main/DEFINITION.md |
| 01 · 7. Orquestación | "donado en 2014-2015 como primer proyecto de la CNCF": impreciso | Liberado en 2014, proyecto semilla de la CNCF en 2015 (aceptado formalmente en 2016), primer proyecto graduado (2018) | https://kubernetes.io/docs/concepts/overview/ · https://www.cncf.io/projects/kubernetes/ · https://www.cncf.io/announcements/2018/03/06/cloud-native-computing-foundation-announces-kubernetes-first-graduated-project/ |
| 01 · 5. Containerfile (ADD) | "descomprime tar": solo los tar **locales**; los remotos no se descomprimen por defecto | "descomprime archivos tar locales y acepta URLs remotas" | https://docs.docker.com/reference/dockerfile/ |
| 01 · 3. Namespaces | Faltaba el namespace `time` (Linux tiene 8 tipos) | Nota añadida bajo la tabla | https://man7.org/linux/man-pages/man7/namespaces.7.html |
| 01 · 12-factor | "metodología de Heroku": la escribió Adam Wiggins a partir de su trabajo en Heroku | Autoría precisada | https://12factor.net/ |
| 01 · Pregunta 10 (explicación) y Resumen | Se basaban en la definición v1.0 | Explicación y viñeta del resumen alineadas con la v1.1; añadida al resumen la viñeta de madurez de containerd y CRI-O | https://github.com/cncf/toc/blob/main/DEFINITION.md |
| 02 · 3. Componentes del nodo (kube-proxy) | "iptables, IPVS o nftables" sin decir que IPVS está obsoleto (desde v1.35; se desactivará en v1.40) ni cuál es el modo por defecto | `iptables` por defecto en v1.37, `nftables` su sucesor, `ipvs` obsoleto; kube-proxy es opcional | https://kubernetes.io/docs/reference/networking/virtual-ips/ · https://kubernetes.io/docs/concepts/overview/components/ |
| 02 · Pregunta 4 (explicación) | Igual que la fila anterior | Indica que IPVS está obsoleto | https://kubernetes.io/docs/reference/networking/virtual-ips/ |
| 02 · 5. Static pods | "por defecto `/etc/kubernetes/manifests`": el kubelet no trae ese valor por defecto, es la convención de kubeadm | "el que indique `staticPodPath`; en clústeres kubeadm, `/etc/kubernetes/manifests`" | https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/ · https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/ |
| 02 · 11. Versiones (skew) | Correcto pero incompleto | Añadido: el kubelet nunca puede ser más nuevo que el API server, kube-proxy sigue la misma regla y controller-manager y scheduler pueden ir 1 versión por detrás | https://kubernetes.io/releases/version-skew-policy/ |
| 03 · 1. Patrones multi-contenedor | "Desde Kubernetes 1.33 existen los sidecars nativos": existen desde 1.28 (alpha) y están activados por defecto desde 1.29; en 1.33 pasaron a GA | Ciclo de vida corregido | https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/ · feature gate `SidecarContainers` (docs de feature gates) |
| 03 · 3. ReplicaSet | "ReplicationController está obsoleto": la documentación lo llama API heredada (*legacy*), no *deprecated* | "API heredada; lo recomendado es Deployment + ReplicaSet" | https://kubernetes.io/docs/concepts/workloads/controllers/replicationcontroller/ |
| 03 · 2. restartPolicy | Faltaba que el backoff se reinicia tras 10 min, que los sidecars ignoran la política del Pod y la `restartPolicy` por contenedor (`ContainerRestartRules`, beta activada desde v1.35) | Añadido en una frase | https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/ |
| 03 · Pregunta 3 (explicación) | Con los sidecars nativos (que se declaran en `initContainers`), la opción A podía parecer defendible | La explicación aclara por qué A describe un sidecar y no un init container clásico | https://kubernetes.io/docs/concepts/workloads/pods/init-containers/ |
| 04 · DaemonSets | "sí respetan taints": cierto, pero faltaba que el controlador añade solas las tolerations not-ready/unreachable (NoExecute) y disk/memory/pid-pressure/unschedulable (NoSchedule) | Matiz añadido | https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/ |
| 04 · QoS classes | Faltaba que solo son candidatos al desalojo los pods que consumen más que sus requests, y la QoS con recursos a nivel de Pod (beta desde v1.34) | Párrafo de matices añadido | https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/ |

### Comprobado y correcto (sin cambios), entre otros

- 00: kind = Kubernetes IN Docker (SIG Testing), compatible con Podman; Headlamp en SIG UI; reglas de `imagePullPolicy`; orden de búsqueda del kubeconfig.
- 01: OCI (2015, Linux Foundation; runtime/image/distribution spec), CRI = gRPC entre el kubelet y el runtime, dockershim (obsoleto en 1.20, eliminado en 1.24), las imágenes de Docker funcionan porque son OCI, Docker Engine usa containerd, `command`/`args` ↔ ENTRYPOINT/CMD, capas y capa escribible (copy-on-write), los 12 factores, Harbor y CoreDNS graduados.
- 02: componentes y su papel, el API server escala horizontalmente, etcd (Raft, número impar, 3→1 y 5→2 fallos tolerados, puertos 2379-2380), puerto 6443, orden authn → authz → admisión, spec/status, grupos de la API, alpha/beta/GA (los beta nuevos vienen desactivados), `/livez` y `/readyz` (`/healthz` obsoleto desde 1.16), 3 versiones al año, 3 versiones mantenidas, ~14 meses de parches.
- 03: fases del Pod, backoff 10 s → 300 s, `maxSurge`/`maxUnavailable` 25% (redondeo hacia arriba / hacia abajo), `revisionHistoryLimit` 10, `--record` obsoleto, StatefulSet con Service headless, `backoffLimit` 6, `concurrencyPolicy`, namespaces iniciales, selectores, ConfigMap/Secret de 1 MiB, Secrets sin cifrar por defecto, actualización de volúmenes frente a variables de entorno y `subPath`.
- 04: filtrado/puntuación/binding y empates al azar, límites de `nodeName`, operadores y pesos de affinity (`Gt`/`Lt` solo en nodeAffinity), efectos de los taints y `tolerationSeconds` de 300 s por defecto, criterios QoS, LimitRange/ResourceQuota en admisión (403), PriorityClass (valores de las clases `system-*`, `preemptionPolicy: Never`), extension points del scheduling framework, `topologySpreadConstraints`.

## Dudas sin resolver con fuente oficial

- **Patrones Ambassador y Adapter (módulo 03):** la documentación actual de Kubernetes solo describe el sidecar; estos dos nombres vienen de material antiguo. Se mantienen porque son terminología habitual, pero no he encontrado una página vigente de kubernetes.io que los defina.
- **Kata Containers "cada contenedor en una micro-VM" (módulo 01):** Kata aísla por Pod/VM ligera; no lo he contrastado porque katacontainers.io no está en la lista de dominios aceptados. Lo dejo como está.
- **crun como runtime por defecto de Podman:** `podman(1)` lo indica, pero depende de cómo se empaquete Podman en cada distribución. Para la máquina de Podman en WSL (Fedora) es correcto.
- **Proveedor Podman de kind:** se activa con `KIND_EXPERIMENTAL_PROVIDER`; la documentación no dice explícitamente que sea "experimental" más allá del nombre de la variable. No se menciona en el módulo.
- **Datos de salida de los labs** (versiones `containerd://2.3.4`, `etcd:3.7.0-0`, `kubectl v1.37.1`): son observaciones del clúster, no afirmaciones teóricas; no se han verificado contra fuentes.
- **Headlamp:** la fuente más directa es headlamp.dev ("official Kubernetes sub-project and part of SIG UI"), pero ese dominio no está en `OFFICIAL` de `quiz/src/validate.js`; en el módulo se cita `github.com/kubernetes-sigs/headlamp`, que sí está aceptado.
