<script lang="ts">
  // Estrategias de despliegue: recreate, rolling update, blue/green y canary sobre el mismo clúster.
  // Arriba, el Service o el Ingress reparte el tráfico; abajo, los pods v1 (azul) y v2 (morado).
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { wait } from '../../lib/motion';
  import { untrack } from 'svelte';

  type Strategy = 'recreate' | 'rolling' | 'bluegreen' | 'canary';
  const nodes: NodeSpec[] = [
    { name: 'kcna-worker', role: 'worker' },
    { name: 'kcna-worker2', role: 'worker' },
  ];
  const N = 4; // réplicas deseadas

  const INFO: Record<Strategy, { name: string; how: string; cut: string; cost: string; rollback: string; native: string }> = {
    recreate:  { name: 'Recreate',       how: 'Apaga todas las réplicas viejas y luego arranca las nuevas.', cut: 'Sí, hay corte', cost: 'Ninguno', rollback: 'Lento (otro redeploy)', native: 'strategy.type: Recreate' },
    rolling:   { name: 'Rolling update', how: 'Reemplaza pods de forma gradual según maxSurge y maxUnavailable.', cut: 'No', cost: 'Mínimo (un pod de más)', rollback: 'kubectl rollout undo', native: 'Por defecto en un Deployment' },
    bluegreen: { name: 'Blue/Green',     how: 'Levanta v2 completa al lado (green), la prueba y cambia todo el tráfico de golpe.', cut: 'No', cost: 'Alto: el doble de pods un tiempo', rollback: 'Inmediato: devolver el tráfico a blue', native: 'A mano (dos Deployments + selector) o con Argo Rollouts' },
    canary:    { name: 'Canary',         how: 'v2 recibe un porcentaje pequeño del tráfico que crece si las métricas van bien.', cut: 'No', cost: 'Bajo', rollback: 'Rápido: tráfico de vuelta a la estable', native: 'Aproximado con réplicas; preciso con Ingress, Gateway API o service mesh' },
  };

  let strategy = $state<Strategy>('rolling');
  let seq = 0;
  const initial = (): PodSpec[] => Array.from({ length: N }, (_, i) => ({ id: `p${++seq}`, name: `web-7f9c-${['abcde', 'fgh12', 'k9m3x', 'q7r2t'][i]}`, node: i % 2 ? 'kcna-worker2' : 'kcna-worker', status: 'Running', tag: 'v1', color: 'a' }));
  let pods = $state<PodSpec[]>(initial());
  let busy = $state(false);
  let phase = $state<'idle' | 'deploying' | 'green-ready' | 'canary-10' | 'canary-50' | 'done'>('idle');
  /** a qué versión apunta el Service (blue/green) o el peso de v2 en el Ingress (canary) */
  let selector = $state<'v1' | 'v2' | 'all'>('all');
  let weightV2 = $state(0);
  let minAvail = $state(100);
  let maxCost = $state(100);
  let explain = $state('Elige una estrategia y pulsa Desplegar v2. Observa cuántos pods sirven tráfico en cada momento y cuántos pods existen en total.');
  let tone = $state<'' | 'ok' | 'warn' | 'fail'>('');

  const nodeFor = () => (pods.filter((p) => p.node === 'kcna-worker').length <= pods.filter((p) => p.node === 'kcna-worker2').length ? 'kcna-worker' : 'kcna-worker2');
  const mk = (v: 'v1' | 'v2', status: PodSpec['status'] = 'Running'): PodSpec => ({ id: `p${++seq}`, name: `web-${v === 'v1' ? '7f9c' : 'c4d1'}-${Math.random().toString(36).slice(2, 7)}`, node: nodeFor(), status, tag: v, color: v === 'v1' ? 'a' : 'b' });
  const ver = (p: PodSpec) => (p.tag as 'v1' | 'v2');
  const ready = (v: 'v1' | 'v2') => pods.filter((p) => ver(p) === v && p.status === 'Running').length;

  // Tráfico: qué porcentaje de las peticiones llega a cada versión
  const traffic = $derived.by(() => {
    const r1 = ready('v1'), r2 = ready('v2');
    if (strategy === 'canary') return { v1: 100 - weightV2, v2: weightV2 };
    if (strategy === 'bluegreen') return selector === 'v1' ? { v1: 100, v2: 0 } : selector === 'v2' ? { v1: 0, v2: 100 } : { v1: 100, v2: 0 };
    const t = r1 + r2 || 1;
    return { v1: Math.round((100 * r1) / t), v2: Math.round((100 * r2) / t) };
  });
  // Disponibilidad: pods Running que reciben tráfico, frente a las N réplicas deseadas
  const availability = $derived.by(() => {
    let serving = 0;
    if (strategy === 'canary') serving = (weightV2 > 0 && ready('v2') === 0 ? 0 : 1) * Math.min(N, ready('v1') + ready('v2'));
    else if (strategy === 'bluegreen') serving = selector === 'v2' ? ready('v2') : ready('v1');
    else serving = ready('v1') + ready('v2');
    return Math.min(100, Math.round((100 * serving) / N));
  });
  const cost = $derived(Math.round((100 * pods.length) / N));
  $effect(() => {
    const a = availability, c = cost, active = busy || phase !== 'idle';
    untrack(() => { if (active) { minAvail = Math.min(minAvail, a); maxCost = Math.max(maxCost, c); } });
  });

  function reset(s: Strategy = strategy) {
    strategy = s; busy = false; phase = 'idle'; weightV2 = 0; selector = 'all'; minAvail = 100; maxCost = 100; tone = '';
    pods = initial();
    explain = `${INFO[s].name}: ${INFO[s].how}`;
  }

  const setStatus = (id: string, status: PodSpec['status']) => (pods = pods.map((p) => (p.id === id ? { ...p, status } : p)));
  async function remove(id: string) { setStatus(id, 'Terminating'); await wait(450); pods = pods.filter((p) => p.id !== id); }
  async function add(v: 'v1' | 'v2') { const p = mk(v, 'ContainerCreating'); pods = [...pods, p]; await wait(650); setStatus(p.id, 'Running'); return p; }

  async function deploy() {
    if (busy || phase !== 'idle') return;
    busy = true; phase = 'deploying'; minAvail = 100; maxCost = 100; tone = '';
    if (strategy === 'recreate') {
      explain = 'Recreate: el Deployment termina todos los pods v1 antes de crear ninguno v2. Mientras tanto no hay nadie que responda: corte de servicio.';
      tone = 'fail';
      for (const p of pods.filter((p) => ver(p) === 'v1')) setStatus(p.id, 'Terminating');
      await wait(600);
      pods = [];
      await wait(700);
      for (let i = 0; i < N; i++) add('v2');
      await wait(900);
      explain = `Recreate terminado. La disponibilidad cayó al 0% durante el cambio, pero nunca hubo más de ${N} pods: es la opción barata cuando la app no tolera dos versiones a la vez.`;
      tone = 'warn';
    } else if (strategy === 'rolling') {
      explain = 'RollingUpdate con maxSurge 1 y maxUnavailable 0: crea un pod v2, espera a que esté Ready y entonces retira un v1. El Service selecciona app=web, así que mezcla v1 y v2 durante el cambio.';
      for (let i = 0; i < N; i++) {
        await add('v2');
        const old = pods.find((p) => ver(p) === 'v1' && p.status === 'Running');
        if (old) await remove(old.id);
      }
      explain = 'Rolling update terminado sin corte: siempre hubo al menos 4 pods Running y como mucho 5. Es la estrategia por defecto del Deployment; para volver atrás, kubectl rollout undo.';
      tone = 'ok';
    } else if (strategy === 'bluegreen') {
      selector = 'v1';
      explain = 'Blue/Green: se crea el entorno green (v2) completo junto a blue (v1). El Service sigue apuntando a version=v1, así que los usuarios no notan nada mientras pruebas green.';
      for (let i = 0; i < N; i++) add('v2');
      await wait(900);
      phase = 'green-ready'; busy = false;
      explain = 'Green está listo y probado. Ahora el cambio: el Service pasa a seleccionar version=v2 y el 100% del tráfico salta de golpe. Blue sigue vivo por si hay que volver.';
      return;
    } else {
      explain = 'Canary: un pod v2 recibe el 10% del tráfico (el Ingress o Gateway reparte por pesos). Vigila errores y latencia antes de subir.';
      await add('v2');
      weightV2 = 10;
      phase = 'canary-10'; busy = false;
      return;
    }
    phase = 'done'; busy = false;
  }

  // Blue/green
  function switchTraffic() { selector = 'v2'; phase = 'done'; explain = 'Tráfico al 100% en v2 en un instante: solo cambió el selector del Service. Coste: el doble de pods hasta que retires blue. Si algo va mal, Rollback devuelve el selector a v1 igual de rápido.'; tone = 'ok'; }
  function rollbackBG() { selector = 'v1'; phase = 'green-ready'; explain = 'Rollback instantáneo: el selector vuelve a version=v1 y blue, que nunca se apagó, atiende todo otra vez. Nadie esperó a que arrancara ningún pod.'; tone = 'warn'; }
  async function retireBlue() { busy = true; for (const p of pods.filter((p) => ver(p) === 'v1')) await remove(p.id); busy = false; explain = 'Blue retirado: los recursos vuelven a la normalidad. El siguiente despliegue usará v2 como blue.'; tone = 'ok'; }

  // Canary
  async function canaryNext() {
    if (busy) return; busy = true;
    if (phase === 'canary-10') {
      await add('v2');
      const olds = pods.filter((p) => ver(p) === 'v1');
      await remove(olds[0].id); await remove(olds[1].id);
      weightV2 = 50; phase = 'canary-50';
      explain = 'Las métricas del 10% fueron bien: ahora 50/50. Cada paso reduce el riesgo porque solo una parte de los usuarios ve la versión nueva.';
    } else if (phase === 'canary-50') {
      await add('v2'); await add('v2');
      for (const p of pods.filter((p) => ver(p) === 'v1')) await remove(p.id);
      weightV2 = 100; phase = 'done';
      explain = 'Canary completado: 100% del tráfico en v2 sin corte y con un coste bajo (nunca hubo más de un pod extra). Argo Rollouts o Flagger automatizan estos pasos leyendo métricas de Prometheus.';
      tone = 'ok';
    }
    busy = false;
  }
  async function abortCanary() {
    if (busy) return; busy = true;
    weightV2 = 0;
    explain = 'Abortado: el peso de v2 vuelve a 0 al instante y nadie recibe la versión nueva. Luego se retiran los pods canary y, si hace falta, se reponen los v1.';
    tone = 'warn';
    for (const p of pods.filter((p) => ver(p) === 'v2')) await remove(p.id);
    while (pods.filter((p) => ver(p) === 'v1').length < N) await add('v1');
    phase = 'idle'; busy = false;
  }
