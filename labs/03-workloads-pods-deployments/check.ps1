# Reto del modulo 03: Deployment 'web' actualizado con rolling update, ConfigMap y Secret
Check "Deployment 'web' en lab-03 con 3 replicas listas" {
    (kubectl get deploy web -n lab-03 -o jsonpath='{.status.readyReplicas}') -eq '3'
}
Check "Deployment 'web' usa nginx:1.28-alpine y las 3 replicas estan actualizadas" {
    $img = kubectl get deploy web -n lab-03 -o jsonpath='{.spec.template.spec.containers[0].image}'
    $upd = kubectl get deploy web -n lab-03 -o jsonpath='{.status.updatedReplicas}'
    ($img -eq 'nginx:1.28-alpine') -and ($upd -eq '3')
}
Check "Deployment 'web' tiene al menos 2 revisiones (se creo con 1.27 y luego se actualizo)" {
    $rev = kubectl get deploy web -n lab-03 -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}'
    $rs = kubectl get rs -n lab-03 -o jsonpath='{range .items[*]}{.metadata.ownerReferences[0].name}={.spec.template.spec.containers[0].image} {end}'
    ([int]$rev -ge 2) -and ((($rs -split ' ') | Where-Object { $_ -eq 'web=nginx:1.27-alpine' }) -ne $null)
}
Check "Estrategia RollingUpdate con maxSurge=1 y maxUnavailable=0" {
    $s = kubectl get deploy web -n lab-03 -o jsonpath='{.spec.strategy.type}/{.spec.strategy.rollingUpdate.maxSurge}/{.spec.strategy.rollingUpdate.maxUnavailable}'
    $s -eq 'RollingUpdate/1/0'
}
Check "ConfigMap 'web-config' montado en /usr/share/nginx/html (la pagina servida es su index.html)" {
    $cm = kubectl get configmap web-config -n lab-03 -o jsonpath='{.data.index\.html}'
    $served = kubectl exec deploy/web -n lab-03 -- wget -qO- http://localhost/
    $cm -and ((($served | Out-String).Trim()) -eq (($cm | Out-String).Trim()))
}
Check "Variable API_TOKEN del contenedor viene del Secret 'web-secret' (clave api-token)" {
    $ref = kubectl get deploy web -n lab-03 -o jsonpath='{range .spec.template.spec.containers[0].env[*]}{.name}={.valueFrom.secretKeyRef.name}/{.valueFrom.secretKeyRef.key} {end}'
    (($ref -split ' ') | Where-Object { $_ -eq 'API_TOKEN=web-secret/api-token' }) -ne $null
}
