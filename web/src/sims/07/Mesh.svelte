<script lang="ts">
  // Qué añade un service mesh: tres microservicios que se llaman en cadena, con o sin proxies (sidecar / ambient).
  import { ms, wait } from '../../lib/motion';

  type MeshMode = 'none' | 'sidecar' | 'ambient';
  type Fault = 'none' | 'once' | 'always';
  interface Hop { x: number; y: number; kind: 'app' | 'proxy'; name: string }

  let mode = $state<MeshMode>('none');
  let mtls = $state(false);
  let retries = $state(false);
  let circuit = $state(false);
  let observ = $state(false);
  let fault = $state<Fault>('none');

  let px = $state(0); let py = $state(0);
  let pktOn = $state(false);
  let pktFail = $state(false);
  let busy = $state(false);
  let fails = $state(0);
  let open = $state(false);
  let status = $state('');
  let metrics = $state<{ src: string; dst: string; code: string; lat: number; note: string }[]>([]);
  let lastResult = $state<'ok' | 'fail' | 'open' | ''>('');

  const hasMesh = $derived(mode !== 'none');
  const l7 = $derived(retries || circuit);
  const waypoint = $derived(mode === 'ambient' && l7);

  // geometría (viewBox 0 0 660 300)
  const POD = { w: 130, h: 74 };
  const F = { x: 100, y: 140 };   // frontend en kcna-worker
  const P = { x: 420, y: 92 };    // pedidos en kcna-worker2
  const G = { x: 420, y: 178 };   // pagos en kcna-worker2
  const ZT1 = { x: 165, y: 269 }; // ztunnel kcna-worker
  const ZT2 = { x: 490, y: 269 }; // ztunnel kcna-worker2
  const WP = { x: 165, y: 236 };  // waypoint (Envoy L7) en kcna-worker
  const appCenter = (p: { x: number; y: number }, side: 'l' | 'r' | 'full') =>
    side === 'full' ? { x: p.x + POD.w / 2, y: p.y + 44 } : side === 'r' ? { x: p.x + 35, y: p.y + 44 } : { x: p.x + 96, y: p.y + 44 };
  const envoyCenter = (p: { x: number; y: number }, side: 'l' | 'r') => (side === 'r' ? { x: p.x + 96, y: p.y + 44 } : { x: p.x + 35, y: p.y + 44 });

  const hops = $derived.by<Hop[]>(() => {
    if (mode === 'none') return [
      { ...appCenter(F, 'full'), kind: 'app', name: 'frontend' }, { ...appCenter(P, 'full'), kind: 'app', name: 'pedidos' }, { ...appCenter(G, 'full'), kind: 'app', name: 'pagos' },
    ];
    if (mode === 'sidecar') return [
      { ...appCenter(F, 'r'), kind: 'app', name: 'frontend' }, { ...envoyCenter(F, 'r'), kind: 'proxy', name: 'istio-proxy (frontend)' },
      { ...envoyCenter(P, 'l'), kind: 'proxy', name: 'istio-proxy (pedidos)' }, { ...appCenter(P, 'l'), kind: 'app', name: 'pedidos' },
      { ...envoyCenter(P, 'l'), kind: 'proxy', name: 'istio-proxy (pedidos)' }, { ...envoyCenter(G, 'l'), kind: 'proxy', name: 'istio-proxy (pagos)' }, { ...appCenter(G, 'l'), kind: 'app', name: 'pagos' },
    ];
    const base: Hop[] = [
      { ...appCenter(F, 'full'), kind: 'app', name: 'frontend' }, { ...ZT1, kind: 'proxy', name: 'ztunnel (kcna-worker)' }, { ...ZT2, kind: 'proxy', name: 'ztunnel (kcna-worker2)' }, { ...appCenter(P, 'full'), kind: 'app', name: 'pedidos' },
      { ...ZT2, kind: 'proxy', name: 'ztunnel (kcna-worker2)' },
    ];
    if (waypoint) base.push({ ...WP, kind: 'proxy', name: 'waypoint (Envoy L7)' }, { ...ZT2, kind: 'proxy', name: 'ztunnel (kcna-worker2)' });
    base.push({ ...appCenter(G, 'full'), kind: 'app', name: 'pagos' });
    return base;
  });
  const segments = $derived(hops.slice(1).map((h, i) => ({ a: hops[i], b: h, secure: hops[i].kind === 'proxy' && h.kind === 'proxy' && !(hops[i].x === h.x && hops[i].y === h.y) })));

  async function moveTo(i: number, fail = false) { px = hops[i].x; py = hops[i].y; pktFail = fail; await wait(230); }

  async function call() {
    if (busy) return;
    busy = true; pktOn = true; lastResult = '';
    const path = hops;
    const gIdx = path.length - 1;
    const pIdx = path.findIndex((h) => h.name === 'pedidos');
    const proxyIdx = retries || circuit ? path.slice(pIdx + 1, gIdx).map((h, k) => (h.kind === 'proxy' ? pIdx + 1 + k : -1)).filter((k) => k >= 0).pop() ?? -1 : -1;
    status = 'frontend llama a pedidos…';
    px = path[0].x; py = path[0].y; pktFail = false; await wait(120);
    for (let i = 1; i <= pIdx; i += 1) await moveTo(i);
    if (observ) metrics = [...metrics, { src: 'frontend', dst: 'pedidos', code: '200', lat: 4 + Math.round(Math.random() * 6), note: hasMesh ? (mtls ? 'mTLS' : 'texto plano') : 'sin proxy: nadie lo mide' }].slice(-6);
    status = 'pedidos llama a pagos…';
    if (circuit && open && proxyIdx >= 0) {
      await moveTo(proxyIdx);
      await moveTo(proxyIdx, true);
      status = 'circuito abierto: el proxy rechaza la llamada al instante (503) sin molestar a pagos';
      if (observ) metrics = [...metrics, { src: 'pedidos', dst: 'pagos', code: '503', lat: 1, note: 'circuit breaker abierto' }].slice(-6);
      for (let i = proxyIdx - 1; i >= 0; i -= 1) await moveTo(i, true);
      lastResult = 'open';
      pktOn = false; busy = false; return;
    }
    let attempt = 0; let ok = false;
    while (!ok) {
      attempt += 1;
      const start = Math.max(pIdx, proxyIdx) + 1;
      for (let i = attempt === 1 ? pIdx + 1 : start; i <= gIdx; i += 1) await moveTo(i);
      const failed = fault === 'always' || (fault === 'once' && attempt === 1);
      if (!failed) { ok = true; fails = 0; status = `pagos respondió 200${attempt > 1 ? ` en el intento ${attempt}` : ''}`; break; }
      fails += 1;
      await moveTo(gIdx, true);
      if (retries && proxyIdx >= 0 && attempt < 3) {
        status = `pagos devolvió 503: el proxy ${path[proxyIdx].name} reintenta (intento ${attempt + 1} de 3)`;
        await moveTo(proxyIdx, true);
        continue;
      }
      status = retries && proxyIdx >= 0 ? 'tres intentos fallidos: el proxy devuelve 503 a pedidos y frontend recibe el error' : hasMesh ? 'pagos devolvió 503 y nadie reintentó (reintentos apagados): el error llega hasta frontend' : 'pagos devolvió 503 y, sin proxy, la app tendría que reintentar en su propio código: el error llega hasta frontend';
      for (let i = gIdx - 1; i >= 0; i -= 1) await moveTo(i, true);
      lastResult = 'fail';
      break;
    }
    if (observ) metrics = [...metrics, { src: 'pedidos', dst: 'pagos', code: ok ? '200' : '503', lat: 8 * attempt + Math.round(Math.random() * 5), note: hasMesh ? `${attempt} intento${attempt > 1 ? 's' : ''}${mtls ? ', mTLS' : ''}` : 'sin proxy: nadie lo mide' }].slice(-6);
    if (ok) { for (let i = gIdx - 1; i >= 0; i -= 1) await moveTo(i); lastResult = 'ok'; }
    if (circuit && proxyIdx >= 0 && fails >= 3 && !open) { open = true; status += '. Circuit breaker: 3 fallos seguidos, el circuito se abre'; }
    pktOn = false; busy = false;
  }

  function setMode(m: MeshMode) {
    if (busy) return;
    mode = m; open = false; fails = 0; metrics = []; lastResult = ''; status = '';
    if (m === 'none') { mtls = false; retries = false; circuit = false; observ = false; }
  }
  function halfOpen() { open = false; fails = 0; status = 'pasaron 10 s: el circuito está half-open, la próxima llamada prueba si pagos se recuperó'; }

  const ram = $derived.by(() => {
    if (mode === 'none') return 'Sin mesh: 0 MiB extra. La app implementa (o no) reintentos, TLS y métricas en su propio código, lenguaje a lenguaje.';
    if (mode === 'sidecar') return 'Modo sidecar: 3 pods × 1 Envoy (50-100 MiB cada uno) ≈ 150-300 MiB, más istiod (pide 2 GiB por defecto, en el lab se baja a 256 Mi). Cada pod nuevo necesita reiniciarse para recibir su sidecar y cada llamada cruza dos proxies.';
    return `Modo ambient: 2 nodos × ztunnel (≈ 30 MiB, Rust, L4) ≈ 60 MiB, más istiod${waypoint ? ', más un waypoint (Envoy) porque pediste funciones L7' : ''}. Los pods no se reinician para entrar o salir del mesh; el waypoint solo se despliega si hace falta L7.`;
  });

  const explain = $derived.by(() => {
    if (mode === 'none') return 'Tres microservicios hablando por Services de Kubernetes: la red solo entrega paquetes. Nadie cifra entre pods, nadie reintenta, nadie mide latencia por llamada. Activa el mesh para ver qué cambia sin tocar el código de las apps.';
    const parts: string[] = [];
    parts.push(mode === 'sidecar'
      ? 'Modo sidecar: istiod inyectó un Envoy (istio-proxy) en cada pod y las reglas iptables del pod desvían todo el tráfico por él. Data plane: los tres Envoy. Control plane: istiod, que no toca ningún paquete.'
      : 'Modo ambient: un ztunnel por nodo (DaemonSet) intercepta el tráfico de todos los pods del nodo y da mTLS, identidad y telemetría L4. Para funciones L7 (reintentos, circuit breaking, rutas por cabecera) aparece un waypoint proxy (Envoy).');
    if (mtls) parts.push('mTLS: istiod emite un certificado por servicio (identidad SPIFFE) y los proxies cifran y autentican ambos extremos; la app sigue hablando HTTP plano con su proxy local.');
    if (retries) parts.push('Reintentos y timeouts: el proxy que hace la llamada repite hasta 3 veces si recibe 503 o se agota el tiempo; la app no se entera.');
    if (circuit) parts.push('Circuit breaking: tras 3 fallos consecutivos el proxy abre el circuito y rechaza al instante las llamadas a pagos durante un tiempo, para no acumular carga sobre un servicio enfermo ni propagar el fallo.');
    if (observ) parts.push('Observabilidad: cada proxy emite métricas doradas (latencia, tráfico, errores, saturación), logs de acceso y trazas de cada llamada; Kiali las convierte en un mapa de dependencias.');
    return parts.join(' ');
  });
