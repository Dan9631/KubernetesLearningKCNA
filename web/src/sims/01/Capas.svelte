<script lang="ts">
  // Anatomía de una imagen: cada instrucción del Containerfile y lo que añade (una capa o solo configuración).
  import { flip } from 'svelte/animate';
  import { scale, fade } from 'svelte/transition';
  import { ms } from '../../lib/motion';

  interface Ins { ins: string; arg: string; layer: boolean; kb: number; hash: string; why: string; cache: string }
  const lines: Ins[] = [
    { ins: 'FROM', arg: 'nginx:1.27-alpine', layer: true, kb: 49700, hash: '9d3c4a1e2f70',
      why: 'FROM trae la imagen base completa: nginx:1.27-alpine ya tiene 8 capas de solo lectura (Alpine, nginx y su configuración). No se copian: cualquier imagen que parta de la misma base comparte esas capas en disco, identificadas por su hash (contenido direccionable).',
      cache: 'La base no cambió: sus 8 capas salen de la caché local sin descargar nada.' },
    { ins: 'LABEL', arg: 'org.opencontainers.image.title="kcna-web"', layer: false, kb: 0, hash: 'fc5e1d2069c5',
      why: 'LABEL solo escribe metadatos en la configuración de la imagen (0 B). En podman history aparece como #(nop) y sin tamaño: describe la imagen (org.opencontainers.image.*) pero no toca el filesystem.',
      cache: 'La instrucción es idéntica a la del build anterior: se reutiliza (Using cache).' },
    { ins: 'ENV', arg: 'KCNA_MODULO=01', layer: false, kb: 0, hash: 'eadeaa0a4981',
      why: 'ENV define una variable de entorno que existirá durante el build y en ejecución (podman exec web2 printenv KCNA_MODULO). Como no modifica archivos, tampoco crea capa: solo configuración.',
      cache: 'Tampoco cambió: se reutiliza de la caché.' },
    { ins: 'COPY', arg: 'web/ /usr/share/nginx/html/', layer: true, kb: 4.1, hash: 'b4f5670b2368',
      why: 'COPY lleva la carpeta web/ del contexto de build al filesystem de la imagen: un tar con los archivos nuevos (4,1 kB). Es la novena capa y la única que es realmente tuya; las otras ocho siguen siendo las de nginx.',
      cache: 'index.html cambió, así que el hash del contenido de web/ es distinto: COPY se ejecuta de nuevo y produce una capa nueva. Aquí se rompe la caché.' },
    { ins: 'RUN', arg: 'chmod -R a+r /usr/share/nginx/html', layer: true, kb: 4.1, hash: '71a0c3d9e5b2',
      why: 'RUN ejecuta el comando en un contenedor temporal y guarda el resultado como capa nueva. Aunque solo cambie permisos, overlayfs copia los archivos tocados a la capa de arriba (copy-on-write), así que la capa pesa lo mismo que ellos. Por eso conviene agrupar comandos y limpiar en el mismo RUN.',
      cache: 'RUN no cambió, pero va después de la primera instrucción invalidada: la caché se reutiliza solo hasta la primera que cambia, todo lo posterior se reconstruye.' },
    { ins: 'EXPOSE', arg: '80', layer: false, kb: 0, hash: '2c8f6b4d0a19',
      why: 'EXPOSE documenta el puerto que escucha la aplicación. No publica nada por sí solo (eso lo hace -p 8081:80 en podman run, o un Service en Kubernetes): es solo un metadato de la configuración.',
      cache: 'Metadato reconstruido (es gratis: no hay archivos que copiar), porque va después del cambio.' },
    { ins: 'CMD', arg: '["nginx", "-g", "daemon off;"]', layer: false, kb: 0, hash: 'd102d0578661',
      why: 'CMD fija el comando por defecto en forma exec, para que nginx sea el PID 1 y reciba SIGTERM al parar. Es configuración. Con el COMMIT la imagen queda con 10 capas (en el lab, sin el RUN, son 9) y unos 49,7 MB, etiquetada como localhost/kcna-web:1.0.',
      cache: 'Metadato reconstruido. La imagen nueva comparte 8 capas con la anterior; solo COPY y RUN ocupan espacio nuevo en disco.' },
  ];
  const CHANGED = 3; // índice de COPY: la instrucción que cambia al editar index.html
  const RUN_STEP = lines.length + 1; // etapa final: podman run
  const BASE_LAYERS = 8;

  let step = $state(0);
  let rebuild = $state(false);

  const applied = $derived(lines.slice(0, Math.min(step, lines.length)).map((l, i) => ({ ...l, i })));
  const layers = $derived(applied.filter((l) => l.layer));
  const config = $derived(applied.filter((l) => !l.layer));
  const totalKb = $derived(layers.reduce((a, l) => a + l.kb, 0));
  const layerCount = $derived(layers.reduce((a, l) => a + (l.i === 0 ? BASE_LAYERS : 1), 0));
  const cached = (i: number) => rebuild && i < CHANGED;
  const fmt = (kb: number) => (kb >= 1000 ? `${(kb / 1000).toFixed(1).replace('.', ',')} MB` : kb === 0 ? '0 B' : `${String(kb).replace('.', ',')} kB`);
  const dur = () => ms(300);

  const INTRO = 'Un Containerfile es la receta de la imagen. Pulsa cada instrucción (o Siguiente) para ver qué añade: solo RUN, COPY y ADD crean capas; el resto cambia la configuración de la imagen.';
  const RUN_TXT = 'podman run monta las capas de solo lectura con overlayfs y añade encima una capa escribible propia del contenedor. Todo lo que el proceso escriba va ahí (copy-on-write) y desaparece con podman rm: por eso los contenedores son efímeros y los datos persistentes van en volúmenes.';
  const RUN_REBUILD = ' El contenedor nuevo arranca sobre la imagen reconstruida con su capa escribible vacía: nada de lo que escribió el contenedor anterior sobrevive.';

  const explain = $derived.by(() => {
    if (step === 0) return { text: rebuild ? 'Has editado index.html. Recorre el build de nuevo: las instrucciones anteriores al cambio salen de la caché; desde COPY en adelante todo se reconstruye.' : INTRO, tone: '' };
    if (step === RUN_STEP) return { text: RUN_TXT + (rebuild ? RUN_REBUILD : ''), tone: 'warn' };
    const l = lines[step - 1];
    if (!rebuild) return { text: l.why, tone: '' };
    return { text: `${l.why} ${l.cache}`, tone: step - 1 < CHANGED ? 'ok' : step - 1 === CHANGED ? 'fail' : 'warn' };
  });

  const buildLog = $derived.by(() => {
    const out: string[] = [];
    for (const l of applied) {
      out.push(`STEP ${l.i + 1}/${lines.length}: ${l.ins} ${l.arg}`);
      out.push(cached(l.i) ? `--> Using cache ${l.hash}` : `--> ${l.hash}`);
    }
    if (step >= lines.length) out.push(`COMMIT kcna-web:${rebuild ? '1.1' : '1.0'}`, `Successfully tagged localhost/kcna-web:${rebuild ? '1.1' : '1.0'}`);
    if (step === RUN_STEP) out.push('', `$ podman run -d --name web2 -p 8082:80 kcna-web:${rebuild ? '1.1' : '1.0'}`, 'c90a6331da02...');
    return out.join('\n');
  });

  function go(n: number) { step = Math.max(0, Math.min(RUN_STEP, n)); }
