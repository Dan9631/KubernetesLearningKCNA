<script lang="ts">
  // Cómo recolecta Prometheus: escena pull/push con service discovery y un mini playground PromQL sobre series sintéticas.
  import { ms, wait } from '../../lib/motion';

  // ---------- Escena ----------
  interface Target { id: string; name: string; job: string; kind: 'node' | 'ksm' | 'pod' | 'pgw'; sample: (n: number) => string[] }
  const nodeNames = ['kcna-control-plane', 'kcna-worker', 'kcna-worker2'];
  const base: Target[] = [
    ...nodeNames.map((n, i): Target => ({
      id: `ne-${n}`, name: `node-exporter @ ${n}`, job: 'kubernetes-service-endpoints', kind: 'node',
      sample: (k) => [`up{job="kubernetes-service-endpoints", node="${n}"} 1`, `node_cpu_seconds_total{node="${n}", mode="idle"} ${(48213.7 + i * 1000 + k * 14.2).toFixed(1)}`, `node_memory_MemAvailable_bytes{node="${n}"} ${(2.5e9 + Math.sin(k + i) * 1e8).toExponential(3)}`],
    })),
    { id: 'ksm', name: 'kube-state-metrics', job: 'kubernetes-service-endpoints', kind: 'ksm',
      sample: () => ['up{job="kubernetes-service-endpoints", app="kube-state-metrics"} 1', 'kube_pod_status_phase{namespace="lab-09", pod="api-6f8d9b7c4d-q2xkp", phase="Running"} 1', 'kube_deployment_status_replicas_available{namespace="lab-09", deployment="shop"} 2'] },
  ];
  let targets = $state<Target[]>(base.map((t) => ({ ...t })));
  let undiscovered = $state<string[]>([]);
  let mode = $state<'pull' | 'push'>('pull');
  let scraping = $state(false);
  let pushing = $state(false);
  let n = $state(0);
  let auto = $state(false);
  let pushed = $state(0);
  let samples = $state<string[]>([]);
  let note = $state<{ kind: '' | 'ok' | 'warn' | 'fail'; text: string }>({ kind: '', text: 'Pulsa "scrape": Prometheus va a buscar (pull) las métricas por HTTP a cada target. Nadie le empuja nada.' });

  const pgw: Target = { id: 'pgw', name: 'Pushgateway', job: 'pushgateway', kind: 'pgw', sample: (k) => pushed ? [`up{job="pushgateway"} 1`, `batch_filas_procesadas_total{job="backup-nocturno"} ${pushed * 1250}`, `batch_ultima_ejecucion_timestamp{job="backup-nocturno"} ${(1792776200 + k * 15).toFixed(0)}`] : ['up{job="pushgateway"} 1'] };
  const all = $derived(mode === 'push' ? [...targets, pgw] : targets);

  const ROW = 46, TOP = 26;
  const H = $derived(Math.max(240, TOP + all.length * ROW + 16));
  const W = 760;
  const TX = 130, TWD = 180; // columna de targets
  const PX = 370, PW = 150; // prometheus
  const RX = 590, RW = 160; // derecha
  const ty = (i: number) => TOP + i * ROW;
  const py = $derived(H / 2 - 40);

  async function scrape() {
    if (scraping) return;
    scraping = true;
    n += 1;
    note = { kind: 'warn', text: `Scrape ${n}: GET http://<target>/metrics a ${all.length} targets (scrape_interval: 15s). Si uno no responde, su serie up vale 0 y eso ya es una alerta.` };
    await wait(900);
    samples = all.flatMap((t) => t.sample(n));
    scraping = false;
    note = { kind: 'ok', text: `Llegaron ${samples.length} muestras y se guardaron en la TSDB local con la marca de tiempo del scrape. Los counters (…_total) suben entre scrapes; los gauges suben y bajan.` };
  }
  $effect(() => {
    if (!auto) return;
    const id = setInterval(() => { if (!scraping) scrape(); }, 3000);
    return () => clearInterval(id);
  });

  async function runJob() {
    if (pushing) return;
    pushing = true;
    note = { kind: 'warn', text: 'El job batch dura 3 segundos: moriría antes del siguiente scrape. Al terminar, empuja (push) sus métricas al Pushgateway…' };
    await wait(900);
    pushed += 1;
    pushing = false;
    note = { kind: 'ok', text: 'El Pushgateway retiene esas métricas y Prometheus las recoge en su próximo scrape, como a cualquier otro target. Es la excepción, no la regla: para servicios de larga vida siempre pull.' };
  }
  function addPod(annotated: boolean) {
    const name = `tienda-856f956f9f-${Math.random().toString(36).slice(2, 7)}`;
    if (annotated) {
      targets = [...targets, { id: name, name: `${name} (/metrics.txt)`, job: 'kubernetes-pods', kind: 'pod',
        sample: (k) => [`up{job="kubernetes-pods", pod="${name}"} 1`, `tienda_pedidos_total{pod="${name}", metodo="tarjeta"} ${k * 13}`, `tienda_carrito_items{pod="${name}"} ${35 + Math.round(Math.sin(k) * 5)}`] }];
      note = { kind: 'ok', text: `Pod ${name} con prometheus.io/scrape: "true", port y path. El service discovery de Kubernetes lo detecta a través de la API y el job kubernetes-pods lo añade como target sin tocar prometheus.yml.` };
    } else {
      undiscovered = [...undiscovered, name];
      note = { kind: 'fail', text: `Pod ${name} sin anotaciones: el relabeling del job kubernetes-pods lo descarta (action: keep solo si prometheus.io/scrape vale "true"). Existe, pero Prometheus no lo scrapea.` };
    }
  }
  function removePod() {
    const last = [...targets].reverse().find((t) => t.kind === 'pod');
    if (!last) { undiscovered = undiscovered.slice(0, -1); return; }
    targets = targets.filter((t) => t.id !== last.id);
    note = { kind: '', text: `Pod borrado: el service discovery lo quita de la lista de targets en el siguiente refresco. Sus series quedan en la TSDB hasta que caduque la retención.` };
  }
  function setMode(m: 'pull' | 'push') {
    mode = m;
    note = m === 'pull'
      ? { kind: '', text: 'Modelo pull: Prometheus decide cuándo y a quién preguntar. Ventajas: detecta targets caídos (up = 0), controla la carga y no necesita que las apps conozcan su dirección.' }
      : { kind: 'warn', text: 'Modelo push (Pushgateway): solo para trabajos de vida corta. El job empuja sus métricas al Pushgateway y Prometheus sigue haciendo pull del Pushgateway. Ejecuta el job batch para verlo.' };
  }

  // ---------- Playground PromQL ----------
  type MType = 'counter' | 'gauge' | 'histogram' | 'summary';
  interface Series { labels: string; points: (number | null)[] }
  interface Result { series: Series[]; type: MType; unit: string; note: string }
  const N = 31; // 30 minutos, un punto por minuto
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const PODS = [
    { ns: 'lab-09', pod: 'api-6f8d9b7c4d-q2xkp', cpu: 0.012, mem: 18e6, req: 32e6 },
    { ns: 'lab-09', pod: 'shop-7d9c8b6f5e-a1b2c', cpu: 0.004, mem: 4e6, req: 16e6 },
    { ns: 'lab-11', pod: 'prometheus-server-5f6f475b8c-tvxbh', cpu: 0.075, mem: 360e6, req: 256e6 },
    { ns: 'lab-11', pod: 'tienda-856f956f9f-b2w7k', cpu: 0.02, mem: 25e6, req: 64e6 },
    { ns: 'kube-system', pod: 'coredns-7c65d6cfc9-x8k2p', cpu: 0.003, mem: 14e6, req: 70e6 },
  ];
  const cpuCounter = PODS.map((p) => { let v = 1000 * rnd(); return Array.from({ length: N }, (_, i) => { v += 60 * p.cpu * (0.6 + 0.8 * rnd()) * (i > 18 && p.pod.startsWith('tienda') ? 3 : 1); return v; }); });
  const memGauge = PODS.map((p) => Array.from({ length: N }, (_, i) => p.mem * (0.9 + 0.2 * rnd()) * (p.pod.startsWith('prometheus') ? 1 + i / 100 : 1)));
  const LES = [0.05, 0.1, 0.25, 0.5, 1, Infinity];
  const buckets = (() => { const tot: number[][] = LES.map(() => []); let c = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < N; i++) { const slow = i > 20 ? 2 : 1; const obs = [40, 30, 15, 8 * slow, 4 * slow, 2 * slow]; let acc = 0; for (let b = 0; b < LES.length; b++) { acc += obs[b] * (0.8 + 0.4 * rnd()) * 60; c[b] += acc; tot[b].push(c[b]); } } return tot; })();
  const upSeries = [
    { labels: 'up{job="kubernetes-service-endpoints", node="kcna-control-plane"}', v: () => 1 },
    { labels: 'up{job="kubernetes-service-endpoints", node="kcna-worker"}', v: () => 1 },
    { labels: 'up{job="kubernetes-service-endpoints", node="kcna-worker2"}', v: () => 1 },
    { labels: 'up{job="kubernetes-service-endpoints", app="kube-state-metrics"}', v: () => 1 },
    { labels: 'up{job="kubernetes-pods", pod="tienda-856f956f9f-b2w7k"}', v: () => 1 },
    { labels: 'up{job="kubernetes-pods", pod="tienda-856f956f9f-8szwz"}', v: (i: number) => (i >= 22 ? 0 : 1) },
  ];
  const rate = (arr: number[]) => arr.map((v, i) => (i < 5 ? null : (v - arr[i - 5]) / 300));

  const QUERIES: { q: string; eval: () => Result }[] = [
    { q: 'up', eval: () => ({ type: 'gauge', unit: '1 = responde, 0 = caído', note: 'up es la métrica que Prometheus fabrica en cada scrape: 1 si el target respondió, 0 si no. Fíjate en el segundo pod de tienda: cae a 0 en el minuto 22. La alerta más básica es up == 0.', series: upSeries.map((s) => ({ labels: s.labels, points: Array.from({ length: N }, (_, i) => s.v(i)) })) }) },
    { q: 'rate(container_cpu_usage_seconds_total[5m])', eval: () => ({ type: 'counter', unit: 'núcleos (0.075 = 75m)', note: 'El counter acumula segundos de CPU desde que arrancó el contenedor: su valor crudo no dice nada. rate() calcula el incremento por segundo promediado en la ventana de 5 min; por eso los primeros 5 minutos no tienen valor. El pod de tienda triplica su consumo desde el minuto 19.', series: PODS.map((p, k) => ({ labels: `{namespace="${p.ns}", pod="${p.pod}"}`, points: rate(cpuCounter[k]) })) }) },
    { q: 'sum by (namespace) (container_memory_working_set_bytes)', eval: () => { const nss = [...new Set(PODS.map((p) => p.ns))]; return { type: 'gauge', unit: 'bytes (working set)', note: 'Un gauge se lee directo (sin rate). sum by (namespace) agrupa las series por ese label y suma las demás dimensiones. Es la misma memoria que vigila el OOM killer y que muestra kubectl top.', series: nss.map((ns) => ({ labels: `{namespace="${ns}"}`, points: Array.from({ length: N }, (_, i) => PODS.reduce((a, p, k) => a + (p.ns === ns ? memGauge[k][i] : 0), 0)) })) }; } },
    { q: 'kube_pod_status_phase{phase="Pending"}', eval: () => ({ type: 'gauge', unit: '1 = el pod está en esa fase', note: 'kube-state-metrics publica una serie por pod y fase con valor 0 o 1. Filtrar con {phase="Pending"} deja solo esa dimensión; sum() te daría cuántos pods esperan nodo. cache estuvo Pending hasta el minuto 15 (el nodeSelector del lab 09).', series: [
      { labels: '{namespace="lab-09", pod="cache-854b994f8f-fw58h", phase="Pending"}', points: Array.from({ length: N }, (_, i) => (i < 15 ? 1 : 0)) },
      { labels: '{namespace="lab-09", pod="api-6f8d9b7c4d-q2xkp", phase="Pending"}', points: Array.from({ length: N }, () => 0) },
      { labels: '{namespace="lab-11", pod="tienda-856f956f9f-b2w7k", phase="Pending"}', points: Array.from({ length: N }, () => 0) },
    ] }) },
    { q: 'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))', eval: () => {
      const rates = buckets.map(rate);
      const pts = Array.from({ length: N }, (_, i) => {
        if (i < 5) return null;
        const r = rates.map((b) => b[i] as number);
        const rank = 0.95 * r[LES.length - 1];
        let b = 0; while (b < LES.length - 1 && r[b] < rank) b++;
        if (b === LES.length - 1) return LES[LES.length - 2];
        const lo = b === 0 ? 0 : LES[b - 1], lc = b === 0 ? 0 : r[b - 1];
        return lo + (LES[b] - lo) * ((rank - lc) / (r[b] - lc));
      });
      return { type: 'histogram', unit: 'segundos (latencia p95)', note: 'Un histogram expone buckets acumulativos (_bucket con label le), más _sum y _count. Se hace rate() de cada bucket, se suman por le y histogram_quantile interpola el p95 en el servidor. Como son counters por bucket, se pueden agregar entre pods. Desde el minuto 21 las peticiones lentas se duplican.', series: [{ labels: '{quantile p95, job="kubernetes-pods", app="tienda"}', points: pts }] };
    } },
    { q: '(kube_pod_container_resource_requests{resource="memory"} - container_memory_working_set_bytes) / kube_pod_container_resource_requests{resource="memory"}', eval: () => ({ type: 'gauge', unit: 'fracción del request sin usar (negativo = usa más de lo que pide)', note: 'Aritmética entre vectores: PromQL empareja las series por labels iguales (namespace, pod). Resultado FinOps: qué parte del request está desperdiciada. prometheus-server sale negativo (usa más de lo que pide, riesgo de presión de memoria); coredns desperdicia ~80 %. Base del right-sizing, VPA en modo Off y OpenCost.', series: PODS.map((p, k) => ({ labels: `{namespace="${p.ns}", pod="${p.pod}"}`, points: memGauge[k].map((m) => (p.req - m) / p.req) })) }) },
  ];
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  let qi = $state(0);
  let free = $state('');
  let qerr = $state('');
  let result = $state<Result>(QUERIES[0].eval());
  const TYPES: { t: MType; d: string }[] = [
    { t: 'counter', d: 'Counter: solo sube (o vuelve a 0 al reiniciar). Peticiones totales, errores, segundos de CPU. Nunca se lee crudo: rate() o increase().' },
    { t: 'gauge', d: 'Gauge: sube y baja. Memoria en uso, temperatura, pods en cola, up. Se lee directo o con avg/max/min.' },
    { t: 'histogram', d: 'Histogram: cuenta observaciones en buckets acumulativos (_bucket{le}, _sum, _count). Los cuantiles se calculan en el servidor con histogram_quantile y se pueden agregar entre instancias.' },
    { t: 'summary', d: 'Summary: el cliente calcula los cuantiles ({quantile="0.95"}, _sum, _count). Más barato de consultar, pero no se puede agregar entre pods. Ninguna de las 6 consultas usa uno.' },
  ];
  let typeInfo = $state<MType | null>(null);
  const typeText = $derived(TYPES.find((t) => t.t === (typeInfo ?? result.type))!.d);

  function select(i: number) { qi = i; free = QUERIES[i].q; qerr = ''; result = QUERIES[i].eval(); }
  function runFree() {
    const i = QUERIES.findIndex((k) => norm(k.q) === norm(free));
    if (i < 0) { qerr = 'Este playground solo entiende las 6 consultas predefinidas (se aceptan cambios de espacios). Elige una del selector o cópiala tal cual.'; return; }
    select(i);
  }
  const fmt = (v: number | null, unit: string) => v === null ? '–' : unit.startsWith('bytes') ? `${(v / 1048576).toFixed(1)} MiB` : Math.abs(v) >= 1000 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3);

  // Gráfica
  const GW = 620, GH = 180, GL = 54, GR = 10, GT = 10, GB = 22;
  const COLORS = ['var(--helm)', 'var(--wait)', 'var(--ready)', 'var(--fail)', '#8250df', '#0f9d9d', 'var(--ink-3)', 'var(--helm-ink)'];
  const vals = $derived(result.series.flatMap((s) => s.points.filter((p): p is number => p !== null)));
  const vmin = $derived(Math.min(0, ...vals));
  const vmax = $derived(Math.max(...vals, vmin + 1e-9) * 1.05 || 1);
  const gx = (i: number) => GL + ((GW - GL - GR) * i) / (N - 1);
  const gy = $derived((v: number) => GT + (GH - GT - GB) * (1 - (v - vmin) / (vmax - vmin)));
  const path = $derived((s: Series) => s.points.map((p, i) => (p === null ? '' : `${i === 0 || s.points[i - 1] === null ? 'M' : 'L'}${gx(i).toFixed(1)},${gy(p).toFixed(1)}`)).join(' '));
