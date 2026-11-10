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
// El foco de un paso puede citar el id de un subgrafo para iluminar las flechas que llegan a él.
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
