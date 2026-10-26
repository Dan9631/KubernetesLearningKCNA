<script lang="ts">
  // Resolver nombres en el clúster: construye el FQDN y simula nslookup desde pods de distintos namespaces.
  type Kind = 'ClusterIP' | 'headless' | 'pod';
  const NAMESPACES = ['lab-06', 'default', 'kube-system', 'tienda'];

  let svc = $state('tienda');
  let ns = $state('lab-06');
  let kind = $state<Kind>('ClusterIP');
  let from = $state('lab-06');
  let query = $state('tienda');

  const clean = $derived((svc.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || 'tienda'));
  const podName = '10-244-1-5';
  const fqdn = $derived(kind === 'pod' ? `${podName}.${ns}.pod.cluster.local` : `${clean}.${ns}.svc.cluster.local`);

  function hash(s: string) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 65521; return h; }
  function clusterIp(name: string, n: string) {
    if (name === 'whoami' && n === 'lab-06') return '10.96.29.208';
    if (name === 'kube-dns' && n === 'kube-system') return '10.96.0.10';
    const h = hash(`${name}.${n}`); return `10.96.${(h >> 8) % 240 + 1}.${h % 250 + 2}`;
  }
  function podIps(name: string, n: string) {
    if (name === 'whoami' && n === 'lab-06') return ['10.244.2.7', '10.244.1.4', '10.244.2.5'];
    const h = hash(`${name}.${n}`); return [`10.244.2.${h % 200 + 10}`, `10.244.1.${(h >> 3) % 200 + 10}`];
  }

  /** qué responde CoreDNS a un nombre absoluto */
  function resolve(name: string): string[] | null {
    const n = name.replace(/\.$/, '');
    if (n === fqdn) {
      if (kind === 'pod') return ['10.244.1.5'];
      if (kind === 'headless') return podIps(clean, ns);
      return [clusterIp(clean, ns)];
    }
    if (n === 'whoami.lab-06.svc.cluster.local') return ['10.96.29.208'];
    if (n === 'kube-dns.kube-system.svc.cluster.local') return ['10.96.0.10'];
    return null;
  }

  const search = $derived([`${from}.svc.cluster.local`, 'svc.cluster.local', 'cluster.local']);

  interface Attempt { name: string; answer: string[] | null }
  const attempts = $derived.by<Attempt[]>(() => {
    const q = query.trim();
    if (!q) return [];
    if (q.endsWith('.')) return [{ name: q.slice(0, -1), answer: resolve(q) }];
    const dots = (q.match(/\./g) ?? []).length;
    const list = dots < 5 ? [...search.map((d) => `${q}.${d}`), q] : [q, ...search.map((d) => `${q}.${d}`)];
    return list.map((name) => ({ name, answer: resolve(name) }));
  });
  const hit = $derived(attempts.find((a) => a.answer));

  const output = $derived.by(() => {
    const lines = ['Server:    10.96.0.10', 'Address:   10.96.0.10:53', ''];
    for (const a of attempts) {
      if (a.answer) {
        if (kind === 'headless' && a.name === fqdn) for (const ip of a.answer) lines.push(`Name:   ${a.name}`, `Address: ${ip}`);
        else lines.push(`Name:   ${a.name}`, `Address: ${a.answer[0]}`);
      } else lines.push(`** server can't find ${a.name}: NXDOMAIN`);
    }
    return lines.join('\n');
  });

  const shortNames = $derived([
    { name: kind === 'pod' ? podName : clean, desc: 'nombre corto: solo con el primer dominio de search' },
    { name: kind === 'pod' ? `${podName}.${ns}` : `${clean}.${ns}`, desc: 'con namespace: completa con svc.cluster.local' },
    { name: kind === 'pod' ? `${podName}.${ns}.pod` : `${clean}.${ns}.svc`, desc: 'completa con cluster.local' },
    { name: fqdn, desc: 'FQDN: funciona desde cualquier namespace' },
  ]);
  function worksFrom(name: string, origin: string): boolean {
    const s = [`${origin}.svc.cluster.local`, 'svc.cluster.local', 'cluster.local'];
    const dots = (name.match(/\./g) ?? []).length;
    const list = dots < 5 ? [...s.map((d) => `${name}.${d}`), name] : [name, ...s.map((d) => `${name}.${d}`)];
    return list.some((n) => resolve(n) !== null);
  }
  const origins = $derived(Array.from(new Set([ns, from, 'default'])));

  const explain = $derived.by(() => {
    if (!query.trim()) return 'Escribe un nombre para consultar.';
    const dots = (query.match(/\./g) ?? []).length;
    if (query.endsWith('.')) return `El punto final hace el nombre absoluto: el resolver no prueba ningún dominio de search y pregunta a CoreDNS tal cual. ${hit ? 'Resuelve.' : 'No existe ese registro.'}`;
    if (hit) {
      const extra = kind === 'headless' && hit.name === fqdn ? ' Como el Service es headless (clusterIP: None) no hay IP virtual: CoreDNS devuelve un registro A por cada pod Ready y el cliente elige a cuál conectar.' : kind === 'pod' && hit.name === fqdn ? ' Es el registro opcional de un pod: su IP con guiones bajo <ns>.pod.cluster.local; no es estable, por eso casi nunca se usa.' : '';
      if (hit.name === query) return `El nombre tiene ${dots} puntos (menos de ndots:5), así que el resolver probó primero los dominios de search y todos dieron NXDOMAIN; al final probó el nombre tal cual y CoreDNS respondió.${extra}`;
      const idx = attempts.findIndex((a) => a === hit);
      return `Con ndots:5, "${query}" (${dots} punto${dots === 1 ? '' : 's'}) no se considera absoluto: el resolver le añade cada dominio de search en orden. ${idx === 0 ? 'El primero, el del propio namespace del pod, acierta a la primera.' : `Los ${idx} primeros intentos fallan y acierta "${hit.name}".`} busybox muestra también los NXDOMAIN de los demás intentos, pero el que importa responde.${extra}`;
    }
    if (from !== ns && (query === clean || query === podName)) return `NXDOMAIN en todos los intentos: el pod está en "${from}" y su search empieza por ${from}.svc.cluster.local, así que "${query}" se expande a ${query}.${from}.svc.cluster.local, que no existe. Desde otro namespace hay que escribir al menos "${query}.${ns}".`;
    return 'Ningún intento resolvió: ni los dominios de search ni el nombre tal cual coinciden con un Service o pod del clúster.';
  });

  function setQ(q: string) { query = q; }
