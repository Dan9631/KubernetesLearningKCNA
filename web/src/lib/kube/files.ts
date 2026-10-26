// "Sistema de archivos" de manifiestos de ejemplo (ls / cat / kubectl apply -f) y textos de kubectl explain.
import type { Labels } from './cluster.ts';

export interface Manifest {
  kind: 'Pod' | 'Deployment' | 'Service' | 'ConfigMap' | 'Namespace';
  name: string;
  namespace?: string;
  labels: Labels;
  image?: string;
  replicas?: number;
  ports?: number[];
  selector?: Labels;
  svcPorts?: { port: number; targetPort: number }[];
  type?: 'ClusterIP' | 'NodePort';
  data?: Labels;
  nodeSelector?: Labels;
  command?: string[];
}

export interface File { text: string; objects: Manifest[] }

export const FILES: Record<string, File> = {
  'pod.yaml': {
    text: `apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  containers:
    - name: nginx
      image: nginx:1.27-alpine
      ports:
        - containerPort: 80
`,
    objects: [{ kind: 'Pod', name: 'nginx', labels: { app: 'nginx' }, image: 'nginx:1.27-alpine', ports: [80] }],
  },
  'deployment.yaml': {
    text: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  labels:
    app: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: nginx
          image: nginx:1.28-alpine
          ports:
            - containerPort: 80
`,
    objects: [{ kind: 'Deployment', name: 'api', labels: { app: 'api' }, image: 'nginx:1.28-alpine', replicas: 2, ports: [80] }],
  },
  'service.yaml': {
    text: `apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 80
`,
    objects: [{ kind: 'Service', name: 'api', labels: {}, selector: { app: 'api' }, svcPorts: [{ port: 80, targetPort: 80 }], type: 'ClusterIP' }],
  },
  'broken-image.yaml': {
    text: `apiVersion: v1
kind: Pod
metadata:
  name: roto
  labels:
    app: roto
spec:
  containers:
    - name: nginx
      image: nginx:9.9-noexiste   # esta etiqueta no existe en el registry
`,
    objects: [{ kind: 'Pod', name: 'roto', labels: { app: 'roto' }, image: 'nginx:9.9-noexiste' }],
  },
  'configmap.yaml': {
    text: `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-cfg
data:
  MODO: dev
  COLOR: azul
`,
    objects: [{ kind: 'ConfigMap', name: 'app-cfg', labels: {}, data: { MODO: 'dev', COLOR: 'azul' } }],
  },
  'ssd-pod.yaml': {
    text: `apiVersion: v1
kind: Pod
metadata:
  name: cache
spec:
  nodeSelector:
    disktype: ssd      # solo kcna-worker tiene esta label
  containers:
    - name: redis
      image: redis:7.4-alpine
`,
    objects: [{ kind: 'Pod', name: 'cache', labels: {}, image: 'redis:7.4-alpine', nodeSelector: { disktype: 'ssd' } }],
  },
};

export const fileNames = () => Object.keys(FILES);

// ---------- kubectl explain ----------
interface Explain { kind: string; version: string; description: string; fields?: [string, string, string][] }

const F = (name: string, type: string, desc: string): [string, string, string] => [name, type, desc];
const META = F('metadata', '<ObjectMeta>', "Standard object's metadata. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata");
const API = F('apiVersion', '<string>', 'APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values.');
const KIND = F('kind', '<string>', 'Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase.');

export const EXPLAIN: Record<string, Explain> = {
  pods: { kind: 'Pod', version: 'v1', description: 'Pod is a collection of containers that can run on a host. This resource is created by clients and scheduled onto hosts.', fields: [API, KIND, META, F('spec', '<PodSpec>', 'Specification of the desired behavior of the pod.'), F('status', '<PodStatus>', 'Most recently observed status of the pod. This data may not be up to date. Populated by the system. Read-only.')] },
  'pods.metadata': { kind: 'Pod', version: 'v1', description: "ObjectMeta is metadata that all persisted resources must have, which includes all objects users must create.", fields: [F('annotations', '<map[string]string>', 'Annotations is an unstructured key value map stored with a resource that may be set by external tools to store and retrieve arbitrary metadata. They are not queryable and should be preserved when modifying objects.'), F('labels', '<map[string]string>', 'Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services.'), F('name', '<string>', 'Name must be unique within a namespace. Is required when creating resources. Cannot be updated.'), F('namespace', '<string>', 'Namespace defines the space within which each name must be unique. An empty namespace is equivalent to the "default" namespace.')] },
  'pods.spec': { kind: 'Pod', version: 'v1', description: 'PodSpec is a description of a pod.', fields: [F('containers', '<[]Container> -required-', 'List of containers belonging to the pod. Containers cannot currently be added or removed. There must be at least one container in a Pod. Cannot be updated.'), F('initContainers', '<[]Container>', 'List of initialization containers belonging to the pod. Init containers are executed in order prior to containers being started.'), F('nodeName', '<string>', 'NodeName indicates in which node this pod is scheduled. If empty, this pod is a candidate for scheduling by the scheduler defined in schedulerName.'), F('nodeSelector', '<map[string]string>', "NodeSelector is a selector which must be true for the pod to fit on a node. Selector which must match a node's labels for the pod to be scheduled on that node."), F('restartPolicy', '<string>', 'Restart policy for all containers within the pod. One of Always, OnFailure, Never. Default to Always.'), F('tolerations', '<[]Toleration>', "If specified, the pod's tolerations."), F('volumes', '<[]Volume>', 'List of volumes that can be mounted by containers belonging to the pod.')] },
  'pods.spec.containers': { kind: 'Pod', version: 'v1', description: 'A single application container that you want to run within a pod.', fields: [F('args', '<[]string>', "Arguments to the entrypoint. The container image's CMD is used if this is not provided."), F('command', '<[]string>', "Entrypoint array. Not executed within a shell. The container image's ENTRYPOINT is used if this is not provided."), F('env', '<[]EnvVar>', 'List of environment variables to set in the container. Cannot be updated.'), F('envFrom', '<[]EnvFromSource>', 'List of sources to populate environment variables in the container.'), F('image', '<string>', 'Container image name. More info: https://kubernetes.io/docs/concepts/containers/images'), F('imagePullPolicy', '<string>', 'Image pull policy. One of Always, Never, IfNotPresent. Defaults to Always if :latest tag is specified, or IfNotPresent otherwise.'), F('livenessProbe', '<Probe>', 'Periodic probe of container liveness. Container will be restarted if the probe fails.'), F('name', '<string> -required-', 'Name of the container specified as a DNS_LABEL. Each container in a pod must have a unique name (DNS_LABEL). Cannot be updated.'), F('ports', '<[]ContainerPort>', 'List of ports to expose from the container.'), F('readinessProbe', '<Probe>', 'Periodic probe of container service readiness. Container will be removed from service endpoints if the probe fails.'), F('resources', '<ResourceRequirements>', 'Compute Resources required by this container. Cannot be updated.'), F('securityContext', '<SecurityContext>', 'SecurityContext defines the security options the container should be run with.'), F('volumeMounts', '<[]VolumeMount>', "Pod volumes to mount into the container's filesystem. Cannot be updated.")] },
  'pods.spec.containers.resources': { kind: 'Pod', version: 'v1', description: 'ResourceRequirements describes the compute resource requirements.', fields: [F('limits', '<map[string]Quantity>', 'Limits describes the maximum amount of compute resources allowed.'), F('requests', '<map[string]Quantity>', 'Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value.')] },
  'pods.spec.restartPolicy': { kind: 'Pod', version: 'v1', description: 'Restart policy for all containers within the pod. One of Always, OnFailure, Never. In some contexts, only a subset of those values may be permitted. Default to Always.\n\nPossible enum values:\n - `"Always"`\n - `"Never"`\n - `"OnFailure"`' },
  'pods.spec.nodeSelector': { kind: 'Pod', version: 'v1', description: "NodeSelector is a selector which must be true for the pod to fit on a node. Selector which must match a node's labels for the pod to be scheduled on that node. More info: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/" },
  'pods.spec.volumes': { kind: 'Pod', version: 'v1', description: 'Volume represents a named volume in a pod that may be accessed by any container in the pod.', fields: [F('configMap', '<ConfigMapVolumeSource>', 'configMap represents a configMap that should populate this volume'), F('emptyDir', '<EmptyDirVolumeSource>', "emptyDir represents a temporary directory that shares a pod's lifetime."), F('name', '<string> -required-', 'name of the volume. Must be a DNS_LABEL and unique within the pod.'), F('persistentVolumeClaim', '<PersistentVolumeClaimVolumeSource>', 'persistentVolumeClaimVolumeSource represents a reference to a PersistentVolumeClaim in the same namespace.'), F('secret', '<SecretVolumeSource>', 'secret represents a secret that should populate this volume.')] },
  'pods.spec.volumes.configMap': { kind: 'Pod', version: 'v1', description: "Adapts a ConfigMap into a volume. The contents of the target ConfigMap's Data field will be presented in a volume as files using the keys in the Data field as the file names.", fields: [F('defaultMode', '<integer>', 'defaultMode is optional: mode bits used to set permissions on created files by default.'), F('items', '<[]KeyToPath>', 'items if unspecified, each key-value pair in the Data field of the referenced ConfigMap will be projected into the volume as a file whose name is the key and content is the value.'), F('name', '<string>', 'Name of the referent.'), F('optional', '<boolean>', 'optional specify whether the ConfigMap or its keys must be defined')] },
  'pods.status': { kind: 'Pod', version: 'v1', description: 'PodStatus represents information about the status of a pod. Status may trail the actual state of a system.', fields: [F('conditions', '<[]PodCondition>', 'Current service state of pod.'), F('containerStatuses', '<[]ContainerStatus>', 'Statuses of containers in this pod.'), F('hostIP', '<string>', 'hostIP holds the IP address of the host to which the pod is assigned.'), F('phase', '<string>', "The phase of a Pod is a simple, high-level summary of where the Pod is in its lifecycle. Possible values: Pending, Running, Succeeded, Failed, Unknown."), F('podIP', '<string>', 'podIP address allocated to the pod. Routable at least within the cluster.'), F('qosClass', '<string>', 'The Quality of Service (QOS) classification assigned to the pod based on resource requirements. Possible values: BestEffort, Burstable, Guaranteed.')] },
  deployments: { kind: 'Deployment', version: 'apps/v1', description: 'Deployment enables declarative updates for Pods and ReplicaSets.', fields: [API, KIND, META, F('spec', '<DeploymentSpec>', 'Specification of the desired behavior of the Deployment.'), F('status', '<DeploymentStatus>', 'Most recently observed status of the Deployment.')] },
  'deployments.spec': { kind: 'Deployment', version: 'apps/v1', description: 'DeploymentSpec is the specification of the desired behavior of the Deployment.', fields: [F('minReadySeconds', '<integer>', 'Minimum number of seconds for which a newly created pod should be ready without any of its container crashing, for it to be considered available. Defaults to 0.'), F('paused', '<boolean>', 'Indicates that the deployment is paused.'), F('progressDeadlineSeconds', '<integer>', 'The maximum time in seconds for a deployment to make progress before it is considered to be failed. Defaults to 600s.'), F('replicas', '<integer>', 'Number of desired pods. This is a pointer to distinguish between explicit zero and not specified. Defaults to 1.'), F('revisionHistoryLimit', '<integer>', 'The number of old ReplicaSets to retain to allow rollback. Defaults to 10.'), F('selector', '<LabelSelector> -required-', 'Label selector for pods. Existing ReplicaSets whose pods are selected by this will be the ones affected by this deployment. It must match the pod template\'s labels.'), F('strategy', '<DeploymentStrategy>', 'The deployment strategy to use to replace existing pods with new ones.'), F('template', '<PodTemplateSpec> -required-', 'Template describes the pods that will be created. The only allowed template.spec.restartPolicy value is "Always".')] },
  'deployments.spec.replicas': { kind: 'Deployment', version: 'apps/v1', description: 'Number of desired pods. This is a pointer to distinguish between explicit zero and not specified. Defaults to 1.' },
  'deployments.spec.selector': { kind: 'Deployment', version: 'apps/v1', description: 'A label selector is a label query over a set of resources. The result of matchLabels and matchExpressions are ANDed. An empty label selector matches all objects. A null label selector matches no objects.', fields: [F('matchExpressions', '<[]LabelSelectorRequirement>', 'matchExpressions is a list of label selector requirements. The requirements are ANDed.'), F('matchLabels', '<map[string]string>', 'matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels map is equivalent to an element of matchExpressions, whose key field is "key", the operator is "In", and the values array contains only "value". The requirements are ANDed.')] },
  'deployments.spec.strategy': { kind: 'Deployment', version: 'apps/v1', description: 'DeploymentStrategy describes how to replace existing pods with new ones.', fields: [F('rollingUpdate', '<RollingUpdateDeployment>', 'Rolling update config params. Present only if DeploymentStrategyType = RollingUpdate.'), F('type', '<string>', 'Type of deployment. Can be "Recreate" or "RollingUpdate". Default is RollingUpdate.\n\nPossible enum values:\n - `"Recreate"` Kill all existing pods before creating new ones.\n - `"RollingUpdate"` Replace the old ReplicaSets by new one using rolling update i.e gradually scale down the old ReplicaSets and scale up the new one.')] },
  'deployments.spec.strategy.rollingUpdate': { kind: 'Deployment', version: 'apps/v1', description: 'Spec to control the desired behavior of rolling update.', fields: [F('maxSurge', '<IntOrString>', 'The maximum number of pods that can be scheduled above the desired number of pods. Value can be an absolute number (ex: 5) or a percentage of desired pods (ex: 10%). This can not be 0 if MaxUnavailable is 0. Absolute number is calculated from percentage by rounding up. Defaults to 25%.'), F('maxUnavailable', '<IntOrString>', 'The maximum number of pods that can be unavailable during the update. Value can be an absolute number (ex: 5) or a percentage of desired pods (ex: 10%). Absolute number is calculated from percentage by rounding down. This can not be 0 if MaxSurge is 0. Defaults to 25%.')] },
  'deployments.spec.template': { kind: 'Deployment', version: 'apps/v1', description: 'PodTemplateSpec describes the data a pod should have when created from a template', fields: [META, F('spec', '<PodSpec>', 'Specification of the desired behavior of the pod.')] },
  'deployments.status': { kind: 'Deployment', version: 'apps/v1', description: 'DeploymentStatus is the most recently observed status of the Deployment.', fields: [F('availableReplicas', '<integer>', 'Total number of available non-terminating pods (ready for at least minReadySeconds) targeted by this deployment.'), F('conditions', '<[]DeploymentCondition>', "Represents the latest available observations of a deployment's current state."), F('observedGeneration', '<integer>', 'The generation observed by the deployment controller.'), F('readyReplicas', '<integer>', 'Total number of non-terminating pods targeted by this Deployment with a Ready Condition.'), F('replicas', '<integer>', 'Total number of non-terminating pods targeted by this deployment (their labels match the selector).'), F('unavailableReplicas', '<integer>', 'Total number of unavailable pods targeted by this deployment.'), F('updatedReplicas', '<integer>', 'Total number of non-terminating pods targeted by this deployment that have the desired template spec.')] },
  services: { kind: 'Service', version: 'v1', description: 'Service is a named abstraction of software service (for example, mysql) consisting of local port (for example 3306) that the proxy listens on, and the selector that determines which pods will answer requests sent through the proxy.', fields: [API, KIND, META, F('spec', '<ServiceSpec>', 'Spec defines the behavior of a service.'), F('status', '<ServiceStatus>', 'Most recently observed status of the service.')] },
  'services.spec': { kind: 'Service', version: 'v1', description: 'ServiceSpec describes the attributes that a user creates on a service.', fields: [F('clusterIP', '<string>', 'clusterIP is the IP address of the service and is usually assigned randomly. If an address is specified manually, is in-range, and is not in use, it will be allocated to the service; otherwise creation of the service will fail. "None" can be specified for headless services.'), F('externalName', '<string>', 'externalName is the external reference that discovery mechanisms will return as an alias for this service (e.g. a DNS CNAME record). Requires type to be "ExternalName".'), F('ports', '<[]ServicePort>', 'The list of ports that are exposed by this service.'), F('selector', '<map[string]string>', 'Route service traffic to pods with label keys and values matching this selector. If empty or not present, the service is assumed to have an external process managing its endpoints.'), F('sessionAffinity', '<string>', 'Supports "ClientIP" and "None". Used to maintain session affinity. Defaults to None.'), F('type', '<string>', 'type determines how the Service is exposed. Defaults to ClusterIP. Valid options are ExternalName, ClusterIP, NodePort, and LoadBalancer.\n\nPossible enum values:\n - `"ClusterIP"` means a service will only be accessible inside the cluster, via the cluster IP.\n - `"ExternalName"` means a service consists of only a reference to an external name that kubedns or equivalent will return as a CNAME record, with no exposing or proxying of any pods involved.\n - `"LoadBalancer"` means a service will be exposed via an external load balancer (if the cloud provider supports it), in addition to \'NodePort\' type.\n - `"NodePort"` means a service will be exposed on one port of every node, in addition to \'ClusterIP\' type.')] },
  'services.spec.ports': { kind: 'Service', version: 'v1', description: "ServicePort contains information on service's port.", fields: [F('name', '<string>', 'The name of this port within the service. This must be a DNS_LABEL. All ports within a ServiceSpec must have unique names.'), F('nodePort', '<integer>', 'The port on each node on which this service is exposed when type is NodePort or LoadBalancer. Usually assigned by the system (default: 30000-32767).'), F('port', '<integer> -required-', 'The port that will be exposed by this service.'), F('protocol', '<string>', 'The IP protocol for this port. Supports "TCP", "UDP", and "SCTP". Default is TCP.'), F('targetPort', '<IntOrString>', "Number or name of the port to access on the pods targeted by the service. If this is not specified, the value of the 'port' field is used.")] },
  'services.spec.type': { kind: 'Service', version: 'v1', description: 'type determines how the Service is exposed. Defaults to ClusterIP. Valid options are ExternalName, ClusterIP, NodePort, and LoadBalancer. "ClusterIP" allocates a cluster-internal IP address for load-balancing to endpoints. "NodePort" builds on ClusterIP and allocates a port on every node which routes to the same endpoints as the clusterIP. "LoadBalancer" builds on NodePort and creates an external load-balancer (if supported in the current cloud) which routes to the same endpoints as the clusterIP.\n\nPossible enum values:\n - `"ClusterIP"`\n - `"ExternalName"`\n - `"LoadBalancer"`\n - `"NodePort"`' },
  'services.spec.selector': { kind: 'Service', version: 'v1', description: 'Route service traffic to pods with label keys and values matching this selector. If empty or not present, the service is assumed to have an external process managing its endpoints, which Kubernetes will not modify. Only applies to types ClusterIP, NodePort, and LoadBalancer. Ignored if type is ExternalName. More info: https://kubernetes.io/docs/concepts/services-networking/service/' },
};

/** Parte el texto en líneas de ancho máximo (como hace kubectl explain). */
export function wrap(text: string, width = 78, indent = ''): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) { out.push(''); continue; }
    let line = '';
    for (const w of para.split(' ')) {
      if ((line + ' ' + w).trim().length > width - indent.length && line) { out.push(indent + line); line = w; }
      else line = line ? line + ' ' + w : w;
    }
    if (line) out.push(indent + line);
  }
  return out;
}
