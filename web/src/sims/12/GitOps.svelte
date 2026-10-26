<script lang="ts">
  // El bucle GitOps: Git (estado deseado) → agente (Argo CD) que compara y reconcilia → clúster (estado real).
  // Los nombres y valores son los del lab: Application gitops-demo, repo app.git, Deployment gitops-web (2 réplicas), Service y ConfigMap gitops-config.
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { wait } from '../../lib/motion';
  import { untrack } from 'svelte';

  const nodes: NodeSpec[] = [
    { name: 'kcna-worker', role: 'worker' },
    { name: 'kcna-worker2', role: 'worker' },
  ];

  interface Commit { sha: string; msg: string }
  interface Desired { replicas: number; service: boolean; configmap: boolean }

  // --- Git: estado deseado ---
  let commits = $state<Commit[]>([{ sha: '876dd25', msg: 'Commit inicial: gitops-web con 2 replicas' }]);
  let repo = $state<Desired>({ replicas: 2, service: true, configmap: true });
  const head = $derived(commits[0].sha);

  // --- Clúster: estado real ---
  let pods = $state<PodSpec[]>([]);
  let liveReplicas = $state(2);     // spec.replicas del Deployment en el clúster
  let liveService = $state(true);
  let liveConfigMap = $state(true);
  let seq = 0;

  // --- Agente (Argo CD) ---
  let selfHeal = $state(true);
  let prune = $state(true);
  let syncedRev = $state('876dd25'); // última revisión de Git aplicada
  let paused = $state(false);
  let checking = $state(false);
  let syncing = $state(false);
  let events = $state<string[]>(['Application gitops-demo creada: sync automático']);
  let explain = $state('Argo CD vigila el repo app.git cada pocos segundos (en el lab, cada ~3 minutos o al pulsar Refresh). Si el clúster difiere de Git, lo corrige. Prueba a cambiar Git o el clúster y mira quién gana.');
  let tone = $state<'' | 'ok' | 'warn' | 'fail'>('');
  let showPushPull = $state(false);

  const sha = () => Math.random().toString(16).slice(2, 9);
  function say(s: string) { events = [s, ...events].slice(0, 6); }

  // Diferencias entre Git y el clúster
  const diffs = $derived.by(() => {
    const d: string[] = [];
    if (liveReplicas !== repo.replicas) d.push(`Deployment gitops-web: replicas ${liveReplicas} en el clúster, ${repo.replicas} en Git`);
    if (!liveService && repo.service) d.push('Service gitops-web: falta en el clúster');
    if (liveConfigMap && !repo.configmap) d.push('ConfigMap gitops-config: está en el clúster pero ya no en Git (requiere prune)');
    if (!liveConfigMap && repo.configmap) d.push('ConfigMap gitops-config: falta en el clúster');
    return d;
  });
  const syncStatus = $derived(diffs.length === 0 ? 'Synced' : 'OutOfSync');
  const running = $derived(pods.filter((p) => p.status === 'Running').length);
  const health = $derived(syncing || running !== liveReplicas || pods.some((p) => p.status !== 'Running') ? 'Progressing' : 'Healthy');

  // El Deployment del clúster mantiene sus réplicas (eso lo hace Kubernetes, no Argo CD)
  let settling = false;
  async function settlePods() {
    if (settling) return; settling = true;
    const live = () => pods.filter((p) => p.status !== 'Terminating');
    while (live().length < liveReplicas) {
      const id = `p${++seq}`;
      const node = pods.filter((p) => p.node === 'kcna-worker').length <= pods.filter((p) => p.node === 'kcna-worker2').length ? 'kcna-worker' : 'kcna-worker2';
      pods = [...pods, { id, name: `gitops-web-${Math.random().toString(36).slice(2, 7)}`, node, status: 'ContainerCreating' }];
      await wait(500);
      pods = pods.map((p) => (p.id === id ? { ...p, status: 'Running' } : p));
    }
    while (live().length > liveReplicas) {
      const v = live().at(-1)!;
      pods = pods.map((p) => (p.id === v.id ? { ...p, status: 'Terminating' } : p));
      await wait(450);
      pods = pods.filter((p) => p.id !== v.id);
    }
    settling = false;
    if (live().length !== liveReplicas) settlePods();
  }

  // Sync: aplica lo que hay en Git al clúster. Solo borra huérfanos si prune está activo.
  async function sync(reason: string) {
    if (syncing) return;
    syncing = true;
    say(`OperationStarted: ${reason} a '${head}'`);
    await wait(500);
    if (liveReplicas !== repo.replicas) { liveReplicas = repo.replicas; settlePods(); }
    if (!liveService && repo.service) liveService = true;
    if (!liveConfigMap && repo.configmap) liveConfigMap = true;
    if (liveConfigMap && !repo.configmap) {
      if (prune) { liveConfigMap = false; say('Pruned: configmap/gitops-config'); }
      else say('Skipped: configmap/gitops-config requiere prune');
    }
    syncedRev = head;
    await wait(400);
    syncing = false;
    say(`OperationCompleted: sync a ${head} ${diffs.length ? 'parcial (quedan diferencias)' : 'completado'}`);
    say(diffs.length ? 'ResourceUpdated: sync status sigue OutOfSync' : 'ResourceUpdated: OutOfSync -> Synced');
  }

  // Una vuelta del bucle de reconciliación: observar, comparar, actuar
  async function reconcile(forced = false) {
    if (checking || syncing) return;
    checking = true;
    await wait(forced ? 200 : 600);
    const gitChanged = syncedRev !== head;
    const orphan = () => liveConfigMap && !repo.configmap && !prune;
    if (diffs.length === 0) {
      if (gitChanged) syncedRev = head;
    } else if (gitChanged) {
      await sync('sync automático');
      if (orphan()) {
        explain = 'Git cambió y Argo CD sincronizó, pero no borra nada sin prune: el ConfigMap gitops-config queda huérfano en el clúster y la app sigue OutOfSync. Activa prune y vuelve a sincronizar para que lo elimine.';
        tone = 'warn';
      } else {
        explain = 'Git cambió: la Application tiene sync automático, así que Argo CD aplicó la nueva revisión sin que nadie ejecutara kubectl.';
        tone = 'ok';
      }
    } else if (diffs.length === 1 && orphan()) {
      // Un recurso huérfano no dispara selfHeal: solo se borra con prune
    } else if (selfHeal) {
      await sync('selfHeal');
      explain = 'Alguien cambió el clúster a mano (drift). Como selfHeal está activo, Argo CD devolvió el clúster al estado que dice Git. Argo CD nunca escribe en Git: siempre corrige el clúster.';
      tone = 'ok';
    } else {
      explain = 'Hay drift y selfHeal está apagado: Argo CD solo avisa (OutOfSync) y espera a que alguien pulse Sync o a que llegue un commit nuevo. Mientras tanto el clúster no coincide con Git.';
      tone = 'warn';
    }
    checking = false;
  }

  $effect(() => {
    untrack(() => settlePods());
    const t = setInterval(() => { if (!paused) reconcile(); }, 3000);
    return () => clearInterval(t);
  });

  // --- Acciones del alumno ---
  function commitReplicas() {
    const next = repo.replicas === 2 ? 3 : 2;
    repo = { ...repo, replicas: next };
    commits = [{ sha: sha(), msg: `Deja gitops-web con ${next} replicas` }, ...commits];
    say('ResourceUpdated: Synced -> OutOfSync (nueva revisión en Git)');
    explain = `Nuevo commit en main: deployment.yaml ahora dice replicas: ${next}. En la siguiente comprobación el agente verá que el clúster está OutOfSync y sincronizará.`;
    tone = '';
  }
  function scaleManual() {
    liveReplicas = 5; settlePods();
    say('ResourceUpdated: Synced -> OutOfSync (drift: replicas 5)');
    explain = `kubectl scale deploy gitops-web --replicas=5 cambió el clúster, pero Git sigue diciendo ${repo.replicas}. Eso es drift. ${selfHeal ? 'Con selfHeal, Argo CD lo revertirá en la próxima vuelta.' : 'Sin selfHeal quedará OutOfSync hasta un Sync manual.'}`;
    tone = 'warn';
  }
  function deleteService() {
    liveService = false;
    say('ResourceUpdated: Synced -> OutOfSync (falta service/gitops-web)');
    explain = `kubectl delete svc gitops-web borró el Service del clúster. Git sigue declarándolo, así que para Argo CD falta un recurso. ${selfHeal ? 'Lo recreará (con otra ClusterIP: es un objeto nuevo).' : 'Sin selfHeal, espera un Sync manual.'}`;
    tone = 'warn';
  }
  function toggleConfigMapInRepo() {
    if (repo.configmap) {
      repo = { ...repo, configmap: false };
      commits = [{ sha: sha(), msg: 'git rm configmap.yaml' }, ...commits];
      explain = `El ConfigMap gitops-config desapareció de Git. ${prune ? 'Con prune activo, Argo CD lo borrará del clúster al sincronizar.' : 'Sin prune, Argo CD no borra nada: el ConfigMap queda huérfano en el clúster y la app se queda OutOfSync.'}`;
    } else {
      repo = { ...repo, configmap: true };
      commits = [{ sha: sha(), msg: 'Reto: ConfigMap gitops-config (entorno: lab)' }, ...commits];
      explain = 'configmap.yaml vuelve al repo: en la siguiente sincronización Argo CD creará el ConfigMap gitops-config en lab-12.';
    }
    say('ResourceUpdated: Synced -> OutOfSync (nueva revisión en Git)');
    tone = '';
  }
  function manualSync() {
    sync('sync manual');
    explain = prune || repo.configmap || !liveConfigMap
      ? 'Sync manual: es el botón Sync de la UI de Argo CD. Aplica el estado de Git al clúster aunque selfHeal esté apagado.'
      : 'Sync manual sin prune: Argo CD aplica lo que hay en Git pero no borra el ConfigMap huérfano. Seguirá OutOfSync hasta que actives prune.';
    tone = 'ok';
  }
