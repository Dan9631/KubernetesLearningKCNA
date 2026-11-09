// "Comandos de memoria": ejercicios estáticos. El alumno lee la tarea, escribe el comando sin mirarlo y el
// analizador (comparar, en analizador.ts) lo corrige parte por parte. No se ejecuta nada: por eso caben aquí
// helm, podman, kcna.ps1 y los kubectl que el simulador no modela.
//   acepta   comandos válidos; el orden de los flags, las abreviaturas de recurso, tipo/nombre y -n/--namespace ya
//            se consideran equivalentes, así que solo hacen falta variantes que de verdad se escriben distinto.
//   idea     primera pista: el concepto, sin la sintaxis.
//   porque   qué fija el comando: la idea de Kubernetes que hay detrás (se muestra tras responder).
// Los ids están guardados en el progreso del alumno ("cmd:<id>"): no se cambian ni se reutilizan.
// Se validan en el prebuild (scripts/validar-comandos.mjs). Los comandos salen de "Comandos clave" de cada módulo.
/** Resultado de una ronda de Comandos.svelte */
export interface Cierre { primera: number; ayuda: number; vistas: number; total: number }
export interface Drill { id: string; mod: number; tarea: string; acepta: string[]; idea: string; porque: string }

const D = (id: string, mod: number, tarea: string, acepta: string | string[], idea: string, porque: string): Drill => ({ id, mod, tarea, acepta: Array.isArray(acepta) ? acepta : [acepta], idea, porque });

