<script lang="ts">
  // HPA: carga -> CPU por pod -> fórmula -> réplicas, con ventana de estabilización, min/max y Cluster Autoscaler.
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { wait } from '../../lib/motion';

  const TICK = 15; // segundos simulados por tick
  const REQUEST = 100; // requests.cpu del pod (m)

  let min = $state(1);
  let max = $state(5);
  let target = $state(50);
  let windowSec = $state(300);
  let load = $state(0);
  let replicas = $state(1);
  let t = $state(0);
  let metricsServer = $state(true);
  let auto = $state(false);
  let busy = $state(false);
  let extraNode = $state(false);
  let full = $state(false);
  let formula = $state('');
  let history = $state<{ t: number; cpu: number; rep: number }[]>([]);
  let recs: { t: number; d: number }[] = [];
  let explain = $state<{ kind: '' | 'ok' | 'warn' | 'fail'; text: string }>({ kind: '', text: 'Sube la carga y pulsa "Tick de 15 s" (o activa el modo automático) para ver cómo decide el HPA.' });
  let seq = 1;
  let pods = $state<PodSpec[]>([{ id: 'p1', name: 'php-apache-67b9659944-b24s4', node: 'kcna-worker', status: 'Running', tag: '1%' }]);

  const nodes = $derived<NodeSpec[]>([
    { name: 'kcna-control-plane', role: 'control-plane', taints: ['node-role.kubernetes.io/control-plane:NoSchedule'] },
    { name: 'kcna-worker', role: 'worker', labels: full ? { ocupado: 'sí' } : {} },
    { name: 'kcna-worker2', role: 'worker', labels: full ? { ocupado: 'sí' } : {} },
    ...(extraNode ? [{ name: 'kcna-worker3', role: 'worker', labels: { nuevo: 'cluster-autoscaler' }, highlight: true } as NodeSpec] : []),
  ]);

  // Demanda total de CPU (en % de un request de 100m) repartida entre los pods que corren; cada pod puede pasarse hasta el limit (300m).
  const running = $derived(pods.filter((p) => p.status === 'Running').length || 1);
  const cpu = $derived(Math.max(1, Math.min(300, Math.round((1 + load * 4) / running))));

  // Vista para el lienzo: cada pod Running lleva su CPU % como etiqueta.
  const view = $derived(pods.map((p) => (p.status === 'Running' ? { ...p, tag: metricsServer ? `${cpu}%` : '?' } : p)));
  $effect(() => {
    if (!auto) return;
    const id = setInterval(() => { if (!busy) tick(); }, 1300);
    return () => clearInterval(id);
  });

  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const nameOf = () => `php-apache-67b9659944-${Math.random().toString(36).slice(2, 7)}`;
  const workers = () => ['kcna-worker', 'kcna-worker2', ...(extraNode ? ['kcna-worker3'] : [])];
  function placeNode(): string | undefined {
    const ws = workers();
    const cap = full ? 2 : 99;
    const fit = ws.filter((w) => pods.filter((p) => p.node === w).length < cap);
    if (!fit.length) return undefined;
    return fit.sort((a, b) => pods.filter((p) => p.node === a).length - pods.filter((p) => p.node === b).length)[0];
  }

  async function applyReplicas(n: number) {
    busy = true;
    while (pods.length < n) {
      const id = `p${++seq}`;
      const node = placeNode();
      pods = [...pods, { id, name: nameOf(), node, status: node ? 'ContainerCreating' : 'Pending', tag: node ? undefined : 'Insufficient cpu' }];
      await wait(350);
      if (node) pods = pods.map((p) => (p.id === id ? { ...p, status: 'Running' } : p));
    }
    while (pods.length > n) {
      const victim = pods.at(-1)!;
      pods = pods.map((p) => (p.id === victim.id ? { ...p, status: 'Terminating' } : p));
      await wait(350);
      pods = pods.filter((p) => p.id !== victim.id);
    }
    busy = false;
  }

  async function tick() {
    if (busy) return;
    t += TICK;
    const cur = replicas;
    const actual = cpu;
    if (!metricsServer) {
      history = [...history, { t, cpu: actual, rep: cur }].slice(-40);
      formula = 'TARGETS: <unknown>/' + target + '%';
      explain = { kind: 'fail', text: 'Sin metrics-server no hay Metrics API (metrics.k8s.io): el HPA muestra <unknown>, registra FailedGetResourceMetric y no escala. Lo mismo pasa si el pod no define requests.cpu: el porcentaje se calcula sobre los requests.' };
      return;
    }
    const ratio = actual / target;
    let desired = clamp(Math.ceil(cur * ratio));
    let text = `desiredReplicas = ceil(${cur} × ${actual} / ${target}) = ceil(${(cur * ratio).toFixed(2)}) = ${Math.ceil(cur * ratio)}`;
    let note = '';
    if (Math.abs(ratio - 1) <= 0.1) {
      desired = cur;
      note = `El cociente ${ratio.toFixed(2)} está dentro de la tolerancia del 10 % (0,9 a 1,1): el HPA no toca nada para evitar oscilaciones.`;
    }
    recs = [...recs, { t, d: desired }].filter((r) => t - r.t < windowSec);
    let next = desired;
    if (desired > cur) {
      next = Math.min(desired, cur * 2);
      if (next < desired) note = `Quiere ${desired}, pero la política de scaleUp del lab permite como mucho duplicar cada 15 s: pasa a ${next}.`;
      if (Math.ceil(cur * ratio) > max) note += ` ScalingLimited: TooManyReplicas (máximo ${max}).`;
    } else if (desired < cur) {
      const stab = Math.max(...recs.map((r) => r.d));
      next = Math.min(cur, Math.max(desired, stab));
      note = stab > desired
        ? `Recomienda ${desired}, pero la ventana de estabilización de bajada (${windowSec} s) obliga a usar la recomendación más alta de los últimos ${windowSec} s: ${stab}. Falta esperar.`
        : `Baja a ${next}: ninguna recomendación de los últimos ${windowSec} s fue mayor.`;
      if (Math.ceil(cur * ratio) < min) note += ` Nunca por debajo de minReplicas (${min}).`;
    } else if (!note) {
      note = cur === max && Math.ceil(cur * ratio) > max ? `ScalingLimited: quiere ${Math.ceil(cur * ratio)} réplicas pero maxReplicas es ${max}.` : 'Coincide con las réplicas actuales: nada que hacer.';
    }
    next = clamp(next);
    formula = text;
    history = [...history, { t, cpu: actual, rep: next }].slice(-40);
    if (next !== cur) {
      replicas = next;
      explain = { kind: next > cur ? 'warn' : 'ok', text: `t=${t}s · ${text}. SuccessfulRescale: New size: ${next}. ${note}` };
      await applyReplicas(next);
    } else {
      explain = { kind: '', text: `t=${t}s · ${text}. ${note}` };
    }
  }

  function onLoad() {
    explain = { kind: '', text: load === 0
      ? 'Sin carga: cada pod usa ~1 % de sus requests (100m). El HPA querrá bajar hasta minReplicas, pero solo tras la ventana de estabilización.'
      : `${load} peticiones/s repartidas entre ${running} pod(s): cada uno usa ~${cpu} % de sus requests de 100m (el limit de 300m le deja pasarse del 100 %). En el próximo tick el HPA compara ese ${cpu} % con el objetivo ${target} %.` };
  }

  async function caDemo() {
    if (busy) return;
    auto = false;
    full = true;
    extraNode = false;
    if (max < 5) max = 5;
    if (load < 60) load = 60;
    explain = { kind: 'warn', text: 'Los nodos están llenos (cada worker solo tiene sitio para 2 pods). El HPA pide 5 réplicas...' };
    replicas = 5;
    await applyReplicas(5);
    explain = { kind: 'fail', text: 'El quinto pod queda Pending: FailedScheduling "0/3 nodes are available: 2 Insufficient cpu, 1 node(s) had untolerated taint". El HPA no puede hacer nada: él escala pods, no nodos.' };
    await wait(1600);
    extraNode = true;
    explain = { kind: 'warn', text: 'Cluster Autoscaler ve un pod Pending por falta de recursos y pide un nodo nuevo al proveedor (grupo de nodos predefinido). En la nube tarda 1 a 3 minutos: aparece kcna-worker3.' };
    await wait(900);
    pods = pods.map((p) => (!p.node ? { ...p, node: 'kcna-worker3', status: 'Running', tag: undefined } : p));
    explain = { kind: 'ok', text: 'El scheduler coloca el pod Pending en kcna-worker3. HPA (pods) y Cluster Autoscaler (nodos) se complementan. Karpenter hace lo mismo sin grupos predefinidos: crea directamente la instancia más adecuada.' };
  }

  async function reset() {
    if (busy) return;
    auto = false; full = false; extraNode = false; load = 0; t = 0; history = []; recs = []; formula = '';
    min = 1; max = 5; target = 50; windowSec = 300; metricsServer = true;
    replicas = 1;
    pods = [{ id: `p${++seq}`, name: 'php-apache-67b9659944-b24s4', node: 'kcna-worker', status: 'Running', tag: '1%' }];
    explain = { kind: '', text: 'Todo a cero: 1 réplica, sin carga.' };
  }

  // Gráfica SVG: CPU % (ámbar) y réplicas (azul) en el tiempo.
  const W = 600, H = 170, PL = 34, PR = 30, PT = 10, PB = 22;
  const xs = $derived((i: number) => PL + (history.length < 2 ? 0 : (i * (W - PL - PR)) / (history.length - 1)));
  const yCpu = (v: number) => PT + (H - PT - PB) * (1 - Math.min(v, 300) / 300);
  const repMax = $derived(Math.max(6, max));
  const yRep = $derived((v: number) => PT + (H - PT - PB) * (1 - v / repMax));
  const cpuPath = $derived(history.map((h, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${yCpu(h.cpu).toFixed(1)}`).join(' '));
  const repPath = $derived(history.map((h, i) => `${i ? `H${xs(i).toFixed(1)} V${yRep(h.rep).toFixed(1)}` : `M${xs(i).toFixed(1)},${yRep(h.rep).toFixed(1)}`}`).join(' '));
</script>

<div class="hpa">
  <div class="controls">
    <label>minReplicas <input type="number" min="1" max="10" bind:value={min} onchange={() => { if (max < min) max = min; }} /></label>
    <label>maxReplicas <input type="number" min="1" max="12" bind:value={max} onchange={() => { if (min > max) min = max; }} /></label>
    <label>objetivo CPU % <input type="number" min="10" max="200" step="10" bind:value={target} /></label>
    <label>estabilización bajada (s) <select bind:value={windowSec}><option value={300}>300 (por defecto)</option><option value={60}>60</option><option value={30}>30 (el lab)</option><option value={0}>0</option></select></label>
    <label class="chk"><input type="checkbox" bind:checked={metricsServer} /> metrics-server instalado</label>
  </div>

  <div class="loadrow">
    <label for="hpa-load">carga: <strong class="mono">{load}</strong> peticiones/s</label>
    <input id="hpa-load" type="range" min="0" max="100" step="5" bind:value={load} oninput={onLoad} />
    <span class="hint">CPU por pod <strong class="mono">{metricsServer ? `${cpu}%` : '<unknown>'}</strong> / {target}% · réplicas <strong class="mono">{replicas}</strong></span>
  </div>

  <ClusterCanvas {nodes} pods={view} compact showLabels={full || extraNode} />

  <div class="controls">
    <button type="button" class="btn primary small" onclick={tick} disabled={busy || auto}>Tick de 15 s</button>
    <button type="button" class="btn small" onclick={() => (auto = !auto)} disabled={busy && !auto}>{auto ? 'Pausar' : 'Automático'}</button>
    <button type="button" class="btn small" onclick={caDemo} disabled={busy}>No hay nodo con sitio: Cluster Autoscaler</button>
    <button type="button" class="btn small" onclick={reset} disabled={busy}>Reiniciar</button>
    <span class="hint mono">t = {t}s</span>
  </div>

  {#if formula}<pre class="formula">{formula}</pre>{/if}

  <svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="CPU por pod y réplicas a lo largo del tiempo">
    <line x1={PL} x2={W - PR} y1={yCpu(target)} y2={yCpu(target)} class="target" />
    <text x={W - PR + 2} y={yCpu(target) + 4} class="lbl tgt">{target}%</text>
    {#each [0, 100, 200, 300] as v}
      <text x={PL - 4} y={yCpu(v) + 4} class="lbl cpu" text-anchor="end">{v}%</text>
    {/each}
    {#each [0, repMax] as v}
      <text x={W - PR + 2} y={yRep(v) + (v ? 10 : -2)} class="lbl rep">{v} rép.</text>
    {/each}
    <path d={cpuPath} class="line cpu" />
    <path d={repPath} class="line rep" />
    {#if history.length}
      <text x={PL} y={H - 6} class="lbl">{history[0].t}s</text>
      <text x={W - PR} y={H - 6} class="lbl" text-anchor="end">{history.at(-1)!.t}s</text>
    {:else}
      <text x={W / 2} y={H / 2} class="lbl" text-anchor="middle">sin ticks todavía</text>
    {/if}
  </svg>

  <div class="explain {explain.kind}" aria-live="polite">{explain.text}</div>

  <div class="cards">
    <div class="card">
      <strong>metrics-server</strong>
      <p>Agregador ligero que expone la Metrics API (<span class="mono">metrics.k8s.io</span>) con el uso actual de CPU y memoria. Lo consumen <span class="mono">kubectl top</span>, el HPA y el VPA. Sin él, el HPA ve <span class="mono">&lt;unknown&gt;</span>. No guarda historial: eso es cosa de Prometheus.</p>
    </div>
    <div class="card">
      <strong>VPA</strong>
      <p>Vertical Pod Autoscaler: en vez de más pods, cambia los <span class="mono">requests</span>/<span class="mono">limits</span> de cada pod según el consumo histórico. Proyecto aparte con CRD propia; modo <span class="mono">Off</span> solo recomienda (right-sizing). No lo combines con el HPA sobre la misma métrica.</p>
    </div>
    <div class="card">
      <strong>Cluster Autoscaler y Karpenter</strong>
      <p>Escalan nodos, no pods: reaccionan a pods Pending por falta de recursos. Cluster Autoscaler añade nodos de un grupo predefinido; Karpenter elige la instancia justa sin grupos. Prueba el botón de arriba.</p>
    </div>
    <div class="card">
      <strong>KEDA</strong>
      <p>Proyecto graduado de la CNCF. Escala según eventos externos (longitud de una cola, consulta PromQL, cron) con un <span class="mono">ScaledObject</span>; por debajo crea un HPA y además permite escalar a cero.</p>
    </div>
  </div>
</div>

<style>
  .hpa { display: grid; gap: 12px; }
  .controls { margin-bottom: 0; }
  .controls label { display: inline-flex; align-items: center; gap: 6px; }
  .controls input[type='number'] { width: 70px; }
  .chk { font-weight: 500; font-size: 0.92rem; }
  .loadrow { display: grid; gap: 6px; }
  .loadrow input { width: 100%; }
  .formula { font-size: 0.9rem; }
  .chart { width: 100%; height: auto; background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--r-m); }
  .line { fill: none; stroke-width: 2; stroke-linejoin: round; }
  .line.cpu { stroke: var(--wait); }
  .line.rep { stroke: var(--helm); stroke-width: 2.5; }
  .target { stroke: var(--ink-3); stroke-dasharray: 4 4; }
  .lbl { font: 10px var(--mono); fill: var(--ink-3); }
  .lbl.cpu { fill: var(--wait); }
  .lbl.rep { fill: var(--helm); }
  .lbl.tgt { fill: var(--ink-2); }
  .explain { margin-top: 0; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
  .card { border: 1px solid var(--line); border-radius: var(--r-m); padding: 10px 12px; background: var(--panel-2); font-size: 0.88rem; display: grid; gap: 4px; }
  .card p { color: var(--ink-2); }
</style>
