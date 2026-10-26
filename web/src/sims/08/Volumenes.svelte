<script lang="ts">
  // Tipos de volumen: un pod con dos contenedores comparte un volumen; cambia el tipo y mira qué sobrevive al pod y al nodo.
  import { wait } from '../../lib/motion';

  type V = 'emptyDir' | 'hostPath' | 'configMap' | 'secret' | 'pvc';
  type Am = 'RWO' | 'ROX' | 'RWX' | 'RWOP';
  const NODES = ['kcna-worker', 'kcna-worker2'] as const;
  const TYPES: { id: V; label: string }[] = [
    { id: 'emptyDir', label: 'emptyDir' }, { id: 'hostPath', label: 'hostPath' }, { id: 'configMap', label: 'configMap' }, { id: 'secret', label: 'secret' }, { id: 'pvc', label: 'persistentVolumeClaim' },
  ];
  const CM = ['modo=laboratorio', 'color=azul'];
  const SECRET = ['password=c2VjcmV0bw== (base64)'];

  let vol = $state<V>('emptyDir');
  let node = $state<string>('kcna-worker');
  let gen = $state(1);
  let alive = $state(true);
  let podData = $state<string[]>([]);
  let nodeData = $state<Record<string, string[]>>({ 'kcna-worker': [], 'kcna-worker2': [] });
  let pvData = $state<string[]>([]);
  let busy = $state(false);
  let msg = $state('Pulsa "escritor escribe" y luego borra o mueve el pod para ver qué datos sobreviven.');
  let tone = $state<'' | 'ok' | 'warn' | 'fail'>('');
  let am = $state<Am>('RWO');
  let n = 0;

  const readOnly = $derived(vol === 'configMap' || vol === 'secret');
  const content = $derived(vol === 'emptyDir' ? podData : vol === 'hostPath' ? (nodeData[node] ?? []) : vol === 'configMap' ? CM : vol === 'secret' ? SECRET : pvData);
  const where = $derived(
    vol === 'emptyDir' ? { title: 'carpeta temporal del pod en el nodo', sub: `/var/lib/kubelet/pods/<uid>/volumes/kubernetes.io~empty-dir/compartida (${node})` }
    : vol === 'hostPath' ? { title: `carpeta del nodo ${node}`, sub: '/tmp/datos (el pod ve el disco del nodo tal cual)' }
    : vol === 'configMap' ? { title: 'objeto ConfigMap en el API server (etcd)', sub: 'kubelet lo proyecta como archivos de solo lectura y los refresca solo' }
    : vol === 'secret' ? { title: 'objeto Secret en el API server (etcd)', sub: 'base64 en el API, texto plano dentro del pod; montado en tmpfs (RAM), solo lectura' }
    : { title: 'PV enlazado al PVC datos', sub: 'almacenamiento independiente del pod: disco de red, o carpeta del nodo con local-path' },
  );
  const yaml = $derived(
    vol === 'emptyDir' ? 'volumes:\n  - name: compartida\n    emptyDir: {}        # sizeLimit, medium: Memory'
    : vol === 'hostPath' ? 'volumes:\n  - name: compartida\n    hostPath:\n      path: /tmp/datos\n      type: DirectoryOrCreate'
    : vol === 'configMap' ? 'volumes:\n  - name: compartida\n    configMap:\n      name: app-config   # cada clave, un archivo'
    : vol === 'secret' ? 'volumes:\n  - name: compartida\n    secret:\n      secretName: app-secret'
    : 'volumes:\n  - name: compartida\n    persistentVolumeClaim:\n      claimName: datos    # el pod nunca nombra al PV',
  );
  const notes: Record<V, string> = {
    emptyDir: 'Se crea vacío cuando el pod se asigna a un nodo y se borra al eliminar el pod. Sobrevive a reinicios de contenedor, no al pod. Ideal para caché y para compartir archivos entre contenedores del mismo pod (sidecars).',
    hostPath: 'Monta una carpeta real del nodo. Los datos sobreviven al pod, pero quedan atados a ese nodo, y el pod puede leer o escribir el sistema de archivos del nodo: riesgo de escalada; el perfil baseline de Pod Security Standards lo prohíbe. Solo para agentes del sistema.',
    configMap: 'Inyecta configuración como archivos: cada clave del ConfigMap es un archivo. Se monta de solo lectura y kubelet actualiza el contenido solo cuando cambia el objeto (salvo con subPath). No sirve para guardar datos de la app.',
    secret: 'Igual que configMap pero para credenciales: en el API va en base64 (no cifrado por defecto), dentro del pod aparece en claro, en un tmpfs en memoria y solo lectura. projected combina configMap + secret + downwardAPI + token en un directorio.',
    pvc: 'El pod referencia un PVC y el PVC está enlazado a un PV. Los datos son independientes del pod: sobreviven a borrados y, con un disco de red, a cambios de nodo. En este clúster local-path crea el PV como carpeta del nodo con nodeAffinity, así que el pod no puede moverse de nodo.',
  };

  const lineas = (k: number) => `${k} línea${k === 1 ? '' : 's'}`;
  function stamp() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; }
  function setVol(v: V) { if (busy) return; vol = v; tone = ''; msg = notes[v]; }

  function escribir() {
    if (!alive || busy) return;
    if (readOnly) { tone = 'fail'; msg = `sh: can't create /cache/log.txt: Read-only file system. Los volúmenes ${vol} se montan de solo lectura: son para inyectar configuración, no para que la app escriba.`; return; }
    n += 1;
    const line = `${stamp()} escrito por compartido (pod ${gen})`;
    if (vol === 'emptyDir') podData = [...podData, line];
    else if (vol === 'hostPath') nodeData = { ...nodeData, [node]: [...(nodeData[node] ?? []), line] };
    else pvData = [...pvData, line];
    tone = 'ok';
    msg = `escritor escribió en /cache/log.txt y lector lee la misma línea en /compartida/log.txt: lo que importa es el nombre del volumen (compartida), no la ruta de montaje. El archivo vive en ${where.title}.`;
  }

  async function borrar() {
    if (busy || !alive) return; busy = true;
    alive = false; tone = 'warn'; msg = 'kubectl delete pod compartido… el pod y su capa escribible desaparecen.';
    await wait(600);
    const lost = vol === 'emptyDir' ? podData.length : 0;
    podData = []; gen += 1; alive = true;
    if (vol === 'emptyDir') { tone = lost ? 'fail' : 'warn'; msg = `Pod recreado en ${node}. El emptyDir nació vacío: se ${lost === 1 ? 'perdió' : 'perdieron'} ${lineas(lost)}. Un emptyDir vive exactamente lo que vive el pod.`; }
    else if (vol === 'hostPath') { tone = 'ok'; msg = `Pod recreado en ${node}: la carpeta /tmp/datos del nodo sigue ahí con ${lineas(nodeData[node]?.length ?? 0)}. Sobrevive porque pertenece al nodo, no al pod.`; }
    else if (vol === 'pvc') { tone = 'ok'; msg = `Pod recreado: el PVC sigue Bound y el pod nuevo encuentra ${lineas(pvData.length)}. Los datos no dependen del pod.`; }
    else { tone = 'ok'; msg = `Pod recreado: el ${vol} se proyecta de nuevo desde el API server, idéntico. La configuración vive en el objeto, no en el pod.`; }
    busy = false;
  }

  async function mover() {
    if (busy || !alive) return; busy = true;
    const from = node; const to = NODES.find((x) => x !== node) ?? node;
    if (vol === 'pvc') {
      alive = false; tone = 'warn'; msg = `kubectl delete pod y recrear con nodeName: ${to}…`;
      await wait(600);
      alive = true; gen += 1; podData = [];
      tone = 'warn';
      msg = `Con un disco de red (RWO) el volumen se desmonta de ${from} y se monta en ${to}, y ${pvData.length === 1 ? 'el registro sigue' : `los ${pvData.length} registros siguen`} ahí. En nuestro clúster local-path el PV lleva nodeAffinity a ${from}: el pod se quedaría Pending ("node(s) had volume node affinity conflict"). La escena muestra el caso de disco de red.`;
      node = to; busy = false; return;
    }
    alive = false; tone = 'warn'; msg = `Moviendo el pod a ${to}…`;
    await wait(600);
    const lost = vol === 'emptyDir' ? podData.length : 0;
    podData = []; gen += 1; node = to; alive = true;
    if (vol === 'emptyDir') { tone = lost ? 'fail' : 'warn'; msg = `Pod nuevo en ${to} con un emptyDir vacío: ${lineas(lost)} perdida${lost === 1 ? '' : 's'}. Un pod no se "mueve": se borra y se crea otro.`; }
    else if (vol === 'hostPath') { const left = nodeData[from]?.length ?? 0; tone = left ? 'fail' : 'warn'; msg = `El pod ahora está en ${to} y ve /tmp/datos de ${to}: ${lineas(nodeData[to]?.length ?? 0)}. ${left === 1 ? 'La línea' : `Las ${left} líneas`} de ${from} ${left === 1 ? 'sigue' : 'siguen'} en ese nodo, inaccesible${left === 1 ? '' : 's'}: hostPath ata los datos a un nodo.`; }
    else { tone = 'ok'; msg = `Pod nuevo en ${to}: el ${vol} viene del API server, así que se ve igual en cualquier nodo.`; }
    busy = false;
  }

  function reset() { if (busy) return; podData = []; nodeData = { 'kcna-worker': [], 'kcna-worker2': [] }; pvData = []; gen = 1; node = 'kcna-worker'; alive = true; tone = ''; msg = notes[vol]; }

  const AM: Record<Am, { name: string; desc: string; a: string; b: string; c: string; ex: string }> = {
    RWO: { name: 'ReadWriteOnce', desc: 'lectura y escritura desde un único nodo', a: 'rw', b: 'rw', c: 'no', ex: 'Disco de bloque de la nube (EBS, PD, Azure Disk), local-path. Dos pods del mismo nodo pueden compartirlo; un pod en otro nodo se queda Pending.' },
    ROX: { name: 'ReadOnlyMany', desc: 'solo lectura desde muchos nodos', a: 'ro', b: 'ro', c: 'ro', ex: 'Datos de referencia preparados una vez (modelos, catálogos) servidos a muchos pods.' },
    RWX: { name: 'ReadWriteMany', desc: 'lectura y escritura desde muchos nodos', a: 'rw', b: 'rw', c: 'rw', ex: 'Sistemas de archivos compartidos: NFS, CephFS, Azure Files, EFS. Un disco de bloque no lo soporta: pedirlo deja el PVC en Pending.' },
    RWOP: { name: 'ReadWriteOncePod', desc: 'lectura y escritura por un único pod en todo el clúster', a: 'rw', b: 'no', c: 'no', ex: 'Solo drivers CSI (GA en v1.29). Garantiza que ni siquiera otro pod del mismo nodo monte el volumen: para bases de datos que no toleran dos escritores.' },
  };
