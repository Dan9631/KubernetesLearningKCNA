<script lang="ts">
  // Terminal de práctica: consola kubectl sobre un clúster simulado en memoria, con lienzo en vivo y misiones.
  import { tick as flush } from 'svelte';
  import ClusterCanvas, { type NodeSpec, type PodSpec, type PodStatus } from '../../sims/ClusterCanvas.svelte';
  import { Cluster, imageTag } from '../../lib/kube/cluster.ts';
  import { execute, complete, PROMPT, HELP } from '../../lib/kube/kubectl.ts';
  import { MISSIONS } from '../../lib/kube/missions.ts';

  interface Entry { id: number; cmd?: string; out: string; ok: boolean }

  let cluster = $state.raw(new Cluster());
  let version = $state(0);
  let entries = $state<Entry[]>([{ id: 0, out: 'Clúster simulado kind-kcna listo (kubectl v1.37). Escribe help para ver los comandos; Tab completa, flechas recorren el historial.', ok: true }]);
  let input = $state('');
  let history = $state<string[]>([]);
  let hIndex = $state(-1);
  let draft = '';
  let seq = 1;
  let done = $state<string[]>([]);
  let showHints = $state(false);
  let ranOk: string[] = [];
  let outEl: HTMLDivElement | undefined = $state();
  let inputEl: HTMLInputElement | undefined = $state();

  const nodes = $derived.by((): NodeSpec[] => {
    void version;
    return cluster.nodes.map((n) => ({
      name: n.meta.name,
      role: n.role,
      labels: Object.fromEntries(Object.entries(n.meta.labels).filter(([k]) => !k.includes('/'))),
      taints: n.taints,
      status: n.ready ? 'Ready' : 'SchedulingDisabled',
    }));
  });

  const HIDDEN = ['kube-system', 'local-path-storage'];
  const colorOf = (ns: string): PodSpec['color'] => (ns === 'default' ? 'a' : ns === 'lab-03' ? 'd' : ns === cluster.currentNamespace ? 'b' : 'c');
  const statusOf = (s: string): PodStatus => {
    if (s === 'ErrImagePull') return 'ImagePullBackOff';
    if (s === 'Completed') return 'Succeeded';
    if (s === 'Error') return 'Failed';
    return (['Pending', 'ContainerCreating', 'Running', 'Terminating', 'Failed', 'CrashLoopBackOff', 'Succeeded', 'ImagePullBackOff'].includes(s) ? s : 'Pending') as PodStatus;
  };
  const pods = $derived.by((): PodSpec[] => {
    void version;
    return cluster.pods
      .filter((p) => !HIDDEN.includes(p.meta.namespace!))
      .map((p) => ({
        id: p.meta.uid,
        name: p.meta.name,
        node: p.spec.nodeName,
        status: statusOf(cluster.podStatus(p)),
        tag: p.meta.namespace === 'default' ? imageTag(p.spec.containers[0].image).replace(/-alpine$/, '') : p.meta.namespace,
        color: colorOf(p.meta.namespace!),
        restarts: p.status.restarts,
      }));
  });
  const hiddenCount = $derived.by(() => { void version; return cluster.pods.filter((p) => HIDDEN.includes(p.meta.namespace!)).length; });
  const ctxNs = $derived.by(() => { void version; return cluster.currentNamespace; });

  function checkMissions() {
    const ctx = { ran: (re: RegExp) => ranOk.some((x) => re.test(x)) };
    const now = MISSIONS.filter((m) => m.check(cluster, ctx)).map((m) => m.id);
    const merged = [...new Set([...done, ...now])];
    if (merged.length !== done.length) done = merged;
  }

  async function scrollDown() {
    await flush();
    if (outEl) outEl.scrollTop = outEl.scrollHeight;
  }

  function submit() {
    const cmd = input;
    input = '';
    hIndex = -1;
    draft = '';
    if (!cmd.trim()) { entries = [...entries, { id: seq++, cmd: '', out: '', ok: true }]; scrollDown(); return; }
    if (history[history.length - 1] !== cmd) history = [...history, cmd];
    const r = execute(cluster, cmd);
    if (r.clear) { entries = []; return; }
    if (r.ok) ranOk.push(cmd.trim());
    entries = [...entries, { id: seq++, cmd, out: r.out, ok: r.ok }];
    if (entries.length > 300) entries = entries.slice(-300);
    version++;
    checkMissions();
    scrollDown();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      if (hIndex === -1) { draft = input; hIndex = history.length - 1; } else if (hIndex > 0) hIndex--;
      input = history[hIndex];
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIndex === -1) return;
      if (hIndex < history.length - 1) { hIndex++; input = history[hIndex]; } else { hIndex = -1; input = draft; }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const { candidates, prefix } = complete(cluster, input);
      if (!candidates.length) return;
      const base = input.slice(0, input.length - prefix.length);
      if (candidates.length === 1) { input = base + candidates[0] + (candidates[0].endsWith('=') || candidates[0].endsWith('/') ? '' : ' '); return; }
      let common = candidates[0];
      for (const cnd of candidates) while (!cnd.startsWith(common)) common = common.slice(0, -1);
      if (common.length > prefix.length) input = base + common;
      else { entries = [...entries, { id: seq++, cmd: input, out: candidates.join('  '), ok: true }]; scrollDown(); }
      return;
    }
    if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); entries = []; return; }
    if (e.key === 'c' && e.ctrlKey && !window.getSelection()?.toString()) { e.preventDefault(); entries = [...entries, { id: seq++, cmd: input + '^C', out: '', ok: true }]; input = ''; hIndex = -1; scrollDown(); }
  }

  function clear() { entries = []; inputEl?.focus(); }
  function reset() {
    cluster = new Cluster();
    ranOk = []; done = []; history = []; hIndex = -1; input = '';
    entries = [{ id: seq++, out: 'Clúster reiniciado: estado inicial (deployment web, service web, pod tools, deployment catalogo roto).', ok: true }];
    version++;
    inputEl?.focus();
  }
  function use(cmd: string) { input = cmd; inputEl?.focus(); }
  function focusInput(e: MouseEvent) { if (!window.getSelection()?.toString() && (e.target as HTMLElement).tagName !== 'BUTTON') inputEl?.focus(); }

  $effect(() => {
    // reloj del clúster: un segundo real = un segundo simulado
    const t = setInterval(() => { cluster.tick(1000); version++; checkMissions(); }, 1000);
    return () => clearInterval(t);
  });
