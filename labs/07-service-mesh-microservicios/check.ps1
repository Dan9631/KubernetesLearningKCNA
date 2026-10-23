# labs/07-service-mesh-microservicios/check.ps1 - Reto del modulo 07 (ASCII only)
# Nota: se parsea JSON en vez de usar filtros jsonpath con comillas dobles (PowerShell 5.1 las elimina).
Check "Pod 'reto-sidecar' en lab-07 esta Ready y tiene un contenedor 'app'" {
    $p = (kubectl get pod reto-sidecar -n lab-07 -o json | Out-String) | ConvertFrom-Json
    $ready = ($p.status.conditions | Where-Object { $_.type -eq 'Ready' }).status
    ($ready -eq 'True') -and (@($p.spec.containers.name) -contains 'app')
}
Check "'shipper' es un sidecar nativo (initContainer con restartPolicy: Always)" {
    $p = (kubectl get pod reto-sidecar -n lab-07 -o json | Out-String) | ConvertFrom-Json
    ($p.spec.initContainers | Where-Object { $_.name -eq 'shipper' }).restartPolicy -eq 'Always'
}
Check "Los logs de 'shipper' muestran lo que escribe 'app' ('pedido procesado')" {
    $log = kubectl logs reto-sidecar -n lab-07 -c shipper --tail=5
    "$log" -match 'pedido procesado'
}
Check "HTTPRoute 'reto-canary' tiene una regla que reparte 80/20 entre whoami-v1 y whoami-v2" {
    $r = (kubectl get httproute reto-canary -n lab-07 -o json | Out-String) | ConvertFrom-Json
    $hit = $r.spec.rules | Where-Object {
        $v1 = $_.backendRefs | Where-Object { $_.name -eq 'whoami-v1' }
        $v2 = $_.backendRefs | Where-Object { $_.name -eq 'whoami-v2' }
        $v1 -and $v2 -and ($v1.weight -eq 80) -and ($v2.weight -eq 20)
    }
    [bool]$hit
}
Check "Con la cabecera x-version: v2, http://localhost:8080/lab07/reto responde SIEMPRE v2" {
    $names = 1..5 | ForEach-Object {
        $resp = Invoke-WebRequest 'http://localhost:8080/lab07/reto' -Headers @{ 'x-version' = 'v2' } -UseBasicParsing -TimeoutSec 10
        if ($resp.Content -match 'Name: (v\d)') { $Matches[1] } else { 'none' }
    }
    @($names | Where-Object { $_ -ne 'v2' }).Count -eq 0
}
Check "Sin cabecera, http://localhost:8080/lab07/reto responde whoami (v1 o v2)" {
    $resp = Invoke-WebRequest 'http://localhost:8080/lab07/reto' -UseBasicParsing -TimeoutSec 10
    $resp.Content -match 'Name: v[12]'
}
