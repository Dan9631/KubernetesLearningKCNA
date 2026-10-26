<script lang="ts">
  // Canary por pesos: una HTTPRoute reparte el tráfico entre whoami-v1 y whoami-v2 según backendRefs[].weight.
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { wait } from '../../lib/motion';

  const nodes: NodeSpec[] = [
    { name: 'kcna-control-plane', role: 'control-plane' },
    { name: 'kcna-worker', role: 'worker' },
    { name: 'kcna-worker2', role: 'worker' },
  ];
  const PODS = [
    { id: 'v1a', v: 'v1', name: 'whoami-v1-6c8df6cbf6-fgnhn', node: 'kcna-worker' },
    { id: 'v1b', v: 'v1', name: 'whoami-v1-6c8df6cbf6-q7x2m', node: 'kcna-worker2' },
    { id: 'v2a', v: 'v2', name: 'whoami-v2-7d9b8f5c4-k2p9r', node: 'kcna-worker2' },
  ] as const;

  let w2 = $state(10);
  let headerRule = $state(false);
  let withHeader = $state(false);
  let count = $state({ v1: 0, v2: 0 });
  let perPod = $state<Record<string, number>>({ v1a: 0, v1b: 0, v2a: 0 });
  let served = $state<string | null>(null);
  let running = $state(false);
  let done = $state(false);
  let strategy = $state<'canary' | 'bluegreen' | 'rolling'>('canary');

  const w1 = $derived(100 - w2);
  const total = $derived(count.v1 + count.v2);
  const expected = $derived(headerRule && withHeader ? { v1: 0, v2: 100 } : { v1: w1, v2: w2 });

  const pods = $derived<PodSpec[]>(PODS.map((p) => ({
    id: p.id, name: p.name, node: p.node, status: 'Running', tag: `${p.v} · ${perPod[p.id]}`, color: p.v === 'v1' ? 'a' : 'b', highlight: served === p.id,
  })));

  const yaml = $derived(`apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary
  namespace: lab-07
spec:
  parentRefs:
    - name: traefik-gateway
      namespace: traefik
  rules:${headerRule ? `
    - matches:                 # regla 1: QA con cabecera, siempre v2
        - path:
            type: PathPrefix
            value: /lab07/canary
          headers:
            - name: x-version
              value: v2
      backendRefs:
        - name: whoami-v2
          port: 80` : ''}
    - matches:${headerRule ? '                 # regla 2: el resto, por pesos' : ''}
        - path:
            type: PathPrefix
            value: /lab07/canary
      backendRefs:
        - name: whoami-v1
          port: 80
          weight: ${w1}
        - name: whoami-v2
          port: 80
          weight: ${w2}`);

  function reset() { count = { v1: 0, v2: 0 }; perPod = { v1a: 0, v1b: 0, v2a: 0 }; served = null; done = false; }

  async function send() {
    if (running) return;
    running = true; reset();
    const acc = { v1: 0, v2: 0 };
    const rr = { v1: 0, v2: 0 };
    for (let i = 0; i < 100; i += 1) {
      let v: 'v1' | 'v2';
      if (headerRule && withHeader) v = 'v2';
      else {
        // weighted round robin suave (como Traefik): reparto exacto, no al azar
        acc.v1 += w1; acc.v2 += w2;
        v = acc.v2 > acc.v1 ? 'v2' : 'v1';
        acc[v] -= 100;
      }
      const list = PODS.filter((p) => p.v === v);
      const pod = list[rr[v] % list.length]; rr[v] += 1;
      count = { ...count, [v]: count[v] + 1 };
      perPod = { ...perPod, [pod.id]: perPod[pod.id] + 1 };
      served = pod.id;
      await wait(18);
    }
    served = null; done = true; running = false;
  }

  const explain = $derived.by(() => {
    if (!done) {
      if (headerRule && withHeader) return 'Las peticiones llevarán la cabecera x-version: v2. La regla 1 combina path y headers; cuando dos reglas coinciden gana la más específica, así que todas irán a whoami-v2 aunque los pesos digan otra cosa.';
      if (w2 === 0) return 'Con weight 0 el backend no recibe nada: es el estado antes de empezar el canary (o después del rollback). Sube el peso y envía tráfico.';
      if (w2 === 100) return 'Todo el tráfico va a v2: el canary terminó. El siguiente paso real sería borrar el Deployment whoami-v1 (y quitarlo de backendRefs).';
      return `La ruta repartirá ${w1}% a whoami-v1 y ${w2}% a whoami-v2. Fíjate en que v1 tiene 2 pods y v2 solo 1: el porcentaje lo deciden los pesos de la HTTPRoute, no el número de réplicas.`;
    }
    if (headerRule && withHeader) return `100 de 100 a v2: la cabecera x-version: v2 coincidió con la regla 1 y los pesos de la regla 2 no se consultaron. Así QA prueba la versión nueva sin afectar a los usuarios.`;
    const diff = Math.abs(count.v2 - w2);
    return `Reparto real ${count.v1} / ${count.v2}, esperado ${w1} / ${w2}${diff === 0 ? ': exacto' : `: diferencia de ${diff}`}. Traefik usa weighted round robin, por eso sale exacto; otros controladores eligen al azar por petición y verás números cercanos (88/12, 91/9). Dentro de cada versión Traefik reparte entre sus pods: ${perPod.v1a} y ${perPod.v1b} para los dos pods de v1. Para seguir el rollout subirías el peso en caliente con kubectl apply; ningún pod se reinicia.`;
  });

  const strategies = {
    canary: { title: 'Canary', text: 'Un porcentaje pequeño del tráfico (10%) va a la versión nueva mientras el resto sigue en la vieja; se observan errores y latencia y se sube el peso (50%, 100%) o se vuelve atrás. Requiere algo que reparta por pesos: una HTTPRoute, un Ingress con anotaciones del controlador o un service mesh. Riesgo mínimo, rollback instantáneo.' },
    bluegreen: { title: 'Blue/green', text: 'Dos entornos completos: blue (actual) y green (nuevo). Se prueba green sin tráfico real y se cambia el 100% de golpe (weight 0/100, o cambiar el selector del Service). Rollback inmediato volviendo a blue, pero necesita el doble de recursos y no hay exposición gradual.' },
    rolling: { title: 'Rolling update', text: 'Lo que hace un Deployment por defecto: sustituye pods viejos por nuevos poco a poco (maxSurge, maxUnavailable) detrás del mismo Service. No controla el porcentaje de tráfico (depende de cuántos pods de cada versión existan en cada momento) y no permite probar la versión nueva con una cabecera. Es un canary aproximado y automático.' },
  };
