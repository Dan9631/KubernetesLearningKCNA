# Carga el entorno del laboratorio KCNA en la terminal ACTUAL.
# Uso (con el punto al inicio):   . .\kcna-env.ps1
#
# - Apunta kubectl SOLO al cluster local "kind-kcna" (archivo .kube\kcna-config del proyecto).
#   Tu ~/.kube/config (clusters de la empresa) no se toca ni se usa mientras este entorno este cargado.
# - Define el alias "k" para kubectl y autocompletado con TAB.

$KcnaRoot = $PSScriptRoot
$env:KUBECONFIG = Join-Path $KcnaRoot '.kube\kcna-config'
$env:KIND_EXPERIMENTAL_PROVIDER = 'podman'
# kubectl con la misma version que el cluster (solo en esta terminal; el kubectl global no cambia)
$kcnaBin = Join-Path $KcnaRoot '.bin'
if ((Test-Path (Join-Path $kcnaBin 'kubectl.exe')) -and ($env:PATH -notlike "$kcnaBin;*")) { $env:PATH = "$kcnaBin;$env:PATH" }

Set-Alias -Name k -Value kubectl -Scope Global

# Autocompletado de kubectl (y del alias k)
kubectl completion powershell | Out-String | Invoke-Expression
Register-ArgumentCompleter -CommandName 'k' -ScriptBlock $__kubectlCompleterBlock -ErrorAction SilentlyContinue

# Prompt que recuerda en que cluster estas
function global:prompt {
    $ctx = (kubectl config current-context 2>$null)
    if (-not $ctx) { $ctx = 'sin-cluster' }
    Write-Host "[kcna:$ctx] " -NoNewline -ForegroundColor Cyan
    "PS $($executionContext.SessionState.Path.CurrentLocation)> "
}

function global:kcna { & (Join-Path $KcnaRoot 'kcna.ps1') @args }

Write-Host "Entorno KCNA cargado. KUBECONFIG=$env:KUBECONFIG" -ForegroundColor Green
Write-Host "Comandos: k get nodes | kcna help" -ForegroundColor Green