export const DRILLS: Drill[] = [
  // 01 · Contenedores
  D('01-run', 1, 'Arranca en segundo plano un contenedor llamado web con la imagen nginx:1.27-alpine, publicando su puerto 80 en el 8081 de tu máquina.', 'podman run -d --name web -p 8081:80 nginx:1.27-alpine',
    'Tres opciones antes de la imagen: segundo plano, nombre y publicación de puerto (HOST:CONTENEDOR).', 'Un contenedor es un proceso aislado con su propia red: sin -p HOST:CONTENEDOR su puerto 80 no se ve desde tu máquina.'),
  D('01-ps-a', 1, 'Lista todos los contenedores, también los que están parados.', ['podman ps -a', 'podman container ls -a'],
    'El listado normal solo enseña los que están en ejecución.', 'Un contenedor parado sigue existiendo (con su capa de escritura) hasta que lo borras: por eso ps a secas no cuenta toda la historia.'),
  D('01-logs', 1, 'Muestra lo que el contenedor web ha escrito por stdout y stderr.', 'podman logs web',
    'Los contenedores escriben a la salida estándar, y el runtime la guarda.', 'El contrato de logs de los contenedores (y de Kubernetes) es stdout/stderr: kubectl logs lee lo mismo que podman logs.'),
  D('01-exec', 1, 'Abre una shell interactiva (sh) dentro del contenedor web, que ya está en marcha.', 'podman exec -it web sh',
    'No es run (que crea otro contenedor): es ejecutar un proceso más en uno que ya existe, con terminal interactiva.', 'exec entra en los namespaces de un contenedor vivo; -i mantiene la entrada abierta y -t asigna una terminal. kubectl exec -it funciona igual.'),
  D('01-build', 1, 'Construye una imagen llamada mi-web:1.0 a partir del Containerfile del directorio actual.', 'podman build -t mi-web:1.0 .',
    'Necesita un nombre con tag y el contexto de construcción (el directorio).', 'La imagen se construye por capas, una por instrucción del Containerfile; el punto final es el contexto que se envía al constructor.'),
  D('01-history', 1, 'Muestra las capas de la imagen nginx:1.27-alpine y la instrucción que creó cada una.', ['podman history nginx:1.27-alpine', 'podman image history nginx:1.27-alpine'],
    'Quieres la historia de la imagen, no la de un contenedor.', 'Una imagen es una pila de capas de solo lectura; ver su historial explica su tamaño y qué se reutiliza entre imágenes.'),
  D('01-load', 1, 'Con el CLI del curso, copia la imagen localhost/mi-web:1.0 de Podman a los nodos de kind.', '.\\kcna.ps1 load localhost/mi-web:1.0',
    'Los nodos del clúster no ven las imágenes de tu Podman: hay que cargarlas con kcna.ps1.', 'Cada nodo tiene su propio almacén de imágenes (containerd). Como los nodos del curso no tienen internet, una imagen que no esté cargada acaba en ImagePullBackOff.'),

  // 02 · Arquitectura
  D('02-nodes-wide', 2, 'Lista los nodos con su IP interna, su sistema operativo y su container runtime.', 'kubectl get nodes -o wide',
    'Es el listado normal con el formato de salida que añade columnas.', 'La columna CONTAINER-RUNTIME enseña que el kubelet habla con un runtime (containerd) por CRI: Kubernetes no ejecuta contenedores por sí mismo.'),
  D('02-system', 2, 'Lista los pods del namespace kube-system con el nodo en el que corre cada uno.', 'kubectl get pods -n kube-system -o wide',
    'Dos flags: el namespace y la salida ancha.', 'Ahí viven los componentes: apiserver, etcd, scheduler y controller-manager en el control plane; kube-proxy y el CNI en todos los nodos.'),
  D('02-api-resources', 2, 'Lista los tipos de recurso que sirve el API server, con su nombre corto y si son namespaced.', 'kubectl api-resources',
    'Es un comando propio, sin recurso detrás.', 'Todo en Kubernetes es un recurso de la API; saber cuáles son cluster-scoped (nodes, pv, namespaces) es pregunta frecuente.'),
  D('02-explain', 2, 'Consulta la documentación del campo spec.strategy de un Deployment sin salir de la terminal.', 'kubectl explain deployment.spec.strategy',
    'El comando de documentación recibe la ruta del campo separada por puntos.', 'explain lee el esquema OpenAPI que publica el API server: es la documentación de la versión exacta de tu clúster.'),
  D('02-events', 2, 'Lista los eventos del namespace actual ordenados por la última vez que ocurrieron.', ['kubectl get events --sort-by=.lastTimestamp', 'kubectl get events --sort-by=lastTimestamp', 'kubectl get events --sort-by={.lastTimestamp}', 'kubectl get events --sort-by=.metadata.creationTimestamp'],
    'Los eventos son objetos: se listan con get y se ordenan por un campo.', 'Los eventos cuentan qué componente hizo qué (scheduler, kubelet, controladores). Sin ordenar salen mezclados.'),
  D('02-contexts', 2, 'Muestra los contextos de tu kubeconfig y cuál está activo.', 'kubectl config get-contexts',
    'Es un subcomando de config.', 'Un contexto es la terna clúster + usuario + namespace. En este curso importa: tu ~/.kube/config apunta a clústeres de trabajo.'),
  D('02-use-context', 2, 'Cambia el contexto activo a kind-kcna.', 'kubectl config use-context kind-kcna',
    'Otro subcomando de config, con el nombre del contexto.', 'Cambiar de contexto cambia a qué clúster le habla kubectl: compruébalo antes de borrar nada.'),
  D('02-cluster-info', 2, 'Muestra la URL del control plane y la de CoreDNS.', 'kubectl cluster-info',
    'Un comando sin recurso, de información general.', 'Todo pasa por el API server: es la única puerta de entrada al clúster y el único componente que habla con etcd.'),

  // 03 · Workloads
  D('03-run', 3, 'Crea un Pod llamado nginx con la imagen nginx:1.27-alpine en el namespace lab-03.', 'kubectl run nginx --image=nginx:1.27-alpine -n lab-03',
    'El verbo imperativo para un Pod suelto no es create.', 'kubectl run crea un Pod sin controlador: si muere o se borra, nadie lo repone. Por eso en producción se usan Deployments.'),
  D('03-dry-run', 3, 'Genera el YAML de un Deployment web con nginx:1.27-alpine y 3 réplicas, sin crear nada en el clúster.', 'kubectl create deployment web --image=nginx:1.27-alpine --replicas=3 --dry-run=client -o yaml',
    'El create de siempre más dos flags: uno para no enviarlo y otro para imprimirlo.', 'Es el puente del modo imperativo al declarativo: generas el manifiesto, lo guardas en Git y lo aplicas con apply.'),
  D('03-scale', 3, 'Escala el Deployment web del namespace lab-03 a 5 réplicas.', 'kubectl scale deployment web --replicas=5 -n lab-03',
    'Verbo, tipo, nombre y el número en un flag.', 'Solo cambias spec.replicas (el estado deseado). Quien crea o borra Pods es el ReplicaSet, hasta que el estado real coincide.'),
  D('03-set-image', 3, 'En lab-03, cambia a nginx:1.28-alpine la imagen del contenedor nginx del Deployment web.', 'kubectl set image deployment/web nginx=nginx:1.28-alpine -n lab-03',
    'Hay que decir qué contenedor cambia: CONTENEDOR=IMAGEN.', 'Cambiar la plantilla del Pod dispara un rollout: el Deployment crea un ReplicaSet nuevo y va moviendo réplicas del viejo al nuevo.'),
  D('03-status', 3, 'Comprueba si el rollout del Deployment web de lab-03 ya terminó.', 'kubectl rollout status deployment/web -n lab-03',
    'Es una acción de rollout.', 'rollout status espera hasta que todas las réplicas nuevas estén disponibles; si la imagen está rota, se queda esperando: el rollout no avanza y los Pods viejos siguen sirviendo.'),
  D('03-undo', 3, 'Devuelve el Deployment web de lab-03 a su revisión anterior.', 'kubectl rollout undo deployment/web -n lab-03',
    'Otra acción de rollout: deshacer.', 'El Deployment conserva los ReplicaSets antiguos (revisionHistoryLimit): volver atrás es escalar de nuevo el anterior. Kubernetes no hace rollback solo.'),
  D('03-selector', 3, 'Lista los pods de lab-03 que tienen la label app=web.', ['kubectl get pods -n lab-03 -l app=web', 'kubectl get pods -n lab-03 -l app==web'],
    'Se filtra con un selector de labels.', 'Las labels y los selectors son el pegamento de Kubernetes: así encuentra un ReplicaSet sus Pods y un Service sus endpoints.'),
  D('03-previous', 3, 'Muestra los logs de la ejecución anterior (la que murió) del contenedor del pod web, en lab-03.', 'kubectl logs web -n lab-03 --previous',
    'logs enseña por defecto el contenedor actual; hay un flag para el anterior.', 'En CrashLoopBackOff el contenedor actual acaba de arrancar y no dice nada: la causa está en los logs del que murió.'),
  D('03-cm', 3, 'Crea en lab-03 un ConfigMap llamado ajustes con la clave MODO y el valor dev.', 'kubectl create configmap ajustes --from-literal=MODO=dev -n lab-03',
    'create configmap con el dato literal clave=valor.', 'Un ConfigMap separa la configuración de la imagen: la misma imagen sirve en dev y en prod cambiando solo el ConfigMap.'),
  D('03-secret', 3, 'Crea en lab-03 un Secret genérico llamado db con la clave PASSWORD y el valor S3creto.', 'kubectl create secret generic db --from-literal=PASSWORD=S3creto -n lab-03',
    'Como el ConfigMap, pero el Secret pide un subtipo antes del nombre.', 'El Secret guarda el valor en base64, que es codificación y no cifrado: la protección real viene de RBAC y del cifrado en reposo de etcd.'),

  // 04 · Scheduling
  D('04-label-node', 4, 'Pon la label disktype=ssd al nodo kcna-worker.', 'kubectl label node kcna-worker disktype=ssd',
    'Un nodo se etiqueta igual que un Pod.', 'Las labels de los nodos son lo que consultan nodeSelector y la afinidad de nodo para decidir dónde puede ir un Pod.'),
  D('04-unlabel', 4, 'Quita la label disktype del nodo kcna-worker.', 'kubectl label node kcna-worker disktype-',
    'Mismo comando; la clave termina con un signo.', 'El guion final quita la label. Los Pods que ya corrían siguen ahí: nodeSelector solo se evalúa al programar.'),
  D('04-columnas', 4, 'Lista los nodos mostrando las labels disktype y zone como columnas.', 'kubectl get nodes -L disktype,zone',
    'Hay un flag (una L mayúscula) que convierte labels en columnas.', '-L muestra el valor de una label como columna; -l (minúscula) filtra. Confundirlas es un error típico.'),
  D('04-taint', 4, 'Pon al nodo kcna-worker2 un taint dedicated=batch con efecto NoSchedule.', 'kubectl taint nodes kcna-worker2 dedicated=batch:NoSchedule',
    'Formato del taint: clave=valor:Efecto.', 'El taint repele desde el nodo; la toleration, en el Pod, solo le permite entrar (no lo atrae). Para atraer hacen falta nodeSelector o afinidad.'),
  D('04-untaint', 4, 'Quita del nodo kcna-worker2 el taint dedicated de efecto NoSchedule.', ['kubectl taint nodes kcna-worker2 dedicated:NoSchedule-', 'kubectl taint nodes kcna-worker2 dedicated=batch:NoSchedule-', 'kubectl taint nodes kcna-worker2 dedicated-'],
    'El mismo taint, terminado con un guion.', 'Quitar el taint no mueve ningún Pod: el scheduler solo decide en el momento de programar.'),
  D('04-qos', 4, 'Muestra solo la QoS class del pod web de lab-04.', ['kubectl get pod web -n lab-04 -o jsonpath={.status.qosClass}'],
    'Un solo campo del objeto se saca con jsonpath; está en status.', 'La QoS (Guaranteed, Burstable, BestEffort) sale de requests y limits, y decide a quién se expulsa primero cuando falta memoria en el nodo.'),
  D('04-failed', 4, 'Lista los eventos de lab-04 cuyo motivo (reason) es FailedScheduling.', 'kubectl get events -n lab-04 --field-selector reason=FailedScheduling',
    'Los eventos no se filtran por label, sino por campo.', 'Un Pod Pending sin nodo tiene un evento FailedScheduling que dice cuántos nodos se descartaron y por qué (taints, recursos, selector).'),
  D('04-ds', 4, 'Lista los DaemonSets de todos los namespaces.', 'kubectl get ds -A',
    'Recurso con nombre corto y el flag de todos los namespaces.', 'Un DaemonSet pone un Pod en cada nodo elegible (kube-proxy, el CNI, agentes de logs): su DESIRED es el número de nodos, no un número de réplicas.'),
  D('04-top-node', 4, 'Muestra el consumo real de CPU y memoria de cada nodo.', 'kubectl top nodes',
    'El verbo de métricas en vivo.', 'top enseña el uso real (metrics-server). El scheduler no lo mira: decide con los requests declarados, no con el consumo.'),

  // 05 · Seguridad
  D('05-whoami', 5, 'Averigua con qué usuario y grupos te autentica el API server.', 'kubectl auth whoami',
    'Es un subcomando de auth.', 'Autenticación (quién eres) va antes que autorización (qué puedes hacer). Kubernetes no guarda usuarios humanos: confía en certificados o tokens.'),
  D('05-sa', 5, 'Crea una ServiceAccount llamada lector en lab-05.', 'kubectl create serviceaccount lector -n lab-05',
    'create, el tipo y el nombre.', 'La ServiceAccount es la identidad de los Pods ante el API server, igual que el usuario lo es para las personas.'),
  D('05-role', 5, 'Crea en lab-05 un Role llamado lee-pods que permita get y list sobre pods.', 'kubectl create role lee-pods --verb=get,list --resource=pods -n lab-05',
    'Un Role son verbos sobre recursos: un flag para cada cosa.', 'RBAC es aditivo: un Role solo concede permisos (no hay "denegar") y vale dentro de su namespace. Para todo el clúster, ClusterRole.'),
  D('05-rb', 5, 'En lab-05, une el Role lee-pods con la ServiceAccount lector mediante un RoleBinding llamado lector-lee-pods.', 'kubectl create rolebinding lector-lee-pods --role=lee-pods --serviceaccount=lab-05:lector -n lab-05',
    'El binding nombra el Role y el sujeto; la ServiceAccount se escribe NAMESPACE:NOMBRE.', 'El Role dice qué se puede hacer; el RoleBinding dice quién. Sin binding, un Role no da permisos a nadie.'),
  D('05-can-i', 5, 'Comprueba si la ServiceAccount lector de lab-05 puede listar pods en lab-05.', 'kubectl auth can-i list pods -n lab-05 --as=system:serviceaccount:lab-05:lector',
    'auth can-i VERBO RECURSO, haciéndote pasar por la ServiceAccount con su nombre completo.', 'can-i --as pregunta al autorizador sin ejecutar nada. El nombre completo de una ServiceAccount es system:serviceaccount:NAMESPACE:NOMBRE.'),
  D('05-psa', 5, 'Activa Pod Security Admission en lab-05: perfil restricted en modo enforce.', ['kubectl label ns lab-05 pod-security.kubernetes.io/enforce=restricted', 'kubectl label ns lab-05 pod-security.kubernetes.io/enforce=restricted --overwrite'],
    'Pod Security Admission se configura con una label en el namespace.', 'PSA es un admission controller integrado: con enforce rechaza los Pods que no cumplen el perfil (privileged, baseline o restricted).'),
  D('05-netpol', 5, 'Lista las NetworkPolicies de lab-05.', 'kubectl get networkpolicy -n lab-05',
    'Un get con el tipo (tiene nombre corto).', 'Sin NetworkPolicies todo el tráfico entre Pods está permitido. Además, solo se aplican si el plugin CNI las implementa.'),

  // 06 · Networking
  D('06-expose', 6, 'Crea un Service ClusterIP para el Deployment web de lab-06: puerto 80 del Service hacia el puerto 8080 del contenedor.', 'kubectl expose deployment web --port=80 --target-port=8080 -n lab-06',
    'Dos puertos distintos: el del Service y el del contenedor.', 'port es donde escucha el Service; targetPort, donde escucha el contenedor. El Service copia el selector del Deployment para encontrar los Pods.'),
  D('06-nodeport', 6, 'Expón el Deployment web de lab-06 con un Service de tipo NodePort en el puerto 80.', 'kubectl expose deployment web --type=NodePort --port=80 -n lab-06',
    'El mismo expose, indicando el tipo.', 'NodePort abre un puerto (30000-32767) en todos los nodos y, además, sigue teniendo ClusterIP: cada tipo de Service se construye sobre el anterior.'),
  D('06-describe-svc', 6, 'Muestra el selector, la IP y los endpoints del Service web de lab-06.', 'kubectl describe svc web -n lab-06',
    'El verbo que da el detalle de un objeto.', 'Un Service con Endpoints vacío casi siempre es un selector que no coincide con las labels de los Pods, o Pods que no están Ready.'),
  D('06-eps', 6, 'Lista los EndpointSlices del Service web en lab-06 (llevan una label con el nombre del Service).', ['kubectl get endpointslices -l kubernetes.io/service-name=web -n lab-06', 'kubectl get endpointslice -l kubernetes.io/service-name=web -n lab-06'],
    'Se filtran por la label kubernetes.io/service-name.', 'Los EndpointSlices son la lista real de IP:puerto de los Pods listos detrás del Service; kube-proxy los lee para programar las reglas de red.'),
  D('06-dns', 6, 'Desde el pod cliente de lab-06, resuelve por DNS el nombre completo del Service web.', 'kubectl exec cliente -n lab-06 -- nslookup web.lab-06.svc.cluster.local',
    'Hay que ejecutar nslookup dentro del Pod; el nombre completo es SERVICE.NAMESPACE.svc.cluster.local.', 'CoreDNS da a cada Service un nombre estable. Dentro del mismo namespace basta el nombre corto; desde otro, service.namespace.'),
  D('06-resolv', 6, 'Muestra la configuración DNS del pod cliente de lab-06.', 'kubectl exec cliente -n lab-06 -- cat /etc/resolv.conf',
    'Es un archivo dentro del contenedor.', 'El kubelet escribe /etc/resolv.conf en cada Pod: el nameserver es el Service kube-dns y los search domains hacen que funcionen los nombres cortos.'),
  D('06-pf', 6, 'Abre un túnel desde el puerto 9000 de tu PC al puerto 80 del Service web de lab-06.', 'kubectl port-forward svc/web 9000:80 -n lab-06',
    'port-forward TIPO/NOMBRE LOCAL:REMOTO.', 'port-forward pasa por el API server: sirve para depurar un Service ClusterIP sin exponerlo. No es una forma de publicar aplicaciones.'),
  D('06-ingress', 6, 'Lista los Ingress de lab-06.', 'kubectl get ingress -n lab-06',
    'Un get con el tipo.', 'Un Ingress son reglas HTTP (host y ruta hacia un Service); no hace nada sin un Ingress controller que las lea, como Traefik en este curso.'),

  // 07 · Service mesh
  D('07-logs-c', 7, 'Muestra los logs del contenedor log-tail del pod web, en lab-07.', 'kubectl logs web -c log-tail -n lab-07',
    'En un Pod con varios contenedores hay que nombrar el contenedor.', 'Un sidecar es otro contenedor del mismo Pod: comparte red y volúmenes con la aplicación, pero tiene sus propios logs.'),
  D('07-exec-c', 7, 'Dentro del contenedor log-tail del pod web de lab-07, pide http://localhost con wget -qO-.', 'kubectl exec web -c log-tail -n lab-07 -- wget -qO- http://localhost',
    'exec con el contenedor elegido y, tras --, el comando.', 'Que el sidecar alcance a la aplicación por localhost demuestra que los contenedores de un Pod comparten el network namespace. En eso se apoya un service mesh.'),
  D('07-sidecar', 7, 'Muestra la restartPolicy de los init containers del pod web de lab-07 (Always indica un sidecar nativo).', 'kubectl get pod web -n lab-07 -o jsonpath={.spec.initContainers[*].restartPolicy}',
    'jsonpath sobre spec.initContainers, todos los elementos.', 'Un sidecar nativo es un init container con restartPolicy: Always: arranca antes que la aplicación y sigue vivo junto a ella.'),
  D('07-httproute', 7, 'Muestra los backendRefs y los pesos de la HTTPRoute canary de lab-07.', 'kubectl describe httproute canary -n lab-07',
    'El detalle de un objeto de Gateway API.', 'El reparto por pesos entre dos Services (90/10) es un canary: Gateway API lo expresa con weight en los backendRefs.'),
  D('07-istio-label', 7, 'Activa la inyección automática de sidecars de Istio en el namespace demo.', ['kubectl label ns demo istio-injection=enabled', 'kubectl label ns demo istio-injection=enabled --overwrite'],
    'Se activa con una label en el namespace.', 'El mesh inyecta el proxy con un mutating admission webhook: modifica el Pod al crearlo, sin tocar tu manifiesto.'),

  // 08 · Storage
  D('08-sc', 8, 'Lista las StorageClasses del clúster.', 'kubectl get sc',
    'Un get; el tipo tiene nombre corto.', 'La StorageClass describe cómo se aprovisiona el almacenamiento de forma dinámica: el provisioner, la reclaim policy y el volume binding mode.'),
  D('08-pv', 8, 'Lista los PersistentVolumes con su estado y el claim que los usa.', 'kubectl get pv',
    'Es un recurso cluster-scoped: no lleva namespace.', 'El PV es el recurso de almacenamiento del clúster (no pertenece a ningún namespace); el PVC es la petición de un namespace.'),
  D('08-pvc', 8, 'Lista los PersistentVolumeClaims de lab-08.', 'kubectl get pvc -n lab-08',
    'Este sí es namespaced.', 'El Pod monta el PVC y no sabe nada del disco real: esa separación entre quien pide y quien provee es la idea central del almacenamiento en Kubernetes.'),
  D('08-describe-pvc', 8, 'El PVC datos de lab-08 sigue Pending: lee sus eventos para saber por qué.', 'kubectl describe pvc datos -n lab-08',
    'Los eventos de un objeto salen al final de su descripción.', 'Con WaitForFirstConsumer un PVC queda Pending a propósito hasta que un Pod lo usa: así el volumen se crea en el nodo donde cae el Pod.'),
  D('08-volname', 8, 'Muestra solo el nombre del PV enlazado al PVC datos de lab-08.', 'kubectl get pvc datos -n lab-08 -o jsonpath={.spec.volumeName}',
    'Un campo de spec, con jsonpath.', 'El enlace entre PVC y PV es uno a uno: spec.volumeName del PVC apunta al PV, y el claimRef del PV apunta de vuelta.'),
  D('08-sts', 8, 'Lista los StatefulSets de lab-08.', 'kubectl get sts -n lab-08',
    'Un get; el tipo tiene nombre corto.', 'El StatefulSet da a cada Pod un nombre estable (db-0, db-1) y su propio PVC mediante volumeClaimTemplates.'),
  D('08-df', 8, 'Comprueba qué está montado en /datos dentro del pod app de lab-08.', 'kubectl exec app -n lab-08 -- df -h /datos',
    'Un comando de Linux ejecutado dentro del contenedor.', 'Ver el volumen montado desde dentro confirma la cadena completa: Pod, volumeMount, PVC, PV y disco.'),

  // 09 · Troubleshooting
  D('09-describe', 9, 'El pod api de lab-09 no arranca: lee sus condiciones, su Last State y sus eventos.', 'kubectl describe pod api -n lab-09',
    'El primer comando de cualquier diagnóstico tras get.', 'get dice qué pasa (el estado); describe dice por qué (los eventos). ImagePullBackOff, FailedScheduling y OOMKilled se leen ahí.'),
  D('09-yaml', 9, 'Muestra el objeto completo del pod api de lab-09 en YAML.', 'kubectl get pod api -n lab-09 -o yaml',
    'get con el formato de salida completo.', 'En status.containerStatuses están state, lastState y el exitCode (137 es OOMKilled o SIGKILL): es lo que describe resume.'),
  D('09-events-for', 9, 'Con el comando events, muestra solo los eventos del pod api de lab-09.', ['kubectl events --for pod/api -n lab-09', 'kubectl events --for pods/api -n lab-09'],
    'events tiene un flag para limitarse a un objeto, escrito TIPO/NOMBRE.', 'Los eventos se guardan aparte del objeto y caducan (una hora por defecto): si llegas tarde, ya no están.'),
  D('09-logs-label', 9, 'Muestra las últimas 20 líneas de log de todos los pods con la label app=shop en lab-09, indicando de qué pod viene cada línea.', 'kubectl logs -l app=shop --prefix --tail=20 -n lab-09',
    'logs acepta un selector en lugar de un nombre; un flag antepone el origen y otro limita las líneas.', 'Con varias réplicas el error puede estar en una sola: el selector las lee todas y --prefix dice de cuál viene cada línea.'),
  D('09-logs-f', 9, 'Sigue en vivo los logs del contenedor worker del pod worker, en lab-09.', 'kubectl logs worker -c worker -f -n lab-09',
    'El contenedor se elige con un flag y el seguimiento con otro.', 'kubectl logs solo ve stdout y stderr del contenedor: si la aplicación escribe en un archivo, hace falta un sidecar o un agente de logs.'),
  D('09-debug', 9, 'Añade al pod api de lab-09 un contenedor efímero interactivo con busybox:1.37 que apunte al contenedor api.', 'kubectl debug -it api --image=busybox:1.37 --target=api -n lab-09',
    'El verbo es debug; necesita la imagen de las herramientas y el contenedor objetivo.', 'Las imágenes mínimas no traen shell: un contenedor efímero añade las herramientas a un Pod que ya corre, sin reiniciarlo.'),
  D('09-top', 9, 'Lista los pods de lab-09 ordenados por consumo de memoria.', 'kubectl top pods --sort-by=memory -n lab-09',
    'top con un flag de orden.', 'Comparar el uso real con el limit explica los OOMKilled: superar el limit de memoria mata el contenedor; superar el de CPU solo lo frena.'),
  D('09-node', 9, 'Revisa las condiciones y los recursos asignados del nodo kcna-worker.', 'kubectl describe node kcna-worker',
    'El detalle de un nodo.', 'Las condiciones del nodo (Ready, MemoryPressure, DiskPressure) las informa el kubelet; Allocated resources suma los requests de sus Pods.'),

  // 10 · Arquitectura cloud native
  D('10-autoscale', 10, 'Crea un HPA para el Deployment php-apache de lab-10: entre 2 y 5 réplicas, con un objetivo de CPU del 50 %.', ['kubectl autoscale deployment php-apache --min=2 --max=5 --cpu=50% -n lab-10', 'kubectl autoscale deployment php-apache --min=2 --max=5 --cpu-percent=50 -n lab-10'],
    'El verbo es autoscale: mínimo, máximo y objetivo de CPU.', 'El HPA escala en horizontal (más Pods) comparando el uso con los requests: sin requests de CPU no puede calcular el porcentaje.'),
  D('10-hpa-w', 10, 'Observa en vivo los HPA de lab-10.', 'kubectl get hpa -w -n lab-10',
    'get con el flag que deja la consulta abierta.', '-w abre un watch contra el API server, el mismo mecanismo que usan los controladores para reaccionar a los cambios.'),
  D('10-describe-hpa', 10, 'Lee las condiciones y los eventos de reescalado del HPA php-apache de lab-10.', 'kubectl describe hpa php-apache -n lab-10',
    'El detalle del objeto.', 'El HPA es un bucle de control más: mide, compara con el objetivo y ajusta spec.replicas del Deployment.'),
  D('10-top', 10, 'Muestra el consumo actual de los pods de lab-10.', 'kubectl top pods -n lab-10',
    'El verbo de métricas.', 'top y el HPA beben de la misma fuente: metrics-server y la Metrics API. Sin metrics-server, ninguno de los dos funciona.'),
  D('10-version', 10, 'Muestra la versión del cliente kubectl y la del servidor.', 'kubectl version',
    'Un comando sin argumentos.', 'Kubernetes versiona como MAJOR.MINOR.PATCH, con unas tres versiones menores al año; kubectl admite una menor de diferencia con el servidor.'),
  D('10-api-versions', 10, 'Lista los grupos y versiones de API que sirve el clúster.', 'kubectl api-versions',
    'Parecido a api-resources, pero de versiones.', 'Una API pasa por alpha, beta y stable (v1): las beta ya no vienen activas por defecto y lo estable no rompe compatibilidad.'),

  // 11 · Observabilidad
  D('11-repo-add', 11, 'Añade a Helm el repositorio prometheus-community, que está en https://prometheus-community.github.io/helm-charts.', 'helm repo add prometheus-community https://prometheus-community.github.io/helm-charts',
    'helm repo, con un nombre local y la URL.', 'Un repositorio de Helm es un índice de charts. Prometheus (proyecto graduado de la CNCF) se instala casi siempre así.'),
  D('11-install', 11, 'Instala en lab-11 el chart prometheus-community/prometheus como release prometheus, con los valores de prometheus-values.yaml.', 'helm install prometheus prometheus-community/prometheus -n lab-11 -f prometheus-values.yaml',
    'helm install RELEASE CHART, más el namespace y el archivo de valores.', 'Chart es el paquete; release, una instalación de ese chart con unos valores. Prometheus recoge métricas por pull: es él quien va a buscarlas.'),
  D('11-list', 11, 'Lista las releases de Helm en lab-11.', ['helm list -n lab-11', 'helm ls -n lab-11'],
    'El listado de helm, con namespace.', 'Helm guarda el estado de cada release en Secrets del propio namespace: por eso las releases son por namespace.'),
  D('11-pf', 11, 'Abre la interfaz de Prometheus: túnel del puerto 9090 de tu PC al 80 del Service prometheus-server de lab-11.', 'kubectl port-forward svc/prometheus-server 9090:80 -n lab-11',
    'port-forward TIPO/NOMBRE LOCAL:REMOTO.', 'En la interfaz se consulta con PromQL. Las métricas son una de las tres señales de la observabilidad, junto con logs y trazas.'),
  D('11-top-cpu', 11, 'Lista los pods de lab-11 ordenados por consumo de CPU.', 'kubectl top pods --sort-by=cpu -n lab-11',
    'El verbo de métricas, con el flag que ordena el resultado.', 'metrics-server solo guarda el valor actual, para el HPA y para top; el histórico y las alertas son trabajo de Prometheus.'),
  D('11-uninstall', 11, 'Desinstala la release prometheus de lab-11.', 'helm uninstall prometheus -n lab-11',
    'Lo contrario de install.', 'uninstall borra todos los objetos que creó la release: una ventaja de empaquetar frente a aplicar manifiestos sueltos.'),

  // 12 · Application delivery
  D('12-kustomize', 12, 'Renderiza el overlay overlays/dev sin aplicarlo al clúster.', 'kubectl kustomize overlays/dev',
    'kubectl trae un subcomando con el nombre de la herramienta.', 'Kustomize no usa plantillas: parte de una base y le aplica parches por entorno (overlays). Renderizar antes de aplicar enseña el YAML final.'),
  D('12-apply-k', 12, 'Aplica al clúster la kustomization de overlays/prod.', 'kubectl apply -k overlays/prod',
    'apply, con el flag de kustomize en lugar de -f.', '-k renderiza y aplica en un paso; Kustomize viene integrado en kubectl, sin instalar nada más.'),
  D('12-template', 12, 'Renderiza a YAML el chart ./saludo como release saludo, sin instalar nada.', 'helm template saludo ./saludo',
    'helm tiene un subcomando solo para renderizar.', 'Helm sí usa plantillas (Go templates más values). template enseña lo que se enviaría al clúster, sin crear ninguna release.'),
  D('12-install', 12, 'Instala el chart ./saludo como release saludo en lab-12.', 'helm install saludo ./saludo -n lab-12',
    'helm install RELEASE CHART y el namespace.', 'La instalación crea la revisión 1 de la release. Cada upgrade o rollback añade una revisión nueva.'),
  D('12-upgrade', 12, 'Actualiza la release saludo de lab-12 con el chart ./saludo y los valores de values-v2.yaml.', 'helm upgrade saludo ./saludo -n lab-12 -f values-v2.yaml',
    'upgrade con los mismos argumentos que install, más el archivo de valores.', 'upgrade calcula la diferencia y la aplica; por debajo es un rolling update normal del Deployment.'),
  D('12-history', 12, 'Muestra el historial de revisiones de la release saludo en lab-12.', 'helm history saludo -n lab-12',
    'Un subcomando de helm con el nombre de la release.', 'Helm versiona la release completa, con todos sus objetos; kubectl rollout history solo versiona un Deployment.'),
  D('12-rollback', 12, 'Devuelve la release saludo de lab-12 a la revisión 1.', 'helm rollback saludo 1 -n lab-12',
    'rollback RELEASE REVISIÓN.', 'El rollback no borra historia: crea una revisión nueva con el contenido de la antigua.'),
  D('12-apps', 12, 'Lista las Applications de Argo CD, que viven en el namespace argocd.', ['kubectl get applications -n argocd', 'kubectl get application -n argocd', 'kubectl get applications.argoproj.io -n argocd'],
    'Una Application es un recurso más (un CRD): se lista con get.', 'En GitOps el estado deseado vive en Git y un agente dentro del clúster (Argo CD, Flux) lo reconcilia por pull. La Application es el CRD que lo declara.'),
];