</script>

<div class="term-layout">
  <section class="console" aria-label="Terminal kubectl simulada">
    <div class="bar">
      <span class="title mono">kubectl · kind-kcna · namespace <strong>{ctxNs}</strong></span>
      <div class="actions">
        <button type="button" class="btn small" onclick={clear}>Limpiar</button>
        <button type="button" class="btn small" onclick={reset}>Reiniciar clúster</button>
      </div>
    </div>
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
    <div class="screen" onclick={focusInput}>
      <div class="out mono" bind:this={outEl} role="region" aria-live="polite" aria-label="Salida de la terminal">
        {#each entries as e (e.id)}
          {#if e.cmd !== undefined}<div class="line cmd"><span class="prompt">{PROMPT}</span>{e.cmd}</div>{/if}
          {#if e.out}<pre class:err={!e.ok}>{e.out}</pre>{/if}
        {/each}
      </div>
      <div class="inrow mono">
        <label for="term-cmd" class="visually-hidden">Comando kubectl</label>
        <span class="prompt" aria-hidden="true">{PROMPT}</span>
        <input id="term-cmd" bind:this={inputEl} bind:value={input} {onkeydown} type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck={false} placeholder="kubectl get pods" />
      </div>
    </div>
    <p class="hint">Tab completa comandos, recursos y nombres · flechas arriba y abajo recorren el historial · Ctrl+L limpia. El clúster avanza en tiempo real: los pods tardan unos segundos en pasar a Running.</p>
  </section>

  <aside class="side">
    <section class="panel">
      <h2>Clúster en vivo</h2>
      <ClusterCanvas {nodes} {pods} compact showLabels={true} />
      <p class="hint">Fichas: pods de default (etiqueta = versión de imagen) y de otros namespaces (etiqueta = namespace). {hiddenCount} pods de kube-system y local-path-storage no se dibujan.</p>
    </section>
    <section class="panel">
      <div class="mhead">
        <h2>Misiones <span class="count mono">{done.length}/{MISSIONS.length}</span></h2>
        <button type="button" class="btn small" onclick={() => (showHints = !showHints)} aria-pressed={showHints}>{showHints ? 'Ocultar pistas' : 'Ver pistas'}</button>
      </div>
      <ol class="missions">
        {#each MISSIONS as m, i (m.id)}
          {@const ok = done.includes(m.id)}
          <li class:ok>
            <span class="check" aria-hidden="true">{ok ? '✓' : i + 1}</span>
            <div>
              <span class="mtitle">{m.title}</span><span class="visually-hidden">{ok ? ' (completada)' : ''}</span>
              {#if showHints && !ok}<button type="button" class="use mono" onclick={() => use(m.hint.split(',')[0])} title="Copiar al prompt">{m.hint}</button>{/if}
            </div>
          </li>
        {/each}
      </ol>
      {#if done.length === MISSIONS.length}<p class="explain ok">Misiones completadas. Ahora repite la secuencia en tu clúster real con <span class="mono">.\kcna.ps1 up</span>.</p>{/if}
    </section>
  </aside>
</div>

<style>
  .term-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 20px; align-items: start; }
  .console { min-width: 0; }
  .bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px 16px; margin-bottom: 10px; }
  .title { font-size: 0.82rem; color: var(--ink-2); }
  .title strong { color: var(--helm); font-weight: 500; }
  .actions { display: flex; gap: 8px; }
  .screen { background: #0e1626; color: #dfe7f3; border-radius: var(--r-m); border: 1px solid var(--line); box-shadow: var(--shadow); display: flex; flex-direction: column; height: min(70vh, 640px); min-height: 360px; cursor: text; }
  .out { flex: 1; overflow: auto; padding: 12px 14px 6px; font-size: 0.82rem; line-height: 1.5; scrollbar-color: #2a3a57 transparent; }
  .out pre { margin: 0 0 6px; padding: 0; background: none; color: inherit; font: inherit; white-space: pre; overflow: visible; }
  .out pre.err { color: #ffb4a8; }
  .line.cmd { color: #e7edf5; white-space: pre; margin-top: 4px; }
  .prompt { color: #8fe0ae; }
  .inrow { display: flex; align-items: center; gap: 0; padding: 8px 14px 10px; border-top: 1px solid #203049; font-size: 0.85rem; }
  .inrow .prompt { white-space: pre; flex: none; }
  .inrow input { flex: 1; min-width: 0; background: none; border: 0; outline: none; color: #e7edf5; font: inherit; padding: 2px 0; caret-color: #8fe0ae; }
  .inrow input::placeholder { color: #5b6b86; }
  .inrow:focus-within { border-top-color: var(--helm); }
  .hint { color: var(--ink-2); font-size: 0.88rem; margin-top: 10px; }
  .side { display: grid; gap: 16px; min-width: 0; }
  .panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-l); box-shadow: var(--shadow); padding: 16px; }
  .panel h2 { font-size: 1.02rem; margin-bottom: 10px; display: flex; align-items: baseline; gap: 8px; }
  .panel .hint { font-size: 0.8rem; margin-top: 8px; }
  .mhead { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .count { font-size: 0.8rem; color: var(--ink-3); font-weight: 400; }
  .missions { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .missions li { display: flex; gap: 10px; align-items: flex-start; font-size: 0.9rem; line-height: 1.4; }
  .missions li.ok .mtitle { color: var(--ink-3); text-decoration: line-through; text-decoration-thickness: 1px; }
  .check { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line); display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--ink-2); background: var(--panel-2); }
  .missions li.ok .check { background: var(--ready-2); border-color: var(--ready); color: var(--ready); font-weight: 600; }
  .use { display: block; margin-top: 4px; font-size: 0.74rem; color: var(--helm-ink); background: var(--helm-2); border: 0; border-radius: 4px; padding: 2px 6px; cursor: pointer; text-align: left; }
  .explain { margin-top: 12px; padding: 10px 12px; border-radius: var(--r-m); background: var(--panel-2); border-left: 3px solid var(--ready); font-size: 0.9rem; }
  @media (max-width: 900px) {
    .term-layout { grid-template-columns: minmax(0, 1fr); }
    .screen { height: 52vh; min-height: 320px; }
  }
  @media (max-width: 420px) {
    .out, .inrow { font-size: 0.76rem; padding-left: 10px; padding-right: 10px; }
    .panel { padding: 12px; }
  }
</style>
