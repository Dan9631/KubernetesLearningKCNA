# Reto del modulo 02: documentar la arquitectura real del cluster en un ConfigMap + crear un contexto
function Get-CmKey([string]$Key) {
    kubectl get configmap arquitectura -n lab-02 -o jsonpath="{.data.$Key}"
}

Check "ConfigMap 'arquitectura' existe en lab-02" {
    kubectl get configmap arquitectura -n lab-02 -o name
}
Check "Clave etcd-node = nodo donde corre etcd" {
    $real = kubectl get pods -n kube-system -l component=etcd -o jsonpath='{.items[0].spec.nodeName}'
    $real -and ((Get-CmKey 'etcd-node') -eq $real)
}
Check "Clave apiserver-image = imagen completa (con tag) del kube-apiserver" {
    $real = kubectl get pods -n kube-system -l component=kube-apiserver -o jsonpath='{.items[0].spec.containers[0].image}'
    $real -and ((Get-CmKey 'apiserver-image') -eq $real)
}
Check "Clave static-pods = numero de manifiestos en /etc/kubernetes/manifests del control-plane" {
    $real = @(podman exec kcna-control-plane ls /etc/kubernetes/manifests | Where-Object { $_ }).Count
    ($real -gt 0) -and ((Get-CmKey 'static-pods') -eq "$real")
}
Check "Claves coredns-replicas (replicas de CoreDNS) y deployment-api (apiVersion de Deployment)" {
    $real = kubectl get deploy coredns -n kube-system -o jsonpath='{.spec.replicas}'
    ((Get-CmKey 'coredns-replicas') -eq $real) -and ((Get-CmKey 'deployment-api') -eq 'apps/v1')
}
Check "El kubeconfig del lab tiene un contexto 'lab02' (cluster kind-kcna, namespace lab-02)" {
    $cfg = kubectl config view -o json | Out-String | ConvertFrom-Json
    $c = $cfg.contexts | Where-Object { $_.name -eq 'lab02' }
    $c -and ($c.context.cluster -eq 'kind-kcna') -and ($c.context.namespace -eq 'lab-02')
}
