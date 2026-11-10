# Guía para construir simulaciones y páginas del sitio KCNA

Sitio estático con **Astro 7 + Svelte 5 (runes)**. Los módulos del curso (`../curso/*.md`) se renderizan tal cual; las simulaciones son islas Svelte que se montan **antes** del texto de cada módulo. Esta guía es el contrato que comparten todos los que construyen piezas.

## Estructura

```
web/
  src/layouts/Base.astro          cabecera, navegación, tema
  src/styles/global.css           tokens (colores, tipografía, .sim, .btn, .chip, .prose)
  src/lib/modules.ts              metadatos de los 14 módulos, DOMAINS, url(), pad()
  src/lib/progress.svelte.ts      progreso del alumno en localStorage (runas)
  src/lib/motion.ts               ms(n) / wait(n): respetan prefers-reduced-motion
  src/lib/sync.svelte.ts          sincronización opcional y cifrada con el Worker (sync/); PUBLIC_SYNC_URL al compilar
  src/lib/hoja.ts                 hoja de recuperación del código (HTML autónomo con código, enlace y QR)
  src/lib/lectura.ts              marcador de lectura, enlace ?r= y QR
  src/lib/plegar.ts               HTML del módulo: quita el h1 del markdown, pliega ficha, Comandos clave y Fuentes, inserta las comprobaciones (vía Prosa.astro)
  src/lib/comprueba.ts            predicciones por simulación y comprobaciones por sección (data/comprueba.json, validado en prebuild)
  src/components/Predice.svelte   "Antes de tocar: ¿qué crees que pasará?" encima de cada simulación (lo monta SimHost)
  src/lib/voz.svelte.ts           lectura en voz alta (Web Speech API): play/pause/stop, voces, preferencias
  src/sims/ClusterCanvas.svelte   lienzo de clúster compartido (nodos + pods animados)
  src/sims/Stepper.svelte         reproductor por etapas (anterior / siguiente / reproducir)
  src/sims/registry.ts            registro módulo -> simulaciones (AQUÍ se registran)
  src/sims/<NN>/*.svelte          simulaciones de cada módulo
  src/components/SimHost.svelte   carga perezosa + marca el progreso (no tocar)
  src/components/Enhance.svelte   mermaid (colores del tema, redibujo al cambiarlo), copiar, pasos del lab, "Marcar terminado"
  src/components/Lector.svelte    "Escuchar este módulo" párrafo a párrafo (salta código y diagramas)
  src/components/Escuchar.svelte  botón Escuchar/Detener; preguntas en inglés, explicaciones en español
  src/components/VozAjustes.svelte voz en español, voz en inglés y velocidad (localStorage)
  src/data/preguntas.json         292 preguntas, 60 reservadas (generado por scripts/sync-data.mjs)
  src/data/flashcards.json        150 términos
  src/components/Hoy.svelte       portada de quien ya empezó: cuenta atrás, Repaso del día, seguir leyendo, siguiente paso, semana
  src/components/MapaMemoria.svelte memoria por competencia según la caja de Leitner (crece desde la visita anterior)
  src/pages/index.astro           portada (bienvenida; "Hoy" arriba si ya hay progreso)
  src/pages/modulos/[id].astro    página de módulo (no tocar salvo acuerdo)
  src/pages/entorno.astro         consideraciones del entorno
  src/pages/practica.astro        quiz / simulacro / flashcards
  src/pages/terminal.astro        simulador de kubectl
  src/pages/comandos.astro        "Comandos de memoria" (pestaña hermana de la terminal)
  src/lib/kube/analizador.ts      analizador de comandos: analizar() explica por qué falla (el "Tutor" de la terminal),
                                  comparar() corrige un comando escrito de memoria parte por parte, esqueleto() da la pista de forma
  src/lib/kube/drills.ts          ejercicios de "Comandos de memoria" por módulo (validados en prebuild)
  src/lib/kube/missions.ts        misiones de la terminal por grupo, con ayuda en tres escalones (idea, forma, solución)
  src/components/practica/Comandos.svelte  el ejercicio; lo montan /comandos y cada módulo (sección #comandos)
```

## Diagramas con guía

Un diagrama Mermaid de un módulo se vuelve interactivo añadiendo una entrada en `src/lib/diagramas.ts` (no se toca el markdown). `Enhance.svelte` monta `DiagramaGuia.svelte` debajo del diagrama; el componente solo añade y quita clases sobre el SVG (`dg-on`, `dg-foco`, `dg-visto`, `dg-oculto`, `dg-hueco`, estilos en `global.css`).

