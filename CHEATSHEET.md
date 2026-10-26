# Cheatsheet KCNA — kubectl, Helm, Podman, kind y k9s (PowerShell 5.1)

Referencia rápida del curso. Todo pensado para **PowerShell 5.1** en Windows y para el clúster local `kind-kcna`.

> Antes de nada, en cada terminal nueva: `cd $HOME\KubernetesLearning` y `. .\kcna-env.ps1`. El prompt debe decir `[kcna:kind-kcna]`. Nunca uses `~/.kube/config` para los labs.

**Particularidades de PowerShell que conviene recordar**

- Filtrar texto: `| Select-String patron` (en vez de `grep`). Primeras/últimas líneas: `| Select-Object -First 10` / `-Last 10`.
- JSONPath simple entre **comillas simples**: `-o jsonpath='{.status.phase}'`.
- JSONPath con saltos de línea: usa **comillas dobles por fuera y simples por dentro**: `-o jsonpath="{range .items[*]}{.metadata.name}{'\n'}{end}"` (en PowerShell 5.1 la forma `'{"\n"}'` falla porque se pierden las comillas internas).
- Base64: `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))`.
- Para YAML largo, mejor un archivo que un heredoc. Si lo generas tú: `kubectl ... -o yaml > archivo.yaml` funciona con kubectl; para otras herramientas usa `| Set-Content archivo.yaml`.
- Variables de entorno: `$env:KUBECONFIG`, `$env:Path += ';C:\ruta'`.

## kcna.ps1 (CLI del curso)

| Comando | Qué hace |
|---|---|
| `.\kcna.ps1 up` | Crea o arranca el clúster + addons (metrics-server, Traefik, Gateway API) + precarga imágenes |
| `.\kcna.ps1 stop` / `start` | Apaga / enciende los nodos (no se pierde nada) |
| `.\kcna.ps1 down` | Elimina el clúster por completo |
| `.\kcna.ps1 status` | Nodos, pods con problemas y namespaces de labs |
| `.\kcna.ps1 doctor` | Diagnóstico de herramientas y del aislamiento del kubeconfig |
| `.\kcna.ps1 addons` | Reinstala los addons |
| `.\kcna.ps1 lab NN` | Prepara el lab NN (namespace `lab-NN` + imágenes) |
| `.\kcna.ps1 check NN` | Verifica el reto del lab NN |
| `.\kcna.ps1 reset NN` | Borra todo lo del lab NN |
| `.\kcna.ps1 load <img> [...]` | Descarga con Podman y carga la imagen en los nodos |
| `.\kcna.ps1 preload [NN]` | Carga las imágenes de `labs\*\images.txt` (o solo del lab NN) |
| `.\kcna.ps1 chart-images <args de helm template>` | Carga todas las imágenes que usa un chart de Helm |
| `.\kcna.ps1 ui` / `k9s` / `quiz` | Abre Headlamp / k9s / la app de preguntas |
| `kcna <comando>` | Igual, desde cualquier carpeta, tras cargar `kcna-env.ps1` |

Si un pod queda en `ImagePullBackOff`: `.\kcna.ps1 load <imagen>` y `kubectl delete pod <pod>`.

## Abreviaturas de recursos

| Corto | Recurso | Corto | Recurso |
|---|---|---|---|
| `po` | pods | `pv` | persistentvolumes |
| `deploy` | deployments | `pvc` | persistentvolumeclaims |
| `rs` | replicasets | `sc` | storageclasses |
| `sts` | statefulsets | `sa` | serviceaccounts |
| `ds` | daemonsets | `ing` | ingresses |
| `cj` | cronjobs | `netpol` | networkpolicies |
| `svc` | services | `hpa` | horizontalpodautoscalers |
| `ep` | endpoints | `pdb` | poddisruptionbudgets |
| `ns` | namespaces | `crd` | customresourcedefinitions |
| `no` | nodes | `quota` | resourcequotas |
| `cm` | configmaps | `limits` | limitranges |
| `ev` | events | `pc` | priorityclasses |
| `gtw` | gateways (Gateway API) | `csr` | certificatesigningrequests |

