# labs/09-troubleshooting-debugging/check.ps1
# Reto: los 6 workloads del lab arreglados (Running/Ready, sin reinicios) y el Service 'shop' con endpoints.
# Nota: se usa -o json + ConvertFrom-Json porque PowerShell 5.1 rompe las comillas dobles dentro de jsonpath.

$apps = @('frontend', 'api', 'cache', 'worker', 'reporter', 'shop')

function Get-Lab09AppPods {
    $j = kubectl get pods -n lab-09 -l 'app in (frontend,api,cache,worker,reporter,shop)' -o json | Out-String | ConvertFrom-Json
    # ignorar pods que se estan borrando (rollout en curso)
    @($j.items | Where-Object { -not $_.metadata.deletionTimestamp })
}

Check "Existen los 6 Deployments del lab (frontend, api, cache, worker, reporter, shop)" {
    $names = @(kubectl get deploy -n lab-09 -o name) -replace '^deployment\.apps/', ''
    -not ($apps | Where-Object { $names -notcontains $_ })
}

Check "Todos los Deployments tienen todas sus replicas actualizadas y listas (READY x/x)" {
    $j = kubectl get deploy -n lab-09 -o json | Out-String | ConvertFrom-Json
    $mine = @($j.items | Where-Object { $apps -contains $_.metadata.name })
    $bad = $mine | Where-Object {
        $_.status.readyReplicas -ne $_.spec.replicas -or $_.status.updatedReplicas -ne $_.spec.replicas -or $_.status.replicas -ne $_.spec.replicas
    }
    ($mine.Count -eq 6) -and (-not $bad)
}

Check "Ningun pod de las apps esta Pending / ImagePullBackOff / CrashLoopBackOff / CreateContainerConfigError" {
    $pods = Get-Lab09AppPods
    $bad = $pods | Where-Object {
        $_.status.phase -ne 'Running' -or ($_.status.containerStatuses | Where-Object { $_.state.waiting })
    }
    ($pods.Count -ge 8) -and (-not $bad)
}

Check "Ningun contenedor de las apps se ha reiniciado (RESTARTS = 0; si arreglaste tarde: kubectl rollout restart)" {
    $pods = Get-Lab09AppPods
    $restarts = $pods | ForEach-Object { $_.status.containerStatuses } | Where-Object { $_.restartCount -gt 0 }
    ($pods.Count -ge 8) -and (-not $restarts)
}

Check "El Service 'shop' tiene al menos 2 endpoints listos (selector correcto y pods Ready)" {
    $j = kubectl get endpointslices -n lab-09 -l kubernetes.io/service-name=shop -o json | Out-String | ConvertFrom-Json
    $ready = @($j.items | ForEach-Object { $_.endpoints } | Where-Object { $_ -and $_.conditions.ready })
    $ready.Count -ge 2
}

Check "El Service 'shop' responde por HTTP desde dentro del cluster" {
    $p = kubectl get pods -n lab-09 -l app=frontend --field-selector=status.phase=Running -o name | Select-Object -First 1
    (kubectl exec -n lab-09 $p -- wget -qO- -T 3 http://shop) -match 'nginx'
}
