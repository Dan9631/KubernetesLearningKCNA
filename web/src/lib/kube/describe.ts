// kubectl describe para pod, deployment, replicaset, service, node, namespace, configmap y secret.
import { type Cluster, type Pod, type Deployment, type ReplicaSet, type Service, type Node, type Namespace, type ConfigMap, type Secret, type Labels, KUBE_VERSION } from './cluster.ts';
import { age, table, rfc1123 } from './format.ts';
import { OS_IMAGE, KERNEL, RUNTIME, apiToken, containerID, imageID } from './objects.ts';

const labelLines = (l: Labels) => { const e = Object.entries(l).sort(([a], [b]) => a.localeCompare(b)); return e.length ? e.map(([k, v]) => `${k}=${v}`) : ['<none>']; };
const annLines = (l: Labels) => { const e = Object.entries(l).filter(([k]) => !k.startsWith('__')).sort(([a], [b]) => a.localeCompare(b)); return e.length ? e.map(([k, v]) => `${k}: ${v}`) : ['<none>']; };

/** Pares "Clave:   valor" alineados; los valores multilínea se sangran bajo la primera línea. */
function kv(pairs: [string, string | string[]][], width?: number): string[] {
  const w = width ?? Math.max(...pairs.map(([k]) => k.length + 1)) + 2;
  const out: string[] = [];
  for (const [k, v] of pairs) {
    const vals = Array.isArray(v) ? v : [v];
    if (k.endsWith(':') && !vals.length) { out.push(k); continue; }
    out.push(`${k}:`.padEnd(w) + vals[0]);
    for (const extra of vals.slice(1)) out.push(' '.repeat(w) + extra);
  }
  return out;
}

export function eventsSection(c: Cluster, ns: string | undefined, object: string, width = 0): string[] {
  const evs = c.events.filter((e) => e.object === object && (ns === undefined || e.namespace === ns));
  if (!evs.length) return [`${'Events:'.padEnd(width)}<none>`];
  const rows = [['Type', 'Reason', 'Age', 'From', 'Message'], ['----', '------', '---', '----', '-------']];
  for (const e of evs) rows.push([e.type, e.reason, e.count > 1 ? `${age(c.now - e.time)} (x${e.count} over ${age(c.now - e.first)})` : age(c.now - e.time), e.from, e.message]);
  return ['Events:', ...table(rows, 2).map((l) => '  ' + l)];
}

