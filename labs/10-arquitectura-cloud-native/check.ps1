# labs/10-arquitectura-cloud-native/check.ps1
# Reto: Deployment 'web' + HPA 'web' (autoscaling/v2) con min 2, max 6, CPU 60%, scaleDown window 60 s.
# Nota: se usa -o json + ConvertFrom-Json porque PowerShell 5.1 rompe las comillas dobles dentro de jsonpath.

function Get-Lab10Hpa {
    kubectl get hpa.v2.autoscaling web -n lab-10 -o json 2>$null | Out-String | ConvertFrom-Json
}

Check "Deployment 'web' (nginx:1.27-alpine) existe en lab-10 y define requests.cpu (sin requests el HPA no puede calcular %)" {
    $d = kubectl get deploy web -n lab-10 -o json | Out-String | ConvertFrom-Json
    $c = $d.spec.template.spec.containers[0]
    ($c.image -eq 'nginx:1.27-alpine') -and $c.resources.requests.cpu
}

Check "HPA 'web' apunta al Deployment 'web' con minReplicas=2 y maxReplicas=6" {
    $h = Get-Lab10Hpa
    ($h.spec.scaleTargetRef.kind -eq 'Deployment') -and ($h.spec.scaleTargetRef.name -eq 'web') -and
    ($h.spec.minReplicas -eq 2) -and ($h.spec.maxReplicas -eq 6)
}

Check "HPA 'web' usa la metrica de recurso cpu con averageUtilization=60" {
    $h = Get-Lab10Hpa
    $m = $h.spec.metrics | Where-Object { $_.type -eq 'Resource' -and $_.resource.name -eq 'cpu' }
    $m -and ($m.resource.target.type -eq 'Utilization') -and ($m.resource.target.averageUtilization -eq 60)
}

Check "HPA 'web' tiene behavior.scaleDown.stabilizationWindowSeconds=60" {
    (Get-Lab10Hpa).spec.behavior.scaleDown.stabilizationWindowSeconds -eq 60
}

Check "El HPA funciona: ScalingActive=True, ya lee la CPU y el Deployment tiene al menos 2 replicas listas" {
    $h = Get-Lab10Hpa
    $active = $h.status.conditions | Where-Object { $_.type -eq 'ScalingActive' -and $_.status -eq 'True' }
    $ready = kubectl get deploy web -n lab-10 -o jsonpath='{.status.readyReplicas}'
    $active -and $h.status.currentMetrics -and ([int]$ready -ge 2)
}
