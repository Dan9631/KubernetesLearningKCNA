<script lang="ts">
  // Preguntas del banco (quiz/preguntas.js) asociadas a un módulo, con explicación al responder.
  import preguntas from '../data/preguntas.json';
  import { progress, recordAnswer, type Conf } from '../lib/progress.svelte';
  import { priority, endOfToday } from '../lib/preparacion';
  import Confianza from './Confianza.svelte';
  import Repaso from './Repaso.svelte';
  import SourceLinks from './SourceLinks.svelte';
  import ReportLink from './ReportLink.svelte';
  import { reportQuestion } from '../lib/report';
  import Escuchar from './Escuchar.svelte';
  import { questionParts, answerParts } from '../lib/voz.svelte';
  import { onMount, tick } from 'svelte';
  import { wait } from '../lib/motion';
  import Grumete from './Grumete.svelte';
  import type { Estado } from '../lib/grumete';
  import { EV_PREF, grumeteOculto, setGrumeteOculto } from '../lib/grumete-avisos';

  interface Q { id: string; domain: string; topic: string; module: number; q: string; options: string[]; answer: number[]; explanation: string; source?: string[]; holdout?: boolean }
  let { module }: { module: number } = $props();

  // sin el banco reservado: esas preguntas solo salen en el Examen de graduación
  const pool = (preguntas as Q[]).filter((q) => q.module === module && !q.holdout);
  let order = $state<number[]>([]);
  let i = $state(0);
  let picked = $state<number[]>([]);
  let revealed = $state(false);
  let ok = $state(0);
  let answered = $state(0);
  let conf = $state<Conf>('d');
  // resultado de cada pregunta de la ronda (barra de progreso por segmentos) y fase de salida al pasar a la siguiente
  let res = $state<(boolean | undefined)[]>([]);
  let saliendo = $state(false);

  function shuffle<T>(a: T[]) { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
  function start() {
    // primero fallos con seguridad y repasos vencidos, luego las nunca vistas
    const eod = endOfToday();
    order = shuffle(pool.map((_, k) => k)).sort((a, b) => priority(progress.quiz[pool[b].id], eod) - priority(progress.quiz[pool[a].id], eod)).slice(0, 8);
    i = 0; picked = []; revealed = false; ok = 0; answered = 0; conf = 'd';
    res = []; saliendo = false;
    racha = 0; clearTimeout(tResumen);
    preguntar();
  }

  /* ---------- Grumete conversa (estilo chat): pregunta, mira lo que eliges, reacciona y señala su explicación ----------
     Todo lo que dice es acompañamiento: la tarjeta sigue diciendo «Correcto.» / «No es así.» y la explicación completa,
     así que su escena va con aria-hidden y no frena nada (las acciones se encolan, no hay esperas). */
  let mascota: ReturnType<typeof Grumete> | undefined = $state();
  let conGrumete = $state(false);
  let estadoG = $state<Estado>('reposo');
  let frase = $state({ texto: '', n: 0 });
  let racha = 0, tResumen = 0;
  const optEls: HTMLButtonElement[] = [];
  let qEl: HTMLElement | undefined = $state();
  let explainEl: HTMLElement | undefined = $state();
  const azar = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const PREGUNTA = ['¿Cuál crees?', '¿Qué dirías?', 'A ver esta…', 'Esta sale mucho en el examen.'];
  const BIEN = ['¡Eso es!', '¡A toda vela!', '¡Bien leído!', '¡Exacto!'];
  function decir(texto: string) { frase = { texto, n: frase.n + 1 }; }
  function preguntar() {
    estadoG = 'reposo';
    const n = pool[order[i]]?.answer.length ?? 1;
    decir(n > 1 ? `Aquí van ${n} respuestas. ¿Cuáles?` : i === 0 ? '¿Empezamos? ¿Cuál crees?' : azar(PREGUNTA));
    mascota?.mirar(qEl ?? null);
  }
  function confianza(c: Conf) {
    conf = c;
    // adivinando se queda pensativo; seguro, atento a lo que elegiste
    estadoG = c === 'a' ? 'pensando' : 'reposo';
    if (c === 'a') decir('Si adivinas, te la repito antes. Sin problema.');
    else if (c === 's' && picked.length) decir('Vas seguro. ¡Dale!');
  }

  start();
  const q = $derived(pool[order[i]]);
  const multi = $derived(q?.answer.length > 1);
  const correct = $derived(revealed && picked.length === q.answer.length && picked.every((p) => q.answer.includes(p)));

  function pick(k: number) {
    if (revealed) return;
    if (multi) { picked = picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k].slice(-q.answer.length); }
    else picked = [k];
    mascota?.mirar(optEls[k] ?? null);
    mascota?.go('asiente'); // «te vi»: acuse inmediato de la elección
  }
  async function reveal() {
    if (!picked.length) return;
    revealed = true; answered += 1;
    const good = picked.length === q.answer.length && picked.every((p) => q.answer.includes(p));
    if (good) ok += 1;
    res[i] = good;
    recordAnswer(q.id, good, conf);
    estadoG = 'reposo';
    if (good) {
      racha += 1;
      if (racha % 3 === 0) { mascota?.go('timon'); decir(`¡${racha} seguidas! Mira por qué:`); }
      else { mascota?.go('feliz'); decir(`${azar(BIEN)} Mira por qué:`); }
    } else {
      racha = 0; mascota?.go('triste');
      decir(conf === 's' ? 'Ibas seguro y no era: esa idea volverá hasta que la aciertes.' : 'Casi. Mira por qué:');
    }
    await tick();
    mascota?.mirar(explainEl ?? null);
    // al cerrar la ronda, después de la reacción, el resumen (y lo que pasa con los fallos)
    if (i + 1 >= order.length) tResumen = window.setTimeout(() => {
      const bien = ok / answered >= 0.7;
      if (bien) mascota?.go('saludo');
      decir(bien ? `¡${ok} de ${answered}! Buena ronda.` : `${ok} de ${answered}. Las que fallaste vuelven mañana.`);
    }, 1200);
  }
  // Siguiente: la pregunta actual sale hacia la izquierda (120 ms) y la nueva entra desde la derecha ({#key} abajo).
  // Mientras sale se ignoran más clics y Enter; el foco pasa al enunciado nuevo para no caer al principio de la página.
  async function next() {
    if (saliendo || i + 1 >= order.length) return;
    saliendo = true;
    await wait(120);
    i += 1; picked = []; revealed = false; conf = 'd'; saliendo = false;
    await tick();
    qEl?.focus({ preventScroll: true });
    preguntar();
  }
  // un solo botón principal que cambia de papel (Responder → Continuar → Otra ronda): el foco nunca se pierde
  const fin = $derived(revealed && i + 1 >= order.length);
  function principal() {
    if (!revealed) reveal();
    else if (fin) { start(); tick().then(() => qEl?.focus({ preventScroll: true })); }
    else next();
  }
  // atajos dentro de la tarjeta: 1-5 eligen opción, Enter responde o continúa
  function tecla(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName ?? '';
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
    if (/^[1-5]$/.test(e.key) && !revealed && +e.key <= q.options.length) { e.preventDefault(); pick(+e.key - 1); }
    else if (e.key === 'Enter' && !/^(BUTTON|A)$/.test(tag)) { e.preventDefault(); principal(); }
  }
  const correctas = $derived(q ? q.answer.map((k) => letters[k]).join(' y ') : '');

  onMount(() => {
    conGrumete = !grumeteOculto();
    const onPref = () => (conGrumete = !grumeteOculto());
    addEventListener(EV_PREF, onPref);
    return () => { removeEventListener(EV_PREF, onPref); clearTimeout(tResumen); };
  });
  // en cuanto existe, mira la pregunta
  $effect(() => { if (mascota && qEl && !revealed) mascota.mirar(qEl); });
  const letters = 'ABCDE';
