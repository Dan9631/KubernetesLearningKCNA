<script lang="ts">
  // Lienzo de clúster compartido por todas las simulaciones.
  // Dibuja nodos como columnas y pods como fichas que entran, salen y se mueven con animación.
  import { flip } from 'svelte/animate';
  import { scale, fade } from 'svelte/transition';
  import { ms } from '../lib/motion';
  import type { Snippet } from 'svelte';

  export interface NodeSpec {
    name: string;
    role?: 'control-plane' | 'worker';
    labels?: Record<string, string>;
    taints?: string[];         // "key=value:NoSchedule"
    /** capacidad asignable en milicores y MiB (para la barra de uso) */
    cpu?: number;
    mem?: number;
    /** NotReady, cordoned... se muestra como aviso */
    status?: 'Ready' | 'NotReady' | 'SchedulingDisabled';
    highlight?: boolean;
  }
  export type PodStatus = 'Pending' | 'ContainerCreating' | 'Running' | 'Terminating' | 'Failed' | 'CrashLoopBackOff' | 'Succeeded' | 'Evicted' | 'OOMKilled' | 'ImagePullBackOff';
  export interface PodSpec {
    id: string;
    name: string;
    /** nombre del nodo; sin nodo = Pending (se dibuja en la bandeja) */
    node?: string;
    status: PodStatus;
    /** etiqueta corta a la derecha: versión, QoS, zona... */
    tag?: string;
    /** color de la ficha: v1 / v2 / canary... (clave de --pod-<color>) */
    color?: 'a' | 'b' | 'c' | 'd';
    cpu?: number;
    mem?: number;
    highlight?: boolean;
    /** contador de reinicios */
    restarts?: number;
  }

  interface Props {
    nodes: NodeSpec[];
    pods: PodSpec[];
    /** mostrar bandeja de pods Pending */
    pendingTray?: boolean;
    pendingTitle?: string;
    showLabels?: boolean;
    showUsage?: boolean;
    compact?: boolean;
    onpodclick?: (pod: PodSpec) => void;
    onnodeclick?: (node: NodeSpec) => void;
    /** contenido extra bajo cada nodo (p. ej. DaemonSet, kube-proxy) */
    nodeFooter?: Snippet<[NodeSpec]>;
  }
  let { nodes, pods, pendingTray = true, pendingTitle = 'Sin nodo (Pending)', showLabels = true, showUsage = false, compact = false, onpodclick, onnodeclick, nodeFooter }: Props = $props();

  const podsOf = (n: string) => pods.filter((p) => p.node === n);
  const pending = $derived(pods.filter((p) => !p.node));
  const used = (n: NodeSpec, k: 'cpu' | 'mem') => podsOf(n.name).reduce((a, p) => a + (p[k] ?? 0), 0);
  const pct = (n: NodeSpec, k: 'cpu' | 'mem') => (n[k] ? Math.min(100, Math.round((100 * used(n, k)) / n[k]!)) : 0);
  const dur = () => ms(360);
</script>