</script>

<div class="controls">
  <button type="button" class="btn small" onclick={() => go(step - 1)} disabled={step === 0}>Anterior</button>
  <button type="button" class="btn small primary" onclick={() => go(step + 1)} disabled={step === RUN_STEP}>{step === lines.length ? 'podman run' : step === RUN_STEP ? 'Fin' : 'Siguiente'}</button>
  <label class="toggle"><input type="checkbox" bind:checked={rebuild} /> Cambiar index.html y reconstruir</label>
  <span class="hint mono">{step === 0 ? 'podman build -t kcna-web:1.0 .' : step === RUN_STEP ? 'contenedor web2 en marcha' : `paso ${step} / ${lines.length}`}</span>
</div>

<div class="grid">
  <div class="file">
    <div class="fname mono">Containerfile</div>
    <ol class="cf">
      {#each lines as l, i (l.ins)}
        <li>
          <button type="button" class="line mono" class:done={i < step} class:cur={i === step - 1} onclick={() => go(i + 1)} aria-current={i === step - 1 ? 'step' : undefined}>
            <span class="ins">{l.ins}</span> <span class="arg">{l.arg}</span>
            <span class="kind" class:layer={l.layer}>{l.layer ? 'capa' : 'config'}</span>
            {#if i < step && rebuild}<span class="cache" class:hit={cached(i)}>{cached(i) ? 'caché' : 'nueva'}</span>{/if}
          </button>
        </li>
      {/each}
    </ol>
    <pre aria-label="Salida de podman build">{buildLog || '$ podman build -t kcna-web:1.0 .'}</pre>
  </div>

  <div class="image">
    <div class="stack" aria-label="Capas de la imagen">
      {#if step === RUN_STEP}
        <div class="layer rw" transition:scale={{ duration: dur(), start: 0.8 }}>
          <strong>Capa escribible del contenedor</strong>
          <span class="meta">efímera · se pierde con podman rm</span>
        </div>
      {/if}
      {#each [...layers].reverse() as l (l.i)}
        <div class="layer" class:base={l.i === 0} class:hit={cached(l.i)} class:fresh={rebuild && !cached(l.i)} animate:flip={{ duration: dur() }} in:scale={{ duration: dur(), start: 0.8 }} out:fade={{ duration: ms(150) }}>
          {#if l.i === 0}
            <div class="sub" aria-hidden="true">{#each Array(BASE_LAYERS) as _, k}<span></span>{/each}</div>
          {/if}
          <div class="ltxt">
            <strong class="mono">{l.ins} {l.i === 0 ? l.arg : ''}</strong>
            <span class="meta">{l.i === 0 ? `${BASE_LAYERS} capas de solo lectura` : 'solo lectura'} · {fmt(l.kb)}{#if rebuild} · {cached(l.i) ? 'de caché' : 'reconstruida'}{/if}</span>
          </div>
        </div>
      {:else}
        <div class="layer empty">Sin capas todavía: pulsa FROM</div>
      {/each}
    </div>
    <div class="totals">
      <span><em>Capas</em> <strong class="mono">{layerCount}</strong></span>
      <span><em>Tamaño</em> <strong class="mono">{fmt(totalKb)}</strong></span>
      {#if rebuild && step > 0}<span><em>Nuevo en disco</em> <strong class="mono">{fmt(layers.filter((l) => !cached(l.i)).reduce((a, l) => a + l.kb, 0))}</strong></span>{/if}
    </div>
    <div class="cfg" aria-label="Configuración de la imagen">
      <div class="fname mono">config.json de la imagen</div>
      {#if config.length}
        <ul class="mono">
          {#each config as c (c.i)}<li in:fade={{ duration: dur() }}>{c.ins} {c.arg}</li>{/each}
        </ul>
      {:else}
        <span class="hint">LABEL, ENV, EXPOSE y CMD aparecerán aquí: no son capas.</span>
      {/if}
    </div>
  </div>
</div>

<div class="explain {explain.tone}" aria-live="polite">{explain.text}</div>

<style>
  .toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
  .toggle input { accent-color: var(--helm); width: 16px; height: 16px; margin: 0; }
  .grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
  /* minmax(0, 1fr): sin el 0, las líneas largas del <pre> ensanchan la columna y la sacan de la tarjeta */
  @media (max-width: 640px) { .grid { grid-template-columns: minmax(0, 1fr); } }
  .fname { font-size: 0.74rem; color: var(--ink-3); margin-bottom: 4px; }
  .cf { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 3px; }
  .line { width: 100%; text-align: left; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; padding: 6px 8px; border-radius: var(--r-s); border: 1px solid var(--line-2); background: var(--panel-2); color: var(--ink-2); cursor: pointer; font-size: 0.8rem; transition: border-color var(--dur), background var(--dur); }
  .line:hover { border-color: var(--helm); }
  .line.done { color: var(--ink); }
  .line.cur { border-color: var(--helm); background: var(--helm-2); color: var(--ink); }
  .ins { font-weight: 600; color: var(--helm-ink); }
  .arg { word-break: break-all; }
  .kind, .cache { margin-left: auto; font: 500 0.66rem var(--sans); padding: 1px 6px; border-radius: 999px; border: 1px solid var(--line); color: var(--ink-3); }
  .kind.layer { border-color: var(--helm); color: var(--helm-ink); }
  .cache { margin-left: 0; border-color: var(--wait); color: var(--wait); }
  .cache.hit { border-color: var(--ready); color: var(--ready); }
  .image { display: grid; gap: 10px; align-content: start; }
  .stack { display: flex; flex-direction: column; gap: 4px; min-height: 150px; justify-content: flex-end; }
  .layer { border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); padding: 8px 10px; display: grid; gap: 4px; }
  .layer.base { padding-top: 6px; }
  .layer.hit { border-color: var(--ready); }
  .layer.fresh { border-color: var(--wait); background: var(--wait-2); }
  .layer.rw { border-style: dashed; border-color: var(--wait); background: var(--wait-2); }
  .layer.empty { border-style: dashed; color: var(--ink-3); font-size: 0.85rem; text-align: center; }
  .sub { display: grid; gap: 2px; }
  .sub span { display: block; height: 4px; border-radius: 2px; background: var(--node); }
  .ltxt { display: flex; flex-wrap: wrap; gap: 2px 10px; align-items: baseline; }
  .ltxt strong { font-size: 0.8rem; }
  .meta { font-size: 0.74rem; color: var(--ink-2); }
  .totals { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 0.85rem; }
  .totals em { font-style: normal; color: var(--ink-3); margin-right: 4px; }
  .cfg ul { margin: 0; padding: 0 0 0 1em; font-size: 0.78rem; color: var(--ink-2); }
</style>