</script>

<div class="canary">
  <div class="controls">
    <label class="peso">peso v2 <input type="range" min="0" max="100" step="5" bind:value={w2} disabled={running} onchange={() => { done = false; }} /> <strong class="mono">{w1} / {w2}</strong></label>
    <label class="check"><input type="checkbox" bind:checked={headerRule} disabled={running} onchange={() => { if (!headerRule) withHeader = false; done = false; }} /> regla extra: x-version: v2 siempre a v2</label>
    {#if headerRule}
      <label class="check"><input type="checkbox" bind:checked={withHeader} disabled={running} onchange={() => { done = false; }} /> enviar con cabecera x-version: v2</label>
    {/if}
  </div>

  <ClusterCanvas {nodes} {pods} pendingTray={false} compact showLabels={false} />

  <div class="controls acciones">
    <button type="button" class="btn primary" onclick={send} disabled={running}>{running ? 'Enviando…' : 'Enviar 100 peticiones'}</button>
    <span class="hint mono">GET http://localhost:8080/lab07/canary{headerRule && withHeader ? ' -H x-version: v2' : ''}</span>
  </div>

  <div class="bars" aria-live="polite">
    {#each ['v1', 'v2'] as v (v)}
      {@const c = count[v as 'v1' | 'v2']}
      {@const e = expected[v as 'v1' | 'v2']}
      <div class="row">
        <span class="lbl mono">whoami-{v}</span>
        <div class="track {v}">
          <span class="exp" style={`width:${e}%`} title="esperado"></span>
          <span class="real" style={`width:${c}%`} title="real"></span>
        </div>
        <span class="num mono">{c} <small>/ {e} esperado</small></span>
      </div>
    {/each}
    <p class="hint">Barra rellena: peticiones reales ({total} de 100). Marca clara: reparto esperado por los pesos.</p>
  </div>

  <div class="explain" class:ok={done}>{explain}</div>

  <div class="dos">
    <div class="col">
      <p class="hint mono">03-httproute-canary.yaml</p>
      <pre>{yaml}</pre>
    </div>
    <div class="col">
      <div class="controls" role="group" aria-label="Estrategia de despliegue">
        {#each Object.entries(strategies) as [k, s] (k)}
          <button type="button" class="btn small" class:primary={strategy === k} aria-pressed={strategy === k} onclick={() => (strategy = k as typeof strategy)}>{s.title}</button>
        {/each}
      </div>
      <p class="estrategia"><strong>{strategies[strategy].title}.</strong> {strategies[strategy].text}</p>
    </div>
  </div>
</div>

<style>
  .canary { display: grid; gap: 12px; }
  .peso { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .peso input { width: 160px; max-width: 50vw; }
  .check { display: inline-flex; align-items: center; gap: 6px; font-weight: 400; font-size: 0.9rem; }
  .acciones { margin-bottom: 0; }
  .bars { display: grid; gap: 6px; }
  .row { display: grid; grid-template-columns: 90px 1fr auto; gap: 10px; align-items: center; font-size: 0.85rem; }
  .track { position: relative; height: 18px; background: var(--panel-2); border: 1px solid var(--line-2); border-radius: 5px; overflow: hidden; --c: var(--helm); }
  .track.v2 { --c: #8250df; }
  .track .exp { position: absolute; inset: 0 auto 0 0; background: color-mix(in srgb, var(--c) 18%, transparent); transition: width var(--dur); }
  .track .real { position: absolute; inset: 3px auto 3px 0; background: var(--c); border-radius: 3px; transition: width 40ms linear; }
  .num small { color: var(--ink-3); font-size: 0.72rem; }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .col { display: grid; gap: 8px; min-width: 0; align-content: start; }
  .col .controls { margin-bottom: 0; }
  .estrategia { font-size: 0.92rem; color: var(--ink-2); }
  @media (max-width: 700px) { .dos { grid-template-columns: 1fr; } .row { grid-template-columns: 72px 1fr auto; } }
</style>