</script>

<div class="prom">
  <div class="controls">
    <button type="button" class="btn small primary" onclick={scrape} disabled={scraping}>scrape (cada 15 s)</button>
    <button type="button" class="btn small" onclick={() => (auto = !auto)}>{auto ? 'Pausar' : 'Automático'}</button>
    <span class="seg" role="group" aria-label="Modelo">
      <button type="button" class="btn small" class:primary={mode === 'pull'} onclick={() => setMode('pull')}>pull</button>
      <button type="button" class="btn small" class:primary={mode === 'push'} onclick={() => setMode('push')}>push (Pushgateway)</button>
    </span>
    {#if mode === 'push'}<button type="button" class="btn small" onclick={runJob} disabled={pushing}>Ejecutar job batch</button>{/if}
    <button type="button" class="btn small" onclick={() => addPod(true)}>Crear pod anotado</button>
    <button type="button" class="btn small" onclick={() => addPod(false)}>Crear pod sin anotación</button>
    <button type="button" class="btn small" onclick={removePod} disabled={!targets.some((t) => t.kind === 'pod') && !undiscovered.length}>Borrar pod</button>
  </div>

  <svg viewBox="0 0 {W} {H}" class="scene" role="img" aria-label="Prometheus server, targets, Alertmanager y Grafana">
    <text x={TX} y="14" class="lbl">targets (service discovery)</text>
    {#each all as t, i (t.id)}
      <g class="target {t.kind}">
        <rect x={TX} y={ty(i)} width={TWD} height="32" rx="6" />
        <text x={TX + 10} y={ty(i) + 14} class="tname">{t.name}</text>
        <text x={TX + 10} y={ty(i) + 26} class="tjob">job={t.job}</text>
        <line x1={PX} y1={py + 40} x2={TX + TWD} y2={ty(i) + 16} class="wire" />
        {#if scraping}
          <circle r="5" class="probe" style={`--x0:${PX}px;--y0:${py + 40}px;--x1:${TX + TWD}px;--y1:${ty(i) + 16}px;--d:${ms(900)}ms`} />
        {/if}
      </g>
      {#if t.kind === 'pgw'}
        <g class="job" class:pushing>
          <rect x="10" y={ty(i)} width="100" height="32" rx="6" />
          <text x="60" y={ty(i) + 14} class="tname" text-anchor="middle">job batch</text>
          <text x="60" y={ty(i) + 26} class="tjob" text-anchor="middle">dura 3 s</text>
          <line x1="110" y1={ty(i) + 16} x2={TX} y2={ty(i) + 16} class="wire push" />
          {#if pushing}<circle r="5" class="probe once" style={`--x0:110px;--y0:${ty(i) + 16}px;--x1:${TX}px;--y1:${ty(i) + 16}px;--d:${ms(900)}ms`} />{/if}
        </g>
      {/if}
    {/each}
    {#each undiscovered as u, i (u)}
      <g class="target ghost">
        <rect x={TX} y={ty(all.length + i)} width={TWD} height="32" rx="6" />
        <text x={TX + 10} y={ty(all.length + i) + 14} class="tname">{u}</text>
        <text x={TX + 10} y={ty(all.length + i) + 26} class="tjob">sin anotación: no descubierto</text>
      </g>
    {/each}

    <g class="prom-box" class:active={scraping}>
      <rect x={PX} y={py} width={PW} height="80" rx="8" />
      <text x={PX + PW / 2} y={py + 20} class="tname big" text-anchor="middle">Prometheus server</text>
      <text x={PX + PW / 2} y={py + 38} class="tjob" text-anchor="middle">service discovery</text>
      <text x={PX + PW / 2} y={py + 52} class="tjob" text-anchor="middle">retrieval (scrape)</text>
      <text x={PX + PW / 2} y={py + 68} class="tjob" text-anchor="middle">TSDB + PromQL</text>
    </g>
    <text x={PX + PW / 2} y={py - 8} class="lbl" text-anchor="middle">{mode === 'pull' ? 'pull: GET /metrics' : 'pull (también del Pushgateway)'}</text>

    <g class="side">
      <rect x={RX} y={py - 30} width={RW} height="32" rx="6" />
      <text x={RX + 10} y={py - 16} class="tname">Alertmanager</text>
      <text x={RX + 10} y={py - 4} class="tjob">agrupa, silencia, enruta</text>
      <line x1={PX + PW} y1={py + 20} x2={RX} y2={py - 14} class="wire out" />
      <rect x={RX} y={py + 60} width={RW} height="32" rx="6" />
      <text x={RX + 10} y={py + 74} class="tname">Grafana</text>
      <text x={RX + 10} y={py + 86} class="tjob">consulta PromQL</text>
      <line x1={RX} y1={py + 76} x2={PX + PW} y2={py + 60} class="wire out" />
    </g>
  </svg>

  <pre class="samples" aria-live="polite">{samples.length ? `# scrape ${n} · ${samples.length} muestras\n${samples.join('\n')}` : '# todavía no hay muestras: pulsa scrape'}</pre>
  <div class="explain {note.kind}" aria-live="polite">{note.text}</div>

  <h4>Playground PromQL (series sintéticas de los últimos 30 min)</h4>
  <div class="controls">
    <label>consulta
      <select value={qi} onchange={(e) => select(Number((e.currentTarget as HTMLSelectElement).value))}>
        {#each QUERIES as k, i (k.q)}<option value={i}>{k.q.length > 48 ? k.q.slice(0, 46) + '…' : k.q}</option>{/each}
      </select>
    </label>
  </div>
  <form class="free" onsubmit={(e) => { e.preventDefault(); runFree(); }}>
    <input type="text" class="mono" bind:value={free} placeholder="escribe una de las 6 consultas" aria-label="Consulta PromQL" />
    <button type="submit" class="btn small">Execute</button>
  </form>
  {#if qerr}<p class="hint err">{qerr}</p>{/if}

  <div class="types" role="group" aria-label="Tipos de métrica">
    {#each TYPES as ty (ty.t)}
      <button type="button" class="chip" class:cur={result.type === ty.t} onmouseenter={() => (typeInfo = ty.t)} onmouseleave={() => (typeInfo = null)} onfocus={() => (typeInfo = ty.t)} onblur={() => (typeInfo = null)}>{ty.t}</button>
    {/each}
    <span class="hint">{typeText}</span>
  </div>

  <div class="result">
    <table class="tbl">
      <thead><tr><th>serie</th><th>último valor</th></tr></thead>
      <tbody>
        {#each result.series as s, i (s.labels)}
          <tr><td class="mono"><span class="sw" style={`background:${COLORS[i % COLORS.length]}`}></span>{s.labels}</td><td class="mono num">{fmt(s.points.at(-1) ?? null, result.unit)}</td></tr>
        {/each}
      </tbody>
    </table>
    <svg viewBox="0 0 {GW} {GH}" class="chart" role="img" aria-label="Gráfica de la consulta">
      {#each [vmin, (vmin + vmax) / 2, vmax / 1.05] as v}
        <line x1={GL} x2={GW - GR} y1={gy(v)} y2={gy(v)} class="grid-l" />
        <text x={GL - 4} y={gy(v) + 3} class="lbl" text-anchor="end">{fmt(v, result.unit)}</text>
      {/each}
      {#each result.series as s, i (s.labels)}
        <path d={path(s)} class="line" style={`stroke:${COLORS[i % COLORS.length]}`} />
      {/each}
      <text x={GL} y={GH - 6} class="lbl">-30m</text>
      <text x={GW - GR} y={GH - 6} class="lbl" text-anchor="end">ahora</text>
    </svg>
  </div>
  <div class="explain">{result.note} <span class="hint">Unidad: {result.unit}.</span></div>
</div>

<style>
  .prom { display: grid; gap: 12px; }
  .controls { margin-bottom: 0; }
  .seg { display: inline-flex; gap: 4px; }
  .scene { width: 100%; height: auto; background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--r-m); }
  .scene rect { fill: var(--panel); stroke: var(--line); }
  .target.pod rect { stroke: var(--ready); }
  .target.pgw rect { stroke: var(--wait); }
  .target.ghost rect { stroke: var(--fail); stroke-dasharray: 4 3; fill: transparent; }
  .job rect { stroke: var(--wait); stroke-dasharray: 4 3; }
  .job.pushing rect { fill: var(--wait-2); }
  .prom-box rect { fill: var(--helm-2); stroke: var(--helm); stroke-width: 1.5; transition: stroke-width var(--dur); }
  .prom-box.active rect { stroke-width: 3; }
  .side rect { stroke: var(--line); }
  .tname { font: 500 11px var(--sans); fill: var(--ink); }
  .tname.big { font-size: 12px; font-weight: 600; }
  .tjob { font: 9.5px var(--mono); fill: var(--ink-3); }
  .lbl { font: 10px var(--mono); fill: var(--ink-3); }
  .wire { stroke: var(--line); stroke-width: 1.2; }
  .wire.out { stroke-dasharray: 3 3; }
  .wire.push { stroke: var(--wait); }
  .probe { fill: var(--helm); animation: go var(--d) ease-in-out 1; transform: translate(var(--x0), var(--y0)); }
  .probe.once { fill: var(--wait); animation-name: once; }
  @keyframes go { 0% { transform: translate(var(--x0), var(--y0)); } 50% { transform: translate(var(--x1), var(--y1)); } 100% { transform: translate(var(--x0), var(--y0)); } }
  @keyframes once { 0% { transform: translate(var(--x0), var(--y0)); } 100% { transform: translate(var(--x1), var(--y1)); } }
  .samples { max-height: 170px; overflow: auto; font-size: 0.76rem; }
  .explain { margin-top: 0; }
  h4 { font-size: 1rem; margin-top: 6px; }
  .free { display: flex; gap: 8px; }
  .free input { flex: 1; min-width: 0; font-size: 0.85rem; }
  .err { color: var(--fail); }
  .types { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .chip { cursor: pointer; font-family: var(--mono); }
  .chip.cur { border-color: var(--helm); color: var(--helm-ink); background: var(--helm-2); }
  .types .hint { flex-basis: 100%; }
  .result { display: grid; gap: 10px; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
  .tbl th, .tbl td { text-align: left; padding: 4px 6px; border-bottom: 1px solid var(--line-2); vertical-align: top; word-break: break-all; }
  .tbl th { color: var(--ink-2); font-weight: 600; }
  .num { text-align: right; white-space: nowrap; }
  .sw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
  .chart { width: 100%; height: auto; background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--r-m); }
  .grid-l { stroke: var(--line-2); }
  .line { fill: none; stroke-width: 2; stroke-linejoin: round; }
</style>
