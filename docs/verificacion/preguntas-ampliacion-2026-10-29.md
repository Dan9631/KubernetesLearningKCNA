# Verificación: ampliación del banco (Storage, Debugging, Application Delivery)

Fecha: 2026-10-29. Referencia: Kubernetes v1.37, Helm 4, temario KCNA vigente desde nov-2025. Método: [VERIFICACION-GUIA.md](../VERIFICACION-GUIA.md).

## Por qué

Al reservar 60 preguntas para el Examen de graduación, las competencias con menos material se quedaban justas para practicar: Delivery solo conservaba 25 preguntas, y Debugging y Storage 10 y 11. Se añadieron 40 preguntas **al final** de los archivos (los ids son posicionales y ninguno de los anteriores cambia).

| Competencia | Antes | Añadidas | Ahora | Para practicar (sin reservadas) |
|---|---|---|---|---|
| Storage (`src_o.js`, O074-O087) | 14 | 14 | 28 | 25 |
| Application Delivery (`src_d.js`, D036-D047) | 22 | 12 | 34 | 27 |
| Debugging (`src_d.js`, D048-D061) | 13 | 14 | 27 | 24 |
| **Banco completo** | **252** | **40** | **292** | **232** |

## Cómo se verificó

Cada pregunta se redactó leyendo las existentes (para no duplicarlas) y el módulo del curso correspondiente. Para cada una se abrió la página oficial citada y se comprobó que respalda la respuesta correcta **y** que ningún distractor también lo es; se confirmó que existen los anclajes (`#...`). Las preguntas que no se pudieron respaldar se descartaron. `node quiz/src/validate.js --strict` termina en `VALIDATION OK`.

Se descartaron dos preguntas de Storage por exceder el nivel KCNA (storage capacity tracking y VolumeAttributesClass) y se sustituyeron por dos de reserva igualmente verificadas (O082: un Pod solo usa PVCs de su namespace; O087: los volúmenes secret usan tmpfs).

## Tabla de verificación

