// Representación "API" de los objetos del clúster simulado para -o yaml / -o json / jsonpath.
import { type Cluster, type Pod, type Deployment, type ReplicaSet, type Service, type ConfigMap, type Secret, type Namespace, type Node, type Event, type Labels, type Container, KUBE_VERSION } from './cluster.ts';
import { iso, base64, hex, hash } from './format.ts';

type Obj = Record<string, unknown>;

const sortedLabels = (l: Labels) => Object.fromEntries(Object.entries(l).sort(([a], [b]) => a.localeCompare(b)));
const nonEmpty = (l: Labels) => (Object.keys(l).length ? sortedLabels(l) : undefined);
const clean = (o: Obj): Obj => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export const OS_IMAGE = 'Debian GNU/Linux 12 (bookworm)';
export const KERNEL = '6.6.87.2-microsoft-standard-WSL2';
export const RUNTIME = 'containerd://2.1.3';
export const apiToken = (p: Pod) => `kube-api-access-${hex(p.meta.uid, 5).replace(/[^a-z0-9]/g, 'x')}`;
export const containerID = (p: Pod, c: Container) => `containerd://${hex(p.meta.uid + c.name, 64)}`;
export const imageID = (c: Container) => `${c.image.includes('/') ? c.image.split(':')[0] : 'docker.io/library/' + c.image.split(':')[0]}@sha256:${hex(c.image, 64)}`;

function meta(c: Cluster, m: Pod['meta'], extra: Obj = {}): Obj {
  return clean({
    annotations: nonEmpty(Object.fromEntries(Object.entries(m.annotations).filter(([k]) => !k.startsWith('__')))),
    creationTimestamp: iso(m.created),
    labels: nonEmpty(m.labels),
    name: m.name,
    namespace: m.namespace,
    resourceVersion: String(1000 + (hash(m.uid) % 90000)),
    uid: m.uid,
    ...extra,
  });
}

function containerSpec(c: Container, p?: Pod): Obj {
  return clean({
    command: c.command?.length ? c.command : undefined,
    env: Object.keys(c.env).length ? Object.entries(c.env).map(([name, value]) => ({ name, value })) : undefined,
    image: c.image,
    imagePullPolicy: c.image.endsWith(':latest') || !c.image.includes(':') ? 'Always' : 'IfNotPresent',
    name: c.name,
    ports: c.ports.length ? c.ports.map((containerPort) => ({ containerPort, protocol: 'TCP' })) : undefined,
    resources: {},
    terminationMessagePath: p ? '/dev/termination-log' : undefined,
    terminationMessagePolicy: p ? 'File' : undefined,
    volumeMounts: p ? [{ mountPath: '/var/run/secrets/kubernetes.io/serviceaccount', name: apiToken(p), readOnly: true }] : undefined,
  });
}

