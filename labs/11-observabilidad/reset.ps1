# labs/11-observabilidad/reset.ps1
# Lo carga "kcna.ps1 reset 11" antes de borrar el namespace lab-11.
# helm uninstall elimina tambien lo que el chart crea FUERA del namespace (ClusterRoles, ClusterRoleBindings).
$rel = Invoke-Native helm @('list', '-n', 'lab-11', '-q')
if ($rel -contains 'prometheus') {
    Invoke-Native helm @('uninstall', 'prometheus', '-n', 'lab-11', '--wait') | Write-Host
} else {
    Write-Host '  (no hay release prometheus en lab-11)'
}
