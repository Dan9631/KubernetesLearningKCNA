# Registro de verificación del contenido

**Fecha:** 2026-10-26 · **Referencia:** Kubernetes v1.37, temario KCNA de la CNCF (noviembre de 2025) · **Método:** [docs/VERIFICACION-GUIA.md](VERIFICACION-GUIA.md)

Todo el contenido del curso se contrastó con documentación oficial (kubernetes.io, cncf.io y la documentación de cada proyecto), abriendo la fuente para cada dato en lugar de fiarse de la memoria. Cada pregunta y cada flashcard enlaza ahora la página que respalda su respuesta, y cada módulo termina con una sección **Fuentes oficiales**. El validador (`node quiz/src/validate.js --strict`) rechaza preguntas sin fuente o con fuentes no oficiales, y el flujo de publicación en GitHub lo ejecuta antes de desplegar.

## Resumen

| Contenido | Revisado | Correcto | Corregido | Reescrito | Añadido | Total ahora |
|---|---|---|---|---|---|---|
| Preguntas · Fundamentals | 95 | 73 | 20 | 2 | 6 | 101 |
| Preguntas · Orchestration | 62 | 52 | 10 | 0 | 11 | 73 |
| Preguntas · Delivery + Architecture | 63 | 54 | 9 | 0 | 15 | 78 |
| **Preguntas (total)** | **220** | **179** | **39** | **2** | **32** | **252** |
| Flashcards | 150 | 135 | 15 | 0 | 15 | 165 |
| Módulos 00-04 | 5 módulos | — | 12 | — | 9 precisiones | — |
| Módulos 05-08 | 4 módulos | — | 8 | — | 9 precisiones | — |
| Módulos 09-13 | 5 módulos | — | 17 | — | 25 precisiones | — |

Ninguna pregunta tipo examen dentro de los módulos tenía dos respuestas defendibles; solo se precisaron algunas explicaciones. No se cambió ningún comando de laboratorio (los labs ya estaban probados en el clúster).

Las preguntas nuevas cubren los huecos que mostró el [mapa de cobertura](../web/src/pages/cobertura.astro): el módulo 07 (service mesh) pasó de 2 a 10 preguntas; *Cloud Native Community and Collaboration* de 8 a 15; *Cloud Native Ecosystem and Principles* de 9 a 14; Observability de 11 a 14; Troubleshooting de 12 a 15.

## Correcciones más relevantes

Datos que estaban mal o desactualizados y que el examen puede preguntar:

