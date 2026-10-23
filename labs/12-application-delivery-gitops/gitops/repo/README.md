# Repo de configuracion (GitOps) - modulo 12

Este repositorio describe el estado deseado de la app `gitops-web` en el namespace `lab-12`.
Argo CD lo vigila: cualquier commit en `main` se aplica solo al cluster.
No cambies el cluster con kubectl: cambia este repo.
