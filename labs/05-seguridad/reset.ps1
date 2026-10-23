# labs/05-seguridad/reset.ps1 - limpia lo que el lab 05 deja FUERA del namespace lab-05
# Lo ejecuta: .\kcna.ps1 reset 05   (dot-source desde kcna.ps1; solo ASCII)
# - ClusterRoleBindings y ClusterRoles cuyo nombre empieza por lab-05-

$old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
try {
    foreach ($kind in 'clusterrolebinding', 'clusterrole') {
        $items = kubectl get $kind -o name 2>$null | Where-Object { $_ -like '*/lab-05-*' }
        foreach ($i in $items) { kubectl delete $i 2>&1 | ForEach-Object { "  $_" } | Write-Host }
    }
} finally {
    $ErrorActionPreference = $old
}
