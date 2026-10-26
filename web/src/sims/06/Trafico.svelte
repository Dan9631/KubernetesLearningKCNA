<script lang="ts">
  // De la petición al pod: elige cómo exponer whoami y mira el camino que recorre cada petición.
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  import { ms, wait } from '../../lib/motion';

  type Mode = 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'Ingress' | 'Gateway';
  const MODES: { id: Mode; label: string }[] = [
    { id: 'ClusterIP', label: 'ClusterIP' },
    { id: 'NodePort', label: 'NodePort' },
    { id: 'LoadBalancer', label: 'LoadBalancer' },
    { id: 'Ingress', label: 'Ingress (Traefik)' },
    { id: 'Gateway', label: 'Gateway API (HTTPRoute)' },
  ];

  const nodes: NodeSpec[] = [
    { name: 'kcna-control-plane', role: 'control-plane' },
    { name: 'kcna-worker', role: 'worker' },
    { name: 'kcna-worker2', role: 'worker' },
  ];
  const WHOAMI = [
    { id: 'w1', name: 'whoami-6bb7cb8689-6kg4c', node: 'kcna-worker', ip: '10.244.2.7' },
    { id: 'w2', name: 'whoami-6bb7cb8689-hr2rj', node: 'kcna-worker2', ip: '10.244.1.4' },
    { id: 'w3', name: 'whoami-6bb7cb8689-rlrjv', node: 'kcna-worker', ip: '10.244.2.5' },
  ];

  interface Station { label: string; sub: string; kind: 'client' | 'edge' | 'proxy' | 'rule' | 'pod'; blocked?: boolean }

  let mode = $state<Mode>('ClusterIP');
  let keepAlive = $state(false);
  let cloud = $state(false);
  let counts = $state<Record<string, number>>({ w1: 0, w2: 0, w3: 0 });
  let served = $state<string | null>(null);
  let at = $state(-1);
  let failedAt = $state(-1);
  let busy = $state(false);
  let log = $state<string[]>([]);
  let result = $state('');
  let rr = 0;

  const viaProxy = $derived(mode === 'Ingress' || mode === 'Gateway');
  const lbPending = $derived(mode === 'LoadBalancer' && !cloud);

  const pods = $derived<PodSpec[]>([
    ...(mode === 'ClusterIP' ? [{ id: 'cli', name: 'cliente', node: 'kcna-worker', status: 'Running' as const, tag: 'busybox', color: 'c' as const }] : []),
    ...WHOAMI.map((w) => ({ id: w.id, name: w.name, node: w.node, status: 'Running' as const, tag: `${counts[w.id]} req`, highlight: served === w.id })),
  ]);

  const stations = $derived<Station[]>(
    mode === 'ClusterIP' ? [
      { kind: 'client', label: 'Pod cliente (busybox)', sub: 'wget http://whoami en kcna-worker' },
      { kind: 'rule', label: 'CoreDNS', sub: 'whoami.lab-06.svc.cluster.local = 10.96.29.208' },
      { kind: 'proxy', label: 'kube-proxy en kcna-worker', sub: 'iptables DNAT 10.96.29.208:80 a IP-del-pod:80' },
      { kind: 'pod', label: 'Pod whoami', sub: 'targetPort 80' },
    ] : mode === 'NodePort' ? [
      { kind: 'client', label: 'Navegador en Windows', sub: 'http://localhost:30080' },
      { kind: 'edge', label: 'Puerto 30080 del nodo', sub: 'kind mapea localhost:30080 a kcna-control-plane:30080' },
      { kind: 'proxy', label: 'kube-proxy en kcna-control-plane', sub: 'iptables DNAT :30080 a IP-del-pod:80' },
      { kind: 'pod', label: 'Pod whoami', sub: 'puede estar en cualquier nodo' },
    ] : mode === 'LoadBalancer' ? [
      { kind: 'client', label: 'Cliente externo', sub: cloud ? 'http://203.0.113.10' : 'http://<EXTERNAL-IP>' },
      { kind: 'edge', label: 'Balanceador del proveedor', sub: cloud ? 'EXTERNAL-IP 203.0.113.10 (cloud-controller-manager)' : 'EXTERNAL-IP <pending>: en kind no hay quien lo cree', blocked: !cloud },
      { kind: 'edge', label: 'NodePort 31234 en un nodo', sub: 'un LoadBalancer lleva un NodePort debajo' },
      { kind: 'proxy', label: 'kube-proxy', sub: 'iptables DNAT :31234 a IP-del-pod:80' },
      { kind: 'pod', label: 'Pod whoami', sub: 'targetPort 80' },
    ] : mode === 'Ingress' ? [
      { kind: 'client', label: 'Navegador en Windows', sub: 'http://localhost:8080/lab06/ingress' },
      { kind: 'edge', label: 'Puerto 80 del nodo', sub: 'kind mapea localhost:8080 a kcna-control-plane:80' },
      { kind: 'proxy', label: 'Traefik (Ingress Controller)', sub: 'IngressClass traefik' },
      { kind: 'rule', label: 'Ingress whoami', sub: 'path /lab06/ingress (Prefix) a Service whoami:80' },
      { kind: 'pod', label: 'Pod whoami', sub: 'Traefik conecta a la IP del pod (EndpointSlice)' },
    ] : [
      { kind: 'client', label: 'Navegador en Windows', sub: 'http://localhost:8080/lab06/gateway' },
      { kind: 'proxy', label: 'Gateway traefik-gateway', sub: 'namespace traefik, listener web :80' },
      { kind: 'rule', label: 'HTTPRoute whoami', sub: 'namespace lab-06, PathPrefix /lab06/gateway a whoami:80' },
      { kind: 'pod', label: 'Pod whoami', sub: 'Traefik conecta a la IP del pod (EndpointSlice)' },
    ],
  );

  const svcTable = $derived(
    mode === 'ClusterIP' ? 'NAME     TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE\nwhoami   ClusterIP   10.96.29.208   <none>        80/TCP    20s'
    : mode === 'NodePort' ? 'NAME              TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE\nwhoami-nodeport   NodePort   10.96.65.206   <none>        80:30080/TCP   3s'
    : mode === 'LoadBalancer' ? `NAME        TYPE           CLUSTER-IP      EXTERNAL-IP    PORT(S)        AGE\nwhoami-lb   LoadBalancer   10.96.112.40    ${cloud ? '203.0.113.10 ' : '<pending>    '}  80:31234/TCP   9s`
    : mode === 'Ingress' ? 'NAME     TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE\nwhoami   ClusterIP   10.96.29.208   <none>        80/TCP    4m\n\n$ kubectl get ingress -n lab-06\nNAME     CLASS     HOSTS   ADDRESS   PORTS   AGE\nwhoami   traefik   *                 80      5s'
    : 'NAME     TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE\nwhoami   ClusterIP   10.96.29.208   <none>        80/TCP    4m\n\n$ kubectl get gateway -n traefik\nNAME              CLASS     ADDRESS   PROGRAMMED   AGE\ntraefik-gateway   traefik             True         43m\n\n$ kubectl get httproute -n lab-06\nNAME     HOSTNAMES   AGE\nwhoami               8s',
  );

  const yaml = $derived(
    mode === 'ClusterIP' ? `apiVersion: v1
kind: Service
metadata:
  name: whoami
  namespace: lab-06
spec:
  type: ClusterIP        # el tipo por defecto
  selector:
    app: whoami
  ports:
    - name: http
      port: 80           # puerto del Service
      targetPort: 80     # puerto del contenedor`
    : mode === 'NodePort' ? `apiVersion: v1
kind: Service
metadata:
  name: whoami-nodeport
  namespace: lab-06
spec:
  type: NodePort
  selector:
    app: whoami
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080    # rango 30000-32767, abierto en todos los nodos`
    : mode === 'LoadBalancer' ? `apiVersion: v1
kind: Service
metadata:
  name: whoami-lb
  namespace: lab-06
spec:
  type: LoadBalancer     # pide un balanceador al proveedor (cloud-controller-manager)
  selector:
    app: whoami
  ports:
    - port: 80
      targetPort: 80
# status.loadBalancer.ingress[0].ip lo rellena el proveedor; en kind nadie lo hace`
    : mode === 'Ingress' ? `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: whoami
  namespace: lab-06
spec:
  ingressClassName: traefik
  rules:
    - http:
        paths:
          - path: /lab06/ingress
            pathType: Prefix
            backend:
              service:
                name: whoami
                port:
                  number: 80`
    : `apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: whoami
  namespace: lab-06
spec:
  parentRefs:
    - name: traefik-gateway   # Gateway de otro namespace
      namespace: traefik      # (lo permite allowedRoutes.namespaces.from: All)
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /lab06/gateway
      backendRefs:
        - name: whoami
          port: 80`,
  );

  const uses: Record<Mode, string> = {
    ClusterIP: 'Es el tipo por defecto y solo se alcanza desde dentro del clúster: el cliente resuelve el nombre en CoreDNS, obtiene la ClusterIP (10.96.29.208, una IP virtual que no pertenece a ninguna interfaz) y kube-proxy, en el nodo del cliente, traduce esa IP a la de un pod con reglas iptables (DNAT). Úsalo para la comunicación interna entre microservicios.',
    NodePort: 'Abre el mismo puerto (30000-32767) en todos los nodos; kind lo mapea a localhost:30080 en Windows. El paquete entra por el nodo y kube-proxy lo traduce a la IP de un pod, aunque el pod esté en otro nodo. Sirve para pruebas y entornos sin balanceador; en producción se usa como escalón del LoadBalancer.',
    LoadBalancer: 'Apila NodePort y ClusterIP y además pide una IP externa a un balanceador del proveedor a través del cloud-controller-manager. En kind no hay proveedor cloud ni MetalLB, así que nadie rellena status.loadBalancer y EXTERNAL-IP se queda en <pending> para siempre; el Service sigue funcionando por su NodePort. Es la forma habitual de exponer un servicio L4 en la nube.',
    Ingress: 'Un único punto de entrada HTTP para muchas apps: el objeto Ingress solo describe reglas (host, path) y no hace nada sin un Ingress Controller. Aquí Traefik escucha en el puerto 80 del nodo control-plane (localhost:8080) y reenvía a los pods usando los EndpointSlices, sin pasar por la ClusterIP ni por kube-proxy. Solo HTTP/HTTPS; los extras dependen de anotaciones.',
    Gateway: 'El sucesor de Ingress, orientado a roles: el operador define el Gateway (traefik-gateway, listener web) y tu equipo cuelga una HTTPRoute en su propio namespace con parentRefs. Pesos, cabeceras y reescrituras están en la especificación, no en anotaciones, y además sirve para gRPC, TLS y TCP. Traefik implementa ambas APIs con el mismo proxy.',
  };

  function pick(): string {
    if (viaProxy) { const w = WHOAMI[rr % WHOAMI.length]; rr += 1; return w.id; }
    return WHOAMI[Math.floor(Math.random() * WHOAMI.length)].id;
  }

  function reset() {
    counts = { w1: 0, w2: 0, w3: 0 }; served = null; at = -1; failedAt = -1; log = []; result = ''; rr = 0;
  }
  function setMode(m: Mode) { if (busy) return; mode = m; reset(); }

  async function send() {
    if (busy) return;
    busy = true; reset();
    const sts = stations;
    const last = sts.length - 1;
    let sticky: string | null = null;
    for (let n = 1; n <= 6; n += 1) {
      for (let s = 0; s < last; s += 1) {
        at = s; await wait(170);
        if (sts[s].blocked) break;
      }
      if (sts.some((s) => s.blocked)) {
        failedAt = sts.findIndex((s) => s.blocked);
        log = [...log, `petición ${n}: no hay EXTERNAL-IP, el cliente externo no tiene a dónde conectar`];
        await wait(300);
        break;
      }
      let id: string;
      if (!viaProxy && keepAlive) { sticky = sticky ?? WHOAMI[Math.floor(Math.random() * WHOAMI.length)].id; id = sticky; }
      else id = pick();
      at = last; served = id;
      counts = { ...counts, [id]: counts[id] + 1 };
      const w = WHOAMI.find((x) => x.id === id)!;
      log = [...log, `petición ${n}: Hostname: ${w.name} (${w.ip}, ${w.node})`];
      await wait(260);
      served = null;
    }
    at = -1;
    if (lbPending) {
      result = 'Ninguna petición llegó: el Service existe y tiene ClusterIP y NodePort, pero EXTERNAL-IP sigue en <pending> porque en kind no hay cloud-controller-manager ni MetalLB que asigne una IP. Marca "simular un proveedor cloud" para ver el camino completo, o usa el NodePort 31234 que lleva debajo.';
    } else {
      const dist = WHOAMI.map((w) => `${counts[w.id]}`).join(' / ');
      const distinct = WHOAMI.filter((w) => counts[w.id] > 0).length;
      if (viaProxy) result = `Reparto ${dist}: Traefik es un proxy L7 y balancea por petición (round robin) aunque el navegador reutilice la conexión, porque abre sus propias conexiones hacia los pods.`;
      else if (keepAlive) result = `Reparto ${dist}: las 6 peticiones fueron al mismo pod. kube-proxy balancea por conexión TCP, y con keep-alive el cliente reutiliza la misma; es lo que viste con Invoke-WebRequest sin -DisableKeepAlive.`;
      else result = `Reparto ${dist} entre ${distinct} pod${distinct === 1 ? '' : 's'}: cada petición abrió una conexión nueva y kube-proxy eligió un pod al azar por conexión (iptables no hace round robin estricto), así que el reparto no es exacto.`;
    }
    busy = false;
  }
