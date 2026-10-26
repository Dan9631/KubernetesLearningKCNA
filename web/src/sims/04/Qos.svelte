<script lang="ts">
  // Requests, limits y QoS: dos contenedores editables, la QoS class que resulta, qué pasa al pasarse de memoria,
  // y un namespace con LimitRange y ResourceQuota.
  type Res = { rc: number; rm: number; lc: number; lm: number }; // 0 = sin declarar (m y Mi)
  const CPU = [0, 25, 50, 100, 250, 500, 800];
  const MEM = [0, 32, 64, 128, 256, 512];
  const LR = { rc: 25, rm: 32, lc: 100, lm: 64, maxC: 500, maxM: 256 };
  const HARD = { pods: 4, cpu: 500 };

  let res = $state<{ app: Res; sidecar: Res }>({ app: { rc: 100, rm: 64, lc: 250, lm: 128 }, sidecar: { rc: 0, rm: 0, lc: 0, lm: 0 } });
  let limitRange = $state(false);
  let quota = $state(false);
  let usage = $state(48);
  let created = $state<{ name: string; cpu: number }[]>([]);
  let out = $state('');
  let outKind = $state<'' | 'ok' | 'fail'>('');
  let note = $state('Cambia requests y limits de cada contenedor: la QoS class no se declara, Kubernetes la deduce de estos valores.');

  // Valores efectivos: el admission controller LimitRanger rellena lo que falta y el API server copia limit -> request
  function eff(r: Res): Res {
    const lc = r.lc || (limitRange ? LR.lc : 0);
    const lm = r.lm || (limitRange ? LR.lm : 0);
    const rc = r.rc || (r.lc ? r.lc : limitRange ? LR.rc : 0);
    const rm = r.rm || (r.lm ? r.lm : limitRange ? LR.rm : 0);
    return { rc, rm, lc, lm };
  }
  const eApp = $derived(eff(res.app));
  const eSide = $derived(eff(res.sidecar));

  type Qos = 'Guaranteed' | 'Burstable' | 'BestEffort';
  const qos = $derived.by((): { cls: Qos; why: string[] } => {
    const cs = [{ n: 'app', e: eApp }, { n: 'sidecar', e: eSide }];
    const any = cs.some(({ e }) => e.rc || e.rm || e.lc || e.lm);
    if (!any) return { cls: 'BestEffort', why: ['ningún contenedor declara requests ni limits'] };
    const why: string[] = [];
    for (const { n, e } of cs) {
      const probs: string[] = [];
      if (!e.lc) probs.push('falta limits.cpu');
      if (!e.lm) probs.push('falta limits.memory');
      if (e.lc && e.rc !== e.lc) probs.push(`requests.cpu ${e.rc}m ≠ limits.cpu ${e.lc}m`);
      if (e.lm && e.rm !== e.lm) probs.push(`requests.memory ${e.rm}Mi ≠ limits.memory ${e.lm}Mi`);
      if (probs.length) why.push(`${n}: ${probs.join(', ')}`);
      else why.push(`${n}: requests = limits en CPU y memoria`);
    }
    const g = cs.every(({ e }) => e.lc && e.lm && e.rc === e.lc && e.rm === e.lm);
    return { cls: g ? 'Guaranteed' : 'Burstable', why };
  });

  const SCALE = 600;
  const pct = (v: number) => Math.min(100, (100 * v) / SCALE);
  const memState = $derived.by(() => {
    const e = eApp;
    if (e.lm && usage > e.lm) return { k: 'oom' as const, title: `OOMKilled: ${usage}Mi > limit ${e.lm}Mi` };
    if (!e.rm && !e.lm) return { k: 'none' as const, title: 'sin request ni limit de memoria' };
    if (e.rm && usage > e.rm) return { k: 'over' as const, title: `por encima del request (${usage}Mi > ${e.rm}Mi)` };
    return { k: 'ok' as const, title: `dentro del request (${usage}Mi ≤ ${e.rm}Mi)` };
  });

  const fmt = (r: Res) => `{"limits":{${r.lc ? `"cpu":"${r.lc}m"` : ''}${r.lc && r.lm ? ',' : ''}${r.lm ? `"memory":"${r.lm}Mi"` : ''}},"requests":{${r.rc ? `"cpu":"${r.rc}m"` : ''}${r.rc && r.rm ? ',' : ''}${r.rm ? `"memory":"${r.rm}Mi"` : ''}}}`;

  function setNote(s: string) { note = s; }
  function onRes(c: 'app' | 'sidecar', field: keyof Res) {
    const r = res[c];
    const v = r[field];
    const name = field === 'rc' ? 'requests.cpu' : field === 'rm' ? 'requests.memory' : field === 'lc' ? 'limits.cpu' : 'limits.memory';
    if (!v) setNote(`${c}.${name} sin declarar${limitRange ? `: el LimitRange del namespace lo rellena con su valor por defecto` : field.startsWith('r') && (field === 'rc' ? r.lc : r.lm) ? ': Kubernetes copia el limit como request (truco de memoria del examen)' : ''}.`);
    else if (field === 'rc' || field === 'rm') setNote(`${c}.${name}: la reserva que suma el scheduler para ver si el pod cabe en un nodo. No limita nada en tiempo de ejecución.`);
    else if (field === 'lc') setNote(`${c}.limits.cpu=${v}m: si el contenedor intenta usar más, se ralentiza (throttling). No muere.`);
    else setNote(`${c}.limits.memory=${v}Mi: si el contenedor supera este techo, el kernel lo mata (OOMKilled, exit code 137).`);
  }
  function onLimitRange() {
    created = []; out = '';
    setNote(limitRange ? 'LimitRange limites-lab en lab-04: defaultRequest 25m/32Mi, default 100m/64Mi, max 500m/256Mi por contenedor. El admission controller LimitRanger rellena lo que no declares, por eso un pod sin resources sale Burstable y no BestEffort.' : 'Sin LimitRange: lo que no declares queda vacío.');
  }
  function onQuota() {
    created = []; out = '';
    setNote(quota ? `ResourceQuota cuota-lab: pods ≤ ${HARD.pods}, requests.cpu ≤ ${HARD.cpu}m en total. Como la cuota controla requests.cpu, todo pod nuevo debe declararlo (o tener un LimitRange que lo rellene).` : 'Sin ResourceQuota: el namespace no tiene techo.');
  }
  function onUsage() {
    const e = eApp;
    if (memState.k === 'oom') setNote(`app consume ${usage}Mi y su limit es ${e.lm}Mi: el kernel lo mata (OOMKilled, exit code 137). Con restartPolicy Always el kubelet lo reinicia y, si se repite, entra en CrashLoopBackOff. El límite de memoria no ralentiza: mata.`);
    else if (memState.k === 'over') setNote(`app consume ${usage}Mi, más que su request (${e.rm}Mi)${e.lm ? ` pero menos que su limit (${e.lm}Mi)` : ' y no tiene limit'}. Mientras el nodo tenga memoria libre no pasa nada; si el nodo entra en presión de memoria, el kubelet desaloja primero los BestEffort, después los Burstable que superan su request (como este) y los Guaranteed al final.`);
    else if (memState.k === 'none') setNote(`app no declara request ni limit de memoria: puede usar ${usage}Mi o lo que quede libre, pero es el primer candidato a desalojo cuando el nodo sufra presión.`);
    else setNote(`app consume ${usage}Mi, dentro de su request de ${e.rm}Mi: esa memoria está reservada para él; el kubelet no lo tocará aunque el nodo entre en presión (salvo que no haya nada más que desalojar).`);
  }

  function run() {
    const name = `relleno-${created.length + 1}`;
    const cs = [{ n: 'app', e: eApp }, { n: 'sidecar', e: eSide }];
    // 1. LimitRanger (máximos por contenedor)
    if (limitRange) {
      for (const c of cs) {
        if (c.e.lc > LR.maxC) return reject(`Error from server (Forbidden): pods "${name}" is forbidden: maximum cpu usage per Container is ${LR.maxC}m, but limit is ${c.e.lc}m`, 'El LimitRange también pone máximos: el admission controller rechaza el pod antes de que llegue al scheduler.');
        if (c.e.lm > LR.maxM) return reject(`Error from server (Forbidden): pods "${name}" is forbidden: maximum memory usage per Container is ${LR.maxM}Mi, but limit is ${c.e.lm}Mi`, 'El LimitRange también pone máximos: el admission controller rechaza el pod antes de que llegue al scheduler.');
      }
    }
    // 2. ResourceQuota
    const podCpu = cs.reduce((a, c) => a + c.e.rc, 0);
    if (quota) {
      const missing = cs.filter((c) => !c.e.rc).map((c) => c.n);
      if (missing.length) return reject(`Error from server (Forbidden): pods "${name}" is forbidden: failed quota: cuota-lab: must specify requests.cpu for: ${missing.join(',')}`, 'La cuota controla requests.cpu, así que todo contenedor nuevo debe declararlo. Un LimitRange con valores por defecto lo resolvería.');
      const usedPods = created.length, usedCpu = created.reduce((a, c) => a + c.cpu, 0);
      if (usedPods + 1 > HARD.pods) return reject(`Error from server (Forbidden): pods "${name}" is forbidden: exceeded quota: cuota-lab, requested: pods=1, used: pods=${usedPods}, limited: pods=${HARD.pods}`, `El 5º pod no cabe: la cuota limita el total de pods del namespace a ${HARD.pods}. Si lo creara un Deployment, verías este mensaje en los eventos FailedCreate del ReplicaSet.`);
      if (usedCpu + podCpu > HARD.cpu) return reject(`Error from server (Forbidden): pods "${name}" is forbidden: exceeded quota: cuota-lab, requested: requests.cpu=${podCpu}m, used: requests.cpu=${usedCpu}m, limited: requests.cpu=${HARD.cpu}m`, 'La cuota suma los requests de todos los pods del namespace: este ya no cabe aunque haya pods de sobra.');
    }
    created = [...created, { name, cpu: podCpu }];
    out = `pod/${name} created\n$ kubectl get pod ${name} -n lab-04 -o jsonpath='{.spec.containers[0].resources}'\n${fmt(eApp)}\n$ kubectl get pod ${name} -n lab-04 -o jsonpath='{.status.qosClass}'\n${qos.cls}`;
    outKind = 'ok';
    setNote(`${name} creado con QoS ${qos.cls}.${quota ? ` Cuota: pods ${created.length}/${HARD.pods}, requests.cpu ${created.reduce((a, c) => a + c.cpu, 0)}m/${HARD.cpu}m.` : ''}${limitRange && (!res.app.rc || !res.app.lc) ? ' Fíjate en los valores que rellenó el LimitRange.' : ''}`);
  }
  function reject(msg: string, why: string) { out = msg; outKind = 'fail'; setNote(why); }
  function reset() { created = []; out = ''; outKind = ''; setNote('Pods borrados: la cuota vuelve a cero.'); }
