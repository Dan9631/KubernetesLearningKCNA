// Guías de los diagramas Mermaid de los módulos: convierten un dibujo estático en algo que se recorre y,
// después, se completa de memoria. Enhance.svelte monta DiagramaGuia.svelte sobre cada diagrama que tiene guía.
//   n          posición del diagrama dentro del módulo (0 = el primero), en el orden del markdown.
//   recorrido  (flowchart) pasos: qué nodos se iluminan (ids del diagrama: API, ETCD...) y qué se explica.
//   huecos     (flowchart) nodos que se vacían en "Completar de memoria"; `pista` describe la función del componente,
//              que es lo que pregunta el examen. Varios nodos con la misma etiqueta van juntos (kubelet de cada nodo).
//   distractores  opciones falsas añadidas a las etiquetas de los huecos.
//   secuencia  (sequenceDiagram) "Recorrer paso a paso" (los mensajes aparecen uno a uno) y "Predecir el orden":
//              antes de mostrar cada mensaje se pregunta qué componente actúa. Salen del propio diagrama.
//   pasos      (secuencia) explicación de cada mensaje en el recorrido; si se dan, una por mensaje.
//   opcion     (hueco) texto de la opción correcta cuando la etiqueta del nodo es larga o delata la respuesta.
//   pistas     (secuencia) contexto que acompaña a la pregunta de cada mensaje; si se dan, una por mensaje.
//   pregunta   (secuencia) 'destino' pregunta a quién se dirige el mensaje en vez de quién lo envía: sirve cuando
//              casi todos los mensajes salen del mismo participante y lo que importa es el orden de los destinatarios.
// Un subgrafo citado por su id (en un foco o en un hueco) se comporta como un nodo: se resalta, se vacía y recibe flechas.
// El texto de aquí es contenido del curso: se verifica igual que los módulos (docs/VERIFICACION-GUIA.md).
// scripts/validar-diagramas.mjs comprueba en el prebuild que cada guía apunta a un diagrama y a nodos que existen.
export interface Paso { foco: string[]; texto: string }
export interface Hueco { nodos: string[]; pista: string; opcion?: string }
export interface Guia { mod: string; n: number; titulo: string; recorrido?: Paso[]; huecos?: Hueco[]; distractores?: string[]; secuencia?: boolean; pasos?: string[]; pistas?: string[]; pregunta?: 'destino' }

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
  {
    mod: '02', n: 1, titulo: 'Del kubectl apply al contenedor en marcha', secuencia: true,
    pasos: [
      'kubectl lee del kubeconfig la dirección del clúster y tus credenciales, y envía el manifiesto por HTTPS. Solo habla con el API server: no conoce al scheduler ni a los nodos.',
      'Antes de aceptar nada, el API server comprueba quién eres (autenticación), si puedes hacerlo (autorización, normalmente RBAC), pasa el objeto por los controladores de admisión y valida que esté bien formado.',
      'Solo entonces guarda el Deployment en etcd. El API server es el único componente que lee y escribe en etcd.',
      'kubectl ya tiene su respuesta, y todavía no existe ningún Pod. Lo que has guardado es el estado deseado; todo lo demás ocurre después, de forma asíncrona.',
      'Nadie le ordena nada al controller-manager: su controlador de Deployments observa (watch) el API server, ve un Deployment nuevo y crea su ReplicaSet.',
      'El controlador de ReplicaSets ve que se piden 2 Pods y no hay ninguno, y los crea. Nacen sin nodo asignado (spec.nodeName vacío), por eso quedan en Pending.',
      'El scheduler observa los Pods sin nodo, filtra los nodos que sirven, los puntúa y escribe su decisión en el API server (binding). No arranca nada: solo decide dónde.',
      'El kubelet de cada nodo observa los Pods asignados al suyo. El del nodo elegido es el que se da por aludido.',
      'El kubelet pide el trabajo al runtime por CRI: crear el sandbox del Pod (la red la pone el plugin CNI), descargar la imagen y arrancar los contenedores.',
      'El kubelet informa del resultado al API server: fase Running, IP del Pod, condición Ready. De ahí sale lo que ves con kubectl get pods.',
    ],
  },
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
    huecos: [
      { nodos: ['W2'], opcion: 'Nodo con taint NoSchedule', pista: 'Solo admite los Pods que toleran su taint.' },
      { nodos: ['P1'], opcion: 'Pod con toleration y node affinity', pista: 'Puede entrar en el nodo con taint y, además, no puede ir a ningún otro.' },
      { nodos: ['P2'], opcion: 'Pod sin toleration', pista: 'El taint del nodo dedicado lo mantiene fuera: acaba en otro nodo.' },
    ],
    distractores: ['Pod con nodeName fijo', 'Nodo marcado con cordon'],
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
    huecos: [
      { nodos: ['NS'], pista: 'La forma más simple: el Pod solo va a nodos que tienen una label igual a la indicada.' },
      { nodos: ['NA'], pista: 'Como la anterior, pero con operadores (In, NotIn, Exists) y con reglas preferidas.' },
      { nodos: ['PA'], pista: 'La regla depende de dónde están otros Pods, no de las labels de los nodos.' },
      { nodos: ['TS'], pista: 'Reparte las réplicas de forma equilibrada entre zonas o nodos.' },
      { nodos: ['DS'], pista: 'No es una regla de scheduling: garantiza una copia del Pod en cada nodo.' },
    ],
    distractores: ['PriorityClass', 'PodDisruptionBudget'],
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
    huecos: [
      { nodos: ['T'], opcion: 'Traefik (Ingress controller y Gateway)', pista: 'Enruta en capa 7: elige el Service según el host y el path.' },
      { nodos: ['NP'], opcion: 'NodePort', pista: 'Un puerto abierto en todos los nodos, que kube-proxy redirige al Service en capa 4.' },
      { nodos: ['S'], opcion: 'Service ClusterIP', pista: 'Donde confluyen los dos caminos: reparte entre sus Pods.' },
    ],
    distractores: ['CoreDNS', 'NetworkPolicy'],
  },
  {
    mod: '08', n: 0, titulo: 'Por qué se pierden los datos de un contenedor',
    recorrido: [
      { foco: ['L1', 'L2', 'L3'], texto: 'La imagen son capas de solo lectura apiladas. Varios contenedores de la misma imagen las comparten.' },
      { foco: ['W'], texto: 'Al arrancar un contenedor, el runtime añade encima una capa escribible fina, propia de ese contenedor.' },
      { foco: ['W', 'L3'], texto: 'Si el contenedor modifica un archivo de la imagen, primero se copia a la capa escribible (copy-on-write). La imagen no cambia.' },
      { foco: ['W'], texto: 'Esa capa se borra con el contenedor. En Kubernetes los contenedores se reinician y los Pods se recrean a menudo: lo que no esté en un volumen se pierde.' },
    ],
    huecos: [
      { nodos: ['W'], opcion: 'Capa escribible del contenedor', pista: 'Se crea al arrancar el contenedor y se borra con él.' },
      { nodos: ['L1'], opcion: 'Imagen base (solo lectura)', pista: 'La capa de más abajo: la comparten los contenedores de la misma imagen y nunca se modifica.' },
    ],
    distractores: ['PersistentVolume', 'ConfigMap'],
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
    huecos: [
      { nodos: ['EPS'], opcion: 'EndpointSlice', pista: 'Guarda las direcciones de los Pods que respaldan al Service.' },
      { nodos: ['P2'], opcion: 'Pod con la label correcta pero NotReady', pista: 'Coincide con el selector, pero no recibe tráfico hasta pasar su readiness.' },
      { nodos: ['X'], opcion: 'Pod con otra label', pista: 'Está sano, pero el selector del Service no lo selecciona.' },
    ],
    distractores: ['Ingress', 'ConfigMap'],
  },
  {
    mod: '07', n: 0, titulo: 'Orden de arranque y parada con sidecar', secuencia: true, pregunta: 'destino',
    pasos: [
      'El sidecar nativo se declara como init container con restartPolicy: Always, y los init containers arrancan antes que los contenedores de la aplicación.',
      'A diferencia de un init container normal, no tiene que terminar: al kubelet le basta con que haya arrancado para seguir con el siguiente.',
      'La aplicación arranca con el sidecar ya en marcha. Si el sidecar es un proxy, la app tiene red a través de él desde el primer momento.',
      'Al borrar el Pod, el kubelet para primero los contenedores de la aplicación.',
      'El sidecar se para después que la app, en orden inverso al de arranque: así la aplicación conserva su proxy o su agente de logs hasta el final.',
    ],
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
    pasos: [
      'Todo empieza con un cambio de código en el repositorio de la aplicación, que es distinto del repositorio de configuración.',
      'El push dispara el pipeline de integración continua (CI).',
      'El pipeline compila, prueba y analiza el código. Si algo falla, se detiene aquí y nada llega al clúster.',
      'La imagen se construye una sola vez y se publica en el registry con un tag que la identifica (1.4.2), no con latest.',
      'El último paso de CI no toca el clúster: deja escrito en el repositorio de configuración qué versión se quiere, con un commit o un pull request.',
      'El agente GitOps corre dentro del clúster y es él quien va a buscar los cambios a Git (modelo pull). Las credenciales del clúster no salen de él.',
      'El agente compara lo que dice Git con lo que hay en el clúster y aplica la diferencia. Lo repite de forma continua, así que también corrige cambios hechos a mano.',
      'Con el estado deseado ya actualizado, el kubelet descarga la imagen nueva del registry y arranca los Pods.',
    ],
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
  // ---------- guías añadidas el 2026-11-12: los diagramas que quedaban sin recorrido ----------
  {
    mod: '00', n: 0, titulo: 'Cómo está montado tu laboratorio',
    recorrido: [
      { foco: ['PS', 'CP'], texto: 'Desde Windows, kubectl, helm y kcna.ps1 hablan con el API server del clúster por el puerto 6443, con el kubeconfig aislado del laboratorio.' },
      { foco: ['HL', 'CP'], texto: 'Headlamp y k9s no son otra vía de entrada: son interfaces que consultan esa misma API.' },
      { foco: ['BR', 'CP'], texto: 'El navegador llega a las aplicaciones del clúster por puertos mapeados (localhost:8080 y 30080) hacia el contenedor del control plane.' },
      { foco: ['WSL', 'Net'], texto: 'El clúster entero vive dentro de la máquina de Podman, que corre en WSL2. Con kind, cada nodo es un contenedor conectado a la red «kind».' },
      { foco: ['CP'], texto: 'kcna-control-plane ejecuta el control plane (API server, etcd, scheduler y controller-manager) y también Traefik, que recibe el tráfico de entrada.' },
      { foco: ['CP', 'W1', 'W2'], texto: 'Los dos workers ejecutan tus cargas. Llevan labels distintas (disktype y zone) que usarás en los laboratorios de scheduling.' },
    ],
    huecos: [
      { nodos: ['CP'], opcion: 'Nodo control-plane', pista: 'El contenedor donde corren el API server, etcd, el scheduler y el controller-manager.' },
      { nodos: ['WSL'], opcion: 'Máquina de Podman (WSL2)', pista: 'La máquina Linux en la que Podman ejecuta los contenedores que hacen de nodos.' },
      { nodos: ['PS'], opcion: 'PowerShell con kubectl y helm', pista: 'Desde aquí envías las órdenes al API server, por el puerto 6443.' },
    ],
    distractores: ['Docker Desktop', 'Máquina virtual por nodo'],
  },
  {
    mod: '03', n: 0, titulo: 'Las fases de un Pod',
    recorrido: [
      { foco: ['I', 'PEN'], texto: 'Cuando la API acepta el Pod, su fase es Pending: todavía no tiene nodo, o está descargando imágenes o ejecutando init containers.' },
      { foco: ['PEN', 'RUN'], texto: 'Pasa a Running cuando está asignado a un nodo y al menos un contenedor ha arrancado. Running no significa que ya reciba tráfico: eso lo indica la condición Ready.' },
      { foco: ['RUN', 'SUC'], texto: 'Succeeded: todos los contenedores terminaron bien (exit 0) y no se van a reiniciar. Es el final normal de un Job.' },
      { foco: ['RUN', 'FAIL'], texto: 'Failed: todos los contenedores terminaron y al menos uno lo hizo con error, sin que se vaya a reiniciar.' },
      { foco: ['PEN', 'FAIL'], texto: 'Un Pod también puede acabar en Failed sin haber llegado a Running.' },
      { foco: ['RUN', 'UNK'], texto: 'Unknown: no se puede saber el estado del Pod, normalmente porque se perdió el contacto con su nodo. Estados como CrashLoopBackOff o ImagePullBackOff no son fases: son motivos de un contenedor.' },
    ],
    huecos: [
      { nodos: ['PEN'], pista: 'Aceptado por la API, pero aún sin nodo o preparando sus contenedores.' },
      { nodos: ['RUN'], pista: 'Asignado a un nodo y con al menos un contenedor arrancado.' },
      { nodos: ['SUC'], pista: 'Todos los contenedores terminaron con exit 0 y no se reinician.' },
      { nodos: ['UNK'], pista: 'Se perdió el contacto con el nodo y no se puede saber cómo está el Pod.' },
    ],
    distractores: ['CrashLoopBackOff', 'Terminating'],
  },
  {
    mod: '07', n: 1, titulo: 'Service mesh: data plane y control plane',
    recorrido: [
      { foco: ['A', 'PA'], texto: 'Cada Pod lleva un proxy junto a la aplicación, y todo el tráfico de la app entra y sale por él. La aplicación no cambia: cree que habla directamente con el otro servicio.' },
      { foco: ['PA', 'PB'], texto: 'Los proxies se comunican entre sí con mTLS: el tráfico va cifrado y cada lado verifica la identidad del otro. Ese conjunto de proxies es el data plane.' },
      { foco: ['PB', 'B'], texto: 'El proxy de destino termina la conexión mTLS y entrega la petición a la App B dentro del mismo Pod.' },
      { foco: ['CP'], texto: 'El control plane (istiod en Istio) no está en la ruta del tráfico: ninguna petición pasa por él.' },
      { foco: ['C1', 'C2', 'C3'], texto: 'Hace tres trabajos: reparte la configuración a los proxies (xDS), emite los certificados de mTLS como autoridad certificadora y descubre los servicios observando la API de Kubernetes.' },
      { foco: ['CP', 'PA', 'PB'], texto: 'Cuando cambias una política, el control plane la distribuye a todos los proxies. No hay que tocar ni redesplegar las aplicaciones.' },
    ],
    huecos: [
      { nodos: ['PA', 'PB'], opcion: 'Proxy (data plane)', pista: 'Intercepta todo el tráfico de la aplicación y aplica mTLS, reintentos y métricas.' },
      { nodos: ['CP'], opcion: 'Control plane', pista: 'No toca el tráfico: configura los proxies y les entrega sus certificados.' },
      { nodos: ['C2'], opcion: 'CA: certificados mTLS', pista: 'Emite la identidad con la que cada proxy se autentica ante los demás.' },
    ],
    distractores: ['kube-proxy', 'Ingress controller'],
  },
  {
    mod: '07', n: 2, titulo: 'Canary con Gateway API',
    recorrido: [
      { foco: ['U', 'GW'], texto: 'Las peticiones de los clientes entran al clúster por el Gateway.' },
      { foco: ['GW', 'R'], texto: 'Un HTTPRoute adjunto al Gateway decide a dónde va cada petición. Sus backendRefs llevan un weight cada uno.' },
      { foco: ['R', 'V1', 'P1'], texto: 'Con peso 90, nueve de cada diez peticiones siguen yendo al Service de la versión estable.' },
      { foco: ['R', 'V2', 'P2'], texto: 'Con peso 10, una de cada diez va a la versión nueva. Mientras tanto se vigilan sus errores y su latencia.' },
      { foco: ['R'], texto: 'Si va bien, se sube el peso (10, 50, 100); si va mal, se vuelve a 0. El porcentaje no depende del número de Pods de cada versión, que es la limitación de un canary hecho solo con réplicas.' },
    ],
    huecos: [
      { nodos: ['GW'], opcion: 'Gateway', pista: 'Punto de entrada del tráfico al clúster; lo gestiona el operador.' },
      { nodos: ['R'], opcion: 'HTTPRoute con pesos', pista: 'Reparte las peticiones entre los backends según su weight.' },
      { nodos: ['V2'], opcion: 'Service de la versión canary', pista: 'Recibe solo una parte pequeña del tráfico mientras se vigila la versión nueva.' },
    ],
    distractores: ['NetworkPolicy', 'HorizontalPodAutoscaler'],
  },
  {
    mod: '10', n: 0, titulo: 'Las cuatro dimensiones del autoscaling',
    recorrido: [
      { foco: ['HPA'], texto: 'El HPA escala en horizontal: añade o quita réplicas según métricas como el uso de CPU.' },
      { foco: ['VPA'], texto: 'El VPA escala en vertical: ajusta la CPU y la memoria que pide cada Pod, sin cambiar cuántos hay.' },
      { foco: ['KEDA'], texto: 'KEDA escala según eventos externos, como los mensajes pendientes en una cola o un horario, y puede bajar la carga a cero réplicas.' },
      { foco: ['HPA', 'CA'], texto: 'Si las réplicas nuevas no caben en ningún nodo, quedan en Pending. Ahí actúa el Cluster Autoscaler: añade nodos de grupos ya definidos y retira los que sobran.' },
      { foco: ['HPA', 'KAR'], texto: 'Karpenter resuelve lo mismo de otra forma: en vez de ampliar un grupo predefinido, aprovisiona directamente nodos a la medida de esos Pods pendientes, dentro de los límites que fija el operador (NodePools).' },
    ],
    huecos: [
      { nodos: ['HPA'], opcion: 'HPA', pista: 'Cambia el número de réplicas según métricas como la CPU.' },
      { nodos: ['VPA'], opcion: 'VPA', pista: 'Cambia la CPU y la memoria que pide cada Pod, no cuántos Pods hay.' },
      { nodos: ['KEDA'], opcion: 'KEDA', pista: 'Escala por eventos externos, como una cola, y puede llegar a cero réplicas.' },
      { nodos: ['CA'], opcion: 'Cluster Autoscaler', pista: 'Añade nodos de grupos predefinidos cuando hay Pods en Pending que no caben.' },
    ],
    distractores: ['PodDisruptionBudget', 'ResourceQuota'],
  },
  {
    mod: '10', n: 1, titulo: 'Niveles de madurez de un proyecto CNCF',
    recorrido: [
      { foco: ['S'], texto: 'Sandbox es la puerta de entrada: proyectos experimentales, con requisitos bajos para ser admitidos.' },
      { foco: ['S', 'I'], texto: 'Un proyecto pasa a Incubating cuando ya se usa en producción y su comunidad crece.' },
      { foco: ['I', 'G'], texto: 'Graduated es el nivel más alto: proyecto maduro, de adopción amplia y con una auditoría de seguridad superada. Kubernetes fue el primero en graduarse, en 2018.' },
    ],
    huecos: [
      { nodos: ['S'], opcion: 'Sandbox', pista: 'Nivel de entrada, para proyectos experimentales.' },
      { nodos: ['I'], opcion: 'Incubating', pista: 'Ya se usa en producción y su comunidad está creciendo.' },
      { nodos: ['G'], opcion: 'Graduated', pista: 'Maduro, de adopción amplia y con auditoría de seguridad.' },
    ],
    distractores: ['Stable', 'Beta'],
  },
  {
    mod: '11', n: 0, titulo: 'Cómo trabaja Prometheus',
    recorrido: [
      { foco: ['SD', 'RET'], texto: 'Prometheus no necesita una lista fija de objetivos: los descubre consultando la API de Kubernetes.' },
      { foco: ['RET', 'APP'], texto: 'Modelo pull: Prometheus va a buscar las métricas por HTTP al endpoint /metrics de cada aplicación, cada scrape_interval.' },
      { foco: ['RET', 'NE', 'KSM', 'KUB'], texto: 'Del mismo modo recoge las del nodo (node-exporter), las del estado de los objetos (kube-state-metrics) y las de los propios componentes de Kubernetes (kubelet, cAdvisor, API server).' },
      { foco: ['JOB', 'PGW', 'RET'], texto: 'Un trabajo efímero puede terminar antes de que le toque el scrape. Por eso empuja sus métricas al Pushgateway, y Prometheus las recoge de ahí.' },
      { foco: ['RET', 'TSDB'], texto: 'Todo se guarda como series temporales en una base de datos en el disco local.' },
      { foco: ['TSDB', 'HTTP', 'G'], texto: 'Los datos se consultan con PromQL a través de la API HTTP. Grafana la usa para dibujar los paneles.' },
      { foco: ['RULES', 'TSDB'], texto: 'El propio servidor evalúa periódicamente las reglas de alerta y de grabación contra esos datos.' },
      { foco: ['RULES', 'AM', 'N'], texto: 'Cuando una regla de alerta se cumple, Prometheus la envía a Alertmanager, que agrupa, silencia y enruta las notificaciones a email, Slack o PagerDuty.' },
    ],
    huecos: [
      { nodos: ['RET'], opcion: 'Retrieval (scrape)', pista: 'Va a buscar las métricas a cada objetivo por HTTP.' },
      { nodos: ['PGW'], opcion: 'Pushgateway', pista: 'Recibe las métricas de trabajos que terminan antes de poder ser consultados.' },
      { nodos: ['KSM'], opcion: 'kube-state-metrics', pista: 'Expone el estado de los objetos de Kubernetes, como las réplicas deseadas y las disponibles.' },
      { nodos: ['TSDB'], opcion: 'TSDB', pista: 'Guarda las series temporales en el disco local.' },
      { nodos: ['AM'], opcion: 'Alertmanager', pista: 'Agrupa, silencia y enruta las alertas hacia email, Slack o PagerDuty.' },
    ],
    distractores: ['metrics-server', 'Fluent Bit'],
  },
  {
    mod: '11', n: 1, titulo: 'El camino de un log',
    recorrido: [
      { foco: ['P1', 'P2', 'F'], texto: 'Las aplicaciones escriben en stdout y stderr. El runtime guarda esa salida en archivos del nodo.' },
      { foco: ['F', 'AG'], texto: 'Un agente por nodo, desplegado como DaemonSet (Fluent Bit o Fluentd), lee los archivos de todos los contenedores de ese nodo. Las aplicaciones no cambian.' },
      { foco: ['AG', 'BE'], texto: 'El agente envía los logs a un backend fuera del nodo. Es lo que los salva: si el Pod se borra o el nodo se pierde, los archivos locales desaparecen.' },
      { foco: ['BE', 'UI'], texto: 'Los logs se consultan desde una interfaz como Grafana o Kibana. Kubernetes no trae nada de esto: el logging a nivel de clúster hay que montarlo.' },
    ],
    huecos: [
      { nodos: ['F'], opcion: 'Archivos de log en el nodo', pista: 'Donde el runtime guarda lo que cada contenedor escribe en stdout y stderr.' },
      { nodos: ['AG'], opcion: 'Agente de nodo (DaemonSet)', pista: 'Hay uno por nodo: lee los logs de todos los contenedores y los envía fuera.' },
      { nodos: ['BE'], opcion: 'Backend de logs', pista: 'Almacena los logs fuera del nodo, para que sobrevivan a los Pods y a los nodos.' },
    ],
    distractores: ['Prometheus', 'etcd'],
  },
  {
    mod: '12', n: 0, titulo: 'El pipeline, del push a producción',
    recorrido: [
      { foco: ['A', 'B'], texto: 'Un git push pone en marcha el pipeline. La primera etapa compila el código.' },
      { foco: ['B', 'C'], texto: 'Después se ejecutan las pruebas unitarias y de integración. Si fallan, el cambio no sigue adelante.' },
      { foco: ['C', 'D'], texto: 'Luego se analiza: vulnerabilidades y reglas de estilo, antes de empaquetar nada.' },
      { foco: ['D', 'E', 'F'], texto: 'El resultado se empaqueta como imagen OCI y se sube al registry con un tag que la identifica. Se construye una sola vez.' },
      { foco: ['F', 'G'], texto: 'Esa misma imagen se despliega en staging. Entre entornos cambia la configuración, nunca la imagen.' },
      { foco: ['G', 'H', 'I'], texto: 'La diferencia está en el último paso: en Continuous Delivery pasar a producción requiere una aprobación manual; en Continuous Deployment es automático.' },
    ],
    huecos: [
      { nodos: ['D'], opcion: 'Scan', pista: 'Busca vulnerabilidades y problemas de estilo antes de empaquetar.' },
      { nodos: ['F'], opcion: 'Registry', pista: 'Almacena y distribuye la imagen, que es la misma en todos los entornos.' },
      { nodos: ['H'], opcion: 'Aprobación manual', pista: 'Lo que distingue Continuous Delivery de Continuous Deployment.' },
    ],
    distractores: ['Rollback', 'Service mesh'],
  },
  {
    mod: '12', n: 1, titulo: 'Blue/green frente a canary',
    recorrido: [
      { foco: ['U1', 'S1', 'B1'], texto: 'Blue/green: todo el tráfico va a la versión actual (blue), mientras la nueva (green) se despliega completa al lado, sin recibir usuarios.' },
      { foco: ['S1', 'G1'], texto: 'El cambio es de golpe: el Service pasa a apuntar a green y recibe el 100 %. Volver atrás es apuntar de nuevo a blue. El coste es mantener dos entornos completos a la vez.' },
      { foco: ['U2', 'R2'], texto: 'Canary: delante hay un Ingress o un Gateway capaz de repartir el tráfico por pesos.' },
      { foco: ['R2', 'V1'], texto: 'La mayor parte, aquí el 90 %, sigue yendo a la versión estable.' },
      { foco: ['R2', 'V2'], texto: 'Una parte pequeña va a la versión nueva mientras se vigilan sus métricas. Si va bien se sube el porcentaje poco a poco; si va mal, se le retira el tráfico.' },
    ],
    huecos: [
      { nodos: ['G1'], opcion: 'v2 green', pista: 'Entorno completo de la versión nueva: recibe todo el tráfico de golpe al cambiar.' },
      { nodos: ['R2'], opcion: 'Ingress / Gateway con pesos', pista: 'Reparte el tráfico por porcentaje entre la versión estable y la nueva.' },
      { nodos: ['V2'], opcion: 'v2 canary', pista: 'Recibe primero una parte pequeña del tráfico mientras se vigilan sus métricas.' },
    ],
    distractores: ['Recreate', 'A/B testing'],
  },
  {
    mod: '12', n: 2, titulo: 'Modelo push frente a modelo pull',
    recorrido: [
      { foco: ['G1', 'CI1'], texto: 'Modelo push: un pipeline externo reacciona al cambio en Git. Para desplegar necesita tener guardadas las credenciales del clúster.' },
      { foco: ['CI1', 'K1'], texto: 'El pipeline aplica los cambios desde fuera (kubectl apply o helm upgrade) y ahí termina: si alguien modifica el clúster a mano, nadie lo detecta hasta el siguiente pipeline.' },
      { foco: ['K2', 'AG'], texto: 'Modelo pull (GitOps): el agente, Argo CD o Flux, corre dentro del clúster.' },
      { foco: ['AG', 'G2'], texto: 'Es el agente quien vigila y clona el repositorio. Solo necesita leer Git, así que las credenciales del clúster no salen de él.' },
      { foco: ['AG', 'K2'], texto: 'Aplica los cambios desde dentro y reconcilia de forma continua: si el clúster se desvía de lo que dice Git, lo corrige.' },
    ],
    huecos: [
      { nodos: ['CI1'], opcion: 'Pipeline con credenciales del clúster', pista: 'En el modelo push, aplica los cambios desde fuera del clúster.' },
      { nodos: ['AG'], opcion: 'Agente GitOps', pista: 'Corre dentro del clúster, lee Git y reconcilia de forma continua.' },
    ],
    distractores: ['Registry', 'kube-scheduler'],
  },
  {
    mod: '12', n: 4, titulo: 'Kustomize: base y overlays',
    recorrido: [
      { foco: ['B'], texto: 'La base contiene los manifiestos comunes a todos los entornos. Es YAML válido y completo: se podría aplicar tal cual.' },
      { foco: ['B', 'D'], texto: 'Cada overlay declara solo lo que cambia. El de dev añade el prefijo dev- y deja 1 réplica.' },
      { foco: ['B', 'P'], texto: 'El de prod parte de la misma base y cambia otras cosas: prefijo prod-, 3 réplicas, otra versión de nginx y más CPU.' },
      { foco: ['D', 'P', 'K'], texto: 'kubectl apply -k combina la base con el overlay y aplica el resultado. No hay plantillas ni un binario aparte: Kustomize viene dentro de kubectl.' },
    ],
    huecos: [
      { nodos: ['B'], opcion: 'base/', pista: 'Los manifiestos comunes a todos los entornos, YAML válido y completo.' },
      { nodos: ['P'], opcion: 'overlays/prod', pista: 'Declara solo lo que cambia en producción respecto de lo común.' },
    ],
    distractores: ['values.yaml', 'Chart.yaml'],
  },
  {
    mod: '12', n: 5, titulo: 'GitOps con Argo CD en tu laboratorio',
    recorrido: [
      { foco: ['GIT', 'GS'], texto: 'Desde Windows haces commit y push contra el servidor Git del clúster, a través de un port-forward al puerto 9418.' },
      { foco: ['GS'], texto: 'Ese git-server vive en el namespace lab-12 y guarda el repositorio en un PVC. Existe porque los Pods de tu laboratorio no salen a internet y Argo CD no podría clonar GitHub.' },
      { foco: ['RS', 'GS'], texto: 'El repo-server de Argo CD clona el repositorio por el DNS interno del clúster y genera los manifiestos.' },
      { foco: ['CTRL', 'APP'], texto: 'El application-controller compara lo que dice Git con lo que hay en el clúster y sincroniza: aplica los cambios, deshace los hechos a mano (self-heal) y borra lo que ya no está en Git (prune).' },
      { foco: ['BR', 'SRV'], texto: 'La interfaz web la sirve argocd-server; la abres en el navegador con otro port-forward, al puerto 8443.' },
    ],
    huecos: [
      { nodos: ['GS'], opcion: 'git-server', pista: 'Servidor Git dentro del clúster, porque los Pods no llegan a GitHub.' },
      { nodos: ['RS'], opcion: 'repo-server', pista: 'Clona el repositorio Git y genera los manifiestos.' },
      { nodos: ['CTRL'], opcion: 'application-controller', pista: 'Compara el estado deseado con el real y sincroniza, corrige y poda.' },
    ],
    distractores: ['kube-scheduler', 'Registry'],
  },
];

export const guiasDe = (mod: string) => GUIAS.filter((g) => g.mod === mod);
/** Clave del reto guardado al completar un diagrama sin fallos (progress.retos) */
export const guiaKey = (g: Guia) => `dg:${g.mod}-${g.n}`;
