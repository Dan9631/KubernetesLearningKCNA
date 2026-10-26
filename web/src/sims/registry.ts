// Simulaciones interactivas por módulo. Cada entrada se monta antes del texto del módulo.
// Para añadir una: crea el componente en src/sims/<NN>/ y regístralo aquí.
import type { Component } from 'svelte';

export interface SimEntry {
  /** id estable: se usa para el progreso ("04:scheduler") */
  id: string;
  title: string;
  /** una frase: qué vas a hacer */
  intro: string;
  load: () => Promise<{ default: Component<any> }>;
}

export const SIMS: Record<number, SimEntry[]> = {
  4: [
    { id: 'scheduler', title: 'Simulador del scheduler', intro: 'Configura un pod (requests, nodeSelector, tolerations, affinity, nodeName) y mira cómo el scheduler filtra, puntúa y dónde cae.', load: () => import('./04/Scheduler.svelte') },
    { id: 'qos', title: 'Requests, limits y QoS', intro: 'Ajusta requests y limits de dos contenedores, deduce la QoS class, provoca un OOMKilled y choca con un LimitRange y una ResourceQuota.', load: () => import('./04/Qos.svelte') },
  ],
  5: [
    { id: 'rbac', title: 'Evaluador de RBAC', intro: 'Pregunta kubectl auth can-i por un sujeto, verbo, recurso y namespace, y sigue la cadena binding a binding hasta el yes o el no.', load: () => import('./05/Rbac.svelte') },
    { id: 'netpol', title: 'NetworkPolicy en vivo', intro: 'Activa políticas en lab-05 y prueba el tráfico entre frontend, api, db y un intruso para ver qué pasa y qué se descarta.', load: () => import('./05/Netpol.svelte') },
    { id: 'psa', title: 'Pod Security Admission y securityContext', intro: 'Elige el perfil del namespace, arma el securityContext del pod y mira si el API server lo admite o con qué mensaje lo rechaza.', load: () => import('./05/Psa.svelte') },
  ],
  // Los agentes registran aquí las simulaciones de cada módulo, por ejemplo:
  // 4: [{ id: 'scheduler', title: 'Simulador del scheduler', intro: 'Configura un pod y mira dónde cae y por qué.', load: () => import('./04/Scheduler.svelte') }],
  1: [
    { id: 'capas', title: 'Anatomía de una imagen', intro: 'Recorre un Containerfile instrucción a instrucción y mira qué crea capas, qué es solo configuración y qué se reutiliza de la caché.', load: () => import('./01/Capas.svelte') },
    { id: 'aislamiento', title: 'Contenedor vs máquina virtual', intro: 'Compara las dos pilas, descubre qué aísla cada namespace y lleva un proceso más allá de su cgroup.', load: () => import('./01/Aislamiento.svelte') },
  ],
  2: [
    { id: 'apply', title: 'El viaje de un kubectl apply', intro: 'Sigue un Deployment desde kubectl hasta el contenedor en marcha, componente a componente.', load: () => import('./02/Apply.svelte') },
    { id: 'componentes', title: 'Explora el control plane', intro: 'Pulsa cada componente para ver qué hace, con quién habla y qué pasa en el clúster si lo apagas.', load: () => import('./02/Componentes.svelte') },
  ],
  3: [
    { id: 'rollout', title: 'Rolling update y rollback', intro: 'Ajusta réplicas, maxSurge y maxUnavailable, actualiza la imagen y vuelve atrás cuando la nueva está rota.', load: () => import('./03/Rollout.svelte') },
    { id: 'ciclo', title: 'Ciclo de vida de un pod', intro: 'Crea un Pod con init container, termina su proceso con distintos códigos y compara cada restartPolicy.', load: () => import('./03/Ciclo.svelte') },
  ],
  6: [
    { id: 'trafico', title: 'De la petición al pod', intro: 'Expón whoami como ClusterIP, NodePort, LoadBalancer, Ingress o HTTPRoute y sigue el camino de cada petición.', load: () => import('./06/Trafico.svelte') },
    { id: 'dns', title: 'Resolver nombres en el clúster', intro: 'Construye el FQDN de un Service y prueba nslookup desde pods de distintos namespaces.', load: () => import('./06/Dns.svelte') },
  ],
  7: [
    { id: 'canary', title: 'Canary por pesos', intro: 'Mueve el peso de whoami-v2 en la HTTPRoute, envía 100 peticiones y compara el reparto real con el esperado.', load: () => import('./07/Canary.svelte') },
    { id: 'mesh', title: 'Qué añade un service mesh', intro: 'Activa el mesh en modo sidecar o ambient y enciende mTLS, reintentos, circuit breaking y observabilidad.', load: () => import('./07/Mesh.svelte') },
  ],
  8: [
    { id: 'pvc', title: 'PVC, PV y StorageClass', intro: 'Crea un PVC dinámico o estático, móntalo en un pod, borra cosas y mira qué pasa con los datos.', load: () => import('./08/Pvc.svelte') },
    { id: 'volumenes', title: 'Tipos de volumen', intro: 'Cambia el volumen de un pod con dos contenedores y comprueba qué datos sobreviven al pod y al nodo.', load: () => import('./08/Volumenes.svelte') },
  ],
  9: [
    { id: 'diagnostico', title: 'Diagnostica el pod roto', intro: 'Elige un pod del namespace lab-09, investiga con la consola y acierta la causa y el arreglo de los 6 casos.', load: () => import('./09/Diagnostico.svelte') },
  ],
  10: [
    { id: 'hpa', title: 'Horizontal Pod Autoscaler', intro: 'Sube la carga y mira cómo el HPA calcula las réplicas, espera para bajar y pide ayuda al Cluster Autoscaler.', load: () => import('./10/Hpa.svelte') },
    { id: 'cncf', title: 'El paisaje CNCF', intro: 'Filtra proyectos por madurez y categoría, y recorre el ciclo de releases y el flujo de un KEP.', load: () => import('./10/Cncf.svelte') },
  ],
  11: [
    { id: 'prometheus', title: 'Cómo recolecta Prometheus', intro: 'Lanza scrapes, compara pull con push, descubre pods anotados y consulta series con PromQL.', load: () => import('./11/Prometheus.svelte') },
    { id: 'slo', title: 'SLI, SLO y presupuesto de error', intro: 'Calcula el error budget de tu SLO y gástalo con incidentes hasta ver qué decide el equipo.', load: () => import('./11/Slo.svelte') },
  ],
  12: [
    { id: 'gitops', title: 'El bucle GitOps', intro: 'Cambia Git o el clúster a mano y mira cómo Argo CD detecta el drift y reconcilia.', load: () => import('./12/GitOps.svelte') },
    { id: 'estrategias', title: 'Estrategias de despliegue', intro: 'Despliega v2 con recreate, rolling, blue/green y canary y compara disponibilidad y coste.', load: () => import('./12/Estrategias.svelte') },
    { id: 'empaquetado', title: 'Helm y Kustomize, lado a lado', intro: 'Edita los values del chart saludo y los overlays dev/prod y mira el YAML que generan.', load: () => import('./12/Empaquetado.svelte') },
  ],
  13: [
    { id: 'plan', title: 'Tu plan de 6 semanas', intro: 'Elige una fecha de inicio y marca cada sesión de estudio a medida que la terminas.', load: () => import('./13/Plan.svelte') },
    { id: 'listo', title: '¿Estoy listo?', intro: 'Repasa la checklist final por dominio y, cuando esté completa, prepara el día del examen.', load: () => import('./13/Listo.svelte') },
  ],
};
