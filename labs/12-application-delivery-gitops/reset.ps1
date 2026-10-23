# Limpieza fuera del namespace lab-12: Argo CD (namespace argocd, CRDs y
# ClusterRoles/Bindings). Lo ejecuta ".\kcna.ps1 reset 12" antes de borrar lab-12.
& (Join-Path $PSScriptRoot 'gitops\uninstall-argocd.ps1')
