<script lang="ts">
  // PVC, PV y StorageClass: aprovisionamiento dinámico (standard, WaitForFirstConsumer) y estático (PV hostPath, Retain).
  import { wait } from '../../lib/motion';

  type Mode = 'dinamico' | 'estatico';
  type Reclaim = 'Delete' | 'Retain';
  interface Pvc { name: string; phase: 'Pending' | 'Bound' | 'Terminating'; size: string; mode: 'RWO' | 'RWX'; sc: string; reason: string }
  interface Pv { name: string; phase: 'Available' | 'Bound' | 'Released'; reclaim: Reclaim; claimRef: string | null; cap: string; mode: 'RWO'; sc: string; node: string; path: string }
  interface Pod { name: string; node: string; status: 'Pending' | 'ContainerCreating' | 'Running' }

  const DYN_PV = 'pvc-c6c62a67-d6b3-40d6-bf8f-dac329d21bb7';
  const staticPv = (): Pv => ({ name: 'lab-08-pv-manual', phase: 'Available', reclaim: 'Retain', claimRef: null, cap: '200Mi', mode: 'RWO', sc: 'lab-08-manual', node: 'kcna-worker', path: '/tmp/lab-08-pv' });

  let mode = $state<Mode>('dinamico');
  let reqSize = $state<'100Mi' | '500Mi'>('100Mi');
  let reqMode = $state<'RWO' | 'RWX'>('RWO');
  let pvc = $state<Pvc | null>(null);
  let pv = $state<Pv | null>(null);
  let pod = $state<Pod | null>(null);
  let data = $state<string[]>([]);
  let busy = $state(false);
  let step = $state('');
  let tone = $state<'' | 'ok' | 'warn' | 'fail'>('');
  let pedidos = 1000;

  const pvcName = $derived(mode === 'dinamico' ? 'datos' : 'claim-manual');
  const podName = $derived(mode === 'dinamico' ? 'app-pvc' : 'app-manual');
  const scName = $derived(mode === 'dinamico' ? 'standard' : 'lab-08-manual');
  const mib = (s: string) => parseInt(s, 10);

  function say(text: string, t: typeof tone = '') { step = text; tone = t; }
  function reset() {
    pvc = null; pod = null; data = []; pedidos = 1000;
    pv = mode === 'estatico' ? staticPv() : null;
    say(mode === 'dinamico'
      ? 'Aprovisionamiento dinámico: no existe ningún PV todavía. La StorageClass standard (rancher.io/local-path, reclaimPolicy Delete, volumeBindingMode WaitForFirstConsumer) creará uno cuando haga falta.'
      : 'Aprovisionamiento estático: el administrador ya creó a mano el PV lab-08-pv-manual (200Mi, RWO, hostPath /tmp/lab-08-pv en kcna-worker, Retain) y la StorageClass lab-08-manual sin aprovisionador (binding Immediate). Está Available, esperando un PVC que encaje.');
  }
  function setMode(m: Mode) { if (busy) return; mode = m; reset(); }
  reset();

  /** intenta enlazar el PVC con el PV estático */
  function tryBind(): boolean {
    if (!pvc || !pv) return false;
    if (pv.phase === 'Released') { pvc = { ...pvc, phase: 'Pending', reason: 'el PV está Released: su claimRef aún apunta al PVC antiguo' }; return false; }
    if (pv.phase !== 'Available') { pvc = { ...pvc, phase: 'Pending', reason: 'no hay ningún PV Available' }; return false; }
    if (pvc.sc !== pv.sc) { pvc = { ...pvc, phase: 'Pending', reason: 'storageClassName distinto' }; return false; }
    if (pvc.mode !== pv.mode) { pvc = { ...pvc, phase: 'Pending', reason: `el PV solo soporta ${pv.mode}, el PVC pide ${pvc.mode}` }; return false; }
    if (mib(pvc.size) > mib(pv.cap)) { pvc = { ...pvc, phase: 'Pending', reason: `el PV tiene ${pv.cap} y el PVC pide ${pvc.size}` }; return false; }
    pvc = { ...pvc, phase: 'Bound', reason: '' };
    pv = { ...pv, phase: 'Bound', claimRef: `lab-08/${pvc.name}` };
    return true;
  }

  async function crearPvc() {
    if (busy || pvc) return; busy = true;
    pvc = { name: pvcName, phase: 'Pending', size: reqSize, mode: reqMode, sc: scName, reason: '' };
    await wait(500);
    if (mode === 'dinamico') {
      pvc = { ...pvc, reason: 'waiting for first consumer to be created before binding' };
      say('El PVC queda Pending y no es un error: la clase standard usa WaitForFirstConsumer, así que el volumen no se crea hasta que un pod lo use y el scheduler haya elegido nodo. Así el disco nace en el nodo o zona correctos.', 'warn');
    } else if (tryBind()) {
      say(`Binding inmediato y sin pod: la clase lab-08-manual tiene volumeBindingMode Immediate. El controlador buscó un PV Available con la misma StorageClass, el access mode pedido y capacidad mayor o igual: pediste ${reqSize} y recibes el PV entero de 200Mi, porque el binding es 1:1.`, 'ok');
    } else {
      say(`El PVC se queda Pending: ${pvc?.reason}. Sin aprovisionador (kubernetes.io/no-provisioner) nadie puede crear otro PV, así que esperará hasta que un administrador cree uno que encaje.`, 'fail');
    }
    busy = false;
  }

  async function crearPod() {
    if (busy || pod || !pvc) return; busy = true;
    if (mode === 'dinamico') {
      pod = { name: podName, node: '', status: 'Pending' };
      if (pvc.phase === 'Pending') {
        await wait(500);
        pod = { ...pod, node: 'kcna-worker2', status: 'ContainerCreating' };
        say('El scheduler eligió kcna-worker2 para el pod. Ahora el aprovisionador (local-path) crea el volumen en ese nodo…', 'warn');
        await wait(800);
        if (pvc.mode === 'RWX') {
          pvc = { ...pvc, reason: 'ProvisioningFailed: local-path only supports ReadWriteOnce' };
          say('ProvisioningFailed: pediste ReadWriteMany y el aprovisionador local-path solo soporta ReadWriteOnce. Los access modes son lo que el almacenamiento soporta; pedir RWX a una clase de disco local deja el PVC en Pending y el pod en ContainerCreating. Cambia a RWO y reinicia.', 'fail');
          busy = false; return;
        }
        if (pv && pv.phase === 'Available' && pv.sc === 'standard' && mib(pv.cap) >= mib(pvc.size)) {
          pv = { ...pv, phase: 'Bound', claimRef: 'lab-08/datos' };
          pvc = { ...pvc, phase: 'Bound', reason: '' };
          await wait(400);
          pod = { ...pod, status: 'Running' };
          say(`No hizo falta aprovisionar: ya existía un PV Available de la clase standard que encaja, así que el controlador lo enlazó al PVC y el pod ve ${data.length === 1 ? 'el registro antiguo' : `los ${data.length} registros antiguos`}. Así se reutiliza un volumen Retain después de quitarle el claimRef.`, 'ok');
        } else {
          const hadReleased = pv?.phase === 'Released';
          pv = { name: DYN_PV, phase: 'Bound', reclaim: 'Delete', claimRef: 'lab-08/datos', cap: pvc.size, mode: 'RWO', sc: 'standard', node: 'kcna-worker2', path: `/var/local-path-provisioner/${DYN_PV}_lab-08_datos` };
          data = [];
          pvc = { ...pvc, phase: 'Bound', reason: '' };
          await wait(400);
          pod = { ...pod, status: 'Running' };
          say(`El aprovisionador creó el PV ${DYN_PV.slice(0, 12)}… con la reclaimPolicy de la clase (Delete), lo enlazó al PVC y el pod arrancó. El PV lleva nodeAffinity hacia kcna-worker2: cualquier pod que use este PVC irá siempre a ese nodo.${hadReleased ? ' El PV Released anterior sigue existiendo con sus datos (fuera de la escena): un PVC nuevo nunca se enlaza solo a un PV Released.' : ''}`, 'ok');
        }
      } else {
        pod = { ...pod, node: pv?.node ?? 'kcna-worker2', status: 'ContainerCreating' };
        await wait(500);
        pod = { ...pod, status: 'Running' };
        say(`El PVC ya estaba Bound, así que el pod solo tuvo que montar el volumen. Fue a ${pod.node} por la nodeAffinity del PV${data.length ? ` y encuentra ${data.length} línea${data.length === 1 ? '' : 's'} en /data/pedidos.txt: los datos sobrevivieron al pod anterior` : ''}.`, 'ok');
      }
    } else {
      pod = { name: podName, node: '', status: 'Pending' };
      await wait(500);
      if (pvc.phase !== 'Bound') {
        say('El pod se queda Pending: "pod has unbound immediate PersistentVolumeClaims". Con binding Immediate el scheduler no programa un pod cuyo PVC no está Bound.', 'fail');
        busy = false; return;
      }
      pod = { ...pod, node: 'kcna-worker', status: 'ContainerCreating' };
      await wait(500);
      pod = { ...pod, status: 'Running' };
      say(`El pod fue a kcna-worker por la nodeAffinity del PV y montó la carpeta /tmp/lab-08-pv del nodo${data.length ? `; encuentra ${data.length} línea${data.length === 1 ? '' : 's'} escritas por el pod anterior` : ''}. Con hostPath el nodo queda expuesto: podman exec kcna-worker ls /tmp/lab-08-pv muestra los archivos.`, 'ok');
    }
    busy = false;
  }

  function escribir() {
    if (!pod || pod.status !== 'Running') return;
    pedidos += 1;
    const cafes = 1 + Math.floor(Math.random() * 4);
    data = [...data, `pedido ${pedidos}: ${cafes} caf${cafes === 1 ? 'e' : 'es'}`];
    say(`kubectl exec ${pod.name} -- sh -c 'echo … >> /data/pedidos.txt'. El archivo vive en el volumen (${pv?.path ?? ''} en ${pv?.node ?? ''}), no en la capa escribible del contenedor.`);
  }

  const lineas = (k: number) => `${k} línea${k === 1 ? '' : 's'}`;

  async function borrarPod() {
    if (busy || !pod) return; busy = true;
    const n = pod.name; pod = null;
    await wait(300);
    if (pvc?.phase === 'Terminating') { await deletePvc(`kubectl delete pod ${n}. Sin pods que lo usen, el finalizer pvc-protection se retira y el PVC Terminating desaparece. `); busy = false; return; }
    if (pvc?.phase === 'Bound') say(`kubectl delete pod ${n}. El PVC sigue Bound sin ningún pod y el PV conserva ${lineas(data.length)}. Esa es la diferencia con emptyDir: el volumen persistente no depende del pod. Vuelve a crear el pod para comprobarlo.`, 'warn');
    else say(`kubectl delete pod ${n}. El PVC sigue ${pvc?.phase ?? 'sin existir'}; como nunca llegó a enlazarse, el almacenamiento no cambia.`, 'warn');
    busy = false;
  }

  /** borra el PVC y aplica la reclaim policy del PV al que estaba enlazado */
  async function deletePvc(prefix: string) {
    if (!pvc) return;
    const wasBound = !!pv && pv.claimRef === `lab-08/${pvc.name}`;
    const r = pv?.reclaim; pvc = null;
    await wait(400);
    if (!pv || !wasBound) { say(`${prefix}PVC borrado. No estaba enlazado a ningún PV, así que nada más cambia.`); return; }
    if (r === 'Delete') {
      pv = null; data = [];
      say(`${prefix}reclaimPolicy Delete: al borrar el PVC se borran el PV y el almacenamiento real (la carpeta del nodo). Los datos se perdieron. Es el valor por defecto de una StorageClass; si quieres conservar datos, cambia la política del PV a Retain antes de borrar el PVC.`, 'fail');
    } else {
      pv = { ...pv, phase: 'Released' };
      say(`${prefix}reclaimPolicy Retain: el PV queda Released y conserva los datos (${lineas(data.length)} en ${pv.path}). Sigue recordando a su antiguo PVC en spec.claimRef, por eso no se reasigna solo: un PVC nuevo igual se quedará Pending hasta que un administrador quite esa referencia.`, 'warn');
    }
  }

  async function borrarPvc() {
    if (busy || !pvc) return; busy = true;
    if (pod) {
      pvc = { ...pvc, phase: 'Terminating' };
      say('El PVC pasa a Terminating pero no desaparece: el finalizer kubernetes.io/pvc-protection impide borrar un PVC mientras un pod lo use. Borra el pod y el borrado se completará solo.', 'warn');
      busy = false; return;
    }
    await deletePvc('');
    busy = false;
  }

  function patchReclaim() {
    if (!pv || busy) return;
    const next: Reclaim = pv.reclaim === 'Delete' ? 'Retain' : 'Delete';
    pv = { ...pv, reclaim: next };
    say(`kubectl patch pv ${pv.name} -p '{"spec":{"persistentVolumeReclaimPolicy":"${next}"}}'. Ahora, al borrar el PVC, ${next === 'Retain' ? 'el PV pasará a Released y los datos se conservarán' : 'el PV y los datos se borrarán'}.`);
  }

  async function quitarClaimRef() {
    if (!pv || pv.phase !== 'Released' || busy) return; busy = true;
    pv = { ...pv, phase: 'Available', claimRef: null };
    const cmd = `kubectl patch pv ${pv.name} --type=json -p '[{"op":"remove","path":"/spec/claimRef"}]'.`;
    if (pvc && pvc.phase === 'Pending') {
      await wait(500);
      if (mode === 'estatico' && tryBind()) say(`${cmd} El PV volvió a Available y el PVC Pending encajaba: el controlador los enlazó al momento (binding Immediate). El pod nuevo verá los datos antiguos.`, 'ok');
      else if (mode === 'dinamico') say(`${cmd} El PV vuelve a Available con sus datos, pero el PVC sigue Pending: con WaitForFirstConsumer el binding espera a que un pod lo use. Crea el pod y se enlazará a este PV en vez de aprovisionar uno nuevo.`, 'warn');
      else say(`${cmd} El PV vuelve a Available, pero el PVC no encaja (${pvc?.reason ?? ''}).`, 'warn');
    } else {
      say(`${cmd} El PV vuelve a Available con sus datos intactos. Crea un PVC que encaje (misma clase, access mode y tamaño menor o igual) y se enlazará.`, 'ok');
    }
    busy = false;
  }

  const kubectl = $derived.by(() => {
    const lines: string[] = [];
    lines.push('NAME                              STATUS        VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS');
    if (pvc) lines.push(`persistentvolumeclaim/${pvc.name.padEnd(12)}  ${pvc.phase.padEnd(12)}  ${(pvc.phase === 'Pending' ? '' : pv?.name ?? '').padEnd(41)}  ${(pvc.phase === 'Pending' ? '' : pv?.cap ?? '').padEnd(8)}   ${(pvc.phase === 'Pending' ? '' : pvc.mode).padEnd(12)}   ${pvc.sc}`);
    else lines.push('No resources found in lab-08 namespace.');
    lines.push('');
    lines.push('NAME                                                        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM                 STORAGECLASS');
    if (pv) lines.push(`persistentvolume/${pv.name.padEnd(41)}   ${pv.cap.padEnd(8)}   ${pv.mode.padEnd(12)}   ${pv.reclaim.padEnd(14)}   ${pv.phase.padEnd(9)}   ${(pv.claimRef ?? '').padEnd(20)}  ${pv.sc}`);
    else lines.push('No resources found');
    return lines.join('\n');
  });

  const canPod = $derived(!!pvc && !pod && pvc.phase !== 'Terminating');
