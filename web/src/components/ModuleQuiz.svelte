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

  function shuffle<T>(a: T[]) { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
  function start() {
    // primero fallos con seguridad y repasos vencidos, luego las nunca vistas
    const eod = endOfToday();
    order = shuffle(pool.map((_, k) => k)).sort((a, b) => priority(progress.quiz[pool[b].id], eod) - priority(progress.quiz[pool[a].id], eod)).slice(0, 8);
    i = 0; picked = []; revealed = false; ok = 0; answered = 0; conf = 'd';
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
    }, 2200);
  }
  function next() { if (i + 1 < order.length) { i += 1; picked = []; revealed = false; conf = 'd'; preguntar(); } }

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
  <div class="quiz">
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
    <p class="q" bind:this={qEl}>{q.q}</p>
    {#if multi}<p class="hint">Elige {q.answer.length} respuestas.</p>{/if}
    <div class="opts">
      {#each q.options as o, k}
        <button type="button" bind:this={optEls[k]} class="opt" class:sel={picked.includes(k)} class:good={revealed && q.answer.includes(k)} class:bad={revealed && picked.includes(k) && !q.answer.includes(k)} onclick={() => pick(k)} disabled={revealed}>
          <span class="l">{letters[k]}</span><span>{o}</span>
        </button>
      {/each}
    </div>
    {#if !revealed}<Confianza value={conf} onchange={confianza} />{/if}
    {#if revealed}
      <div class="explain" class:g-globo={conGrumete} class:msg={conGrumete} bind:this={explainEl} class:ok={correct} class:fail={!correct}><strong>{correct ? 'Correcto.' : 'No es así.'}</strong> {q.explanation}<SourceLinks source={q.source} /><Repaso id={q.id} {conf} correct={correct} /><p class="voz"><Escuchar key="mqe-{q.id}" label="Explicación" parts={() => answerParts(q.options, q.answer, q.explanation, true)} /></p></div>
    {/if}
    <div class="row">
      {#if !revealed}
        <button type="button" class="btn primary" onclick={reveal} disabled={!picked.length}>Responder</button>
      {:else if i + 1 < order.length}
        <button type="button" class="btn primary" onclick={next}>Siguiente</button>
      {:else}
        <span class="done">Ronda terminada: {ok} de {answered}.</span>
        <button type="button" class="btn" onclick={start}>Otra ronda</button>
      {/if}
      <span class="hint right">{#if revealed}<ReportLink href={reportQuestion(q)} />{:else}Las preguntas van en inglés, como en el examen.{/if}</span>
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
  .opt { display: flex; gap: 12px; align-items: flex-start; text-align: left; font: inherit; font-size: 0.98rem; padding: 10px 12px; border-radius: var(--r-m); border: 1px solid var(--line); background: var(--panel); color: var(--ink); cursor: pointer; transition: border-color var(--dur-fast), background var(--dur-fast), scale var(--dur-fast) var(--ease); }
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
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 14px; }
  .right { margin-left: auto; }
  .done { font-weight: 500; }
</style>
