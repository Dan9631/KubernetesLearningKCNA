<script lang="ts">
  // El paisaje CNCF: tarjetas de proyectos con madurez y categoría, y cómo se gobierna Kubernetes (releases y KEPs).
  type Level = 'graduated' | 'incubating' | 'sandbox' | 'none';
  interface Project { name: string; level: Level; cat: string; what: string; std?: string; year?: number }

  const LEVEL_ES: Record<Level, string> = { graduated: 'graduated', incubating: 'incubating', sandbox: 'sandbox', none: 'no es CNCF' };
  const PROJECTS: Project[] = [
    { name: 'Kubernetes', level: 'graduated', cat: 'orquestación', what: 'Orquestador de contenedores: el primer proyecto de la CNCF y el primero en graduarse.', std: 'Define las interfaces CRI, CNI y CSI que otros implementan', year: 2018 },
    { name: 'Prometheus', level: 'graduated', cat: 'observabilidad', what: 'Sistema de monitoreo y base de datos de series temporales con modelo pull y PromQL.', std: 'Formato de exposición que dio origen a OpenMetrics', year: 2018 },
    { name: 'Envoy', level: 'graduated', cat: 'red y service mesh', what: 'Proxy L7 de alto rendimiento; es el plano de datos de Istio y de muchos API gateways.', std: 'Implementa Gateway API (Envoy Gateway); API xDS', year: 2018 },
    { name: 'CoreDNS', level: 'graduated', cat: 'red y service mesh', what: 'Servidor DNS extensible; el DNS interno por defecto de Kubernetes desde v1.13.', year: 2019 },
    { name: 'containerd', level: 'graduated', cat: 'runtime', what: 'Runtime de contenedores que el kubelet usa por defecto; nació dentro de Docker.', std: 'Implementa CRI y las specs OCI', year: 2019 },
    { name: 'CRI-O', level: 'graduated', cat: 'runtime', what: 'Runtime ligero creado solo para Kubernetes; usado por OpenShift.', std: 'Implementa CRI y las specs OCI', year: 2023 },
    { name: 'etcd', level: 'graduated', cat: 'almacenamiento', what: 'Almacén clave-valor distribuido y consistente donde Kubernetes guarda todo su estado.', year: 2020 },
    { name: 'Helm', level: 'graduated', cat: 'entrega de aplicaciones', what: 'Gestor de paquetes de Kubernetes: charts, releases y repositorios.', std: 'Charts distribuidos como artefactos OCI', year: 2020 },
    { name: 'Argo', level: 'graduated', cat: 'entrega de aplicaciones', what: 'Familia de herramientas: Argo CD (GitOps), Workflows, Rollouts y Events.', std: 'Argo Events consume CloudEvents', year: 2022 },
    { name: 'Flux', level: 'graduated', cat: 'entrega de aplicaciones', what: 'Conjunto de controladores GitOps que reconcilian el clúster con un repositorio Git.', std: 'Fuentes OCI para manifiestos y charts', year: 2022 },
    { name: 'Cilium', level: 'graduated', cat: 'red y service mesh', what: 'Red, observabilidad y seguridad basadas en eBPF; también hace de service mesh sin sidecars.', std: 'Implementa CNI y Gateway API (GAMMA)', year: 2023 },
    { name: 'Istio', level: 'graduated', cat: 'red y service mesh', what: 'Service mesh con plano de datos Envoy (sidecar o modo ambient): mTLS, tráfico, telemetría.', std: 'Implementa Gateway API (GAMMA)', year: 2023 },
    { name: 'Linkerd', level: 'graduated', cat: 'red y service mesh', what: 'Service mesh ligero con su propio micro-proxy en Rust; el primero en graduarse.', std: 'Implementa Gateway API (GAMMA)', year: 2021 },
    { name: 'OpenTelemetry', level: 'graduated', cat: 'observabilidad', what: 'APIs, SDKs, protocolo OTLP y Collector para trazas, métricas y logs; no almacena datos.', std: 'Es el estándar OTel: propagación W3C traceparent, OTLP', year: 2026 },
    { name: 'Jaeger', level: 'graduated', cat: 'observabilidad', what: 'Backend y UI para almacenar y visualizar trazas distribuidas.', std: 'Acepta OTLP (OpenTelemetry)', year: 2019 },
    { name: 'Fluentd', level: 'graduated', cat: 'observabilidad', what: 'Colector y enrutador de logs; Fluent Bit es su hermano ligero en C.', year: 2019 },
    { name: 'Thanos', level: 'incubating', cat: 'observabilidad', what: 'Prometheus de larga duración y alta disponibilidad con almacenamiento de objetos.', year: 2020 },
    { name: 'Cortex', level: 'incubating', cat: 'observabilidad', what: 'Prometheus multi-tenant, escalable horizontalmente; base de Grafana Mimir.', year: 2020 },
    { name: 'Falco', level: 'graduated', cat: 'seguridad', what: 'Seguridad en tiempo de ejecución: detecta comportamientos anómalos en contenedores y nodos (eBPF).', year: 2024 },
    { name: 'Open Policy Agent', level: 'graduated', cat: 'seguridad', what: 'Motor de políticas de propósito general (Rego); Gatekeeper lo integra como admission controller.', year: 2021 },
    { name: 'Kyverno', level: 'graduated', cat: 'seguridad', what: 'Motor de políticas nativo de Kubernetes escrito en YAML: valida, muta y genera recursos.', year: 2026 },
    { name: 'cert-manager', level: 'graduated', cat: 'seguridad', what: 'Emite y renueva certificados TLS automáticamente (ACME/Let\'s Encrypt, CAs internas).', year: 2024 },
    { name: 'SPIFFE / SPIRE', level: 'graduated', cat: 'seguridad', what: 'Identidad criptográfica para cargas de trabajo (SVIDs); base de la confianza entre servicios.', year: 2022 },
    { name: 'Harbor', level: 'graduated', cat: 'registro de imágenes', what: 'Registro de contenedores con escaneo de vulnerabilidades, firmas y replicación.', std: 'Implementa OCI distribution spec', year: 2020 },
    { name: 'KEDA', level: 'graduated', cat: 'autoscaling y serverless', what: 'Autoescalado dirigido por eventos (colas, cron, PromQL) con escala a cero; crea un HPA por debajo.', year: 2023 },
    { name: 'Knative', level: 'graduated', cat: 'autoscaling y serverless', what: 'Serverless sobre Kubernetes: Serving (revisiones, scale-to-zero) y Eventing (brokers, triggers).', std: 'Eventing usa CloudEvents', year: 2025 },
    { name: 'CloudEvents', level: 'graduated', cat: 'autoscaling y serverless', what: 'Especificación de un formato común para describir eventos (id, source, type).', std: 'Es el estándar CloudEvents', year: 2024 },
    { name: 'Dapr', level: 'graduated', cat: 'plataforma y desarrollo', what: 'Runtime de APIs para microservicios (estado, pub/sub, invocación) vía sidecar.', year: 2024 },
    { name: 'Backstage', level: 'incubating', cat: 'plataforma y desarrollo', what: 'Portal de desarrolladores (IDP) creado por Spotify: catálogo de servicios, plantillas, docs.', year: 2022 },
    { name: 'Keycloak', level: 'incubating', cat: 'seguridad', what: 'Gestión de identidad y acceso: SSO, OIDC, SAML, federación de usuarios.', year: 2023 },
    { name: 'OpenCost', level: 'incubating', cat: 'FinOps', what: 'Calcula el costo de cada namespace, Deployment o label combinando métricas y precios del proveedor.', year: 2024 },
    { name: 'Rook', level: 'graduated', cat: 'almacenamiento', what: 'Operador que despliega y opera Ceph como almacenamiento nativo del clúster.', std: 'Expone volúmenes vía CSI', year: 2020 },
    { name: 'Longhorn', level: 'incubating', cat: 'almacenamiento', what: 'Almacenamiento de bloques distribuido y ligero, creado por Rancher.', std: 'Driver CSI', year: 2021 },
    { name: 'Vitess', level: 'graduated', cat: 'datos', what: 'MySQL con sharding horizontal, nacido en YouTube.', year: 2019 },
    { name: 'TUF', level: 'graduated', cat: 'seguridad', what: 'The Update Framework: actualizaciones de software seguras; base de Notary y Sigstore.', year: 2019 },
    { name: 'Kubewarden', level: 'sandbox', cat: 'seguridad', what: 'Motor de políticas cuyas reglas se escriben como módulos WebAssembly.' },
    { name: 'OpenFGA', level: 'sandbox', cat: 'seguridad', what: 'Autorización de grano fino inspirada en Google Zanzibar.' },
    { name: 'Krkn', level: 'sandbox', cat: 'plataforma y desarrollo', what: 'Ingeniería del caos para Kubernetes: inyecta fallos y mide la resiliencia.' },
    { name: 'Kuasar', level: 'sandbox', cat: 'runtime', what: 'Runtime multi-sandbox (microVMs, WebAssembly) que habla con containerd.', std: 'Sandbox API de containerd' },
    { name: 'Grafana', level: 'none', cat: 'observabilidad', what: 'La herramienta de dashboards más usada; es de Grafana Labs, no de la CNCF. Pregunta trampa de examen.' },
    { name: 'Karpenter', level: 'none', cat: 'autoscaling y serverless', what: 'Autoescalador de nodos nacido en AWS; vive en kubernetes-sigs (SIG Autoscaling), no es un proyecto CNCF aparte.' },
  ];
  const LEVELS: Level[] = ['graduated', 'incubating', 'sandbox', 'none'];
  const CATS = [...new Set(PROJECTS.map((p) => p.cat))];

  let level = $state<Level | 'all'>('all');
  let cat = $state('all');
  let open = $state<Project | null>(null);
  const shown = $derived(PROJECTS.filter((p) => (level === 'all' || p.level === level) && (cat === 'all' || p.cat === cat)));
  const counts = $derived(Object.fromEntries(LEVELS.map((l) => [l, PROJECTS.filter((p) => p.level === l).length])) as Record<Level, number>);

  // Ciclo de releases: meses desde enero de 2025.
  const VERSIONS = [
    { v: '1.31', rel: -5 }, { v: '1.32', rel: -1 }, { v: '1.33', rel: 3 }, { v: '1.34', rel: 7 }, { v: '1.35', rel: 11 }, { v: '1.36', rel: 15 }, { v: '1.37', rel: 19 }, { v: '1.38', rel: 23 },
  ];
  const SUPPORT = 14;
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const label = (m: number) => `${MONTHS[m % 12]} ${2025 + Math.floor(m / 12)}`;
  let now = $state(21);
  const relState = (r: { rel: number }) => (r.rel > now ? 'futura' : now < r.rel + SUPPORT ? 'soportada' : 'fin de soporte');
  const supported = $derived(VERSIONS.filter((r) => relState(r) === 'soportada').map((r) => r.v));
  const TW = 620, TH = 190, TL = 50, TR = 10;
  const mx = (m: number) => TL + ((TW - TL - TR) * m) / 36;

  const KEP = [
    { t: 'Idea', d: 'Alguien detecta una necesidad y la plantea en el SIG dueño del área (issue, reunión del SIG, lista de correo). Sin KEP no hay cambio relevante.' },
    { t: 'KEP en el SIG', d: 'Se escribe el Kubernetes Enhancement Proposal: motivación, diseño, riesgos y criterios de graduación. Lo revisan y aprueban los SIGs responsables; se registra en kubernetes/enhancements.' },
    { t: 'Alpha', d: 'Llega en una release detrás de un feature gate desactivado por defecto. Puede cambiar o desaparecer sin aviso; API v1alpha1. No para producción.' },
    { t: 'Beta', d: 'Bien probada; las funcionalidades suelen activarse por defecto, pero las APIs beta nuevas vienen desactivadas (desde v1.24). Los detalles aún pueden cambiar; API v1beta1.' },
    { t: 'GA (stable)', d: 'Siempre activa, API v1. Se mantiene muchas versiones y sigue la política de deprecación. El KEP se marca como implementado.' },
  ];
  let kep = $state(0);
