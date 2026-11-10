// Guías de los diagramas Mermaid de los módulos: convierten un dibujo estático en algo que se recorre y,
// después, se completa de memoria. Enhance.svelte monta DiagramaGuia.svelte sobre cada diagrama que tiene guía.
//   n          posición del diagrama dentro del módulo (0 = el primero), en el orden del markdown.
//   recorrido  (flowchart) pasos: qué nodos se iluminan (ids del diagrama: API, ETCD...) y qué se explica.
//   huecos     (flowchart) nodos que se vacían en "Completar de memoria"; `pista` describe la función del componente,
//              que es lo que pregunta el examen. Varios nodos con la misma etiqueta van juntos (kubelet de cada nodo).
//   distractores  opciones falsas añadidas a las etiquetas de los huecos.
//   secuencia  (sequenceDiagram) "Predecir el orden": antes de mostrar cada mensaje se pregunta qué componente actúa.
//              No necesita más contenido: sale del propio diagrama.
//   opcion     (hueco) texto de la opción correcta cuando la etiqueta del nodo es larga o delata la respuesta.
//   pistas     (secuencia) contexto que acompaña a la pregunta de cada mensaje; si se dan, una por mensaje.
//   pregunta   (secuencia) 'destino' pregunta a quién se dirige el mensaje en vez de quién lo envía: sirve cuando
//              casi todos los mensajes salen del mismo participante y lo que importa es el orden de los destinatarios.
// Un subgrafo citado por su id (en un foco o en un hueco) se comporta como un nodo: se resalta, se vacía y recibe flechas.
// El texto de aquí es contenido del curso: se verifica igual que los módulos (docs/VERIFICACION-GUIA.md).
// scripts/validar-diagramas.mjs comprueba en el prebuild que cada guía apunta a un diagrama y a nodos que existen.
export interface Paso { foco: string[]; texto: string }
export interface Hueco { nodos: string[]; pista: string; opcion?: string }
export interface Guia { mod: string; n: number; titulo: string; recorrido?: Paso[]; huecos?: Hueco[]; distractores?: string[]; secuencia?: boolean; pistas?: string[]; pregunta?: 'destino' }