/** Paso del laboratorio guiado (### N del módulo) en el que el alumno acaba de usar un comando de la misma forma.
 *  Ahí aparece el ejercicio, para escribirlo de memoria con el paso tapado. Los que no figuran solo salen en la
 *  sección del módulo y en /comandos. El prebuild comprueba que el paso existe y contiene un comando con ese verbo. */
export const PASO: Record<string, number> = {
  '01-run': 2, '01-logs': 3, '01-ps-a': 6, '01-build': 7, '01-history': 8, '01-load': 11,
  '02-nodes-wide': 2, '02-system': 3, '02-cluster-info': 7, '02-events': 8, '02-api-resources': 11, '02-explain': 11, '02-contexts': 12, '02-use-context': 12,
  '03-run': 2, '03-selector': 3, '03-status': 7, '03-set-image': 8, '03-undo': 9, '03-dry-run': 10,
  '04-columnas': 2, '04-failed': 3, '04-label-node': 4, '04-unlabel': 4, '04-taint': 7, '04-untaint': 7, '04-ds': 10,
  '05-whoami': 2, '05-can-i': 5, '05-psa': 9,
  '06-dns': 4, '06-resolv': 4, '06-eps': 6, '06-ingress': 9,
  '07-sidecar': 2, '07-logs-c': 4,
  '08-sc': 1, '08-pvc': 3, '08-describe-pvc': 3, '08-pv': 4,
  '09-describe': 4, '09-logs-label': 7, '09-debug': 10, '09-top': 12, '09-node': 13,
  '10-hpa-w': 3, '10-describe-hpa': 5, '10-top': 5, '10-api-versions': 7,
  '11-repo-add': 2, '11-install': 4, '11-pf': 5,
  '12-kustomize': 3, '12-apply-k': 4, '12-template': 8, '12-install': 9, '12-upgrade': 10, '12-history': 11, '12-rollback': 12, '12-apps': 16,
};
export const drillsAt = (mod: number, paso: number) => DRILLS.filter((d) => d.mod === mod && PASO[d.id] === paso);
export const drillsOf = (mod: number) => DRILLS.filter((d) => d.mod === mod);
/** Clave del ejercicio en progress.quiz (comparte la repetición espaciada de las preguntas) */
export const drillKey = (d: Drill) => `cmd:${d.id}`;