</script>

<div class="estrategias">
  <div class="controls">
    <label for="estrategia">Estrategia</label>
    <select id="estrategia" value={strategy} onchange={(e) => reset((e.currentTarget as HTMLSelectElement).value as Strategy)} disabled={busy}>
      {#each Object.entries(INFO) as [k, v]}<option value={k}>{v.name}</option>{/each}
    </select>
    {#if phase === 'idle'}
      <button type="button" class="btn small primary" onclick={deploy} disabled={busy}>Desplegar v2</button>
    {:else if phase === 'green-ready'}
      <button type="button" class="btn small primary" onclick={switchTraffic} disabled={busy}>Cambiar el Service a v2</button>
    {:else if phase === 'canary-10' || phase === 'canary-50'}
      <button type="button" class="btn small primary" onclick={canaryNext} disabled={busy}>Subir a {phase === 'canary-10' ? '50' : '100'}%</button>
      <button type="button" class="btn small" onclick={abortCanary} disabled={busy}>Abortar canary</button>
    {:else if phase === 'done' && strategy === 'bluegreen'}
      <button type="button" class="btn small" onclick={rollbackBG} disabled={busy}>Rollback a v1</button>
      <button type="button" class="btn small" onclick={retireBlue} disabled={busy || !pods.some((p) => ver(p) === 'v1')}>Retirar blue (v1)</button>
    {/if}
    {#if phase !== 'idle'}<button type="button" class="btn small" onclick={() => reset()} disabled={busy}>Reiniciar en v1</button>{/if}
  </div>

  <div class="router" aria-label="Reparto de tráfico">
    <div class="front">
      <span class="who">Usuarios</span>
      <span class="arrow" aria-hidden="true"></span>
      <span class="svc mono">{strategy === 'canary' ? 'Ingress (pesos)' : strategy === 'bluegreen' ? `Service selector version=${selector === 'all' ? 'v1' : selector}` : 'Service selector app=web'}</span>
    </div>
    <div class="split">
      <div class="lane v1" style={`--w:${traffic.v1}%`}><span>v1 <b>{traffic.v1}%</b></span><i style={`width:${traffic.v1}%`}></i></div>
      <div class="lane v2" style={`--w:${traffic.v2}%`}><span>v2 <b>{traffic.v2}%</b></span><i style={`width:${traffic.v2}%`}></i></div>
    </div>
  </div>

  <ClusterCanvas {nodes} {pods} pendingTray={false} showLabels={false} compact />

  <div class="meters">
    <div class="meter" class:bad={availability < 100}>
      <span class="k">Disponibilidad durante el despliegue</span>
      <div class="bar"><i style={`width:${availability}%`}></i></div>
      <span class="v mono">{availability}% ahora · mínimo {minAvail}%</span>
    </div>
    <div class="meter" class:bad={cost > 150}>
      <span class="k">Coste en recursos</span>
      <div class="bar"><i class="cost" style={`width:${Math.min(100, cost / 2)}%`}></i></div>
      <span class="v mono">{pods.length} pods de {N} ({cost}%) · pico {maxCost}%</span>
    </div>
  </div>

  <dl class="facts">
    <div><dt>Corte de servicio</dt><dd>{INFO[strategy].cut}</dd></div>
    <div><dt>Coste extra</dt><dd>{INFO[strategy].cost}</dd></div>
    <div><dt>Rollback</dt><dd>{INFO[strategy].rollback}</dd></div>
    <div><dt>En Kubernetes</dt><dd class="mono">{INFO[strategy].native}</dd></div>
  </dl>

  <div class="explain {tone}" aria-live="polite">{explain}</div>
</div>

<style>
  .estrategias { display: grid; gap: 12px; }
  .router { display: grid; gap: 6px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); }
  .front { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.86rem; }
  .who { color: var(--ink-2); }
  .arrow { width: 22px; height: 2px; background: var(--ink-3); position: relative; flex: none; }
  .arrow::after { content: ''; position: absolute; right: -1px; top: -4px; border: 5px solid transparent; border-left-color: var(--ink-3); border-right: 0; }
  .svc { font-size: 0.8rem; padding: 3px 9px; border-radius: 999px; background: var(--panel); border: 1px solid var(--helm); color: var(--helm-ink); }
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .lane { position: relative; height: 26px; border-radius: 6px; background: var(--panel); border: 1px solid var(--line-2); overflow: hidden; }
  .lane i { position: absolute; inset: 0 auto 0 0; transition: width var(--dur-slow) var(--ease); opacity: 0.25; }
  .lane.v1 i { background: var(--helm); } .lane.v2 i { background: #8250df; }
  .lane span { position: relative; z-index: 1; font-size: 0.8rem; line-height: 24px; padding-left: 8px; }
  .lane.v1 span b { color: var(--helm-ink); } .lane.v2 span b { color: #8250df; }
  .meters { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
  .meter { display: grid; gap: 4px; }
  .k { font-size: 0.82rem; color: var(--ink-2); }
  .v { font-size: 0.78rem; color: var(--ink-2); }
  .bar { height: 10px; border-radius: 5px; background: var(--panel-2); border: 1px solid var(--line-2); overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--ready); transition: width var(--dur) var(--ease); }
  .bar i.cost { background: var(--wait); }
  .meter.bad .bar i { background: var(--fail); }
  .meter.bad .bar i.cost { background: var(--fail); }
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px; margin: 0; }
  .facts div { background: var(--panel-2); border: 1px solid var(--line-2); border-radius: var(--r-s); padding: 6px 10px; }
  .facts dt { font-size: 0.74rem; color: var(--ink-3); }
  .facts dd { margin: 0; font-size: 0.86rem; }
</style>
