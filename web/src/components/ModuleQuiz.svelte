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
  }
  start();
  const q = $derived(pool[order[i]]);
  const multi = $derived(q?.answer.length > 1);
  const correct = $derived(revealed && picked.length === q.answer.length && picked.every((p) => q.answer.includes(p)));

  function pick(k: number) {
    if (revealed) return;
    if (multi) { picked = picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k].slice(-q.answer.length); }
    else picked = [k];
  }
  function reveal() {
    if (!picked.length) return;
    revealed = true; answered += 1;
    const good = picked.length === q.answer.length && picked.every((p) => q.answer.includes(p));
    if (good) ok += 1;
    recordAnswer(q.id, good, conf);
  }
  function next() { if (i + 1 < order.length) { i += 1; picked = []; revealed = false; conf = 'd'; } }
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
    <p class="q">{q.q}</p>
    {#if multi}<p class="hint">Elige {q.answer.length} respuestas.</p>{/if}
    <div class="opts">
      {#each q.options as o, k}
        <button type="button" class="opt" class:sel={picked.includes(k)} class:good={revealed && q.answer.includes(k)} class:bad={revealed && picked.includes(k) && !q.answer.includes(k)} onclick={() => pick(k)} disabled={revealed}>
          <span class="l">{letters[k]}</span><span>{o}</span>
        </button>
      {/each}
    </div>
    {#if !revealed}<Confianza value={conf} onchange={(c) => (conf = c)} />{/if}
    {#if revealed}
      <div class="explain" class:ok={correct} class:fail={!correct}><strong>{correct ? 'Correcto.' : 'No es así.'}</strong> {q.explanation}<SourceLinks source={q.source} /><Repaso id={q.id} {conf} correct={correct} /><p class="voz"><Escuchar key="mqe-{q.id}" label="Explicación" parts={() => answerParts(q.options, q.answer, q.explanation, true)} /></p></div>
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
  .opt { display: flex; gap: 12px; align-items: flex-start; text-align: left; font: inherit; font-size: 0.98rem; padding: 10px 12px; border-radius: var(--r-m); border: 1px solid var(--line); background: var(--panel); color: var(--ink); cursor: pointer; transition: border-color var(--dur), background var(--dur); }
  .opt:not(:disabled):hover { border-color: var(--helm); }
  .opt.sel { border-color: var(--helm); background: var(--helm-2); }
  .opt.good { border-color: var(--ready); background: var(--ready-2); }
  .opt.bad { border-color: var(--fail); background: var(--fail-2); }
  .opt:disabled { cursor: default; }
  .l { flex: none; width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--line); display: grid; place-items: center; font: 500 0.75rem var(--mono); color: var(--ink-3); }
  .explain { margin-top: 12px; padding: 12px 14px; border-radius: var(--r-m); background: var(--panel-2); border-left: 3px solid var(--helm); font-size: 0.95rem; }
  .explain.ok { border-left-color: var(--ready); }
  .explain.fail { border-left-color: var(--fail); }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 14px; }
  .right { margin-left: auto; }
  .done { font-weight: 500; }
</style>