| id | Dato comprobado | Fuente |
|---|---|---|
| O074 | `emptyDir` con `medium: Memory` es tmpfs y cuenta para el límite de memoria del contenedor | https://kubernetes.io/docs/concepts/storage/volumes/#emptydir |
| O075 | El Pod es dueño del PVC de un volumen efímero genérico; el recolector lo borra con el Pod | https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#lifecycle-and-persistentvolumeclaim |
| O076 | Un ConfigMap montado con `subPath` no recibe actualizaciones | https://kubernetes.io/docs/concepts/configuration/configmap/#mounted-configmaps-are-updated-automatically |
| O077 | `storageClassName: ""` solo enlaza PVs sin clase y desactiva el aprovisionamiento dinámico | https://kubernetes.io/docs/concepts/storage/persistent-volumes/#class-1 |
| O078 | ReadWriteOnce permite varios Pods del mismo nodo; un solo Pod es ReadWriteOncePod | https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes |
| O079 | No se puede reducir un PVC por debajo de su capacidad actual | https://kubernetes.io/docs/concepts/storage/persistent-volumes/#recovering-from-failure-when-expanding-volumes |
| O080 | `persistentVolumeClaimRetentionPolicy.whenScaled: Delete` (estable desde v1.32) | https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#persistentvolumeclaim-retention |
| O081 | Restaurar un snapshot = PVC nuevo con `dataSource`; VolumeSnapshotContent es cluster-scoped | https://kubernetes.io/docs/concepts/storage/volume-snapshots/#provisioning-volumes-from-snapshots |
| O082 | Los claims deben estar en el mismo namespace que el Pod | https://kubernetes.io/docs/concepts/storage/persistent-volumes/#claims-as-volumes |
| O083 | Fuentes proyectables: secret, configMap, downwardAPI, serviceAccountToken (no PVC ni hostPath) | https://kubernetes.io/docs/concepts/storage/projected-volumes/#introduction |
| O084 | El plugin de nodo CSI se despliega como DaemonSet | https://kubernetes-csi.github.io/docs/deploying.html#node-plugin |
| O085 | Binding 1:1; el usuario recibe al menos lo que pidió, quizá más | https://kubernetes.io/docs/concepts/storage/persistent-volumes/#binding |
| O086 | Un PVC en uso queda en Terminating (finalizer `kubernetes.io/pvc-protection`) | https://kubernetes.io/docs/concepts/storage/persistent-volumes/#storage-object-in-use-protection |
| O087 | Los volúmenes secret usan tmpfs y nunca se escriben en disco | https://kubernetes.io/docs/concepts/storage/volumes/#secret |
| D036 | `maxSurge` redondea hacia arriba y `maxUnavailable` hacia abajo (25 % por defecto) | https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#max-surge |
| D037 | `ProgressDeadlineExceeded`: sin rollback automático; `rollout status` sale con error | https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#failed-deployment |
| D038 | Cada instalación de un chart crea un release con nombre propio | https://helm.sh/docs/intro/introduction#release |
| D039 | `helm upgrade --install` instala si el release no existe | https://helm.sh/docs/helm/helm_upgrade/ |
| D040 | `--set` tiene más precedencia que `--values`, que sobrescribe `values.yaml` | https://helm.sh/docs/intro/using_helm/#customizing-the-chart-before-installing |
| D041 | Install, upgrade y rollback incrementan la revisión | https://helm.sh/docs/intro/using_helm/#helm-upgrade-and-helm-rollback-upgrading-a-release-and-recovering-on-failure |
| D042 | Charts en registries OCI con `helm push oci://` | https://helm.sh/docs/topics/registries/#the-push-subcommand |
| D043 | `configMapGenerator`: sufijo hash del contenido; un cambio en el template dispara rollout | https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/#configmapgenerator |
| D044 | Argo CD: sync status (¿coincide con Git?) frente a health (¿funciona?) | https://argo-cd.readthedocs.io/en/stable/core_concepts/ |
| D045 | El sync automático no borra recursos (prune) por defecto | https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/#automatic-pruning |
| D046 | Flux: source-controller obtiene el chart, helm-controller lo instala | https://fluxcd.io/flux/components/helm/ |
| D047 | Argo CD recomienda operadores de secretos en el clúster destino | https://argo-cd.readthedocs.io/en/stable/operator-manual/secret-management/ |
| D048 | `kubectl debug --copy-to --container` reemplaza el comando del contenedor | https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/#copying-a-pod-while-changing-its-command |
| D049 | La copia no conserva los labels salvo con `--keep-labels` | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/ |
| D050 | Liveness fallida reinicia el contenedor; readiness fallida solo lo saca de los EndpointSlices | https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-a-liveness-command |
| D051 | Logs de un init container con `-c <nombre>` | https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/#accessing-logs-from-init-containers |
| D052 | `Init:N/M`: N de M init containers terminados, en secuencia | https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/#understanding-pod-status |
| D053 | `kubectl events --for pod/x --watch` | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/ |
| D054 | `--types=Warning` y el field selector `type` en Events | https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/#list-of-supported-fields |
| D055 | `terminationMessagePolicy: FallbackToLogsOnError` | https://kubernetes.io/docs/tasks/debug/debug-application/determine-reason-pod-failure/#customizing-the-termination-message |
| D056 | `kubectl cp` necesita `tar` en la imagen | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/ |
| D057 | Los logs son el subrecurso RBAC `pods/log` | https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources |
| D058 | Ephemeral containers: no se modifican ni quitan; sin ports ni sondas; no se reinician | https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/#what-is-an-ephemeral-container |
| D059 | `port-forward service/x` elige un solo Pod; la sesión termina si ese Pod muere | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/ |
| D060 | Comprobar que `targetPort` coincide con el puerto del contenedor | https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/#is-the-service-defined-correctly |
| D061 | Sidecar de streaming para logs escritos en archivo | https://kubernetes.io/docs/concepts/cluster-administration/logging/#streaming-sidecar-container |

## Cambios en los módulos

Para que las preguntas no pregunten nada que el alumno no haya visto:

- Módulo 03: `progressDeadlineSeconds` y la condición `ProgressDeadlineExceeded` (sin rollback automático).
- Módulo 08: volumen efímero genérico (el Pod es dueño del PVC) y la protección de PVCs en uso.

## Notas

- La página `pod-lifecycle` ahora remite a `/docs/concepts/workloads/pods/probes/` para el detalle de las sondas. Los anclajes `#liveness-probe` y `#readiness-probe` siguen existiendo, así que las fuentes antiguas no se rompen.
- La documentación de Helm ya corresponde a Helm 4 (4.3.1). Ninguna de las preguntas depende de la versión mayor.
