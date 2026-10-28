<script lang="ts">
  // Helm y Kustomize lado a lado, con el chart saludo y los overlays dev/prod del lab.
  // Helm: values editables → helm template en vivo → install / upgrade / history / rollback.
  // Kustomize: base + overlay → kubectl kustomize con cada parche resaltado y su origen.

  type Tab = 'helm' | 'kustomize';
  let tab = $state<Tab>('helm');

  // ---------- Helm ----------
  interface Values { replicaCount: number; tag: string; mensaje: string }
  interface Revision { rev: number; status: 'deployed' | 'superseded'; description: string; values: Values }
  const TAGS = ['1.27-alpine', '1.28-alpine'];
  let values = $state<Values>({ replicaCount: 1, tag: '1.27-alpine', mensaje: 'Hola desde Helm (v1)' });
  let revisions = $state<Revision[]>([]);
  let rollbackTo = $state(1);
  let term = $state('$ helm template saludo ./helm/saludo\n(el YAML de la derecha es la salida: nada toca el clúster)');
  const current = $derived(revisions.find((r) => r.status === 'deployed'));
  const installed = $derived(!!current);

  // hash corto y estable del ConfigMap para la anotación checksum/html
  function checksum(s: string) {
    let out = '';
    for (let seed = 0; seed < 8; seed++) { let h = 2166136261 ^ seed; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } out += h.toString(16).padStart(8, '0'); }
    return out;
  }

  interface Line { text: string; hot?: boolean }
  const L = (text: string, hot = false): Line => ({ text, hot });
  const labels = (ind: string) => [`${ind}app.kubernetes.io/name: saludo`, `${ind}app.kubernetes.io/instance: saludo`, `${ind}app.kubernetes.io/version: "1.27"`, `${ind}app.kubernetes.io/managed-by: Helm`, `${ind}helm.sh/chart: saludo-0.1.0`].map((t) => L(t));
  const selector = (ind: string) => [`${ind}app.kubernetes.io/name: saludo`, `${ind}app.kubernetes.io/instance: saludo`].map((t) => L(t));
  function render(v: Values, revision: number): Line[] {
    const html = `<h1>${v.mensaje}</h1><p>Release: saludo - Revision: ${revision} - Imagen: nginx:${v.tag}</p>`;
    return [
      L('---'), L('# Source: saludo/templates/configmap.yaml'), L('apiVersion: v1'), L('kind: ConfigMap'), L('metadata:'), L('  name: saludo-html'), L('  labels:'), ...labels('    '),
      L('data:'), L('  index.html: |'), L(`    <h1>${v.mensaje}</h1>`, true), L(`    <p>Release: saludo - Revision: ${revision} - Imagen: nginx:${v.tag}</p>`, true),
      L('---'), L('# Source: saludo/templates/service.yaml'), L('apiVersion: v1'), L('kind: Service'), L('metadata:'), L('  name: saludo'), L('  labels:'), ...labels('    '),
      L('spec:'), L('  selector:'), ...selector('    '), L('  ports:'), L('    - port: 80'), L('      targetPort: 80'),
      L('---'), L('# Source: saludo/templates/deployment.yaml'), L('apiVersion: apps/v1'), L('kind: Deployment'), L('metadata:'), L('  name: saludo'), L('  labels:'), ...labels('    '),
      L('spec:'), L(`  replicas: ${v.replicaCount}`, true), L('  selector:'), L('    matchLabels:'), ...selector('      '),
      L('  template:'), L('    metadata:'), L('      labels:'), ...selector('        '), L('      annotations:'), L(`        checksum/html: ${checksum(html)}`, true),
      L('    spec:'), L('      containers:'), L('        - name: nginx'), L(`          image: "nginx:${v.tag}"`, true), L('          ports:'), L('            - containerPort: 80'),
      L('          resources:'), L('            limits:'), L('              cpu: 100m'), L('              memory: 64Mi'), L('            requests:'), L('              cpu: 10m'), L('              memory: 16Mi'),
      L('          volumeMounts:'), L('            - name: html'), L('              mountPath: /usr/share/nginx/html/index.html'), L('              subPath: index.html'),
      L('      volumes:'), L('        - name: html'), L('          configMap:'), L('            name: saludo-html'),
    ];
  }
  const rendered = $derived(render(values, 1));
  const valuesYaml = $derived(`replicaCount: ${values.replicaCount}\nimage:\n  repository: nginx\n  tag: ${values.tag}\nmensaje: "${values.mensaje}"`);

  function historyText() {
    const rows = revisions.map((r) => `${String(r.rev).padEnd(9)} ${r.status.padEnd(11)} saludo-0.1.0  1.27         ${r.description}`);
    return ['REVISION  STATUS      CHART         APP VERSION  DESCRIPTION', ...rows].join('\n');
  }
  function newRevision(description: string, v: Values) {
    revisions = [...revisions.map((r) => ({ ...r, status: 'superseded' as const })), { rev: revisions.length + 1, status: 'deployed', description, values: { ...v } }];
    rollbackTo = Math.max(1, revisions.length - 1);
  }
  function install() {
    newRevision('Install complete', values);
    term = `$ helm install saludo ./helm/saludo -n lab-12\nNAME: saludo\nNAMESPACE: lab-12\nSTATUS: deployed\nREVISION: 1\nNOTES:\nRelease "saludo" (revision 1) instalado en el namespace lab-12.`;
  }
  function upgrade() {
    newRevision('Upgrade complete', values);
    term = `$ helm upgrade saludo ./helm/saludo -n lab-12 -f values.yaml\nRelease "saludo" has been upgraded. Happy Helming!\nREVISION: ${revisions.length}\n\n$ helm get values saludo -n lab-12\nUSER-SUPPLIED VALUES:\n${valuesYaml}`;
  }
  function history() { term = `$ helm history saludo -n lab-12\n${historyText()}\n\n$ kubectl get secrets -n lab-12 -l owner=helm\n${revisions.map((r) => `sh.helm.release.v1.saludo.v${r.rev}   helm.sh/release.v1   1`).join('\n')}`; }
  function rollback() {
    const target = revisions.find((r) => r.rev === rollbackTo);
    if (!target) return;
    values = { ...target.values };
    newRevision(`Rollback to ${target.rev}`, target.values);
    term = `$ helm rollback saludo ${target.rev} -n lab-12\nRollback was a success! Happy Helming!\n\n$ helm history saludo -n lab-12\n${historyText()}`;
  }
  function uninstall() { revisions = []; term = '$ helm uninstall saludo -n lab-12\nrelease "saludo" uninstalled'; }
  const helmExplain = $derived.by(() => {
    if (!installed) return 'helm template renderiza el chart sin tocar el clúster: cada {{ .Values.x }} se sustituye por values.yaml (o por -f / --set). Cambia los valores y mira qué líneas cambian; luego instala.';
    const last = revisions.at(-1)!;
    if (last.description.startsWith('Rollback')) return `El rollback no borró nada: creó la revisión ${last.rev} con el contenido de la ${last.description.split(' ').at(-1)}. El historial siempre avanza, como un git revert. Cada revisión es un Secret sh.helm.release.v1.saludo.vN en lab-12.`;
    if (last.rev === 1) return 'Release saludo, revisión 1. Un release es una instalación concreta del chart con nombre propio; el mismo chart podría instalarse otra vez como tienda. Edita los values y haz upgrade.';
    return `Upgrade: revisión ${last.rev}. Como cambió la plantilla del pod (imagen o la anotación checksum/html), el Deployment hace un rolling update. Si no te gusta el resultado, rollback a una revisión anterior.`;
  });

  // ---------- Kustomize ----------
  type Env = 'base' | 'dev' | 'prod';
  type Src = 'namePrefix' | 'namespace' | 'labels' | 'replicas' | 'images' | 'patches';
  interface KLine { text: string; src?: Src }
  let env = $state<Env>('dev');
  const KUST: Record<Env, string> = {
    base: `# kustomize/base/kustomization.yaml\napiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources:\n  - deployment.yaml\n  - service.yaml`,
    dev: `# kustomize/overlays/dev/kustomization.yaml\napiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nnamespace: lab-12\nnamePrefix: dev-\nresources:\n  - ../../base\nlabels:\n  - pairs:\n      env: dev\n    includeSelectors: true\nreplicas:\n  - name: web\n    count: 1`,
    prod: `# kustomize/overlays/prod/kustomization.yaml\napiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nnamespace: lab-12\nnamePrefix: prod-\nresources:\n  - ../../base\nlabels:\n  - pairs:\n      env: prod\n    includeSelectors: true\nreplicas:\n  - name: web\n    count: 3\nimages:\n  - name: nginx\n    newTag: 1.28-alpine\npatches:\n  - path: recursos-patch.yaml\n\n# recursos-patch.yaml (strategic merge)\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\nspec:\n  template:\n    spec:\n      containers:\n        - name: nginx\n          resources:\n            requests:\n              cpu: 50m\n              memory: 32Mi`,
  };
  function kustomize(e: Env): KLine[] {
    const ov = e !== 'base';
    const name = e === 'base' ? 'web' : `${e}-web`;
    const K = (text: string, src?: Src): KLine => ({ text, src });
    const meta = (): KLine[] => [K('metadata:'), K('  labels:'), K('    app: web'), ...(ov ? [K(`    env: ${e}`, 'labels')] : []), K(`  name: ${name}`, ov ? 'namePrefix' : undefined), ...(ov ? [K('  namespace: lab-12', 'namespace')] : [])];
    const sel = (ind: string): KLine[] => [K(`${ind}app: web`), ...(ov ? [K(`${ind}env: ${e}`, 'labels')] : [])];
    return [
      K('apiVersion: v1'), K('kind: Service'), ...meta(), K('spec:'), K('  ports:'), K('  - port: 80'), K('    targetPort: 80'), K('  selector:'), ...sel('    '),
      K('---'), K('apiVersion: apps/v1'), K('kind: Deployment'), ...meta(), K('spec:'),
      K(`  replicas: ${e === 'prod' ? 3 : 1}`, ov ? 'replicas' : undefined), K('  selector:'), K('    matchLabels:'), ...sel('      '),
      K('  template:'), K('    metadata:'), K('      labels:'), ...sel('        '), K('    spec:'), K('      containers:'),
      K(`      - image: nginx:${e === 'prod' ? '1.28-alpine' : '1.27-alpine'}`, e === 'prod' ? 'images' : undefined), K('        name: nginx'), K('        ports:'), K('        - containerPort: 80'),
      K('        resources:'), K('          limits:'), K('            cpu: 100m'), K('            memory: 64Mi'), K('          requests:'),
      K(`            cpu: ${e === 'prod' ? '50m' : '10m'}`, e === 'prod' ? 'patches' : undefined), K(`            memory: ${e === 'prod' ? '32Mi' : '16Mi'}`, e === 'prod' ? 'patches' : undefined),
    ];
  }
  const kout = $derived(kustomize(env));
  const KEXPLAIN: Record<Env, string> = {
    base: 'La base es YAML válido y completo que no sabe nada de dev ni de prod: kubectl kustomize kustomize/base la devuelve tal cual.',
    dev: 'El overlay dev no repite nada de la base: añade el prefijo dev-, el namespace y la etiqueta env: dev. Con includeSelectors: true la etiqueta llega también a los selectores, así que el Service de dev nunca envía tráfico a pods de prod.',
    prod: 'Prod reutiliza la misma base y cambia réplicas (replicas:), la versión de imagen (images: newTag) y los requests con un strategic merge patch. Nota que replicas e images apuntan al nombre de la base (web, nginx), no al nombre final con prefijo.',
  };