`kubectl api-resources` lista todos (con nombre corto, si es namespaced y su apiVersion). `secrets`, `jobs`, `roles` y `rolebindings` no tienen abreviatura.

## Contexto y namespaces

| Comando | Qué hace |
|---|---|
| `kubectl config current-context` | Contexto activo (debe ser `kind-kcna`) |
| `kubectl config get-contexts` | Contextos del kubeconfig cargado |
| `kubectl config set-context --current --namespace=lab-03` | Cambia el namespace por defecto |
| `kubectl config view --minify` | Configuración efectiva del contexto actual |
| `kubectl get ns` | Lista namespaces |
| `kubectl create ns demo` | Crea un namespace |
| `-n <ns>` / `-A` | En un namespace concreto / en todos |

## Consultar: get y describe

| Comando | Qué hace |
|---|---|
| `kubectl get po -o wide` | Pods con IP y nodo |
| `kubectl get deploy,rs,po -n lab-03` | Varios tipos a la vez |
| `kubectl get all -n lab-03` | Workloads y Services del namespace (no incluye ConfigMaps, Secrets, PVC...) |
| `kubectl get po -w` | Observa cambios en vivo (`Ctrl+C` para salir) |
| `kubectl get po --show-labels` | Muestra las labels |
| `kubectl get po -o yaml` / `-o json` | Objeto completo |
| `kubectl get po --sort-by=.metadata.creationTimestamp` | Ordenado |
| `kubectl get po --field-selector=status.phase!=Running -A` | Filtra por campos |
| `kubectl describe po <pod>` | Detalle + **Events** (lo primero que miras si algo falla) |
| `kubectl describe node kcna-worker` | Capacidad, taints, pods y recursos asignados |
| `kubectl get events --sort-by=.lastTimestamp` | Eventos ordenados (también `kubectl events`) |
| `kubectl api-resources` / `kubectl api-versions` | Tipos y versiones de API disponibles |
| `kubectl cluster-info` | Dirección del API server y CoreDNS |
| `kubectl version` | Versiones del cliente y del servidor |

## Crear de forma imperativa (y generar YAML)

| Comando | Qué hace |
|---|---|
| `kubectl run web --image=nginx:1.27-alpine` | Pod suelto |
| `kubectl run tmp --rm -it --image=busybox:1.37 --restart=Never -- sh` | Pod temporal interactivo (se borra al salir) |
| `kubectl create deployment web --image=nginx:1.27-alpine --replicas=3` | Deployment |
| `kubectl expose deployment web --port=80 --target-port=80` | Service ClusterIP para el Deployment |
| `kubectl expose deployment web --type=NodePort --port=80` | Service NodePort |
| `kubectl create configmap app-cfg --from-literal=MODO=dev` | ConfigMap |
| `kubectl create secret generic db --from-literal=PASSWORD=<valor-de-prueba>` | Secret |
| `kubectl create job hola --image=busybox:1.37 -- echo hola` | Job |
| `kubectl create cronjob tic --image=busybox:1.37 --schedule="*/5 * * * *" -- date` | CronJob |
| `kubectl create sa robot` | ServiceAccount |
| `kubectl create role lector --verb=get,list --resource=pods` | Role |
| `kubectl create rolebinding lector-rb --role=lector --serviceaccount=lab-05:robot` | RoleBinding |

**Truco clave:** añade `--dry-run=client -o yaml` para obtener el YAML sin crear nada y usarlo como plantilla:

```powershell
kubectl create deployment web --image=nginx:1.27-alpine --replicas=3 --dry-run=client -o yaml > web.yaml
kubectl run tmp --image=busybox:1.37 --dry-run=client -o yaml -- sleep 3600 > pod.yaml
```

## Aplicar, editar y borrar

