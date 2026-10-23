# Instala Argo CD (manifiesto oficial, version fijada) en el namespace "argocd"
# del cluster kind del curso.
#
# Uso (desde la raiz del proyecto):
#   .\labs\12-application-delivery-gitops\gitops\install-argocd.ps1
#   .\labs\12-application-delivery-gitops\gitops\install-argocd.ps1 -Version v3.5.5
#
# Pasos: 1) descarga el manifiesto install.yaml de esa version
#        2) extrae las imagenes que usa y las carga al cluster (.\kcna.ps1 load)
#        3) kubectl apply --server-side (los CRDs de Argo CD son muy grandes
#           para el apply normal) y espera a que todo este listo.
param([string]$Version = 'v3.5.5')

$ErrorActionPreference = 'Continue'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$env:KUBECONFIG = Join-Path $Root '.kube\kcna-config'

$url = "https://raw.githubusercontent.com/argoproj/argo-cd/$Version/manifests/install.yaml"
$manifest = Join-Path $env:TEMP "argocd-install-$Version.yaml"

Write-Host "==> Descargando manifiesto de Argo CD $Version" -ForegroundColor Cyan
curl.exe -sSL --fail -m 180 -o $manifest $url
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $manifest)) { Write-Host "  XX  No se pudo descargar $url" -ForegroundColor Red; exit 1 }

# El manifiesto oficial usa "imagePullPolicy: Always": el kubelet intentaria
# descargar siempre y en este cluster (sin internet en los nodos) fallaria con
# ImagePullBackOff aunque la imagen ya este cargada. Se cambia a IfNotPresent.
$text = [IO.File]::ReadAllText($manifest) -replace 'imagePullPolicy: Always', 'imagePullPolicy: IfNotPresent'
[IO.File]::WriteAllText($manifest, $text, (New-Object System.Text.UTF8Encoding($false)))

$images = Select-String -Path $manifest -Pattern '^\s*image:\s*"?([^"\s]+)"?' |
    ForEach-Object { $_.Matches[0].Groups[1].Value } | Sort-Object -Unique
Write-Host "==> Imagenes de Argo CD $Version :" -ForegroundColor Cyan
$images | ForEach-Object { Write-Host "    $_" }
& (Join-Path $Root 'kcna.ps1') load @images

Write-Host '==> Aplicando el manifiesto en el namespace argocd' -ForegroundColor Cyan
kubectl create namespace argocd 2>$null | Out-Null
kubectl apply -n argocd --server-side --force-conflicts -f $manifest | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host '  XX  kubectl apply fallo' -ForegroundColor Red; exit 1 }

Write-Host '==> Esperando a que los componentes esten listos (1-3 min)' -ForegroundColor Cyan
foreach ($r in 'deployment/argocd-redis', 'deployment/argocd-repo-server', 'deployment/argocd-server',
               'statefulset/argocd-application-controller', 'deployment/argocd-dex-server',
               'deployment/argocd-applicationset-controller', 'deployment/argocd-notifications-controller') {
    kubectl -n argocd rollout status $r --timeout=180s 2>&1 | Select-Object -Last 1 | ForEach-Object { Write-Host "    $r -> $_" }
}
kubectl -n argocd get pods
Write-Host ''
Write-Host 'Argo CD instalado. UI:  kubectl port-forward -n argocd svc/argocd-server 8443:443  ->  https://localhost:8443' -ForegroundColor Green
Write-Host 'Usuario: admin. Contrasena inicial: ver el modulo 12 (secret argocd-initial-admin-secret).' -ForegroundColor Green
