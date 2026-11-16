// Primer módulo del curso (curso/NN-*.md) que EXPLICA cada concepto, no el que solo lo nombra.
// validate.js falla si una pregunta (enunciado + respuestas correctas) o una flashcard (término) usa uno de
// estos conceptos en un módulo anterior: el alumno no debe encontrarse en la práctica ni en el examen del
// módulo algo que el curso aún no le enseñó.
// Sale de la auditoría del banco (nov-2026). Al explicar un concepto antes en el curso, baja aquí su módulo;
// al añadir preguntas sobre un concepto nuevo, añádelo con el módulo donde se explica.
module.exports = [
  // [expresión, módulo, dónde se explica]
  [/\bfinalizers?\b/i, 8, '08 Storage: protección del PVC en uso (pvc-protection)'],
  [/\breadiness\s*probe|\breadinessProbe\b/i, 3, '03 Workloads: §2 Probes'],
  [/\bliveness\s*probe|\blivenessProbe\b/i, 3, '03 Workloads: §2 Probes'],
  [/\bstartup\s*probe|\bstartupProbe\b/i, 3, '03 Workloads: §2 Probes'],
  [/\bResourceQuota\b|\bLimitRange\b/, 4, '04 Scheduling: requests, limits y cuotas'],
  [/\bQoS\b|\bBurstable\b|\bBestEffort\b/, 4, '04 Scheduling: clases QoS'],
  [/\bthrottl/i, 4, '04 Scheduling: límites de CPU'],
  [/\bdrain\b|\buncordon\b|\bcordon\b|PodDisruptionBudget|\bPDB\b/i, 4, '04 Scheduling: Mantenimiento de nodos'],
  [/schedulingGates|Dynamic Resource Allocation|\bResourceClaim\b|\bDeviceClass\b/, 4, '04 Scheduling: scheduling gates y DRA'],
  [/Policy as Code|\bGatekeeper\b|\bKyverno\b/i, 5, '05 Seguridad: Admission controllers (Policy as Code)'],
  [/externalTrafficPolicy|_SERVICE_HOST\b/, 6, '06 Networking: Services y DNS'],
  [/kubernetes\.io\/tls/, 6, '06 Networking: TLS en Ingress'],
  [/\bFalco\b/, 10, '10 Arquitectura cloud native: seguridad en runtime'],
  [/\bdockerconfigjson\b|\bimagePullSecrets?\b/i, 3, '03 Workloads: Secrets para registries privados'],
  [/--dry-run\b/, 3, '03 Workloads: generar YAML con --dry-run=client -o yaml'],
];