| Comando | Qué hace |
|---|---|
| `kubectl apply -f archivo.yaml` | Crea o actualiza (declarativo) |
| `kubectl apply -f carpeta/` | Todos los YAML de una carpeta |
| `kubectl apply -k carpeta/` | Aplica una kustomization |
| `kubectl diff -f archivo.yaml` | Qué cambiaría (requiere `diff`: `$env:Path += ';C:\Program Files\Git\usr\bin'`) |
| `kubectl edit deploy web` | Edita en vivo (abre el editor) |
| `kubectl set image deploy/web nginx=nginx:1.28-alpine` | Cambia la imagen de un contenedor |
| `kubectl patch deploy web -p '{\"spec\":{\"replicas\":2}}'` | Parche JSON (en PS 5.1 hay que escapar las comillas dobles) |
| `kubectl replace --force -f pod.yaml` | Borra y recrea (para campos inmutables de un pod) |
| `kubectl delete -f archivo.yaml` | Borra lo definido en el archivo |
| `kubectl delete po <pod> --grace-period=0 --force` | Borrado inmediato (solo en labs) |
| `kubectl delete po -l app=web` | Borra por selector |

## Rollouts y escalado

| Comando | Qué hace |
|---|---|
| `kubectl rollout status deploy/web` | Espera y muestra el progreso del despliegue |
| `kubectl rollout history deploy/web` | Revisiones del Deployment |
| `kubectl rollout undo deploy/web [--to-revision=2]` | Vuelve a la revisión anterior (o a una concreta) |
| `kubectl rollout restart deploy/web` | Recrea los pods de forma gradual |
| `kubectl rollout pause` / `resume deploy/web` | Pausa / reanuda un rollout |
| `kubectl scale deploy web --replicas=5` | Escala |
| `kubectl autoscale deploy web --min=2 --max=5 --cpu-percent=50` | Crea un HPA |
| `kubectl get hpa -w` | Observa el autoscaler |

## Logs, exec, port-forward y debug

| Comando | Qué hace |
|---|---|
| `kubectl logs <pod>` | Logs del pod (`-c <contenedor>` si tiene varios) |
| `kubectl logs <pod> -f --tail=50` | Sigue los logs en vivo |
| `kubectl logs <pod> --previous` | Logs del contenedor anterior (clave en `CrashLoopBackOff`) |
| `kubectl logs deploy/web --all-containers` | Logs a partir del Deployment |
| `kubectl logs -l app=web --prefix` | Logs de todos los pods de un selector |
| `kubectl exec -it <pod> -- sh` | Shell dentro del contenedor |
| `kubectl exec <pod> -- env` | Ejecuta un comando suelto |
| `kubectl cp <pod>:/etc/nginx/nginx.conf .\nginx.conf` | Copia archivos (requiere `tar` en la imagen) |
| `kubectl port-forward svc/web 8085:80` | http://localhost:8085 → Service (o `pod/<pod>`, `deploy/web`) |
| `kubectl debug -it <pod> --image=busybox:1.37 --target=<contenedor>` | Contenedor efímero para depurar un pod (aunque no tenga shell) |
| `kubectl debug <pod> -it --copy-to=web-debug --image=busybox:1.37` | Copia del pod para depurar sin tocar el original |
| `kubectl debug node/kcna-worker -it --image=busybox:1.37` | Pod con acceso al sistema de archivos del nodo (`/host`) |

## Labels y selectores

| Comando | Qué hace |
|---|---|
| `kubectl label po web env=dev` | Añade una label (`--overwrite` para cambiarla) |
| `kubectl label po web env-` | Quita la label `env` |
| `kubectl get po -l app=web` | Selector de igualdad |
| `kubectl get po -l 'env in (dev,qa)'` | Selector de conjunto |
| `kubectl get po -l 'app=web,env!=prod'` | Varias condiciones (AND) |
| `kubectl get po -L env,app` | Muestra esas labels como columnas |
| `kubectl annotate deploy web nota="cambio de prueba"` | Añade una anotación |
| `kubectl label node kcna-worker disktype=ssd` / `kubectl taint node kcna-worker clave=valor:NoSchedule` | Label / taint en un nodo (`clave-` o `clave:NoSchedule-` para quitarlos) |

## Permisos: auth can-i