</script>

<div class="mesh">
  <div class="controls" role="group" aria-label="Modo de mesh">
    <span class="hint">Red</span>
    <button type="button" class="btn small" class:primary={mode === 'none'} aria-pressed={mode === 'none'} onclick={() => setMode('none')} disabled={busy}>sin mesh</button>
    <button type="button" class="btn small" class:primary={mode === 'sidecar'} aria-pressed={mode === 'sidecar'} onclick={() => setMode('sidecar')} disabled={busy}>con mesh (sidecar)</button>
    <button type="button" class="btn small" class:primary={mode === 'ambient'} aria-pressed={mode === 'ambient'} onclick={() => setMode('ambient')} disabled={busy}>con mesh (ambient)</button>
  </div>

  <div class="escena">
    <svg viewBox="0 0 660 300" role="img" aria-label="Escena: frontend llama a pedidos y pedidos llama a pagos">
      <!-- control plane -->
      <rect x="20" y="10" width="620" height="54" rx="8" class="node cp" />
      <text x="32" y="30" class="nname">kcna-control-plane</text>
      {#if hasMesh}
        <g class="pop">
          <rect x="270" y="20" width="130" height="34" rx="6" class="istiod" />
          <text x="335" y="36" class="lbl mid">istiod</text>
          <text x="335" y="48" class="sub mid">control plane: xDS + CA</text>
          {#each hops.filter((h, i, a) => h.kind === 'proxy' && a.findIndex((o) => o.x === h.x && o.y === h.y) === i) as h (h.x + ':' + h.y)}
            <line x1="335" y1="54" x2={h.x} y2={h.y - 14} class="cfg" />
          {/each}
        </g>
      {/if}
      <!-- nodos -->
      <rect x="20" y="80" width="300" height="210" rx="8" class="node" />
      <text x="32" y="98" class="nname">kcna-worker</text>
      <rect x="340" y="80" width="300" height="210" rx="8" class="node" />
      <text x="352" y="98" class="nname">kcna-worker2</text>

      <!-- conexiones -->
      {#each segments as s, i (mode + i + String(waypoint))}
        <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} class="link" class:secure={mtls && s.secure} />
        {#if mtls && s.secure}
          <g transform={`translate(${(s.a.x + s.b.x) / 2} ${(s.a.y + s.b.y) / 2})`} class="lock">
            <rect x="-7" y="-4" width="14" height="11" rx="2" />
            <path d="M-4 -4 v-3 a4 4 0 0 1 8 0 v3" fill="none" />
          </g>
        {/if}
      {/each}

      <!-- pods -->
      {#each [{ p: F, name: 'frontend', side: 'r' }, { p: P, name: 'pedidos', side: 'l' }, { p: G, name: 'pagos', side: 'l' }] as pod (pod.name)}
        <g>
          <rect x={pod.p.x} y={pod.p.y} width={POD.w} height={POD.h} rx="8" class="pod" class:sick={pod.name === 'pagos' && fault !== 'none'} />
          <text x={pod.p.x + 8} y={pod.p.y + 15} class="sub">pod {pod.name}{mode === 'sidecar' ? ' 2/2' : ' 1/1'}</text>
          {#if mode === 'sidecar'}
            {#if pod.side === 'r'}
              <rect x={pod.p.x + 6} y={pod.p.y + 22} width="58" height="44" rx="5" class="app" />
              <text x={pod.p.x + 35} y={pod.p.y + 48} class="lbl mid">{pod.name}</text>
              <rect x={pod.p.x + 68} y={pod.p.y + 22} width="56" height="44" rx="5" class="envoy pop" />
              <text x={pod.p.x + 96} y={pod.p.y + 42} class="lbl mid">Envoy</text>
              <text x={pod.p.x + 96} y={pod.p.y + 56} class="sub mid">istio-proxy</text>
            {:else}
              <rect x={pod.p.x + 6} y={pod.p.y + 22} width="56" height="44" rx="5" class="envoy pop" />
              <text x={pod.p.x + 35} y={pod.p.y + 42} class="lbl mid">Envoy</text>
              <text x={pod.p.x + 35} y={pod.p.y + 56} class="sub mid">istio-proxy</text>
              <rect x={pod.p.x + 68} y={pod.p.y + 22} width="56" height="44" rx="5" class="app" />
              <text x={pod.p.x + 96} y={pod.p.y + 48} class="lbl mid">{pod.name}</text>
            {/if}
          {:else}
            <rect x={pod.p.x + 6} y={pod.p.y + 22} width="118" height="44" rx="5" class="app" />
            <text x={pod.p.x + 65} y={pod.p.y + 48} class="lbl mid">{pod.name}</text>
          {/if}
        </g>
      {/each}

      {#if mode === 'ambient'}
        <g class="pop">
          <rect x="30" y="256" width="280" height="26" rx="5" class="envoy" />
          <text x="165" y="273" class="lbl mid">ztunnel (DaemonSet, L4)</text>
          <rect x="350" y="256" width="280" height="26" rx="5" class="envoy" />
          <text x="490" y="273" class="lbl mid">ztunnel (DaemonSet, L4)</text>
        </g>
        {#if waypoint}
          <g class="pop">
            <rect x="100" y="222" width="130" height="28" rx="5" class="envoy" />
            <text x="165" y="240" class="lbl mid">waypoint (Envoy L7)</text>
          </g>
        {/if}
      {/if}

      <!-- paquete -->
      <circle r="7" class="pkt" class:on={pktOn} class:fail={pktFail} style={`transform: translate(${px}px, ${py}px); transition-duration: ${ms(230)}ms`} />
    </svg>
  </div>

  <div class="controls acciones">
    <button type="button" class="btn primary" onclick={call} disabled={busy}>{busy ? 'Llamando…' : 'Hacer una llamada'}</button>
    <label>pagos
      <select bind:value={fault} disabled={busy}>
        <option value="none">responde bien</option>
        <option value="once">falla el primer intento</option>
        <option value="always">falla siempre</option>
      </select>
    </label>
    {#if open}<button type="button" class="btn small" onclick={halfOpen} disabled={busy}>Esperar 10 s (half-open)</button>{/if}
  </div>

  <div class="caps" role="group" aria-label="Capacidades del mesh">
    <label class="check" class:off={!hasMesh}><input type="checkbox" bind:checked={mtls} disabled={!hasMesh || busy} /> mTLS</label>
    <label class="check" class:off={!hasMesh}><input type="checkbox" bind:checked={retries} disabled={!hasMesh || busy} /> reintentos y timeouts</label>
    <label class="check" class:off={!hasMesh}><input type="checkbox" bind:checked={circuit} disabled={!hasMesh || busy} onchange={() => { open = false; fails = 0; }} /> circuit breaking</label>
    <label class="check" class:off={!hasMesh}><input type="checkbox" bind:checked={observ} disabled={!hasMesh || busy} /> observabilidad</label>
    {#if !hasMesh}<span class="hint">activa un mesh para encender capacidades</span>{/if}
  </div>

  {#if status}
    <p class="status" class:ok={lastResult === 'ok'} class:fail={lastResult === 'fail' || lastResult === 'open'} aria-live="polite">{status}{circuit && hasMesh ? ` · fallos seguidos: ${fails}${open ? ' · circuito ABIERTO' : ''}` : ''}</p>
  {/if}

  {#if observ && metrics.length}
    <div class="tabla-wrap">
      <table class="tabla">
        <thead><tr><th>origen</th><th>destino</th><th>código</th><th>latencia</th><th>nota</th></tr></thead>
        <tbody>
          {#each metrics as m, i (i)}
            <tr><td class="mono">{m.src}</td><td class="mono">{m.dst}</td><td class="mono" class:bad={m.code !== '200'}>{m.code}</td><td class="mono">{m.lat} ms</td><td>{m.note}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="explain" class:warn={lastResult === 'fail' || lastResult === 'open'} class:ok={hasMesh && lastResult === 'ok'}>{explain}</div>

  <div class="planos">
    <div class="plano"><strong>Data plane</strong><p>Los proxies por los que pasa cada petición: Envoy como sidecar, ztunnel y waypoint en ambient, linkerd2-proxy en Linkerd. Añaden latencia por salto y consumen CPU y RAM.</p></div>
    <div class="plano"><strong>Control plane (istiod)</strong><p>No está en la ruta del tráfico: observa la API de Kubernetes, traduce la configuración a xDS para los proxies y actúa como CA que emite y rota los certificados mTLS.</p></div>
    <div class="plano coste"><strong>Coste</strong><p>{ram}</p></div>
  </div>
</div>

<style>
  .mesh { display: grid; gap: 12px; }
  .escena { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); }
  .escena svg { display: block; width: 100%; min-width: 560px; height: auto; }
  .node { fill: var(--panel); stroke: var(--line); }
  .node.cp { stroke-dasharray: 5 4; }
  .nname { font: 500 11px var(--mono); fill: var(--ink-2); }
  .lbl { font: 500 11px var(--sans); fill: var(--ink); }
  .sub { font: 400 9px var(--mono); fill: var(--ink-3); }
  .mid { text-anchor: middle; }
  .pod { fill: var(--panel-2); stroke: var(--line); transition: stroke var(--dur); }
  .pod.sick { stroke: var(--fail); }
  .app { fill: var(--helm-2); stroke: var(--helm); }
  .envoy { fill: #efe7fb; stroke: #8250df; }
  :root[data-theme='dark'] .envoy { fill: #2a1d4a; }
  .istiod { fill: var(--wait-2); stroke: var(--wait); }
  .cfg { stroke: var(--wait); stroke-dasharray: 3 4; stroke-width: 1; opacity: 0.7; }
  .link { stroke: var(--ink-3); stroke-width: 1.5; transition: stroke var(--dur); }
  .link.secure { stroke: var(--ready); stroke-width: 2.5; }
  .lock rect { fill: var(--ready); }
  .lock path { stroke: var(--ready); stroke-width: 2; }
  .pkt { fill: var(--helm); stroke: var(--panel); stroke-width: 2; opacity: 0; transition-property: transform, opacity; transition-timing-function: linear; }
  .pkt.on { opacity: 1; }
  .pkt.fail { fill: var(--fail); }
  .pop { animation: pop var(--dur-slow) var(--ease); }
  @keyframes pop { from { opacity: 0; } to { opacity: 1; } }
  .acciones { margin-bottom: 0; }
  .caps { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
  .check { display: inline-flex; align-items: center; gap: 6px; font-weight: 400; font-size: 0.9rem; }
  .check.off { color: var(--ink-3); }
  .status { font-size: 0.9rem; color: var(--ink-2); }
  .status.ok { color: var(--ready); }
  .status.fail { color: var(--fail); }
  .tabla-wrap { overflow-x: auto; }
  .tabla { border-collapse: collapse; width: 100%; font-size: 0.82rem; }
  .tabla th, .tabla td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--line-2); white-space: nowrap; }
  .tabla th { color: var(--ink-2); font-weight: 500; }
  .tabla td.bad { color: var(--fail); font-weight: 600; }
  .planos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .plano { padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-m); font-size: 0.86rem; display: grid; gap: 4px; }
  .plano p { color: var(--ink-2); }
  .plano.coste { border-color: var(--wait); }
  @media (max-width: 700px) { .planos { grid-template-columns: 1fr; } }
</style>
