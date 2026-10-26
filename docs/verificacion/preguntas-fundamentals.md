# Verificación: banco de preguntas Kubernetes Fundamentals (`quiz/src/src_f.js`)

> **Verificado:** 2026-10-26 contra la documentación oficial (Kubernetes v1.37). Cada pregunta lleva su `source`.

## Resumen

| Concepto | Cantidad |
|---|---|
| Preguntas revisadas (F001-F095) | 95 |
| Correctas (solo se añadió `source` y, como mucho, un retoque de redacción) | 73 |
| Corregidas (explicación u opción con error o dato impreciso) | 20 |
| Reescritas (enunciado reformulado para que tenga una única respuesta defendible) | 2 |
| Añadidas al final (F096-F101) | 6 |

Todas las preguntas F001-F101 tienen fuente oficial (`node quiz/src/validate.js` → `VALIDATION OK`).

## Tabla de cambios

| id | Problema encontrado | Corrección | Fuente |
|---|---|---|---|
| F002 | El enunciado afirmaba de forma absoluta que el API server es "el único que se comunica" con etcd; la documentación dice que *idealmente* solo el API server debe tener acceso | Enunciado reformulado ("the only one that should access etcd directly") y explicación ajustada | https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/#securing-etcd-clusters |
| F005 | Presentaba IPVS como un modo más; en v1.37 el modo `ipvs` está obsoleto (desde v1.35) y el predeterminado es `iptables`. Además citaba a Cilium sin fuente | Explicación actualizada (iptables por defecto, nftables, IPVS obsoleto) y "algunos plugins de red" en lugar de una marca | https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-modes |
| F012 | "Normalmente se combina con un Service headless": la documentación dice que el StatefulSet *requiere* un Service headless | Explicación corregida | https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/ |
| F015 | Explicación incompleta sobre formas de consumir Secrets | Añadido el uso para descargar imágenes; precisado que se guardan sin cifrar | https://kubernetes.io/docs/concepts/configuration/secret/ |
| F016 | No indicaba que kube-proxy es opcional | Explicación precisada | https://kubernetes.io/docs/concepts/architecture/#node-components |
| F018 | Decía que el controlador registra solo los Pods Ready; registra los Pods que coinciden con el selector y la condición de listo decide si reciben tráfico | Explicación corregida | https://kubernetes.io/docs/concepts/services-networking/service/#defining-a-service |
| F021 | "Si uno falla, el Pod se reintenta según su restartPolicy" es inexacto: el kubelet reinicia el init container hasta que tenga éxito, salvo con `restartPolicy: Never`, que marca el Pod como fallido | Explicación corregida | https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#understanding-init-containers |
| F028 | Faltaba el matiz de que por presión de recursos solo se desalojan Pods que superan sus requests | Explicación precisada | https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/#quality-of-service-classes |
| F029 | Afirmaba que el kernel "lo mata" siempre y citaba el código 137 sin fuente; la doc dice que el límite de memoria se aplica de forma reactiva con OOM kills | Explicación corregida ("puede ser terminado") y retirado el dato no verificado | https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#how-pods-with-resource-limits-are-run |
| F031 | "extensions/v1beta1 fue eliminado hace años": vago | Precisado: dejó de servirse para Deployments en v1.16 | https://kubernetes.io/docs/reference/using-api/deprecation-guide/#v1-16 |
| F033 | "mirror Pod de solo lectura": la doc dice que el mirror Pod no sirve para controlar el static Pod (borrarlo no lo detiene) | Explicación ajustada; añadido staticPodPath | https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/ |
| F037 | Fórmula del quórum "n/2 + 1" incorrecta para n impar | Cambiada a ⌊n/2⌋ + 1 y añadida la razón del número impar | https://etcd.io/docs/v3.6/faq/#what-is-failure-tolerance |
| F049 | Ejemplo de versiones desfasado (1.33 → 1.35) | Actualizado a 1.35 → 1.36 → 1.37; precisado el orden (control plane y luego workers) | https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/ |
| F050 | Afirmaba "desde Kubernetes 1.28" sin respaldo en la página de la política | Eliminado el dato; añadido ejemplo con v1.37 | https://kubernetes.io/releases/version-skew-policy/#kubelet |
| F055 | "La opción --export fue eliminada": no se pudo verificar la versión exacta | Reformulado: `kubectl get` ya no tiene la opción `--export` (verificado en la referencia actual) | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/ |
| F059 | "Las alpha suelen estar deshabilitadas": en realidad están deshabilitadas por defecto; las beta nuevas también | Explicación corregida | https://kubernetes.io/docs/reference/using-api/#api-versioning |
| F074 | "No protege contra fallos involuntarios": incompleto, las disrupciones involuntarias cuentan contra el presupuesto | Explicación precisada | https://kubernetes.io/docs/concepts/workloads/pods/disruptions/#pod-disruption-budgets |
| F076 | El enunciado decía "generally available since v1.34", pero la página de DRA de v1.37 muestra "Stable since v1.35" (el blog oficial anuncia el GA en v1.34): dato ambiguo en el enunciado | Enunciado reformulado sin versión ("Which stable Kubernetes feature..."); la explicación cita el GA de la API resource.k8s.io/v1 en v1.34 según el blog | https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/ , https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/ |
| F081 | "runc es la implementación de referencia de la OCI Runtime Spec": las fuentes oficiales consultadas no usan ese término | Reformulado: CLI que crea y ejecuta contenedores según la especificación OCI, donada por Docker a la OCI | https://github.com/opencontainers/runc , https://opencontainers.org/about/overview/ |
| F083 | Explicación genérica | Precisada con lo que dice la FAQ: las imágenes de `docker build` funcionan con todas las implementaciones de CRI | https://kubernetes.io/blog/2022/02/17/dockershim-faq/#will-my-existing-container-images-still-work |
| F091 | gVisor/Kata no aparecen en la página de RuntimeClass | Añadida fuente del blog oficial que los cita como runtimes alternativos | https://kubernetes.io/blog/2018/10/10/kubernetes-v1.12-introducing-runtimeclass/ |
| F093 | La explicación usaba la definición v1.0 de la CNCF; la vigente es la v1.1 (2024), que añade multi-tenancy y serverless | Explicación actualizada a la v1.1 (la respuesta sigue siendo la misma) | https://github.com/cncf/toc/blob/main/DEFINITION.md |
| F096 (nueva) | Containerization: faltaba la OCI Distribution Spec | Pregunta nueva | https://github.com/opencontainers/distribution-spec |
| F097 (nueva) | Containerization: registry y etiqueta por defecto de una imagen | Pregunta nueva | https://kubernetes.io/docs/concepts/containers/images/#image-names |
| F098 (nueva) | Containerization: requisito de CRI v1 desde v1.26 | Pregunta nueva | https://kubernetes.io/docs/concepts/architecture/cri/#api |
| F099 (nueva) | Administration: política de deprecación de APIs GA/beta/alpha | Pregunta nueva | https://kubernetes.io/docs/reference/using-api/deprecation-policy/#deprecating-parts-of-the-api |
| F100 (nueva) | Administration: fusión de archivos con KUBECONFIG | Pregunta nueva | https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/#merging-kubeconfig-files |
| F101 (nueva) | Administration: version skew de kubectl (±1 versión menor) | Pregunta nueva | https://kubernetes.io/releases/version-skew-policy/#kubectl |

