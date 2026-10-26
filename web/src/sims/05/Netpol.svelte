<script lang="ts">
  // NetworkPolicy en vivo: tres pods de lab-05 y un cliente de otro namespace; activa políticas y prueba el tráfico.
  import { ms, wait } from '../../lib/motion';

  interface Pod { id: string; label: string; sub: string; ns: string; labels: Record<string, string>; x: number; y: number }
  const PODS: Record<string, Pod> = {
    intruso: { id: 'intruso', label: 'intruso', sub: 'ns default · role=otro', ns: 'default', labels: { role: 'otro' }, x: 90, y: 62 },
    frontend: { id: 'frontend', label: 'frontend', sub: 'role=frontend', ns: 'lab-05', labels: { role: 'frontend' }, x: 90, y: 232 },
    api: { id: 'api', label: 'api', sub: 'app=api · :8080', ns: 'lab-05', labels: { app: 'api' }, x: 320, y: 147 },
    db: { id: 'db', label: 'db', sub: 'app=db · :6379', ns: 'lab-05', labels: { app: 'db' }, x: 550, y: 147 },
  };
  interface Flow { src: string; dst: string; port: number }
  const FLOWS: Flow[] = [
    { src: 'frontend', dst: 'api', port: 8080 },
    { src: 'intruso', dst: 'api', port: 8080 },
    { src: 'api', dst: 'db', port: 6379 },
    { src: 'frontend', dst: 'db', port: 6379 },
    { src: 'intruso', dst: 'db', port: 6379 },
  ];
  interface Policy { id: string; name: string; selector: Record<string, string>; ingress: { from: Record<string, string>; port: number }[]; yaml: string }
  const POLICIES: Policy[] = [
    { id: 'deny', name: 'default-deny-ingress', selector: {}, ingress: [], yaml: `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny-ingress\n  namespace: lab-05\nspec:\n  podSelector: {}        # todos los pods del namespace\n  policyTypes:\n    - Ingress            # sin reglas ingress: nada entra` },
    { id: 'front', name: 'permitir-frontend', selector: { app: 'api' }, ingress: [{ from: { role: 'frontend' }, port: 8080 }], yaml: `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: permitir-frontend\n  namespace: lab-05\nspec:\n  podSelector:\n    matchLabels: { app: api }\n  policyTypes:\n    - Ingress\n  ingress:\n    - from:\n        - podSelector:\n            matchLabels: { role: frontend }\n      ports:\n        - protocol: TCP\n          port: 8080       # puerto del contenedor, no del Service` },
    { id: 'dbapi', name: 'db-solo-api', selector: { app: 'db' }, ingress: [{ from: { app: 'api' }, port: 6379 }], yaml: `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: db-solo-api\n  namespace: lab-05\nspec:\n  podSelector:\n    matchLabels: { app: db }\n  policyTypes:\n    - Ingress\n  ingress:\n    - from:\n        - podSelector:\n            matchLabels: { app: api }\n      ports:\n        - protocol: TCP\n          port: 6379` },
  ];

  let active = $state<string[]>([]);
  let results = $state<Record<string, { ok: boolean; why: string }>>({});
  let cur = $state<Flow | null>(null);
  let pkt = $state({ x: 0, y: 0, show: false, blocked: false });
  let busy = $state(false);
  let note = $state('Sin políticas, todos los pods pueden hablar con todos, incluso desde otros namespaces. Activa políticas y pulsa Probar tráfico.');
  let noteKind = $state<'' | 'ok' | 'warn' | 'fail'>('');

  const key = (f: Flow) => `${f.src}>${f.dst}`;
  const matches = (sel: Record<string, string>, labels: Record<string, string>) => Object.entries(sel).every(([k, v]) => labels[k] === v);
  const activePolicies = $derived(POLICIES.filter((p) => active.includes(p.id)));

  function evaluate(f: Flow): { ok: boolean; why: string } {
    const src = PODS[f.src], dst = PODS[f.dst];
    const selecting = activePolicies.filter((p) => matches(p.selector, dst.labels));
    if (!selecting.length) return { ok: true, why: `ninguna política selecciona a ${dst.id}: acepta todo el tráfico.` };
    for (const p of selecting) {
      for (const r of p.ingress) {
        if (src.ns === 'lab-05' && matches(r.from, src.labels) && r.port === f.port) return { ok: true, why: `${p.name} permite ${src.id} (${Object.entries(r.from).map(([k, v]) => `${k}=${v}`).join(',')}) hacia ${dst.id}:${f.port}.` };
      }
    }
    const extra = src.ns !== 'lab-05' ? ` ${src.id} está en el namespace ${src.ns}: un podSelector solo mira pods del namespace de la política; haría falta un namespaceSelector.` : '';
    return { ok: false, why: `${dst.id} está seleccionado por ${selecting.map((p) => p.name).join(' y ')} y ninguna regla incluye a ${src.id}:${f.port}. Los paquetes se descartan sin respuesta.${extra}` };
  }

  async function probar() {
    if (busy) return;
    busy = true; results = {};
    for (const f of FLOWS) {
      const src = PODS[f.src], dst = PODS[f.dst];
      const r = evaluate(f);
      cur = f;
      pkt = { x: src.x, y: src.y, show: true, blocked: false };
      await wait(60);
      const t = r.ok ? 1 : 0.62;
      pkt = { x: src.x + (dst.x - src.x) * t, y: src.y + (dst.y - src.y) * t, show: true, blocked: !r.ok };
      await wait(750);
      results = { ...results, [key(f)]: r };
      pkt = { ...pkt, show: false };
      await wait(250);
    }
    cur = null; busy = false;
    const blocked = FLOWS.filter((f) => !results[key(f)].ok).length;
    noteKind = blocked ? 'warn' : 'ok';
    note = blocked === 0 ? 'Todo pasa: sin políticas que seleccionen a un pod, ese pod acepta cualquier origen.' : `${blocked} de ${FLOWS.length} conexiones bloqueadas. Fíjate en el síntoma: no hay "connection refused", el cliente agota el tiempo (wget: download timed out) porque el CNI descarta los paquetes.`;
  }

  function setPolicies(ids: string[], text: string, kind: '' | 'ok' | 'warn' | 'fail' = '') {
    if (busy) return;
    active = ids; results = {}; note = text; noteKind = kind;
  }
  function toggle(id: string) {
    const on = !active.includes(id);
    const ids = on ? [...active, id] : active.filter((x) => x !== id);
    const texts: Record<string, [string, string]> = {
      deny: ['default-deny-ingress: podSelector {} selecciona a todos los pods de lab-05 para Ingress y no tiene reglas, así que nadie puede entrar. intruso, en otro namespace, no está seleccionado pero tampoco puede llegar a nadie de lab-05.', 'Sin default deny: los pods de lab-05 que no estén seleccionados por otra política vuelven a aceptar todo.'],
      front: ['permitir-frontend: abre role=frontend hacia app=api en el puerto 8080 (el del contenedor, no el 80 del Service). Las políticas se suman: si también hay default deny, este es el único hueco hacia api.', 'Sin permitir-frontend: si queda el default deny, api no acepta a nadie.'],
      dbapi: ['db-solo-api: solo app=api puede entrar a app=db por TCP 6379. Al seleccionar a db para Ingress, db pasa a denegar por defecto todo lo demás aunque no exista default deny.', 'Sin db-solo-api: db ya no está seleccionado (salvo por el default deny) y acepta lo que le llegue.'],
    };
    setPolicies(ids, texts[id][on ? 0 : 1], on ? 'warn' : '');
  }
  const outputOf = (f: Flow) => {
    const r = results[key(f)];
    if (!r) return '';
    return r.ok ? (f.dst === 'api' ? 'hola-desde-api' : '+PONG') : 'wget: download timed out\ncommand terminated with exit code 1';
  };
  const cmdOf = (f: Flow) => `kubectl exec -n ${PODS[f.src].ns} ${f.src} -- wget -qO- -T 3 http://${f.dst}.lab-05:${f.port}`;
  const edgeClass = (f: Flow) => { const r = results[key(f)]; return r ? (r.ok ? 'ok' : 'blocked') : cur && key(cur) === key(f) ? 'cur' : ''; };