</script>

{#if !pool.length}
  <p class="hint">Este módulo no tiene preguntas en el banco: usa las del final del texto.</p>
{:else if q}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="quiz" onkeydown={tecla}>
    <!-- barra de la ronda: un segmento por pregunta que se llena en verde o rojo al responder -->
    <div class="progreso" role="progressbar" aria-label="Progreso de la ronda" aria-valuemin={0} aria-valuemax={order.length} aria-valuenow={answered}>
      {#each order as _, k}<span class="seg" class:ok={res[k] === true} class:mal={res[k] === false} class:actual={k === i && res[k] === undefined}></span>{/each}
    </div>
    <div class="meta">
      <span class="chip {q.domain}">{q.topic}</span>
      <Escuchar key="mq-{q.id}" label="Pregunta" parts={() => questionParts(q.q, q.options, q.answer.length, true)} />
      <span class="count">{i + 1} / {order.length} · {ok} correctas</span>
    </div>
    {#if conGrumete}
      <div class="escena">
        <div class="avatar" aria-hidden="true"><Grumete bind:this={mascota} estado={estadoG} energia={0.9} size={84} /></div>
        {#key frase.n}<p class="dice g-globo" aria-hidden="true">{frase.texto}</p>{/key}
        <button type="button" class="callar" aria-label="Esconder a Grumete" title="Esconder a Grumete" onclick={() => setGrumeteOculto(true)}>
          <svg viewBox="0 0 20 20" width="11" height="11" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
        </button>
      </div>
    {/if}
    {#key q.id}
      <div class="cuerpo mc-pregunta" class:mc-pregunta-sale={saliendo}>
        <p class="q" bind:this={qEl} tabindex="-1">{q.q}</p>
        {#if multi}<p class="hint">Elige {q.answer.length} respuestas.</p>{/if}
        <div class="opts mc-escalon">
          {#each q.options as o, k}
            <button type="button" bind:this={optEls[k]} style="--i: {k}" class="opt" class:sel={picked.includes(k)} class:good={revealed && q.answer.includes(k)} class:bad={revealed && picked.includes(k) && !q.answer.includes(k)} class:apagada={revealed && !q.answer.includes(k) && !picked.includes(k)} onclick={() => pick(k)} disabled={revealed}>
              <span class="l">{#if revealed && q.answer.includes(k)}✓{:else if revealed && picked.includes(k)}✗{:else}{letters[k]}{/if}</span><span>{o}</span>
            </button>
          {/each}
        </div>
        {#if !revealed}<Confianza value={conf} onchange={confianza} />{/if}
        {#if revealed}
          <div class="explain" class:g-globo={conGrumete} class:msg={conGrumete} bind:this={explainEl} class:ok={correct} class:fail={!correct}>{q.explanation}<SourceLinks source={q.source} /><Repaso id={q.id} {conf} correct={correct} /><p class="voz"><Escuchar key="mqe-{q.id}" label="Explicación" parts={() => answerParts(q.options, q.answer, q.explanation, true)} /></p></div>
        {/if}
        <p class="hint pie">{#if revealed}<ReportLink href={reportQuestion(q)} />{:else}Las preguntas van en inglés, como en el examen. Atajos: <kbd>1</kbd>–<kbd>{q.options.length}</kbd> y <kbd>Enter</kbd>.{/if}</p>
      </div>
    {/key}
    <!-- franja de respuesta (como la hoja de Duolingo): se tiñe con el resultado y el mismo botón pasa a Continuar -->
    <div class="franja" class:ok={revealed && correct} class:fail={revealed && !correct}>
      <div class="veredicto" role="status">
        {#if revealed}
          {#key q.id}<span class="ico" aria-hidden="true">{correct ? '✓' : '✗'}</span>{/key}
          <span class="vt mc-aparece">
            <strong>{correct ? 'Correcto' : 'No es así'}</strong>
            {#if !correct}<span>La respuesta era {correctas}.</span>{/if}
            {#if fin}<span>Ronda terminada: {ok} de {answered}.</span>{/if}
          </span>
        {/if}
      </div>
      <button type="button" class="btn primary principal" onclick={principal} disabled={!revealed && !picked.length}>
        {!revealed ? 'Responder' : fin ? 'Otra ronda' : 'Continuar'}
      </button>
    </div>
  </div>
{/if}

<style>
  .quiz { border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); padding: 20px; max-width: 760px; }
  .meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .meta .count { margin-left: auto; }
  .voz { margin-top: 8px; }
  .count { font: 500 0.8rem var(--mono); color: var(--ink-3); }
  .q { font-size: 1.1rem; font-weight: 500; margin: 12px 0 14px; }
  .hint { color: var(--ink-2); font-size: 0.9rem; }
  .opts { display: grid; gap: 8px; }
  /* opciones con comandos largos (sin espacios) parten línea en vez de salirse en móvil */
  .opt > span:not(.l) { min-width: 0; overflow-wrap: anywhere; }
  .q, .explain { overflow-wrap: anywhere; }
  .opt { display: flex; gap: 12px; align-items: flex-start; text-align: left; font: inherit; font-size: 0.98rem; padding: 10px 12px; border-radius: var(--r-m); border: 1px solid var(--line); background: var(--panel); color: var(--ink); cursor: pointer; transition: border-color var(--dur-fast), background var(--dur-fast), opacity var(--dur-fast) linear, scale var(--dur-fast) var(--ease); }
  .opt:not(:disabled):hover { border-color: var(--helm); }
  .opt.sel { border-color: var(--helm); background: var(--helm-2); }
  .opt.good { border-color: var(--ready); background: var(--ready-2); }
  .opt.bad { border-color: var(--fail); background: var(--fail-2); }
  .opt:disabled { cursor: default; }
  /* responde al pulsar; al corregir, la buena late y la equivocada dice que no (animaciones en global.css) */
  .opt:active:not(:disabled) { scale: 0.985; }
  .opt.good { animation: mc-acierto var(--spring-pop-dur) var(--ease); }
  .opt.bad { animation: mc-fallo 320ms var(--ease); }
  .explain:not(.msg) { animation: mc-entra var(--dur) var(--ease) both; }
  /* con Grumete, la explicación es su mensaje: nace desde arriba a la izquierda (de donde él habla) con el resorte del chat */
  .explain.msg { transform-origin: 24px 0; border-radius: 4px var(--r-m) var(--r-m) var(--r-m); }

  /* escena: Grumete a la izquierda y su globo de chat; el piquito apunta a él y el globo nace de ahí */
  .escena { position: relative; display: flex; align-items: center; gap: 4px; margin: 6px 0 -2px -8px; min-height: 84px; }
  .avatar { flex: none; margin-bottom: -6px; }
  .dice { position: relative; margin: 0 28px 0 6px; padding: 9px 13px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2);
    font-size: 0.95rem; line-height: 1.4; max-width: 46ch; transform-origin: 0 50%; }
  .dice::before { content: ''; position: absolute; left: -6px; top: 50%; width: 10px; height: 10px; margin-top: -5px; background: inherit;
    border: inherit; border-width: 0 0 1px 1px; rotate: 45deg; }
  .callar { position: absolute; top: 0; right: 0; width: 24px; height: 24px; display: grid; place-items: center; padding: 0; border: 1px solid transparent;
    border-radius: 50%; background: none; color: var(--ink-3); cursor: pointer; opacity: 0.6; transition: opacity var(--dur-fast); }
  .callar:hover, .callar:focus-visible { opacity: 1; border-color: var(--line); }
  @media (max-width: 560px) { .escena { min-height: 68px; } .avatar :global(.slot) { --g-size: 68px !important; } .dice { font-size: 0.9rem; } }
  .l { flex: none; width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--line); display: grid; place-items: center; font: 500 0.75rem var(--mono); color: var(--ink-3); }
  .explain { margin-top: 12px; padding: 12px 14px; border-radius: var(--r-m); background: var(--panel-2); border-left: 3px solid var(--helm); font-size: 0.95rem; }
  .explain.ok { border-left-color: var(--ready); }
  .explain.fail { border-left-color: var(--fail); }
  .q:focus { outline: none; }
  .q:focus-visible { outline: 2px solid var(--helm); outline-offset: 4px; }
  .pie { margin-top: 12px; font-size: 0.85rem; }
  .pie kbd { font: 0.75rem var(--mono); border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; background: var(--panel-2); }
  /* al corregir, lo que no tiene que ver con la respuesta se aparta */
  .opt.apagada { opacity: 0.55; }
  .opt.good .l, .opt.bad .l { animation: mc-pop var(--spring-pop-dur) var(--spring-pop); font-family: var(--sans); font-weight: 700; color: #fff; }
  .opt.good .l { background: var(--ready); border-color: var(--ready); }
  .opt.bad .l { background: var(--fail); border-color: var(--fail); }
  .opt.sel:not(.good, .bad) .l { border-color: var(--helm); color: var(--helm-ink); }

  .franja { margin: 16px -20px -20px; padding: 14px 20px; }
  @media (max-width: 420px) { .quiz { padding: 16px; } .franja { margin: 14px -16px -16px; padding: 12px 16px; } }
</style>
