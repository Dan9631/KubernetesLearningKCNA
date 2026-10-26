// Metadatos de los módulos del curso (los .md no llevan frontmatter).
// El id coincide con el nombre del archivo en ../curso sin la extensión.

export type DomainKey = 'fundamentals' | 'orchestration' | 'delivery' | 'architecture' | 'base';

export const DOMAINS: Record<DomainKey, { name: string; short: string; weight: number; exam: number }> = {
  fundamentals:  { name: 'Kubernetes Fundamentals',             short: 'Fundamentals',  weight: 44, exam: 26 },
  orchestration: { name: 'Container Orchestration',             short: 'Orchestration', weight: 28, exam: 17 },
  delivery:      { name: 'Cloud Native Application Delivery',   short: 'Delivery',      weight: 16, exam: 10 },
  architecture:  { name: 'Cloud Native Architecture',           short: 'Architecture',  weight: 12, exam: 7 },
  base:          { name: 'Preparación',                         short: 'Base',          weight: 0,  exam: 0 },
};

export interface ModuleMeta {
  n: number;
  id: string;          // id del archivo en la colección (sin .md)
  title: string;       // título corto para navegación
  domain: DomainKey;
  topics: string[];    // competencias oficiales que cubre
  hours: string;       // tiempo estimado
  lab: boolean;        // tiene lab verificable con kcna.ps1
  summary: string;     // una frase para la ruta
}

export const MODULES: ModuleMeta[] = [
  { n: 0,  id: '00-preparacion-entorno',           title: 'Tu laboratorio',                 domain: 'base',          topics: [],                                          hours: '45 min', lab: false, summary: 'Enciende el clúster y entiende qué hay debajo.' },
  { n: 1,  id: '01-contenedores-y-cloud-native',   title: 'Contenedores y cloud native',    domain: 'fundamentals',  topics: ['Containerization'],                        hours: '2 h',    lab: true,  summary: 'Imágenes, capas, runtimes y qué significa cloud native.' },
  { n: 2,  id: '02-arquitectura-kubernetes',       title: 'Arquitectura de Kubernetes',     domain: 'fundamentals',  topics: ['Kubernetes Core Concepts', 'Administration'],         hours: '2,5 h',  lab: true,  summary: 'Control plane, nodos y el viaje de un kubectl apply.' },
  { n: 3,  id: '03-workloads-pods-deployments',    title: 'Workloads',                      domain: 'fundamentals',  topics: ['Kubernetes Core Concepts'],                           hours: '3 h',    lab: true,  summary: 'Pods, ReplicaSets, Deployments, rollouts, ConfigMaps y Secrets.' },
  { n: 4,  id: '04-scheduling',                    title: 'Scheduling',                     domain: 'fundamentals',  topics: ['Scheduling'],                              hours: '2,5 h',  lab: true,  summary: 'Cómo decide el scheduler dónde corre cada pod.' },
  { n: 5,  id: '05-seguridad',                     title: 'Seguridad',                      domain: 'orchestration', topics: ['Security'],                                hours: '3 h',    lab: true,  summary: 'Autenticación, RBAC, securityContext, PSA y NetworkPolicy.' },
  { n: 6,  id: '06-networking-services',           title: 'Networking y Services',          domain: 'orchestration', topics: ['Networking'],                              hours: '2,5 h',  lab: true,  summary: 'Red de pods, Services, DNS, Ingress y Gateway API.' },
  { n: 7,  id: '07-service-mesh-microservicios',   title: 'Service mesh',                   domain: 'orchestration', topics: ['Networking', 'Cloud Native Ecosystem and Principles'],                 hours: '2 h',    lab: true,  summary: 'Sidecars, Envoy, Istio y despliegues canary.' },
  { n: 8,  id: '08-storage',                       title: 'Storage',                        domain: 'orchestration', topics: ['Storage'],                                 hours: '2 h',    lab: true,  summary: 'Volúmenes, PV, PVC, StorageClass y StatefulSets.' },
  { n: 9,  id: '09-troubleshooting-debugging',     title: 'Troubleshooting',                domain: 'orchestration', topics: ['Troubleshooting', 'Debugging'],            hours: '2,5 h',  lab: true,  summary: 'Diagnosticar pods rotos con describe, events, logs y debug.' },
  { n: 10, id: '10-arquitectura-cloud-native',     title: 'Arquitectura cloud native',      domain: 'architecture',  topics: ['Cloud Native Ecosystem and Principles', 'Cloud Native Community and Collaboration'],   hours: '2 h',    lab: true,  summary: 'Autoscaling, serverless, estándares abiertos y la CNCF.' },
  { n: 11, id: '11-observabilidad',                title: 'Observabilidad',                 domain: 'architecture',  topics: ['Observability'],                           hours: '2,5 h',  lab: true,  summary: 'Métricas, logs, trazas, Prometheus y SLO.' },
  { n: 12, id: '12-application-delivery-gitops',   title: 'Application delivery y GitOps',  domain: 'delivery',      topics: ['Application Delivery'],                    hours: '3 h',    lab: true,  summary: 'CI/CD, Helm, Kustomize y Argo CD.' },
  { n: 13, id: '13-estrategia-examen',             title: 'Estrategia de examen',           domain: 'base',          topics: [],                                          hours: '1 h',    lab: false, summary: 'Formato, plan de 6 semanas y checklist final.' },
];

export const byId = (id: string) => MODULES.find((m) => m.id === id);
export const byNumber = (n: number) => MODULES.find((m) => m.n === n);
export const pad = (n: number) => String(n).padStart(2, '0');

/** Ruta pública respetando `base` (para GitHub Pages u otras subrutas). */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + (path.startsWith('/') ? path : '/' + path);
}

export const moduleUrl = (n: number) => url(`/modulos/${pad(n)}`);

/** Título legible a partir del primer encabezado del markdown ("# Módulo 04 — Scheduling: ..."). */
export function titleFromBody(body: string, fallback: string): string {
  const m = body.match(/^#\s+(.+)$/m);
  if (!m) return fallback;
  return m[1].replace(/^Módulo\s+\d+\s+[—-]\s+/i, '').trim();
}