</script>

<div class="netpol">
  <div class="controls">
    <button type="button" class="btn small" class:on={active.length === 0} aria-pressed={active.length === 0} onclick={() => setPolicies([], 'Sin políticas: todo el tráfico pasa, dentro y entre namespaces. Es el comportamiento por defecto de Kubernetes.')} disabled={busy}>Sin políticas</button>
    <button type="button" class="btn small" class:on={active.includes('deny')} aria-pressed={active.includes('deny')} onclick={() => toggle('deny')} disabled={busy}>default-deny en lab-05</button>
    <button type="button" class="btn small" class:on={active.includes('front')} aria-pressed={active.includes('front')} onclick={() => toggle('front')} disabled={busy}>permitir frontend a api</button>
    <button type="button" class="btn small" class:on={active.includes('dbapi')} aria-pressed={active.includes('dbapi')} onclick={() => toggle('dbapi')} disabled={busy}>permitir api a db</button>
    <button type="button" class="btn small primary" onclick={probar} disabled={busy}>Probar tráfico</button>
  </div>

  <div class="scene">
    <div class="wrap"><svg viewBox="0 0 640 300" role="img" aria-label="pods frontend, api, db en lab-05 y un intruso en default">
      <rect x="22" y="110" width="600" height="180" rx="12" class="nsbox" />
      <text x="36" y="134" class="nslabel">namespace lab-05{active.length ? ` · ${activePolicies.map((p) => p.name).join(', ')}` : ' · sin NetworkPolicy'}</text>
      {#each FLOWS as f (key(f))}
        {@const s = PODS[f.src]}
        {@const d = PODS[f.dst]}
        <line x1={s.x} y1={s.y} x2={d.x} y2={d.y} class="edge {edgeClass(f)}" />
        {#if results[key(f)]}
          {@const mx = (s.x + d.x) / 2}
          {@const my = (s.y + d.y) / 2}
          <g class="mark {results[key(f)].ok ? 'ok' : 'blocked'}" transform={`translate(${mx} ${my})`}>
            <circle r="9" />
            <text y="4">{results[key(f)].ok ? '✓' : '✕'}</text>
          </g>
        {/if}
      {/each}
      {#each Object.values(PODS) as p (p.id)}
        <g class="pod" class:ext={p.ns !== 'lab-05'} class:selected={activePolicies.some((q) => p.ns === 'lab-05' && matches(q.selector, p.labels))} transform={`translate(${p.x} ${p.y})`}>
          <rect x="-54" y="-24" width="108" height="48" rx="10" />
          <text y="-4" class="name">{p.label}</text>
          <text y="13" class="sub">{p.sub}</text>
        </g>
      {/each}
      {#if pkt.show}
        <g class="pkt" class:blocked={pkt.blocked} style={`transform: translate(${pkt.x}px, ${pkt.y}px); transition: transform ${ms(700)}ms var(--ease)`}>
          <circle r="7" />
        </g>
      {/if}
    </svg></div>
    <p class="legend"><span class="sw sel"></span> pod seleccionado por una política (deniega por defecto en Ingress) · <span class="sw ok"></span> permitido · <span class="sw blocked"></span> bloqueado</p>
  </div>

  <div class="explain {noteKind}" aria-live="polite">{note}</div>

  <div class="bottom">
    <section>
      <h4>Resultado de cada prueba</h4>
      <ol class="tests">
        {#each FLOWS as f (key(f))}
          {@const r = results[key(f)]}
          <li class={r ? (r.ok ? 'ok' : 'blocked') : ''}>
            <code class="mono">$ {cmdOf(f)}</code>
            {#if r}<pre>{outputOf(f)}</pre><p>{r.why}</p>{:else}<p class="hint">pendiente de probar</p>{/if}
          </li>
        {/each}
      </ol>
    </section>
    <section>
      <h4>Políticas activas (YAML)</h4>
      {#if activePolicies.length}
        <pre>{activePolicies.map((p) => p.yaml).join('\n---\n')}</pre>
      {:else}
        <pre>$ kubectl get networkpolicy -n lab-05
No resources found in lab-05 namespace.</pre>
      {/if}
      <p class="hint">Las políticas son aditivas (unión de permisos, sin reglas de denegar). Estas solo restringen Ingress: el tráfico de salida y el DNS siguen funcionando. Las aplica el CNI (kindnet en este clúster); con un CNI sin soporte no pasaría nada y sin error.</p>
    </section>
  </div>
</div>

<style>
  .netpol { display: grid; gap: 12px; }
  .controls { margin: 0; }
  .btn.on { border-color: var(--helm); background: var(--helm-2); color: var(--helm-ink); }
  .scene { display: grid; gap: 4px; }
  .wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); }
  svg { width: 100%; min-width: 480px; height: auto; display: block; }
  .nsbox { fill: var(--panel); stroke: var(--line); stroke-dasharray: 5 4; }
  .nslabel { font: 500 11px var(--mono); fill: var(--ink-3); }
  .edge { stroke: var(--line); stroke-width: 2; transition: stroke var(--dur); }
  .edge.cur { stroke: var(--helm); }
  .edge.ok { stroke: var(--ready); }
  .edge.blocked { stroke: var(--fail); stroke-dasharray: 4 4; }
  .pod rect { fill: var(--panel); stroke: var(--line); stroke-width: 1.5; transition: stroke var(--dur), fill var(--dur); }
  .pod.ext rect { stroke-dasharray: 4 3; }
  .pod.selected rect { stroke: var(--wait); fill: var(--wait-2); }
  .pod text { text-anchor: middle; fill: var(--ink); }
  .pod .name { font: 600 13px var(--mono); }
  .pod .sub { font: 10px var(--mono); fill: var(--ink-3); }
  .pkt circle { fill: var(--helm); }
  .pkt.blocked circle { fill: var(--fail); }
  .mark circle { fill: var(--panel); stroke-width: 2; }
  .mark.ok circle { stroke: var(--ready); }
  .mark.blocked circle { stroke: var(--fail); }
  .mark text { text-anchor: middle; font: 700 12px var(--sans); }
  .mark.ok text { fill: var(--ready); }
  .mark.blocked text { fill: var(--fail); }
  .legend { font-size: 0.78rem; color: var(--ink-3); }
  .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; vertical-align: middle; border: 1px solid var(--line); }
  .sw.sel { background: var(--wait-2); border-color: var(--wait); }
  .sw.ok { background: var(--ready); }
  .sw.blocked { background: var(--fail); }
  .bottom { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
  @media (max-width: 760px) { .bottom { grid-template-columns: 1fr; } }
  h4 { font-size: 0.92rem; font-weight: 600; margin-bottom: 8px; }
  .tests { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .tests li { border: 1px solid var(--line); border-left-width: 4px; border-radius: var(--r-s); padding: 6px 10px; display: grid; gap: 4px; font-size: 0.84rem; }
  .tests li.ok { border-left-color: var(--ready); }
  .tests li.blocked { border-left-color: var(--fail); }
  .tests code { font-size: 0.74rem; color: var(--ink-2); word-break: break-all; }
  .tests pre { font-size: 0.76rem; padding: 6px 10px; }
  .tests p { color: var(--ink-2); }
  section pre { white-space: pre-wrap; }
  section .hint { margin-top: 8px; }
</style>
