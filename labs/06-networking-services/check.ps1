# labs/06-networking-services/check.ps1 - Reto del modulo 06 (ASCII only)
Check "Deployment 'tienda' en lab-06 con 2 replicas listas" {
    (kubectl get deploy tienda -n lab-06 -o jsonpath='{.status.readyReplicas}') -eq '2'
}
Check "Service 'tienda' (ClusterIP, puerto 8080 -> 80) con 2 endpoints en su EndpointSlice" {
    $type = kubectl get svc tienda -n lab-06 -o jsonpath='{.spec.type}'
    $port = kubectl get svc tienda -n lab-06 -o jsonpath='{.spec.ports[0].port}'
    $ips  = kubectl get endpointslices -n lab-06 -l kubernetes.io/service-name=tienda -o jsonpath='{.items[*].endpoints[*].addresses[0]}'
    ($type -eq 'ClusterIP') -and ($port -eq '8080') -and ((("$ips" -split '\s+') | Where-Object { $_ }).Count -eq 2)
}
Check "Service headless 'tienda-headless' (clusterIP: None) que selecciona app=tienda" {
    ((kubectl get svc tienda-headless -n lab-06 -o jsonpath='{.spec.clusterIP}') -eq 'None') -and
    ((kubectl get svc tienda-headless -n lab-06 -o jsonpath='{.spec.selector.app}') -eq 'tienda')
}
Check "Ingress: http://localhost:8080/lab06/tienda responde un pod tienda-*" {
    $r = Invoke-WebRequest 'http://localhost:8080/lab06/tienda' -UseBasicParsing -TimeoutSec 10
    $r.Content -match 'Hostname: tienda-'
}
Check "HTTPRoute (Gateway API): http://localhost:8080/lab06/gw-tienda responde un pod tienda-*" {
    $r = Invoke-WebRequest 'http://localhost:8080/lab06/gw-tienda' -UseBasicParsing -TimeoutSec 10
    $r.Content -match 'Hostname: tienda-'
}
