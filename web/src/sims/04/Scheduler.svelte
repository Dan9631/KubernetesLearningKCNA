<script lang="ts">
  // Simulador del scheduler: configura un pod y mira cómo kube-scheduler filtra y puntúa los nodos del laboratorio.
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { wait } from '../../lib/motion';

  const CP_TAINT = 'node-role.kubernetes.io/control-plane:NoSchedule';
  const DED_TAINT = 'lab-04-dedicado=true:NoSchedule';
  const IMAGE = 'nginx:1.27-alpine';

  interface Info { name: string; role: 'control-plane' | 'worker'; labels: Record<string, string>; cpu: number; mem: number; images: string[] }
  const base: Info[] = [
    { name: 'kcna-control-plane', role: 'control-plane', labels: {}, cpu: 2000, mem: 4096, images: [] },
    { name: 'kcna-worker', role: 'worker', labels: { disktype: 'ssd', zone: 'zona-a' }, cpu: 2000, mem: 4096, images: [IMAGE] },
    { name: 'kcna-worker2', role: 'worker', labels: { disktype: 'hdd', zone: 'zona-b' }, cpu: 2000, mem: 4096, images: [] },
  ];
  const initial: PodSpec[] = [
    { id: 'cp1', name: 'kube-apiserver', node: 'kcna-control-plane', status: 'Running', cpu: 250, mem: 512, tag: 'static' },
    { id: 'cp2', name: 'etcd', node: 'kcna-control-plane', status: 'Running', cpu: 100, mem: 256, tag: 'static' },
    { id: 'w1', name: 'web-7f9c-abcde', node: 'kcna-worker', status: 'Running', cpu: 250, mem: 256, tag: 'app=web' },
    { id: 'w2', name: 'web-7f9c-fghij', node: 'kcna-worker', status: 'Running', cpu: 250, mem: 256, tag: 'app=web' },
    { id: 'w3', name: 'api-5d4b-kl2mn', node: 'kcna-worker', status: 'Running', cpu: 500, mem: 512, tag: 'app=api', color: 'd' },
    { id: 'x1', name: 'cache-9b1f-pqrst', node: 'kcna-worker2', status: 'Running', cpu: 200, mem: 512, tag: 'app=cache', color: 'b' },
  ];

  // --- estado del formulario del pod nuevo
  let cpu = $state(250);
  let mem = $state(256);
  let selector = $state<'none' | 'ssd' | 'hdd' | 'nvme'>('none');
  let tolCp = $state(false);
  let tolDed = $state(false);
  let affKind = $state<'none' | 'required' | 'preferred'>('none');
  let affZone = $state<'zona-a' | 'zona-b'>('zona-b');
  let anti = $state(false);
  let nodeName = $state('');
  let dedicado = $state(false);

  // --- estado de la escena
  type Verdict = { ok: boolean; reason?: string; detail?: string };
  type Score = { load: number; aff: number; img: number; total: number };
  interface Ev { type: 'Normal' | 'Warning'; reason: string; from: string; msg: string }
  let pods = $state<PodSpec[]>([...initial]);
  let phase = $state<'idle' | 'filter' | 'score' | 'done'>('idle');
  let verdicts = $state<Record<string, Verdict>>({});
  let scores = $state<Record<string, Score>>({});
  let events = $state<Ev[]>([]);
  let currentId = $state('');
  let winner = $state('');
  let busy = $state(false);
  let note = $state('Ajusta el pod de la izquierda y pulsa Programar. El scheduler primero filtra (qué nodos pueden) y después puntúa (cuál es el mejor).');
  let noteKind = $state<'' | 'ok' | 'warn' | 'fail'>('');
  let seq = 0;

  const taintsOf = (n: Info) => (n.role === 'control-plane' ? [CP_TAINT] : dedicado && n.name === 'kcna-worker2' ? [DED_TAINT] : []);
  const nodes = $derived<NodeSpec[]>(base.map((n) => ({ name: n.name, role: n.role, labels: n.labels, taints: taintsOf(n), cpu: n.cpu, mem: n.mem, highlight: n.name === winner })));
  const used = (name: string, k: 'cpu' | 'mem') => pods.filter((p) => p.node === name && p.status !== 'Failed').reduce((a, p) => a + (p[k] ?? 0), 0);
  const current = $derived(pods.find((p) => p.id === currentId));

  function say(s: string, kind: '' | 'ok' | 'warn' | 'fail' = '') { note = s; noteKind = kind; }

  // --- fase de filtrado: cada nodo devuelve la primera razón por la que queda descartado
  function filterNode(n: Info): Verdict {
    for (const t of taintsOf(n)) {
      const tolerated = (t === CP_TAINT && tolCp) || (t === DED_TAINT && tolDed);
      if (!tolerated) return { ok: false, reason: 'had untolerated taint(s)', detail: `taint ${t} y el pod no lo tolera` };
    }
    if (selector !== 'none' && n.labels.disktype !== selector) {
      return { ok: false, reason: "didn't match Pod's node affinity/selector", detail: `nodeSelector disktype=${selector}; el nodo ${n.labels.disktype ? `tiene disktype=${n.labels.disktype}` : 'no tiene la label disktype'}` };
    }
    if (affKind === 'required' && n.labels.zone !== affZone) {
      return { ok: false, reason: "didn't match Pod's node affinity/selector", detail: `affinity required zone In [${affZone}]; el nodo ${n.labels.zone ? `tiene zone=${n.labels.zone}` : 'no tiene la label zone'}` };
    }
    const uc = used(n.name, 'cpu'), um = used(n.name, 'mem');
    if (uc + cpu > n.cpu) return { ok: false, reason: 'Insufficient cpu', detail: `${uc}m ya reservados + ${cpu}m pedidos > ${n.cpu}m asignables` };
    if (um + mem > n.mem) return { ok: false, reason: 'Insufficient memory', detail: `${um}Mi ya reservados + ${mem}Mi pedidos > ${n.mem}Mi asignables` };
    if (anti && pods.some((p) => p.node === n.name && p.tag === 'app=web' && p.status !== 'Failed')) {
      return { ok: false, reason: "didn't match pod anti-affinity rules", detail: 'ya corre un pod app=web en este nodo (topologyKey kubernetes.io/hostname)' };
    }
    return { ok: true };
  }

  // Mensaje FailedScheduling con el formato real: "N node(s) razón" ordenados alfabéticamente
  function failMsg(vs: Record<string, Verdict>): string {
    const counts = new Map<string, number>();
    let insuf = 0;
    for (const v of Object.values(vs)) {
      if (v.ok) continue;
      counts.set(v.reason!, (counts.get(v.reason!) ?? 0) + 1);
      if (v.reason!.startsWith('Insufficient')) insuf += 1;
    }
    const total = base.length;
    const parts = [...counts].map(([r, c]) => `${c} node(s) ${r}`).sort();
    const pre: string[] = [];
    if (total - insuf) pre.push(`${total - insuf} Preemption is not helpful for scheduling`);
    if (insuf) pre.push(`${insuf} No preemption victims found for incoming pod`);
    return `0/${total} nodes are available: ${parts.join(', ')}. preemption: 0/${total} nodes are available: ${pre.sort().join(', ')}.`;
  }

  // --- fase de puntuación
  function scoreNode(n: Info): Score {
    const uc = used(n.name, 'cpu') + cpu, um = used(n.name, 'mem') + mem;
    const load = Math.max(0, Math.round(100 * (1 - (uc / n.cpu + um / n.mem) / 2)));
    const aff = affKind === 'preferred' && n.labels.zone === affZone ? 100 : 0;
    const img = n.images.includes(IMAGE) ? 20 : 0;
    return { load, aff, img, total: load + aff + img };
  }

  const kubeletEvents = (): Ev[] => [
    { type: 'Normal', reason: 'Pulled', from: 'kubelet', msg: `Container image "${IMAGE}" already present on machine` },
    { type: 'Normal', reason: 'Created', from: 'kubelet', msg: 'Created container nginx' },
    { type: 'Normal', reason: 'Started', from: 'kubelet', msg: 'Started container nginx' },
  ];

  async function programar() {
    if (busy) return;
    busy = true;
    phase = 'idle'; verdicts = {}; scores = {}; winner = ''; events = [];
    const id = `n${++seq}`;
    const name = `nuevo-${seq}`;
    currentId = id;
    pods = [...pods.map((p) => ({ ...p, highlight: false })), { id, name, status: 'Pending', cpu, mem, tag: 'app=web', color: 'c', highlight: true }];
    say(`El API server guardó ${name} con spec.nodeName vacío: aparece en la bandeja Pending.`, 'warn');
    await wait(600);

    if (nodeName) {
      // scheduling manual: el scheduler ni lo mira
      const n = base.find((b) => b.name === nodeName)!;
      const okCpu = used(n.name, 'cpu') + cpu <= n.cpu;
      const okMem = used(n.name, 'mem') + mem <= n.mem;
      if (okCpu && okMem) {
        pods = pods.map((p) => (p.id === id ? { ...p, node: nodeName, status: 'ContainerCreating' } : p));
        events = kubeletEvents();
        const taint = taintsOf(n).length ? ` El nodo tiene el taint ${taintsOf(n)[0]} y da igual: los taints los comprueba el scheduler, y aquí no participó.` : '';
        say(`spec.nodeName=${nodeName}: el scheduler ignora el pod porque ya tiene nodo y el kubelet de ${nodeName} lo arranca directamente. No hay evento Scheduled.${taint}`, 'ok');
        await wait(700);
        pods = pods.map((p) => (p.id === id ? { ...p, status: 'Running' } : p));
      } else {
        const r = okCpu ? 'memory' : 'cpu';
        pods = pods.map((p) => (p.id === id ? { ...p, node: nodeName, status: 'Failed', tag: `OutOf${r}` } : p));
        events = [{ type: 'Warning', reason: `OutOf${r}`, from: 'kubelet', msg: `Node didn't have enough resource: ${r}, requested: ${r === 'cpu' ? cpu : mem}, used: ${used(n.name, r)}, capacity: ${n[r]}` }];
        say(`Con nodeName nadie comprueba si el pod cabe: el kubelet de ${nodeName} lo rechaza con OutOf${r} y el pod queda Failed en lugar de esperar otro nodo.`, 'fail');
      }
      phase = 'done'; busy = false;
      return;
    }

    // 1. filtrado
    phase = 'filter';
    say('Fase 1, filtrado: el scheduler pregunta a cada nodo si el pod puede correr allí (taints, selector/affinity, recursos, anti-affinity).');
    const vs: Record<string, Verdict> = {};
    for (const n of base) {
      vs[n.name] = filterNode(n);
      verdicts = { ...vs };
      await wait(550);
    }
    const feasible = base.filter((n) => vs[n.name].ok);
    if (!feasible.length) {
      const msg = failMsg(vs);
      events = [{ type: 'Warning', reason: 'FailedScheduling', from: 'default-scheduler', msg }];
      pods = pods.map((p) => (p.id === id ? { ...p, highlight: false } : p));
      say(`Ningún nodo pasó el filtro: ${name} se queda Pending con un evento FailedScheduling. El mensaje resume el filtrado nodo a nodo; el scheduler reintentará más tarde, el pod no falla.`, 'fail');
      phase = 'done'; busy = false;
      return;
    }

    // 2. puntuación
    phase = 'score';
    say(`Fase 2, puntuación: ${feasible.length === 1 ? 'solo queda un nodo viable, pero igualmente se puntúa' : `quedan ${feasible.length} nodos viables; gana el de mayor puntuación`}.`);
    const sc: Record<string, Score> = {};
    for (const n of feasible) {
      sc[n.name] = { load: 0, aff: 0, img: 0, total: 0 };
      scores = { ...sc };
      await wait(40);
      sc[n.name] = scoreNode(n);
      scores = { ...sc };
      await wait(500);
    }
    const best = feasible.reduce((a, b) => (sc[b.name].total > sc[a.name].total ? b : a));
    winner = best.name;
    await wait(400);

    // 3. binding y arranque
    pods = pods.map((p) => (p.id === id ? { ...p, node: winner, status: 'ContainerCreating' } : p));
    events = [{ type: 'Normal', reason: 'Scheduled', from: 'default-scheduler', msg: `Successfully assigned lab-04/${name} to ${winner}` }, ...kubeletEvents()];
    const why = sc[winner].aff ? 'la affinity preferred por zona le dio 100 puntos' : feasible.length > 1 ? 'tenía menos requests reservados (NodeResourcesBalancedAllocation)' : 'era el único que pasó el filtro';
    say(`Binding: el scheduler escribe spec.nodeName=${winner} porque ${why}. El kubelet de ${winner} ve el pod y arranca el contenedor.`, 'ok');
    await wait(700);
    pods = pods.map((p) => (p.id === id ? { ...p, status: 'Running' } : p));
    phase = 'done'; busy = false;
  }

  function reiniciar() {
    if (busy) return;
    pods = [...initial]; phase = 'idle'; verdicts = {}; scores = {}; events = []; winner = ''; currentId = '';
    say('Clúster restaurado: los pods que programaste desaparecen y vuelven los requests iniciales.');
  }
  function toggleTaint() {
    dedicado = !dedicado;
    if (dedicado) say(`kubectl taint nodes kcna-worker2 ${DED_TAINT}: a partir de ahora el filtrado descarta kcna-worker2 salvo que el pod tolere ese taint. Los pods que ya corren allí se quedan (NoSchedule no desaloja).`, 'warn');
    else { tolDed = false; say(`kubectl taint nodes kcna-worker2 ${DED_TAINT}-: taint retirado. Fíjate en que nada se mueve: el scheduler solo decide al crear el pod.`); }
  }

  // --- textos de ayuda por control
  const hints = {
    cpu: () => say(`requests.cpu=${cpu}m: es lo que el scheduler suma para saber si el pod cabe. Mira la barra cpu de cada nodo: si reservado + ${cpu}m supera 2000m, ese nodo falla el filtro con Insufficient cpu.`),
    mem: () => say(`requests.memory=${mem}Mi: igual que la CPU, cuenta la reserva, no el consumo real.`),
    selector: () => say(selector === 'none' ? 'Sin nodeSelector: cualquier nodo vale en esa comprobación.' : selector === 'nvme' ? 'nodeSelector disktype=nvme: ningún nodo del laboratorio tiene esa label, así que los dos workers caerán en el filtro (como el pod imposible del lab).' : `nodeSelector disktype=${selector}: el nodo debe tener exactamente esa label. Solo ${selector === 'ssd' ? 'kcna-worker' : 'kcna-worker2'} la tiene.`),
    tolCp: () => say(tolCp ? 'Toleration al taint del control plane: ahora kcna-control-plane pasa el filtro de taints. Tolerar permite entrar, no obliga: aún tiene que ganar la puntuación.' : 'Sin toleration: kcna-control-plane queda descartado por su taint node-role.kubernetes.io/control-plane:NoSchedule.'),
    tolDed: () => say(tolDed ? `Toleration a ${DED_TAINT}: kcna-worker2 vuelve a ser candidato. Si además quieres que vaya solo allí, combínalo con affinity required zone=zona-b (nodo dedicado de verdad).` : 'Sin esa toleration, kcna-worker2 queda fuera mientras tenga el taint.'),
    aff: () => say(affKind === 'none' ? 'Sin node affinity.' : affKind === 'required' ? `requiredDuringSchedulingIgnoredDuringExecution zone In [${affZone}]: obligatorio, actúa en el filtrado. Si ningún nodo cumple, Pending.` : `preferredDuringSchedulingIgnoredDuringExecution zone In [${affZone}] con weight 100: es una preferencia, actúa en la puntuación. Si nadie cumple, el pod se coloca igual.`),
    anti: () => say(anti ? 'podAntiAffinity required contra app=web con topologyKey kubernetes.io/hostname: no puede ir a un nodo donde ya corra un pod app=web. kcna-worker tiene dos.' : 'Sin pod anti-affinity.'),
    nodeName: () => say(nodeName ? `spec.nodeName=${nodeName}: scheduling manual. El scheduler no participará: ni filtrado, ni puntuación, ni taints.` : 'Sin nodeName: el scheduler decide.'),
  };

  const yaml = $derived.by(() => {
    const l: string[] = ['apiVersion: v1', 'kind: Pod', 'metadata:', '  name: nuevo', '  namespace: lab-04', '  labels: { app: web }', 'spec:'];
    if (nodeName) l.push(`  nodeName: ${nodeName}`);
    if (selector !== 'none') l.push('  nodeSelector:', `    disktype: ${selector}`);
    if (tolCp || tolDed) {
      l.push('  tolerations:');
      if (tolCp) l.push('    - key: node-role.kubernetes.io/control-plane', '      operator: Exists', '      effect: NoSchedule');
      if (tolDed) l.push('    - key: lab-04-dedicado', '      operator: Equal', '      value: "true"', '      effect: NoSchedule');
    }
    if (affKind !== 'none' || anti) {
      l.push('  affinity:');
      if (affKind === 'required') l.push('    nodeAffinity:', '      requiredDuringSchedulingIgnoredDuringExecution:', '        nodeSelectorTerms:', '          - matchExpressions:', '              - { key: zone, operator: In, values: ["' + affZone + '"] }');
      if (affKind === 'preferred') l.push('    nodeAffinity:', '      preferredDuringSchedulingIgnoredDuringExecution:', '        - weight: 100', '          preference:', '            matchExpressions:', '              - { key: zone, operator: In, values: ["' + affZone + '"] }');
      if (anti) l.push('    podAntiAffinity:', '      requiredDuringSchedulingIgnoredDuringExecution:', '        - labelSelector: { matchLabels: { app: web } }', '          topologyKey: kubernetes.io/hostname');
    }
    l.push('  containers:', '    - name: nginx', `      image: ${IMAGE}`, '      resources:', `        requests: { cpu: ${cpu}m, memory: ${mem}Mi }`);
    return l.join('\n');
  });

  const describe = $derived.by(() => {
    const p = current;
    if (!p) return '';
    const tol = [
      ...(tolCp ? ['node-role.kubernetes.io/control-plane:NoSchedule op=Exists'] : []),
      ...(tolDed ? ['lab-04-dedicado=true:NoSchedule'] : []),
      'node.kubernetes.io/not-ready:NoExecute op=Exists for 300s',
      'node.kubernetes.io/unreachable:NoExecute op=Exists for 300s',
    ];
    const l = [
      `Name:             ${p.name}`,
      'Namespace:        lab-04',
      `Node:             ${p.node ?? '<none>'}`,
      `Status:           ${p.status}`,
      `QoS Class:        ${cpu || mem ? 'Burstable' : 'BestEffort'}`,
      `Node-Selectors:   ${selector === 'none' ? '<none>' : `disktype=${selector}`}`,
      ...tol.map((t, i) => (i === 0 ? `Tolerations:      ${t}` : `                  ${t}`)),
      'Events:',
    ];
    if (!events.length) l.push('  <none>');
    else {
      l.push('  Type     Reason            Age   From               Message', '  ----     ------            ----  ----               -------');
      for (const e of events) l.push(`  ${e.type.padEnd(8)} ${e.reason.padEnd(17)} 1s    ${e.from.padEnd(18)} ${e.msg}`);
    }
    return l.join('\n');
  });
