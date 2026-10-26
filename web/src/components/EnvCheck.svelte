<script lang="ts">
  // Checklist del entorno con los comandos a ejecutar y la salida que debes ver. Se guarda en este navegador.
  import { progress, toggleEnv } from '../lib/progress.svelte';

  const items = [
    { id: 'tools',   t: 'Herramientas instaladas', cmd: '.\\kcna.ps1 doctor', out: 'OK podman, kubectl, kind, helm, k9s y Headlamp con su ruta.' },
    { id: 'up',      t: 'Clúster encendido',       cmd: '.\\kcna.ps1 up',     out: 'Tres nodos Ready y "Pods con problemas: No resources found".' },
    { id: 'env',     t: 'Terminal apuntando al laboratorio', cmd: '. .\\kcna-env.ps1', out: 'El prompt cambia a [kcna:kind-kcna]. Si no lo ves, no ejecutes comandos de los labs.' },
    { id: 'nodes',   t: 'kubectl responde',        cmd: 'k get nodes',        out: 'kcna-control-plane, kcna-worker y kcna-worker2 en estado Ready, versión v1.37.' },
    { id: 'images',  t: 'Una imagen precargada',   cmd: '.\\kcna.ps1 load nginx:1.27-alpine', out: '"ya cargada" o "cargada en el cluster". Los nodos no salen a internet: las imágenes se cargan así.' },
    { id: 'ingress', t: 'Traefik publicado en Windows', cmd: 'Invoke-WebRequest http://localhost:8080/ -UseBasicParsing', out: 'Un 404 de Traefik: correcto, aún no hay rutas. Si no responde, revisa kubectl get pods -n traefik.' },
    { id: 'ui',      t: 'Headlamp o k9s abiertos', cmd: '.\\kcna.ps1 ui', out: 'Headlamp muestra el clúster kind-kcna con sus tres nodos.' },
  ];
  const done = (id: string) => progress.env.includes(id);
  const count = $derived(items.filter((i) => done(i.id)).length);
  async function copy(s: string, e: MouseEvent) {
    const b = e.currentTarget as HTMLButtonElement;
    try { await navigator.clipboard.writeText(s); b.textContent = 'Copiado'; setTimeout(() => (b.textContent = 'Copiar'), 1500); } catch {}
  }
</script>

<section class="check" aria-label="Checklist del entorno">
  <div class="top">
    <h2>Comprueba tu entorno</h2>
    <span class="count">{count} / {items.length}</span>
  </div>
  <div class="bar"><span style={`width:${(100 * count) / items.length}%`}></span></div>
  <ol>
    {#each items as it}
      <li class:done={done(it.id)}>
        <label>
          <input type="checkbox" checked={done(it.id)} onchange={() => toggleEnv(it.id)} />
          <span class="t">{it.t}</span>
        </label>
        <div class="cmd"><code>{it.cmd}</code><button type="button" class="btn small" onclick={(e) => copy(it.cmd, e)}>Copiar</button></div>
        <p class="out">{it.out}</p>
      </li>
    {/each}
  </ol>
</section>

<style>
  .check { margin: 28px 0; padding: 20px; border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); box-shadow: var(--shadow); }
  .top { display: flex; justify-content: space-between; align-items: baseline; }
  .top h2 { font-size: 1.2rem; }
  .count { font: 500 0.85rem var(--mono); color: var(--ink-3); }
  .bar { height: 6px; border-radius: 3px; background: var(--line-2); margin: 10px 0 16px; overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--ready); transition: width var(--dur-slow) var(--ease); }
  ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  li { display: grid; gap: 6px; padding-bottom: 14px; border-bottom: 1px solid var(--line-2); }
  li:last-child { border-bottom: 0; padding-bottom: 0; }
  label { display: flex; gap: 10px; align-items: center; cursor: pointer; font-weight: 500; }
  input { width: 18px; height: 18px; accent-color: var(--ready); margin: 0; }
  .done .t { color: var(--ink-3); text-decoration: line-through; }
  .cmd { display: flex; gap: 8px; align-items: center; }
  .cmd code { flex: 1; min-width: 0; overflow-x: auto; padding: 6px 10px; border-radius: var(--r-s); background: var(--panel-2); border: 1px solid var(--line-2); font-size: 0.85rem; white-space: nowrap; }
  .out { color: var(--ink-2); font-size: 0.92rem; }
</style>
