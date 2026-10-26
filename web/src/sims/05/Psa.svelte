<script lang="ts">
  // Pod Security Admission y securityContext: elige el perfil del namespace, arma el pod y mira si el API server lo admite.
  import { wait } from '../../lib/motion';

  type Level = 'privileged' | 'baseline' | 'restricted';
  type Mode = 'enforce' | 'warn' | 'audit';
  const ORDER: Record<Level, number> = { privileged: 0, baseline: 1, restricted: 2 };

  let level = $state<Level>('restricted');
  let mode = $state<Mode>('enforce');
  let privileged = $state(false);
  let runAsNonRoot = $state(false);
  let apeFalse = $state(false);
  let dropAll = $state(false);
  let seccomp = $state(false);
  let hostPath = $state(false);
  let stage = $state<'idle' | 'authn' | 'authz' | 'admission' | 'etcd' | 'rejected'>('idle');
  let out = $state('');
  let outKind = $state<'' | 'ok' | 'warn' | 'fail'>('');
  let busy = $state(false);
  let note = $state('Pod Security Admission es un admission controller del API server (capa Cluster de las 4C). Se activa con labels en el namespace y evalúa cada pod contra un perfil. Arma el pod y aplícalo.');

  interface Check { level: Level; fails: boolean; msg: string; }
  const checks = $derived<Check[]>([
    { level: 'baseline', fails: privileged, msg: 'privileged (container "app" must not set securityContext.privileged=true)' },
    { level: 'baseline', fails: hostPath, msg: 'hostPath volumes (volume "datos")' },
    { level: 'restricted', fails: !apeFalse, msg: 'allowPrivilegeEscalation != false (container "app" must set securityContext.allowPrivilegeEscalation=false)' },
    { level: 'restricted', fails: !dropAll, msg: 'unrestricted capabilities (container "app" must set securityContext.capabilities.drop=["ALL"])' },
    { level: 'restricted', fails: !runAsNonRoot, msg: 'runAsNonRoot != true (pod or container "app" must set securityContext.runAsNonRoot=true)' },
    { level: 'restricted', fails: !seccomp, msg: 'seccompProfile (pod or container "app" must set securityContext.seccompProfile.type to "RuntimeDefault" or "Localhost")' },
  ]);
  const violations = $derived(checks.filter((c) => c.fails && ORDER[c.level] <= ORDER[level]));
  const invalid = $derived(privileged && apeFalse);

  const yaml = $derived.by(() => {
    const l = ['apiVersion: v1', 'kind: Pod', 'metadata:', '  name: app-demo', '  namespace: lab-05', 'spec:'];
    if (runAsNonRoot || seccomp) {
      l.push('  securityContext:');
      if (runAsNonRoot) l.push('    runAsNonRoot: true', '    runAsUser: 1000');
      if (seccomp) l.push('    seccompProfile:', '      type: RuntimeDefault');
    }
    l.push('  containers:', '    - name: app', '      image: busybox:1.37', '      command: ["sleep", "3600"]');
    if (privileged || apeFalse || dropAll) {
      l.push('      securityContext:');
      if (privileged) l.push('        privileged: true');
      if (apeFalse) l.push('        allowPrivilegeEscalation: false');
      if (dropAll) l.push('        capabilities:', '          drop: ["ALL"]');
    }
    if (hostPath) l.push('      volumeMounts:', '        - name: datos', '          mountPath: /host');
    if (hostPath) l.push('  volumes:', '    - name: datos', '      hostPath:', '        path: /var/log');
    return l.join('\n');
  });
  const labelCmd = $derived(`kubectl label --overwrite ns lab-05 pod-security.kubernetes.io/${mode}=${level}`);

  async function apply() {
    if (busy) return;
    busy = true; out = ''; outKind = '';
    stage = 'authn'; await wait(450);
    stage = 'authz'; await wait(450);
    stage = 'admission'; await wait(650);
    const list = violations.map((v) => v.msg).join(', ');
    if (invalid) {
      stage = 'rejected';
      out = `The Pod "app-demo" is invalid: spec.containers[0].securityContext: Invalid value: core.SecurityContext{Privileged:(*bool)(true), AllowPrivilegeEscalation:(*bool)(false)}: cannot set \`allowPrivilegeEscalation\` to false and \`privileged\` to true`;
      outKind = 'fail';
      note = 'Esto no es PSA sino la validación del propio objeto: un contenedor privileged ya puede escalar privilegios, así que allowPrivilegeEscalation=false se contradice. El API server lo rechaza antes de llegar a los admission controllers.';
    } else if (!violations.length) {
      stage = 'etcd';
      out = 'pod/app-demo created';
      outKind = 'ok';
      note = level === 'privileged' ? 'Perfil privileged: sin restricciones, PSA admite cualquier pod. Es el valor por defecto si el namespace no tiene labels.' : level === 'baseline' ? 'El pod cumple baseline: no es privileged ni monta hostPath. baseline bloquea las escaladas conocidas pero no exige endurecimiento; restricted sí lo exigiría.' : 'El pod cumple restricted: runAsNonRoot, allowPrivilegeEscalation=false, capabilities drop ALL y seccompProfile RuntimeDefault. Es exactamente lo que lleva pod-seguro en el laboratorio.';
    } else if (mode === 'enforce') {
      stage = 'rejected';
      out = `Error from server (Forbidden): error when creating "pod.yaml": pods "app-demo" is forbidden: violates PodSecurity "${level}:latest": ${list}`;
      outKind = 'fail';
      note = `Modo enforce: el admission controller PodSecurity rechaza el pod y te lista exactamente lo que falta (${violations.length} ${violations.length === 1 ? 'violación' : 'violaciones'}). Es la mejor guía para endurecer el manifiesto. Si lo creara un Deployment, el Deployment sí se crearía pero su ReplicaSet no lograría crear pods.`;
    } else if (mode === 'warn') {
      stage = 'etcd';
      out = `Warning: would violate PodSecurity "${level}:latest": ${list}\npod/app-demo created`;
      outKind = 'warn';
      note = 'Modo warn: el pod se admite, pero kubectl muestra el aviso. Sirve para medir el impacto antes de pasar a enforce (igual que kubectl label --dry-run=server).';
    } else {
      stage = 'etcd';
      out = `pod/app-demo created\n# en el log de auditoría del API server:\n#   pod-security.kubernetes.io/audit-violations: would violate PodSecurity "${level}:latest": ${list}`;
      outKind = 'warn';
      note = 'Modo audit: el pod se admite sin avisar al usuario; la violación queda anotada en el log de auditoría del API server para revisarla después.';
    }
    busy = false;
  }

  const hints = {
    level: () => { note = level === 'privileged' ? 'privileged: sin restricciones. Es lo que tienen los namespaces sin labels de PSA.' : level === 'baseline' ? 'baseline: prohíbe privileged, hostNetwork, hostPID, hostPath y capabilities peligrosas. Compatible con la mayoría de apps.' : 'restricted: todo lo de baseline y además exige runAsNonRoot, allowPrivilegeEscalation=false, drop ALL y seccompProfile RuntimeDefault o Localhost.'; },
    mode: () => { note = mode === 'enforce' ? 'enforce rechaza los pods que violan el perfil (los que ya existían no se tocan).' : mode === 'warn' ? 'warn los admite y muestra el aviso al usuario.' : 'audit los admite y lo anota en el log de auditoría.'; },
    privileged: () => { note = privileged ? 'privileged: true da al contenedor casi todo el poder del nodo. Lo prohíbe baseline (y por tanto restricted).' : 'Sin privileged: el contenedor corre con el aislamiento normal del runtime.'; },
    nonroot: () => { note = runAsNonRoot ? 'runAsNonRoot: true: el kubelet se niega a arrancar el contenedor si fuera a ejecutarse como UID 0. restricted lo exige.' : 'Sin runAsNonRoot, el contenedor puede arrancar como root (lo hace busybox por defecto).'; },
    ape: () => { note = apeFalse ? 'allowPrivilegeEscalation: false activa no_new_privs: un proceso no puede ganar más privilegios que su padre (adiós a los binarios setuid). restricted lo exige.' : 'Sin allowPrivilegeEscalation=false, un binario setuid podría escalar privilegios.'; },
    caps: () => { note = dropAll ? 'capabilities.drop: ["ALL"] deja al proceso con cero capabilities (CapEff 0000000000000000 en el lab). restricted lo exige; después se podría añadir solo NET_BIND_SERVICE.' : 'Sin drop ALL, el contenedor conserva el conjunto de capabilities por defecto del runtime.'; },
    seccomp: () => { note = seccomp ? 'seccompProfile RuntimeDefault filtra las llamadas al sistema con el perfil por defecto del runtime. restricted exige RuntimeDefault o Localhost.' : 'Sin seccompProfile, el contenedor puede hacer cualquier syscall.'; },
    hostPath: () => { note = hostPath ? 'hostPath monta un directorio del nodo dentro del pod: baseline lo prohíbe porque permite leer o alterar el nodo.' : 'Sin volúmenes hostPath.'; },
  };
