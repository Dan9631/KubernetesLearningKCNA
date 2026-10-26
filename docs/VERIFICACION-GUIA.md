# Guía de verificación del contenido contra fuentes oficiales

Objetivo: que todo lo que se estudia en el curso sea **correcto y comprobable**. Cada afirmación que el examen KCNA puede preguntar debe poder rastrearse a una fuente oficial. El contenido original lo redactaron agentes; los laboratorios se probaron en el clúster, pero la teoría y las preguntas no se han contrastado línea a línea. Esa es tu tarea.

Fecha de esta verificación: **2026-10-26**. Versión de referencia: **Kubernetes v1.37** y el temario KCNA de la CNCF vigente desde noviembre de 2025.

## Fuentes aceptadas (por orden de preferencia)

1. Documentación oficial de Kubernetes: `https://kubernetes.io/docs/...` (conceptos, referencia de la API, kubectl, glosario `https://kubernetes.io/docs/reference/glossary/`), blog oficial `https://kubernetes.io/blog/...`, KEPs en `https://github.com/kubernetes/enhancements`.
2. CNCF: `https://www.cncf.io/...` (proyectos y niveles de madurez en `https://www.cncf.io/projects/`), `https://glossary.cncf.io/`, `https://github.com/cncf/...` (curriculum, toc), `https://contribute.cncf.io/`, `https://landscape.cncf.io/`.
3. Documentación oficial del proyecto concreto: prometheus.io, opentelemetry.io, helm.sh, argo-cd.readthedocs.io, fluxcd.io, opengitops.dev, istio.io, linkerd.io, envoyproxy.io, gateway-api.sigs.k8s.io, keda.sh, knative.dev, opencontainers.org, containerd.io, etcd.io, coredns.io, cilium.io, kustomize.io, podman.io / docs.podman.io, docs.docker.com (referencia de Dockerfile e imágenes), kind.sigs.k8s.io, opencost.io, sre.google (SLI/SLO), 12factor.net.

La lista exacta de dominios que acepta el validador está en `quiz/src/validate.js` (constante `OFFICIAL`). **No uses** blogs personales, Medium, Stack Overflow, cursos comerciales, dumps de examen ni Wikipedia. Si necesitas una fuente oficial que el validador no acepta, dilo en tu reporte (no edites `validate.js`).

## Cómo verificar

- **Abre la fuente** con WebFetch y confirma el dato concreto. No des por buena una afirmación por memoria, sobre todo si depende de la versión: GA/beta, valores por defecto, nombres de campos, rangos (NodePort 30000-32767), cadencia de releases, niveles de madurez de la CNCF, proyectos graduados, etc.
- **Una pregunta es correcta** si: la respuesta marcada es la única defendible según la fuente; los distractores son claramente incorrectos (no "también valdría"); la explicación no contiene errores; y no depende de opiniones.
- **Si está mal**: corrígela en su sitio (pregunta, opciones, respuesta o explicación). Si es ambigua, reescríbela para que tenga una única respuesta. Si no tiene arreglo, sustitúyela **en su misma posición** por otra pregunta del mismo tema y módulo.
- **Nunca borres ni reordenes** preguntas: el id (`F001`, `O012`...) depende de la posición, y el progreso de los alumnos está guardado por id. Las preguntas nuevas van siempre **al final** del archivo.
- Mantén el estilo: pregunta y opciones **en inglés**; explicación **en español**, 1-3 frases. Multi-respuesta solo con "(Choose 2)" en el enunciado y exactamente 2 respuestas.
- Redacción original: no copies frases literales de la documentación más allá de términos técnicos.

## Formato del banco de preguntas (`quiz/src/src_*.js`)

Cada pregunta es un array:

```js
[topic, module, question, options, answerIndexes, explanation, source]
```

`source` (nuevo, obligatorio) es una URL o una lista de URLs oficiales que respaldan la respuesta, con ancla a la sección cuando exista:

```js
["Scheduling", 4, "Which field ...?", ["a", "b", "c", "d"], [1],
 "Explicación en español.",
 "https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/"],
```

Tras editar: `node quiz/src/build.js` y `node quiz/src/validate.js` desde la raíz del repo (debe terminar en `VALIDATION OK`). El build regenera `quiz/preguntas.js`; no edites ese archivo a mano.

## Formato de los módulos (`curso/NN-*.md`)

- Corrige en el texto cualquier dato erróneo o desactualizado (sin reescribir lo que está bien; respeta la estructura y el tono).
- Revisa con especial cuidado: las tablas comparativas, el "Resumen para repasar" y las "Preguntas tipo examen" del final (misma regla de una sola respuesta defendible).
- Añade al bloque de metadatos del inicio (el `>` bajo el título) una línea: `> **Verificado:** 2026-10-26 contra la documentación oficial (Kubernetes v1.37). Fuentes al final del módulo.`
- Añade al **final** del módulo una sección:

  ```markdown
  ## Fuentes oficiales

  - [Taints and Tolerations — kubernetes.io](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/): taints, efectos NoSchedule/PreferNoSchedule/NoExecute.
  - ...
  ```

  Entre 6 y 15 enlaces, cada uno con qué respalda. Solo fuentes que hayas abierto.
- **No cambies los comandos de los laboratorios** salvo que estén mal. Si cambias uno, vuelve a probarlo en el clúster (`$env:KUBECONFIG` apuntando a `.kube\kcna-config` del repo; ver `docs/CONVENCIONES.md`) y deja todo limpio con `.\kcna.ps1 reset NN`.

## Registro

Cada verificador escribe su propio registro en `docs/verificacion/<tu-parte>.md` con:

- Resumen: cuántos elementos revisados, cuántos correctos, corregidos, reescritos y añadidos.
- Tabla de cambios: `id o sección | problema encontrado | corrección | fuente`.
- Dudas que no pudiste resolver con una fuente oficial (no las "arregles" por intuición: déjalas aquí).
