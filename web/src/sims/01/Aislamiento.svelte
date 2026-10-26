<script lang="ts">
  // Contenedor vs máquina virtual: qué virtualiza cada uno, qué aísla cada namespace y qué limita un cgroup.
  import { fade } from 'svelte/transition';
  import { ms } from '../../lib/motion';

  interface Ns { id: string; isola: string; efecto: string; cmd: string; ve: string }
  const NS: Ns[] = [
    { id: 'pid', isola: 'Árbol de procesos', efecto: 'Dentro del contenedor nginx es el PID 1 y no se ven los procesos del host ni de otros contenedores. Si el PID 1 muere, el contenedor termina.', cmd: 'podman exec web1 ps', ve: 'PID 1: nginx master · PID 25: worker' },
    { id: 'net', isola: 'Interfaces, IPs, puertos y rutas', efecto: 'Cada contenedor tiene su propia pila de red: su IP y su tabla de puertos. Dos nginx pueden escuchar los dos en el 80 sin chocar; -p 8081:80 conecta el puerto del host con el del namespace.', cmd: 'podman port web1', ve: '80/tcp -> 0.0.0.0:8081' },
    { id: 'mnt', isola: 'Puntos de montaje y sistema de archivos', efecto: 'El proceso ve como raíz el filesystem de la imagen (Alpine) montado con overlayfs, no el disco del host. Es la base de la portabilidad: la app lleva sus librerías.', cmd: 'podman exec web1 cat /etc/os-release', ve: 'NAME="Alpine Linux"' },
    { id: 'uts', isola: 'Hostname y nombre de dominio', efecto: 'El contenedor tiene su propio hostname (por defecto el ID del contenedor) aunque comparta kernel con el host.', cmd: 'podman exec web1 hostname', ve: 'c90a6331da02' },
    { id: 'ipc', isola: 'Memoria compartida y colas de mensajes', efecto: 'Los segmentos de memoria compartida y semáforos System V / POSIX de un contenedor no son visibles desde otro: sin interferencias entre procesos de contenedores distintos.', cmd: 'podman exec web1 ipcs', ve: 'Shared Memory Segments: (vacío)' },
    { id: 'user', isola: 'UIDs y GIDs', efecto: 'Mapea los usuarios: el proceso puede ser root (UID 0) dentro y un usuario sin privilegios fuera. Es lo que permite el modo rootless de Podman.', cmd: 'podman top web1 user huser', ve: 'USER root · HUSER 1000 (tu usuario)' },
  ];

  let sel = $state<string | null>(null);
  let apps = $state(2);
  let memLimit = $state(64);   // MiB
  let cpus = $state(0.5);
  let memUse = $state(40);     // MiB
  let note = $state('');

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const nsSel = $derived(NS.find((n) => n.id === sel) ?? null);
  const oom = $derived(memUse > memLimit);
  const throttled = $derived(cpus < 1);
  const memMax = $derived(memLimit * 1024 * 1024);
  const cpuMax = $derived(`${Math.round(cpus * 100000)} 100000`);
  const fmtGb = (n: number) => `${n} GB`;
  const dur = () => ms(220);

  const explain = $derived.by(() => {
    if (note) return note;
    if (nsSel) return `Namespace ${nsSel.id}: aísla ${nsSel.isola.toLowerCase()}. ${nsSel.efecto}`;
    return 'Una VM virtualiza hardware: el hipervisor simula CPU, disco y red y encima arranca un sistema operativo completo con su propio kernel. Un contenedor virtualiza el sistema operativo: comparte el kernel del host y solo aísla procesos. Pulsa un namespace o mueve los límites del cgroup.';
  });
  const tone = $derived(oom ? 'fail' : note.startsWith('cgroup') ? 'warn' : '');

  function pick(id: string) { sel = sel === id ? null : id; note = ''; }
  function more() {
    memUse = Math.min(512, memUse + 32);
    note = memUse > memLimit
      ? `cgroup de memoria: el proceso intenta usar ${memUse} MiB con memory.max = ${memLimit} MiB. El kernel no "avisa": mata el proceso con SIGKILL y el runtime lo registra como OOMKilled (exit 137). En Kubernetes el kubelet lo reinicia según restartPolicy y verás OOMKilled en kubectl describe.`
      : `cgroup de memoria: el proceso usa ${memUse} MiB de ${memLimit} MiB permitidos. Mientras no supere memory.max, el kernel no interviene.`;
  }
  function restart() { memUse = 40; note = 'El proceso vuelve a arrancar con 40 MiB. En Kubernetes esto es lo que hace el kubelet tras un OOMKilled (con espera creciente si se repite).'; }
  function onMem() {
    note = `cgroup de memoria: --memory ${memLimit}m se traduce en memory.max = ${memMax} bytes. Es exactamente lo que escribe el kubelet cuando pones resources.limits.memory: ${memLimit}Mi.` + (memUse > memLimit ? ' El proceso ya supera el límite: OOMKilled.' : '');
  }
  function onCpu() {
    note = `cgroup de CPU: --cpus ${cpus} se traduce en cpu.max = ${cpuMax}: ${Math.round(cpus * 100000) / 1000} ms de CPU por cada 100 ms. ` + (throttled ? 'Si el proceso quiere más, no muere: el kernel lo frena (throttling). La CPU se reparte; la memoria se corta.' : 'Con 1 CPU o más el proceso puede ocupar un núcleo entero sin frenos.');
  }
