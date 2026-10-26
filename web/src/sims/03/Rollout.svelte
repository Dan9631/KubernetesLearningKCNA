<script lang="ts">
  // Rolling update y rollback: el Deployment web sube el ReplicaSet nuevo y baja el viejo respetando maxSurge y maxUnavailable.
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { wait } from '../../lib/motion';

  interface Pod extends PodSpec { image: string }
  interface Rev { rev: number; image: string; cause: string }
  const IMG: Record<string, { hash: string; color: 'a' | 'b' | 'c'; tag: string; broken?: boolean }> = {
    'nginx:1.27-alpine': { hash: '8558b67b76', color: 'a', tag: '1.27' },
    'nginx:1.28-alpine': { hash: '75b9789595', color: 'b', tag: '1.28' },
    'nginx:9.9-noexiste': { hash: '6d8fbd8996', color: 'c', tag: '9.9', broken: true },
  };
  const SUF = ['5dwkf', 'h578z', 'zrpnm', 'f9cns', 'v7zbj', 'w5c98', 'mrmp9', 'q2x7k', 't8nvd', 'c4lpz', 'r9hjm', 'x2bwq', 'k7dsf', 'm3ztp', 'g6rkc', 'b1wnx', 'p5qlt', 'y8cmv', 'd2fhs', 'n4jkr', 'l9vpx', 's7bzq', 'w3gtn', 'h6mkd', 'j2rtc', 'v5nqx', 'z8kwm', 'f3dpl', 'q9hbt', 'c7xsn'];
  const nodes: NodeSpec[] = [{ name: 'kcna-worker', role: 'worker' }, { name: 'kcna-worker2', role: 'worker' }];
  const OPTS = ['0', '1', '2', '3', '25%', '50%'];

  let seq = 0;
  let replicas = $state(3);
  let surgeSel = $state('1');
  let unavailSel = $state('0');
  let current = $state('nginx:1.27-alpine');
  let history = $state<Rev[]>([{ rev: 1, image: 'nginx:1.27-alpine', cause: 'version inicial 1.27' }]);
  let pods = $state<Pod[]>([]);
  let busy = $state(false);
  let stuck = $state(false);
  let events = $state<string[]>([]);
  let maxSeen = $state(0);
  let minSeen = $state(0);
  let lastRun = $state<{ max: number; min: number; maxAllowed: number; minAllowed: number } | null>(null);

  function mk(image: string): Pod {
    const i = IMG[image];
    const node = pods.filter((p) => p.node === 'kcna-worker' && p.status !== 'Terminating').length <= pods.filter((p) => p.node === 'kcna-worker2' && p.status !== 'Terminating').length ? 'kcna-worker' : 'kcna-worker2';
    const s = SUF[seq % SUF.length]; seq += 1;
    return { id: `p${seq}`, name: `web-${i.hash}-${s}`, node, status: 'ContainerCreating', tag: i.tag, color: i.color, image };
  }
  pods = [mk(current), mk(current), mk(current)].map((p) => ({ ...p, status: 'Running' }));

  const eff = (sel: string, up: boolean) => (sel.endsWith('%') ? (up ? Math.ceil : Math.floor)((replicas * parseInt(sel)) / 100) : parseInt(sel));
  const surge = $derived(eff(surgeSel, true));
  const unavail = $derived(eff(unavailSel, false));
  const invalid = $derived(surge === 0 && unavail === 0);
  const live = $derived(pods.filter((p) => p.status !== 'Terminating'));
  const available = $derived(live.filter((p) => p.status === 'Running').length);
  const maxTotal = $derived(replicas + surge);
  const minAvail = $derived(Math.max(0, replicas - unavail));
  const prevRev = $derived(history.length >= 2 ? history[history.length - 2] : null);
  const rsRows = $derived(history.map((h) => {
    const of = live.filter((p) => p.image === h.image);
    return { name: `web-${IMG[h.image].hash}`, image: h.image, desired: h.image === current ? replicas : 0, cur: of.length, ready: of.filter((p) => p.status === 'Running').length };
  }));
  const say = (s: string) => (events = [...events.slice(-5), s]);
  const snap = () => { maxSeen = Math.max(maxSeen, live.length); minSeen = Math.min(minSeen, available); };

  const explain = $derived.by(() => {
    if (invalid) return { tone: 'fail', text: 'maxSurge 0 y maxUnavailable 0 a la vez es inválido: el Deployment no podría crear ni borrar ningún Pod. Kubernetes rechaza el manifiesto.' };
    if (busy && stuck) return { tone: 'warn', text: 'Volviendo atrás...' };
    if (busy) return { tone: '', text: `Rolling update en curso: puede haber como máximo ${maxTotal} Pods (replicas ${replicas} + maxSurge ${surge}) y nunca menos de ${minAvail} disponibles (replicas ${replicas} − maxUnavailable ${unavail}). El ReplicaSet nuevo sube; el viejo solo baja cuando los nuevos están Ready.` };
    if (stuck) return { tone: 'fail', text: `El rollout se atasca: el Pod nuevo nunca está Ready (ImagePullBackOff), así que el Deployment no puede bajar más réplicas viejas sin violar maxUnavailable. Los ${available} Pods viejos siguen sirviendo tráfico; kubectl rollout status se queda esperando y, a los 600 s (progressDeadlineSeconds), marca ProgressDeadlineExceeded. Nada se cae solo: arregla la imagen o haz kubectl rollout undo.` };
    if (lastRun) return { tone: 'ok', text: `Rollout completado. Durante la actualización hubo como máximo ${lastRun.max} Pods (límite ${lastRun.maxAllowed}) y como mínimo ${lastRun.min} disponibles (límite ${lastRun.minAllowed}). El ReplicaSet anterior queda con 0 réplicas: es lo que permite el rollback.` };
    return { tone: '', text: `Deployment web con ${replicas} réplicas de ${current}. Ajusta réplicas, maxSurge (Pods extra permitidos, redondea hacia arriba) y maxUnavailable (Pods que pueden faltar, redondea hacia abajo) y lanza la actualización.` };
  });

  function revise(image: string, cause: string) {
    const prev = history.find((h) => h.image === image);
    const next = Math.max(...history.map((h) => h.rev)) + 1;
    history = [...history.filter((h) => h.image !== image), { rev: next, image, cause: prev?.cause ?? cause }];
  }

  async function rollout(target: string, cause: string) {
    if (busy || invalid || target === current) return;
    busy = true; lastRun = null; events = [];
    const wasStuck = stuck;
    revise(target, cause);
    current = target;
    const broken = !!IMG[target].broken;
    maxSeen = live.length; minSeen = available;
    say(`$ kubectl set image deploy/web nginx=${target}`);
    let progressed = true;
    for (let guard = 0; guard < 40 && progressed; guard++) {
      progressed = false;
      const news = live.filter((p) => p.image === target);
      const olds = live.filter((p) => p.image !== target).sort((a, b) => (a.status === 'Running' ? 1 : 0) - (b.status === 'Running' ? 1 : 0));
      if (olds.length === 0 && news.length === replicas && news.every((p) => p.status === 'Running')) break;
      // 1. subir el ReplicaSet nuevo hasta replicas + maxSurge en total
      const canCreate = Math.min(replicas - news.length, maxTotal - live.length);
      if (canCreate > 0) {
        for (let k = 0; k < canCreate; k++) pods = [...pods, mk(target)];
        say(`Scaled up replica set web-${IMG[target].hash} from ${news.length} to ${news.length + canCreate}`);
        progressed = true; snap(); await wait(650);
      }
      // 2. bajar el viejo sin caer por debajo de replicas − maxUnavailable disponibles
      const newUnavail = live.filter((p) => p.image === target && p.status !== 'Running').length;
      const canDelete = Math.min(olds.length, live.length - minAvail - newUnavail);
      if (canDelete > 0) {
        const victims = olds.slice(0, canDelete).map((p) => p.id);
        pods = pods.map((p) => (victims.includes(p.id) ? { ...p, status: 'Terminating' } : p));
        say(`Scaled down replica set web-${IMG[olds[0].image].hash} from ${olds.length} to ${olds.length - canDelete}`);
        snap(); await wait(600);
        pods = pods.filter((p) => !victims.includes(p.id));
        progressed = true; snap();
      }
      // 3. esperar a que los nuevos estén Ready (o fallen)
      const creating = pods.filter((p) => p.image === target && p.status === 'ContainerCreating');
      if (creating.length) {
        await wait(900);
        const ids = creating.map((p) => p.id);
        pods = pods.map((p) => (ids.includes(p.id) ? { ...p, status: broken ? 'ImagePullBackOff' : 'Running' } : p));
        say(broken ? `${creating[0].name}: Failed to pull image "${target}": not found` : `${creating.length} Pod(s) ${IMG[target].tag} Ready`);
        progressed = true; snap();
      }
      if (progressed) await wait(250);
    }
    const done = live.every((p) => p.image === target && p.status === 'Running') && live.length === replicas;
    stuck = !done;
    if (done) {
      lastRun = { max: maxSeen, min: minSeen, maxAllowed: maxTotal, minAllowed: minAvail };
      say(wasStuck ? 'deployment.apps/web rolled back · deployment "web" successfully rolled out' : 'deployment "web" successfully rolled out');
    } else {
      say(`Waiting for deployment "web" rollout to finish: ${live.filter((p) => p.image === target).length} out of ${replicas} new replicas have been updated...`);
    }
    busy = false;
  }

  async function scaleTo(n: number) {
    replicas = n;
    if (busy) return; busy = true;
    while (live.length < replicas) { pods = [...pods, mk(current)]; await wait(450); const last = pods[pods.length - 1]; pods = pods.map((p) => (p.id === last.id ? { ...p, status: 'Running' } : p)); }
    while (live.length > replicas) { const v = live[live.length - 1]; pods = pods.map((p) => (p.id === v.id ? { ...p, status: 'Terminating' } : p)); await wait(400); pods = pods.filter((p) => p.id !== v.id); }
    busy = false;
  }
  const undo = () => { if (prevRev) rollout(prevRev.image, prevRev.cause); };
  const undoTo = (r: Rev) => rollout(r.image, r.cause);
  function reset() {
    if (busy) return;
    seq = 0; current = 'nginx:1.27-alpine'; history = [{ rev: 1, image: current, cause: 'version inicial 1.27' }];
    pods = []; pods = [mk(current), mk(current), mk(current)].map((p) => ({ ...p, status: 'Running' }));
    stuck = false; lastRun = null; events = []; replicas = 3; surgeSel = '1'; unavailSel = '0';
  }
