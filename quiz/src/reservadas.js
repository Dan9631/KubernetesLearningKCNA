// Banco reservado: 60 preguntas (26/17/10/7, como el examen) que NUNCA salen en la práctica,
// los quizzes de módulo ni los simulacros. Solo se usan en el Examen de graduación del sitio,
// para medir si se sabe el tema y no si se recuerdan las preguntas del banco.
// Elegidas por cuota proporcional a cada competencia y repartidas entre módulos (semilla fija).
// Los ids son posicionales: no reordenes los src_*.js (las preguntas nuevas van al final).
module.exports = [
  'A002', // Observability · m11: How does Prometheus collect metrics by default?
  'A003', // Observability · m11: Which two statements about Prometheus are correct? (Choose 2)
  'A012', // Cloud Native Ecosystem and Principles · m10: Which autoscaler adjusts the number of Pod replicas of a Deployment ba
  'A016', // Cloud Native Ecosystem and Principles · m10: Which CNCF project enables event-driven autoscaling, including scaling
  'A024', // Cloud Native Community and Collaboration · m10: Which CNCF body provides technical leadership, including accepting pro
  'A029', // Cloud Native Community and Collaboration · m10: Which statement about Kubernetes Working Groups (WGs) is correct?
  'A035', // Cloud Native Community and Collaboration · m10: What is KubeCon + CloudNativeCon?
  'D005', // Application Delivery · m12: Someone edits a Deployment manually with kubectl edit in a GitOps-mana
  'D007', // Application Delivery · m12: What is Helm?
  'D010', // Application Delivery · m12: Which in-cluster server component was removed in Helm 3, simplifying i
  'D013', // Application Delivery · m3: Which pair lists the strategy types natively supported by a Deployment
  'D014', // Application Delivery · m12: A Deployment uses the Recreate strategy. What happens during an update
  'D016', // Application Delivery · m12: Which deployment strategy first routes a small percentage of traffic t
  'D018', // Application Delivery · m12: Which command shows the revision history of a Deployment named web?
  'D029', // Debugging · m9: Which command starts a debugging Pod on a specific node, with the node
  'D033', // Debugging · m9: Which command lists recent events in a namespace sorted by time?
  'D034', // Debugging · m3: A Pod shows the status Completed. Which two statements are true? (Choo
  'F002', // Core Concepts · m2: In a standard Kubernetes architecture, which control plane component i
  'F006', // Core Concepts · m2: Which component embeds cloud-specific control logic, such as provision
  'F008', // Core Concepts · m3: What is the smallest deployable unit of computing that you can create 
  'F013', // Core Concepts · m3: Which resource should be used to run a database migration task once un
  'F014', // Core Concepts · m3: A report must be generated every day at 02:00. Which resource is desig
  'F015', // Core Concepts · m3: Which statement about Kubernetes Secrets is correct by default?
  'F017', // Core Concepts · m2: Which two of the following resources are cluster-scoped rather than na
  'F032', // Core Concepts · m2: Which command displays documentation for the fields of a resource, for
  'F037', // Core Concepts · m2: An etcd cluster has 3 members. How many member failures can it tolerat
  'F040', // Core Concepts · m3: Which two restartPolicy values are valid for the Pod template of a Job
  'F048', // Administration · m2: Which tool from the Kubernetes project bootstraps a cluster with ’init
  'F052', // Administration · m2: Which command lists all resource types available in the cluster, inclu
  'F055', // Administration · m2: How can you generate a Deployment manifest without creating the object
  'F058', // Administration · m2: In a managed Kubernetes service such as EKS, AKS or GKE, which part is
  'F059', // Administration · m2: Which API version naming indicates a stable, generally available API s
  'F060', // Scheduling · m4: Which Pod spec field provides the simplest way to constrain a Pod to n
  'F067', // Scheduling · m4: Which feature spreads Pods evenly across failure domains such as zones
  'F068', // Scheduling · m4: When deciding whether a Pod fits on a node, which values does the sche
  'F071', // Scheduling · m4: Which object assigns a relative importance to Pods so that the schedul
  'F076', // Scheduling · m4: Which stable Kubernetes feature lets Pods request specialized hardware
  'F078', // Containerization · m1: What is the key difference between containers and virtual machines?
  'F081', // Containerization · m1: Which component is a low-level OCI runtime that actually creates conta
  'F091', // Containerization · m1: Which Kubernetes resource lets you choose a different container runtim
  'F092', // Containerization · m1: Which practice best follows cloud native container guidelines?
  'F097', // Containerization · m1: A Pod uses image: busybox with no registry hostname and no tag. Which 
  'F099', // Administration · m2: According to the Kubernetes API deprecation policy, which statement ab
  'O001', // Networking · m6: Which statement reflects the Kubernetes networking model?
  'O006', // Networking · m6: How do you create a headless Service?
  'O011', // Networking · m6: Which statement about the Gateway API is correct?
  'O019', // Security · m5: Which RBAC object grants permissions within a single namespace?
  'O024', // Security · m5: Which policy levels are defined by the Pod Security Standards?
  'O025', // Security · m5: Which namespace label makes Pod Security Admission reject Pods that vi
  'O028', // Security · m5: Which securityContext setting prevents a container from running as UID
  'O039', // Troubleshooting · m6: Applications cannot resolve Service names, but connecting by IP addres
  'O041', // Troubleshooting · m8: A Pod is stuck in Pending and its events say ’pod has unbound immediat
  'O045', // Troubleshooting · m5: Two Pods in different namespaces can no longer communicate after a sec
  'O046', // Troubleshooting · m4: A Pod is stuck in Pending. Which two causes are plausible? (Choose 2)
  'O056', // Storage · m8: What does volumeBindingMode: WaitForFirstConsumer in a StorageClass do
  'O060', // Storage · m8: Why is hostPath generally discouraged for application workloads?
  'O062', // Storage · m8: Which StorageClass field must be enabled so that users can grow a PVC 
  'O063', // Networking · m7: Which is a key advantage of a microservices architecture compared with
  'O064', // Networking · m7: How is a native sidecar container (stable since Kubernetes 1.33) decla
  'O068', // Networking · m7: In Istio ambient mode, what provides L4 features such as mTLS to workl
];
