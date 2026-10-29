# Curso personal KCNA — Kubernetes and Cloud Native Associate

Curso práctico en español para preparar la certificación **KCNA**, construido sobre el temario oficial de la CNCF (vigente desde noviembre de 2025) y siguiendo el orden del curso de KodeKloud, con un clúster local de Kubernetes sobre **Podman** para practicar cada concepto.

## Empieza aquí

> **¿Equipo nuevo?** Sigue [INSTALL.md](INSTALL.md): trae un prompt para pegar en un agente de código (Claude Code, Copilot, Cursor) que instala y verifica todo, o los pasos a mano (`.\kcna.ps1 setup`).

```powershell
cd $HOME\KubernetesLearning
.\kcna.ps1 up          # enciende el clúster (kind, 3 nodos, sobre Podman)
. .\kcna-env.ps1       # prepara la terminal: kubectl apunta SOLO al laboratorio
k get nodes
```

Luego abre [curso/00-preparacion-entorno.md](curso/00-preparacion-entorno.md), o mejor, el **sitio interactivo**:

```powershell
.\kcna.ps1 site dev    # http://localhost:4321 — simulaciones, práctica, terminal simulada
```

El sitio (carpeta [web/](web/README.md)) renderiza estos mismos módulos con simulaciones interactivas por tema, un simulacro de examen y un simulador de `kubectl`. Es estático: se publica en GitHub Pages, en cualquier hosting o dentro de tu propio clúster con `.\kcna.ps1 site` (http://localhost:8080/curso).

> Los ejercicios corren en un clúster aislado (`.kube\kcna-config`). Tu `~/.kube/config` con los clústeres de la empresa no se usa ni se modifica.

## El examen en 30 segundos

| | |
|---|---|
| Formato | Opción múltiple, online con supervisión (PSI). 60 preguntas según las instrucciones de la Linux Foundation |
| Duración / aprobado | 90 minutos / 75% |
| Idioma | Inglés (también existe en japonés y chino simplificado). El curso practica en inglés |
| Tipo | Teórico (no hay terminal), por eso cada módulo combina teoría + práctica + preguntas |

| Dominio oficial | Peso | Competencias | Módulos |
|---|---|---|---|
| Kubernetes Fundamentals | **44%** | Core Concepts, Administration, Scheduling, Containerization | 01, 02, 03, 04 |
| Container Orchestration | **28%** | Networking, Security, Troubleshooting, Storage | 05, 06, 07, 08, 09 |
| Cloud Native Application Delivery | **16%** | Application Delivery, Debugging | 09, 12 |
| Cloud Native Architecture | **12%** | Observability, Ecosystem and Principles, Community and Collaboration | 07, 10, 11 |

Detalles, plan de estudio de 6 semanas y glosario: [curso/13-estrategia-examen.md](curso/13-estrategia-examen.md).

## Ruta del curso

| # | Módulo | Secciones de KodeKloud equivalentes | Lab |
|---|---|---|---|
| 00 | [Tu laboratorio con Podman](curso/00-preparacion-entorno.md) | — | Encender el clúster, herramientas visuales |
| 01 | [Contenedores y cloud native](curso/01-contenedores-y-cloud-native.md) | Kubernetes Fundamentals (containers, Docker, CRI) | Podman: build, run, capas; tu imagen en el clúster |
| 02 | [Arquitectura de Kubernetes](curso/02-arquitectura-kubernetes.md) | Kubernetes Architecture, Runtime CRI, KubeConfig, API Groups | Explorar control plane, static pods, crictl |
| 03 | [Workloads: Pods, Deployments y más](curso/03-workloads-pods-deployments.md) | Kubernetes Resources | Rolling updates, rollbacks, ConfigMaps, Secrets |
| 04 | [Scheduling](curso/04-scheduling.md) | Scheduling | Taints, affinity, recursos, DaemonSets |
| 05 | [Seguridad](curso/05-seguridad.md) | Container Orchestration – Security | RBAC, ServiceAccounts, securityContext, PSA, NetworkPolicy |
| 06 | [Networking y Services](curso/06-networking-services.md) | Container Orchestration – Networking, Services | Services, DNS, Ingress, Gateway API |
| 07 | [Service mesh y microservicios](curso/07-service-mesh-microservicios.md) | Container Orchestration – Service Mesh | Sidecars nativos, canary por pesos |
| 08 | [Storage](curso/08-storage.md) | Container Orchestration – Storage | PV, PVC, StorageClass, StatefulSet |
| 09 | [Troubleshooting y debugging](curso/09-troubleshooting-debugging.md) | *(nuevo en el temario 2025)* | Arreglar 6 workloads rotos |
| 10 | [Arquitectura cloud native](curso/10-arquitectura-cloud-native.md) | Cloud Native Architecture | HPA en vivo |
| 11 | [Observabilidad](curso/11-observabilidad.md) | Cloud Native Observability | Prometheus y PromQL |
| 12 | [Application delivery y GitOps](curso/12-application-delivery-gitops.md) | Cloud Native Application Delivery | Kustomize, Helm, Argo CD |
| 13 | [Estrategia de examen](curso/13-estrategia-examen.md) | Conclusion | Plan de estudio y checklist final |

Referencia rápida de comandos: [CHEATSHEET.md](CHEATSHEET.md).

## Cómo estudiar cada módulo

1. Lee la teoría del módulo (y, si quieres, la lección equivalente de KodeKloud).
2. `.\kcna.ps1 lab NN` → sigue el **laboratorio guiado**.
3. Intenta el **reto** sin mirar la solución → `.\kcna.ps1 check NN`.
4. Responde las **preguntas tipo examen** del final del módulo.
5. Practica el dominio en la app: `.\kcna.ps1 quiz`.
6. `.\kcna.ps1 reset NN` para dejar el clúster limpio.

## Herramientas incluidas

| Herramienta | Uso | Comando |
|---|---|---|
| `kcna.ps1` | CLI del curso: clúster, labs, checks, imágenes | `.\kcna.ps1 help` |
| **App de quiz** | Simulacro de examen (60 preguntas / 90 min), práctica por dominio o módulo, repaso de falladas, flashcards (el sitio web añade además repaso espaciado y examen de graduación) | `.\kcna.ps1 quiz` |
| **Headlamp** | UI de escritorio oficial de Kubernetes | `.\kcna.ps1 ui` |
| **k9s** | UI de terminal | `.\kcna.ps1 k9s` |
| **Podman Desktop** | Contenedores, imágenes y vista de Kubernetes | Ver módulo 00 |
| kind, kubectl, helm | Clúster, cliente y paquetes | — |

## Estructura

```
README.md              Este archivo
CHEATSHEET.md          Comandos de referencia
kcna.ps1               CLI del laboratorio
kcna-env.ps1           Entorno de terminal (. .\kcna-env.ps1)
cluster/               Definición del clúster kind y valores de Traefik
curso/                 Módulos 00-13
labs/NN-tema/          Manifiestos, imágenes y verificación de cada lab
quiz/                  App de estudio (abrir index.html)
web/                   Sitio interactivo (Astro + Svelte), publicado en GitHub Pages
sync/                  Worker opcional de Cloudflare para sincronizar el progreso cifrado (docs/SINCRONIZACION.md)
docs/CONVENCIONES.md   Cómo está organizado el curso (para ampliarlo)
```

## Fuentes del temario

- Curriculum oficial KCNA (CNCF): https://github.com/cncf/curriculum
- Cambios del programa KCNA (Linux Foundation): https://training.linuxfoundation.org/kcna-program-changes/
- Lecciones de referencia (KodeKloud): https://notes.kodekloud.com/docs/Kubernetes-and-Cloud-Native-Associate-KCNA