| Comando | Qué hace |
|---|---|
| `kubectl auth can-i create deployments -n lab-05` | ¿Puedo yo? |
| `kubectl auth can-i list pods -n lab-05 --as=system:serviceaccount:lab-05:robot` | ¿Puede esa ServiceAccount? |
| `kubectl auth can-i --list -n lab-05` | Todo lo que puedo hacer |
| `kubectl auth whoami` | Con qué identidad hablo con la API |

## Recursos: top

| Comando | Qué hace |
|---|---|
| `kubectl top nodes` | CPU/memoria por nodo (requiere metrics-server, ya instalado) |
| `kubectl top po -A --sort-by=memory` | Pods que más memoria usan |
| `kubectl top po --containers` | Desglose por contenedor |

## Documentación integrada: explain

| Comando | Qué hace |
|---|---|
| `kubectl explain pod.spec.containers` | Descripción de un campo |
| `kubectl explain deploy.spec.strategy --recursive` | Todo el árbol de subcampos |
| `kubectl explain pvc.spec.accessModes` | Muy útil para recordar nombres exactos de campos |

## JSONPath y custom-columns útiles

```powershell
# Fase de un pod
kubectl get po web -o jsonpath='{.status.phase}'
# Imágenes de todos los pods (una por línea)
kubectl get po -A -o jsonpath="{range .items[*]}{.metadata.namespace}{'\t'}{.metadata.name}{'\t'}{.spec.containers[*].image}{'\n'}{end}"
# IP interna de cada nodo
kubectl get nodes -o jsonpath="{range .items[*]}{.metadata.name}{'\t'}{.status.addresses[?(@.type=='InternalIP')].address}{'\n'}{end}"
# Réplicas listas de un Deployment
kubectl get deploy web -o jsonpath='{.status.readyReplicas}'
# Taints de los nodos
kubectl get nodes -o custom-columns='NODO:.metadata.name,TAINTS:.spec.taints[*].key'
# Tabla propia de pods
kubectl get po -o custom-columns='POD:.metadata.name,NODO:.spec.nodeName,IMAGEN:.spec.containers[0].image,ESTADO:.status.phase'
# Decodificar un Secret
$b64 = kubectl get secret db -o jsonpath='{.data.PASSWORD}'
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))
```

## Helm

| Comando | Qué hace |
|---|---|
| `helm repo add traefik https://traefik.github.io/charts` | Añade un repositorio de charts |
| `helm repo update` / `helm repo list` | Actualiza índices / lista repos |
| `helm search repo traefik` / `helm search hub nginx` | Busca charts en tus repos / en Artifact Hub |
| `helm show values traefik/traefik` | Valores por defecto de un chart |
| `helm create mi-chart` | Esqueleto de chart nuevo |
| `helm lint ./mi-chart` | Valida el chart |
| `helm template rel ./mi-chart -f values.yaml` | Renderiza a YAML sin instalar |
| `helm install rel ./mi-chart -n ns --create-namespace` | Instala (revisión 1) |
| `helm install rel repo/chart --version 1.2.3 --set replicaCount=2` | Instala versión fijada con un valor |
| `helm upgrade rel ./mi-chart -f values-v2.yaml` | Actualiza (nueva revisión); `--install` si quizá no existe; `--reuse-values` para conservar los valores anteriores |
| `helm list -n ns` / `helm list -A` | Releases |
| `helm status rel -n ns` | Estado y NOTES |
| `helm get values rel` / `helm get manifest rel` | Valores usados / YAML aplicado |
| `helm history rel -n ns` | Historial de revisiones |
| `helm rollback rel 1 -n ns` | Vuelve a la revisión 1 (crea una revisión nueva) |
| `helm uninstall rel -n ns` | Desinstala |
| `.\kcna.ps1 chart-images rel repo/chart --version 1.2.3 -f values.yaml` | Precarga en el clúster del curso las imágenes de ese chart antes de instalarlo |

## Podman