<div class="cluster" class:compact>
  {#each nodes as node (node.name)}
    <section class="node" class:cp={node.role === 'control-plane'} class:hl={node.highlight} class:notready={node.status && node.status !== 'Ready'} aria-label={`Nodo ${node.name}`}>
      <header>
        <button type="button" class="nodename mono" onclick={() => onnodeclick?.(node)} disabled={!onnodeclick}>{node.name}</button>
        {#if node.role === 'control-plane'}<span class="role">control plane</span>{/if}
        {#if node.status && node.status !== 'Ready'}<span class="status">{node.status}</span>{/if}
      </header>
      {#if showLabels && (node.labels || node.taints?.length)}
        <div class="meta">
          {#each Object.entries(node.labels ?? {}) as [k, v]}<span class="label mono">{k}={v}</span>{/each}
          {#each node.taints ?? [] as t}<span class="taint mono" title="taint">⊘ {t}</span>{/each}
        </div>
      {/if}
      <div class="pods">
        {#each podsOf(node.name) as pod (pod.id)}
          <button type="button" class="pod {pod.status} color-{pod.color ?? 'a'}" class:hl={pod.highlight}
            animate:flip={{ duration: dur() }} in:scale={{ duration: dur(), start: 0.6 }} out:scale={{ duration: ms(260), start: 0.6 }}
            onclick={() => onpodclick?.(pod)} disabled={!onpodclick} title={`${pod.name} · ${pod.status}`}>
            <span class="dot" aria-hidden="true"></span>
            <span class="pname mono">{pod.name}</span>
            {#if pod.tag}<span class="tag">{pod.tag}</span>{/if}
            {#if pod.restarts}<span class="restarts" title="reinicios">↻{pod.restarts}</span>{/if}
            <span class="visually-hidden">{pod.status}</span>
          </button>
        {:else}
          <span class="empty">sin pods</span>
        {/each}
      </div>
      {#if showUsage && (node.cpu || node.mem)}
        <div class="usage">
          {#if node.cpu}<div class="bar" title={`CPU requests ${used(node, 'cpu')}m / ${node.cpu}m`}><span style={`width:${pct(node, 'cpu')}%`}></span><em>cpu {used(node, 'cpu')}m/{node.cpu}m</em></div>{/if}
          {#if node.mem}<div class="bar" title={`memoria requests ${used(node, 'mem')}Mi / ${node.mem}Mi`}><span style={`width:${pct(node, 'mem')}%`}></span><em>mem {used(node, 'mem')}Mi/{node.mem}Mi</em></div>{/if}
        </div>
      {/if}
      {#if nodeFooter}<div class="nfoot">{@render nodeFooter(node)}</div>{/if}
    </section>
  {/each}
  {#if pendingTray && pending.length}
    <section class="node tray" transition:fade={{ duration: ms(200) }} aria-label={pendingTitle}>
      <header><span class="nodename">{pendingTitle}</span></header>
      <div class="pods">
        {#each pending as pod (pod.id)}
          <button type="button" class="pod {pod.status} color-{pod.color ?? 'a'}" class:hl={pod.highlight} animate:flip={{ duration: dur() }} in:scale={{ duration: dur(), start: 0.6 }} out:scale={{ duration: ms(260), start: 0.6 }} onclick={() => onpodclick?.(pod)} disabled={!onpodclick} title={`${pod.name} · ${pod.status}`}>
            <span class="dot" aria-hidden="true"></span><span class="pname mono">{pod.name}</span>{#if pod.tag}<span class="tag">{pod.tag}</span>{/if}
          </button>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .cluster { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
  .node { background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--r-m); padding: 10px 10px 12px; min-height: 120px; display: flex; flex-direction: column; gap: 8px; transition: border-color var(--dur), box-shadow var(--dur); }
  .node.cp { border-style: dashed; }
  .node.hl { border-color: var(--helm); box-shadow: 0 0 0 3px var(--helm-2); }
  .node.notready { border-color: var(--fail); background: var(--fail-2); }
  .node.tray { border-style: dashed; background: var(--wait-2); border-color: var(--wait); }
  .compact .node { min-height: 80px; padding: 8px; }
  header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nodename { font-size: 0.86rem; font-weight: 500; color: var(--ink); background: none; border: 0; padding: 0; cursor: default; font-family: inherit; }
  .nodename:not(:disabled) { cursor: pointer; text-decoration: underline dotted; }
  .role, .status { font-size: 0.72rem; color: var(--ink-3); }
  .status { color: var(--fail); font-weight: 600; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px; }
  .label, .taint { font-size: 0.7rem; padding: 1px 6px; border-radius: 4px; background: var(--panel); border: 1px solid var(--line-2); color: var(--ink-2); }
  .taint { border-color: var(--fail); color: var(--fail); }
  .pods { display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; flex: 1; }
  .empty { font-size: 0.78rem; color: var(--ink-3); font-style: italic; }
  .pod { --c: var(--helm); display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px 4px 7px; max-width: 100%; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: inherit; font-size: 0.8rem; line-height: 1.3; cursor: default; transition: border-color var(--dur), background var(--dur), transform var(--dur), opacity var(--dur); }
  .pod:not(:disabled) { cursor: pointer; }
  .pod:not(:disabled):hover { border-color: var(--c); }
  .pod.hl { border-color: var(--c); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 25%, transparent); }
  .pod.color-b { --c: #8250df; }
  .pod.color-c { --c: var(--wait); }
  .pod.color-d { --c: #0f9d9d; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--ready); flex: none; }
  .pod.Pending .dot, .pod.ContainerCreating .dot { background: var(--wait); animation: pulse 1.1s ease-in-out infinite; }
  .pod.Terminating { opacity: 0.45; }
  .pod.Terminating .dot { background: var(--ink-3); }
  .pod.Failed .dot, .pod.CrashLoopBackOff .dot, .pod.OOMKilled .dot, .pod.Evicted .dot, .pod.ImagePullBackOff .dot { background: var(--fail); }
  .pod.CrashLoopBackOff .dot { animation: blink 0.9s steps(2, start) infinite; }
  .pod.Succeeded .dot { background: var(--ink-3); }
  .pod.Failed, .pod.CrashLoopBackOff, .pod.OOMKilled, .pod.ImagePullBackOff { border-color: var(--fail); }
  .pname { font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .tag, .restarts { flex: none; }
  .tag { font-size: 0.68rem; padding: 0 5px; border-radius: 4px; background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); font-weight: 600; }
  .restarts { font-size: 0.68rem; color: var(--fail); }
  .usage { display: grid; gap: 4px; }
  .bar { position: relative; display: flex; align-items: center; height: 18px; background: var(--panel); border: 1px solid var(--line-2); border-radius: 4px; overflow: hidden; }
  .bar span { position: absolute; inset: 0 auto 0 0; background: var(--helm-2); transition: width var(--dur-slow) var(--ease); }
  .bar em { position: relative; font: 500 0.68rem var(--mono); font-style: normal; color: var(--ink-2); padding-left: 6px; line-height: 1; white-space: nowrap; }
  .nfoot { border-top: 1px dashed var(--line); padding-top: 6px; font-size: 0.76rem; color: var(--ink-2); }
  @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.6; } }
  @keyframes blink { to { visibility: hidden; } }
</style>