- **flowchart**: `recorrido` (pasos con los ids de nodo que se iluminan y su explicación) y `huecos` (nodos que se vacían en «Completar de memoria», con una `pista` que describe la función del componente; los nodos con la misma etiqueta van en el mismo hueco). Las flechas entre dos nodos en foco se iluminan solas; un subgrafo citado por su id en un `foco` o en un hueco se comporta como un nodo más (se resalta su borde, se vacía su etiqueta y se iluminan las flechas que llegan a él), que es lo que usan los diagramas de capas como las 4C. Si la etiqueta de un nodo es larga o delata la respuesta, el hueco lleva `opcion` (el texto del botón correcto); las etiquetas con `<br/>` se muestran en los botones con un espacio.
- **sequenceDiagram**: `secuencia: true`. «Predecir el orden» oculta los mensajes y pregunta antes de cada uno qué componente actúa. Opcionales: `pistas` (una por mensaje: el contexto que acompaña a cada pregunta) y `pregunta: 'destino'` (pregunta a quién se dirige el mensaje en vez de quién lo envía; se usa cuando casi todos salen del mismo participante, como el kubelet en el módulo 07).
- Los árboles de decisión y los resúmenes visuales llevan solo `recorrido`: completarlos de memoria no aporta.
- Regla de diseño: cada modo pide algo al alumno (predecir o recordar) antes de enseñar. No se añaden animaciones que no exijan una respuesta.
- Completar un diagrama sin fallos guarda el reto `dg:<módulo>-<n>` en `progress.retos`.
- `n` es la posición del diagrama en el módulo: si se inserta un diagrama antes, hay que renumerar. `scripts/validar-diagramas.mjs` (prebuild) falla si la guía apunta a un diagrama o a un nodo que no existe.
- El texto de las guías es contenido del curso y se verifica como los módulos (`../docs/VERIFICACION-GUIA.md`).

## Analizador de comandos y ejercicios

- **Añadir un ejercicio**: una línea `D(id, módulo, tarea, acepta, idea, porque)` en `drills.ts`. El id (`NN-nombre`) queda guardado en el progreso del alumno como `cmd:<id>`: no se cambia ni se reutiliza. En `acepta` solo hacen falta variantes que de verdad se escriben distinto: el orden de los flags, `k`, las abreviaturas de recurso, `tipo/nombre` y `-n`/`--namespace` ya cuentan igual. `porque` es el concepto que fija el comando (lo que entra en el examen).
- **Enlazar un ejercicio con un paso del laboratorio**: `PASO` en `drills.ts` (`'03-run': 2` = paso `### 2` del módulo 03). `Enhance.svelte` monta el ejercicio al final de ese paso (`Comandos` en modo `paso`), tapa el paso mientras se escribe y lo marca como hecho si sale a la primera. El prebuild falla si el paso deja de existir o ya no usa un comando con ese verbo y recurso.
- **Predice antes de mirar (laboratorio)**: `Enhance.svelte` vela cada bloque ```text que sigue a un bloque ```powershell dentro de un paso, junto con su párrafo «Qué observar», hasta que el alumno pulsa «Ver la salida esperada». No se tapa el paso 1 ni los pasos ya marcados. No hace falta escribir nada en el markdown: basta con seguir la plantilla de módulo (comando, salida, «Qué observar»).
- **Repaso del día**: `dueCommands()` en `lib/preparacion.ts` da los comandos que vencen hoy; `Practica.svelte` los reparte entre las preguntas del repaso (`Comandos` en modo `uno`, hasta 10 por ronda) y la portada los cuenta junto a las preguntas.
- **Añadir una misión**: en `missions.ts`, con `group`, `idea` (pista sin sintaxis) y `hint` (la solución; varios pasos separados por `, luego `). `kubectl.test.mjs` comprueba que cada misión se resuelve con su propia pista.
- **Añadir un diagnóstico al tutor**: en `estructura()` de `analizador.ts`, con su caso en `analizador.test.mjs` (incluida la lista de comandos correctos que no deben producir ninguna nota: un tutor que se equivoca enseña mal).
- El simulador rechaza flags mal escritos o sin valor con el mensaje real de kubectl (`erroresDeFlags`). Solo marca como desconocido un flag que se parece a uno conocido; si añades un flag nuevo al simulador, añádelo también a `BOOLEANOS`/`OTROS_VALOR`.
- Pruebas: `node src/lib/kube/kubectl.test.mjs`, `node src/lib/kube/analizador.test.mjs`, `node scripts/validar-comandos.mjs` (las dos últimas corren en `npm run build`).