export function describePod(c: Cluster, p: Pod): string[] {
  const node = p.spec.nodeName ? c.node(p.spec.nodeName) : undefined;
  const status = c.podStatus(p);
  const ct = p.spec.containers[0];
  const waitingReason = ['ContainerCreating', 'ErrImagePull', 'ImagePullBackOff', 'CrashLoopBackOff'].includes(status) ? status : undefined;
  const out = kv([
    ['Name', p.meta.name], ['Namespace', p.meta.namespace!], ['Priority', '0'], ['Service Account', 'default'],
    ['Node', node ? `${node.meta.name}/${node.internalIP}` : '<none>'],
    ['Start Time', p.spec.nodeName ? rfc1123(p.status.scheduledAt ?? p.meta.created) : ''],
    ['Labels', labelLines(p.meta.labels)], ['Annotations', annLines(p.meta.annotations)],
    ['Status', p.status.deleting ? 'Terminating (lasts <invalid>)' : p.status.phase],
    ['IP', p.status.ip && p.spec.nodeName ? p.status.ip : ''],
  ].filter(([, v]) => v !== '') as [string, string | string[]][], 18);
  if (p.status.ip && p.spec.nodeName) out.push('IPs:', `  IP:           ${p.status.ip}`);
  if (p.meta.owner) out.push(`Controlled By:  ${p.meta.owner.kind}/${p.meta.owner.name}`);
  out.push('Containers:');
  for (const cc of p.spec.containers) {
    const started = p.status.phase === 'Running' || p.status.restarts > 0;
    const lines: [string, string | string[]][] = [
      ['Container ID', started ? containerID(p, cc) : ''], ['Image', cc.image], ['Image ID', started ? imageID(cc) : ''],
      ['Port', cc.ports.length ? cc.ports.map((x) => `${x}/TCP`).join(', ') : '<none>'], ['Host Port', cc.ports.length ? cc.ports.map(() => '0/TCP').join(', ') : '<none>'],
    ];
    if (cc.command?.length) lines.push(['Command', cc.command]);
    if (!p.spec.nodeName) lines.push(['State', 'Waiting'], ['Reason', 'ContainerCreating']);
    else if (waitingReason) lines.push(['State', 'Waiting'], ['  Reason', waitingReason]);
    else if (status === 'Completed' || status === 'Error') lines.push(['State', 'Terminated'], ['  Reason', status], ['  Exit Code', status === 'Error' ? '1' : '0'], ['  Started', rfc1123(p.status.startedAt ?? c.now)], ['  Finished', rfc1123(c.now)]);
    else lines.push(['State', 'Running'], ['  Started', rfc1123(p.status.lastRestart ?? p.status.startedAt ?? c.now)]);
    if (p.status.restarts > 0 && waitingReason === 'CrashLoopBackOff') lines.push(['Last State', 'Terminated'], ['  Reason', 'Completed'], ['  Exit Code', '0'], ['  Started', rfc1123((p.status.lastRestart ?? c.now) - 1000)], ['  Finished', rfc1123(p.status.lastRestart ?? c.now)]);
    lines.push(['Ready', p.status.ready ? 'True' : 'False'], ['Restart Count', String(p.status.restarts)],
      ['Environment', Object.keys(cc.env).length ? Object.entries(cc.env).map(([k, v]) => `${k}:  ${v}`) : '<none>'],
      ['Mounts', ['']]);
    out.push(`  ${cc.name}:`);
    for (const l of kv(lines.map(([k, v]) => [k, v === '' ? '' : v]), 16)) out.push('    ' + l);
    out.pop();
    out.push('    Mounts:', `      /var/run/secrets/kubernetes.io/serviceaccount from ${apiToken(p)} (ro)`);
  }
  const T = (ok: boolean) => (ok ? 'True ' : 'False');
  out.push('Conditions:', '  Type                        Status');
  if (p.spec.nodeName) out.push(`  PodReadyToStartContainers   ${T(p.status.phase === 'Running' || !!p.status.reason && p.status.reason !== 'ContainerCreating')}`, `  Initialized                 True `, `  Ready                       ${T(p.status.ready)}`, `  ContainersReady             ${T(p.status.ready)}`, `  PodScheduled                True `);
  else out.push('  PodScheduled                False');
  out.push('Volumes:', `  ${apiToken(p)}:`, '    Type:                    Projected (a volume that contains injected data from multiple sources)', '    TokenExpirationSeconds:  3607', '    ConfigMapName:           kube-root-ca.crt', '    Optional:                false', '    DownwardAPI:             true');
  out.push(...kv([
    ['QoS Class', 'BestEffort'],
    ['Node-Selectors', p.spec.nodeSelector && Object.keys(p.spec.nodeSelector).length ? labelLines(p.spec.nodeSelector) : '<none>'],
    ['Tolerations', [...p.spec.tolerations.map((t) => `${t.split(':')[0]}:${t.split(':')[1]} op=Exists`), 'node.kubernetes.io/not-ready:NoExecute op=Exists for 300s', 'node.kubernetes.io/unreachable:NoExecute op=Exists for 300s']],
  ], 29));
  out.push(...eventsSection(c, p.meta.namespace, `pod/${p.meta.name}`, 29));
  return out;
}

function templateSection(t: Pod['spec'] | Deployment['spec']['template']): string[] {
  const out = ['Pod Template:', `  Labels:  ${labelLines(t.labels).join('\n           ')}`];
  if (Object.keys(t.annotations).length) out.push(`  Annotations:  ${annLines(t.annotations).join('\n                ')}`);
  out.push('  Containers:');
  for (const cc of t.containers) {
    out.push(`   ${cc.name}:`);
    const lines: [string, string | string[]][] = [['Image', cc.image], ['Port', cc.ports.length ? cc.ports.map((x) => `${x}/TCP`).join(', ') : '<none>'], ['Host Port', cc.ports.length ? cc.ports.map(() => '0/TCP').join(', ') : '<none>']];
    if (cc.command?.length) lines.push(['Command', cc.command]);
    lines.push(['Environment', Object.keys(cc.env).length ? Object.entries(cc.env).map(([k, v]) => `${k}:  ${v}`) : '<none>'], ['Mounts', '<none>']);
    for (const l of kv(lines, 15)) out.push('    ' + l);
  }
  out.push('  Volumes:         <none>', `  Node-Selectors:  ${t.nodeSelector && Object.keys(t.nodeSelector).length ? labelLines(t.nodeSelector).join(',') : '<none>'}`, `  Tolerations:     ${t.tolerations.length ? t.tolerations.map((x) => x + ' op=Exists').join('\n                   ') : '<none>'}`);
  return out.flatMap((l) => l.split('\n'));
}

