# labs/04-scheduling/reset.ps1 - limpia lo que el lab 04 deja FUERA del namespace lab-04
# Lo ejecuta: .\kcna.ps1 reset 04   (dot-source desde kcna.ps1; solo ASCII)
# - Taints con prefijo lab-04 en cualquier nodo
# - Labels con prefijo lab-04 en cualquier nodo
# - PriorityClass lab-04-*
# - Static pod copiado a kcna-worker2

$old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
try {
    $nodes = (kubectl get nodes -o json 2>$null | ConvertFrom-Json).items
    foreach ($n in $nodes) {
        $name = $n.metadata.name
        foreach ($t in @($n.spec.taints)) {
            if ($t -and $t.key -like 'lab-04*') {
                kubectl taint nodes $name "$($t.key):$($t.effect)-" 2>&1 | ForEach-Object { "  $_" } | Write-Host
            }
        }
        foreach ($l in @($n.metadata.labels.PSObject.Properties.Name)) {
            if ($l -like 'lab-04*') {
                kubectl label node $name "$l-" 2>&1 | ForEach-Object { "  $_" } | Write-Host
            }
        }
    }
    $pcs = kubectl get priorityclass -o name 2>$null | Where-Object { $_ -like '*/lab-04-*' }
    foreach ($pc in $pcs) { kubectl delete $pc 2>&1 | ForEach-Object { "  $_" } | Write-Host }

    podman exec kcna-worker2 rm -f /etc/kubernetes/manifests/lab-04-estatico.yaml 2>&1 | Out-Null
} finally {
    $ErrorActionPreference = $old
}
