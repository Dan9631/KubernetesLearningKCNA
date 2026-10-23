# Limpieza fuera del namespace lab-02: el contexto 'lab02' que se crea en el reto.
# No cambia el contexto actual; solo borra la entrada 'lab02' si existe.
$ctxs = Invoke-Native kubectl @('config', 'get-contexts', '-o', 'name')
if ($ctxs -contains 'lab02') {
    Invoke-Native kubectl @('config', 'delete-context', 'lab02') | Write-Host
}