</script>

<div class="dns">
  <div class="controls">
    <label>Service <input type="text" bind:value={svc} size="10" placeholder="tienda" disabled={kind === 'pod'} /></label>
    <label>Namespace
      <select bind:value={ns}>{#each NAMESPACES as n}<option value={n}>{n}</option>{/each}</select>
    </label>
    <label>Tipo
      <select bind:value={kind} onchange={() => { query = kind === 'pod' ? podName : clean; }}>
        <option value="ClusterIP">Service ClusterIP</option>
        <option value="headless">Service headless (clusterIP: None)</option>
        <option value="pod">Pod (IP 10.244.1.5)</option>
      </select>
    </label>
  </div>

  <div class="fqdn" aria-label="Nombre completo">
    {#if kind === 'pod'}
      <span class="seg a mono">{podName}</span><span class="dot">.</span><span class="seg b mono">{ns}</span><span class="dot">.</span><span class="seg c mono">pod</span><span class="dot">.</span><span class="seg d mono">cluster.local</span>
    {:else}
      <span class="seg a mono">{clean}</span><span class="dot">.</span><span class="seg b mono">{ns}</span><span class="dot">.</span><span class="seg c mono">svc</span><span class="dot">.</span><span class="seg d mono">cluster.local</span>
    {/if}
    <div class="legend">
      <span><i class="a"></i>{kind === 'pod' ? 'IP del pod con guiones' : 'nombre del Service'}</span>
      <span><i class="b"></i>namespace</span>
      <span><i class="c"></i>{kind === 'pod' ? 'pod' : 'svc'}: tipo de registro</span>
      <span><i class="d"></i>dominio del clúster</span>
    </div>
    <p class="hint">Responde: {#if kind === 'headless'}{podIps(clean, ns).join(', ')} (las IPs de los pods){:else if kind === 'pod'}10.244.1.5{:else}{clusterIp(clean, ns)} (la ClusterIP){/if}</p>
  </div>

  <div class="tabla-wrap">
    <table class="tabla">
      <thead><tr><th>Qué escribes</th>{#each origins as o}<th>desde un pod en <span class="mono">{o}</span></th>{/each}</tr></thead>
      <tbody>
        {#each shortNames as s (s.name)}
          <tr>
            <td><button type="button" class="linkish mono" onclick={() => setQ(s.name)} title={s.desc}>{s.name}</button></td>
            {#each origins as o}
              {@const ok = worksFrom(s.name, o)}
              <td class:ok class:no={!ok}>{ok ? 'resuelve' : 'NXDOMAIN'}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="dos">
    <div class="col">
      <div class="controls">
        <label>nslookup desde un pod en
          <select bind:value={from}>{#each NAMESPACES as n}<option value={n}>{n}</option>{/each}</select>
        </label>
        <label>nombre <input type="text" bind:value={query} size="22" /></label>
      </div>
      <p class="hint mono">$ kubectl exec -n {from} cliente -- nslookup {query}</p>
      <pre aria-live="polite">{output}</pre>
      <div class="explain" class:ok={!!hit} class:fail={!hit}>{explain}</div>
    </div>
    <div class="col">
      <p class="hint mono">$ kubectl exec -n {from} cliente -- cat /etc/resolv.conf</p>
      <dl class="resolv">
        <dt class="mono">search {from}.svc.cluster.local svc.cluster.local cluster.local</dt>
        <dd>Sufijos que el resolver añade a un nombre corto, en este orden. El primero lleva el namespace del pod ({from}): por eso un nombre sin puntos encuentra Services de su propio namespace y no de otros.</dd>
        <dt class="mono">nameserver 10.96.0.10</dt>
        <dd>La ClusterIP del Service kube-dns en kube-system; detrás está CoreDNS. kubelet escribe este archivo en cada pod (dnsPolicy ClusterFirst).</dd>
        <dt class="mono">options ndots:5</dt>
        <dd>Si el nombre tiene menos de 5 puntos, se prueban primero los dominios de search y al final el nombre tal cual. Un nombre con punto final se consulta directo.</dd>
      </dl>
    </div>
  </div>
</div>

<style>
  .dns { display: grid; gap: 14px; }
  .dns label { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .dns input[type='text'] { min-width: 0; max-width: 100%; }
  .fqdn { padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); overflow-x: auto; }
  .seg { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 1.05rem; font-weight: 500; }
  .dot { color: var(--ink-3); font-family: var(--mono); padding: 0 1px; }
  .seg.a, i.a { background: var(--helm-2); color: var(--helm-ink); }
  .seg.b, i.b { background: #efe7fb; color: #5a2fb0; }
  .seg.c, i.c { background: var(--wait-2); color: #8a5208; }
  .seg.d, i.d { background: var(--ready-2); color: #136b39; }
  :root[data-theme='dark'] .seg.b, :root[data-theme='dark'] i.b { background: #2a1d4a; color: #c9b4f5; }
  :root[data-theme='dark'] .seg.c, :root[data-theme='dark'] i.c { color: #f3c47e; }
  :root[data-theme='dark'] .seg.d, :root[data-theme='dark'] i.d { color: #8fe0ae; }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 8px; font-size: 0.8rem; color: var(--ink-2); }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
  .fqdn .hint { margin-top: 6px; }
  .tabla-wrap { overflow-x: auto; }
  .tabla { border-collapse: collapse; width: 100%; font-size: 0.86rem; }
  .tabla th, .tabla td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line-2); white-space: nowrap; }
  .tabla th { color: var(--ink-2); font-weight: 500; }
  .tabla td.ok { color: var(--ready); font-weight: 600; }
  .tabla td.no { color: var(--fail); font-family: var(--mono); font-size: 0.8rem; }
  .linkish { background: none; border: 0; padding: 0; color: var(--helm); text-decoration: underline dotted; cursor: pointer; font-size: 0.86rem; }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .col { display: grid; gap: 8px; min-width: 0; align-content: start; }
  .col .controls { margin-bottom: 0; }
  .col .explain { margin-top: 0; }
  .resolv { margin: 0; display: grid; gap: 4px; font-size: 0.88rem; }
  .resolv dt { padding: 6px 10px; border-radius: var(--r-s); background: #0e1626; color: #dfe7f3; font-size: 0.8rem; overflow-x: auto; white-space: nowrap; }
  .resolv dd { margin: 0 0 8px; color: var(--ink-2); }
  @media (max-width: 700px) { .dos { grid-template-columns: 1fr; } }
</style>