</script>

<div class="cncf">
  <div class="controls">
    <label>madurez
      <select bind:value={level}>
        <option value="all">todas</option>
        {#each LEVELS as l}<option value={l}>{LEVEL_ES[l]} ({counts[l]})</option>{/each}
      </select>
    </label>
    <label>categoría
      <select bind:value={cat}>
        <option value="all">todas</option>
        {#each CATS as c}<option value={c}>{c}</option>{/each}
      </select>
    </label>
    <span class="hint">{shown.length} de {PROJECTS.length} proyectos · niveles a fecha de 2026</span>
  </div>

  <div class="grid" role="list">
    {#each shown as p (p.name)}
      <button type="button" class="card {p.level}" class:open={open?.name === p.name} role="listitem" onclick={() => (open = open?.name === p.name ? null : p)}>
        <span class="name">{p.name}</span>
        <span class="lvl">{LEVEL_ES[p.level]}</span>
        <span class="cat">{p.cat}</span>
      </button>
    {:else}
      <p class="hint">Ningún proyecto con ese filtro.</p>
    {/each}
  </div>

  <div class="explain {open ? (open.level === 'graduated' ? 'ok' : open.level === 'none' ? 'fail' : open.level === 'incubating' ? 'warn' : '') : ''}" aria-live="polite">
    {#if open}
      <strong>{open.name}</strong> · {LEVEL_ES[open.level]}{open.year ? ` (desde ${open.year})` : ''} · {open.cat}
      <p>{open.what}</p>
      {#if open.std}<p class="std">Estándar: {open.std}</p>{/if}
    {:else}
      Pulsa una tarjeta. Sandbox: experimental, entrada fácil. Incubating: usado en producción, comunidad creciente. Graduated: maduro, adopción amplia, auditoría de seguridad. El TOC decide los cambios de nivel; consulta el estado actual en cncf.io/projects.
    {/if}
  </div>

  <h4>Cómo se gobierna Kubernetes</h4>

  <div class="timeline">
    <label for="cncf-now">mes: <strong>{label(now)}</strong></label>
    <input id="cncf-now" type="range" min="0" max="35" bind:value={now} />
    <svg viewBox="0 0 {TW} {TH}" role="img" aria-label="Ciclo de releases de Kubernetes">
      {#each [0, 6, 12, 18, 24, 30] as m}
        <line x1={mx(m)} x2={mx(m)} y1={8} y2={TH - 20} class="grid-l" />
        <text x={mx(m)} y={TH - 6} class="lbl" text-anchor="middle">{label(m)}</text>
      {/each}
      {#each VERSIONS as r, i (r.v)}
        {@const s = relState(r)}
        <rect x={Math.max(mx(r.rel), TL)} y={12 + i * 19} width={Math.max(0, mx(r.rel + SUPPORT) - Math.max(mx(r.rel), TL))} height="14" rx="3" class="bar {s === 'soportada' ? 'ok' : s === 'futura' ? 'fut' : 'eol'}" />
        <text x={Math.max(mx(r.rel), TL) - 4} y={23 + i * 19} class="lbl v" text-anchor="end">v{r.v}</text>
      {/each}
      <line x1={mx(now)} x2={mx(now)} y1={4} y2={TH - 18} class="now" />
    </svg>
    <p class="hint">
      {#if supported.length}Soportadas en {label(now)}: <strong class="mono">{supported.map((v) => `v${v}`).join(', ')}</strong>.{:else}Sin datos para ese mes.{/if}
      Tres versiones menores al año (ciclos de ~15 semanas); cada una recibe parches unos 14 meses (12 de soporte + 2 para actualizar), así que siempre hay tres mantenidas a la vez.
    </p>
  </div>

  <div class="kep">
    <div class="flow" role="tablist" aria-label="Flujo de un KEP">
      {#each KEP as k, i (k.t)}
        <button type="button" role="tab" aria-selected={kep === i} class:cur={kep === i} class:done={i < kep} onclick={() => (kep = i)}>{k.t}</button>
      {/each}
    </div>
    <div class="explain">
      <strong>{KEP[kep].t}.</strong> {KEP[kep].d}
    </div>
    <p class="hint">Steering Committee (7 personas, gobierno general) · SIGs (permanentes, dueños de un área) · WGs (temporales, entre SIGs) · Committees (Code of Conduct, Security Response). Los KEPs los aprueban los SIGs, no el Steering ni el TOC de la CNCF.</p>
  </div>
</div>

<style>
  .cncf { display: grid; gap: 12px; }
  .controls { margin-bottom: 0; }
  .controls label { display: inline-flex; align-items: center; gap: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
  .card { --c: var(--ink-3); display: grid; gap: 2px; text-align: left; font: inherit; padding: 8px 10px; border-radius: var(--r-m); border: 1px solid var(--line); border-left: 4px solid var(--c); background: var(--panel); color: var(--ink); cursor: pointer; transition: border-color var(--dur), box-shadow var(--dur); }
  .card:hover, .card.open { border-color: var(--c); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 20%, transparent); }
  .card.graduated { --c: var(--ready); }
  .card.incubating { --c: var(--wait); }
  .card.sandbox { --c: var(--helm); }
  .card.none { --c: var(--fail); }
  .name { font-weight: 600; font-size: 0.92rem; }
  .lvl { font-size: 0.74rem; color: var(--c); font-weight: 600; }
  .cat { font-size: 0.74rem; color: var(--ink-3); }
  .explain { margin-top: 0; }
  .explain p { margin-top: 4px; }
  .std { color: var(--ink-2); font-size: 0.9rem; }
  h4 { font-size: 1rem; margin-top: 6px; }
  .timeline { display: grid; gap: 6px; }
  .timeline input { width: 100%; }
  .timeline svg { width: 100%; height: auto; background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--r-m); }
  .grid-l { stroke: var(--line); }
  .lbl { font: 10px var(--mono); fill: var(--ink-3); }
  .lbl.v { fill: var(--ink-2); }
  .bar.ok { fill: var(--helm); }
  .bar.eol { fill: var(--line); }
  .bar.fut { fill: var(--helm-2); stroke: var(--helm); stroke-dasharray: 3 3; }
  .now { stroke: var(--fail); stroke-width: 2; }
  .kep { display: grid; gap: 8px; }
  .flow { display: flex; flex-wrap: wrap; gap: 6px; }
  .flow button { flex: 1 1 100px; font: inherit; font-size: 0.86rem; padding: 6px 10px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel-2); color: var(--ink-2); cursor: pointer; }
  .flow button.done { background: var(--helm-2); border-color: var(--helm-2); color: var(--helm-ink); }
  .flow button.cur { background: var(--helm); border-color: var(--helm); color: #fff; }
</style>
