<script lang="ts">
  // Evaluador de RBAC: roles editables, bindings fijos y la cadena de evaluación de kubectl auth can-i --as=...
  type Verb = 'get' | 'list' | 'watch' | 'create' | 'delete';
  type Resource = 'pods' | 'secrets' | 'nodes' | 'deployments';
  const VERBS: Verb[] = ['get', 'list', 'watch', 'create', 'delete'];
  const RESOURCES: Resource[] = ['pods', 'secrets', 'nodes', 'deployments'];
  const GROUP: Record<Resource, string> = { pods: '', secrets: '', nodes: '', deployments: 'apps' };
  const CLUSTER_SCOPED = new Set<Resource>(['nodes']);
  const NAMESPACES = ['lab-05', 'default'];

  interface RoleDef { name: string; kind: 'Role' | 'ClusterRole'; ns: string; resources: Resource[]; verbs: Verb[] }
  interface Subject { kind: 'User' | 'Group' | 'ServiceAccount'; name: string; ns?: string }
  interface Binding { name: string; kind: 'RoleBinding' | 'ClusterRoleBinding'; ns: string; roleRef: { kind: 'Role' | 'ClusterRole'; name: string }; subjects: Subject[] }
  interface Who { id: string; label: string; user: string; groups: string[]; sa?: { name: string; ns: string }; asGroup?: string }

  let roles = $state<RoleDef[]>([
    { name: 'lector-pods', kind: 'Role', ns: 'lab-05', resources: ['pods'], verbs: ['get', 'list', 'watch'] },
    { name: 'lab-05-lector-nodos', kind: 'ClusterRole', ns: '', resources: ['nodes'], verbs: ['get', 'list'] },
    { name: 'gestor-deploy', kind: 'ClusterRole', ns: '', resources: ['deployments'], verbs: ['get', 'list', 'watch', 'create', 'delete'] },
  ]);
  const bindings: Binding[] = [
    { name: 'lector-pods', kind: 'RoleBinding', ns: 'lab-05', roleRef: { kind: 'Role', name: 'lector-pods' }, subjects: [{ kind: 'ServiceAccount', name: 'lector', ns: 'lab-05' }, { kind: 'User', name: 'ana' }] },
    { name: 'lab-05-lector-nodos', kind: 'ClusterRoleBinding', ns: '', roleRef: { kind: 'ClusterRole', name: 'lab-05-lector-nodos' }, subjects: [{ kind: 'ServiceAccount', name: 'lector', ns: 'lab-05' }] },
    { name: 'dev-gestor-deploy', kind: 'RoleBinding', ns: 'lab-05', roleRef: { kind: 'ClusterRole', name: 'gestor-deploy' }, subjects: [{ kind: 'Group', name: 'dev' }] },
  ];
  const WHO: Who[] = [
    { id: 'ana', label: 'ana (User; su certificado trae O=dev)', user: 'ana', groups: ['dev', 'system:authenticated'] },
    { id: 'lector', label: 'ServiceAccount lab-05:lector', user: 'system:serviceaccount:lab-05:lector', groups: ['system:serviceaccounts', 'system:serviceaccounts:lab-05', 'system:authenticated'], sa: { name: 'lector', ns: 'lab-05' } },
    { id: 'dev', label: 'grupo dev (cualquier usuario del grupo)', user: 'alguien', groups: ['dev', 'system:authenticated'], asGroup: 'dev' },
  ];

  let whoId = $state('lector');
  let verb = $state<Verb>('list');
  let resource = $state<Resource>('pods');
  let ns = $state('lab-05');
  let note = $state('Elige sujeto, verbo, recurso y namespace: la cadena de evaluación muestra qué binding aplica y qué regla concede el permiso. Edita los roles y mira cómo cambia la respuesta.');

  const who = $derived(WHO.find((w) => w.id === whoId)!);
  const clusterScoped = $derived(CLUSTER_SCOPED.has(resource));
  const cmd = $derived(`kubectl auth can-i ${verb} ${resource}${clusterScoped ? '' : ` -n ${ns}`} --as=${who.user}${who.asGroup ? ` --as-group=${who.asGroup}` : ''}`);

  function subjectMatches(s: Subject, w: Who): boolean {
    if (s.kind === 'User') return s.name === w.user;
    if (s.kind === 'Group') return w.groups.includes(s.name);
    return !!w.sa && s.name === w.sa.name && s.ns === w.sa.ns;
  }
  const subjStr = (s: Subject) => (s.kind === 'ServiceAccount' ? `${s.kind} ${s.ns}:${s.name}` : `${s.kind} ${s.name}`);

  interface Step { binding: Binding; status: 'ok' | 'skip' | 'no'; text: string; role?: RoleDef }
  const evalResult = $derived.by((): { allowed: boolean; steps: Step[]; grantedBy?: Binding; role?: RoleDef } => {
    const steps: Step[] = [];
    let grantedBy: Binding | undefined, grole: RoleDef | undefined;
    for (const b of bindings) {
      if (grantedBy) break;
      if (b.kind === 'RoleBinding') {
        if (clusterScoped) { steps.push({ binding: b, status: 'skip', text: `${resource} es un recurso cluster-scoped (sin namespace). Un RoleBinding solo cubre peticiones dentro de su namespace, así que ni se evalúa.` }); continue; }
        if (b.ns !== ns) { steps.push({ binding: b, status: 'skip', text: `la petición es en el namespace ${ns} y este RoleBinding vive en ${b.ns}: no aplica fuera de su namespace.` }); continue; }
      }
      const sm = b.subjects.find((s) => subjectMatches(s, who));
      if (!sm) { steps.push({ binding: b, status: 'skip', text: `el sujeto no está en sus subjects (${b.subjects.map(subjStr).join(', ')}).` }); continue; }
      const role = b.roleRef.kind === 'Role' ? roles.find((r) => r.kind === 'Role' && r.name === b.roleRef.name && r.ns === b.ns) : roles.find((r) => r.kind === 'ClusterRole' && r.name === b.roleRef.name);
      if (!role) { steps.push({ binding: b, status: 'no', text: `coincide el sujeto (${subjStr(sm)}), pero roleRef apunta a ${b.roleRef.kind} ${b.roleRef.name}${b.roleRef.kind === 'Role' ? ` en el namespace ${b.ns}` : ''} y no existe: el binding queda vacío, no concede nada.` }); continue; }
      const hasRes = role.resources.includes(resource), hasVerb = role.verbs.includes(verb);
      if (hasRes && hasVerb) {
        steps.push({ binding: b, status: 'ok', text: `coincide el sujeto (${subjStr(sm)}) y la regla de ${role.kind} ${role.name} incluye el recurso ${resource}${GROUP[resource] ? ` (apiGroup ${GROUP[resource]})` : ' (grupo core)'} con el verbo ${verb}.${b.kind === 'RoleBinding' && role.kind === 'ClusterRole' ? ' Es el patrón ClusterRole + RoleBinding: los permisos del ClusterRole, pero solo en ' + b.ns + '.' : ''}`, role });
        grantedBy = b; grole = role;
      } else {
        steps.push({ binding: b, status: 'no', text: `coincide el sujeto (${subjStr(sm)}), pero ${role.kind} ${role.name} ${!hasRes ? `no incluye el recurso ${resource} (tiene: ${role.resources.join(', ') || 'nada'})` : `no incluye el verbo ${verb} sobre ${resource} (tiene: ${role.verbs.join(', ') || 'ninguno'})`}.`, role });
      }
    }
    return { allowed: !!grantedBy, steps, grantedBy, role: grole };
  });

  const forbidden = $derived(`Error from server (Forbidden): ${resource} is forbidden: User "${who.user}" cannot ${verb} resource "${resource}" in API group "${GROUP[resource]}"${clusterScoped ? ' at the cluster scope' : ` in the namespace "${ns}"`}`);

  const explainBinding = $derived.by(() => evalResult.grantedBy ?? evalResult.steps.find((s) => s.status === 'no')?.binding ?? bindings[0]);
  const explainRole = $derived.by(() => {
    const b = explainBinding;
    return b.roleRef.kind === 'Role' ? roles.find((r) => r.kind === 'Role' && r.name === b.roleRef.name && r.ns === b.ns) : roles.find((r) => r.kind === 'ClusterRole' && r.name === b.roleRef.name);
  });
  const yaml = $derived.by(() => {
    const b = explainBinding;
    const l = ['apiVersion: rbac.authorization.k8s.io/v1', `kind: ${b.kind}`, 'metadata:', `  name: ${b.name}`];
    if (b.kind === 'RoleBinding') l.push(`  namespace: ${b.ns}`);
    l.push('subjects:');
    for (const s of b.subjects) {
      l.push(`  - kind: ${s.kind}`, `    name: ${s.name}`);
      if (s.kind === 'ServiceAccount') l.push(`    namespace: ${s.ns}`);
      else l.push('    apiGroup: rbac.authorization.k8s.io');
    }
    l.push('roleRef:', `  kind: ${b.roleRef.kind}`, `  name: ${b.roleRef.name}`, '  apiGroup: rbac.authorization.k8s.io');
    const r = explainRole;
    if (r) {
      l.push('---', 'apiVersion: rbac.authorization.k8s.io/v1', `kind: ${r.kind}`, 'metadata:', `  name: ${r.name}`);
      if (r.kind === 'Role') l.push(`  namespace: ${r.ns}`);
      l.push('rules:');
      const groups = [...new Set(r.resources.map((x) => GROUP[x]))];
      if (!r.resources.length) l.push('  []');
      for (const g of groups) l.push(`  - apiGroups: ["${g}"]`, `    resources: [${r.resources.filter((x) => GROUP[x] === g).join(', ')}]`, `    verbs: [${r.verbs.join(', ')}]`);
    } else l.push(`# ${b.roleRef.kind} ${b.roleRef.name} no existe${b.roleRef.kind === 'Role' ? ` en ${b.ns}` : ''}`);
    return l.join('\n');
  });

  function toggle<T>(arr: T[], v: T): T[] { return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]; }
  function toggleVerb(r: RoleDef, v: Verb) { r.verbs = toggle(r.verbs, v); note = `${r.kind} ${r.name}: verbos ${r.verbs.join(', ') || 'ninguno'}. RBAC solo suma permisos: quitar un verbo no deniega nada a nadie, simplemente deja de concederlo.`; }
  function toggleRes(r: RoleDef, x: Resource) {
    r.resources = toggle(r.resources, x);
    if (x === 'nodes' && r.kind === 'Role' && r.resources.includes('nodes')) note = `Un Role puede listar nodes en sus reglas, pero nunca servirá: nodes es cluster-scoped y un Role solo se concede con un RoleBinding, que solo cubre peticiones dentro de su namespace. Para nodes hace falta ClusterRole + ClusterRoleBinding.`;
    else if (x === 'deployments') note = `deployments está en el API group apps, no en el core: en el YAML la regla lleva apiGroups: ["apps"]. Con apiGroups: [""] can-i respondería no.`;
    else note = `${r.kind} ${r.name}: recursos ${r.resources.join(', ') || 'ninguno'}.`;
  }
  function moveRole(r: RoleDef) { note = r.ns === 'lab-05' ? `Role ${r.name} vuelve a lab-05: el RoleBinding del mismo namespace lo encuentra otra vez.` : `Role ${r.name} ahora vive en ${r.ns}. El RoleBinding lector-pods sigue en lab-05 y su roleRef solo busca Roles de su propio namespace: queda apuntando a nada.`; }
  const hints = {
    who: () => { note = who.id === 'lector' ? 'ServiceAccount: su nombre de usuario es system:serviceaccount:<ns>:<nombre>; además pertenece a los grupos system:serviceaccounts y system:serviceaccounts:lab-05.' : who.id === 'ana' ? 'ana es un usuario humano: Kubernetes no lo guarda en ningún sitio, el nombre y el grupo (dev) salen de su certificado (CN y O).' : 'Con --as-group preguntas por cualquier miembro del grupo dev sin importar el usuario.'; },
    verb: () => { note = `Verbo ${verb}: la regla del Role debe listarlo explícitamente. list no incluye get ni al revés.`; },
    resource: () => { note = clusterScoped ? `${resource} es cluster-scoped: el namespace no cuenta y solo se evalúan ClusterRoleBindings.` : `${resource}${GROUP[resource] ? ` (API group ${GROUP[resource]})` : ' (grupo core)'} es namespaced: cuentan los RoleBindings del namespace ${ns} y los ClusterRoleBindings.`; },
    ns: () => { note = `Namespace ${ns}: solo aplican los RoleBindings que viven en ${ns} (y los ClusterRoleBindings, que valen en todos).`; },
  };
