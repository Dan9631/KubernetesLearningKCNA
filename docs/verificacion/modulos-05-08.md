# Verificación de los módulos 05-08 (texto del curso)

Fecha: 2026-10-26 · Referencia: Kubernetes v1.37 · Archivos: `curso/05-seguridad.md`, `curso/06-networking-services.md`, `curso/07-service-mesh-microservicios.md`, `curso/08-storage.md`.

## Resumen

| Módulo | Elementos revisados* | Correctos | Corregidos | Ampliados / precisados | Preguntas tipo examen revisadas | Preguntas cambiadas |
|---|---|---|---|---|---|---|
| 05 Seguridad | 38 | 33 | 2 | 3 | 12 | 0 |
| 06 Networking | 36 | 30 | 3 | 3 | 11 | 0 |
| 07 Service mesh | 30 | 25 | 2 | 3 | 11 | 0 |
| 08 Storage | 34 | 32 | 1 | 1 | 11 | 0 |

\* Afirmaciones técnicas examinables: filas de tablas comparativas, definiciones, valores por defecto, estados/versiones, viñetas del "Resumen para repasar" y las preguntas tipo examen. Todas las preguntas tipo examen tienen una única respuesta defendible según la fuente; no hubo que tocar ninguna.

No se cambió ningún comando de laboratorio (no hubo que probar nada en el clúster). Se añadió a cada módulo la línea "Verificado" en los metadatos y la sección "## Fuentes oficiales" (15, 15, 15 y 10 enlaces, todos abiertos).

## Tabla de cambios

| Módulo / sección | Problema encontrado | Corrección | Fuente |
|---|---|---|---|
| 05 · Las 4C | Decía que "la documentación de Kubernetes propone" las 4C; esa página (Overview of Cloud Native Security) existió hasta la v1.28 y la actual se organiza por fases del ciclo de vida | Se presenta como modelo clásico (doc hasta v1.28) y se añade nota con las fases Develop / Distribute / Deploy / Runtime; viñeta del resumen ampliada | https://kubernetes.io/docs/concepts/security/cloud-native-security/ · https://github.com/kubernetes/website/blob/release-1.28/content/en/docs/concepts/security/overview.md |
| 05 · Autenticación | Decía que `--basic-auth-file` y `--token-auth-file` están "obsoletos o eliminados"; el archivo estático de tokens sigue soportado en v1.37 | Basic auth eliminado en v1.19; static token file existe pero no se recomienda (tokens indefinidos, cambiar exige reiniciar) | https://kubernetes.io/docs/reference/access-authn-authz/authentication/ · https://github.com/kubernetes/kubernetes/pull/89069 |
| 05 · Pod Security Admission | "PSA evalúa pods" sin matiz | `enforce` solo pods; `warn` y `audit` también evalúan workloads (explica el aviso al crear el Deployment) | https://kubernetes.io/docs/concepts/security/pod-security-admission/ |
| 05 · Admission controllers | ValidatingAdmissionPolicy sin estado | Añadido "estable desde v1.30" | https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/ |
| 06 · kube-proxy (tabla) | iptables "por defecto durante años" (sigue siéndolo en v1.37); IPVS "obsoleto en versiones recientes" sin versión | iptables defecto en v1.37 (futuro cambio a nftables); IPVS obsoleto desde v1.35, desactivado por defecto en v1.40 y eliminado en v1.43; nftables GA v1.33 y requiere kernel 5.13+; añadida fila `kernelspace` (Windows); resumen actualizado | https://kubernetes.io/docs/reference/networking/virtual-ips/ · https://kubernetes.io/blog/2025/04/23/kubernetes-v1-33-release/ |
| 06 · Gateway API | "Las referencias entre namespaces se autorizan con ReferenceGrant" (el enganche ruta → Gateway de otro namespace se controla con `allowedRoutes`, como en el propio lab) | Separados ambos mecanismos: `allowedRoutes` en el listener; ReferenceGrant para apuntar a Services/Secrets de otro namespace | https://gateway-api.sigs.k8s.io/reference/api-types/referencegrant/ |
| 06 · CNI | Operaciones listadas sin STATUS/GC | Añadido que la spec 1.1 incluye STATUS y GC | https://github.com/containernetworking/cni/blob/main/SPEC.md |
| 06 · Tabla de CNIs | kindnet: NetworkPolicy "en versiones recientes" | "desde kind v0.24 (vía kube-network-policies)" | https://github.com/kubernetes-sigs/kind/releases/tag/v0.24.0 |
| 07 · GAMMA | "Istio, Linkerd, Cilium y Kuma lo implementan": la lista oficial de conformidad Mesh solo muestra Istio y Cilium; Kuma no se puede respaldar con fuente aceptada | Istio y Cilium como conformes Mesh; Linkerd usa HTTPRoutes con `parentRefs` a Service; añadido "Standard desde Gateway API v1.1" | https://gateway-api.sigs.k8s.io/docs/implementations/list/ · https://gateway-api.sigs.k8s.io/docs/mesh/gamma/ · https://linkerd.io/2-edge/reference/httproute/ |
| 07 · SMI | "Se archivó en 2023" | Precisado: archivado por la CNCF en octubre de 2023, recomendando GAMMA | https://www.cncf.io/blog/2023/10/03/cncf-archives-the-service-mesh-interface-smi-project/ |
| 07 · Istio ambient | "GA desde Istio 1.24" sin el contexto de la beta (aviso del coordinador: "production-ready desde 1.22") | Comprobado: 1.22 = Beta ("ready for production workloads" con cautela), 1.24 = GA/estable. Texto: "beta en 1.22 ... GA/estable desde 1.24" | https://istio.io/latest/news/releases/1.22.x/announcing-1.22/ · https://istio.io/latest/blog/2024/ambient-reaches-ga/ |
| 07 · Istio ambient | Waypoint "por namespace o por servicio"; label solo en namespace | Waypoint también por workload; la label `istio.io/dataplane-mode=ambient` también vale en un pod | https://istio.io/latest/docs/ambient/usage/waypoint/ · https://istio.io/latest/docs/ambient/usage/add-workloads/ |
| 08 · StorageClass | VolumeAttributesClass "GA en versiones recientes" | "GA desde v1.34"; solo CSI con `ModifyVolume` | https://kubernetes.io/docs/concepts/storage/volume-attributes-classes/ |
| 08 · Reclaim policies | Recycle descrito en pasado, sin detalle | `rm -rf /thevolume/*`; obsoleto; en v1.37 solo `nfs` y `hostPath` | https://kubernetes.io/docs/concepts/storage/persistent-volumes/ |