export function podObject(c: Cluster, p: Pod): Obj {
  const rs = p.meta.owner ? c.replicaset(p.meta.namespace!, p.meta.owner.name) : undefined;
  const status = c.podStatus(p);
  const waiting = status !== 'Running' && !['Succeeded', 'Completed', 'Failed', 'Error'].includes(status);
  const node = p.spec.nodeName ? c.node(p.spec.nodeName) : undefined;
  const cond = (type: string, ok: boolean, t?: number) => clean({ lastProbeTime: null, lastTransitionTime: iso(t ?? p.meta.created), status: ok ? 'True' : 'False', type, reason: !ok && type === 'Ready' ? 'ContainersNotReady' : undefined, message: !ok && type === 'Ready' ? `containers with unready status: [${p.spec.containers[0].name}]` : undefined });
  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: meta(c, p.meta, { ownerReferences: rs ? [{ apiVersion: 'apps/v1', blockOwnerDeletion: true, controller: true, kind: 'ReplicaSet', name: rs.meta.name, uid: rs.meta.uid }] : undefined, deletionTimestamp: p.status.deleting ? iso(p.status.deletedAt! - 1000) : undefined, deletionGracePeriodSeconds: p.status.deleting ? 30 : undefined }),
    spec: clean({
      containers: p.spec.containers.map((ct) => containerSpec(ct, p)),
      dnsPolicy: 'ClusterFirst',
      enableServiceLinks: true,
      nodeName: p.spec.nodeName,
      nodeSelector: p.spec.nodeSelector && Object.keys(p.spec.nodeSelector).length ? sortedLabels(p.spec.nodeSelector) : undefined,
      preemptionPolicy: 'PreemptLowerPriority',
      priority: 0,
      restartPolicy: p.spec.restartPolicy,
      schedulerName: 'default-scheduler',
      securityContext: {},
      serviceAccount: 'default',
      serviceAccountName: 'default',
      terminationGracePeriodSeconds: 30,
      tolerations: [
        ...p.spec.tolerations.map((t) => ({ effect: t.split(':')[1], key: t.split(':')[0].split('=')[0], operator: 'Exists' })),
        { effect: 'NoExecute', key: 'node.kubernetes.io/not-ready', operator: 'Exists', tolerationSeconds: 300 },
        { effect: 'NoExecute', key: 'node.kubernetes.io/unreachable', operator: 'Exists', tolerationSeconds: 300 },
      ],
      volumes: [{ name: apiToken(p), projected: { defaultMode: 420, sources: [{ serviceAccountToken: { expirationSeconds: 3607, path: 'token' } }, { configMap: { items: [{ key: 'ca.crt', path: 'ca.crt' }], name: 'kube-root-ca.crt' } }, { downwardAPI: { items: [{ fieldRef: { apiVersion: 'v1', fieldPath: 'metadata.namespace' }, path: 'namespace' }] } }] } }],
    }),
    status: clean({
      conditions: p.spec.nodeName ? [cond('PodReadyToStartContainers', p.status.phase === 'Running'), cond('Initialized', true), cond('Ready', p.status.ready), cond('ContainersReady', p.status.ready), cond('PodScheduled', true, p.status.scheduledAt)] : [clean({ lastProbeTime: null, lastTransitionTime: iso(p.meta.created), message: c.events.find((e) => e.object === `pod/${p.meta.name}` && e.reason === 'FailedScheduling')?.message, reason: 'Unschedulable', status: 'False', type: 'PodScheduled' })],
      containerStatuses: p.spec.nodeName ? p.spec.containers.map((ct) => clean({
        containerID: p.status.phase === 'Running' || p.status.restarts ? containerID(p, ct) : undefined,
        image: ct.image.includes('/') ? ct.image : 'docker.io/library/' + ct.image,
        imageID: p.status.phase === 'Running' || p.status.restarts ? imageID(ct) : '',
        lastState: p.status.restarts ? { terminated: { containerID: containerID(p, ct), exitCode: 0, finishedAt: iso(p.status.lastRestart ?? p.meta.created), reason: 'Completed', startedAt: iso((p.status.lastRestart ?? p.meta.created) - 1000) } } : {},
        name: ct.name,
        ready: p.status.ready,
        restartCount: p.status.restarts,
        started: p.status.phase === 'Running' && !p.status.reason,
        state: waiting ? { waiting: clean({ message: status === 'ImagePullBackOff' ? `Back-off pulling image "${ct.image}"` : status === 'ErrImagePull' ? `failed to pull and unpack image "${ct.image}"` : status === 'CrashLoopBackOff' ? `back-off ${Math.min(300, 10 * 2 ** Math.max(0, p.status.restarts - 1))}s restarting failed container=${ct.name} pod=${p.meta.name}_${p.meta.namespace}(${p.meta.uid})` : undefined, reason: status }) }
          : status === 'Completed' || status === 'Error' ? { terminated: { containerID: containerID(p, ct), exitCode: status === 'Error' ? 1 : 0, finishedAt: iso(c.now), reason: status, startedAt: iso(p.status.startedAt ?? c.now) } }
          : { running: { startedAt: iso(p.status.lastRestart ?? p.status.startedAt ?? c.now) } },
      })) : undefined,
      hostIP: node?.internalIP,
      hostIPs: node ? [{ ip: node.internalIP }] : undefined,
      phase: p.status.phase,
      podIP: p.status.phase === 'Running' || p.status.reason ? p.status.ip : undefined,
      podIPs: p.status.phase === 'Running' || p.status.reason ? [{ ip: p.status.ip }] : undefined,
      qosClass: 'BestEffort',
      startTime: p.spec.nodeName ? iso(p.status.scheduledAt ?? p.meta.created) : undefined,
    }),
  };
}

function templateObject(c: Cluster, t: Pod['spec'], hash?: string): Obj {
  return {
    metadata: clean({ creationTimestamp: null, labels: nonEmpty(hash ? { ...t.labels, 'pod-template-hash': hash } : t.labels), annotations: nonEmpty(t.annotations) }),
    spec: clean({ containers: t.containers.map((ct) => ({ ...containerSpec(ct), terminationMessagePath: '/dev/termination-log', terminationMessagePolicy: 'File' })), dnsPolicy: 'ClusterFirst', nodeSelector: t.nodeSelector && Object.keys(t.nodeSelector).length ? sortedLabels(t.nodeSelector) : undefined, restartPolicy: t.restartPolicy, schedulerName: 'default-scheduler', securityContext: {}, terminationGracePeriodSeconds: 30 }),
  };
}

