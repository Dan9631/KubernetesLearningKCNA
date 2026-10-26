// Temario oficial KCNA (CNCF, vigente desde noviembre de 2025) y cálculo de cobertura del curso.
// Fuente: https://github.com/cncf/curriculum (KCNA_Curriculum.pdf)
// Los nombres de competencia coinciden EXACTAMENTE con el campo `topic` de las preguntas
// y con `topics` de src/lib/modules.ts: así se cruzan sin tablas intermedias.
import preguntas from '../data/preguntas.json';
import { MODULES, type DomainKey } from './modules';
import { SIMS } from '../sims/registry';

export const CURRICULUM_URL = 'https://github.com/cncf/curriculum/blob/master/KCNA_Curriculum.pdf';
export const CURRICULUM_DATE = 'noviembre de 2025';

export interface Competency {
  name: string;                       // nombre oficial
  domain: Exclude<DomainKey, 'base'>;
  /** qué cubre, en una frase (redacción propia a partir del temario y la documentación) */
  scope: string;
}

export const COMPETENCIES: Competency[] = [
  { name: 'Kubernetes Core Concepts',               domain: 'fundamentals',  scope: 'Arquitectura del clúster, objetos de la API, Pods, ReplicaSets, Deployments, Services, namespaces, ConfigMaps y Secrets.' },
  { name: 'Administration',                         domain: 'fundamentals',  scope: 'kubectl, kubeconfig y contextos, API groups, imperativo frente a declarativo, ciclo de versiones del clúster.' },
  { name: 'Scheduling',                             domain: 'fundamentals',  scope: 'kube-scheduler, labels y selectores, taints y tolerations, affinity, requests y limits, DaemonSets, static pods.' },
  { name: 'Containerization',                       domain: 'fundamentals',  scope: 'Contenedores frente a VMs, imágenes OCI y capas, registries, runtimes y la interfaz CRI.' },
  { name: 'Networking',                             domain: 'orchestration', scope: 'Modelo de red de Kubernetes, CNI, Services, DNS, Ingress, Gateway API y service mesh.' },
  { name: 'Security',                               domain: 'orchestration', scope: 'Autenticación, RBAC, ServiceAccounts, securityContext, Pod Security Admission, NetworkPolicy y seguridad de imágenes.' },
  { name: 'Troubleshooting',                        domain: 'orchestration', scope: 'Diagnóstico del clúster y de workloads: estados de pods, eventos, nodos, componentes del control plane.' },
  { name: 'Storage',                                domain: 'orchestration', scope: 'Volúmenes, PersistentVolumes, PersistentVolumeClaims, StorageClasses, CSI y StatefulSets.' },
  { name: 'Application Delivery',                   domain: 'delivery',      scope: 'CI/CD, GitOps, Argo CD y Flux, Helm, Kustomize y estrategias de despliegue.' },
  { name: 'Debugging',                              domain: 'delivery',      scope: 'kubectl logs, describe, events, exec, port-forward y kubectl debug para encontrar fallos en aplicaciones.' },
  { name: 'Observability',                          domain: 'architecture',  scope: 'Métricas, logs y trazas, Prometheus, OpenTelemetry, SLI/SLO/SLA y gestión de costes.' },
  { name: 'Cloud Native Ecosystem and Principles',  domain: 'architecture',  scope: 'Principios cloud native, autoscaling, serverless, estándares abiertos (OCI, CRI, CNI, CSI) y proyectos de la CNCF.' },
  { name: 'Cloud Native Community and Collaboration', domain: 'architecture', scope: 'Cómo se gobierna Kubernetes y la CNCF: SIGs, KEPs, TOC, niveles de madurez, ciclo de releases y cómo contribuir.' },
];

// En el banco de preguntas "Core Concepts" se usa sin el prefijo "Kubernetes"
const ALIASES: Record<string, string> = { 'Core Concepts': 'Kubernetes Core Concepts' };
export const canonical = (topic: string) => ALIASES[topic] ?? topic;

interface Q { id: string; topic: string; module: number; answer: number[]; source?: string[] }
const QS = preguntas as Q[];

/** Umbrales para avisar de poco material (el temario no publica pesos por competencia). */
export const MIN_QUESTIONS = 10;

export interface CoverageRow {
  competency: Competency;
  modules: number[];
  labs: number;
  sims: number;
  questions: number;
  multi: number;
  sourced: number;          // preguntas con fuente oficial enlazada
  byModule: Record<number, number>;
  warnings: string[];
}

export function coverage(): CoverageRow[] {
  return COMPETENCIES.map((c) => {
    const mods = MODULES.filter((m) => m.topics.map(canonical).includes(c.name));
    const qs = QS.filter((q) => canonical(q.topic) === c.name);
    const byModule: Record<number, number> = {};
    for (const q of qs) byModule[q.module] = (byModule[q.module] ?? 0) + 1;
    const sims = mods.reduce((a, m) => a + (SIMS[m.n]?.length ?? 0), 0);
    const labs = mods.filter((m) => m.lab).length;
    const sourced = qs.filter((q) => q.source && q.source.length).length;
    const warnings: string[] = [];
    if (!mods.length) warnings.push('Ningún módulo la declara');
    if (qs.length < MIN_QUESTIONS) warnings.push(`Solo ${qs.length} preguntas (mínimo ${MIN_QUESTIONS})`);
    if (!labs) warnings.push('Sin laboratorio práctico');
    if (qs.length && sourced < qs.length) warnings.push(`${qs.length - sourced} preguntas sin fuente oficial`);
    return { competency: c, modules: mods.map((m) => m.n), labs, sims, questions: qs.length, multi: qs.filter((q) => q.answer.length > 1).length, sourced, byModule, warnings };
  });
}

/** Preguntas por módulo (para detectar módulos con pocas preguntas). */
export function questionsByModule(): Record<number, number> {
  const out: Record<number, number> = {};
  for (const q of QS) out[q.module] = (out[q.module] ?? 0) + 1;
  return out;
}
