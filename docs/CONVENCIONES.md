# Convenciones del curso KCNA personal

Documento de referencia para escribir o ampliar módulos, labs y checks. Mantiene todo el curso coherente.

## Contexto del alumno

- Windows 11, **PowerShell 5.1** como terminal principal (también tiene Git Bash). Todos los comandos de los labs deben funcionar en PowerShell 5.1.
- Podman (máquina WSL `podman-machine-default`), **kind** con un clúster de 3 nodos llamado `kcna` (contexto `kind-kcna`, Kubernetes v1.37).
- El clúster se gestiona con `.\kcna.ps1` y la terminal se prepara con `. .\kcna-env.ps1` (fija `KUBECONFIG` al archivo aislado `.kube\kcna-config` y crea el alias `k`).
- **Nunca** usar ni modificar `~/.kube/config`: contiene clústeres de trabajo de la empresa.
- Objetivo: aprobar la **KCNA** (examen de 60 preguntas de opción múltiple, en inglés, 90 min, aprobado 75%). El examen es teórico, por eso cada módulo combina explicación conceptual + práctica para fijar los conceptos + preguntas tipo examen.

## Temario oficial (CNCF, vigente desde nov-2025)

| Dominio | Peso | Competencias |
|---|---|---|
| Kubernetes Fundamentals | 44% | Core Concepts, Administration, Scheduling, Containerization |
| Container Orchestration | 28% | Networking, Security, Troubleshooting, Storage |
| Cloud Native Application Delivery | 16% | Application Delivery, Debugging |
| Cloud Native Architecture | 12% | Observability, Cloud Native Ecosystem and Principles, Cloud Native Community and Collaboration |

## Estructura de archivos

```
curso/NN-tema.md          Módulo (teoría + comandos + lab + reto + preguntas)
labs/NN-tema/             Manifiestos YAML del módulo
labs/NN-tema/images.txt   Imágenes que usa el lab (una por línea, con tag explícito)
labs/NN-tema/check.ps1    Verificación automática del reto  (.\kcna.ps1 check NN)
labs/NN-tema/reset.ps1    (opcional) limpieza de recursos fuera del namespace (nodos, ClusterRoles...)
```

`NN` es el número de módulo con dos dígitos. El nombre de la carpeta de `labs/` debe coincidir con el del archivo del módulo (ej. `curso/04-scheduling.md` ↔ `labs/04-scheduling/`).

## Plantilla de módulo (`curso/NN-tema.md`)

Español neutro, tono de profesor cercano. Términos técnicos en inglés en **negrita** la primera vez (así aparecen en el examen), ej. "el planificador (**kube-scheduler**)".

1. `# Módulo NN — Título`
2. Bloque de metadatos: dominio(s) KCNA y peso, tiempo estimado, prerrequisitos, lecciones equivalentes de KodeKloud (solo títulos).
3. `## Objetivos` — 4-6 viñetas "Al terminar podrás...".
4. `## Conceptos` — explicación propia (nunca copiar texto de KodeKloud ni de otras fuentes), con analogías, tablas comparativas y diagramas **Mermaid** donde aporten. Profundidad de KCNA: entender qué es, para qué sirve y cómo se relaciona; no hace falta nivel CKA.
5. `## Comandos clave` — tabla `Comando | Qué hace`.
6. `## Laboratorio guiado` — pasos numerados. Empieza siempre con `.\kcna.ps1 lab NN` y `. .\kcna-env.ps1`. Cada paso: comando en bloque ```powershell, salida esperada resumida en bloque ```text, y una línea "Qué observar".
7. `## Reto` — tarea sin solución paso a paso, verificable con `.\kcna.ps1 check NN`. Solución dentro de `<details><summary>Ver solución</summary>...</details>`.
8. `## Preguntas tipo examen` — 8-12 preguntas **en inglés** (como en el examen) con 4 opciones; respuesta + explicación en español dentro de `<details>`.
9. `## Resumen para repasar` — 6-10 viñetas de memoria rápida (lo que el examen suele preguntar).
10. `## Limpieza` — `.\kcna.ps1 reset NN`.

## Reglas para los labs

