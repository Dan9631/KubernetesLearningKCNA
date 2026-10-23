# labs/04-scheduling/check.ps1  -  verificacion del reto del modulo 04
# Lo ejecuta: .\kcna.ps1 check 04   (solo ASCII en este archivo)

Check "Nodo kcna-worker2 tiene el taint lab-04-reto=gpu:NoSchedule" {
    $node = kubectl get node kcna-worker2 -o json | ConvertFrom-Json
    $node.spec.taints | Where-Object { $_.key -eq 'lab-04-reto' -and $_.value -eq 'gpu' -and $_.effect -eq 'NoSchedule' }
}

Check "Pod 'entrenamiento' Running en kcna-worker2, tolera lab-04-reto y usa zone=zona-b (no nodeName)" {
    $p = kubectl get pod entrenamiento -n lab-04 -o json | ConvertFrom-Json
    $tolera = $p.spec.tolerations | Where-Object { $_.key -eq 'lab-04-reto' -or ($_.operator -eq 'Exists' -and -not $_.key) }
    $usaZona = ($p.spec | ConvertTo-Json -Depth 20) -match 'zona-b'
    ($p.status.phase -eq 'Running') -and ($p.spec.nodeName -eq 'kcna-worker2') -and $tolera -and $usaZona
}

Check "Deployment 'api' con 2 replicas listas, todas en el nodo disktype=ssd (kcna-worker)" {
    $ready = kubectl get deploy api -n lab-04 -o jsonpath='{.status.readyReplicas}'
    $nodos = @((kubectl get pods -n lab-04 -l app=api --field-selector=status.phase=Running -o jsonpath='{.items[*].spec.nodeName}') -split ' ' | Where-Object { $_ })
    ($ready -eq '2') -and ($nodos.Count -eq 2) -and (@($nodos | Where-Object { $_ -ne 'kcna-worker' }).Count -eq 0)
}

Check "Los pods de 'api' tienen QoS class Guaranteed" {
    $qos = @((kubectl get pods -n lab-04 -l app=api --field-selector=status.phase=Running -o jsonpath='{.items[*].status.qosClass}') -split ' ' | Where-Object { $_ })
    ($qos.Count -ge 2) -and (@($qos | Where-Object { $_ -ne 'Guaranteed' }).Count -eq 0)
}

Check "DaemonSet 'monitor' con un pod listo en cada uno de los 3 nodos" {
    $ds = kubectl get ds monitor -n lab-04 -o json | ConvertFrom-Json
    ($ds.status.desiredNumberScheduled -eq 3) -and ($ds.status.numberReady -eq 3)
}

Check "ResourceQuota 'cuota' en lab-04 limita el namespace a 10 pods" {
    (kubectl get resourcequota cuota -n lab-04 -o jsonpath='{.spec.hard.pods}') -eq '10'
}
