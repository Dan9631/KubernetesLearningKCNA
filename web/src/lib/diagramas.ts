// Guías de los diagramas Mermaid de los módulos: convierten un dibujo estático en algo que se recorre y,
// después, se completa de memoria. Enhance.svelte monta DiagramaGuia.svelte sobre cada diagrama que tiene guía.
//   n          posición del diagrama dentro del módulo (0 = el primero), en el orden del markdown.
//   recorrido  (flowchart) pasos: qué nodos se iluminan (ids del diagrama: API, ETCD...) y qué se explica.
//   huecos     (flowchart) nodos que se vacían en "Completar de memoria"; `pista` describe la función del componente,
//              que es lo que pregunta el examen. Varios nodos con la misma etiqueta van juntos (kubelet de cada nodo).
//   distractores  opciones falsas añadidas a las etiquetas de los huecos.
//   secuencia  (sequenceDiagram) "Predecir el orden": antes de mostrar cada mensaje se pregunta qué componente actúa.
//              No necesita más contenido: sale del propio diagrama.
// El texto de aquí es contenido del curso: se verifica igual que los módulos (docs/VERIFICACION-GUIA.md).
// scripts/validar-diagramas.mjs comprueba en el prebuild que cada guía apunta a un diagrama y a nodos que existen.
export interface Paso { foco: string[]; texto: string }
export interface Hueco { nodos: string[]; pista: string }
export interface Guia { mod: string; n: number; titulo: string; recorrido?: Paso[]; huecos?: Hueco[]; distractores?: string[]; secuencia?: boolean }

export const GUIAS: Guia[] = [
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
];

export const guiasDe = (mod: string) => GUIAS.filter((g) => g.mod === mod);
/** Clave del reto guardado al completar un diagrama sin fallos (progress.retos) */
export const guiaKey = (g: Guia) => `dg:${g.mod}-${g.n}`;
