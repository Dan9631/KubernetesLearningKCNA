# Instalar el laboratorio KCNA

Guía para montar el curso en una máquina nueva: un clúster de Kubernetes de 3 nodos (kind) sobre Podman, aislado de cualquier clúster de trabajo, más las herramientas del curso. Tarda entre 20 y 40 minutos, casi todo descargas.

Tienes dos caminos: pegar un prompt en un agente de código y dejar que lo haga, o seguir los pasos a mano. Los dos usan el mismo script (`kcna.ps1`), así que el resultado es idéntico.

## Requisitos

| | |
|---|---|
| Sistema | Windows 10 (22H2) u 11, con WSL2 disponible |
| RAM | 16 GB recomendado; funciona con 12 GB cerrando apps pesadas |
| Disco | ~15 GB libres |
| Permisos | Instalar programas con `winget`. Activar WSL2 por primera vez pide administrador y reinicio |
| Red | Salida a internet desde Windows (si tu empresa usa proxy, ver [Proxy corporativo](#proxy-corporativo)) |

**¿Por qué Podman y no Docker Desktop?** Podman es gratuito para cualquier uso. Docker Desktop exige licencia de pago en empresas grandes. kind funciona con los dos, pero el curso está probado con Podman.

## Opción A: con un agente (copiar y pegar)

Abre **Claude Code** (o el agente de código que uses: Copilot en modo agente, Cursor, etc.) en una carpeta vacía o en tu carpeta de usuario y pega el prompt completo. El agente te pedirá permiso antes de instalar nada.

```prompt
Instala en este equipo el laboratorio del curso KCNA del repositorio
https://github.com/Dan9631/KubernetesLearningKCNA y déjalo funcionando.

Contexto:
- Windows con PowerShell. El curso usa kind (Kubernetes en contenedores) sobre Podman.
- Todo se gestiona con el script kcna.ps1 de la raíz del repo: `setup` revisa e
  instala requisitos, `up` crea el clúster, `doctor` diagnostica.
- La guía completa está en INSTALL.md del repo; léela si algo falla.

Reglas (obligatorias):
1. Pídeme confirmación antes de instalar programas, reiniciar o cambiar
   configuración del sistema. Dime qué vas a instalar y por qué.
2. No leas, edites ni sobrescribas ~/.kube/config (puede tener clústeres de mi
   trabajo). El laboratorio usa su propio kubeconfig en .kube\kcna-config.
3. No cambies la configuración de red, proxy ni firewall, y no intentes
   rodearla con relays o túneles. Si algo de red falla, para y explícamelo.
4. Usa PowerShell. Ejecuta los comandos desde la raíz del repo.

Pasos:
1. Comprueba `git --version`. Si falta, pídeme permiso e instálalo con
   `winget install --id Git.Git -e --source winget`.
2. Clona el repo en $HOME\KubernetesLearning (si ya existe, haz `git pull`) y
   entra en esa carpeta.
3. Ejecuta `.\kcna.ps1 setup` y muéstrame el resultado resumido.
   - Si dice que WSL2 no está activo: dime que ejecute `wsl --install` en una
     terminal de administrador y reinicie, y detente ahí.
   - Si faltan herramientas o hay que preparar la podman machine: enséñame la
     lista y, cuando lo apruebe, ejecuta `.\kcna.ps1 setup -Install`.
   - Si tras instalar algo no aparece en el PATH, abre una terminal nueva y
     repite `.\kcna.ps1 setup` hasta que diga "Todo listo".
4. Ejecuta `.\kcna.ps1 up` (tarda varios minutos la primera vez).
5. Verifica, y enséñame cada resultado:
   - `.\kcna.ps1 doctor` sin errores.
   - `. .\kcna-env.ps1` y luego `k get nodes`: 3 nodos Ready.
   - `Invoke-WebRequest http://localhost:8080 -UseBasicParsing` responde 404
     de Traefik (correcto: aún no hay rutas).
6. Termina con un resumen: qué se instaló, versiones, y cómo empezar
   (abrir curso/00-preparacion-entorno.md o ejecutar `.\kcna.ps1 site dev`).

Si algo falla, consulta la sección "Problemas frecuentes" de INSTALL.md antes
de improvisar una solución, y explícame qué viste.
```

## Opción B: paso a paso

Abre **PowerShell** (no hace falta que sea de administrador salvo para activar WSL).

### 1. WSL2

```powershell
wsl --status
```

Si da error o dice que WSL no está instalado, en una terminal **de administrador**:

```powershell
wsl --install
```

y reinicia el equipo.

### 2. Git y el repositorio

```powershell
winget install --id Git.Git -e --source winget
```

Abre una terminal nueva (para que vea `git`) y clona:

```powershell
git clone https://github.com/Dan9631/KubernetesLearningKCNA $HOME\KubernetesLearning
cd $HOME\KubernetesLearning
```

### 3. Requisitos

```powershell
.\kcna.ps1 setup
```

Te dice qué falta sin cambiar nada. Para instalarlo todo:

```powershell
.\kcna.ps1 setup -Install
```

Instala con `winget`: Podman, kind, Helm (obligatorios), k9s, Node.js y Headlamp (opcionales). Crea la máquina de Podman en modo *rootful* (kind lo necesita en Windows) y descarga en `.bin\` un `kubectl` de la misma versión que el clúster. Si algo instalado no aparece, abre una terminal nueva y repite `.\kcna.ps1 setup` hasta ver "Todo listo".

Si PowerShell bloquea el script con un error de *execution policy*:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 4. El clúster

```powershell
.\kcna.ps1 up
```

Crea el clúster `kcna` (1 control plane + 2 workers), instala metrics-server, Traefik y Gateway API, y precarga las imágenes de los labs.

### 5. Comprobación final

```powershell
.\kcna.ps1 doctor
. .\kcna-env.ps1
k get nodes
Invoke-WebRequest http://localhost:8080 -UseBasicParsing
```

| Debes ver | |
|---|---|
| `doctor` | Todo en OK, y tu kubeconfig de trabajo intacto |
| `k get nodes` | `kcna-control-plane`, `kcna-worker`, `kcna-worker2` en `Ready` |
| `localhost:8080` | Un error **404** de Traefik: correcto, todavía no hay rutas |
| El prompt | Empieza por `[kcna:kind-kcna]` |

Listo. Empieza por [curso/00-preparacion-entorno.md](curso/00-preparacion-entorno.md) o abre el sitio interactivo con `.\kcna.ps1 site dev`.

## Proxy corporativo

Si tu empresa sale a internet por un proxy:

- **Windows** (winget, git, npm) usa normalmente el proxy del sistema sin configurar nada.
- **La máquina de Podman** necesita tener el proxy configurado para descargar imágenes. Compruébalo con `podman pull docker.io/library/busybox:1.37`. Si falla, pide a TI la configuración de proxy para Podman/WSL; no la cambies por tu cuenta.
- **Los nodos del clúster no salen a internet** detrás de un proxy local, y es normal: `kcna.ps1` descarga las imágenes con Podman y las carga en los nodos (`.\kcna.ps1 load <imagen>`). Por eso los labs usan siempre tags explícitos y nunca `latest`.

## Problemas frecuentes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `kcna.ps1 no se puede cargar ... execution policy` | Política de scripts | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `setup` instala algo pero sigue "faltando" | La terminal tiene el PATH viejo | Abre una terminal nueva y repite `setup` |
| `podman machine init` falla | WSL2 no está activo o falta reiniciar | `wsl --install` como administrador y reinicia |
| `kind create cluster` falla con errores de cgroups | Máquina de Podman *rootless* | `.\kcna.ps1 setup -Install` la cambia a rootful |
| `kind create` falla con `address already in use` | Otro programa usa 8080, 8443 o 30080 | `setup` dice cuál; ciérralo o cambia `hostPort` en `cluster\kind-kcna.yaml` |
| `podman pull` falla con errores de proxy o TLS | Proxy corporativo sin configurar en Podman | Pide a TI la configuración; ver [Proxy corporativo](#proxy-corporativo) |
| Pods en `ImagePullBackOff` en un lab | Imagen no precargada | `.\kcna.ps1 load <imagen>` y borra el pod |
| `kubectl` responde con un clúster de la empresa | Terminal sin el entorno del lab | `. .\kcna-env.ps1` (el prompt debe decir `[kcna:kind-kcna]`) |
| Todo va lento | Poca RAM para WSL | `.\kcna.ps1 stop` cuando no estudies; revisa `memory=` en `%USERPROFILE%\.wslconfig` |

## Actualizar y desinstalar

```powershell
git pull                 # trae los cambios del curso
.\kcna.ps1 up            # aplica cambios en addons e imágenes
```

Para quitarlo todo:

```powershell
.\kcna.ps1 down          # borra el clúster
```

y, si ya no los usas, desinstala con `winget uninstall` los programas que añadió `setup` y borra la carpeta del curso. Tu `~/.kube/config` nunca se tocó.
