<script lang="ts">
  // Mejora el markdown renderizado: diagramas Mermaid, botón copiar y pasos del laboratorio con casilla.
  import { untrack, mount } from 'svelte';
  import Comandos from './practica/Comandos.svelte';
  import { drillsAt, type Cierre } from '../lib/kube/drills';
  import DiagramaGuia from './DiagramaGuia.svelte';
  import { guiasDe } from '../lib/diagramas';
  import { progress, toggleStep, toggleDone, markToday, save } from '../lib/progress.svelte';
  import { tieneExamen, aprobado } from '../lib/examenModulo';

  // checklist=false: páginas que no son módulos (instalación) no muestran la barra de progreso
  let { module, checklist = true }: { module: string; checklist?: boolean } = $props();
  let root: HTMLElement | undefined;

  // Colores de los diagramas a partir de los tokens del tema (global.css): mismos azules, tinta y paneles
  function mermaidTheme() {
    const v = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return {
      background: v('--panel'), primaryColor: v('--helm-2'), primaryBorderColor: v('--helm'), primaryTextColor: v('--ink'),
      secondaryColor: v('--panel-2'), tertiaryColor: v('--panel-2'), lineColor: v('--ink-2'), textColor: v('--ink'),
      mainBkg: v('--helm-2'), nodeBorder: v('--helm'), clusterBkg: v('--panel-2'), clusterBorder: v('--line'),
      actorBkg: v('--helm-2'), actorBorder: v('--helm'), actorTextColor: v('--ink'), actorLineColor: v('--line'),
      signalColor: v('--ink-2'), signalTextColor: v('--ink'), labelBoxBkgColor: v('--panel-2'), labelBoxBorderColor: v('--line'),
      labelTextColor: v('--ink'), loopTextColor: v('--ink'), noteBkgColor: v('--wait-2'), noteBorderColor: v('--wait'), noteTextColor: v('--ink'),
      edgeLabelBackground: v('--panel'), fontSize: '15px',
    };
  }

  let diagrams: { div: HTMLDivElement; src: string }[] = [];
  async function drawDiagrams() {
    const { default: m } = await import('mermaid');
    // tamaño natural (sin encoger al ancho de la columna): si no cabe, el contenedor se desplaza en horizontal
    m.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', fontFamily: 'IBM Plex Sans, sans-serif', themeVariables: mermaidTheme(),
      flowchart: { useMaxWidth: false }, sequence: { useMaxWidth: false } });
    for (const [k, { div, src }] of diagrams.entries()) {
      try {
        const { svg } = await m.render(`mmd-${module}-${k}-${Date.now()}`, src);
        div.innerHTML = svg;
        // si al encogerlo el texto sigue legible (≥ 12 px de 15), se ajusta a la columna; si no, se desplaza con aviso
        const el = div.querySelector('svg');
        const natural = el?.viewBox.baseVal?.width ?? 0;
        const fits = !natural || natural <= (div.clientWidth - 32) * 1.25;
        if (el && fits) el.style.maxWidth = '100%';
        div.classList.toggle('ancho', !fits);
        div.dispatchEvent(new CustomEvent('dg:redraw')); // la guía del diagrama vuelve a pintar su estado
      } catch (e) {
        console.warn('mermaid:', e);
        div.innerHTML = `<pre>${src.replace(/</g, '&lt;')}</pre>`;
      }
    }
  }

  async function mermaid(prose: HTMLElement) {
    const blocks = [...prose.querySelectorAll<HTMLPreElement>('pre')].filter((pre) => {
      const lang = pre.dataset.language ?? pre.querySelector('code')?.className ?? '';
      return /mermaid/.test(lang);
    });
    if (!blocks.length) return;
    diagrams = blocks.map((pre) => {
      const src = (pre.querySelector('code') ?? pre).textContent ?? '';
      const div = document.createElement('div');
      div.className = 'mermaid';
      pre.replaceWith(div);
      return { div, src };
    });
    await drawDiagrams();
    // diagramas con guía (lib/diagramas.ts): se recorren paso a paso y se completan de memoria
    for (const guia of guiasDe(module)) {
      const d = diagrams[guia.n];
      if (!d || !d.div.querySelector('svg')) continue;
      const target = document.createElement('div');
      d.div.after(target);
      mount(DiagramaGuia, { target, props: { host: d.div, guia } });
    }
    // al cambiar de tema se vuelven a dibujar con los colores nuevos
    new MutationObserver(() => drawDiagrams()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function copyButtons(prose: HTMLElement) {
    for (const pre of prose.querySelectorAll<HTMLPreElement>('pre')) {
      if (pre.querySelector('.copy')) continue;
      // Los bloques ```prompt son para pegar en un agente: botón grande y siempre visible
      const isPrompt = pre.dataset.language === 'prompt';
      const label = isPrompt ? 'Copiar prompt' : 'Copiar';
      if (isPrompt) pre.classList.add('prompt');
      const b = document.createElement('button');
      b.type = 'button'; b.className = isPrompt ? 'copy copy-prompt' : 'copy'; b.textContent = label;
      b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText((pre.querySelector('code') ?? pre).textContent ?? ''); b.textContent = 'Copiado'; b.classList.add('done'); }
        catch { b.textContent = 'No disponible'; }
        setTimeout(() => { b.textContent = label; b.classList.remove('done'); }, 1600);
      });
      pre.appendChild(b);
    }
  }

  // Comprobaciones de 10 segundos (las inserta lib/plegar.ts al compilar): un intento, luego la respuesta y el porqué
  function checkpoints(prose: HTMLElement) {
    prose.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.check-opt');
      const box = b?.closest<HTMLElement>('.check');
      if (!b || !box || box.classList.contains('done')) return;
      const ok = b.dataset.i === box.dataset.answer;
      box.classList.add('done', ok ? 'is-ok' : 'is-bad');
      b.classList.add('picked');
      for (const o of box.querySelectorAll<HTMLButtonElement>('.check-opt')) { o.disabled = true; if (o.dataset.i === box.dataset.answer) o.classList.add('right'); }
      const why = box.querySelector<HTMLElement>('.check-why');
      if (why) { why.insertAdjacentHTML('afterbegin', `<strong>${ok ? 'Bien.' : 'No exactamente.'}</strong> `); why.hidden = false; }
      markToday(); save();
    });
  }

  // Los pasos del laboratorio son los h3 entre "## Laboratorio guiado" y el siguiente h2.
  // Las casillas se insertan UNA vez; su estado lo actualiza el $effect de abajo.
  let steps = $state<{ id: string; box: HTMLInputElement; h: HTMLElement }[]>([]);
  function labSteps(prose: HTMLElement) {
    const h2 = [...prose.querySelectorAll('h2')].find((h) => /laboratorio/i.test(h.textContent ?? ''));
    if (!h2) return;
    const found: typeof steps = [];
    let el = h2.nextElementSibling;
    let n = 0;
    while (el && el.tagName !== 'H2' && !el.matches('details.seccion')) { // secciones plegadas por lib/plegar.ts
      if (el.tagName === 'H3') {
        n += 1;
        const h = el as HTMLHeadingElement;
        const id = String(n);
        let box = h.querySelector<HTMLInputElement>('input.step-box');
        if (!box) {
          box = document.createElement('input');
          box.type = 'checkbox'; box.className = 'step-box'; box.setAttribute('aria-label', `Paso ${n} hecho`);
          box.addEventListener('change', () => toggleStep(module, id));
          h.classList.add('step'); h.prepend(box);
        }
        found.push({ id, box, h });
      }
      el = el.nextElementSibling;
    }
    steps = found;
    // lo que contiene cada paso: los hermanos entre su h3 y el siguiente
    const hechos = progress.steps[module] ?? [];
    const veladas: (() => void)[] = [];
    for (const s of found) {
      const body: HTMLElement[] = [];
      for (let x = s.h.nextElementSibling; x && !/^H[23]$/.test(x.tagName) && !x.matches('details.seccion'); x = x.nextElementSibling) body.push(x as HTMLElement);
      if (!body.length) continue;
      // el paso 1 solo prepara el laboratorio; un paso ya hecho no se vuelve a tapar
      if (s.id !== '1' && !hechos.includes(s.id)) veladas.push(...predictions(body));
      stepDrills(s.id, body);
    }
    if (veladas.length) {
      const bar = document.createElement('p');
      bar.className = 'predice-todas';
      bar.innerHTML = 'Las salidas esperadas están tapadas: antes de mirar cada una, piensa qué va a responder el clúster. <button type="button" class="btn small">Mostrar todas</button>';
      bar.querySelector('button')!.addEventListener('click', () => { for (const show of veladas) show(); bar.remove(); });
      h2.after(bar);
    }
  }

  // Predice antes de mirar: la salida esperada (y su "Qué observar") quedan veladas hasta que el alumno
  // se compromete con una predicción. Devuelve las funciones que las destapan.
  function predictions(body: HTMLElement[]): (() => void)[] {
    const out: (() => void)[] = [];
    body.forEach((el, k) => {
      if (el.tagName !== 'PRE' || el.dataset.language !== 'text' || body[k - 1]?.dataset.language !== 'powershell') return;
      const after = body[k + 1];
      const hidden = [el, ...(after?.tagName === 'P' && /^Qué observar/i.test(after.textContent ?? '') ? [after] : [])];
      for (const h of hidden) { h.classList.add('velado'); h.setAttribute('aria-hidden', 'true'); }
      const bar = document.createElement('div');
      bar.className = 'predice-lab';
      const n = `pred-${module}-${k}-${Math.round(el.offsetTop)}`;
      bar.innerHTML = `<label for="${n}">Antes de mirar: ¿qué esperas ver?</label><input id="${n}" type="text" autocomplete="off" placeholder="tu predicción (opcional)" /><button type="button" class="btn small">Ver la salida esperada</button>`;
      const show = () => {
        if (!bar.isConnected) return;
        for (const h of hidden) { h.classList.remove('velado'); h.removeAttribute('aria-hidden'); }
        const said = bar.querySelector('input')!.value.trim();
        if (said) { const p = document.createElement('p'); p.className = 'predice-dicho'; p.textContent = `Tu predicción: ${said}. Compárala con la salida.`; bar.replaceWith(p); } else bar.remove();
      };
      bar.querySelector('button')!.addEventListener('click', show);
      bar.querySelector('input')!.addEventListener('keydown', (e) => { if (e.key === 'Enter') show(); });
      el.before(bar);
      out.push(show);
    });
    return out;
  }

  // Comandos de memoria del paso: al final de cada paso que tiene ejercicios. Mientras se escribe, el paso se tapa;
  // si salen todos a la primera, el paso queda marcado como hecho (escribir sustituye a marcar la casilla).
  function stepDrills(id: string, body: HTMLElement[]) {
    const ids = drillsAt(Number(module), Number(id)).map((d) => d.id);
    if (!ids.length) return;
    const target = document.createElement('div');
    target.className = 'paso-cmd';
    body[body.length - 1].after(target);
    mount(Comandos, { target, props: {
      ids, mode: 'paso',
      onfase: (f: string) => { const on = f === 'pregunta' || f === 'solucion' || f === 'bien'; for (const el of body) if (!el.classList.contains('predice-lab')) el.classList.toggle('tapado', on); },
      ondone: (r: Cierre) => { if (r.primera === r.total && !(progress.steps[module] ?? []).includes(id)) toggleStep(module, id); },
    } });
  }

  // Preparación del DOM: una sola vez (untrack evita que lea `progress` y se repita en cada clic)
  $effect(() => {
    const prose = root?.closest('article')?.querySelector<HTMLElement>('.prose') ?? document.querySelector<HTMLElement>('.prose');
    if (!prose) return;
    untrack(() => {
      labSteps(prose);
      checkpoints(prose);
      mermaid(prose).finally(() => copyButtons(prose));
    });
  });

  // Estado de las casillas: reactivo al progreso guardado
  $effect(() => {
    const done = progress.steps[module] ?? [];
    for (const s of steps) { const ok = done.includes(s.id); s.box.checked = ok; s.h.classList.toggle('done', ok); }
  });

  const done = $derived(progress.done.includes(module));
  // los módulos con examen no se marcan a mano: se completan al aprobarlo
  const conExamen = $derived(tieneExamen(Number(module)));
  const pasado = $derived(aprobado(progress, Number(module)));
  const pasos = $derived(doneCount ? `${doneCount} paso${doneCount === 1 ? '' : 's'} del laboratorio hechos. ` : '');
  const doneCount = $derived((progress.steps[module] ?? []).length);
</script>

<div bind:this={root} class="status" style:display={checklist ? null : 'none'}>
  {#if conExamen}
    {#if pasado}
      <span class="hint">{pasos}Aprobaste el examen: el módulo aparece como completado en tu Ruta.</span>
      <span class="ok">Módulo completado ✓</span>
    {:else}
      <span class="hint">{pasos}Este módulo se completa al aprobar su examen.</span>
      <a class="btn small primary" href="#examen">Ir al examen</a>
    {/if}
  {:else}
    <span class="hint">{pasos}{done ? 'Aparece como completado en tu Ruta.' : '¿Terminaste la lectura? Márcalo para verlo en tu Ruta.'}</span>
    <button type="button" class="btn small" class:primary={!done} onclick={() => toggleDone(module)}>{done ? 'Módulo completado ✓' : 'Marcar módulo completado'}</button>
  {/if}
</div>

<style>
  .status { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin: 20px 0 8px; padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); }
  .hint { color: var(--ink-2); font-size: 0.92rem; }
  .ok { color: var(--ready); font-weight: 600; font-size: 0.92rem; }
</style>