</script>

<div class="rbac">
  <div class="top">
    <div class="query">
      <div class="field"><label for="r-who">sujeto (--as)</label><select id="r-who" bind:value={whoId} onchange={hints.who}>{#each WHO as w}<option value={w.id}>{w.label}</option>{/each}</select></div>
      <div class="field"><label for="r-verb">verbo</label><select id="r-verb" bind:value={verb} onchange={hints.verb}>{#each VERBS as v}<option value={v}>{v}</option>{/each}</select></div>
      <div class="field"><label for="r-res">recurso</label><select id="r-res" bind:value={resource} onchange={hints.resource}>{#each RESOURCES as x}<option value={x}>{x}</option>{/each}</select></div>
      <div class="field"><label for="r-ns">namespace</label><select id="r-ns" bind:value={ns} onchange={hints.ns} disabled={clusterScoped}>{#each NAMESPACES as n}<option value={n}>{n}</option>{/each}</select></div>
    </div>
    <pre class="cmd">$ {cmd}{#if clusterScoped}
Warning: resource 'nodes' is not namespace scoped{/if}
<span class={evalResult.allowed ? 'yes' : 'no'}>{evalResult.allowed ? 'yes' : 'no'}</span></pre>
  </div>

  <ol class="chain" aria-label="cadena de evaluación">
    {#each evalResult.steps as s (s.binding.name)}
      <li class={s.status}>
        <span class="tag">{s.status === 'ok' ? 'concede' : s.status === 'skip' ? 'se ignora' : 'no concede'}</span>
        <strong class="mono">{s.binding.kind} {s.binding.name}{s.binding.ns ? ` (${s.binding.ns})` : ''}</strong>
        <span class="mono ref">roleRef {s.binding.roleRef.kind} {s.binding.roleRef.name}</span>
        <p>{s.text}</p>
      </li>
    {/each}
    <li class={evalResult.allowed ? 'ok' : 'no'}>
      <span class="tag">{evalResult.allowed ? 'yes' : 'no'}</span>
      <p>{#if evalResult.allowed}Basta con que un binding conceda el permiso: la evaluación termina aquí.{:else}Ningún binding concedió el permiso. Como RBAC no tiene reglas de denegar, lo que no está permitido explícitamente está prohibido: el API server responde 403.{/if}</p>
      {#if !evalResult.allowed}<pre class="forbidden">{forbidden}</pre>{/if}
    </li>
  </ol>

  <div class="explain {evalResult.allowed ? 'ok' : 'warn'}" aria-live="polite">{note}</div>

  <div class="bottom">
    <section class="roles">
      <h4>Roles y ClusterRoles (editables)</h4>
      {#each roles as r, i (r.name)}
        <fieldset class="role">
          <legend><span class="mono">{r.kind} {r.name}</span>{#if r.kind === 'Role'}<select aria-label="namespace del Role" bind:value={roles[i].ns} onchange={() => moveRole(r)}>{#each NAMESPACES as n}<option value={n}>{n}</option>{/each}</select>{/if}</legend>
          <div class="opts">
            <span class="k">resources</span>
            {#each RESOURCES as x}<label class="check"><input type="checkbox" checked={r.resources.includes(x)} onchange={() => toggleRes(r, x)} /> {x}</label>{/each}
          </div>
          <div class="opts">
            <span class="k">verbs</span>
            {#each VERBS as v}<label class="check"><input type="checkbox" checked={r.verbs.includes(v)} onchange={() => toggleVerb(r, v)} /> {v}</label>{/each}
          </div>
        </fieldset>
      {/each}
      <p class="hint">Bindings fijos: RoleBinding lector-pods (lab-05) para la SA lector y ana; ClusterRoleBinding lab-05-lector-nodos para la SA lector; RoleBinding dev-gestor-deploy (lab-05) con el ClusterRole gestor-deploy para el grupo dev.</p>
    </section>
    <section class="yaml">
      <h4>YAML que explica la respuesta</h4>
      <pre>{yaml}</pre>
    </section>
  </div>
</div>

<style>
  .rbac { display: grid; gap: 14px; }
  .top { display: grid; gap: 10px; }
  .query { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); gap: 8px; }
  .field { display: grid; gap: 3px; min-width: 0; }
  .field select { width: 100%; min-width: 0; }
  .cmd { white-space: pre-wrap; word-break: break-all; }
  .cmd .yes { color: #7ee2a0; font-weight: 600; }
  .cmd .no { color: #ff9c9c; font-weight: 600; }
  .chain { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .chain li { position: relative; padding: 8px 10px 8px 14px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel-2); border-left-width: 4px; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; font-size: 0.88rem; transition: border-color var(--dur); }
  .chain li.ok { border-left-color: var(--ready); }
  .chain li.no { border-left-color: var(--fail); }
  .chain li.skip { border-left-color: var(--line); color: var(--ink-3); }
  .chain .tag { font-size: 0.72rem; font-weight: 600; text-transform: none; padding: 1px 7px; border-radius: 4px; background: var(--panel); border: 1px solid var(--line); }
  .chain li.ok .tag { color: var(--ready); border-color: var(--ready); }
  .chain li.no .tag { color: var(--fail); border-color: var(--fail); }
  .chain .ref { font-size: 0.76rem; color: var(--ink-3); }
  .chain p { flex-basis: 100%; color: var(--ink-2); }
  .chain li.skip p { color: var(--ink-3); }
  .forbidden { flex-basis: 100%; white-space: pre-wrap; word-break: break-word; font-size: 0.78rem; }
  .bottom { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
  @media (max-width: 760px) { .bottom { grid-template-columns: 1fr; } }
  h4 { font-size: 0.92rem; font-weight: 600; margin-bottom: 8px; }
  .role { border: 1px solid var(--line); border-radius: var(--r-m); padding: 6px 10px 8px; margin: 0 0 8px; background: var(--panel); }
  legend { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-weight: 600; font-size: 0.85rem; padding: 0 4px; }
  legend select { font-size: 0.8rem; padding: 2px 6px; }
  .opts { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; margin-top: 4px; }
  .k { font: 500 0.74rem var(--mono); color: var(--ink-3); min-width: 5.5em; }
  .check { display: inline-flex; align-items: center; gap: 4px; font-weight: 400; font-size: 0.84rem; font-family: var(--mono); }
  .check input { accent-color: var(--helm); margin: 0; }
  .yaml pre { white-space: pre; }
</style>