</script>

<div class="controls">
  <span class="hint">Aplicaciones en el host:</span>
  <button type="button" class="btn small" onclick={() => (apps = Math.max(1, apps - 1))} aria-label="Una aplicación menos" disabled={apps === 1}>−</button>
  <strong class="mono">{apps}</strong>
  <button type="button" class="btn small" onclick={() => (apps = Math.min(6, apps + 1))} aria-label="Una aplicación más" disabled={apps === 6}>+</button>
</div>

<div class="cols">
  <section class="col" aria-label="Máquinas virtuales">
    <h4>Máquinas virtuales</h4>
    <div class="stack">
      <div class="row">
        {#each Array(apps) as _, k (k)}
          <div class="vm" transition:fade={{ duration: dur() }}>
            <div class="box app">App {letters[k]}</div>
            <div class="box guest">SO invitado completo<br /><span class="mono">kernel propio</span></div>
          </div>
        {/each}
      </div>
      <div class="box wide hv">Hipervisor (KVM, Hyper-V, VMware)</div>
      <div class="box wide hw">Hardware</div>
    </div>
  </section>

  <section class="col" aria-label="Contenedores">
    <h4>Contenedores</h4>
    <div class="stack">
      <div class="row">
        {#each Array(apps) as _, k (k)}
          <div class="ct" transition:fade={{ duration: dur() }}>
            <div class="box app">App {letters[k]} + librerías</div>
            <div class="nsring" aria-label="namespaces">
              {#each NS as n (n.id)}<span class="mono" class:on={sel === n.id}>{n.id}</span>{/each}
            </div>
          </div>
        {/each}
      </div>
      <div class="box wide rt">Runtime (crun / runc): crea namespaces y cgroups</div>
      <div class="box wide kernel" class:on={sel !== null}>Kernel del host (compartido)<br /><span class="mono">namespaces · cgroups</span></div>
      <div class="box wide hw">Hardware</div>
    </div>
  </section>
</div>

<div class="nsbtns" role="group" aria-label="Ver qué aísla cada namespace">
  <span class="hint">Qué aísla cada namespace:</span>
  {#each NS as n (n.id)}
    <button type="button" class="btn small mono" class:primary={sel === n.id} onclick={() => pick(n.id)} aria-pressed={sel === n.id}>{n.id}</button>
  {/each}
</div>
{#if nsSel}
  <div class="nsinfo" transition:fade={{ duration: dur() }}>
    <pre>$ {nsSel.cmd}
{nsSel.ve}</pre>
  </div>
{/if}

<table class="cmp">
  <thead><tr><th>Aspecto</th><th>Máquina virtual</th><th>Contenedor</th></tr></thead>
  <tbody>
    <tr><td>Kernels en el host</td><td class="mono">{apps + 1}</td><td class="mono">1 (compartido)</td></tr>
    <tr><td>Tamaño en disco</td><td class="mono">{fmtGb(apps * 2)} <span class="hint">({apps} × ~2 GB)</span></td><td class="mono">~50 MB <span class="hint">(capas compartidas + {apps} × 4 kB)</span></td></tr>
    <tr><td>Arranque</td><td class="mono">~{apps} min <span class="hint">(SO completo cada una)</span></td><td class="mono">milisegundos</td></tr>
    <tr><td>Aislamiento</td><td>Muy fuerte: frontera del hipervisor</td><td>Bueno: frontera del kernel{#if sel} <span class="hint">({sel} aísla {nsSel?.isola.toLowerCase()})</span>{/if}</td></tr>
    <tr><td>Límite de recursos</td><td>Fijado al crear la VM</td><td>cgroups: <span class="mono">memory.max</span>, <span class="mono">cpu.max</span></td></tr>
  </tbody>
</table>

<section class="cg" aria-label="Límites de cgroup">
  <h4>cgroups: cuánto puede usar el proceso</h4>
  <div class="sliders">
    <label>memoria <span class="mono">{memLimit} MiB</span>
      <input type="range" min="16" max="256" step="16" bind:value={memLimit} oninput={onMem} />
    </label>
    <label>CPU <span class="mono">{cpus}</span>
      <input type="range" min="0.25" max="2" step="0.25" bind:value={cpus} oninput={onCpu} />
    </label>
  </div>
  <div class="meter" role="img" aria-label={`uso ${memUse} MiB de ${memLimit} MiB`}>
    <span class="fill" class:over={oom} style={`width:${Math.min(100, (100 * memUse) / memLimit)}%`}></span>
    <em class="mono">{memUse} MiB / {memLimit} MiB</em>
  </div>
  <div class="controls">
    <span class="proc mono" class:dead={oom}>{oom ? 'OOMKilled (exit 137)' : throttled ? 'Running (CPU limitada)' : 'Running'}</span>
    <button type="button" class="btn small" onclick={more} disabled={oom}>La app pide 32 MiB más</button>
    <button type="button" class="btn small" onclick={restart} disabled={!oom && memUse === 40}>Reiniciar proceso</button>
  </div>
  <pre>$ podman run --rm --memory {memLimit}m --cpus {cpus} busybox:1.37 sh -c 'cat /sys/fs/cgroup/memory.max; cat /sys/fs/cgroup/cpu.max'
{memMax}
{cpuMax}</pre>
</section>

<div class="explain {tone}" aria-live="polite">{explain}</div>

<style>
  h4 { font-size: 0.9rem; font-weight: 600; margin: 0 0 8px; }
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
  @media (max-width: 560px) { .cols { grid-template-columns: 1fr; } }
  .stack { display: flex; flex-direction: column; gap: 4px; }
  .row { display: flex; flex-wrap: wrap; gap: 4px; }
  .vm, .ct { flex: 1 1 110px; display: flex; flex-direction: column; gap: 3px; }
  .box { border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); padding: 6px 8px; font-size: 0.78rem; text-align: center; line-height: 1.3; transition: border-color var(--dur), background var(--dur); }
  .box.app { border-color: var(--helm); background: var(--helm-2); color: var(--helm-ink); font-weight: 500; }
  .box.guest { min-height: 44px; }
  .box.hv, .box.rt { background: var(--panel); }
  .box.hw { background: var(--node); color: var(--ink); }
  .box.kernel { background: var(--ready-2); border-color: var(--ready); }
  .box.kernel.on { box-shadow: 0 0 0 3px color-mix(in srgb, var(--ready) 25%, transparent); }
  .nsring { display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; }
  .nsring span { font-size: 0.62rem; padding: 0 5px; border-radius: 999px; border: 1px solid var(--line-2); color: var(--ink-3); transition: all var(--dur); }
  .nsring span.on { border-color: var(--ready); color: var(--ready); background: var(--ready-2); font-weight: 600; }
  .nsbtns { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 14px; }
  .nsinfo { margin-top: 8px; }
  .cmp { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 14px; display: block; overflow-x: auto; }
  .cmp th, .cmp td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line-2); vertical-align: top; }
  .cmp th { color: var(--ink-2); font-weight: 600; }
  .cmp .hint { font-size: 0.74rem; }
  .cg { margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--line); display: grid; gap: 10px; }
  .sliders { display: flex; flex-wrap: wrap; gap: 8px 24px; }
  .sliders label { display: grid; gap: 2px; flex: 1 1 140px; }
  .sliders input { width: 100%; }
  .meter { position: relative; height: 22px; border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); overflow: hidden; }
  .fill { position: absolute; inset: 0 auto 0 0; background: var(--helm-2); transition: width var(--dur-slow) var(--ease), background var(--dur); }
  .fill.over { background: var(--fail-2); }
  .meter em { position: relative; font-size: 0.74rem; font-style: normal; color: var(--ink-2); padding-left: 8px; line-height: 20px; }
  .proc { font-size: 0.85rem; color: var(--ready); font-weight: 600; }
  .proc.dead { color: var(--fail); }
  .cg .controls { margin-bottom: 0; }
</style>