export function describeDeployment(c: Cluster, d: Deployment): string[] {
  const st = c.deploymentStatus(d);
  const rss = c.rsOf(d);
  const nrs = c.newRs(d);
  const old = rss.filter((r) => r !== nrs && r.spec.replicas > 0);
  const minAvail = st.available >= d.spec.replicas - (d.spec.maxUnavailable.endsWith('%') ? Math.floor((d.spec.replicas * parseInt(d.spec.maxUnavailable)) / 100) : parseInt(d.spec.maxUnavailable));
  const complete = st.ready === d.spec.replicas && st.updated === d.spec.replicas && st.replicas === d.spec.replicas;
  const out = kv([
    ['Name', d.meta.name], ['Namespace', d.meta.namespace!], ['CreationTimestamp', rfc1123(d.meta.created)],
    ['Labels', labelLines(d.meta.labels)], ['Annotations', annLines({ 'deployment.kubernetes.io/revision': String(st.revision), ...d.meta.annotations })],
    ['Selector', labelLines(d.spec.selector).join(',')],
    ['Replicas', `${d.spec.replicas} desired | ${st.updated} updated | ${st.replicas} total | ${st.available} available | ${st.unavailable} unavailable`],
    ['StrategyType', d.spec.strategy], ['MinReadySeconds', '0'],
    ...(d.spec.strategy === 'RollingUpdate' ? [['RollingUpdateStrategy', `${d.spec.maxUnavailable} max unavailable, ${d.spec.maxSurge} max surge`] as [string, string]] : []),
  ], 24);
  out.push(...templateSection(d.spec.template));
  out.push('Conditions:', '  Type           Status  Reason', '  ----           ------  ------',
    `  Available      ${minAvail ? 'True ' : 'False'}   ${minAvail ? 'MinimumReplicasAvailable' : 'MinimumReplicasUnavailable'}`,
    `  Progressing    True    ${complete ? 'NewReplicaSetAvailable' : 'ReplicaSetUpdated'}`);
  out.push(`OldReplicaSets:  ${old.length ? old.map((r) => `${r.meta.name} (${c.podsOf(r).filter((p) => !p.status.deleting).length}/${r.spec.replicas} replicas created)`).join(', ') : rss.filter((r) => r !== nrs).map((r) => `${r.meta.name} (0/0 replicas created)`).join(', ') || '<none>'}`);
  out.push(`NewReplicaSet:   ${nrs ? `${nrs.meta.name} (${c.podsOf(nrs).filter((p) => !p.status.deleting).length}/${nrs.spec.replicas} replicas created)` : '<none>'}`);
  out.push(...eventsSection(c, d.meta.namespace, `deployment/${d.meta.name}`, 17));
  return out;
}

export function describeReplicaSet(c: Cluster, r: ReplicaSet): string[] {
  const pods = c.podsOf(r);
  const d = r.meta.owner ? c.deployment(r.meta.namespace!, r.meta.owner.name) : undefined;
  const out = kv([
    ['Name', r.meta.name], ['Namespace', r.meta.namespace!], ['Selector', labelLines(r.spec.selector).join(',')], ['Labels', labelLines(r.meta.labels)],
    ['Annotations', annLines({ 'deployment.kubernetes.io/desired-replicas': String(d?.spec.replicas ?? r.spec.replicas), 'deployment.kubernetes.io/max-replicas': String((d?.spec.replicas ?? r.spec.replicas) + 1), ...r.meta.annotations })],
    ...(d ? [['Controlled By', `Deployment/${d.meta.name}`] as [string, string]] : []),
    ['Replicas', `${pods.filter((p) => !p.status.deleting).length} current / ${r.spec.replicas} desired`],
    ['Pods Status', `${pods.filter((p) => p.status.phase === 'Running' && !p.status.deleting).length} Running / ${pods.filter((p) => p.status.phase === 'Pending' && !p.status.deleting).length} Waiting / ${pods.filter((p) => p.status.phase === 'Succeeded').length} Succeeded / ${pods.filter((p) => p.status.phase === 'Failed').length} Failed`],
  ], 15);
  out.push(...templateSection(r.spec.template));
  out.push(...eventsSection(c, r.meta.namespace, `replicaset/${r.meta.name}`, 15));
  return out;
}

