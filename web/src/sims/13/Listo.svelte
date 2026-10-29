<script lang="ts">
  // Checklist final del módulo 13 ("estoy listo si..."), agrupada por dominio con su peso y persistida en progress.ready.
  // Al completar todo aparece el resumen con los recursos oficiales y los consejos del día del examen.
  import { progress, toggleReady } from '../../lib/progress.svelte';
  import { DOMAINS, MODULES, pad, type DomainKey } from '../../lib/modules';
  import { readiness, READY } from '../../lib/preparacion';

  interface Item { id: string; text: string }
  interface Group { key: DomainKey | 'metodo' | 'dia'; name: string; weight?: number; items: Item[] }
  const GROUPS: Group[] = [
    { key: 'metodo', name: 'Simulacros y retos', items: [
      { id: 'sim85', text: 'El panel Preparación real de la app está en verde: examen de graduación (primer intento) con 80% o más y ningún dominio por debajo del 70%.' },
      { id: 'retos', text: 'He completado todos los retos (.\\kcna.ps1 check NN) al menos una vez.' },
    ] },
    { key: 'fundamentals', name: DOMAINS.fundamentals.name, weight: 44, items: [
      { id: 'arch', text: 'Puedo dibujar de memoria la arquitectura de Kubernetes y explicar qué hace cada componente del plano de control y del nodo.' },
      { id: 'workloads', text: 'Explico la diferencia entre Pod, ReplicaSet, Deployment, StatefulSet, DaemonSet y Job, y cuándo usar cada uno.' },
      { id: 'probes', text: 'Distingo liveness, readiness y startup probes, y requests vs limits (y sus clases QoS).' },
    ] },
    { key: 'orchestration', name: DOMAINS.orchestration.name, weight: 28, items: [
      { id: 'svc', text: 'Sé qué tipo de Service usar en cada caso y cómo funciona el DNS interno.' },
      { id: 'rbac', text: 'Sé cómo funcionan RBAC (Role, ClusterRole, bindings, ServiceAccounts), NetworkPolicies y Pod Security Standards.' },
      { id: 'storage', text: 'Puedo explicar PV, PVC, StorageClass y aprovisionamiento dinámico.' },
      { id: 'debug', text: 'Sé diagnosticar Pending, CrashLoopBackOff, ImagePullBackOff y OOMKilled con describe, logs, events y debug.' },
    ] },
    { key: 'delivery', name: DOMAINS.delivery.name, weight: 16, items: [
      { id: 'gitops', text: 'Recito los cuatro principios de OpenGitOps y explico push vs pull, Helm vs Kustomize y las estrategias de despliegue.' },
    ] },
    { key: 'architecture', name: DOMAINS.architecture.name, weight: 12, items: [
      { id: 'cncf', text: 'Asocio los proyectos CNCF más conocidos con su categoría y sé qué significa Sandbox, Incubating y Graduated.' },
      { id: 'obs', text: 'Distingo logs, métricas y trazas, y conozco Prometheus, OpenTelemetry, Jaeger y Fluentd.' },
    ] },
    { key: 'dia', name: 'Idioma y día del examen', items: [
      { id: 'glos', text: 'Entiendo los términos del glosario sin traducirlos mentalmente.' },
      { id: 'psi', text: 'Hice la prueba de compatibilidad de PSI en el equipo y la red que usaré, tengo la identificación lista y la habitación preparada.' },
      { id: 'sleep', text: 'Dormí bien la noche anterior y no estudio temas nuevos el último día (solo los Resumen para repasar y las flashcards).' },
    ] },
  ];
  const TOTAL = GROUPS.reduce((a, g) => a + g.items.length, 0);
  const on = (id: string) => progress.ready.includes(id);
  const groupDone = (g: Group) => g.items.filter((i) => on(i.id)).length;
  const doneCount = $derived(GROUPS.reduce((a, g) => a + groupDone(g), 0));
  const complete = $derived(doneCount === TOTAL);
  let showResources = $state(false);

  // Datos reales del progreso para acompañar dos casillas
  const prep = $derived(readiness(progress));
  const examHint = $derived(prep.ready ? 'Preparación real en verde (objetivo cumplido).'
    : prep.final ? `Examen de graduación: ${prep.final.score}% (meta ${READY.finalPass}% y dominios ≥ ${READY.domainPass}%).`
    : `Aún no has hecho el examen de graduación. Cobertura ${prep.coverOk ? 'completa' : 'pendiente'}; acierto en preguntas nuevas ${prep.recent.n ? `${prep.recent.pct}%` : 'sin datos'}.`);
  const labs = MODULES.filter((m) => m.lab);
  const labsDone = $derived(labs.filter((m) => progress.done.includes(pad(m.n))).length);
  const chipClass = (k: Group['key']) => (k in DOMAINS ? k : '');

  const RESOURCES = [
    { name: 'Página del examen KCNA (Linux Foundation)', url: 'https://training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/', why: 'Precio actual, compra, reserva de fecha y política de retake.' },
    { name: 'Candidate Handbook', url: 'https://docs.linuxfoundation.org/tc-docs/certification/lf-handbook2', why: 'Reglas de la supervisión con PSI, identificación y requisitos del equipo.' },
    { name: 'Currículo oficial (github.com/cncf/curriculum)', url: 'https://github.com/cncf/curriculum', why: 'Dominios, competencias y pesos exactos; revísalo por si cambió.' },
    { name: 'kubernetes.io/docs', url: 'https://kubernetes.io/docs/concepts/', why: 'Concepts y el Glossary: el examen usa su mismo vocabulario.' },
    { name: 'Glosario de Kubernetes', url: 'https://kubernetes.io/docs/reference/glossary/?all=true', why: 'Definiciones cortas de cada término.' },
    { name: 'CNCF Glossary (glossary.cncf.io)', url: 'https://glossary.cncf.io/es/', why: 'Términos cloud native, también en español.' },
    { name: 'CNCF Landscape y proyectos', url: 'https://landscape.cncf.io/', why: 'Proyectos por categoría y nivel de madurez (Sandbox, Incubating, Graduated).' },
    { name: 'OpenGitOps', url: 'https://opengitops.dev/', why: 'Los cuatro principios de GitOps de primera mano.' },
  ];