</script>

<div class="controls">
  <label>réplicas <span class="mono">{replicas}</span>
    <input type="range" min="1" max="8" value={replicas} oninput={(e) => scaleTo(+(e.currentTarget as HTMLInputElement).value)} disabled={busy && !stuck} />
  </label>
  <label>maxSurge
    <select bind:value={surgeSel} disabled={busy}>{#each OPTS as o}<option value={o}>{o}</option>{/each}</select>
    <span class="hint mono">= {surge}</span>
  </label>
  <label>maxUnavailable
    <select bind:value={unavailSel} disabled={busy}>{#each OPTS as o}<option value={o}>{o}</option>{/each}</select>
    <span class="hint mono">= {unavail}</span>
  </label>
</div>
<div class="controls">
  <button type="button" class="btn small primary" onclick={() => rollout('nginx:1.28-alpine', 'actualizo a 1.28')} disabled={busy || invalid || current === 'nginx:1.28-alpine'}>Actualizar a nginx:1.28-alpine</button>
  <button type="button" class="btn small" onclick={() => rollout('nginx:9.9-noexiste', 'version rota')} disabled={busy || invalid || current === 'nginx:9.9-noexiste'}>Simular imagen rota</button>
  <button type="button" class="btn small" onclick={undo} disabled={busy || invalid || !prevRev}>kubectl rollout undo</button>
  <button type="button" class="btn small" onclick={reset} disabled={busy}>Reiniciar</button>
</div>

<div class="gauges" aria-live="polite">
  <div class="g" class:bad={live.length > maxTotal}>
    <em>Pods totales</em>
    <strong class="mono">{live.length}</strong>
    <span class="hint">máximo {maxTotal} <span class="mono">(replicas + maxSurge)</span></span>
  </div>
  <div class="g" class:bad={available < minAvail && !busy}>
    <em>Disponibles</em>
    <strong class="mono" class:low={available < minAvail}>{available}</strong>
    <span class="hint">mínimo {minAvail} <span class="mono">(replicas − maxUnavailable)</span></span>
  </div>
  <div class="g">
    <em>Imagen deseada</em>
    <strong class="mono small">{current}</strong>
    <span class="hint">{stuck ? 'rollout atascado' : busy ? 'rollout en curso' : 'rollout completo'}</span>
  </div>
</div>

<ClusterCanvas {nodes} {pods} compact showLabels={false} pendingTray={false} />

<div class="outs">
  <div>
    <div class="otitle">kubectl get rs -l app=web</div>
    <pre>{'NAME             IMAGE                DESIRED  CURRENT  READY\n' + rsRows.map((r) => `${r.name.padEnd(16)} ${r.image.padEnd(20)} ${String(r.desired).padEnd(8)} ${String(r.cur).padEnd(8)} ${r.ready}`).join('\n')}</pre>
  </div>
  <div>
    <div class="otitle">kubectl rollout history deploy/web</div>
    <div class="hist">
      <pre>{'REVISION  CHANGE-CAUSE\n' + history.map((h) => `${String(h.rev).padEnd(9)} ${h.cause}${h.image === current ? '   (actual)' : ''}`).join('\n')}</pre>
      <div class="histbtns">
        {#each history.filter((h) => h.image !== current) as h (h.rev)}
          <button type="button" class="btn small mono" onclick={() => undoTo(h)} disabled={busy || invalid}>undo --to-revision={h.rev}</button>
        {/each}
      </div>
    </div>
  </div>
</div>
{#if events.length}
  <div class="otitle">eventos del Deployment (ScalingReplicaSet) y rollout status</div>
  <pre class="ev">{events.join('\n')}</pre>
{/if}

<div class="explain {explain.tone}" aria-live="polite">{explain.text}</div>

<style>
  .controls label { display: inline-flex; align-items: center; gap: 6px; }
  .controls input[type='range'] { width: 120px; }
  .gauges { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-bottom: 12px; }
  .g { border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); padding: 8px 12px; display: grid; gap: 1px; transition: border-color var(--dur); }
  .g.bad { border-color: var(--fail); }
  .g em { font-style: normal; font-size: 0.76rem; color: var(--ink-3); }
  .g strong { font-size: 1.4rem; line-height: 1.2; }
  .g strong.small { font-size: 0.9rem; word-break: break-all; }
  .g strong.low { color: var(--fail); }
  .g .hint { font-size: 0.74rem; }
  .outs { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; margin-top: 12px; }
  .otitle { font: 0.74rem var(--mono); color: var(--ink-3); margin: 8px 0 4px; }
  .outs pre, .ev { font-size: 0.76rem; }
  .hist { display: grid; gap: 6px; }
  .histbtns { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
