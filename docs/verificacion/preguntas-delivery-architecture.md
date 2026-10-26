# Verificación: preguntas de Application Delivery y Cloud Native Architecture

Fecha: 2026-10-26. Archivos: `quiz/src/src_d.js` (D001-D035) y `quiz/src/src_a.js` (A001-A043). Referencia: Kubernetes v1.37, temario KCNA vigente desde nov-2025.

## Resumen

| | src_d.js | src_a.js | Total |
|---|---|---|---|
| Revisadas | 35 | 28 | 63 |
| Correctas (solo se añadió `source`, a veces con algún matiz menor en la explicación) | 28 | 26 | 54 |
| Corregidas (había un dato erróneo, desactualizado o sin respaldo) | 7 | 2 | 9 |
| Reescritas / sustituidas | 0 | 0 | 0 |
| Añadidas (al final de src_a.js) | 0 | 15 | 15 |

Las 78 preguntas (63 revisadas + 15 nuevas) tienen `source` y `node quiz/src/validate.js` termina en `VALIDATION OK`. Se comprobó que los anclajes (`#strategy`, `#container-restarts`, `#node-shell-session`, etc.) existen en las páginas citadas.

Preguntas añadidas:
- Cloud Native Community and Collaboration (+7, módulo 10): A029 Working Groups, A030 Steering Committee, A031 Release Team, A032 Code of Conduct Committee, A033 requisitos de graduación en la CNCF (Choose 2), A034 qué significa Sandbox, A035 KubeCon + CloudNativeCon. Se pidieron 6; se añadió una más para cubrir a la vez el Release Team y KubeCon.
- Cloud Native Ecosystem and Principles (+5, módulo 10): A036 especificaciones de la OCI, A037 CRI/gRPC, A038 de SMI a GAMMA, A039 CloudEvents, A040 definición cloud native de la CNCF (Choose 2).
- Observability (+3, módulo 11): A041 OpenTelemetry Collector, A042 span/trace, A043 cálculo del error budget.

Recuento por tema después del cambio: Observability 14, Ecosystem and Principles 14, Community and Collaboration 15.

## Tabla de cambios

| id | Problema encontrado | Corrección | Fuente |
|---|---|---|---|
| D005 | No se aclaraba que self-heal es opcional (en Argo CD está desactivado por defecto) | Se añade el matiz a la explicación | https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/ |
| D006 | La explicación decía que Jenkins y Spinnaker pertenecen a la CD Foundation, algo que no se puede respaldar con una fuente que acepte el validador | Se cambia por "no son proyectos de la CNCF" y se añaden las fechas de graduación (Flux nov-2022, Argo dic-2022) | https://www.cncf.io/projects/argo/ , https://www.cncf.io/projects/flux/ |
| D021 | Presentaba Tekton como "de la CD Foundation"; desde el 13-mar-2026 es un proyecto **incubating de la CNCF** | Explicación actualizada | https://www.cncf.io/projects/tekton/ , https://www.cncf.io/blog/2026/03/24/tekton-becomes-a-cncf-incubating-project/ |
| D024 | Decía que, sin `-c`, kubectl "pide que se especifique uno", un comportamiento antiguo | Ahora: usa el contenedor por defecto (anotación `kubectl.kubernetes.io/default-container`), y `--all-containers` muestra todos | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/ , https://kubernetes.io/docs/reference/labels-annotations-taints/#kubectl-kubernetes-io-default-container |
| D027 | Decía "hasta 5 minutos" como valor fijo; desde v1.35 el máximo es configurable por nodo (`KubeletCrashLoopBackOffMax`, beta) | Ahora: 10 s, 20 s, 40 s... hasta 5 min por defecto, configurable por nodo | https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-restarts |
| D033 | Decía que `kubectl events` "los muestra ordenados", algo que la referencia no dice; además, "alrededor de una hora" era impreciso | Se elimina lo de la ordenación; la retención es de 1 h por defecto (`--event-ttl=1h0m0s`) | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/ , https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/ |
| D035 | Solo mencionaba el selector para ver varios Pods | Se añade `--all-pods=true`, documentado en la referencia | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/ |
| A001 | Decía que "OpenTelemetry añade también perfiles"; según opentelemetry.io, las señales soportadas son trazas, métricas, logs y baggage, y los perfiles siguen **en desarrollo** | Explicación corregida | https://opentelemetry.io/docs/concepts/signals/ |
| A008 | Decía que el SLA es "normalmente menos estricto que el SLO", algo que el libro de SRE no afirma así (solo recomienda SLOs internos más estrictos que lo anunciado) | Ahora: el SLA es el contrato con consecuencias si no se cumplen los SLOs que incluye; error budget = 100% − SLO | https://sre.google/sre-book/service-level-objectives/ , https://sre.google/sre-book/embracing-risk/ |