## Registrar una simulación

En `src/sims/registry.ts`, dentro de `SIMS`, añade la entrada del módulo (número sin ceros):

```ts
4: [
  { id: 'scheduler', title: 'Simulador del scheduler', intro: 'Configura un pod y mira dónde cae y por qué.', load: () => import('./04/Scheduler.svelte') },
],
```

- `id` estable y corto (se usa para el progreso `04:scheduler`).
- `title` e `intro` en español, frase corta; el intro dice qué va a *hacer* el alumno.
- El componente **no recibe props**. SimHost lo envuelve en `<section class="sim">` con cabecera: no repitas el título dentro.
- Orden: la primera simulación de la lista es la más importante del módulo (la ve primero).

## Diseño

Una sola cosa llamativa por simulación: la escena. Controles y textos, sobrios. No inventes otro lenguaje visual: usa los tokens y las clases globales.

- **Colores** (variables en `global.css`): `--helm` (azul, estado deseado/spec y acciones), `--ready` (verde, Running/OK), `--wait` (ámbar, Pending/en curso/estado real), `--fail` (coral, error), `--ink/--ink-2/--ink-3` (texto), `--panel/--panel-2` (fondos), `--line` (bordes). Nunca colores fijos salvo en SVG decorativo con `currentColor`. Debe verse bien en claro y oscuro (`:root[data-theme='dark']` cambia las variables solas).
- **Tipografía**: hereda. Nombres de objetos, comandos y YAML en `.mono`. Nada de mayúsculas sostenidas, ni "01 / 02" decorativos, ni flechas "→" en botones.
- **Clases listas**: `.btn`, `.btn.primary`, `.btn.small`, `.chip`, `.sim .controls` (fila de controles), `.sim .explain` (+ `.ok` `.warn` `.fail`: caja de explicación bajo la escena), `.sim .hint` (texto secundario), `.sim pre` (salida de terminal oscura), `select/input` dentro de `.sim` ya tienen estilo.
- **Copy** en español neutro, voz activa, sin signos de exclamación. Términos técnicos en inglés tal como salen en el examen (`nodeSelector`, `Pending`, `taint`). Explica *por qué* pasó lo que el alumno acaba de ver: cada acción debe cambiar el texto de `.explain`.
- **Movimiento**: solo como respuesta a una acción (entrar/salir/moverse de un pod, avanzar una etapa). Usa `ms()`/`wait()` de `lib/motion.ts` para toda duración y `animate:flip` / `transition:` de Svelte. Sin animaciones automáticas en bucle salvo que simulen algo (p. ej. el bucle de reconciliación), y entonces con botón para pausar.
- **Accesible**: todo control es `<button>`/`<input>`/`<select>` con etiqueta; el estado que cambia se refleja en texto (no solo en color); foco visible (ya global); funciona con teclado.
- **Responsive**: debe funcionar a 360 px de ancho (apilar controles, `flex-wrap`, scroll horizontal solo dentro de la escena si no hay otra opción). Máximo ~860 px de ancho disponible.
- Sin dependencias nuevas. Sin `fetch`. Sin `localStorage` directo (usa `progress.svelte.ts` si necesitas persistir algo).

## ClusterCanvas

```svelte
<script lang="ts">
  import ClusterCanvas, { type NodeSpec, type PodSpec } from '../ClusterCanvas.svelte';
  const nodes: NodeSpec[] = [
    { name: 'kcna-control-plane', role: 'control-plane', taints: ['node-role.kubernetes.io/control-plane:NoSchedule'] },
    { name: 'kcna-worker',  labels: { disktype: 'ssd', zone: 'zona-a' }, cpu: 2000, mem: 4096 },
    { name: 'kcna-worker2', labels: { disktype: 'hdd', zone: 'zona-b' }, cpu: 2000, mem: 4096 },
  ];
  let pods = $state<PodSpec[]>([{ id: 'p1', name: 'web-7f9c-abcde', node: 'kcna-worker', status: 'Running', tag: 'v1', cpu: 250, mem: 128 }]);
</script>
<ClusterCanvas {nodes} {pods} showUsage onpodclick={(p) => ...} />
```