</script>

<div class="gitops">
  <div class="controls">
    <button type="button" class="btn small primary" onclick={commitReplicas} disabled={syncing}>Commit: replicas {repo.replicas} a {repo.replicas === 2 ? 3 : 2}</button>
    <button type="button" class="btn small" onclick={scaleManual} disabled={liveReplicas === 5}>kubectl scale --replicas=5 a mano</button>
    <button type="button" class="btn small" onclick={deleteService} disabled={!liveService}>kubectl delete svc gitops-web</button>
    <button type="button" class="btn small" onclick={toggleConfigMapInRepo} disabled={syncing}>{repo.configmap ? 'Quitar el ConfigMap del repo' : 'Devolver el ConfigMap al repo'}</button>
  </div>
  <div class="controls policy">
    <label class="tog"><input type="checkbox" bind:checked={selfHeal} /> <span class="mono">selfHeal</span></label>
    <label class="tog"><input type="checkbox" bind:checked={prune} /> <span class="mono">prune</span></label>
    <button type="button" class="btn small" onclick={() => (paused = !paused)}>{paused ? 'Reanudar el bucle' : 'Pausar el bucle'}</button>
    <button type="button" class="btn small" onclick={() => reconcile(true)} disabled={checking || syncing}>Refresh ahora</button>
    <button type="button" class="btn small" onclick={manualSync} disabled={syncing || syncStatus === 'Synced'}>Sync manual</button>
    <button type="button" class="btn small" onclick={() => (showPushPull = !showPushPull)} aria-expanded={showPushPull}>{showPushPull ? 'Ocultar push vs pull' : 'Ver push vs pull'}</button>
  </div>

  {#if showPushPull}
    <div class="pushpull" role="group" aria-label="Modelo push frente a modelo pull">
      <div class="model">
        <h4>Modelo push</h4>
        <div class="flow">
          <span class="box">Git</span><span class="arrow" aria-hidden="true"></span>
          <span class="box warn">Pipeline CI<br /><small>guarda el kubeconfig del clúster</small></span><span class="arrow" aria-hidden="true"></span>
          <span class="box">Clúster</span>
        </div>
        <p class="hint">El pipeline externo ejecuta <span class="mono">kubectl apply</span>: necesita credenciales del clúster y acceso a su API. Aplica y se olvida: no detecta drift.</p>
      </div>
      <div class="model">
        <h4>Modelo pull (GitOps)</h4>
        <div class="flow">
          <span class="box">Git</span><span class="arrow back" aria-hidden="true"></span>
          <span class="box ok">Agente dentro del clúster<br /><small>Argo CD / Flux: solo lee Git</small></span><span class="arrow" aria-hidden="true"></span>
          <span class="box">Clúster</span>
        </div>
        <p class="hint">El agente clona el repo y aplica desde dentro. Las credenciales no salen del clúster, solo hace falta salida hacia Git y reconcilia de forma continua.</p>
      </div>
    </div>
  {/if}

  <div class="scene">
    <section class="panel repo" aria-label="Repositorio Git app.git">
      <header><span class="mono">app.git</span> <span class="sub">rama main · estado deseado</span></header>
      <ul class="files">
        <li class="mono"><span>deployment.yaml</span><em>replicas: {repo.replicas}</em></li>
        <li class="mono"><span>service.yaml</span><em>gitops-web :80</em></li>
        {#if repo.configmap}<li class="mono"><span>configmap.yaml</span><em>entorno: lab</em></li>{/if}
      </ul>
      <ol class="commits" aria-label="Commits">
        {#each commits.slice(0, 4) as c, k (c.sha)}
          <li class:head={k === 0}><span class="mono sha">{c.sha}</span> <span>{c.msg}</span></li>
        {/each}
      </ol>
    </section>

    <section class="panel agent" class:busy={checking || syncing} aria-label="Agente Argo CD">
      <header><span>Argo CD</span> <span class="sub mono">Application gitops-demo</span></header>
      <div class="statuses">
        <span class="st" class:ok={syncStatus === 'Synced'} class:bad={syncStatus === 'OutOfSync'}><i aria-hidden="true"></i>{syncStatus}</span>
        <span class="st" class:ok={health === 'Healthy'} class:prog={health === 'Progressing'}><i aria-hidden="true"></i>{health}</span>
      </div>
      <p class="loop" aria-live="polite">
        {#if syncing}Sincronizando…{:else if checking}Comparando Git con el clúster…{:else if paused}Bucle en pausa{:else}Reconcilia cada 3 s · revisión aplicada <span class="mono">{syncedRev}</span>{/if}
      </p>
      {#if diffs.length}
        <ul class="diffs">{#each diffs as d}<li>{d}</li>{/each}</ul>
      {:else}
        <p class="hint">El clúster coincide con Git.</p>
      {/if}
    </section>
  </div>

  <section class="panel cluster" aria-label="Clúster, namespace lab-12">
    <header><span>Clúster</span> <span class="sub mono">namespace lab-12 · estado real</span></header>
    <div class="resources">
      <span class="res mono"><b>deploy/gitops-web</b> replicas {liveReplicas} · ready {running}</span>
      <span class="res mono" class:missing={!liveService}><b>svc/gitops-web</b> {liveService ? 'ClusterIP' : 'no existe'}</span>
      <span class="res mono" class:missing={!liveConfigMap} class:orphan={liveConfigMap && !repo.configmap}><b>cm/gitops-config</b> {liveConfigMap ? (repo.configmap ? 'entorno=lab' : 'huérfano') : 'no existe'}</span>
    </div>
    <ClusterCanvas {nodes} {pods} pendingTray={false} showLabels={false} compact />
  </section>

  <ol class="events mono" aria-label="Eventos de la Application">
    {#each events as e, k}<li style={`opacity:${1 - k * 0.15}`}>{e}</li>{/each}
  </ol>

  <div class="explain {tone}" aria-live="polite">{explain}</div>
</div>

<style>
  .gitops { display: grid; gap: 12px; }
  .policy { margin-bottom: 0; }
  .tog { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
  .tog input { accent-color: var(--helm); width: 16px; height: 16px; margin: 0; }
  .scene { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 12px; }
  .panel { background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--r-m); padding: 10px 12px; display: grid; gap: 8px; align-content: start; }
  .panel header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-weight: 600; font-size: 0.92rem; }
  .sub { font-weight: 400; color: var(--ink-3); font-size: 0.78rem; }
  .files { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
  .files li { display: flex; justify-content: space-between; gap: 8px; font-size: 0.8rem; padding: 3px 8px; background: var(--panel); border: 1px solid var(--line-2); border-radius: 4px; }
  .files em { font-style: normal; color: var(--helm-ink); }
  .commits { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font-size: 0.8rem; color: var(--ink-2); border-top: 1px dashed var(--line); padding-top: 6px; }
  .commits li { display: flex; gap: 8px; align-items: baseline; }
  .commits li.head { color: var(--ink); font-weight: 500; }
  .sha { color: var(--wait); flex: none; }
  .agent { border-style: dashed; transition: border-color var(--dur), box-shadow var(--dur); }
  .agent.busy { border-color: var(--helm); box-shadow: 0 0 0 3px var(--helm-2); }
  .statuses { display: flex; flex-wrap: wrap; gap: 6px; }
  .st { display: inline-flex; align-items: center; gap: 6px; font: 500 0.82rem var(--mono); padding: 2px 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); }
  .st i { width: 9px; height: 9px; border-radius: 50%; background: var(--ink-3); }
  .st.ok { border-color: var(--ready); color: var(--ready); } .st.ok i { background: var(--ready); }
  .st.bad { border-color: var(--wait); color: var(--wait); } .st.bad i { background: var(--wait); }
  .st.prog { border-color: var(--helm); color: var(--helm-ink); } .st.prog i { background: var(--helm); animation: pulse 1.1s ease-in-out infinite; }
  .loop { font-size: 0.82rem; color: var(--ink-2); }
  .diffs { margin: 0; padding-left: 18px; font-size: 0.8rem; color: var(--wait); display: grid; gap: 2px; }
  .resources { display: flex; flex-wrap: wrap; gap: 6px; }
  .res { font-size: 0.76rem; padding: 2px 8px; border-radius: 4px; background: var(--panel); border: 1px solid var(--line-2); color: var(--ink-2); }
  .res b { font-weight: 500; color: var(--ink); }
  .res.missing { border-color: var(--fail); color: var(--fail); border-style: dashed; }
  .res.orphan { border-color: var(--wait); color: var(--wait); }
  .events { list-style: none; margin: 0; padding: 0; font-size: 0.78rem; color: var(--ink-2); display: grid; gap: 2px; min-height: 3.2em; }
  .pushpull { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
  .model { border: 1px solid var(--line); border-radius: var(--r-m); padding: 10px 12px; background: var(--panel-2); display: grid; gap: 8px; }
  .model h4 { font-size: 0.92rem; }
  .flow { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  .box { font-size: 0.8rem; padding: 6px 10px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel); text-align: center; line-height: 1.25; }
  .box small { color: var(--ink-3); font-size: 0.7rem; }
  .box.warn { border-color: var(--fail); } .box.ok { border-color: var(--ready); }
  .arrow { width: 18px; height: 2px; background: var(--ink-3); position: relative; flex: none; }
  .arrow::after { content: ''; position: absolute; right: -1px; top: -4px; border: 5px solid transparent; border-left-color: var(--ink-3); border-right: 0; }
  .arrow.back::after { right: auto; left: -1px; border-left: 0; border-right: 5px solid var(--ink-3); }
  @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.6; } }
  @media (max-width: 600px) { .scene { grid-template-columns: 1fr; } }
</style>
