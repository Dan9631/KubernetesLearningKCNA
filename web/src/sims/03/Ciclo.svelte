<script lang="ts">
  // Ciclo de vida de un Pod: fases, init container, restartPolicy y el backoff de los reinicios.
  import { wait } from '../../lib/motion';
  import { fade } from 'svelte/transition';

  type Policy = 'Always' | 'OnFailure' | 'Never';
  type Phase = 'Pending' | 'Running' | 'Succeeded' | 'Failed';
  type CState = { state: 'Waiting' | 'Running' | 'Terminated'; reason?: string; exit?: number };

  let policy = $state<Policy>('Always');
  let exists = $state(false);
  let phase = $state<Phase>('Pending');
  let status = $state('');        // columna STATUS de kubectl get pod
  let ready = $state(false);
  let restarts = $state(0);
  let age = $state(0);            // segundos simulados
  let sinceRestart = $state(0);
  let backoff = $state(10);
  let init = $state<CState>({ state: 'Waiting', reason: 'PodInitializing' });
  let main = $state<CState>({ state: 'Waiting', reason: 'PodInitializing' });
  let events = $state<string[]>([]);
  let busy = $state(false);
  let note = $state('');

  // nodos del diagrama de estados (viewBox 680 x 215)
  const N: Record<string, { x: number; y: number; w: number; label: string }> = {
    Pending: { x: 8, y: 30, w: 92, label: 'Pending' },
    Init: { x: 150, y: 30, w: 96, label: 'Init:0/1' },
    Creating: { x: 296, y: 30, w: 140, label: 'ContainerCreating' },
    Running: { x: 486, y: 30, w: 100, label: 'Running' },
    Succeeded: { x: 300, y: 160, w: 130, label: 'Succeeded' },
    Crash: { x: 456, y: 160, w: 160, label: 'CrashLoopBackOff' },
    Failed: { x: 596, y: 90, w: 78, label: 'Failed' },
  };
  const H = 34;
  const cx = (k: string) => N[k].x + N[k].w / 2;
  const diagNode = $derived.by(() => {
    if (!exists) return '';
    if (status === 'Pending') return 'Pending';
    if (status.startsWith('Init') || status === 'PodInitializing') return 'Init';
    if (status === 'ContainerCreating') return 'Creating';
    if (status === 'Running') return 'Running';
    if (status === 'CrashLoopBackOff') return 'Crash';
    if (phase === 'Succeeded') return 'Succeeded';
    if (phase === 'Failed') return 'Failed';
    if (status === 'Error' || status === 'Completed') return 'Crash';
    return '';
  });
  const readyCol = $derived(`${ready ? 1 : 0}/1`);
  const restartsCol = $derived(restarts ? `${restarts} (${sinceRestart}s ago)` : '0');
  const ageCol = $derived(age >= 60 ? `${Math.floor(age / 60)}m${age % 60}s` : `${age}s`);
  const tone = $derived(phase === 'Failed' || status === 'CrashLoopBackOff' || status === 'Error' ? 'fail' : phase === 'Succeeded' ? 'ok' : busy ? 'warn' : '');

  const tick = async (realMs: number, simS: number) => { await wait(realMs); age += simS; sinceRestart += simS; };
  const ev = (s: string) => (events = [...events.slice(-5), s]);

  async function create() {
    if (busy) return;
    busy = true; exists = true; phase = 'Pending'; ready = false; restarts = 0; age = 0; sinceRestart = 0; backoff = 10; events = [];
    init = { state: 'Waiting', reason: 'PodInitializing' }; main = { state: 'Waiting', reason: 'PodInitializing' };
    status = 'Pending'; note = 'El API server aceptó el Pod: fase Pending. Todavía no tiene nodo.';
    ev('Scheduled   Successfully assigned lab-03/ciclo to kcna-worker');
    await tick(800, 1);
    status = 'Init:0/1'; init = { state: 'Running' }; note = 'El kubelet arranca primero el init container prepara (busybox:1.37). STATUS Init:0/1: ha terminado 0 de 1 init containers. Los principales esperan. La fase sigue siendo Pending.';
    ev('Pulled      Container image "busybox:1.37" already present on machine');
    ev('Started     Started container prepara');
    await tick(1300, 4);
    init = { state: 'Terminated', reason: 'Completed', exit: 0 }; status = 'PodInitializing';
    note = 'El init container terminó con exit 0: ahora sí pueden arrancar los contenedores principales. Si hubiera fallado, el kubelet lo reintentaría (según restartPolicy) y el Pod no saldría de Init.';
    await tick(600, 1);
    status = 'ContainerCreating'; main = { state: 'Waiting', reason: 'ContainerCreating' };
    note = 'ContainerCreating: el kubelet pide a containerd la imagen nginx:1.27-alpine (ya está en el nodo) y crea el contenedor tarea.';
    ev('Pulled      Container image "nginx:1.27-alpine" already present on machine');
    ev('Created     Created container tarea');
    await tick(900, 2);
    status = 'Running'; phase = 'Running'; ready = true; main = { state: 'Running' };
    ev('Started     Started container tarea');
    note = 'Running y READY 1/1: al menos un contenedor corre y la readiness se cumple. Ahora decide cómo termina el proceso.';
    busy = false;
  }

  async function exit(code: number) {
    if (busy || !exists || phase !== 'Running' || main.state !== 'Running') return;
    busy = true;
    ready = false;
    main = { state: 'Terminated', reason: code === 0 ? 'Completed' : 'Error', exit: code };
    status = code === 0 ? 'Completed' : 'Error';
    const restart = policy === 'Always' || (policy === 'OnFailure' && code !== 0);
    note = `El proceso del contenedor tarea terminó con exit ${code}. restartPolicy ${policy}: ${restart ? 'el kubelet lo reiniciará en el mismo nodo' : 'no se reinicia'}.`;
    await tick(900, 1);
    if (!restart) {
      phase = code === 0 ? 'Succeeded' : 'Failed';
      note = code === 0
        ? `Fase Succeeded (STATUS Completed): todos los contenedores terminaron bien y con ${policy} no se reinician. Es el final feliz de un Job.`
        : `Fase Failed (STATUS Error): el contenedor terminó con error y con ${policy} nadie lo reinicia. Con kubectl logs ciclo verías la causa; el Pod se queda ahí hasta que lo borres.`;
      busy = false; return;
    }
    const b = backoff;
    status = 'CrashLoopBackOff';
    main = { state: 'Waiting', reason: 'CrashLoopBackOff', exit: code };
    ev(`BackOff     Back-off restarting failed container tarea in pod ciclo_lab-03 (espera ${b}s)`);
    note = `El kubelet espera ${b} s antes de reiniciar (backoff exponencial: 10, 20, 40... hasta 300 s). Mientras tanto STATUS muestra CrashLoopBackOff, pero la fase sigue siendo Running y el Pod no cambia de nodo.` + (code === 0 && policy === 'Always' ? ' Fíjate: con Always se reinicia aunque haya terminado bien, por eso un contenedor que acaba enseguida parece "roto".' : '');
    await tick(1200, b);
    backoff = Math.min(backoff * 2, 300);
    restarts += 1; sinceRestart = 0;
    status = 'Running'; ready = true; main = { state: 'Running' };
    ev(`Started     Started container tarea (reinicio ${restarts})`);
    note = `Reinicio ${restarts}: el contenedor vuelve a Running y RESTARTS sube. Si vuelve a fallar, la espera será de ${backoff} s. Con restartPolicy ${policy} este bucle no termina solo: hay que arreglar la causa.`;
    busy = false;
  }

  function del() { if (busy) return; exists = false; status = ''; events = []; note = 'Pod borrado. Cambia la restartPolicy y vuelve a crearlo para comparar.'; }
