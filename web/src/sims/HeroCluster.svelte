<script lang="ts">
  // Portada: un clúster vivo que reconcilia solo. Un pod muere, el controlador lo repone; el usuario puede escalar y romper cosas.
  import ClusterCanvas, { type PodSpec, type NodeSpec } from './ClusterCanvas.svelte';
  import { wait } from '../lib/motion';

  const nodes: NodeSpec[] = [
    { name: 'kcna-control-plane', role: 'control-plane' },
    { name: 'kcna-worker', role: 'worker', labels: { disktype: 'ssd' } },
    { name: 'kcna-worker2', role: 'worker', labels: { disktype: 'hdd' } },
  ];
  let pods = $state<PodSpec[]>([]);
  let desired = $state(3);
  let seq = 0;
  let log = $state<string[]>([]);
  let busy = false;

  const workers = ['kcna-worker', 'kcna-worker2'];
  const nameOf = () => `web-${Math.random().toString(36).slice(2, 7)}`;
  function say(s: string) { log = [s, ...log].slice(0, 4); }
  function leastLoaded() { return workers.sort((a, b) => pods.filter((p) => p.node === a).length - pods.filter((p) => p.node === b).length)[0]; }

  // El bucle de reconciliación: compara deseado vs real y actúa
  async function reconcile() {
    if (busy) return; busy = true;
    const live = () => pods.filter((p) => p.status !== 'Terminating' && p.status !== 'Failed');
    while (live().length < desired) {
      const id = `p${++seq}`;
      const node = leastLoaded();
      pods = [...pods, { id, name: nameOf(), node, status: 'ContainerCreating' }];
      say(`ReplicaSet: faltan réplicas, crea ${pods.at(-1)!.name} en ${node}`);
      await wait(700);
      pods = pods.map((p) => (p.id === id ? { ...p, status: 'Running' } : p));
    }
    while (live().length > desired) {
      const victim = live().at(-1)!;
      pods = pods.map((p) => (p.id === victim.id ? { ...p, status: 'Terminating' } : p));
      say(`ReplicaSet: sobran réplicas, termina ${victim.name}`);
      await wait(600);
      pods = pods.filter((p) => p.id !== victim.id);
    }
    busy = false;
  }

  async function kill() {
    const v = pods.find((p) => p.status === 'Running');
    if (!v) return;
    pods = pods.map((p) => (p.id === v.id ? { ...p, status: 'Failed' } : p));
    say(`${v.name} falló: estado real ≠ deseado`);
    await wait(900);
    pods = pods.filter((p) => p.id !== v.id);
    reconcile();
  }
  function scale(n: number) { desired = Math.max(0, Math.min(6, n)); say(`kubectl scale --replicas=${desired}`); reconcile(); }

  $effect(() => { reconcile(); const t = setInterval(() => { if (Math.random() < 0.35) kill(); }, 6000); return () => clearInterval(t); });
</script>

<div class="hero-sim">
  <div class="bar">
    <div class="spec">
      <span class="k">spec.replicas</span>
      <button type="button" class="btn small" onclick={() => scale(desired - 1)} aria-label="Una réplica menos">−</button>
      <strong class="n mono">{desired}</strong>
      <button type="button" class="btn small" onclick={() => scale(desired + 1)} aria-label="Una réplica más">+</button>
    </div>
    <div class="status"><span class="k">status.readyReplicas</span> <strong class="n mono">{pods.filter((p) => p.status === 'Running').length}</strong></div>
    <button type="button" class="btn small" onclick={kill}>Matar un pod</button>
  </div>
  <ClusterCanvas {nodes} {pods} pendingTray={false} compact />
  <ol class="log" aria-live="polite">
    {#each log as l, k}<li style={`opacity:${1 - k * 0.25}`}>{l}</li>{/each}
  </ol>
</div>

<style>
  .hero-sim { display: grid; gap: 12px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px 20px; align-items: center; }
  .spec, .status { display: inline-flex; align-items: center; gap: 8px; }
  .k { font: 500 0.8rem var(--mono); color: var(--ink-2); }
  .n { font-size: 1.2rem; min-width: 1.2em; text-align: center; }
  .status .n { color: var(--ready); }
  .log { list-style: none; margin: 0; padding: 0; font: 0.82rem var(--mono); color: var(--ink-2); min-height: 4.6em; display: grid; gap: 2px; }
</style>