</script>

{#snippet nodeFooter(node: NodeSpec)}
  {#if verdicts[node.name]}
    {@const v = verdicts[node.name]}
    <div class="verdict" class:ok={v.ok} class:no={!v.ok}>{v.ok ? 'pasa el filtro' : `descartado: ${v.reason}`}</div>
    {#if v.detail}<div class="detail">{v.detail}</div>{/if}
  {/if}
  {#if scores[node.name]}
    {@const s = scores[node.name]}
    <div class="score" aria-label={`puntuación de ${node.name}: ${s.total}`}>
      <div class="row"><span>menos carga</span><div class="bar"><span style={`width:${s.load}%`}></span></div><em>{s.load}</em></div>
      <div class="row"><span>affinity preferred</span><div class="bar"><span style={`width:${s.aff}%`}></span></div><em>{s.aff}</em></div>
      <div class="row"><span>imagen presente</span><div class="bar"><span style={`width:${s.img * 5}%`}></span></div><em>{s.img}</em></div>
      <div class="total" class:win={winner === node.name}>total {s.total}{winner === node.name ? ' · elegido' : ''}</div>
    </div>
  {/if}
{/snippet}

<div class="sched">
  <div class="layout">
    <form class="form" onsubmit={(e) => { e.preventDefault(); programar(); }}>
      <div class="field">
        <label for="s-cpu">requests.cpu <span class="mono">{cpu}m</span></label>
        <input id="s-cpu" type="range" min="0" max="2000" step="50" bind:value={cpu} oninput={hints.cpu} disabled={busy} />
      </div>
      <div class="field">
        <label for="s-mem">requests.memory <span class="mono">{mem}Mi</span></label>
        <input id="s-mem" type="range" min="0" max="4096" step="64" bind:value={mem} oninput={hints.mem} disabled={busy} />
      </div>
      <div class="field">
        <label for="s-sel">nodeSelector</label>
        <select id="s-sel" bind:value={selector} onchange={hints.selector} disabled={busy}>
          <option value="none">ninguno</option>
          <option value="ssd">disktype=ssd</option>
          <option value="hdd">disktype=hdd</option>
          <option value="nvme">disktype=nvme</option>
        </select>
      </div>
      <div class="field">
        <label for="s-aff">node affinity por zone</label>
        <div class="pair">
          <select id="s-aff" bind:value={affKind} onchange={hints.aff} disabled={busy}>
            <option value="none">ninguna</option>
            <option value="required">required</option>
            <option value="preferred">preferred (weight 100)</option>
          </select>
          <select aria-label="zona" bind:value={affZone} onchange={hints.aff} disabled={busy || affKind === 'none'}>
            <option value="zona-a">zone=zona-a</option>
            <option value="zona-b">zone=zona-b</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="s-nn">nodeName (manual)</label>
        <select id="s-nn" bind:value={nodeName} onchange={hints.nodeName} disabled={busy}>
          <option value="">ninguno (decide el scheduler)</option>
          {#each base as n}<option value={n.name}>{n.name}</option>{/each}
        </select>
      </div>
      <div class="field checks">
        <label class="check"><input type="checkbox" bind:checked={tolCp} onchange={hints.tolCp} disabled={busy} /> toleration al taint del control plane</label>
        {#if dedicado}<label class="check"><input type="checkbox" bind:checked={tolDed} onchange={hints.tolDed} disabled={busy} /> toleration a lab-04-dedicado</label>{/if}
        <label class="check"><input type="checkbox" bind:checked={anti} onchange={hints.anti} disabled={busy} /> podAntiAffinity con app=web</label>
      </div>
      <div class="actions">
        <button type="submit" class="btn primary" disabled={busy}>Programar</button>
        <button type="button" class="btn small" onclick={toggleTaint} disabled={busy}>{dedicado ? 'Quitar taint de kcna-worker2' : 'Poner taint lab-04-dedicado a kcna-worker2'}</button>
        <button type="button" class="btn small" onclick={reiniciar} disabled={busy}>Reiniciar</button>
      </div>
    </form>

    <div class="scene">
      <p class="phase" aria-live="polite">
        <span class:on={phase === 'filter'} class:past={phase === 'score' || (phase === 'done' && Object.keys(verdicts).length > 0)}>1 filtrado</span>
        <span class:on={phase === 'score'} class:past={phase === 'done' && Object.keys(scores).length > 0}>2 puntuación</span>
        <span class:on={phase === 'done' && !!winner}>3 binding</span>
      </p>
      <ClusterCanvas {nodes} {pods} showUsage {nodeFooter} />
    </div>
  </div>

  <div class="explain {noteKind}" aria-live="polite">{note}</div>

  <div class="panels">
    <details>
      <summary>YAML del pod que vas a enviar</summary>
      <pre>{yaml}</pre>
    </details>
    {#if current}
      <details open>
        <summary>kubectl describe pod {current.name} -n lab-04</summary>
        <pre>{describe}</pre>
      </details>
    {/if}
  </div>
</div>

<style>
  .sched { display: grid; gap: 14px; }
  .layout { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 16px; align-items: start; }
  @media (max-width: 720px) { .layout { grid-template-columns: 1fr; } }
  .form { display: grid; gap: 10px; align-content: start; }
  .field { display: grid; gap: 4px; }
  .field label { display: flex; justify-content: space-between; gap: 8px; }
  .field input[type='range'] { width: 100%; margin: 0; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .pair select { min-width: 0; }
  .checks { gap: 6px; }
  .field label.check, .check { display: flex; align-items: center; gap: 8px; font-weight: 400; font-size: 0.9rem; justify-content: flex-start; }
  .check input { accent-color: var(--helm); }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .scene { display: grid; gap: 8px; min-width: 0; }
  .phase { display: flex; gap: 6px; flex-wrap: wrap; font-size: 0.8rem; color: var(--ink-3); }
  .phase span { padding: 2px 9px; border-radius: 999px; border: 1px solid var(--line); transition: background var(--dur), color var(--dur), border-color var(--dur); }
  .phase span.on { background: var(--helm); border-color: var(--helm); color: #fff; }
  .phase span.past { background: var(--helm-2); border-color: var(--helm-2); color: var(--helm-ink); }
  .verdict { font-weight: 600; font-size: 0.76rem; }
  .verdict.ok { color: var(--ready); }
  .verdict.no { color: var(--fail); }
  .detail { font-size: 0.72rem; color: var(--ink-3); margin-top: 2px; }
  .score { display: grid; gap: 3px; margin-top: 6px; }
  .row { display: grid; grid-template-columns: 7.2em 1fr 2em; align-items: center; gap: 6px; font-size: 0.7rem; color: var(--ink-2); }
  .row em { font-style: normal; font-family: var(--mono); text-align: right; }
  .bar { height: 8px; background: var(--panel); border: 1px solid var(--line-2); border-radius: 4px; overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--helm); transition: width var(--dur-slow) var(--ease); }
  .total { font-size: 0.74rem; font-weight: 600; color: var(--ink-2); font-family: var(--mono); }
  .total.win { color: var(--ready); }
  .panels { display: grid; gap: 10px; }
  details { border: 1px solid var(--line); border-radius: var(--r-m); padding: 8px 12px; background: var(--panel); }
  summary { cursor: pointer; font-weight: 500; font-size: 0.92rem; color: var(--helm-ink); font-family: var(--mono); }
  details pre { margin-top: 8px; white-space: pre; }
</style>