</script>

<div class="vols">
  <div class="controls" role="group" aria-label="Tipo de volumen">
    <span class="hint">volumen</span>
    {#each TYPES as t (t.id)}
      <button type="button" class="btn small mono" class:primary={vol === t.id} aria-pressed={vol === t.id} onclick={() => setVol(t.id)} disabled={busy}>{t.label}</button>
    {/each}
  </div>

  <div class="scene">
    <div class="nodo">
      <span class="nname mono">{node}</span>
      {#if alive}
        <div class="pod">
          <span class="pname mono">pod compartido <small>({gen}.ª vez)</small></span>
          <div class="cts">
            <div class="ct"><strong class="mono">escritor</strong><span class="mono">/cache</span></div>
            <div class="ct"><strong class="mono">lector</strong><span class="mono">/compartida</span></div>
          </div>
          <div class="vol" class:ro={readOnly}><span class="mono">volume: compartida ({vol}){readOnly ? ' · solo lectura' : ''}</span></div>
        </div>
      {:else}
        <div class="pod gone"><span class="pname">pod eliminado…</span></div>
      {/if}
      {#if vol === 'hostPath'}
        <div class="disk"><span class="mono">/tmp/datos en {node}</span>
          {#each NODES as nd (nd)}<span class="mono small">{nd}: {nodeData[nd]?.length ?? 0} línea{(nodeData[nd]?.length ?? 0) === 1 ? '' : 's'}</span>{/each}
        </div>
      {/if}
    </div>
    <div class="store" class:gone={!alive && vol === 'emptyDir'}>
      <span class="k">Dónde viven los datos</span>
      <strong>{where.title}</strong>
      <span class="sub mono">{where.sub}</span>
      <div class="file">
        <span class="mono small">log.txt</span>
        {#if content.length}
          <ul class="mono">{#each content as l, i (i)}<li>{l}</li>{/each}</ul>
        {:else}
          <span class="sub">(vacío)</span>
        {/if}
      </div>
    </div>
  </div>

  <div class="controls acciones">
    <button type="button" class="btn small primary" onclick={escribir} disabled={busy || !alive}>escritor escribe</button>
    <button type="button" class="btn small" onclick={borrar} disabled={busy || !alive}>Borrar el pod</button>
    <button type="button" class="btn small" onclick={mover} disabled={busy || !alive}>Mover el pod a otro nodo</button>
    <button type="button" class="btn small" onclick={reset} disabled={busy}>Reiniciar</button>
  </div>

  <div class="explain" class:ok={tone === 'ok'} class:warn={tone === 'warn'} class:fail={tone === 'fail'} aria-live="polite">{msg}</div>

  <div class="dos">
    <pre>{yaml}</pre>
    <div class="am">
      <div class="controls" role="group" aria-label="Access mode">
        {#each Object.keys(AM) as k (k)}
          <button type="button" class="btn small mono" class:primary={am === k} aria-pressed={am === k} onclick={() => (am = k as Am)}>{k}</button>
        {/each}
      </div>
      <p class="amdesc"><strong class="mono">{AM[am].name}</strong>: {AM[am].desc}.</p>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>pod A <small>kcna-worker</small></th><th>pod B <small>kcna-worker</small></th><th>pod C <small>kcna-worker2</small></th></tr></thead>
          <tbody><tr>
            {#each [AM[am].a, AM[am].b, AM[am].c] as r, i (i)}
              <td class={r}>{r === 'rw' ? 'monta lectura/escritura' : r === 'ro' ? 'monta solo lectura' : 'no puede montar (Pending)'}</td>
            {/each}
          </tr></tbody>
        </table>
      </div>
      <p class="hint">{AM[am].ex}</p>
    </div>
  </div>
</div>

<style>
  .vols { display: grid; gap: 12px; }
  .scene { display: grid; grid-template-columns: 1.1fr 1fr; gap: 12px; }
  .nodo { border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); padding: 10px; display: grid; gap: 8px; align-content: start; }
  .nname { font-size: 0.82rem; font-weight: 500; }
  .pod { border: 1px solid var(--helm); border-radius: var(--r-m); background: var(--panel); padding: 8px; display: grid; gap: 6px; transition: opacity var(--dur); }
  .pod.gone { opacity: 0.4; border-style: dashed; min-height: 100px; }
  .pname { font-size: 0.8rem; font-weight: 500; }
  .pname small { color: var(--ink-3); font-weight: 400; }
  .cts { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .ct { border: 1px solid var(--line); border-radius: var(--r-s); padding: 6px 8px; display: grid; font-size: 0.76rem; }
  .ct span { color: var(--ink-3); }
  .vol { border: 1px dashed var(--helm); border-radius: var(--r-s); padding: 5px 8px; font-size: 0.74rem; color: var(--helm-ink); background: var(--helm-2); text-align: center; }
  .vol.ro { border-color: var(--wait); color: #8a5208; background: var(--wait-2); }
  :root[data-theme='dark'] .vol.ro { color: #f3c47e; }
  .disk { border: 1px solid var(--line-2); border-radius: var(--r-s); padding: 5px 8px; font-size: 0.74rem; color: var(--ink-2); display: grid; gap: 2px; }
  .small { font-size: 0.7rem; color: var(--ink-3); }
  .store { border: 1px solid var(--line); border-radius: var(--r-m); padding: 10px 12px; display: grid; gap: 4px; align-content: start; font-size: 0.85rem; min-width: 0; transition: opacity var(--dur); }
  .store.gone { opacity: 0.4; }
  .store .k { font-size: 0.78rem; color: var(--ink-2); font-weight: 500; }
  .store strong { font-size: 0.88rem; }
  .store .sub { font-size: 0.74rem; color: var(--ink-3); word-break: break-word; }
  .file { margin-top: 4px; padding-top: 6px; border-top: 1px dashed var(--line); display: grid; gap: 2px; }
  .file ul { margin: 0; padding-left: 1.1em; font-size: 0.74rem; color: var(--ink-2); }
  .acciones { margin-bottom: 0; }
  .explain { margin-top: 0; }
  .dos { display: grid; grid-template-columns: 1fr 1.3fr; gap: 12px; }
  .am { display: grid; gap: 8px; min-width: 0; align-content: start; }
  .am .controls { margin-bottom: 0; }
  .amdesc { font-size: 0.9rem; }
  .tabla-wrap { overflow-x: auto; }
  .tabla { border-collapse: collapse; width: 100%; font-size: 0.82rem; }
  .tabla th, .tabla td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line-2); }
  .tabla th { color: var(--ink-2); font-weight: 500; }
  .tabla th small { display: block; font-family: var(--mono); font-weight: 400; color: var(--ink-3); }
  .tabla td.rw { color: var(--ready); font-weight: 600; }
  .tabla td.ro { color: var(--wait); font-weight: 600; }
  .tabla td.no { color: var(--fail); }
  @media (max-width: 700px) { .scene, .dos { grid-template-columns: 1fr; } }
</style>