## Verificado como correcto (selección)

- 05: Kubernetes no tiene objetos User; CN = usuario, O = grupos; evaluación de autorizadores en secuencia y 403; RBAC aditivo, ClusterRole + RoleBinding limitado al namespace; `view` sin Secrets, `edit` sin RBAC; token proyectado de 1 h por defecto; Secrets de token ya no automáticos; mutación antes de validación; plugins por defecto en v1.37 (incluye PodSecurity, LimitRanger, ServiceAccount; NodeRestriction no); perfiles PSS y modos PSA; PSA estable desde v1.25; NetworkPolicy aditiva y dependiente del plugin; Secrets sin cifrar en etcd por defecto, `--encryption-provider-config`.
- 06: modelo de red (IP por pod, sin NAT, agentes del nodo); IPs de Services las asigna el API server; NodePort 30000-32767; ExternalName = CNAME; Endpoints obsoleto desde v1.33; 100 endpoints por EndpointSlice; formato DNS y `ndots:5`; CoreDNS GA en 1.11 y defecto en 1.13; Ingress congelado y necesita controller; retiro de ingress-nginx en marzo de 2026; Gateway API GA en octubre de 2023; CoreDNS y Cilium graduados.
- 07: sidecars nativos estables en v1.33 (init + `restartPolicy: Always`, paran después de la app, no bloquean Jobs); Envoy en C++ creado en Lyft, graduado; xDS (LDS/RDS/CDS/EDS/SDS); istiod unifica Pilot/Galley/Citadel/inyector; inyección por mutating webhook con `istio-injection=enabled`; ztunnel en Rust; Linkerd con linkerd2-proxy en Rust y mTLS por defecto; Istio y Linkerd graduados.
- 08: access modes (RWO por nodo, RWOP estable v1.29 y solo CSI); Retain por defecto en PVs manuales y Delete en dinámicos; fases Available/Bound/Released/Failed; expansión solo crecer con `allowVolumeExpansion`; `storageClassName: ""`; snapshots solo CSI y CRDs a cargo de la distribución; `volumeClaimTemplates` y PVCs conservados; CSI GA en 1.13 y adoptado por Kubernetes, Mesos, Nomad y Cloud Foundry.

## Dudas sin resolver con fuente oficial

- 07 · Tabla "Linkerd y otros" y pregunta 10: que **Consul** y **Kuma** usan Envoy como data plane no se puede respaldar con un dominio aceptado por el validador (sus docs están en developer.hashicorp.com y kuma.io). Es correcto según sus proyectos, pero el validador no los admite; se deja el texto.
- 07 · "Linkerd, el primer service mesh": solo lo afirma el propio linkerd.io (glosario); ni linkerd.io/overview ni cncf.io lo dicen. Se deja entre comillas como está.
- 07 · "Hoy Istio entiende Gateway API como forma recomendada de configurar el tráfico" y el requisito de 2 GiB de istiod: no se buscó en istio.io (no examinable); sin cambios.
- 06 · "Weave Net: el proyecto ya no se mantiene": no hay fuente oficial aceptada (era de Weaveworks); sin cambios.
- 08 · VolumeAttributesClass: la página de kubernetes.io dice "GA as of 1.34" en el texto, pero el banner de estado pone "stable since v1.36" (seguramente cuando se bloqueó el feature gate). El módulo dice GA desde v1.34 (coincide con el blog de v1.34).
- Dominios útiles que el validador no acepta: developer.hashicorp.com, kuma.io (ninguno se usó).
