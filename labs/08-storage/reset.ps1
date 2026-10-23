# labs/08-storage/reset.ps1 - limpieza de recursos cluster-scoped del modulo 08 (ASCII only)
# Lo ejecuta ".\kcna.ps1 reset 08" (dot-source) ANTES de borrar el namespace lab-08.
# 1) Borra primero el namespace (pods y PVCs) para que los PVs queden libres.
Info 'Borrando namespace lab-08 (pods y PVCs) para liberar los PVs'
$null = Invoke-Native kubectl @('delete', 'namespace', 'lab-08', '--ignore-not-found', '--timeout=120s')

# 2) PVs del lab: los que tienen prefijo lab-08-, los de StorageClasses lab-08-* y los que
#    reclamaba lab-08 (con Retain quedan "Released" y no se borran solos).
$pvJson = (Invoke-Native kubectl @('get', 'pv', '-o', 'json') | Out-String) | ConvertFrom-Json
foreach ($pv in $pvJson.items) {
    $name = $pv.metadata.name
    $mine = ($name -like 'lab-08-*') -or ("$($pv.spec.storageClassName)" -like 'lab-08-*') -or
            ("$($pv.spec.claimRef.namespace)" -eq 'lab-08')
    if ($mine) {
        $null = Invoke-Native kubectl @('delete', 'pv', $name, '--ignore-not-found', '--wait=false')
        Ok "PV borrado: $name"
    }
}

# 3) StorageClasses del lab
$scs = Invoke-Native kubectl @('get', 'storageclass', '-o', 'name') | Where-Object { $_ -like 'storageclass.storage.k8s.io/lab-08-*' }
foreach ($sc in $scs) {
    $null = Invoke-Native kubectl @('delete', $sc, '--ignore-not-found')
    Ok "StorageClass borrada: $sc"
}

# 4) Datos que quedan en los nodos (hostPath del PV estatico y carpetas Retain de local-path)
foreach ($n in $Nodes) {
    $null = Invoke-Native podman @('exec', $n, 'sh', '-c', 'rm -rf /tmp/lab-08-pv /var/local-path-provisioner/*_lab-08_*')
}
Ok 'Carpetas del lab 08 en los nodos limpiadas'