export function describeService(c: Cluster, s: Service): string[] {
  const eps = c.endpoints(s);
  const out = kv([
    ['Name', s.meta.name], ['Namespace', s.meta.namespace!], ['Labels', labelLines(s.meta.labels)], ['Annotations', annLines(s.meta.annotations)],
    ['Selector', Object.keys(s.spec.selector).length ? labelLines(s.spec.selector).join(',') : '<none>'], ['Type', s.spec.type],
    ['IP Family Policy', 'SingleStack'], ['IP Families', 'IPv4'], ['IP', s.spec.clusterIP], ['IPs', s.spec.clusterIP],
  ], 26);
  for (const p of s.spec.ports) {
    out.push(...kv([['Port', `<unset>  ${p.port}/${p.protocol}`], ['TargetPort', `${p.targetPort}/${p.protocol}`]], 26));
    if (s.spec.type === 'NodePort') out.push(...kv([['NodePort', `<unset>  ${p.nodePort}/${p.protocol}`]], 26));
    const epStr = s.meta.name === 'kubernetes' && s.meta.namespace === 'default' ? '172.18.0.2:6443' : eps.length ? eps.map((e) => `${e.status.ip}:${p.targetPort}`).join(',') : '<none>';
    out.push(...kv([['Endpoints', epStr]], 26));
  }
  out.push(...kv([['Session Affinity', 'None'], ...(s.spec.type === 'NodePort' ? [['External Traffic Policy', 'Cluster'] as [string, string]] : []), ['Internal Traffic Policy', 'Cluster']], 26));
  out.push(...eventsSection(c, s.meta.namespace, `service/${s.meta.name}`, 26));
  return out;
}

