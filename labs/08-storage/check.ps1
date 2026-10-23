# labs/08-storage/check.ps1 - Reto del modulo 08 (ASCII only)
Check "StorageClass 'lab-08-retener' (rancher.io/local-path, Retain, WaitForFirstConsumer)" {
    $sc = (kubectl get sc lab-08-retener -o json | Out-String) | ConvertFrom-Json
    ($sc.provisioner -eq 'rancher.io/local-path') -and ($sc.reclaimPolicy -eq 'Retain') -and ($sc.volumeBindingMode -eq 'WaitForFirstConsumer')
}
Check "PVC 'reto-datos' en lab-08: Bound, 64Mi, ReadWriteOnce, clase lab-08-retener" {
    $pvc = (kubectl get pvc reto-datos -n lab-08 -o json | Out-String) | ConvertFrom-Json
    ($pvc.status.phase -eq 'Bound') -and ($pvc.spec.storageClassName -eq 'lab-08-retener') -and
    ($pvc.spec.resources.requests.storage -eq '64Mi') -and (@($pvc.spec.accessModes) -contains 'ReadWriteOnce')
}
Check "El PV aprovisionado para 'reto-datos' tiene reclaimPolicy Retain" {
    $pv = kubectl get pvc reto-datos -n lab-08 -o jsonpath='{.spec.volumeName}'
    $pv -and ((kubectl get pv $pv -o jsonpath='{.spec.persistentVolumeReclaimPolicy}') -eq 'Retain')
}
Check "Pod 'reto-app' Running y montando el PVC 'reto-datos'" {
    $p = (kubectl get pod reto-app -n lab-08 -o json | Out-String) | ConvertFrom-Json
    ($p.status.phase -eq 'Running') -and (@($p.spec.volumes.persistentVolumeClaim.claimName) -contains 'reto-datos')
}
Check "Dentro de 'reto-app', /datos/hola.txt contiene 'kcna'" {
    (kubectl exec reto-app -n lab-08 -- cat /datos/hola.txt) -match 'kcna'
}