</script>

<div class="listo">
  <div class="top">
    <div class="bar" role="progressbar" aria-valuenow={doneCount} aria-valuemin="0" aria-valuemax={TOTAL} aria-label="Casillas marcadas"><i style={`width:${(100 * doneCount) / TOTAL}%`}></i></div>
    <span class="mono">{doneCount} de {TOTAL}</span>
    {#if !complete}<button type="button" class="btn small" onclick={() => (showResources = !showResources)} aria-expanded={showResources}>{showResources ? 'Ocultar recursos' : 'Ver recursos ahora'}</button>{/if}
  </div>

  <div class="groups">
    {#each GROUPS as g (g.key)}
      <section class="group" class:complete={groupDone(g) === g.items.length} aria-label={g.name}>
        <header>
          <span class="chip {chipClass(g.key)}">{g.name}{#if g.weight} · {g.weight}%{/if}</span>
          <span class="count mono">{groupDone(g)}/{g.items.length}</span>
        </header>
        <ul>
          {#each g.items as it (it.id)}
            <li>
              <label>
                <input type="checkbox" checked={on(it.id)} onchange={() => toggleReady(it.id)} />
                <span class="text">{it.text}</span>
              </label>
              {#if it.id === 'sim85'}<span class="meta">{examHint}</span>{/if}
              {#if it.id === 'retos'}<span class="meta">Módulos con lab marcados como terminados: {labsDone} de {labs.length}.</span>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>

  {#if complete}
    <div class="explain ok">Lista completa. Si el panel Preparación real está en verde, reserva fecha: el margen sobre el 75% absorbe los nervios y las preguntas con redacción rara. Lo que sigue es todo lo que necesitas para el día del examen.</div>
  {:else}
    <div class="explain">Te faltan {TOTAL - doneCount} casillas. Marca solo lo que de verdad dominas: la lista sirve para encontrar huecos, no para tranquilizarte. Cada hueco apunta a un módulo del curso.</div>
  {/if}

  {#if complete || showResources}
    <div class="summary">
      <section>
        <h4>Recursos oficiales</h4>
        <ul class="res">
          {#each RESOURCES as r (r.url)}<li><a href={r.url} target="_blank" rel="noopener">{r.name}</a><span>{r.why}</span></li>{/each}
        </ul>
      </section>
      <section>
        <h4>El día del examen</h4>
        <ul class="tips">
          <li><strong>PSI:</strong> instala el navegador seguro y pasa la prueba de compatibilidad días antes; en portátiles corporativos el antivirus o la VPN suelen bloquearlo, usa un equipo personal. Entra 15-30 minutos antes para el check-in.</li>
          <li><strong>Identificación:</strong> documento oficial con foto; el nombre debe coincidir exactamente con el de tu cuenta de la Linux Foundation.</li>
          <li><strong>Entorno:</strong> una sola pantalla, escritorio despejado, sin papeles, móvil ni reloj inteligente, sin nadie más en la sala, sin auriculares. Te pedirán mostrar la habitación con la webcam.</li>
          <li><strong>Ritmo:</strong> 60 preguntas en 90 minutos. Primera pasada en unos 60 minutos marcando las dudosas, segunda pasada solo con las marcadas, y nunca dejes preguntas en blanco.</li>
          <li><strong>Lectura:</strong> la pregunta real está en la última frase; vigila NOT, EXCEPT, BEST, default; desconfía de always, never y only.</li>
        </ul>
      </section>
    </div>
  {/if}
</div>

<style>
  .listo { display: grid; gap: 12px; }
  .top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
  .bar { flex: 1 1 160px; height: 10px; border-radius: 5px; background: var(--panel-2); border: 1px solid var(--line-2); overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--ready); transition: width var(--dur) var(--ease); }
  .top .mono { font-size: 0.82rem; color: var(--ink-2); }
  .groups { display: grid; gap: 8px; }
  .group { border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); padding: 8px 10px 10px; display: grid; gap: 6px; transition: border-color var(--dur); }
  .group.complete { border-color: var(--ready); }
  .group header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .count { margin-left: auto; font-size: 0.78rem; color: var(--ink-3); }
  .group ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .group li { display: grid; gap: 2px; }
  .group label { display: flex; align-items: flex-start; gap: 10px; font-weight: 400; font-size: 0.92rem; cursor: pointer; line-height: 1.45; }
  .group input { width: 18px; height: 18px; margin: 2px 0 0; accent-color: var(--ready); flex: none; }
  .group input:checked ~ .text { color: var(--ink-3); text-decoration: line-through; text-decoration-thickness: 1px; }
  .meta { font-size: 0.78rem; color: var(--helm-ink); padding-left: 28px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 12px; }
  .summary section { border: 1px solid var(--line); border-radius: var(--r-m); padding: 10px 12px; display: grid; gap: 6px; align-content: start; }
  .summary h4 { font-size: 0.95rem; }
  .res, .tips { margin: 0; padding-left: 18px; display: grid; gap: 5px; font-size: 0.88rem; }
  .res li { display: grid; gap: 1px; }
  .res span { color: var(--ink-2); font-size: 0.82rem; }
  .tips li { color: var(--ink-2); }
  .tips strong { color: var(--ink); font-weight: 600; }
</style>