</script>

<div class="qos">
  <div class="containers">
    {#each [{ n: 'app', e: eApp, key: 'app' as const }, { n: 'sidecar', e: eSide, key: 'sidecar' as const }] as c (c.n)}
      <fieldset class="ctr">
        <legend class="mono">containers[{c.key === 'app' ? 0 : 1}] {c.n}</legend>
        <div class="grid">
          <label>requests.cpu
            <select bind:value={res[c.key].rc} onchange={() => onRes(c.key, 'rc')}>{#each CPU as v}<option value={v}>{v ? `${v}m` : 'sin declarar'}</option>{/each}</select>
          </label>
          <label>limits.cpu
            <select bind:value={res[c.key].lc} onchange={() => onRes(c.key, 'lc')}>{#each CPU as v}<option value={v}>{v ? `${v}m` : 'sin declarar'}</option>{/each}</select>
          </label>
          <label>requests.memory
            <select bind:value={res[c.key].rm} onchange={() => onRes(c.key, 'rm')}>{#each MEM as v}<option value={v}>{v ? `${v}Mi` : 'sin declarar'}</option>{/each}</select>
          </label>
          <label>limits.memory
            <select bind:value={res[c.key].lm} onchange={() => onRes(c.key, 'lm')}>{#each MEM as v}<option value={v}>{v ? `${v}Mi` : 'sin declarar'}</option>{/each}</select>
          </label>
        </div>
        <p class="eff mono">efectivo: req {c.e.rc || '-'}m / {c.e.rm || '-'}Mi · lim {c.e.lc || '-'}m / {c.e.lm || '-'}Mi</p>
      </fieldset>
    {/each}
  </div>

  <div class="result {qos.cls}">
    <div class="cls">status.qosClass: <strong class="mono">{qos.cls}</strong></div>
    <ul>{#each qos.why as w}<li>{w}</li>{/each}</ul>
    <p class="hint">
      {#if qos.cls === 'Guaranteed'}Todos los contenedores tienen requests y limits de CPU y memoria, y son iguales: es el último en ser desalojado.
      {:else if qos.cls === 'Burstable'}Algo declarado, pero no cumple Guaranteed: prioridad intermedia al desalojar.
      {:else}Nada declarado: usa lo que sobre y es el primero en ser desalojado cuando el nodo sufre presión.{/if}
    </p>
  </div>

  <section class="mem">
    <div class="controls">
      <label for="q-usage">consumo real de memoria de app <span class="mono">{usage}Mi</span></label>
      <input id="q-usage" type="range" min="0" max={SCALE} step="8" bind:value={usage} oninput={onUsage} />
    </div>
    <div class="membar" role="img" aria-label={memState.title}>
      <span class="fill {memState.k}" style={`width:${pct(usage)}%`}></span>
      {#if eApp.rm}<i class="mark req" style={`left:${pct(eApp.rm)}%`}><b>request {eApp.rm}Mi</b></i>{/if}
      {#if eApp.lm}<i class="mark lim" style={`left:${pct(eApp.lm)}%`}><b>limit {eApp.lm}Mi</b></i>{/if}
    </div>
    <div class="memstate">
      {#if memState.k === 'oom'}
        <pre>State:          Waiting
  Reason:       CrashLoopBackOff
Last State:     Terminated
  Reason:       OOMKilled
  Exit Code:    137
Restart Count:  3</pre>
      {:else}
        <div class="order" aria-label="orden de desalojo por QoS cuando el nodo sufre presión de memoria">
          <span class="step" class:me={qos.cls === 'BestEffort'}>1 BestEffort</span>
          <span class="step" class:me={qos.cls === 'Burstable'} class:risk={qos.cls === 'Burstable' && memState.k === 'over'}>2 Burstable{memState.k === 'over' ? ' (supera su request)' : ''}</span>
          <span class="step" class:me={qos.cls === 'Guaranteed'}>3 Guaranteed</span>
        </div>
        <p class="hint">{memState.title}. Orden en que el kubelet desaloja pods bajo presión del nodo; tu pod es el resaltado.</p>
      {/if}
    </div>
  </section>

  <section class="ns">
    <div class="controls">
      <label class="check"><input type="checkbox" bind:checked={limitRange} onchange={onLimitRange} /> namespace lab-04 con LimitRange por defecto (limites-lab)</label>
      <label class="check"><input type="checkbox" bind:checked={quota} onchange={onQuota} /> ResourceQuota cuota-lab (pods {HARD.pods}, requests.cpu {HARD.cpu}m)</label>
    </div>
    <div class="controls">
      <button type="button" class="btn primary small" onclick={run}>kubectl run relleno-{created.length + 1} (este pod)</button>
      <button type="button" class="btn small" onclick={reset} disabled={!created.length}>kubectl delete pod --all</button>
      {#if quota}<span class="mono hint">Used: pods {created.length}/{HARD.pods} · requests.cpu {created.reduce((a, c) => a + c.cpu, 0)}m/{HARD.cpu}m</span>{/if}
    </div>
    {#if out}<pre class={outKind}>{out}</pre>{/if}
  </section>

  <div class="explain {qos.cls === 'BestEffort' && memState.k !== 'ok' ? 'warn' : memState.k === 'oom' || outKind === 'fail' ? 'fail' : ''}" aria-live="polite">{note}</div>
</div>

<style>
  .qos { display: grid; gap: 14px; }
  .containers { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  .ctr { border: 1px solid var(--line); border-radius: var(--r-m); padding: 8px 12px 10px; margin: 0; background: var(--panel-2); min-width: 0; }
  legend { font-weight: 600; font-size: 0.88rem; padding: 0 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .grid label { display: grid; gap: 3px; font-size: 0.82rem; min-width: 0; }
  .grid select { width: 100%; min-width: 0; }
  .eff { font-size: 0.74rem; color: var(--ink-3); margin-top: 8px; }
  .result { border-radius: var(--r-m); padding: 10px 14px; border: 1px solid var(--line); background: var(--panel-2); display: grid; gap: 4px; }
  .result.Guaranteed { border-color: var(--ready); }
  .result.Burstable { border-color: var(--wait); }
  .result.BestEffort { border-color: var(--fail); }
  .cls { font-size: 0.95rem; }
  .result.Guaranteed .cls strong { color: var(--ready); }
  .result.Burstable .cls strong { color: var(--wait); }
  .result.BestEffort .cls strong { color: var(--fail); }
  .result ul { margin: 0; padding-left: 1.2em; font-size: 0.86rem; color: var(--ink-2); }
  .mem, .ns { display: grid; gap: 8px; border-top: 1px dashed var(--line); padding-top: 12px; }
  .mem .controls { margin: 0; display: grid; gap: 4px; }
  .mem .controls label { display: flex; justify-content: space-between; }
  .mem input[type='range'] { width: 100%; margin: 0; }
  .membar { position: relative; height: 22px; margin: 18px 0 6px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px; }
  .fill { position: absolute; inset: 0 auto 0 0; background: var(--ready); border-radius: 5px 0 0 5px; transition: width var(--dur) var(--ease), background var(--dur); }
  .fill.over { background: var(--wait); }
  .fill.oom { background: var(--fail); }
  .fill.none { background: var(--ink-3); }
  .mark { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--ink); }
  .mark.lim { background: var(--fail); }
  .mark b { position: absolute; top: -16px; left: -2px; font: 500 0.66rem var(--mono); white-space: nowrap; color: var(--ink-2); }
  .mark.lim b { color: var(--fail); top: auto; bottom: -16px; }
  .memstate { min-height: 48px; }
  .order { display: flex; flex-wrap: wrap; gap: 6px; }
  .step { font-size: 0.8rem; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--line); color: var(--ink-3); }
  .step.me { border-color: var(--helm); color: var(--helm-ink); background: var(--helm-2); font-weight: 600; }
  .step.risk { border-color: var(--wait); background: var(--wait-2); color: var(--ink); }
  .ns .controls { margin: 0; }
  .check { display: flex; align-items: center; gap: 8px; font-weight: 400; font-size: 0.9rem; }
  .check input { accent-color: var(--helm); }
  pre.fail { color: #ffb3b3; }
  pre.ok { color: #b9f0cc; }
</style>