- `PodSpec.node` vacío ⇒ el pod aparece en la bandeja "Sin nodo (Pending)" (`pendingTray`).
- `status`: `Pending | ContainerCreating | Running | Terminating | Failed | CrashLoopBackOff | Succeeded | Evicted | OOMKilled | ImagePullBackOff` (cada uno tiene su punto de color/animación).
- `tag` (texto corto a la derecha: versión, QoS, zona), `color: 'a'|'b'|'c'|'d'` (ficha azul/morada/ámbar/verde-azulado para distinguir versiones), `highlight`, `restarts`.
- Para animar: muta el array `pods` (`pods = [...pods, nuevo]`, `pods = pods.map(...)`, `pods = pods.filter(...)`) y usa `await wait(400)` entre etapas. Las fichas entran/salen con escala y se mueven entre nodos con `flip`. **Las ids deben ser estables** mientras el pod exista.
- `nodeFooter` (snippet) para pintar algo bajo cada nodo (DaemonSet, kube-proxy, kubelet...). `compact` para escenas pequeñas. `showLabels=false` si las etiquetas estorban.
- Los nombres de nodo del laboratorio real son `kcna-control-plane`, `kcna-worker` (ssd, zona-a) y `kcna-worker2` (hdd, zona-b): úsalos para que coincida con lo que el alumno ve en su terminal.

## Stepper (etapas)

```svelte
<script lang="ts">
  import Stepper, { type Stage } from '../Stepper.svelte';
  const stages: Stage[] = [
    { title: 'kubectl envía el manifiesto', text: 'El cliente hace un POST al API server…' },
    { title: 'El API server valida y guarda', text: '…', hold: 2200 },
  ];
</script>
<Stepper {stages}>
  {#snippet scene(i, stage)}
    <!-- dibuja la escena según i: resalta el componente activo, mueve fichas, etc. -->
  {/snippet}
</Stepper>
```

El Stepper ya pinta la barra de etapas, el título/texto de la etapa y los botones. La escena es tuya. Cambia el estado con `onchange={(i) => ...}` si necesitas efectos secundarios (p. ej. mutar `pods`).

## Datos del quiz

`import preguntas from '../data/preguntas.json'` → `{ id, domain, topic, module, q, options, answer: number[], explanation }[]`. `import flashcards from '../data/flashcards.json'` → `{ term, def, domain, module }[]`. `progress.quiz`, `recordAnswer()`, `progress.exams`, `toggleKnown()` están en `lib/progress.svelte.ts`.

**Banco reservado.** Las preguntas con `holdout: true` (lista en `quiz/src/reservadas.js`, 26/17/10/7) solo salen en el Examen de graduación. Cualquier componente que saque preguntas para practicar debe excluirlas (usa `PRACTICE` de `lib/preparacion.ts`). `recordAnswer(id, ok, conf?)` guarda además `first`/`at` (primer intento), `conf` (aciertos por confianza Seguro/Dudo/Adivino), `sureMiss` (fallo con «Seguro» pendiente) y `box`/`due` (repetición espaciada, cajas de Leitner). Todo eso alimenta el panel *Preparación real* y el *Repaso del día* (`dueToday()`, `priority()` en `lib/preparacion.ts`).

## Verificación (sin tocar el servidor de desarrollo)

Hay un servidor `astro dev` ya corriendo en `http://127.0.0.1:4321` con recarga en caliente; **no lo arranques, pares ni reinicies**, y no abras otro. Para comprobar tu trabajo:

1. `npx astro check` desde `web/` (tipos y plantillas; corrige tus errores, ignora los de archivos ajenos).
2. `npx astro build --outDir ../.tmp/dist-<tu-nombre>` (carpeta propia para no chocar con otros; bórrala al terminar). El build renderiza tus componentes en el servidor: cualquier excepción en `<script>` de nivel superior aparece aquí.
3. `Invoke-WebRequest http://127.0.0.1:4321/modulos/04 -UseBasicParsing` y busca en `.Content` el `title` de tu simulación: confirma que la página se sirve sin error 500.
4. Los componentes deben ser válidos en SSR: nada de `window`/`document` en el nivel superior del `<script>`; úsalos dentro de `$effect` o de manejadores.

La revisión visual e interactiva en navegador la hace el coordinador después; describe en tu reporte qué debería ver.

## PowerShell 5.1

Los comandos de verificación corren en PowerShell 5.1: no uses `&&`, ni comillas dobles dentro de argumentos a programas nativos. Escribe archivos en UTF-8 **sin BOM** (los tools Write/Edit ya lo hacen; evita `Set-Content`/`Out-File` para código).
