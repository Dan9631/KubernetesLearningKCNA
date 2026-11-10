<script lang="ts">
  // Guía de un diagrama Mermaid ya dibujado (lo monta Enhance.svelte junto al diagrama):
  //   flowchart  "Recorrer paso a paso" (ilumina nodos y explica) y "Completar de memoria" (vacía nodos y pregunta cuál es).
  //   secuencia  "Predecir el orden": antes de mostrar cada mensaje pregunta qué componente actúa (o a quién se dirige).
  // Solo añade y quita clases sobre el SVG (estilos en global.css); al redibujarse el diagrama (cambio de tema)
  // Enhance emite "dg:redraw" y el estado se vuelve a aplicar.
  import { untrack } from 'svelte';
  import { progress, addReto } from '../lib/progress.svelte';
  import { guiaKey, type Guia, type Hueco } from '../lib/diagramas';

  let { host, guia }: { host: HTMLDivElement; guia: Guia } = $props();

  type Modo = 'ver' | 'recorrer' | 'completar' | 'predecir' | 'fin';
  let modo = $state<Modo>('ver');
  let i = $state(0);              // paso del recorrido, hueco o mensaje actual
  let fallos = $state(0);         // huecos o mensajes que no salieron a la primera
  let malas = $state<string[]>([]); // opciones falladas en la pregunta actual
  let acertado = $state(false);   // (predecir) mensaje ya revelado, a la espera de "Siguiente"
  let redraw = $state(0);
  let orden = $state<number[]>([]);
  let opciones = $state<string[]>([]);
  let origen: Modo = 'ver';
  // pantalla completa: el diagrama ocupa la ventana; `fit` lo ajusta entero, si no va a tamaño real con desplazamiento
  let full = $state(false);
  let fit = $state(true);
  let panelEl: HTMLDivElement | undefined = $state();
  const ancho = () => Number(svg()?.viewBox.baseVal?.width ?? 0);
  /** Ajustado entero solo si el texto sigue legible (hasta unos dos tercios de su tamaño); si no, tamaño real */
  const cabe = () => !ancho() || ancho() <= innerWidth * 1.45;
  function abrir() { fit = cabe(); full = true; }
  function cerrarFull() { full = false; }
  const hecho = $derived(progress.retos.includes(guiaKey(guia)));

  const svg = () => host.querySelector('svg');
  const nodeId = (el: Element) => el.id.match(/-flowchart-(.+)-\d+$/)?.[1] ?? '';
  const nodes = () => [...(svg()?.querySelectorAll<SVGGElement>('g.node') ?? [])];
  const labelOf = (el: Element) => el.querySelector<HTMLElement>('.nodeLabel');
  const shuffle = <T,>(a: T[]) => { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };

  // etiquetas originales de los nodos (se leen una vez por dibujo, antes de vaciar ninguno)
  let etiquetas = new Map<string, string>();
  // el texto de una etiqueta, con los saltos de línea (<br>) como espacios; dgLabel guarda el HTML original mientras el nodo está vacío
  const textoHtml = (html: string) => { const c = document.createElement('span'); c.innerHTML = html; for (const br of c.querySelectorAll('br')) br.replaceWith(' '); return (c.textContent ?? '').replace(/\s+/g, ' ').trim(); };
  function leerEtiquetas() { etiquetas = new Map(nodes().map((n) => [nodeId(n), textoHtml(n.dataset.dgLabel ?? labelOf(n)?.innerHTML ?? '')])); }
  /** Texto de la opción correcta de un hueco: el suyo propio o la etiqueta del nodo */
  const opcionDe = (h: Hueco) => h.opcion ?? etiquetas.get(h.nodos[0]) ?? '';
  /** (predecir) el participante por el que se pregunta: quien envía el mensaje o, con pregunta "destino", quien lo recibe */
  const respuesta = (m: Msg) => nombreDe(guia.pregunta === 'destino' ? m.to : m.from);

  // ---------- secuencia: mensajes y participantes, tal como los dibuja mermaid ----------
  interface Msg { els: Element[]; from: string; to: string; texto: string }
  function mensajes(): Msg[] {
    const out: Msg[] = []; let cur: Element[] = []; let texto = '';
    for (const el of svg()?.querySelectorAll('.messageText, .messageLine0, .messageLine1, .sequenceNumber') ?? []) {
      if (el.classList.contains('messageText')) { if (cur.some((x) => /messageLine/.test(x.getAttribute('class') ?? ''))) { cur = []; texto = ''; } cur.push(el); texto += (texto ? ' ' : '') + (el.textContent ?? '').trim(); continue; }
      // el círculo del número es una línea sin clase, justo antes del texto del número
      const dot = el.classList.contains('sequenceNumber') ? el.previousElementSibling : null;
      if (dot && dot.hasAttribute('marker-start')) cur.push(dot);
      cur.push(el);
      if (/messageLine/.test(el.getAttribute('class') ?? '')) out.push({ els: cur, from: el.getAttribute('data-from') ?? '', to: el.getAttribute('data-to') ?? '', texto });
      else if (out.length) out[out.length - 1].els = cur; // el número va después de la línea
    }
    return out;
  }
  function actores(): { id: string; nombre: string }[] {
    // de izquierda a derecha, como se leen en el diagrama
    const seen = new Map<string, { nombre: string; x: number }>();
    for (const r of svg()?.querySelectorAll('rect.actor[name]') ?? []) {
      const id = r.getAttribute('name')!;
      if (!seen.has(id)) seen.set(id, { nombre: (r.parentElement?.querySelector('text.actor')?.textContent ?? id).trim(), x: Number(r.getAttribute('x') ?? 0) });
    }
    return [...seen].sort((a, b) => a[1].x - b[1].x).map(([id, v]) => ({ id, nombre: v.nombre }));
  }
  const total = $derived.by(() => { void redraw; return modo === 'recorrer' ? guia.recorrido?.length ?? 0 : modo === 'completar' ? guia.huecos?.length ?? 0 : modo === 'predecir' || origen === 'predecir' ? mensajes().length : origen === 'completar' ? guia.huecos?.length ?? 0 : 0; });
  const msg = $derived.by(() => { void redraw; return modo === 'predecir' ? mensajes()[i] : undefined; });
  const nombreDe = (id: string) => actores().find((a) => a.id === id)?.nombre ?? id;

  // ---------- pintar el estado sobre el SVG ----------
  function limpiar(s: SVGSVGElement) {
    s.classList.remove('dg-on');
    for (const el of s.querySelectorAll('.dg-foco, .dg-visto, .dg-oculto, .dg-hueco')) el.classList.remove('dg-foco', 'dg-visto', 'dg-oculto', 'dg-hueco');
    for (const n of nodes()) { const l = labelOf(n); if (l && n.dataset.dgLabel !== undefined) { l.innerHTML = n.dataset.dgLabel; delete n.dataset.dgLabel; } }
  }
  function centrar(el: Element | undefined) {
    if (!el) return;
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' as const : 'smooth' as const;
    const b = el.getBoundingClientRect(), h = host.getBoundingClientRect();
    if (full) {
      if (!fit) host.scrollTo({ left: host.scrollLeft + b.left - h.left - host.clientWidth / 2 + b.width / 2, top: host.scrollTop + b.top - h.top - host.clientHeight / 2 + b.height / 2, behavior });
      return;
    }
    if (host.scrollWidth > host.clientWidth) host.scrollTo({ left: host.scrollLeft + b.left - h.left - host.clientWidth / 2 + b.width / 2, behavior });
    // en vertical solo se mueve la página si lo enfocado queda fuera de la franja visible (en el teléfono, sobre el panel fijo)
    const top = 70, bottom = innerHeight * (innerWidth <= 700 ? 0.5 : 0.8);
    if (b.top < top || b.bottom > bottom) scrollTo({ top: scrollY + b.top - Math.max(top + 20, (bottom - b.height) / 2), behavior });
  }
  function pintar() {
    const s = svg(); if (!s) return;
    limpiar(s);
    if (modo === 'ver' || modo === 'fin') return;
    s.classList.add('dg-on');
    if (modo === 'recorrer' && guia.recorrido) {
      const foco = new Set(guia.recorrido[i].foco);
      const vistos = new Set(guia.recorrido.slice(0, i).flatMap((p) => p.foco));
      for (const n of nodes()) { const id = nodeId(n); n.classList.toggle('dg-foco', foco.has(id)); n.classList.toggle('dg-visto', !foco.has(id) && vistos.has(id)); }
      for (const e of s.querySelectorAll<SVGPathElement>('path[data-edge]')) { const m = (e.dataset.id ?? '').match(/^L_(.+?)_(.+)_\d+$/); if (m && foco.has(m[1]) && foco.has(m[2])) e.classList.add('dg-foco'); }
      centrar(nodes().find((n) => nodeId(n) === guia.recorrido![i].foco[0]));
    } else if (modo === 'completar' && guia.huecos) {
      const pendientes = orden.slice(i).flatMap((k) => guia.huecos![k].nodos);
      const actual = new Set(guia.huecos[orden[i]]?.nodos ?? []);
      for (const n of nodes()) {
        const id = nodeId(n);
        if (pendientes.includes(id)) { const l = labelOf(n); if (l) { n.dataset.dgLabel = l.innerHTML; l.textContent = '?'; } n.classList.add('dg-hueco'); }
        n.classList.toggle('dg-foco', actual.has(id));
        n.classList.toggle('dg-visto', !actual.has(id));
      }
      for (const e of s.querySelectorAll('path[data-edge], g.edgeLabel')) e.classList.add('dg-visto');
      centrar(nodes().find((n) => actual.has(nodeId(n))));
    } else if (modo === 'predecir') {
      const ms = mensajes();
      ms.forEach((m, k) => { for (const el of m.els) el.classList.add(k < i ? 'dg-visto' : k === i && acertado ? 'dg-foco' : 'dg-oculto'); });
      const m = ms[i];
      if (m && acertado) for (const r of s.querySelectorAll(`rect.actor[name="${m.from}"]`)) r.classList.add('dg-foco');
      centrar(acertado ? m?.els.find((x) => /messageLine/.test(x.getAttribute('class') ?? '')) : undefined);
    }
  }
  $effect(() => { void modo; void i; void acertado; void redraw; void orden; void full; void fit; untrack(pintar); });
  // pantalla completa: clases sobre el contenedor del diagrama, página sin desplazamiento, Esc para salir
  // y el alto del panel como margen inferior del diagrama
  $effect(() => {
    host.classList.toggle('dg-full', full);
    host.classList.toggle('dg-fit', full && fit);
    if (!full) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    const onkey = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrarFull(); };
    addEventListener('keydown', onkey);
    const ro = new ResizeObserver(() => host.style.setProperty('--dg-bottom', `${panelEl?.offsetHeight ?? 0}px`));
    if (panelEl) ro.observe(panelEl);
    return () => { root.style.overflow = prev; removeEventListener('keydown', onkey); ro.disconnect(); host.classList.remove('dg-full', 'dg-fit'); host.style.removeProperty('--dg-bottom'); };
  });
  $effect(() => {
    const on = () => { leerEtiquetas(); redraw++; };
    host.addEventListener('dg:redraw', on);
    return () => host.removeEventListener('dg:redraw', on);
  });

  // ---------- acciones ----------
  function empezar(m: Modo) {
    leerEtiquetas();
    i = 0; fallos = 0; malas = []; acertado = false; origen = m;
    if (m === 'completar' && guia.huecos) {
      orden = shuffle(guia.huecos.map((_, k) => k));
      opciones = shuffle([...new Set([...guia.huecos.map(opcionDe), ...(guia.distractores ?? [])])]);
    }
    if (m === 'predecir') opciones = actores().map((a) => a.nombre);
    if (!full && host.classList.contains('ancho') && innerWidth > 700) abrir();
    modo = m;
  }
  function salir() { modo = 'ver'; full = false; }
  function cerrar() {
    if (fallos === 0) addReto(guiaKey(guia));
    modo = 'fin';
  }
  function elegir(op: string) {
    if (modo === 'completar' && guia.huecos) {
      if (op !== opcionDe(guia.huecos[orden[i]])) { if (!malas.length) fallos++; malas = [...malas, op]; return; }
      malas = [];
      if (i + 1 < guia.huecos.length) i++; else cerrar();
    } else if (modo === 'predecir' && msg && !acertado) {
      if (op !== respuesta(msg)) { if (!malas.length) fallos++; malas = [...malas, op]; return; }
      malas = []; acertado = true;
    }
  }
  function siguienteMsg() { if (i + 1 < total) { i++; acertado = false; } else cerrar(); }
