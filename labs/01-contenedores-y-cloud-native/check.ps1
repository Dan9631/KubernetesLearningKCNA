# Reto del modulo 01: imagen propia v2 construida con Podman y ejecutada como Pod en lab-01
Check "La imagen localhost/kcna-web:2.0 existe en Podman (podman build -t kcna-web:2.0 .)" {
    $null = podman image exists localhost/kcna-web:2.0
    $LASTEXITCODE -eq 0
}
Check "La imagen 2.0 tiene la etiqueta OCI org.opencontainers.image.version=2.0" {
    $labels = podman image inspect localhost/kcna-web:2.0 --format '{{json .Labels}}' | ConvertFrom-Json
    $labels.'org.opencontainers.image.version' -eq '2.0'
}
Check "Pod 'web-v2' en lab-01 usa la imagen localhost/kcna-web:2.0" {
    (kubectl get pod web-v2 -n lab-01 -o jsonpath='{.spec.containers[0].image}') -eq 'localhost/kcna-web:2.0'
}
Check "Pod 'web-v2' tiene los labels app=kcna-web y version=v2" {
    (kubectl get pod web-v2 -n lab-01 -o jsonpath='{.metadata.labels.app}/{.metadata.labels.version}') -eq 'kcna-web/v2'
}
Check "Pod 'web-v2' esta Running y listo (imagen cargada con .\kcna.ps1 load)" {
    (kubectl get pod web-v2 -n lab-01 -o jsonpath='{.status.containerStatuses[0].ready}') -eq 'true'
}
Check "La pagina que sirve 'web-v2' contiene el texto 'v2'" {
    (kubectl exec web-v2 -n lab-01 -- wget -qO- http://localhost/ | Out-String) -match 'v2'
}
