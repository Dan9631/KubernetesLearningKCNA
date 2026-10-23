# labs/05-seguridad/check.ps1  -  verificacion del reto del modulo 05
# Lo ejecuta: .\kcna.ps1 check 05   (solo ASCII en este archivo)

$sa = 'system:serviceaccount:lab-05:despliegues'

Check "ServiceAccount 'despliegues' existe y puede crear y borrar deployments en lab-05" {
    (kubectl get serviceaccount despliegues -n lab-05 -o name) -and
    ((kubectl auth can-i create deployments.apps -n lab-05 --as=$sa) -eq 'yes') -and
    ((kubectl auth can-i delete deployments.apps -n lab-05 --as=$sa) -eq 'yes')
}

Check "'despliegues' NO puede leer secrets ni crear deployments fuera de lab-05 (minimo privilegio)" {
    (kubectl get serviceaccount despliegues -n lab-05 -o name) -and
    ((kubectl auth can-i get secrets -n lab-05 --as=$sa) -eq 'no') -and
    ((kubectl auth can-i create deployments.apps -n default --as=$sa) -eq 'no')
}

Check "'despliegues' puede listar nodos (pero no borrarlos) via un ClusterRoleBinding lab-05-*" {
    $crb = (kubectl get clusterrolebindings -o json | ConvertFrom-Json).items | Where-Object {
        $_.metadata.name -like 'lab-05-*' -and ($_.subjects | Where-Object { $_.kind -eq 'ServiceAccount' -and $_.name -eq 'despliegues' -and $_.namespace -eq 'lab-05' })
    }
    $crb -and ((kubectl auth can-i list nodes --as=$sa) -eq 'yes') -and ((kubectl auth can-i delete nodes --as=$sa) -eq 'no')
}

Check "Namespace lab-05 aplica Pod Security Admission 'restricted' (enforce)" {
    (kubectl get ns lab-05 -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}') -eq 'restricted'
}

Check "Pod 'app-segura' Running con runAsUser 2000 y readOnlyRootFilesystem" {
    $p = kubectl get pod app-segura -n lab-05 -o json | ConvertFrom-Json
    $uid = $p.spec.containers[0].securityContext.runAsUser
    if (-not $uid) { $uid = $p.spec.securityContext.runAsUser }
    ($p.status.phase -eq 'Running') -and ($uid -eq 2000) -and ($p.spec.containers[0].securityContext.readOnlyRootFilesystem -eq $true)
}

Check "NetworkPolicy 'db-solo-api': a los pods app=db solo entran pods app=api por TCP 6379" {
    $np = kubectl get networkpolicy db-solo-api -n lab-05 -o json | ConvertFrom-Json
    $rule = @($np.spec.ingress)[0]
    ($np.spec.podSelector.matchLabels.app -eq 'db') -and
    (@($np.spec.ingress).Count -eq 1) -and
    (@($rule.from)[0].podSelector.matchLabels.app -eq 'api') -and
    (@($rule.ports)[0].port -eq 6379)
}