export function describeNode(c: Cluster, n: Node): string[] {
  const pods = c.pods.filter((p) => p.spec.nodeName === n.meta.name && !p.status.deleting && p.status.phase !== 'Succeeded' && p.status.phase !== 'Failed');
  const out = kv([
    ['Name', n.meta.name], ['Roles', n.role === 'control-plane' ? 'control-plane' : '<none>'], ['Labels', labelLines(n.meta.labels)],
    ['Annotations', annLines({ 'kubeadm.alpha.kubernetes.io/cri-socket': 'unix:///run/containerd/containerd.sock', 'node.alpha.kubernetes.io/ttl': '0', 'volumes.kubernetes.io/controller-managed-attach-detach': 'true', ...n.meta.annotations })],
    ['CreationTimestamp', rfc1123(n.meta.created)], ['Taints', n.taints.length ? n.taints : '<none>'], ['Unschedulable', String(!n.ready)], ['Lease', ['HolderIdentity:  ' + n.meta.name, 'AcquireTime:     <unset>', 'RenewTime:       ' + rfc1123(c.now - 5000)]],
  ], 20);
  out.push('Conditions:', ...table([
    ['Type', 'Status', 'LastHeartbeatTime', 'LastTransitionTime', 'Reason', 'Message'], ['----', '------', '-----------------', '------------------', '------', '-------'],
    ['MemoryPressure', 'False', rfc1123(c.now - 20000), rfc1123(n.meta.created + 30000), 'KubeletHasSufficientMemory', 'kubelet has sufficient memory available'],
    ['DiskPressure', 'False', rfc1123(c.now - 20000), rfc1123(n.meta.created + 30000), 'KubeletHasNoDiskPressure', 'kubelet has no disk pressure'],
    ['PIDPressure', 'False', rfc1123(c.now - 20000), rfc1123(n.meta.created + 30000), 'KubeletHasSufficientPID', 'kubelet has sufficient PID available'],
    ['Ready', n.ready ? 'True' : 'False', rfc1123(c.now - 20000), rfc1123(n.meta.created + 30000), n.ready ? 'KubeletReady' : 'KubeletNotReady', n.ready ? 'kubelet is posting ready status' : 'kubelet stopped posting node status'],
  ], 2).map((l) => '  ' + l));
  out.push('Addresses:', `  InternalIP:  ${n.internalIP}`, `  Hostname:    ${n.meta.name}`);
  for (const title of ['Capacity', 'Allocatable']) out.push(`${title}:`, `  cpu:                ${n.cpu / 1000}`, '  ephemeral-storage:  1055762868Ki', '  hugepages-2Mi:      0', `  memory:             ${n.mem * 1024}Ki`, '  pods:               110');
  out.push('System Info:', ...kv([['  Machine ID', '7f3d8a6c2b1e4f0a9c8d7e6f5a4b3c2d'], ['  System UUID', '3b2a1c0d-4e5f-6a7b-8c9d-0e1f2a3b4c5d'], ['  Boot ID', '9d8c7b6a-5f4e-3d2c-1b0a-f9e8d7c6b5a4'], ['  Kernel Version', KERNEL], ['  OS Image', OS_IMAGE], ['  Operating System', 'linux'], ['  Architecture', 'amd64'], ['  Container Runtime Version', RUNTIME], ['  Kubelet Version', KUBE_VERSION], ['  Kube-Proxy Version', KUBE_VERSION]], 30));
  out.push(`PodCIDR:                      10.244.${c.nodes.indexOf(n)}.0/24`, `PodCIDRs:                     10.244.${c.nodes.indexOf(n)}.0/24`, `ProviderID:                   kind://podman/kcna/${n.meta.name}`);
  out.push(`Non-terminated Pods:          (${pods.length} in total)`);
  out.push(...table([['Namespace', 'Name', 'CPU Requests', 'CPU Limits', 'Memory Requests', 'Memory Limits', 'Age'], ['---------', '----', '------------', '----------', '---------------', '-------------', '---'],
    ...pods.sort((a, b) => a.meta.namespace!.localeCompare(b.meta.namespace!) || a.meta.name.localeCompare(b.meta.name)).map((p) => {
      const sys = p.meta.namespace === 'kube-system';
      return [p.meta.namespace!, p.meta.name, sys ? '100m (1%)' : '0 (0%)', '0 (0%)', sys ? '50Mi (0%)' : '0 (0%)', '0 (0%)', age(c.now - p.meta.created)];
    })], 2).map((l) => '  ' + l));
  const sysPods = pods.filter((p) => p.meta.namespace === 'kube-system').length;
  out.push('Allocated resources:', '  (Total limits may be over 100 percent, i.e., overcommitted.)', ...table([['Resource', 'Requests', 'Limits'], ['--------', '--------', '------'], ['cpu', `${sysPods * 100}m (${Math.round((sysPods * 100 * 100) / n.cpu)}%)`, '0 (0%)'], ['memory', `${sysPods * 50}Mi (${Math.round((sysPods * 50 * 100) / n.mem)}%)`, '0 (0%)'], ['ephemeral-storage', '0 (0%)', '0 (0%)'], ['hugepages-2Mi', '0 (0%)', '0 (0%)']], 2).map((l) => '  ' + l));
  out.push(...eventsSection(c, undefined, `node/${n.meta.name}`, 30));
  return out;
}

export function describeNamespace(c: Cluster, n: Namespace): string[] {
  return [...kv([['Name', n.meta.name], ['Labels', labelLines(n.meta.labels)], ['Annotations', annLines(n.meta.annotations)], ['Status', n.status]], 13), '', 'No resource quota.', '', 'No LimitRange resource.'];
}

export function describeConfigMap(c: Cluster, m: ConfigMap): string[] {
  const out = [...kv([['Name', m.meta.name], ['Namespace', m.meta.namespace!], ['Labels', labelLines(m.meta.labels)], ['Annotations', annLines(m.meta.annotations)]], 13), '', 'Data', '===='];
  for (const [k, v] of Object.entries(m.data).sort(([a], [b]) => a.localeCompare(b))) out.push(`${k}:`, '----', ...(v.replace(/\n$/, '').split('\n')), '');
  out.push('', 'BinaryData', '====', '', 'Events:  <none>');
  return out;
}

export function describeSecret(c: Cluster, s: Secret): string[] {
  const out = [...kv([['Name', s.meta.name], ['Namespace', s.meta.namespace!], ['Labels', labelLines(s.meta.labels)], ['Annotations', annLines(s.meta.annotations)]], 13), '', `Type:  ${s.type}`, '', 'Data', '===='];
  for (const [k, v] of Object.entries(s.data).sort(([a], [b]) => a.localeCompare(b))) out.push(`${k}:  ${new TextEncoder().encode(v).length} bytes`);
  return out;
}
