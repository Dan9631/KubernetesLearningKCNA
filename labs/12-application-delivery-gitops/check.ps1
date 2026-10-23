# labs/12-application-delivery-gitops/check.ps1  (lo ejecuta: .\kcna.ps1 check 12)

# --- Parte A: Kustomize (overlay qa) ---
Check "Kustomize: Deployment 'qa-web' en lab-12 con 2 replicas listas" {
    (kubectl get deploy qa-web -n lab-12 -o jsonpath='{.status.readyReplicas}') -eq '2'
}
Check "Kustomize: 'qa-web' usa la imagen nginx:1.28-alpine y sus pods llevan env=qa" {
    ((kubectl get deploy qa-web -n lab-12 -o jsonpath='{.spec.template.spec.containers[0].image}') -eq 'nginx:1.28-alpine') -and
    ((kubectl get deploy qa-web -n lab-12 -o jsonpath='{.spec.template.metadata.labels.env}') -eq 'qa')
}
Check "Kustomize: Service 'qa-web' selecciona solo pods con env=qa" {
    (kubectl get svc qa-web -n lab-12 -o jsonpath='{.spec.selector.env}') -eq 'qa'
}

# --- Parte B: Helm (release tienda: install -> upgrade -> rollback) ---
Check "Helm: release 'tienda' desplegado y su ultima revision es 'Rollback to 1'" {
    $h = (helm history tienda -n lab-12 -o json | Out-String | ConvertFrom-Json)
    $last = @($h)[-1]
    ($last.status -eq 'deployed') -and ($last.description -eq 'Rollback to 1') -and ([int]$last.revision -ge 3)
}
Check "Helm: tras el rollback 'tienda' tiene 1 replica y muestra el mensaje 'Tienda v1'" {
    ((kubectl get deploy tienda -n lab-12 -o jsonpath='{.spec.replicas}') -eq '1') -and
    ((kubectl get cm tienda-html -n lab-12 -o jsonpath='{.data.index\.html}') -match 'Tienda v1')
}

# --- Parte C (opcional): GitOps con Argo CD. Solo se evalua si Argo CD esta instalado ---
$null = Invoke-Native kubectl @('get', 'namespace', 'argocd', '-o', 'name')
if ($LASTEXITCODE -eq 0) {
    Check "GitOps: Application 'gitops-demo' esta Synced y Healthy" {
        (kubectl get application gitops-demo -n argocd -o jsonpath='{.status.sync.status}/{.status.health.status}') -eq 'Synced/Healthy'
    }
    Check "GitOps: 'gitops-web' tiene 3 replicas listas (cambiado con un commit, no con kubectl)" {
        ((kubectl get deploy gitops-web -n lab-12 -o jsonpath='{.spec.replicas}') -eq '3') -and
        ((kubectl get deploy gitops-web -n lab-12 -o jsonpath='{.status.readyReplicas}') -eq '3')
    }
    Check "GitOps: ConfigMap 'gitops-config' (entorno=lab) creado por Argo CD desde el repo" {
        ((kubectl get cm gitops-config -n lab-12 -o jsonpath='{.data.entorno}') -eq 'lab') -and
        ((kubectl get cm gitops-config -n lab-12 -o jsonpath='{.metadata.annotations.argocd\.argoproj\.io/tracking-id}') -match '^gitops-demo:')
    }
} else {
    Write-Host '  --  Parte C (Argo CD) omitida: Argo CD no esta instalado en el cluster' -ForegroundColor DarkGray
}