export const GUIAS: Guia[] = [
  {
    mod: '01', n: 0, titulo: 'Contenedor frente a máquina virtual',
    recorrido: [
      { foco: ['HW1', 'H'], texto: 'En el mundo de las máquinas virtuales, un hipervisor (Hyper-V, KVM, VMware) simula CPU, disco y red: lo que se virtualiza es el hardware.' },
      { foco: ['H', 'G1', 'G2'], texto: 'Sobre ese hardware simulado, cada máquina virtual arranca un sistema operativo completo, con su propio kernel. Por eso una VM suele pesar gigabytes y tarda en arrancar.' },
      { foco: ['G1', 'A1', 'G2', 'A2'], texto: 'Cada aplicación corre sobre su propio sistema invitado. El aislamiento es muy fuerte, porque la frontera es el hipervisor, y el invitado puede ser un sistema distinto del host.' },
      { foco: ['HW2', 'K'], texto: 'Con contenedores hay un solo kernel, el del host, y lo comparten todos. Lo que se virtualiza es el sistema operativo, no el hardware.' },
      { foco: ['K', 'R'], texto: 'El runtime de contenedores no simula ninguna máquina: pide al kernel que aísle procesos con namespaces (lo que cada proceso ve) y cgroups (cuántos recursos puede usar).' },
      { foco: ['R', 'C1', 'C2'], texto: 'Cada contenedor lleva solo la aplicación y sus librerías, sin kernel propio: pesa megabytes y arranca en segundos. A cambio, el aislamiento es más débil (un fallo del kernel afecta a todos) y un contenedor Linux necesita un kernel Linux.' },
    ],
    huecos: [
      { nodos: ['H'], pista: 'Simula el hardware para que cada máquina arranque su propio sistema operativo.' },
      { nodos: ['G1', 'G2'], pista: 'Lo que cada máquina virtual trae entero y un contenedor no lleva.' },
      { nodos: ['K'], pista: 'El núcleo del sistema operativo: hay uno solo, el del host, y ningún contenedor trae el suyo.' },
      { nodos: ['R'], pista: 'Crea los contenedores pidiendo al kernel que aísle procesos; no simula hardware.' },
    ],
    distractores: ['kubelet', 'Registry'],
  },
  {
    mod: '01', n: 1, titulo: 'Las capas de una imagen',
    recorrido: [
      { foco: ['L1'], texto: 'Una imagen es una pila de capas de solo lectura. Abajo está la base (aquí, Alpine); cada capa guarda los cambios de archivos respecto de la anterior.' },
      { foco: ['L1', 'L2'], texto: 'Las instrucciones del Dockerfile que modifican archivos (RUN, COPY, ADD) añaden capas. Las de metadatos (ENV, LABEL, EXPOSE, CMD) solo cambian la configuración de la imagen.' },
      { foco: ['L2', 'L3'], texto: 'Nuestro COPY web/ añade una capa más, también de solo lectura. Las capas se identifican por el hash de su contenido: si varias imágenes comparten las de abajo, el nodo las descarga y las guarda una sola vez.' },
      { foco: ['L3', 'RW'], texto: 'Al arrancar un contenedor, el runtime monta las capas de la imagen y añade encima una capa escribible propia de ese contenedor (copy-on-write). Al borrar el contenedor, esa capa se pierde: por eso los datos que deben durar van en volúmenes.' },
    ],
    huecos: [
      { nodos: ['L1'], opcion: 'Capa base de la imagen', pista: 'Primera capa de la pila; varias imágenes pueden compartirla y el nodo la guarda una sola vez.' },
      { nodos: ['RW'], opcion: 'Capa escribible del contenedor', pista: 'No pertenece a la imagen: se crea al arrancar el contenedor y desaparece con él.' },
    ],
    distractores: ['Volumen persistente', 'Manifiesto de la imagen'],
  },
  {
    mod: '01', n: 2, titulo: 'Runtimes: quién hace qué',
    recorrido: [
      { foco: ['K', 'CD'], texto: 'El kubelet no ejecuta contenedores: se lo pide a un runtime de alto nivel (containerd o CRI-O) a través de CRI, una API gRPC. Cualquier runtime que implemente CRI sirve para Kubernetes.' },
      { foco: ['CD'], texto: 'El runtime de alto nivel descarga y almacena las imágenes, prepara el sistema de archivos y gestiona el ciclo de vida de los contenedores.' },
      { foco: ['CD', 'RC'], texto: 'Para crear cada contenedor llama a un runtime de bajo nivel (runc o crun), que sigue la runtime-spec de OCI.' },
      { foco: ['RC', 'P'], texto: 'El runtime de bajo nivel crea el proceso aislado con namespaces y cgroups. Un contenedor en marcha es eso: un proceso del host, aislado por el kernel.' },
      { foco: ['CRICTL', 'CD'], texto: 'crictl habla la misma API CRI que el kubelet, así que sirve para depurar en el nodo lo que ve el runtime. Docker Engine no implementa CRI: desde que se eliminó dockershim (v1.24), Kubernetes solo puede usarlo con el adaptador cri-dockerd. Las imágenes construidas con Docker siguen funcionando, porque son imágenes OCI.' },
    ],
    huecos: [
      { nodos: ['K'], pista: 'Agente del nodo que pide los contenedores hablando CRI; no los ejecuta él.' },
      { nodos: ['CD'], opcion: 'containerd o CRI-O', pista: 'Runtime de alto nivel: implementa CRI, descarga imágenes y gestiona el ciclo de vida.' },
      { nodos: ['RC'], pista: 'Runtime de bajo nivel (OCI): crea el proceso aislado con namespaces y cgroups.' },
      { nodos: ['CRICTL'], opcion: 'crictl', pista: 'Herramienta de depuración que habla CRI directamente con el runtime del nodo.' },
    ],
    distractores: ['dockershim', 'kube-proxy'],
  },
  {
    mod: '02', n: 0, titulo: 'Componentes del clúster',
    recorrido: [
      { foco: ['U', 'API'], texto: 'Todo entra por el kube-apiserver. kubectl, Headlamp o un pipeline de CI le hablan por HTTPS (puerto 6443); ningún otro componente recibe órdenes desde fuera.' },
      { foco: ['API', 'ETCD'], texto: 'El API server es el único que lee y escribe en etcd, el almacén clave-valor donde vive todo el estado del clúster. Los demás componentes nunca tocan etcd directamente.' },
      { foco: ['SCH', 'API'], texto: 'El kube-scheduler observa los Pods que aún no tienen nodo y decide en cuál irá cada uno. No arranca nada: anota su decisión a través del API server.' },
      { foco: ['CM', 'API'], texto: 'El kube-controller-manager ejecuta los bucles de control (Deployment, ReplicaSet, Node...): comparan el estado deseado con el real y corrigen la diferencia, siempre a través del API server.' },
      { foco: ['CCM', 'API'], texto: 'El cloud-controller-manager solo existe en nubes: conecta el clúster con la API del proveedor (balanceadores, nodos, rutas). En un clúster local como el del curso no hace falta.' },
      { foco: ['KL1', 'KL2', 'API'], texto: 'En cada nodo, el kubelet observa qué Pods le han asignado, se encarga de que sus contenedores estén en marcha e informa de su estado al API server.' },
      { foco: ['KL1', 'CR1', 'P1', 'KL2', 'CR2', 'P2'], texto: 'El kubelet no ejecuta contenedores por sí mismo: se lo pide al container runtime (containerd) a través de la interfaz CRI.' },
      { foco: ['KP1', 'KP2', 'API'], texto: 'kube-proxy, también en cada nodo, mantiene las reglas de red que hacen que la IP de un Service llegue a los Pods que hay detrás.' },
    ],
    huecos: [
      { nodos: ['API'], pista: 'Única puerta de entrada al clúster y único componente que habla con etcd.' },
      { nodos: ['ETCD'], pista: 'Almacén clave-valor consistente donde se guarda todo el estado del clúster.' },
      { nodos: ['SCH'], pista: 'Decide en qué nodo va cada Pod nuevo.' },
      { nodos: ['CM'], pista: 'Ejecuta los bucles de control que llevan el estado real al deseado (Deployments, ReplicaSets, nodos).' },
      { nodos: ['KL1', 'KL2'], pista: 'Agente de cada nodo: se asegura de que los contenedores de sus Pods estén en marcha e informa de su estado.' },
      { nodos: ['CR1', 'CR2'], pista: 'Es quien de verdad descarga imágenes y arranca contenedores; el kubelet le habla por CRI.' },
      { nodos: ['KP1', 'KP2'], pista: 'Mantiene en cada nodo las reglas de red de los Services.' },
    ],
    distractores: ['CoreDNS', 'kubectl'],
  },
  { mod: '02', n: 1, titulo: 'Del kubectl apply al contenedor en marcha', secuencia: true },
  {
    mod: '02', n: 2, titulo: 'El bucle de reconciliación',
    recorrido: [
      { foco: ['O'], texto: 'Un controlador empieza observando: mira, a través del API server, cómo está el clúster ahora mismo.' },
      { foco: ['D'], texto: 'Lo compara con el estado deseado, el spec que tú declaraste.' },
      { foco: ['D', 'O'], texto: 'Si coinciden, no hace nada y sigue observando.' },
      { foco: ['D', 'A', 'O'], texto: 'Si no coinciden, actúa (crea, borra o actualiza objetos) y vuelve a observar. El bucle nunca termina: por eso un Pod de un Deployment reaparece cuando lo borras.' },
    ],
    huecos: [
      { nodos: ['O'], pista: 'Primer paso de cada vuelta: saber cómo está el clúster ahora.' },
      { nodos: ['D'], pista: 'La pregunta que el controlador se hace en cada vuelta.' },
      { nodos: ['A'], pista: 'Lo que hace el controlador cuando el estado real no es el deseado.' },
    ],
    distractores: ['Esperar la orden del usuario', 'Reiniciar el clúster'],
  },
  {
    mod: '03', n: 1, titulo: 'Deployment, ReplicaSets y Pods',
    recorrido: [
      { foco: ['D'], texto: 'Tú declaras el Deployment: cuántas réplicas quieres y con qué plantilla de Pod (aquí, la imagen 1.28). El Deployment no crea Pods directamente.' },
      { foco: ['D', 'RS2'], texto: 'Por cada versión de la plantilla, el Deployment crea un ReplicaSet. El de la versión actual (revisión 2, imagen 1.28) tiene las 3 réplicas.' },
      { foco: ['RS2', 'P1', 'P2', 'P3'], texto: 'Es el ReplicaSet quien crea los Pods y mantiene su número: si borras uno, crea otro para volver a tener 3.' },
      { foco: ['D', 'RS1'], texto: 'Al cambiar la imagen de 1.27 a 1.28, el Deployment fue pasando réplicas del ReplicaSet viejo al nuevo (RollingUpdate). El viejo se conserva con 0 réplicas para poder volver atrás con kubectl rollout undo; se guardan 10 revisiones por defecto (revisionHistoryLimit).' },
      { foco: ['D', 'RS1', 'RS2'], texto: 'Solo un cambio en la plantilla de Pods (spec.template) crea un ReplicaSet y una revisión nuevos. Escalar, es decir, cambiar replicas, no crea ninguna revisión.' },
    ],
    huecos: [
      { nodos: ['D'], opcion: 'Deployment', pista: 'El objeto que tú declaras: crea un ReplicaSet por cada versión de la plantilla y va pasando las réplicas del viejo al nuevo.' },
      { nodos: ['RS2'], opcion: 'ReplicaSet de la revisión actual', pista: 'Mantiene en marcha el número de Pods de la versión que está sirviendo ahora.' },
      { nodos: ['RS1'], opcion: 'ReplicaSet de la revisión anterior', pista: 'Se queda con 0 réplicas: existe para poder volver atrás.' },
      { nodos: ['P1', 'P2', 'P3'], opcion: 'Pod', pista: 'Donde corren los contenedores; lo crea un ReplicaSet, no el Deployment directamente.' },
    ],
    distractores: ['StatefulSet', 'Service'],
  },
  {
    mod: '04', n: 0, titulo: 'El trabajo del scheduler',
    recorrido: [
      { foco: ['U', 'API', 'ETCD'], texto: 'Creas un Pod y el API server lo guarda en etcd con spec.nodeName vacío: todavía no tiene nodo.' },
      { foco: ['S', 'API'], texto: 'El kube-scheduler vigila, a través del API server, los Pods que aún no tienen nodo asignado.' },
      { foco: ['S'], texto: 'Primero filtra: descarta los nodos donde el Pod no puede correr (requests que no caben, nodeSelector o affinity obligatoria que no se cumplen, taints NoSchedule sin tolerar). Si no queda ninguno, el Pod sigue Pending con un evento FailedScheduling.' },
      { foco: ['S'], texto: 'Después puntúa los nodos que pasaron el filtro y se queda con el de mayor puntuación. Para decidir mira los requests de los Pods, no el consumo real del nodo.' },
      { foco: ['S', 'API'], texto: 'Por último hace el binding: comunica al API server el nodo elegido, que queda anotado en spec.nodeName. Ahí termina su trabajo; el scheduler no arranca nada.' },
      { foco: ['K', 'API', 'CRI'], texto: 'El kubelet de ese nodo ve que le han asignado un Pod y pide al container runtime (containerd) que arranque los contenedores.' },
    ],
    huecos: [
      { nodos: ['ETCD'], opcion: 'etcd', pista: 'Donde queda guardado el Pod, al principio sin nodo asignado.' },
      { nodos: ['S'], pista: 'Filtra, puntúa y asigna un nodo a cada Pod nuevo; no arranca contenedores.' },
      { nodos: ['API'], pista: 'Por él pasan todos: el que vigila Pods sin nodo y el agente que espera los suyos.' },
      { nodos: ['K'], opcion: 'kubelet', pista: 'En el nodo elegido, ve que le han asignado un Pod y lo pone en marcha.' },
      { nodos: ['CRI'], opcion: 'containerd', pista: 'Arranca de verdad los contenedores cuando se lo pide el agente del nodo.' },
    ],
    distractores: ['kube-controller-manager', 'kube-proxy'],
  },
  {
    mod: '04', n: 1, titulo: 'Taints y node affinity: nodo dedicado',
    recorrido: [
      { foco: ['P2', 'W2'], texto: 'El nodo kcna-worker2 tiene el taint dedicado=batch:NoSchedule. El Pod web no lo tolera, así que el scheduler no lo coloca allí: un taint mantiene fuera a los Pods ajenos.' },
      { foco: ['P2', 'W1', 'O'], texto: 'El Pod web acaba en un nodo sin taint, como kcna-worker.' },
      { foco: ['P1', 'W2', 'B'], texto: 'El Pod batch lleva la toleration, así que puede entrar en kcna-worker2. Pero una toleration solo permite, no obliga: con ella sola, el Pod también podría caer en kcna-worker.' },
      { foco: ['P1', 'W2', 'B'], texto: 'Por eso lleva además node affinity hacia zona-b: ahora solo puede ir a kcna-worker2. Taint y toleration, para que no entre nadie más; node affinity, para que tus Pods no vayan a otro sitio. Juntos dan un nodo dedicado de verdad.' },
    ],
  },
  {
    mod: '04', n: 2, titulo: '¿Qué herramienta de scheduling uso?',
    recorrido: [
      { foco: ['Q', 'A', 'NS'], texto: 'Si tu Pod debe ir a ciertos nodos y la regla es una simple igualdad de labels, basta nodeSelector.' },
      { foco: ['Q', 'A', 'NA'], texto: 'Si necesitas más expresividad (operadores como In, NotIn o Exists, o reglas preferidas en lugar de obligatorias), usa node affinity.' },
      { foco: ['Q', 'T'], texto: 'Si lo que quieres es reservar nodos para algunos Pods, pon un taint en el nodo y una toleration en esos Pods. El taint repele; la toleration solo permite entrar.' },
      { foco: ['Q', 'C'], texto: 'Para un nodo dedicado de verdad, combina las dos cosas: taint y toleration (no entra nadie más) y node affinity (tus Pods no van a otro sitio).' },
      { foco: ['Q', 'PA'], texto: 'Si la regla depende de otros Pods y no de los nodos (junto a la caché, lejos de otra réplica), es pod affinity o anti-affinity.' },
      { foco: ['Q', 'TS'], texto: 'Para repartir las réplicas de forma equilibrada entre zonas o nodos, topologySpreadConstraints.' },
      { foco: ['Q', 'DS'], texto: 'Y si quieres una copia del Pod en cada nodo (un agente de logs o de red), no es una regla de scheduling: es un DaemonSet.' },
    ],
  },
  {
    mod: '05', n: 0, titulo: 'Las 4C de la seguridad',
    recorrido: [
      { foco: ['Cloud'], texto: 'La capa exterior es la nube o el centro de datos: red y firewalls, IAM del proveedor, acceso físico a las máquinas. Todo lo demás corre encima de ella.' },
      { foco: ['Cluster'], texto: 'Dentro está el clúster: proteger el API server (autenticación, RBAC, admission), NetworkPolicies, cifrado de los Secrets en etcd y auditoría.' },
      { foco: ['Container'], texto: 'Después, el contenedor: imágenes mínimas y de registries de confianza, escaneo de vulnerabilidades y securityContext para no ejecutar como root ni con privilegios.' },
      { foco: ['Code'], texto: 'En el centro, el código: dependencias sin vulnerabilidades conocidas, TLS entre servicios y ningún secreto escrito en el código.' },
      { foco: ['Cloud', 'Cluster', 'Container', 'Code'], texto: 'Cada capa depende de las de fuera: un código impecable no protege si alguien tiene acceso root al servidor. Es el modelo clásico; la documentación actual de Kubernetes organiza la seguridad por fases del ciclo de vida (Develop, Distribute, Deploy, Runtime).' },
    ],
    huecos: [
      { nodos: ['Cloud'], opcion: 'Cloud', pista: 'Capa exterior: firewalls, IAM del proveedor y acceso físico a las máquinas.' },
      { nodos: ['Cluster'], opcion: 'Cluster', pista: 'Capa de Kubernetes en sí: autenticación y RBAC, admission, NetworkPolicies y cifrado de los Secrets en etcd.' },
      { nodos: ['Container'], opcion: 'Container', pista: 'Capa de la imagen y el runtime: imagen mínima, no ejecutar como root, sin privilegios.' },
      { nodos: ['Code'], opcion: 'Code', pista: 'Capa central: dependencias sin vulnerabilidades conocidas, TLS entre servicios, sin secretos incrustados.' },
    ],
    distractores: ['Compliance', 'Compute'],
  },
  {
    mod: '05', n: 1, titulo: 'El viaje de una petición al API server',
    recorrido: [
      { foco: ['C', 'AN'], texto: 'Toda petición llega al API server por HTTPS y lo primero es la autenticación: ¿quién eres? Certificado de cliente, token de ServiceAccount, OIDC... De la credencial salen el usuario y sus grupos.' },
      { foco: ['AN', 'R401'], texto: 'Si ninguna credencial es válida, la petición se rechaza con 401 Unauthorized.' },
      { foco: ['AN', 'AZ'], texto: 'Con la identidad se pasa a la autorización: ¿puede este sujeto hacer este verbo sobre este recurso? Lo habitual es que lo decida RBAC.' },
      { foco: ['AZ', 'R403'], texto: 'Si ningún autorizador lo permite, la respuesta es 403 Forbidden: se sabe quién eres, pero no tienes permiso.' },
      { foco: ['AZ', 'AD'], texto: 'Lo autorizado pasa por el admission control: primero los controladores que mutan el objeto y después los que lo validan. Actúa al crear, modificar o borrar objetos; las lecturas (get, list, watch) no pasan por él.' },
      { foco: ['AD', 'RAD'], texto: 'Si un controlador de admisión la rechaza, la petición falla con el motivo. Por ejemplo, Pod Security Admission responde «violates PodSecurity».' },
      { foco: ['AD', 'E'], texto: 'Solo lo que supera los tres controles se guarda en etcd.' },
    ],
    huecos: [
      { nodos: ['AN'], opcion: 'Autenticación', pista: 'Comprueba la credencial y obtiene de ella el usuario y sus grupos.' },
      { nodos: ['AZ'], opcion: 'Autorización', pista: 'Decide si ese sujeto puede hacer ese verbo sobre ese recurso; aquí actúa RBAC.' },
      { nodos: ['AD'], opcion: 'Admission control', pista: 'Último control: puede mutar el objeto y validarlo contra las reglas del clúster.' },
      { nodos: ['R401'], opcion: '401 Unauthorized', pista: 'Respuesta cuando la petición no se puede autenticar: la credencial presentada no es válida.' },
      { nodos: ['R403'], opcion: '403 Forbidden', pista: 'Respuesta cuando se sabe quién es, pero no tiene permiso.' },
    ],
    distractores: ['Scheduling', '404 Not Found'],
  },
  {
    mod: '05', n: 2, titulo: 'RBAC: roles y bindings',
    recorrido: [
      { foco: ['SA'], texto: 'El sujeto es la ServiceAccount lector del namespace lab-05. RBAC solo suma permisos: lo que no se concede explícitamente está prohibido.' },
      { foco: ['R'], texto: 'Un Role define permisos dentro de un namespace: aquí, get, list y watch sobre pods. No dice a quién se le dan.' },
      { foco: ['SA', 'RB', 'R'], texto: 'El RoleBinding une las dos cosas: concede ese Role a la ServiceAccount, y solo en el namespace del RoleBinding.' },
      { foco: ['CR'], texto: 'Los nodos no pertenecen a ningún namespace, así que un Role no puede dar permisos sobre ellos: hace falta un ClusterRole.' },
      { foco: ['SA', 'CRB', 'CR'], texto: 'El ClusterRoleBinding concede ese ClusterRole en todo el clúster. Un ClusterRole también puede concederse con un RoleBinding (y entonces vale solo en ese namespace); lo que no existe es un ClusterRoleBinding hacia un Role.' },
    ],
    huecos: [
      { nodos: ['SA'], opcion: 'ServiceAccount', pista: 'El sujeto: la identidad con la que un Pod habla con el API server.' },
      { nodos: ['R'], opcion: 'Role', pista: 'Lista de permisos (recursos y verbos) que solo vale dentro de un namespace.' },
      { nodos: ['RB'], opcion: 'RoleBinding', pista: 'Concede permisos a un sujeto dentro de un solo namespace.' },
      { nodos: ['CR'], opcion: 'ClusterRole', pista: 'Lista de permisos sin namespace; necesaria para recursos como los nodos.' },
      { nodos: ['CRB'], opcion: 'ClusterRoleBinding', pista: 'Concede permisos a un sujeto en todo el clúster.' },
    ],
    distractores: ['NetworkPolicy', 'Secret'],
  },
  {
    mod: '06', n: 0, titulo: 'De un Pod a otro en distinto nodo',
    recorrido: [
      { foco: ['P1'], texto: 'Cada Pod tiene su propia IP, tomada del rango de su nodo (podCIDR). Los contenedores del Pod la comparten y se hablan entre sí por localhost.' },
      { foco: ['P1', 'V1'], texto: 'El plugin CNI conecta el Pod a su nodo con un par de interfaces virtuales (veth): un extremo es el eth0 del Pod y el otro queda en el nodo.' },
      { foco: ['V1', 'R1'], texto: 'En el nodo, las rutas (o un bridge) saben a qué Pod local entregar cada paquete y por dónde sacar los que van a otros nodos.' },
      { foco: ['R1', 'R2'], texto: 'Entre nodos, el tráfico de los Pods viaja por la red de nodos: con enrutamiento directo o encapsulado en un overlay como VXLAN. Depende del plugin CNI.' },
      { foco: ['R2', 'V2', 'P2'], texto: 'El otro nodo lo entrega al Pod de destino. El Pod B ve como origen la IP real del Pod A: en el modelo de red de Kubernetes, los Pods se comunican entre sí sin NAT.' },
    ],
    huecos: [
      { nodos: ['V1', 'V2'], pista: 'Par de interfaces virtuales que une cada Pod con su nodo.' },
      { nodos: ['R1', 'R2'], pista: 'Llevan cada paquete, según su IP de destino, al Pod local o hacia el nodo donde está esa IP. Los Services no intervienen aquí.' },
    ],
    distractores: ['kube-proxy', 'CoreDNS'],
  },
  {
    mod: '06', n: 1, titulo: 'Un Service delante de sus Pods',
    recorrido: [
      { foco: ['P1', 'P2', 'P3'], texto: 'Los Pods son efímeros: mueren, se recrean en otro nodo y cambian de IP. No se puede depender de sus direcciones.' },
      { foco: ['S'], texto: 'Un Service da una identidad estable a un grupo de Pods: una IP virtual (ClusterIP), un nombre DNS y un puerto.' },
      { foco: ['S', 'P1', 'P2', 'P3'], texto: 'Qué Pods forman el grupo lo decide el selector de labels (app=whoami), no una lista fija: los Pods nuevos con esa label entran solos, y solo reciben tráfico los que están listos.' },
      { foco: ['C', 'S'], texto: 'El cliente usa el nombre y el puerto del Service (whoami:80). No necesita saber cuántos Pods hay ni dónde están.' },
      { foco: ['C', 'S', 'P1', 'P2', 'P3'], texto: 'Las conexiones se reparten entre los Pods de detrás. Un Service ClusterIP solo es alcanzable desde dentro del clúster; NodePort y LoadBalancer lo exponen hacia fuera.' },
    ],
    huecos: [
      { nodos: ['S'], opcion: 'Service', pista: 'Da una IP virtual y un nombre DNS estables a un grupo de Pods elegido por labels.' },
    ],
    distractores: ['Ingress', 'Deployment', 'NetworkPolicy'],
  },
  {
    mod: '06', n: 2, titulo: 'Gateway API: tres recursos, tres roles',
    recorrido: [
      { foco: ['GC'], texto: 'GatewayClass: la define el proveedor de infraestructura e indica qué controlador implementa los Gateways (aquí, Traefik). Es el análogo de IngressClass.' },
      { foco: ['GC', 'GW'], texto: 'Gateway: lo gestiona el operador del clúster. Es un punto de entrada concreto, con sus listeners (puerto, protocolo, TLS), y decide desde qué namespaces se le pueden enganchar rutas.' },
      { foco: ['GW', 'R1'], texto: 'HTTPRoute: la crea el equipo de la aplicación en su namespace. Contiene las reglas de enrutamiento: paths, cabeceras, pesos, redirecciones.' },
      { foco: ['GW', 'R2'], texto: 'Otros equipos enganchan sus propias rutas al mismo Gateway sin tocar las de los demás. Esa separación por roles es la gran diferencia con Ingress.' },
      { foco: ['R1', 'S1', 'P'], texto: 'La ruta envía el tráfico a un Service, y este a sus Pods. Si apuntara a un Service de otro namespace, el dueño de ese namespace tendría que permitirlo con un ReferenceGrant.' },
    ],
    huecos: [
      { nodos: ['GC'], opcion: 'GatewayClass', pista: 'Indica qué controlador implementa los Gateways; recurso de clúster que define el proveedor de infraestructura.' },
      { nodos: ['GW'], opcion: 'Gateway', pista: 'Punto de entrada con sus listeners; lo gestiona el operador del clúster.' },
      { nodos: ['R1', 'R2'], opcion: 'HTTPRoute', pista: 'Reglas de enrutamiento hacia Services; las escribe el equipo de la aplicación.' },
    ],
    distractores: ['IngressClass', 'ReferenceGrant'],
  },
  {
    mod: '06', n: 3, titulo: 'Dos caminos para entrar desde fuera',
    recorrido: [
      { foco: ['U', 'CP'], texto: 'Camino 1: el navegador llama a localhost:8080, que en este laboratorio está conectado al puerto 80 del nodo control-plane.' },
      { foco: ['CP', 'T'], texto: 'Ahí escucha Traefik, que hace a la vez de Ingress controller y de implementación de Gateway API.' },
      { foco: ['T', 'S'], texto: 'Traefik mira las reglas de Ingress o de HTTPRoute (host, path) y elige el Service de destino. Es enrutamiento HTTP, de capa 7.' },
      { foco: ['U', 'NP'], texto: 'Camino 2: un Service de tipo NodePort abre un puerto (aquí, el 30080) en todos los nodos, sin pasar por Traefik.' },
      { foco: ['NP', 'S'], texto: 'kube-proxy redirige (DNAT) lo que llega a ese puerto hacia los Pods del Service. Trabaja en capa 4: no entiende de hosts ni de paths.' },
      { foco: ['S', 'P1', 'P2'], texto: 'Por los dos caminos se llega al mismo sitio: el Service, que reparte entre sus Pods.' },
    ],
  },
  {
    mod: '08', n: 0, titulo: 'Por qué se pierden los datos de un contenedor',
    recorrido: [
      { foco: ['L1', 'L2', 'L3'], texto: 'La imagen son capas de solo lectura apiladas. Varios contenedores de la misma imagen las comparten.' },
      { foco: ['W'], texto: 'Al arrancar un contenedor, el runtime añade encima una capa escribible fina, propia de ese contenedor.' },
      { foco: ['W', 'L3'], texto: 'Si el contenedor modifica un archivo de la imagen, primero se copia a la capa escribible (copy-on-write). La imagen no cambia.' },
      { foco: ['W'], texto: 'Esa capa se borra con el contenedor. En Kubernetes los contenedores se reinician y los Pods se recrean a menudo: lo que no esté en un volumen se pierde.' },
    ],
  },
  {
    mod: '08', n: 1, titulo: 'Pod, PVC, PV y StorageClass',
    recorrido: [
      { foco: ['POD', 'PVC'], texto: 'El Pod no referencia el disco: referencia un PersistentVolumeClaim por su nombre (claimName). El PVC es la petición de almacenamiento y vive en el namespace del Pod.' },
      { foco: ['PVC'], texto: 'El PVC dice qué se necesita: tamaño (100Mi), modo de acceso (ReadWriteOnce) y clase (standard).' },
      { foco: ['SC', 'PV'], texto: 'Si no hay un PV disponible que encaje y la StorageClass tiene aprovisionador (aquí, local-path), este crea un PV nuevo: aprovisionamiento dinámico.' },
      { foco: ['PVC', 'PV'], texto: 'El PVC y el PV quedan enlazados uno a uno (binding): ese PV ya no sirve a ningún otro PVC. El PV es un recurso del clúster, sin namespace.' },
      { foco: ['PV', 'D'], texto: 'El PV representa el almacenamiento real: aquí, una carpeta en el nodo kcna-worker2; en la nube sería un disco del proveedor.' },
      { foco: ['POD', 'PVC', 'PV', 'D'], texto: 'Si el Pod se borra y se recrea, vuelve a montar el mismo PVC y encuentra sus datos: el almacenamiento vive aparte del Pod.' },
    ],
    huecos: [
      { nodos: ['PVC'], opcion: 'PersistentVolumeClaim (PVC)', pista: 'Petición de almacenamiento que hace el usuario en su namespace; es lo único que referencia el Pod.' },
      { nodos: ['PV'], opcion: 'PersistentVolume (PV)', pista: 'Pieza de almacenamiento del clúster, sin namespace, que se enlaza uno a uno con una petición.' },
      { nodos: ['SC'], opcion: 'StorageClass', pista: 'Define con qué aprovisionador se crean los volúmenes bajo demanda.' },
    ],
    distractores: ['ConfigMap', 'emptyDir'],
  },
  {
    mod: '09', n: 0, titulo: 'Diagnóstico de afuera hacia adentro',
    recorrido: [
      { foco: ['A'], texto: 'Empieza por kubectl get: ¿en qué estado está?, ¿en qué nodo?, ¿cuántos reinicios lleva? Funciona aunque el contenedor no haya arrancado.' },
      { foco: ['A', 'B'], texto: 'kubectl describe: condiciones y eventos recientes del objeto. Si el problema es anterior al arranque (scheduling, imagen, configuración), la respuesta suele estar aquí.' },
      { foco: ['B', 'C'], texto: 'kubectl get events (o kubectl events): la secuencia de lo ocurrido en todo el namespace, no solo en un objeto.' },
      { foco: ['C', 'D'], texto: 'kubectl logs: lo que imprimió la aplicación. Solo sirve si el contenedor llegó a ejecutarse; con --previous ves los logs de la instancia anterior, la que murió.' },
      { foco: ['D', 'E'], texto: 'kubectl exec: mirar desde dentro (red, archivos, variables). Necesita un contenedor en marcha.' },
      { foco: ['E', 'F'], texto: 'kubectl debug: cuando la imagen no trae herramientas, añade un contenedor efímero que sí las tiene, o crea una copia del Pod para investigarla.' },
    ],
    huecos: [
      { nodos: ['B'], opcion: 'kubectl describe', pista: 'Condiciones y eventos recientes de un objeto concreto.' },
      { nodos: ['D'], opcion: 'kubectl logs', pista: 'Lo que imprimió la aplicación; solo sirve si el contenedor llegó a ejecutarse.' },
      { nodos: ['E'], opcion: 'kubectl exec', pista: 'Ejecuta un comando dentro de un contenedor que está en marcha.' },
      { nodos: ['F'], opcion: 'kubectl debug', pista: 'Añade un contenedor efímero con herramientas que la imagen no trae.' },
    ],
    distractores: ['kubectl apply', 'kubectl top'],
  },
  {
    mod: '09', n: 1, titulo: 'De Pod creado a recibir tráfico',
    recorrido: [
      { foco: ['P', 'S', 'PE'], texto: 'Primera pregunta: ¿el scheduler encuentra un nodo? Si no, el Pod se queda Pending con un evento FailedScheduling (recursos que no caben, taints, affinity, un PVC sin enlazar).' },
      { foco: ['S', 'I', 'IP'], texto: 'Con nodo asignado, el kubelet necesita la imagen. Si no consigue descargarla: ErrImagePull y, mientras espera para reintentar, ImagePullBackOff (nombre o tag mal escritos, registry privado sin credenciales).' },
      { foco: ['I', 'C', 'CC'], texto: 'Con la imagen, falta la configuración. Si no existe un ConfigMap o un Secret que el contenedor usa en sus variables de entorno: CreateContainerConfigError. Si lo que falta es un volumen (incluido un ConfigMap o un Secret montado como volumen), el Pod se queda en ContainerCreating.' },
      { foco: ['C', 'R'], texto: 'Si todo existe, el contenedor arranca: Running.' },
      { foco: ['R', 'X', 'CL'], texto: 'Running no es el final. Si el proceso termina con error, lo matan por pasarse de memoria (OOMKilled) o falla la liveness, el kubelet lo reinicia con esperas cada vez más largas: CrashLoopBackOff.' },
      { foco: ['X', 'RD', 'NR'], texto: 'Si sigue vivo pero no pasa la readiness, el Pod aparece Running 0/1: no se reinicia, pero el Service no le envía tráfico.' },
      { foco: ['RD', 'OK'], texto: 'Solo cuando pasa la readiness aparece 1/1 y recibe tráfico.' },
    ],
    huecos: [
      { nodos: ['PE'], opcion: 'Pending (FailedScheduling)', pista: 'Ningún nodo cumple lo que pide el Pod.' },
      { nodos: ['IP'], opcion: 'ErrImagePull → ImagePullBackOff', pista: 'El kubelet no consigue descargar la imagen.' },
      { nodos: ['CC'], opcion: 'CreateContainerConfigError', pista: 'Falta un ConfigMap o un Secret (o una de sus claves) que el contenedor usa en sus variables de entorno.' },
      { nodos: ['CL'], opcion: 'CrashLoopBackOff', pista: 'El contenedor arranca, muere y el kubelet lo reinicia una y otra vez.' },
      { nodos: ['NR'], opcion: 'Running 0/1', pista: 'El proceso está vivo, pero falla la readiness y el Service no le envía tráfico.' },
    ],
    distractores: ['Completed', 'Terminating'],
  },
  {
    mod: '09', n: 2, titulo: 'Por qué un Service se queda sin endpoints',
    recorrido: [
      { foco: ['SVC', 'EPS'], texto: 'Un Service no guarda la lista de sus Pods: Kubernetes la publica en objetos EndpointSlice y la mantiene al día.' },
      { foco: ['EPS', 'P1'], texto: 'Recibe tráfico el Pod que cumple las dos condiciones: sus labels coinciden con el selector del Service y está Ready.' },
      { foco: ['EPS', 'P2'], texto: 'Un Pod con la label correcta pero NotReady (falla su readiness) no recibe tráfico del Service hasta que vuelva a estar listo.' },
      { foco: ['X', 'SVC'], texto: 'Un Pod con otra label (app=tienda) no cuenta, por muy sano que esté. Un selector que no coincide con las labels es la causa típica de un Service sin endpoints.' },
      { foco: ['SVC', 'EPS'], texto: 'Por eso el primer paso es kubectl get endpointslices -l kubernetes.io/service-name=shop: si no hay direcciones, compara el selector del Service con las labels de los Pods.' },
    ],
  },
  {
    mod: '07', n: 0, titulo: 'Orden de arranque y parada con sidecar', secuencia: true, pregunta: 'destino',
    pistas: [
      'El Pod acaba de asignarse al nodo: hay que arrancar sus contenedores.',
      'El contenedor que acaba de arrancar avisa de que ya está en marcha.',
      'Con el primero ya en marcha, toca el siguiente.',
      'Ahora se borra el Pod: hay que parar los contenedores.',
      'Queda un contenedor por parar.',
    ],
  },
  {
    mod: '12', n: 3, titulo: 'CI/CD con GitOps: quién hace qué', secuencia: true,
    pistas: [
      'Todo empieza con un cambio en el código.',
      'El código nuevo ya está en su repositorio: algo pone en marcha lo siguiente.',
      'El pipeline está en marcha: alguien construye, prueba y analiza.',
      'La imagen está construida y probada: alguien la publica.',
      'La imagen ya está en el registry, pero el clúster no lo sabe: alguien deja escrito en Git qué versión se quiere.',
      'El estado deseado cambió en Git. Nadie empuja nada al clúster: ¿quién va a buscarlo?',
      'Git y el clúster ya no coinciden: alguien los reconcilia.',
      'El clúster tiene un estado deseado nuevo: hace falta la imagen.',
    ],
  },
];

export const guiasDe = (mod: string) => GUIAS.filter((g) => g.mod === mod);
/** Clave del reto guardado al completar un diagrama sin fallos (progress.retos) */
export const guiaKey = (g: Guia) => `dg:${g.mod}-${g.n}`;
