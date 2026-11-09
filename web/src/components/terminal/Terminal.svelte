<script lang="ts">
  // Terminal de práctica: consola kubectl sobre un clúster simulado en memoria, con lienzo en vivo y misiones.
  import { tick as flush } from 'svelte';
  import ClusterCanvas, { type NodeSpec, type PodSpec, type PodStatus } from '../../sims/ClusterCanvas.svelte';
  import { Cluster, imageTag } from '../../lib/kube/cluster.ts';
  import { execute, complete, PROMPT, HELP } from '../../lib/kube/kubectl.ts';
  import { MISSIONS, GROUPS } from '../../lib/kube/missions.ts';
  import { analizar, esqueleto, type Nota } from '../../lib/kube/analizador.ts';
  import { moduleUrl, pad } from '../../lib/modules';
  import { progress, addReto } from '../../lib/progress.svelte';

  interface Entry { id: number; cmd?: string; out: string; ok: boolean; notas?: Nota[] }

  let cluster = $state.raw(new Cluster());
  let version = $state(0);
  let entries = $state<Entry[]>([{ id: 0, out: 'Clúster simulado kind-kcna listo (kubectl v1.37). Escribe help para ver los comandos; Tab completa, flechas recorren el historial.', ok: true }]);
  let input = $state('');
  let history = $state<string[]>([]);
  let hIndex = $state(-1);
  let draft = '';
  let seq = 1;
  // misiones superadas: se guardan en el progreso (y se sincronizan); reiniciar el clúster no las borra
  const saved = () => MISSIONS.filter((m) => progress.retos.includes(`term:${m.id}`)).map((m) => m.id);
  let done = $state<string[]>(saved());
  // ayuda graduada por misión: 0 nada, 1 la idea, 2 el esqueleto del comando, 3 la solución
  let help = $state<Record<string, number>>({});
  // correcciones del tutor que el alumno pidió ver (por id de entrada)
  let fixes = $state<number[]>([]);
  // en el teléfono las misiones van encima de la consola, plegadas a "Siguiente: …" para no empujarla hacia abajo
  let missionsOpen = $state(typeof window === 'undefined' || !matchMedia('(max-width: 900px)').matches);
  const nextMission = $derived(MISSIONS.find((m) => !done.includes(m.id)));
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
    if (merged.length !== done.length) { done = merged; for (const id of now) addReto(`term:${id}`); }
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
    // el tutor mira el comando antes de ejecutarlo (con el clúster tal como estaba) y solo habla si hay algo que explicar
    const vistas = analizar(cmd, cluster);
    const r = execute(cluster, cmd);
    if (r.clear) { entries = []; return; }
    // para las misiones de consulta solo cuenta un comando que salió bien y enseñó algo
    if (r.ok && r.out.trim() && !/^No resources found/.test(r.out)) ranOk.push(cmd.trim());
    const notas = (r.ok ? vistas.filter((x) => x.nivel === 'aviso') : vistas).slice(0, 2);
    entries = [...entries, { id: seq++, cmd, out: r.out, ok: r.ok, notas: notas.length ? notas : undefined }];
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
    ranOk = []; done = saved(); history = []; hIndex = -1; input = ''; fixes = [];
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
          {#each e.notas ?? [] as nt, k (k)}
            <div class="tutor" class:aviso={nt.nivel === 'aviso'}>
              <p><strong>Tutor</strong> {nt.msg}</p>
              {#if nt.fix}
                {#if fixes.includes(e.id)}<button type="button" class="tfix" onclick={() => use(nt.fix!)} title="Copiar al prompt">{nt.fix}</button>
                {:else}<button type="button" class="tmore" onclick={() => (fixes = [...fixes, e.id])}>Ver la corrección</button>{/if}
              {/if}
            </div>
          {/each}
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

  <section class="panel canvas">
    <h2>Clúster en vivo</h2>
    <ClusterCanvas {nodes} {pods} compact showLabels={true} />
    <p class="hint">Fichas: pods de default (etiqueta = versión de imagen) y de otros namespaces (etiqueta = namespace). {hiddenCount} pods de kube-system y local-path-storage no se dibujan.</p>
  </section>
  <section class="panel misiones">
    <div class="mhead">
      <h2>
        <button type="button" class="fold" aria-expanded={missionsOpen} aria-controls="mision-lista" onclick={() => (missionsOpen = !missionsOpen)}>
          Misiones <span class="count mono">{done.length}/{MISSIONS.length}</span><span class="caret" aria-hidden="true">{missionsOpen ? '▾' : '▸'}</span>
        </button>
      </h2>
    </div>
    {#if !missionsOpen && nextMission}<p class="next">Siguiente: {nextMission.title}</p>{/if}
    <div id="mision-lista" hidden={!missionsOpen}>
      {#each GROUPS as g (g.id)}
        {@const ms = MISSIONS.filter((m) => m.group === g.id)}
        <h3 class="grupo">{g.title} <span class="count mono">{ms.filter((m) => done.includes(m.id)).length}/{ms.length}</span> <a href={moduleUrl(g.module)}>módulo {pad(g.module)}</a></h3>
        <ol class="missions">
          {#each ms as m, i (m.id)}
            {@const ok = done.includes(m.id)}
            {@const lv = help[m.id] ?? 0}
            <li class:ok>
              <span class="check" aria-hidden="true">{ok ? '✓' : i + 1}</span>
              <div>
                <span class="mtitle">{m.title}</span><span class="visually-hidden">{ok ? ' (completada)' : ''}</span>
                {#if !ok}
                  {#if lv >= 1}<p class="idea">{m.idea}</p>{/if}
                  {#if lv === 2}{#each m.hint.split(', luego ') as h}<code class="skel mono">{esqueleto(h)}</code>{/each}{/if}
                  {#if lv >= 3}{#each m.hint.split(', luego ') as h}<button type="button" class="use mono" onclick={() => use(h)} title="Copiar al prompt">{h}</button>{/each}{/if}
                  {#if lv < 3}<button type="button" class="pista" onclick={() => (help[m.id] = lv + 1)}>{lv === 0 ? 'Pista' : lv === 1 ? 'Otra pista: la forma del comando' : 'Ver la solución'}</button>{/if}
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      {/each}
    </div>
    {#if done.length === MISSIONS.length}<p class="explain ok">Misiones completadas. Ahora repite la secuencia en tu clúster real con <span class="mono">.\kcna.ps1 up</span>.</p>
    {:else if missionsOpen}<p class="hint">Intenta cada misión antes de pedir pista: recordar el comando por ti mismo es lo que lo fija. Si un comando falla, el tutor te explica por qué debajo de la salida. Las misiones superadas se guardan en tu progreso.</p>{/if}
  </section>
</div>

<style>
  .term-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; grid-template-rows: auto 1fr; grid-template-areas: 'console canvas' 'console misiones'; gap: 16px 20px; align-items: start; }
  .console { min-width: 0; grid-area: console; }
  .canvas { grid-area: canvas; }
  .misiones { grid-area: misiones; }
  .fold { all: unset; cursor: pointer; display: inline-flex; align-items: baseline; gap: 8px; border-radius: 4px; }
  .fold:focus-visible { outline: 2px solid var(--helm); outline-offset: 2px; }
  .caret { font-size: 0.8rem; color: var(--ink-3); }
  .next { font-size: 0.9rem; color: var(--ink-2); }
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
  .panel { min-width: 0; overflow-wrap: anywhere; background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-l); box-shadow: var(--shadow); padding: 16px; }
  .missions li > * { min-width: 0; }
  .panel h2 { font-size: 1.02rem; margin-bottom: 10px; display: flex; align-items: baseline; gap: 8px; }
  .panel .hint { font-size: 0.8rem; margin-top: 8px; }
  .mhead { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .count { font-size: 0.8rem; color: var(--ink-3); font-weight: 400; }
  .missions { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  #mision-lista[hidden] { display: none; }
  .grupo { font-size: 0.86rem; font-weight: 600; margin: 14px 0 8px; display: flex; align-items: baseline; gap: 8px; }
  .grupo:first-child { margin-top: 0; }
  .grupo a { margin-left: auto; font-weight: 400; font-size: 0.78rem; color: var(--ink-3); }
  .idea { font-size: 0.82rem; color: var(--ink-2); margin-top: 4px; }
  .skel { display: block; margin-top: 4px; font-size: 0.74rem; color: var(--ink-2); background: var(--panel-2); border-radius: 4px; padding: 2px 6px; }
  .pista { all: unset; cursor: pointer; display: inline-block; margin-top: 4px; font-size: 0.78rem; color: var(--helm-ink); text-decoration: underline; text-underline-offset: 2px; border-radius: 4px; }
  .pista:focus-visible, .tmore:focus-visible, .tfix:focus-visible { outline: 2px solid var(--helm); outline-offset: 2px; }
  .tutor { margin: 2px 0 10px; padding: 8px 10px; border-left: 3px solid #ffb4a8; background: #16223a; border-radius: 0 6px 6px 0; font-family: var(--sans, 'IBM Plex Sans', sans-serif); font-size: 0.84rem; line-height: 1.5; white-space: normal; max-width: 78ch; }
  .tutor.aviso { border-left-color: #f3c47e; }
  .tutor p { margin: 0; color: #dfe7f3; }
  .tutor strong { color: #8fe0ae; font-weight: 600; margin-right: 6px; }
  .tmore, .tfix { all: unset; cursor: pointer; display: inline-block; margin-top: 6px; border-radius: 4px; }
  .tmore { font-size: 0.8rem; color: #9ec1ff; text-decoration: underline; text-underline-offset: 2px; }
  .tfix { font-family: var(--mono); font-size: 0.8rem; color: #0e1626; background: #8fe0ae; padding: 2px 8px; overflow-wrap: anywhere; }
  .missions li { display: flex; gap: 10px; align-items: flex-start; font-size: 0.9rem; line-height: 1.4; }
  .missions li.ok .mtitle { color: var(--ink-3); text-decoration: line-through; text-decoration-thickness: 1px; }
  .check { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line); display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--ink-2); background: var(--panel-2); }
  .missions li.ok .check { background: var(--ready-2); border-color: var(--ready); color: var(--ready); font-weight: 600; }
  .use { display: block; margin-top: 4px; font-size: 0.74rem; color: var(--helm-ink); background: var(--helm-2); border: 0; border-radius: 4px; padding: 2px 6px; cursor: pointer; text-align: left; }
  .explain { margin-top: 12px; padding: 10px 12px; border-radius: var(--r-m); background: var(--panel-2); border-left: 3px solid var(--ready); font-size: 0.9rem; }
  @media (max-width: 900px) {
    .term-layout { grid-template-columns: minmax(0, 1fr); grid-template-rows: none; grid-template-areas: 'misiones' 'console' 'canvas'; }
    .screen { height: min(60svh, 520px); min-height: 280px; }
  }
  /* 16 px en el campo: en iOS, un input más pequeño hace zoom al enfocarlo */
  @media (pointer: coarse) { .inrow input { font-size: 16px; } .fold { min-height: 44px; } .pista, .tmore, .tfix { min-height: 32px; padding-top: 6px; } }
  @media (max-width: 420px) {
    .out, .inrow { font-size: 0.76rem; padding-left: 10px; padding-right: 10px; }
    .panel { padding: 12px; }
  }
</style>