| Comando | Qué hace |
|---|---|
| `podman machine list` / `start` / `stop` | Estado / arranque / parada de la VM de Podman |
| `podman ps` / `podman ps -a` | Contenedores en marcha / todos (los nodos de kind aparecen aquí) |
| `podman images` | Imágenes locales |
| `podman pull nginx:1.27-alpine` | Descarga una imagen |
| `podman run --rm -it -p 8081:80 nginx:1.27-alpine` | Ejecuta y publica un puerto |
| `podman run -d --name web nginx:1.27-alpine` | En segundo plano |
| `podman logs -f web` / `podman exec -it web sh` | Logs / shell |
| `podman build -t miapp:1.0 .` | Construye una imagen desde un `Containerfile`/`Dockerfile` |
| `podman inspect web` / `podman image inspect nginx:1.27-alpine` | Detalles en JSON |
| `podman stop web` / `podman rm web` / `podman rmi miapp:1.0` | Parar / borrar contenedor / borrar imagen |
| `podman save -o img.tar nginx:1.27-alpine` | Exporta una imagen a tar |
| `podman system df` / `podman image prune` | Espacio usado / limpia imágenes sin usar |
| `podman exec kcna-worker crictl images` | Imágenes cargadas dentro de un nodo de kind |

## kind

> `kcna.ps1` ya fija `KIND_EXPERIMENTAL_PROVIDER=podman` y el kubeconfig aislado; prefiere sus comandos. Si usas `kind` a mano, carga antes `kcna-env.ps1`: `kind export kubeconfig` escribe en el archivo de `$env:KUBECONFIG` y, sin esa variable, iría a `~/.kube/config`.

| Comando | Qué hace |
|---|---|
| `kind get clusters` | Clústeres existentes |
| `kind get nodes --name kcna` | Nodos (contenedores) del clúster |
| `kind load image-archive img.tar --name kcna` | Carga una imagen exportada en todos los nodos (lo que hace `.\kcna.ps1 load`) |
| `kind export kubeconfig --name kcna` | Regenera el kubeconfig (con `kcna-env.ps1` cargado) |
| `kind export logs .\kind-logs --name kcna` | Recoge logs de los nodos para diagnóstico |
| `kind create cluster --config cluster\kind-kcna.yaml` / `kind delete cluster --name kcna` | Crear / borrar (mejor `.\kcna.ps1 up` / `down`) |

## k9s

Arranque: `.\kcna.ps1 k9s` (usa el kubeconfig del lab).

| Tecla | Acción |
|---|---|
| `:pod`, `:deploy`, `:svc`, `:ns`, `:node`, `:pvc`, `:events` | Cambiar de vista (acepta abreviaturas: `:po`, `:dp`...) |
| `:ctx` | Cambiar de contexto |
| `0` | Todos los namespaces (`1`-`9`: namespaces recientes) |
| `/texto` | Filtrar la lista (`Esc` para quitar el filtro) |
| `Enter` / `Esc` | Entrar en el recurso / volver |
| `d` | Describe |
| `y` | Ver YAML |
| `e` | Editar |
| `l` | Logs (`p` logs del contenedor anterior; `0` para ver desde el inicio) |
| `s` | Shell en el contenedor |
| `Shift+f` | Port-forward |
| `Ctrl+d` | Borrar (pide confirmación) |
| `Ctrl+k` | Matar el pod (sin confirmación) |
| `:xray deploy` | Árbol de dependencias de los Deployments |
| `:pulses` | Panel general de actividad |
| `?` | Ayuda con todos los atajos de la vista actual |
| `:q` o `Ctrl+c` | Salir |

## Argo CD (módulo 12)

| Comando | Qué hace |
|---|---|
| `.\labs\12-application-delivery-gitops\gitops\install-argocd.ps1` | Instala Argo CD v3.5.5 en el namespace `argocd` |
| `kubectl get applications -n argocd` | Estado de sync y salud |
| `kubectl annotate application <app> -n argocd argocd.argoproj.io/refresh=normal --overwrite` | Fuerza la lectura de Git |
| `kubectl port-forward -n argocd svc/argocd-server 8443:443` | UI en https://localhost:8443 (usuario `admin`; contraseña en el Secret `argocd-initial-admin-secret`) |
| `.\labs\12-application-delivery-gitops\gitops\uninstall-argocd.ps1` | Desinstala Argo CD |