export function deploymentObject(c: Cluster, d: Deployment): Obj {
  const st = c.deploymentStatus(d);
  const ok = st.ready === d.spec.replicas && st.updated === d.spec.replicas && st.replicas === d.spec.replicas;
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: meta(c, { ...d.meta, annotations: { 'deployment.kubernetes.io/revision': String(st.revision), ...d.meta.annotations } }, { generation: st.revision }),
    spec: {
      progressDeadlineSeconds: 600,
      replicas: d.spec.replicas,
      revisionHistoryLimit: 10,
      selector: { matchLabels: sortedLabels(d.spec.selector) },
      strategy: d.spec.strategy === 'Recreate' ? { type: 'Recreate' } : { rollingUpdate: { maxSurge: d.spec.maxSurge, maxUnavailable: d.spec.maxUnavailable }, type: 'RollingUpdate' },
      template: templateObject(c, d.spec.template as Pod['spec']),
    },
    status: clean({
      availableReplicas: st.available || undefined,
      conditions: [
        { lastTransitionTime: iso(d.meta.created), lastUpdateTime: iso(d.meta.created), message: st.available >= d.spec.replicas - Math.floor(d.spec.replicas / 4) ? 'Deployment has minimum availability.' : 'Deployment does not have minimum availability.', reason: st.available >= d.spec.replicas - Math.floor(d.spec.replicas / 4) ? 'MinimumReplicasAvailable' : 'MinimumReplicasUnavailable', status: st.available >= d.spec.replicas - Math.floor(d.spec.replicas / 4) ? 'True' : 'False', type: 'Available' },
        { lastTransitionTime: iso(d.meta.created), lastUpdateTime: iso(c.now), message: ok ? `ReplicaSet "${c.newRs(d)?.meta.name}" has successfully progressed.` : `ReplicaSet "${c.newRs(d)?.meta.name}" is progressing.`, reason: ok ? 'NewReplicaSetAvailable' : 'ReplicaSetUpdated', status: 'True', type: 'Progressing' },
      ],
      observedGeneration: st.revision,
      readyReplicas: st.ready || undefined,
      replicas: st.replicas || undefined,
      unavailableReplicas: st.unavailable || undefined,
      updatedReplicas: st.updated || undefined,
    }),
  };
}

export function replicaSetObject(c: Cluster, r: ReplicaSet): Obj {
  const pods = c.podsOf(r).filter((p) => !p.status.deleting);
  const ready = pods.filter((p) => p.status.ready).length;
  const d = r.meta.owner ? c.deployment(r.meta.namespace!, r.meta.owner.name) : undefined;
  const hash = r.meta.labels['pod-template-hash'];
  return {
    apiVersion: 'apps/v1',
    kind: 'ReplicaSet',
    metadata: meta(c, { ...r.meta, annotations: { 'deployment.kubernetes.io/desired-replicas': String(d?.spec.replicas ?? r.spec.replicas), 'deployment.kubernetes.io/max-replicas': String((d?.spec.replicas ?? r.spec.replicas) + 1), ...r.meta.annotations } }, { generation: 1, ownerReferences: d ? [{ apiVersion: 'apps/v1', blockOwnerDeletion: true, controller: true, kind: 'Deployment', name: d.meta.name, uid: d.meta.uid }] : undefined }),
    spec: { replicas: r.spec.replicas, selector: { matchLabels: sortedLabels(r.spec.selector) }, template: templateObject(c, { ...r.spec.template, labels: Object.fromEntries(Object.entries(r.spec.template.labels).filter(([k]) => k !== 'pod-template-hash')) } as Pod['spec'], hash) },
    status: clean({ availableReplicas: ready || undefined, fullyLabeledReplicas: pods.length || undefined, observedGeneration: 1, readyReplicas: ready || undefined, replicas: pods.length }),
  };
}

export function serviceObject(c: Cluster, s: Service): Obj {
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: meta(c, s.meta),
    spec: clean({
      clusterIP: s.spec.clusterIP,
      clusterIPs: [s.spec.clusterIP],
      externalTrafficPolicy: s.spec.type === 'NodePort' ? 'Cluster' : undefined,
      internalTrafficPolicy: 'Cluster',
      ipFamilies: ['IPv4'],
      ipFamilyPolicy: 'SingleStack',
      ports: s.spec.ports.map((p) => clean({ nodePort: p.nodePort, port: p.port, protocol: p.protocol, targetPort: p.targetPort })),
      selector: nonEmpty(s.spec.selector),
      sessionAffinity: 'None',
      type: s.spec.type,
    }),
    status: { loadBalancer: {} },
  };
}