</script>

<div class="psa">
  <div class="layout">
    <div class="left">
      <div class="controls ns">
        <div class="field"><label for="p-level">perfil del namespace</label><select id="p-level" bind:value={level} onchange={hints.level} disabled={busy}><option value="privileged">privileged</option><option value="baseline">baseline</option><option value="restricted">restricted</option></select></div>
        <div class="field"><label for="p-mode">modo</label><select id="p-mode" bind:value={mode} onchange={hints.mode} disabled={busy}><option value="enforce">enforce</option><option value="warn">warn</option><option value="audit">audit</option></select></div>
      </div>
      <code class="mono cmd">$ {labelCmd}</code>
      <fieldset class="opts">
        <legend>securityContext del pod app-demo</legend>
        <label class="check"><input type="checkbox" bind:checked={privileged} onchange={hints.privileged} disabled={busy} /> privileged: true</label>
        <label class="check"><input type="checkbox" bind:checked={runAsNonRoot} onchange={hints.nonroot} disabled={busy} /> runAsNonRoot: true</label>
        <label class="check"><input type="checkbox" bind:checked={apeFalse} onchange={hints.ape} disabled={busy} /> allowPrivilegeEscalation: false</label>
        <label class="check"><input type="checkbox" bind:checked={dropAll} onchange={hints.caps} disabled={busy} /> capabilities.drop: ["ALL"]</label>
        <label class="check"><input type="checkbox" bind:checked={seccomp} onchange={hints.seccomp} disabled={busy} /> seccompProfile: RuntimeDefault</label>
        <label class="check"><input type="checkbox" bind:checked={hostPath} onchange={hints.hostPath} disabled={busy} /> volumen hostPath</label>
      </fieldset>
      <div class="controls">
        <button type="button" class="btn primary" onclick={apply} disabled={busy}>kubectl apply -f pod.yaml</button>
        <span class="hint">{violations.length ? `${violations.length} ${violations.length === 1 ? 'violación' : 'violaciones'} de ${level}` : `cumple ${level}`}</span>
      </div>
    </div>
    <pre class="yaml">{yaml}</pre>
  </div>

  <ol class="pipeline" aria-label="recorrido de la petición en el API server">
    <li class:on={stage === 'authn'} class:past={stage !== 'idle' && stage !== 'authn'}>1 autenticación<small>kubernetes-admin</small></li>
    <li class:on={stage === 'authz'} class:past={['admission', 'etcd', 'rejected'].includes(stage)}>2 autorización<small>RBAC: create pods</small></li>
    <li class:on={stage === 'admission'} class:past={stage === 'etcd'} class:bad={stage === 'rejected'}>3 admission<small>PodSecurity {mode}={level}</small></li>
    <li class:on={stage === 'etcd'}>4 etcd<small>{stage === 'etcd' ? 'pod guardado' : stage === 'rejected' ? 'no llega' : ''}</small></li>
  </ol>

  {#if out}<pre class="out {outKind}">{out}</pre>{/if}
  <div class="explain {outKind}" aria-live="polite">{note}</div>

  <div class="fourc" aria-label="las 4C de la seguridad cloud native">
    <div class="c cloud"><span>Cloud</span>
      <div class="c cluster hl"><span>Cluster: API server, RBAC, admission (PSA), NetworkPolicy</span>
        <div class="c container hl"><span>Container: securityContext, imagen, no root</span>
          <div class="c code"><span>Code</span></div>
        </div>
      </div>
    </div>
    <p class="hint">PSA actúa en la capa Cluster (lo aplica el API server); lo que configura, el securityContext, vive en la capa Container. Sustituyó a PodSecurityPolicy, eliminada en Kubernetes 1.25.</p>
  </div>
</div>

<style>
  .psa { display: grid; gap: 12px; }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
  @media (max-width: 720px) { .layout { grid-template-columns: 1fr; } }
  .left { display: grid; gap: 10px; }
  .ns { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .field { display: grid; gap: 3px; min-width: 0; }
  .field select { width: 100%; min-width: 0; }
  .cmd { font-size: 0.76rem; color: var(--ink-2); word-break: break-all; }
  .opts { border: 1px solid var(--line); border-radius: var(--r-m); padding: 6px 12px 10px; margin: 0; display: grid; gap: 6px; background: var(--panel-2); }
  legend { font-weight: 600; font-size: 0.86rem; padding: 0 4px; }
  .check { display: flex; align-items: center; gap: 8px; font-weight: 400; font-size: 0.86rem; font-family: var(--mono); }
  .check input { accent-color: var(--helm); margin: 0; }
  .controls { margin: 0; }
  .yaml { white-space: pre; min-height: 100%; }
  .pipeline { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .pipeline li { padding: 6px 8px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel-2); font-size: 0.8rem; font-weight: 500; display: grid; gap: 2px; transition: border-color var(--dur), background var(--dur); min-width: 0; }
  .pipeline small { font: 0.68rem var(--mono); color: var(--ink-3); overflow-wrap: anywhere; }
  .pipeline li.on { border-color: var(--helm); background: var(--helm-2); }
  .pipeline li.past { border-color: var(--ready); }
  .pipeline li.bad { border-color: var(--fail); background: var(--fail-2); }
  @media (max-width: 520px) { .pipeline { grid-template-columns: 1fr 1fr; } }
  .out { white-space: pre-wrap; word-break: break-word; }
  .out.fail { color: #ffb3b3; }
  .out.ok { color: #b9f0cc; }
  .out.warn { color: #ffd79a; }
  .fourc { display: grid; gap: 8px; }
  .c { border: 1px solid var(--line); border-radius: var(--r-m); padding: 8px 10px; font-size: 0.8rem; color: var(--ink-3); background: var(--panel-2); }
  .c .c { margin-top: 6px; background: var(--panel); }
  .c.hl { border-color: var(--helm); color: var(--helm-ink); background: var(--helm-2); }
  .c.hl > span { font-weight: 600; }
</style>