</script>

<div class="emp">
  <div class="tabs" role="tablist" aria-label="Herramienta">
    <button type="button" role="tab" aria-selected={tab === 'helm'} class:cur={tab === 'helm'} onclick={() => (tab = 'helm')}>Helm</button>
    <button type="button" role="tab" aria-selected={tab === 'kustomize'} class:cur={tab === 'kustomize'} onclick={() => (tab = 'kustomize')}>Kustomize</button>
  </div>

  {#if tab === 'helm'}
    <div class="cols">
      <div class="side">
        <h4 class="mono">values.yaml</h4>
        <div class="field"><label for="rc">replicaCount</label><input id="rc" type="number" min="1" max="5" bind:value={values.replicaCount} /></div>
        <div class="field"><label for="tag">image.tag</label><select id="tag" bind:value={values.tag}>{#each TAGS as t}<option value={t}>{t}</option>{/each}</select></div>
        <div class="field"><label for="msg">mensaje</label><input id="msg" type="text" maxlength="40" bind:value={values.mensaje} /></div>
        <pre class="small">{valuesYaml}</pre>
        <div class="actions">
          <button type="button" class="btn small primary" onclick={install} disabled={installed}>helm install</button>
          <button type="button" class="btn small" onclick={upgrade} disabled={!installed}>helm upgrade</button>
          <button type="button" class="btn small" onclick={history} disabled={!installed}>helm history</button>
          <span class="rb">
            <button type="button" class="btn small" onclick={rollback} disabled={!installed || revisions.length < 2}>helm rollback</button>
            <label class="visually-hidden" for="rbto">Revisión a la que volver</label>
            <select id="rbto" bind:value={rollbackTo} disabled={!installed || revisions.length < 2}>{#each revisions.filter((r) => r.status !== 'deployed') as r}<option value={r.rev}>{r.rev}</option>{/each}</select>
          </span>
          <button type="button" class="btn small" onclick={uninstall} disabled={!installed}>helm uninstall</button>
        </div>
        {#if installed}
          <div class="state">
            <span class="k">Release <b class="mono">saludo</b> · revisión {current!.rev} · <span class="ok">deployed</span></span>
            <span class="mono">deploy/saludo replicas {current!.values.replicaCount} · nginx:{current!.values.tag}</span>
            <span class="mono">cm/saludo-html: {current!.values.mensaje}</span>
          </div>
          <table class="hist">
            <thead><tr><th>Rev</th><th>Estado</th><th>Descripción</th><th>Valores</th></tr></thead>
            <tbody>
              {#each revisions as r (r.rev)}
                <tr class:cur={r.status === 'deployed'}><td class="mono">{r.rev}</td><td>{r.status}</td><td>{r.description}</td><td class="mono">{r.values.replicaCount} · {r.values.tag} · {r.values.mensaje}</td></tr>
              {/each}
            </tbody>
          </table>
        {/if}
        <pre class="small">{term}</pre>
      </div>
      <div class="out">
        <h4 class="mono">helm template saludo ./helm/saludo</h4>
        <pre class="yaml">{#each rendered as l}<span class:hot={l.hot}>{l.text}
</span>{/each}</pre>
      </div>
    </div>
    <div class="explain" aria-live="polite">{helmExplain}</div>
  {:else}
    <div class="controls">
      <label for="env">Carpeta</label>
      <select id="env" bind:value={env}>
        <option value="base">kustomize/base</option>
        <option value="dev">kustomize/overlays/dev</option>
        <option value="prod">kustomize/overlays/prod</option>
      </select>
      <span class="hint">Leyenda: las líneas resaltadas vienen del overlay y la etiqueta dice qué campo las produjo.</span>
    </div>
    <div class="cols">
      <div class="side">
        <h4 class="mono">kustomization.yaml</h4>
        <pre class="small">{KUST[env]}</pre>
      </div>
      <div class="out">
        <h4 class="mono">kubectl kustomize kustomize/{env === 'base' ? 'base' : `overlays/${env}`}</h4>
        <pre class="yaml">{#each kout as l}<span class:hot={!!l.src}>{l.text}{#if l.src}<em>{l.src}</em>{/if}
</span>{/each}</pre>
      </div>
    </div>
    <div class="explain" aria-live="polite">{KEXPLAIN[env]}</div>
  {/if}

  <div class="when">
    <div><h4>Usa Helm cuando</h4><ul><li>Instalas software de terceros (un chart de Artifact Hub) o distribuyes tu app como paquete.</li><li>Necesitas ciclo de vida: releases con historial, upgrade, rollback y hooks.</li><li>La configuración tiene muchas opciones y lógica condicional (plantillas Go).</li></ul></div>
    <div><h4>Usa Kustomize cuando</h4><ul><li>Son tus propios manifiestos y solo cambian detalles por entorno (prefijo, réplicas, imagen, labels).</li><li>Quieres YAML puro sin aprender plantillas y sin binario extra: va dentro de kubectl (-k).</li><li>Trabajas con GitOps: Argo CD y Flux soportan ambos, y Helm puede pasar su salida por Kustomize.</li></ul></div>
  </div>
</div>

<style>
  .emp { display: grid; gap: 12px; }
  .tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--line); }
  .tabs button { font: inherit; font-weight: 500; font-size: 0.92rem; padding: 6px 14px; border: 1px solid transparent; border-bottom: 0; background: none; color: var(--ink-2); cursor: pointer; border-radius: var(--r-s) var(--r-s) 0 0; }
  .tabs button.cur { color: var(--helm-ink); background: var(--helm-2); border-color: var(--line); }
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 12px; }
  .side, .out { display: grid; gap: 8px; align-content: start; min-width: 0; }
  h4 { font-size: 0.82rem; color: var(--ink-2); font-weight: 500; }
  .field { display: grid; grid-template-columns: 110px minmax(0, 1fr); align-items: center; gap: 8px; }
  .field label { font-family: var(--mono); font-size: 0.82rem; }
  .field input, .field select { min-width: 0; width: 100%; }
  .actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .rb { display: inline-flex; gap: 4px; align-items: center; }
  .rb select { padding: 4px 6px; font-size: 0.85rem; }
  .state { display: grid; gap: 2px; font-size: 0.82rem; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); }
  .state .k b { font-weight: 500; }
  .ok { color: var(--ready); font-weight: 600; }
  .hist { border-collapse: collapse; width: 100%; font-size: 0.78rem; }
  .hist th, .hist td { text-align: left; padding: 3px 6px; border-bottom: 1px solid var(--line-2); vertical-align: top; }
  .hist th { color: var(--ink-3); font-weight: 500; }
  .hist tr.cur td { background: var(--ready-2); }
  pre.small { font-size: 0.76rem; max-height: 220px; overflow: auto; white-space: pre-wrap; word-break: break-word; }
  pre.yaml { font-size: 0.74rem; max-height: 460px; overflow: auto; }
  pre.yaml span { display: block; padding: 0 6px; margin: 0 -6px; }
  pre.yaml span.hot { background: rgba(122, 160, 255, 0.22); color: #fff; }
  pre.yaml em { font-style: normal; font-size: 0.66rem; margin-left: 10px; padding: 0 6px; border-radius: 4px; background: var(--wait); color: #1a1a1a; font-weight: 600; }
  .when { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 10px; }
  .when div { background: var(--panel-2); border: 1px solid var(--line-2); border-radius: var(--r-m); padding: 10px 12px; }
  .when h4 { color: var(--ink); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; }
  .when ul { margin: 0; padding-left: 18px; font-size: 0.86rem; color: var(--ink-2); display: grid; gap: 3px; }
  @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } .field { grid-template-columns: 1fr; gap: 2px; } }
</style>