| Tema | Lo que decía | Lo correcto (fuente) |
|---|---|---|
| kube-proxy | IPVS como un modo más | IPVS **obsoleto desde v1.35**; `iptables` sigue siendo el modo por defecto; nftables estable desde v1.33; en Windows el modo es `kernelspace` ([virtual-ips](https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-modes)) |
| Definición de cloud native | Versión 1.0 de la CNCF | **v1.1 (2024)**, que añade seguridad, sostenibilidad, multi-tenancy y serverless ([cncf/toc](https://github.com/cncf/toc/blob/main/DEFINITION.md)) |
| OpenTelemetry | Incubating | **Graduated desde mayo de 2026**; señales estables: trazas, métricas y logs (perfiles en desarrollo) ([cncf.io](https://www.cncf.io/projects/opentelemetry/)) |
| CRI-O | Incubating | **Graduated desde 2023** ([cncf.io](https://www.cncf.io/projects/cri-o/)) |
| Tekton | Proyecto de la CD Foundation | **Incubating en la CNCF desde marzo de 2026** ([cncf.io](https://www.cncf.io/projects/tekton/)) |
| Sidecars nativos | "Existen desde 1.33" | Alpha en 1.28, **beta y activos por defecto desde 1.29**, GA en 1.33 ([sidecar containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)) |
| Init container que falla | "Se reintenta según restartPolicy del Pod" | El kubelet reinicia **ese init container** hasta que tenga éxito; solo con `restartPolicy: Never` el Pod falla ([init containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)) |
| Quórum de etcd | Fórmula incorrecta | ⌊n/2⌋+1 ([etcd](https://etcd.io/docs/)) |
| Static pods | `/etc/kubernetes/manifests` es el valor por defecto del kubelet | Es la convención de kubeadm; el kubelet usa `staticPodPath` ([static pods](https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/)) |
| Gateway API | ReferenceGrant para colgar rutas de un Gateway de otro namespace | Eso lo controla `allowedRoutes` del listener; ReferenceGrant es para referenciar Services o Secrets de otro namespace ([gateway-api](https://gateway-api.sigs.k8s.io/api-types/referencegrant/)) |
| SMI | Estándar vigente | **Archivado en 2023** en favor de GAMMA (Gateway API para mesh) |
| `kubectl debug node/` | Crea un pod privilegiado | No es privilegiado por defecto; hace falta `--profile=sysadmin` ([debug running pod](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)) |
| HPA a cero réplicas | "Años en alpha" | `HPAScaleToZero` es **beta y activo por defecto** en v1.37, solo con métricas Object/External |
| CreateContainerConfigError | También por volúmenes | Típicamente por una variable de entorno que apunta a un ConfigMap/Secret o clave inexistente |
| Autenticación | `--token-auth-file` eliminado | Basic auth se eliminó en v1.19; el archivo de tokens estáticos **sigue existiendo** (no recomendado) |
| Examen | Solo en inglés; "retake gratis" | También en japonés y chino simplificado; la compra incluye **dos intentos**. El número de preguntas (60) y el 75% vienen de las instrucciones de la Linux Foundation, no de la página del KCNA ([LF](https://training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/)) |

El detalle completo, con cada cambio y su fuente, está en [docs/verificacion/](verificacion/).

## Dudas abiertas

Puntos que no se pudieron cerrar con una fuente oficial, o donde la propia documentación oficial se contradice. El curso los trata con prudencia (evita afirmar la cifra exacta o explica las dos versiones):

- **Modelo de las 4C** (Cloud, Cluster, Container, Code): la documentación actual en inglés de kubernetes.io ya no lo recoge (se organiza por fases: Develop, Distribute, Deploy, Runtime); existió hasta la v1.28. Se mantiene como modelo clásico, con esa nota, porque sigue siendo terminología muy extendida.
- **Contradicciones dentro de kubernetes.io**:
  - DRA: GA en v1.34 según el blog oficial; "stable since v1.35" según la página de conceptos.
  - VolumeAttributesClass: GA en v1.34 según el blog; el banner de la página dice v1.36.
  - Perfil por defecto de `kubectl debug`: `legacy` en la guía, `general` en la referencia de v1.37.
  - Soporte de cada versión menor: "aproximadamente 1 año" en /releases y unos 14 meses (12 + 2) en la política de parches.
  - VPA in-place: la página de autoscaling dice que no lo soporta en 1.37; la de VPA documenta `InPlaceOrRecreate`.
- **Terminología sin fuente oficial actual**: los patrones *Ambassador* y *Adapter* (kubernetes.io solo describe hoy el sidecar); "Kata Containers usa micro-VMs" y "Consul y Kuma usan Envoy" (sus sitios no están en la lista de fuentes aceptadas).
- **Exit code 137 = 128 + 9**: kubernetes.io muestra el ejemplo 137/OOMKilled pero no documenta la convención 128 + señal.

## Cómo mantenerlo

- Al cambiar contenido, sigue [VERIFICACION-GUIA.md](VERIFICACION-GUIA.md): fuente oficial abierta para cada dato, preguntas nuevas al final, y `node quiz/src/build.js` + `node quiz/src/validate.js --strict`.
- Revisa cada vez que salga una versión menor de Kubernetes (3 al año) los datos que dependen de la versión: estado GA/beta, valores por defecto y la lista de proyectos graduados de la CNCF.
- El [mapa de cobertura](https://dan9631.github.io/KubernetesLearningKCNA/cobertura) del sitio muestra en cada build cuántas preguntas tienen fuente y qué competencias quedan cortas.