Matices añadidos sin que hubiera error (las preguntas cuentan como correctas): D010 (permisos evaluados con el kubeconfig), D011 (kubectl integra Kustomize desde la 1.14), D020 (Flagger "parte de la familia Flux"), D022 (mención al digest), D026 (`--target` depende del runtime), D028 (namespaces de host IPC/red/PID), D029 (EndpointSlice), A005 (summary no agregable entre instancias), A007 (OpenTelemetry **graduado el 11-may-2026**), A009, A010 (OpenCost incubating desde oct-2024), A013 (Karpenter, SIG Autoscaling), A014 (el VPA es un add-on; la limitación con el HPA es oficial), A015 (KEDA graduado en 2023, más de 70 scalers), A016 (Knative **graduado el 11-sep-2025**), A019 (requisitos de graduación, nivel Archived), A020 ("unas" tres releases al año), A021 (los KEPs los patrocina una SIG).

Datos cambiantes comprobados hoy:
- Niveles de madurez (cncf.io/projects): Argo, Flux, Helm, Prometheus, KEDA, Knative (sep-2025), OpenTelemetry (may-2026), CloudEvents (ene-2024), Kubernetes, etcd, CoreDNS, Harbor, Rook, Cilium, Envoy, Jaeger, Fluentd, containerd, CRI-O, Istio y Linkerd son graduados. OpenCost, Thanos, Litmus, Longhorn, Contour, Backstage, Notary Project y Tekton (mar-2026) son incubating. SMI está archivado (sep-2023).
- Releases (kubernetes.io/releases): ramas mantenidas 1.37, 1.36 y 1.35 (1.34 llega a EOL el 2026-10-27). Hay unas 3 releases al año, con ciclos de unas 15 semanas (KEP de abril de 2021). Cada rama recibe parches unos 14 meses: 12 de periodo estándar y 2 de mantenimiento.
- TAGs actuales (github.com/cncf/toc): Developer Experience, Infrastructure, Operational Resilience, Security and Compliance y Workloads Foundation. Los TAGs anteriores están archivados. El TOC tiene 11 miembros con voto.
- Gobierno de Kubernetes (kubernetes/community): hay 24 SIGs, 10 WGs y 3 comités (Code of Conduct, Security Response, Steering). El Steering Committee tiene 7 miembros. Los WGs son temporales y no poseen código.

## Dudas sin resolver con fuente oficial

1. **Soporte de parches**: https://kubernetes.io/releases/ dice "approximately 1 year of patch support", mientras que https://kubernetes.io/releases/patch-releases/ habla de "roughly fourteen (14) months" (12 + 2 de mantenimiento). A028 usa los 14 meses de patch-releases; una pregunta que diga "1 año" también tendría respaldo oficial. Conviene no preguntar la cifra exacta.
2. **Número de ramas mantenidas**: la política es "las tres más recientes", pero en la fecha de esta verificación la página aún lista 1.34 con parches (EOL 2026-10-27). A028 pregunta por la política, así que sigue siendo correcta.
3. **CD Foundation**: no se pudo citar que Jenkins y Spinnaker (D006) pertenezcan a la CD Foundation, ni que Tekton viniera de ella, porque cd.foundation no está en `OFFICIAL` y las páginas de la CNCF no lo mencionan. Se quitó esa afirmación en lugar de dejarla sin fuente. Si se quiere mantener, habría que añadir `cd.foundation` al validador.
4. **kubernetes-csi.github.io**: es la documentación oficial de CSI, pero el validador no la acepta. Para A018 se usó https://kubernetes.io/docs/concepts/storage/volumes/#csi. Lo mismo pasa con tekton.dev y backstage.io, que no se usaron.
5. **Temas de "Community" ajenos al gobierno** (SRE A026 y platform engineering A027): las fuentes (sre.google y el whitepaper de plataformas de tag-app-delivery.cncf.io; TAG App Delivery figura entre los TAGs archivados) respaldan el contenido. Queda la duda de si el temario los coloca en este dominio.