Además, en las 73 preguntas correctas se añadió el `source` y en algunas se retocó la explicación para ajustarla a la redacción de la fuente (F003, F007, F020, F022, F024, F025, F036, F039, F042, F045, F046, F052, F054, F056, F057, F058, F060, F061, F063, F064, F066, F070, F071, F072, F075, F078, F079, F085, F086, F087, F088, F089, F090, F092, F094), sin cambiar la respuesta.

## Dudas sin resolver con fuente oficial aceptada

1. **F084 (multi-stage build):** ninguna fuente aceptada por el validador dice de forma explícita que un build multi-stage produce una imagen final más pequeña. Se cita `podman-build` (documenta etapas, `COPY --from` y `--target`). La fuente ideal es la documentación oficial de Docker (`docs.docker.com/build/building/multi-stage/`), pero `docs.docker.com` no está en la lista `OFFICIAL` de `validate.js`. Lo mismo para F087 ("RUN se ejecuta en la construcción"): la referencia del Dockerfile está en docs.docker.com. Propuesta: añadir `docs.docker.com` a la lista de dominios aceptados.
2. **F092 (buenas prácticas):** la fuente respalda "no-root" (`runAsNonRoot`) y "configuración y estado fuera de la imagen" (12factor), pero no encontré en las fuentes aceptadas una frase explícita sobre "imagen base mínima" ni "un proceso por contenedor". La respuesta sigue siendo la única defendible frente a los distractores.
3. **F076 (DRA):** la documentación de v1.37 muestra "Stable since Kubernetes v1.35" (estado del feature gate), mientras que el blog oficial de v1.34 anuncia el GA. Por eso se quitó la versión del enunciado. Además, la búsqueda mostró una página nueva en `/docs/concepts/resource-management/dynamic-resource-allocation/`; la URL citada sigue funcionando, pero conviene revisarla si se mueve.
4. **F078:** la página oficial dice que los contenedores comparten "el sistema operativo" con el host; la opción dice "host kernel". Es la formulación habitual y técnicamente correcta, pero la página no usa la palabra kernel.
5. **F028:** el desalojo real por presión del nodo ordena por uso por encima de los requests, prioridad y consumo (página node-pressure eviction); la pregunta usa la simplificación por QoS de la página pod-qos ("generally"), que es la que sigue el temario.
6. **F044:** la referencia de `kubectl api-resources` no muestra las columnas de salida (NAME, SHORTNAMES, APIVERSION, NAMESPACED, KIND); se dan por buenas porque son la salida estándar del comando.

## Nota para el mantenimiento

Añadir 6 preguntas al final de `src_f.js` desplaza la secuencia aleatoria con semilla de `build.js`, así que cambia el orden de las opciones de las preguntas O/D/A generadas después (los ids no cambian). Si el progreso de los alumnos guarda índices de opción y no solo ids, conviene tenerlo en cuenta.