</script>

<div class="trafico">
  <div class="controls" role="group" aria-label="Forma de exponer el Service">
    <span class="hint">Exponer whoami con</span>
    {#each MODES as m (m.id)}
      <button type="button" class="btn small" class:primary={mode === m.id} aria-pressed={mode === m.id} onclick={() => setMode(m.id)} disabled={busy}>{m.label}</button>
    {/each}
  </div>

  <div class="scene">
    <div class="ruta" aria-label="Camino de la petición">
      <div class="ruta-inner">
        {#each stations as s, i (mode + i)}
          <div class="station {s.kind}" class:cur={at === i} class:blocked={s.blocked} class:failed={failedAt === i}>
            <strong>{s.label}</strong>
            <span class="mono">{s.sub}</span>
          </div>
        {/each}
        <span class="pkt" class:fail={failedAt >= 0} class:on={at >= 0} style={`left: calc(${at < 0 ? 0 : at + 0.5} * 100% / ${stations.length}); transition-duration: ${ms(170)}ms`} aria-hidden="true"></span>
      </div>
    </div>

    <ClusterCanvas {nodes} {pods} pendingTray={false} compact showLabels={false}>
      {#snippet nodeFooter(n)}
        <span class="mono">kube-proxy (iptables)</span>
        {#if viaProxy && n.role === 'control-plane'}<span class="mono"> · traefik :80</span>{/if}
        {#if mode === 'NodePort' || mode === 'LoadBalancer'}<span class="mono"> · :{mode === 'NodePort' ? 30080 : 31234} abierto</span>{/if}
      {/snippet}
    </ClusterCanvas>
  </div>

  <div class="controls acciones">
    <button type="button" class="btn primary" onclick={send} disabled={busy}>{busy ? 'Enviando…' : 'Enviar 6 peticiones'}</button>
    {#if !viaProxy}
      <label class="check"><input type="checkbox" bind:checked={keepAlive} disabled={busy} /> reutilizar la conexión (keep-alive)</label>
    {/if}
    {#if mode === 'LoadBalancer'}
      <label class="check"><input type="checkbox" bind:checked={cloud} disabled={busy} onchange={reset} /> simular un proveedor cloud (asigna EXTERNAL-IP)</label>
    {/if}
    <button type="button" class="btn small" onclick={reset} disabled={busy}>Reiniciar contadores</button>
  </div>

  {#if log.length}
    <ol class="log mono" aria-live="polite">
      {#each log as l}<li>{l}</li>{/each}
    </ol>
  {/if}

  <div class="explain" class:warn={lbPending} class:ok={result !== '' && !lbPending}>
    {#if result}<p><strong>{result}</strong></p>{/if}
    <p>{uses[mode]}</p>
  </div>

  <div class="dos">
    <div>
      <p class="hint mono">$ kubectl get svc -n lab-06</p>
      <pre>{svcTable}</pre>
    </div>
    <div>
      <p class="hint mono">{mode === 'Ingress' ? '05-ingress.yaml' : mode === 'Gateway' ? '06-httproute.yaml' : 'Service'}</p>
      <pre>{yaml}</pre>
    </div>
  </div>
</div>

<style>
  .trafico { display: grid; gap: 12px; }
  .scene { display: grid; gap: 12px; }
  .ruta { overflow-x: auto; padding-bottom: 4px; }
  .ruta-inner { position: relative; display: flex; min-width: max-content; padding-top: 22px; }
  .ruta-inner::before { content: ''; position: absolute; left: 6%; right: 6%; top: 9px; border-top: 2px dashed var(--line); }
  .station { flex: 1 0 0; min-width: 150px; max-width: 190px; margin: 0 4px; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); display: grid; gap: 3px; font-size: 0.8rem; transition: border-color var(--dur), box-shadow var(--dur), opacity var(--dur); }
  .station strong { font-weight: 600; font-size: 0.82rem; line-height: 1.25; }
  .station .mono { color: var(--ink-2); font-size: 0.72rem; line-height: 1.3; word-break: break-word; }
  .station.cur { border-color: var(--helm); box-shadow: 0 0 0 3px var(--helm-2); }
  .station.pod.cur { border-color: var(--ready); box-shadow: 0 0 0 3px var(--ready-2); }
  .station.blocked { border-style: dashed; opacity: 0.75; }
  .station.failed { border-color: var(--fail); background: var(--fail-2); opacity: 1; }
  .pkt { position: absolute; top: 3px; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: var(--helm); box-shadow: 0 0 0 3px var(--helm-2); opacity: 0; transition-property: left, opacity; transition-timing-function: linear; }
  .pkt.on { opacity: 1; }
  .pkt.fail { background: var(--fail); box-shadow: 0 0 0 3px var(--fail-2); }
  .acciones { margin-bottom: 0; }
  .check { display: inline-flex; align-items: center; gap: 6px; font-weight: 400; font-size: 0.9rem; }
  .log { margin: 0; padding: 0 0 0 1.4em; font-size: 0.78rem; color: var(--ink-2); display: grid; gap: 2px; }
  .explain p + p { margin-top: 8px; }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .dos > div { display: grid; gap: 6px; min-width: 0; }
  @media (max-width: 700px) { .dos { grid-template-columns: 1fr; } }
</style>