- Namespace del lab: **`lab-NN`** (lo crea `.\kcna.ps1 lab NN`). Todos los recursos namespaced del lab van ahí.
- Recursos cluster-scoped (ClusterRole, PV, StorageClass, taints/labels en nodos...): nombres con prefijo `lab-NN-` y su limpieza en `reset.ps1`.
- **Imágenes**: los nodos de kind NO tienen salida a internet (el proxy corporativo no acepta la red de kind). Las imágenes se precargan con `.\kcna.ps1 load <imagen>` / `.\kcna.ps1 preload NN`. Por eso:
  - Siempre tag explícito, **nunca `latest`** ni sin tag (con `latest` el `imagePullPolicy` por defecto es `Always` y fallaría). Si una imagen solo existe como `latest`, poner `imagePullPolicy: IfNotPresent`.
  - Listar en `labs/NN-tema/images.txt` todas las imágenes usadas.
  - Al explicar `kubectl run`/`create deployment`, usar imágenes con tag (ej. `nginx:1.27-alpine`).
  - En el texto, mencionar una sola vez (en el lab) que las imágenes se precargan porque el clúster está detrás de un proxy, y que en un clúster normal no hace falta.
- Imágenes preferidas (ligeras): `nginx:1.27-alpine`, `nginx:1.28-alpine`, `busybox:1.37`, `traefik/whoami:v1.11`, `redis:7.4-alpine`, `curlimages/curl:8.11.1`, `registry.k8s.io/hpa-example` (solo `latest` → `imagePullPolicy: IfNotPresent`).
- Pedir recursos pequeños (`requests` de 10m-100m CPU, 16Mi-128Mi memoria). El clúster comparte ~8 GB con todo lo demás.
- Ingress: **Traefik** ya instalado (IngressClass `traefik`, por defecto) y accesible en `http://localhost:8080`. Gateway API v1.6 instalado con un `Gateway` llamado `traefik-gateway` en el namespace `traefik` que acepta rutas de todos los namespaces. NodePort `30080` mapeado a `http://localhost:30080`.
- Nodos: `kcna-control-plane`, `kcna-worker` (labels `disktype=ssd`, `zone=zona-a`), `kcna-worker2` (labels `disktype=hdd`, `zone=zona-b`).
- StorageClass por defecto: `standard` (rancher local-path, `WaitForFirstConsumer`).
- metrics-server instalado (`kubectl top`, HPA funcionan).
- Comandos de PowerShell: usar `Select-String` en vez de `grep`; jsonpath entre comillas simples (`-o jsonpath='{.status.phase}'`); para heredocs usar archivos YAML del lab en lugar de `cat <<EOF`. Si se muestra la variante bash, que sea como nota secundaria.
- PowerShell 5.1 elimina las comillas dobles internas al pasar argumentos a ejecutables nativos: evitar filtros jsonpath con `"` (ej. `[?(@.key=="x")]`) y headers tipo `-H "Authorization: ..."`. Alternativas: `-o json | ConvertFrom-Json`, `--patch-file`, o un YAML en el lab.
- Los labs usan siempre `-n lab-NN` explícito; no dependen del namespace del contexto.

## Contrato de `check.ps1`

Lo carga `kcna.ps1` (dot-source), que ya define `KUBECONFIG` y la función `Check`. El archivo solo contiene llamadas:

```powershell
# labs/03-workloads/check.ps1
Check "Deployment 'web' existe en lab-03" {
    kubectl get deploy web -n lab-03 -o name
}
Check "Deployment 'web' tiene 3 replicas listas" {
    (kubectl get deploy web -n lab-03 -o jsonpath='{.status.readyReplicas}') -eq '3'
}
```

- El scriptblock debe devolver algo "truthy" si se cumple (una cadena no vacía o `$true`).
- Solo ASCII en los `.ps1` (sin tildes ni ñ): PowerShell 5.1 lee los scripts sin BOM como ANSI.
- 3-6 checks por reto, con descripciones que orienten al alumno.
- Al contar resultados envolver en `@(...)`: en PowerShell 5.1 un objeto suelto no tiene `.Count`.
