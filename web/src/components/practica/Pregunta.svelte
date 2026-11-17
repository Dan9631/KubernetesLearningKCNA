<script lang="ts">
  // Una pregunta con sus opciones. Mismo aspecto que ModuleQuiz, pero con teclas 1-5 y tres modos:
  // elegir (práctica/simulacro), revelar (práctica tras responder) y revisar (tras entregar el simulacro).
  import { DOMAINS, pad, url, type DomainKey } from '../../lib/modules';
  import { isCorrect, type Item } from './quiz';
  import SourceLinks from '../SourceLinks.svelte';
  import ReportLink from '../ReportLink.svelte';
  import { reportQuestion } from '../../lib/report';
  import Escuchar from '../Escuchar.svelte';
  import { questionParts, answerParts } from '../../lib/voz.svelte';
  import Confianza from '../Confianza.svelte';
  import Repaso from '../Repaso.svelte';
  import type { Conf } from '../../lib/progress.svelte';

  // onconf: muestra "¿Qué tan seguro estás?" (solo en la práctica, no en el simulacro)
  // escalon (práctica): las opciones llegan una tras otra y el veredicto lo da la franja de Practica.svelte.
  // En el simulacro y la revisión, que se recorren deprisa con el teclado, cambian sin coreografía.
  let { item, index, total, reveal = false, link = false, escalon = false, onpick, onconf }: {
    item: Item; index: number; total: number; reveal?: boolean; link?: boolean; escalon?: boolean; onpick?: (k: number) => void; onconf?: (c: Conf) => void;
  } = $props();

  const multi = $derived(item.answer.length > 1);
  const good = $derived(isCorrect(item));
  const dom = $derived(DOMAINS[item.q.domain as DomainKey]);
</script>

<div class="pregunta">
  <div class="meta">
    <span class="chip {item.q.domain}">{dom?.short ?? item.q.domain}</span>
    <span class="topic">{item.q.topic}</span>
    {#if item.q.module}
      <span class="mod">
        {#if link}<a href={url(`/modulos/${pad(item.q.module)}`)}>Módulo {pad(item.q.module)}</a>{:else}Módulo {pad(item.q.module)}{/if}
      </span>
    {/if}
    <span class="count">{index + 1} / {total}</span>
    <Escuchar key="q-{item.q.id}" label="Pregunta" parts={() => questionParts(item.q.q, item.options, item.answer.length)} />
  </div>
  <p class="q" tabindex="-1">{item.q.q}</p>
  {#if multi}<p class="hint">Elige {item.answer.length}.</p>{/if}
  <div class="opts" class:mc-escalon={escalon} role="group" aria-label="Opciones de respuesta">
    {#each item.options as o, k}
      <button
        type="button"
        style="--i: {k}"
        class="opt"
        class:apagada={reveal && !item.answer.includes(k) && !item.picked.includes(k)}
        class:sel={!reveal && item.picked.includes(k)}
        class:good={reveal && item.answer.includes(k)}
        class:bad={reveal && item.picked.includes(k) && !item.answer.includes(k)}
        aria-pressed={item.picked.includes(k)}
        disabled={reveal || !onpick}
        onclick={() => onpick?.(k)}
      >
        <span class="l" aria-hidden="true">{#if reveal && item.answer.includes(k)}✓{:else if reveal && item.picked.includes(k)}✗{:else}{k + 1}{/if}</span><span>{o}</span>
        {#if reveal && item.picked.includes(k)}<span class="you">tu respuesta</span>{/if}
      </button>
    {/each}
  </div>
  {#if onconf && !reveal}<Confianza value={item.conf} onchange={onconf} keys />{/if}
  {#if reveal}
    <!-- en la práctica el veredicto (y su anuncio) va en la franja de Practica.svelte; aquí solo en la revisión -->
    <div class="explain" class:ok={good} class:fail={!good}>
      {#if !escalon}<strong>{good ? 'Correcto.' : item.picked.length ? 'No es así.' : 'Sin responder.'}</strong>{/if} {item.q.explanation}
      <SourceLinks source={item.q.source} />
      <Repaso id={item.q.id} conf={item.conf} correct={good} />
      <p class="voz"><Escuchar key="qe-{item.q.id}" label="Explicación" parts={() => answerParts(item.options, item.answer, item.q.explanation)} /></p>
      <p class="rep"><ReportLink href={reportQuestion(item.q)} /> <span>· {item.q.id}</span></p>
    </div>
  {/if}
</div>

<style>
  .meta { display: flex; align-items: center; gap: 8px 10px; flex-wrap: wrap; }
  .topic { font-size: 0.88rem; color: var(--ink-2); }
  .voz { margin-top: 8px; }
  .rep { margin-top: 6px; font-size: 0.82rem; color: var(--ink-3); }
  .mod { font-size: 0.82rem; color: var(--ink-3); }
  .count { margin-left: auto; font: 500 0.8rem var(--mono); color: var(--ink-3); }
  .q { font-size: 1.1rem; font-weight: 500; margin: 12px 0 14px; }
  .hint { color: var(--ink-2); font-size: 0.9rem; margin: -6px 0 10px; }
  .opts { display: grid; gap: 8px; }
  /* opciones con comandos largos (sin espacios) parten línea en vez de salirse en móvil */
  .opt > span:not(.l):not(.you) { min-width: 0; overflow-wrap: anywhere; }
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
  .explain { animation: mc-entra var(--dur) var(--ease) both; }
  .opt.sel .l { border-color: var(--helm); color: var(--helm-ink); }
  .opt.good .l, .opt.bad .l { animation: mc-pop var(--spring-pop-dur) var(--spring-pop); font-family: var(--sans); font-weight: 700; color: #fff; }
  .opt.good .l { border-color: var(--ready); background: var(--ready); }
  .opt.bad .l { border-color: var(--fail); background: var(--fail); }
  /* al corregir, lo que no tiene que ver con la respuesta se aparta */
  .opt.apagada { opacity: 0.55; }
  .q:focus { outline: none; }
  .q:focus-visible { outline: 2px solid var(--helm); outline-offset: 4px; }
  .you { margin-left: auto; flex: none; font-size: 0.75rem; color: var(--ink-3); white-space: nowrap; padding-left: 8px; }
  .l { flex: none; width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--line); display: grid; place-items: center; font: 500 0.75rem var(--mono); color: var(--ink-3); }
  .explain { margin-top: 12px; padding: 12px 14px; border-radius: var(--r-m); background: var(--panel-2); border-left: 3px solid var(--helm); font-size: 0.95rem; }
  .explain.ok { border-left-color: var(--ready); }
  .explain.fail { border-left-color: var(--fail); }
</style>