</script>

<div class="controls">
  <label>restartPolicy
    <select bind:value={policy} disabled={exists}>
      <option value="Always">Always (por defecto)</option>
      <option value="OnFailure">OnFailure</option>
      <option value="Never">Never</option>
    </select>
  </label>
  {#if !exists}
    <button type="button" class="btn small primary" onclick={create} disabled={busy}>kubectl apply -f pod.yaml</button>
  {:else}
    <button type="button" class="btn small" onclick={() => exit(0)} disabled={busy || phase !== 'Running' || main.state !== 'Running'}>El proceso termina con código 0</button>
    <button type="button" class="btn small" onclick={() => exit(1)} disabled={busy || phase !== 'Running' || main.state !== 'Running'}>El proceso termina con código 1</button>
    <button type="button" class="btn small" onclick={del} disabled={busy}>kubectl delete pod ciclo</button>
  {/if}
</div>

<svg viewBox="0 0 680 215" class="diag" role="img" aria-label="Diagrama de fases del Pod">
  <defs>
    <marker id="ciclo-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker>
  </defs>
  <line x1={N.Pending.x + N.Pending.w} y1={N.Pending.y + H / 2} x2={N.Init.x} y2={N.Init.y + H / 2} class="e" marker-end="url(#ciclo-arrow)" />
  <line x1={N.Init.x + N.Init.w} y1={N.Init.y + H / 2} x2={N.Creating.x} y2={N.Creating.y + H / 2} class="e" marker-end="url(#ciclo-arrow)" />
  <line x1={N.Creating.x + N.Creating.w} y1={N.Creating.y + H / 2} x2={N.Running.x} y2={N.Running.y + H / 2} class="e" marker-end="url(#ciclo-arrow)" />
  <line x1={N.Running.x + 10} y1={N.Running.y + H} x2={cx('Succeeded') + 20} y2={N.Succeeded.y} class="e" class:on={phase === 'Succeeded'} marker-end="url(#ciclo-arrow)" />
  <line x1={N.Running.x + N.Running.w} y1={N.Running.y + H / 2} x2={cx('Failed')} y2={N.Failed.y} class="e" class:on={phase === 'Failed'} marker-end="url(#ciclo-arrow)" />
  <path d={`M ${cx('Running') + 18} ${N.Running.y + H} C ${cx('Running') + 40} ${N.Running.y + H + 50}, ${cx('Crash') + 40} ${N.Crash.y - 50}, ${cx('Crash') + 18} ${N.Crash.y}`} class="e" class:on={status === 'CrashLoopBackOff' || status === 'Error'} marker-end="url(#ciclo-arrow)" />
  <path d={`M ${cx('Crash') - 18} ${N.Crash.y} C ${cx('Crash') - 40} ${N.Crash.y - 50}, ${cx('Running') - 40} ${N.Running.y + H + 50}, ${cx('Running') - 18} ${N.Running.y + H}`} class="e" class:on={status === 'CrashLoopBackOff'} marker-end="url(#ciclo-arrow)" />
  <text x="104" y="22" class="lbl">nodo asignado</text>
  <text x="250" y="22" class="lbl">init OK</text>
  <text x="440" y="22" class="lbl">started</text>
  <text x="372" y="118" class="lbl">exit 0 · Never / OnFailure</text>
  <text x="590" y="70" class="lbl">exit ≠ 0 · Never</text>
  <text x="500" y="125" class="lbl">reinicio (Always / OnFailure)</text>
  <text x="8" y="12" class="lbl">fase Pending</text>
  <text x="486" y="12" class="lbl">fase Running</text>
  <text x="300" y="206" class="lbl">fase Succeeded</text>
  <text x="596" y="140" class="lbl">fase Failed</text>
  {#each Object.entries(N) as [k, n] (k)}
    <g class="n" class:on={diagNode === k} class:term={k === 'Succeeded' || k === 'Failed'} class:crash={k === 'Crash'}>
      <rect x={n.x} y={n.y} width={n.w} height={H} rx="7" />
      <text x={n.x + n.w / 2} y={n.y + H / 2 + 4}>{n.label}</text>
    </g>
  {/each}
</svg>

<div class="grid">
  <div>
    <div class="otitle">kubectl get pod ciclo -n lab-03</div>
    <pre aria-live="polite">{'NAME    READY   STATUS              RESTARTS       AGE\n'}{exists ? `ciclo   ${readyCol.padEnd(7)} ${status.padEnd(19)} ${restartsCol.padEnd(14)} ${ageCol}` : 'No resources found in lab-03 namespace.'}</pre>
    {#if exists}
      <div class="otitle">kubectl describe pod ciclo (estados y eventos)</div>
      <pre transition:fade>{`status.phase:    ${phase}
restartPolicy:   ${policy}
initContainers:
  prepara  (busybox:1.37)   State: ${init.state}${init.reason ? ` · Reason: ${init.reason}` : ''}${init.exit !== undefined ? ` · Exit Code: ${init.exit}` : ''}
containers:
  tarea    (nginx:1.27-alpine) State: ${main.state}${main.reason ? ` · Reason: ${main.reason}` : ''}${main.exit !== undefined ? ` · Exit Code: ${main.exit}` : ''}
  Restart Count: ${restarts}   siguiente backoff: ${backoff}s
Events:
${events.length ? events.map((e) => '  ' + e).join('\n') : '  <none>'}`}</pre>
    {/if}
  </div>
  <div class="yaml">
    <div class="otitle">pod.yaml</div>
    <pre>{`apiVersion: v1
kind: Pod
metadata: { name: ciclo, namespace: lab-03 }
spec:
  restartPolicy: ${policy}
  initContainers:
    - name: prepara
      image: busybox:1.37
      command: ["sh", "-c", "echo hola > /work/index.html"]
  containers:
    - name: tarea
      image: nginx:1.27-alpine`}</pre>
  </div>
</div>

<div class="explain {tone}" aria-live="polite">
  {note || 'Elige la restartPolicy y crea el Pod: verás las fases con sus tiempos (comprimidos) y, cuando esté Running, podrás terminar el proceso con código 0 o 1 para comparar qué hace cada política. CrashLoopBackOff, Completed y Error no son fases: son motivos que kubectl mezcla en la columna STATUS.'}
</div>

<style>
  .diag { width: 100%; height: auto; display: block; color: var(--line); margin-bottom: 10px; }
  .e { stroke: var(--line); stroke-width: 1.5; fill: none; transition: stroke var(--dur); color: var(--line); }
  .e.on { stroke: var(--helm); color: var(--helm); stroke-width: 2.2; }
  .lbl { font: 9.5px var(--mono); fill: var(--ink-3); }
  .n rect { fill: var(--panel); stroke: var(--line); stroke-width: 1.4; transition: fill var(--dur), stroke var(--dur); }
  .n text { font: 500 12px var(--mono); fill: var(--ink); text-anchor: middle; }
  .n.term rect { stroke-dasharray: 4 3; }
  .n.on rect { fill: var(--helm-2); stroke: var(--helm); stroke-width: 2.2; }
  .n.on text { fill: var(--helm-ink); }
  .n.crash.on rect { fill: var(--fail-2); stroke: var(--fail); }
  .n.crash.on text { fill: var(--fail); }
  .grid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 10px; }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  .otitle { font: 0.74rem var(--mono); color: var(--ink-3); margin: 6px 0 4px; }
  pre { font-size: 0.76rem; }
</style>