export const configMapObject = (c: Cluster, m: ConfigMap): Obj => clean({ apiVersion: 'v1', data: Object.keys(m.data).length ? sortedLabels(m.data) : undefined, kind: 'ConfigMap', metadata: meta(c, m.meta) });
export const secretObject = (c: Cluster, s: Secret): Obj => clean({ apiVersion: 'v1', data: Object.keys(s.data).length ? sortedLabels(Object.fromEntries(Object.entries(s.data).map(([k, v]) => [k, base64(v)]))) : undefined, kind: 'Secret', metadata: meta(c, s.meta), type: s.type });
export const namespaceObject = (c: Cluster, n: Namespace): Obj => ({ apiVersion: 'v1', kind: 'Namespace', metadata: meta(c, n.meta), spec: { finalizers: ['kubernetes'] }, status: { phase: n.status } });

export function nodeObject(c: Cluster, n: Node): Obj {
  const idx = c.nodes.indexOf(n);
  const cond = (type: string, status: string, reason: string, message: string) => ({ lastHeartbeatTime: iso(c.now - 20000), lastTransitionTime: iso(n.meta.created + 30000), message, reason, status, type });
  return {
    apiVersion: 'v1',
    kind: 'Node',
    metadata: meta(c, { ...n.meta, annotations: { 'kubeadm.alpha.kubernetes.io/cri-socket': 'unix:///run/containerd/containerd.sock', 'node.alpha.kubernetes.io/ttl': '0', 'volumes.kubernetes.io/controller-managed-attach-detach': 'true', ...n.meta.annotations } }),
    spec: clean({ podCIDR: `10.244.${idx}.0/24`, podCIDRs: [`10.244.${idx}.0/24`], providerID: `kind://podman/kcna/${n.meta.name}`, taints: n.taints.length ? n.taints.map((t) => clean({ effect: t.split(':')[1], key: t.split(':')[0].split('=')[0], value: t.split(':')[0].split('=')[1] })) : undefined, unschedulable: !n.ready || undefined }),
    status: {
      addresses: [{ address: n.internalIP, type: 'InternalIP' }, { address: n.meta.name, type: 'Hostname' }],
      allocatable: { cpu: String(n.cpu / 1000), 'ephemeral-storage': '1055762868Ki', 'hugepages-2Mi': '0', memory: `${n.mem * 1024}Ki`, pods: '110' },
      capacity: { cpu: String(n.cpu / 1000), 'ephemeral-storage': '1055762868Ki', 'hugepages-2Mi': '0', memory: `${n.mem * 1024}Ki`, pods: '110' },
      conditions: [cond('MemoryPressure', 'False', 'KubeletHasSufficientMemory', 'kubelet has sufficient memory available'), cond('DiskPressure', 'False', 'KubeletHasNoDiskPressure', 'kubelet has no disk pressure'), cond('PIDPressure', 'False', 'KubeletHasSufficientPID', 'kubelet has sufficient PID available'), cond('Ready', n.ready ? 'True' : 'False', n.ready ? 'KubeletReady' : 'KubeletNotReady', n.ready ? 'kubelet is posting ready status' : 'kubelet stopped posting node status')],
      daemonEndpoints: { kubeletEndpoint: { Port: 10250 } },
      nodeInfo: { architecture: 'amd64', bootID: hex(n.meta.name + 'boot', 36), containerRuntimeVersion: RUNTIME, kernelVersion: KERNEL, kubeProxyVersion: KUBE_VERSION, kubeletVersion: KUBE_VERSION, machineID: hex(n.meta.name + 'machine', 32), operatingSystem: 'linux', osImage: OS_IMAGE, systemUUID: hex(n.meta.name + 'uuid', 36) },
    },
  };
}

export function eventObject(c: Cluster, e: Event): Obj {
  const [kind, name] = e.object.split('/');
  const K: Record<string, string> = { pod: 'Pod', deployment: 'Deployment', replicaset: 'ReplicaSet', node: 'Node', service: 'Service' };
  return {
    apiVersion: 'v1',
    count: e.count,
    eventTime: null,
    firstTimestamp: iso(e.first),
    involvedObject: clean({ apiVersion: kind === 'deployment' || kind === 'replicaset' ? 'apps/v1' : 'v1', kind: K[kind] ?? kind, name, namespace: e.namespace }),
    kind: 'Event',
    lastTimestamp: iso(e.time),
    message: e.message,
    metadata: { creationTimestamp: iso(e.first), name: `${name}.${hex(e.object + e.reason + e.message, 16)}`, namespace: e.namespace, resourceVersion: String(1000 + (hash(e.message) % 90000)), uid: hex(e.object + e.message, 32) },
    reason: e.reason,
    reportingComponent: e.from,
    reportingInstance: e.from === 'kubelet' ? 'kcna-worker' : '',
    source: clean({ component: e.from, host: e.from === 'kubelet' ? 'kcna-worker' : undefined }),
    type: e.type,
  };
}
