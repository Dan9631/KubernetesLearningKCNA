# Desinstala Argo CD del cluster del curso (namespace argocd + CRDs + RBAC de cluster).
# Uso (desde la raiz del proyecto):
#   .\labs\12-application-delivery-gitops\gitops\uninstall-argocd.ps1
# Tambien lo ejecuta ".\kcna.ps1 reset 12" (via reset.ps1).
#
# Orden: primero las Applications (mientras el controlador sigue vivo), luego el
# namespace y al final los recursos de cluster etiquetados part-of=argocd.
# Las Applications del lab no llevan finalizer, asi que borrarlas NO borra lo
# que desplegaron en lab-12 (eso lo limpia el reset al borrar el namespace).
$ErrorActionPreference = 'Continue'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$env:KUBECONFIG = Join-Path $Root '.kube\kcna-config'

$null = kubectl get namespace argocd 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host '  OK  Argo CD no esta instalado (namespace argocd no existe)' -ForegroundColor Green; return }

Write-Host '==> Desinstalando Argo CD' -ForegroundColor Cyan
kubectl delete applications.argoproj.io --all -n argocd --ignore-not-found --timeout=60s 2>$null
kubectl delete applicationsets.argoproj.io --all -n argocd --ignore-not-found --timeout=60s 2>$null
kubectl delete namespace argocd --ignore-not-found --timeout=180s
kubectl delete crd,clusterrole,clusterrolebinding -l app.kubernetes.io/part-of=argocd --ignore-not-found
Write-Host '  OK  Argo CD desinstalado' -ForegroundColor Green