</script>

{#snippet vista()}
  {#if full}
    <button type="button" class="btn small" onclick={() => (fit = !fit)}>{fit ? 'Acercar' : 'Ver entero'}</button>
    <button type="button" class="btn small" onclick={cerrarFull}>Salir de pantalla completa</button>
  {:else}
    <button type="button" class="btn small" onclick={abrir}>Pantalla completa</button>
  {/if}
{/snippet}

<div class="dg" class:activo={modo !== 'ver'} class:full bind:this={panelEl}>
  {#if modo === 'ver'}
    <div class="row" class:barra={full}>
      {#if guia.recorrido}<button type="button" class="btn small" onclick={() => empezar('recorrer')}>Recorrer paso a paso</button>{/if}
      {#if guia.huecos}<button type="button" class="btn small" onclick={() => empezar('completar')}>Completar de memoria</button>{/if}
      {#if guia.secuencia}<button type="button" class="btn small" onclick={() => empezar('predecir')}>Predecir el orden</button>{/if}
      {#if hecho}<span class="ok">Completado sin fallos ✓</span>{/if}
      <span class="vista">{@render vista()}</span>
    </div>
  {:else}
    <div class="panel" aria-live="polite">
      {#if modo === 'recorrer' && guia.recorrido}
        <p class="k">Paso {i + 1} de {total}</p>
        <p>{guia.recorrido[i].texto}</p>
        <div class="row">
          <button type="button" class="btn small" onclick={() => i--} disabled={i === 0}>Anterior</button>
          {#if i + 1 < total}<button type="button" class="btn small primary" onclick={() => i++}>Siguiente</button>
          {:else if guia.huecos}<button type="button" class="btn small primary" onclick={() => empezar('completar')}>Ahora complétalo de memoria</button>{/if}
          <span class="vista">{@render vista()}<button type="button" class="btn small" onclick={salir}>Cerrar</button></span>
        </div>
      {:else if modo === 'completar' && guia.huecos}
        <p class="k">Hueco {i + 1} de {total} · el nodo resaltado</p>
        <p><strong>¿Qué va aquí?</strong> {guia.huecos[orden[i]].pista}</p>
        <div class="row ops" role="group" aria-label="Opciones">
          {#each opciones as op}<button type="button" class="btn small" class:mala={malas.includes(op)} disabled={malas.includes(op)} onclick={() => elegir(op)}>{op}</button>{/each}
        </div>
        {#if malas.length}<p class="no">No es {malas[malas.length - 1]}. Vuelve a leer la pista.</p>{/if}
        <div class="row"><span class="vista">{@render vista()}<button type="button" class="btn small" onclick={salir}>Cerrar</button></span></div>
      {:else if modo === 'predecir' && msg}
        <p class="k">Paso {i + 1} de {total}</p>
        {#if !acertado}
          <p><strong>{guia.pregunta === 'destino' ? `${nombreDe(msg.from)} actúa: ¿a quién se dirige?` : '¿Qué componente actúa ahora?'}</strong> {guia.pistas?.[i] ?? (i === 0 ? 'Piensa quién da el primer paso.' : 'Piensa quién se entera del cambio anterior y reacciona.')}</p>
          <div class="row ops" role="group" aria-label="Componentes">
            {#each opciones as op}<button type="button" class="btn small" class:mala={malas.includes(op)} disabled={malas.includes(op)} onclick={() => elegir(op)}>{op}</button>{/each}
          </div>
          {#if malas.length}<p class="no">No es {malas[malas.length - 1]}.</p>{/if}
        {:else}
          <p><strong>{nombreDe(msg.from)}</strong>{msg.to !== msg.from ? ` → ${nombreDe(msg.to)}` : ''}: {msg.texto}</p>
          <div class="row"><button type="button" class="btn small primary" onclick={siguienteMsg}>{i + 1 < total ? 'Siguiente' : 'Ver resultado'}</button></div>
        {/if}
        <div class="row"><span class="vista">{@render vista()}<button type="button" class="btn small" onclick={salir}>Cerrar</button></span></div>
      {:else if modo === 'fin'}
        <p><strong>{total - fallos} de {total} a la primera.</strong> {fallos === 0 ? 'Diagrama completado sin fallos.' : 'Repítelo dentro de un rato: lo que cuesta recordar es lo que se queda.'}</p>
        <div class="row">
          <button type="button" class="btn small" class:primary={fallos > 0} onclick={() => empezar(origen)}>Repetir</button>
          <span class="vista">{@render vista()}<button type="button" class="btn small" onclick={salir}>Cerrar</button></span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .dg { margin: 8px 0 22px; font-size: 0.94rem; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .panel { padding: 12px 14px; border-radius: var(--r-m); background: var(--panel-2); border-left: 3px solid var(--helm); }
  /* teléfono: el panel queda fijo abajo para ver a la vez el diagrama y la explicación */
  @media (max-width: 700px) {
    .dg:not(.full) .panel { position: fixed; left: 8px; right: 8px; bottom: 8px; z-index: 30; max-height: 46vh; overflow-y: auto; box-shadow: 0 8px 28px rgb(0 0 0 / 0.28); border: 1px solid var(--line); border-left: 3px solid var(--helm); }
    .dg.activo:not(.full) { min-height: 46vh; }
  }
  .panel > :global(* + *) { margin-top: 10px; }
  .panel p { margin: 0; max-width: var(--measure); }
  .k { font-size: 0.82rem; color: var(--ink-2); }
  .ok { font-size: 0.85rem; color: var(--ready); }
  .no { color: var(--fail); font-size: 0.9rem; }
  .vista { margin-left: auto; display: inline-flex; flex-wrap: wrap; gap: 8px; }
  /* pantalla completa: el panel (o la barra) queda anclado abajo, a todo el ancho */
  .dg.full { position: fixed; left: 0; right: 0; bottom: 0; z-index: 61; margin: 0; background: var(--panel); border-top: 1px solid var(--line); box-shadow: 0 -6px 24px rgb(0 0 0 / 0.16); max-height: 48vh; overflow-y: auto; }
  .dg.full .panel { border-radius: 0; background: none; border-left: 0; padding: 14px clamp(14px, 3vw, 32px); max-width: 1100px; margin: 0 auto; }
  .dg.full .barra { padding: 12px clamp(14px, 3vw, 32px); }
  .ops :global(.btn) { text-align: left; }
  .mala { text-decoration: line-through; }
</style>
