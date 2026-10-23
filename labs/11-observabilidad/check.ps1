# labs/11-observabilidad/check.ps1
# Reto: Prometheus (release 'prometheus') en lab-11 descubriendo y scrapeando las 2 replicas de 'tienda'.
# Las consultas PromQL se hacen a traves del proxy del apiserver (no necesitas port-forward abierto).

function Invoke-Lab11Query([string]$PromQL) {
    $e = [uri]::EscapeDataString($PromQL)
    $raw = kubectl get --raw "/api/v1/namespaces/lab-11/services/prometheus-server:80/proxy/api/v1/query?query=$e" 2>$null
    if (-not $raw) { return @() }
    $r = $raw | Out-String | ConvertFrom-Json
    if ($r.status -ne 'success') { return @() }
    $r.data.result
}

Check "Prometheus server corriendo en lab-11 (helm release 'prometheus', pod Ready)" {
    $j = kubectl get pods -n lab-11 -l 'app.kubernetes.io/name=prometheus,app.kubernetes.io/component=server' -o json | Out-String | ConvertFrom-Json
    $ready = $j.items | Where-Object { $_.status.conditions | Where-Object { $_.type -eq 'Ready' -and $_.status -eq 'True' } }
    @($ready).Count -ge 1
}

Check "kube-state-metrics y node-exporter estan siendo scrapeados (up == 1)" {
    $ksm  = @(Invoke-Lab11Query 'up{job="kubernetes-service-endpoints", service="prometheus-kube-state-metrics"} == 1')
    $node = @(Invoke-Lab11Query 'up{job="kubernetes-service-endpoints", service="prometheus-prometheus-node-exporter"} == 1')
    ($ksm.Count -ge 1) -and ($node.Count -ge 1)
}

Check "Deployment 'tienda' en lab-11 con 2 replicas listas" {
    (kubectl get deploy tienda -n lab-11 -o jsonpath='{.status.readyReplicas}') -eq '2'
}

Check "Los pods de 'tienda' tienen las anotaciones prometheus.io/scrape, port y path" {
    $d = kubectl get deploy tienda -n lab-11 -o json | Out-String | ConvertFrom-Json
    $a = $d.spec.template.metadata.annotations
    ($a.'prometheus.io/scrape' -eq 'true') -and ($a.'prometheus.io/port' -eq '8080') -and ($a.'prometheus.io/path' -eq '/metrics.txt')
}

Check "Prometheus ve 2 targets de 'tienda' con up == 1 (job kubernetes-pods)" {
    @(Invoke-Lab11Query 'up{job="kubernetes-pods", app="tienda"} == 1').Count -ge 2
}

Check "La metrica tienda_pedidos_total crece: sum(rate(...[1m])) > 0" {
    @(Invoke-Lab11Query 'sum(rate(tienda_pedidos_total[1m])) > 0').Count -ge 1
}