</script>

<div class="pvcsim">
  <div class="controls" role="group" aria-label="Modo de aprovisionamiento">
    <button type="button" class="btn small" class:primary={mode === 'dinamico'} aria-pressed={mode === 'dinamico'} onclick={() => setMode('dinamico')} disabled={busy}>Dinámico: StorageClass standard</button>
    <button type="button" class="btn small" class:primary={mode === 'estatico'} aria-pressed={mode === 'estatico'} onclick={() => setMode('estatico')} disabled={busy}>Estático: PV hostPath a mano</button>
    <button type="button" class="btn small" onclick={reset} disabled={busy}>Reiniciar</button>
  </div>

  <div class="sc mono">
    {#if mode === 'dinamico'}StorageClass standard (default) · rancher.io/local-path · reclaimPolicy Delete · WaitForFirstConsumer · allowVolumeExpansion false{:else}StorageClass lab-08-manual · kubernetes.io/no-provisioner · reclaimPolicy Retain · Immediate{/if}
  </div>

  <div class="scene">
    <div class="card pod" class:empty={!pod} class:running={pod?.status === 'Running'}>
      <span class="k">Pod <small>namespace lab-08</small></span>
      {#if pod}
        <strong class="mono">{pod.name}</strong>
        <span class="st {pod.status}">{pod.status}{pod.node ? ` · ${pod.node}` : ''}</span>
        <span class="sub mono">volumes: persistentVolumeClaim.claimName: {pvc?.name}</span>
      {:else}
        <span class="sub">ningún pod</span>
      {/if}
    </div>
    <div class="arrow" class:on={!!pod && !!pvc} aria-hidden="true"><span>claimName</span></div>
    <div class="card pvc" class:empty={!pvc} class:bound={pvc?.phase === 'Bound'} class:pending={pvc?.phase === 'Pending'}>
      <span class="k">PVC <small>namespace lab-08</small></span>
      {#if pvc}
        <strong class="mono">{pvc.name}</strong>
        <span class="st {pvc.phase}">{pvc.phase}</span>
        <span class="sub mono">{pvc.size} · {pvc.mode} · {pvc.sc}</span>
        {#if pvc.reason}<span class="sub reason">{pvc.reason}</span>{/if}
      {:else}
        <span class="sub">sin PVC</span>
      {/if}
    </div>
    <div class="arrow" class:on={pvc?.phase === 'Bound' && pv?.phase === 'Bound'} aria-hidden="true"><span>binding 1:1</span></div>
    <div class="card pv" class:empty={!pv} class:bound={pv?.phase === 'Bound'} class:released={pv?.phase === 'Released'} class:available={pv?.phase === 'Available'}>
      <span class="k">PV <small>cluster-scoped</small></span>
      {#if pv}
        <strong class="mono" title={pv.name}>{pv.name.length > 22 ? pv.name.slice(0, 20) + '…' : pv.name}</strong>
        <span class="st {pv.phase}">{pv.phase} · {pv.reclaim}</span>
        <span class="sub mono">{pv.cap} · {pv.mode} · {pv.node}</span>
        {#if pv.claimRef}<span class="sub mono">claimRef: {pv.claimRef}</span>{/if}
        <div class="datos">
          <span class="sub mono">{pv.path.length > 30 ? '…' + pv.path.slice(-28) : pv.path}/pedidos.txt</span>
          {#if data.length}
            <ul class="mono">{#each data as d, i (i)}<li>{d}</li>{/each}</ul>
          {:else}
            <span class="sub">(vacío)</span>
          {/if}
        </div>
      {:else}
        <span class="sub">{mode === 'dinamico' ? 'todavía no existe: lo creará el aprovisionador' : 'sin PV'}</span>
      {/if}
    </div>
  </div>

  <div class="controls pasos">
    <label>PVC pide
      <select bind:value={reqSize} disabled={!!pvc || busy}><option value="100Mi">100Mi</option><option value="500Mi">500Mi</option></select>
      <select bind:value={reqMode} disabled={!!pvc || busy}><option value="RWO">ReadWriteOnce</option><option value="RWX">ReadWriteMany</option></select>
    </label>
    <button type="button" class="btn small primary" onclick={crearPvc} disabled={busy || !!pvc}>Crear PVC</button>
    <button type="button" class="btn small primary" onclick={crearPod} disabled={busy || !canPod}>{data.length && !pod ? 'Recrear pod' : 'Crear pod que lo monta'}</button>
    <button type="button" class="btn small" onclick={escribir} disabled={busy || pod?.status !== 'Running'}>Escribir datos</button>
    <button type="button" class="btn small" onclick={borrarPod} disabled={busy || !pod}>Borrar pod</button>
    <button type="button" class="btn small" onclick={borrarPvc} disabled={busy || !pvc}>Borrar PVC</button>
    <button type="button" class="btn small" onclick={patchReclaim} disabled={busy || !pv}>reclaimPolicy a {pv?.reclaim === 'Retain' ? 'Delete' : 'Retain'}</button>
    {#if pv?.phase === 'Released'}<button type="button" class="btn small" onclick={quitarClaimRef} disabled={busy}>Quitar claimRef del PV</button>{/if}
  </div>

  <div class="explain" class:ok={tone === 'ok'} class:warn={tone === 'warn'} class:fail={tone === 'fail'} aria-live="polite">{step}</div>

  <div>
    <p class="hint mono">$ kubectl get pvc,pv -n lab-08</p>
    <pre>{kubectl}</pre>
  </div>
</div>

<style>
  .pvcsim { display: grid; gap: 12px; }
  .sc { font-size: 0.78rem; color: var(--ink-2); padding: 6px 10px; border: 1px dashed var(--line); border-radius: var(--r-s); }
  .scene { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 6px; align-items: stretch; }
  .card { border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); padding: 10px 12px; display: grid; gap: 4px; align-content: start; min-width: 0; transition: border-color var(--dur), background var(--dur); font-size: 0.85rem; }
  .card.empty { border-style: dashed; }
  .card .k { font-size: 0.78rem; color: var(--ink-2); font-weight: 500; }
  .card .k small { color: var(--ink-3); font-weight: 400; margin-left: 4px; }
  .card strong { font-size: 0.86rem; word-break: break-all; }
  .card .sub { font-size: 0.74rem; color: var(--ink-3); word-break: break-word; }
  .card .reason { color: var(--wait); }
  .st { font-size: 0.78rem; font-weight: 600; }
  .st.Running, .st.Bound { color: var(--ready); }
  .st.Pending, .st.ContainerCreating, .st.Released, .st.Terminating { color: var(--wait); }
  .st.Available { color: var(--helm); }
  .card.running, .card.bound { border-color: var(--ready); }
  .card.pending { border-color: var(--wait); }
  .card.released { border-color: var(--wait); background: var(--wait-2); }
  .card.available { border-color: var(--helm); }
  .datos { margin-top: 4px; padding-top: 6px; border-top: 1px dashed var(--line); display: grid; gap: 2px; }
  .datos ul { margin: 0; padding-left: 1.1em; font-size: 0.74rem; color: var(--ink-2); }
  .arrow { display: flex; align-items: center; justify-content: center; position: relative; min-width: 56px; color: var(--ink-3); opacity: 0.35; transition: opacity var(--dur), color var(--dur); }
  .arrow::before { content: ''; position: absolute; left: 4px; right: 4px; top: 50%; border-top: 2px dashed currentColor; }
  .arrow span { position: relative; background: var(--panel); padding: 0 4px; font-size: 0.66rem; font-family: var(--mono); }
  .arrow.on { opacity: 1; color: var(--ready); }
  .arrow.on::before { border-top-style: solid; }
  .pasos { margin-bottom: 0; }
  .pasos label { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .explain { margin-top: 0; }
  @media (max-width: 640px) {
    .scene { grid-template-columns: 1fr; }
    .arrow { min-height: 28px; }
    .arrow::before { left: 50%; right: auto; top: 2px; bottom: 2px; border-top: 0; border-left: 2px dashed currentColor; }
    .arrow.on::before { border-left-style: solid; }
  }
</style>
