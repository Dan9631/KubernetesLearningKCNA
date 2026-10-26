<script lang="ts">
  // Flashcards: tarjeta que gira (término en inglés → definición) y modo lista como glosario con buscador.
  import { onMount } from 'svelte';
  import flashcards from '../../data/flashcards.json';
  import { DOMAINS, pad, url, type DomainKey } from '../../lib/modules';
  import { progress, toggleKnown } from '../../lib/progress.svelte';
  import { ms } from '../../lib/motion';
  import SourceLinks from '../SourceLinks.svelte';

  interface Card { term: string; def: string; domain: string; module: number; source?: string }
  const FC = flashcards as Card[];
  const EXAM_DOMAINS = (Object.keys(DOMAINS) as DomainKey[]).filter((d) => DOMAINS[d].exam > 0);

  let mode = $state<'tarjetas' | 'lista'>('tarjetas');
  let dom = $state('all');
  let onlyPending = $state(true);
  let search = $state('');
  let deck = $state<Card[]>([]);
  let idx = $state(0);
  let flipped = $state(false);
  let dur = $state(0);

  const isKnown = (t: string) => progress.known.includes(t);
  const knownCount = $derived(FC.filter((c) => isKnown(c.term)).length);
  const cur = $derived(deck[idx]);

  function shuffle<T>(a: T[]) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function build() {
    deck = shuffle(FC.filter((c) => (dom === 'all' || c.domain === dom) && (!onlyPending || !isKnown(c.term))));
    idx = 0; flipped = false;
  }
  function flip() { if (cur) flipped = !flipped; }
  function next() { if (!deck.length) return; idx = (idx + 1) % deck.length; flipped = false; }
  function prev() { if (!deck.length) return; idx = (idx - 1 + deck.length) % deck.length; flipped = false; }
  function know() {
    if (!cur) return;
    const term = cur.term;
    toggleKnown(term);
    if (onlyPending && isKnown(term)) {
      deck = deck.filter((c) => c.term !== term);
      if (idx >= deck.length) idx = 0;
      flipped = false;
    }
  }

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = $derived.by(() => {
    const q = norm(search.trim());
    return FC.filter((c) => (dom === 'all' || c.domain === dom) && (!onlyPending || !isKnown(c.term)) && (!q || norm(c.term).includes(q) || norm(c.def).includes(q)))
      .slice().sort((a, b) => a.term.localeCompare(b.term, 'en'));
  });

  function onkey(e: KeyboardEvent) {
    if (mode !== 'tarjetas' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName ?? '';
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (/^(BUTTON|A)$/.test(tag)) return; // el botón enfocado ya recibe el clic
      e.preventDefault(); flip();
    } else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  }

  build();
  // en el navegador: duración según reduced-motion y baraja con las dominadas ya cargadas
  onMount(() => { dur = ms(500); build(); });
</script>

<svelte:window onkeydown={onkey} />

<div class="fc">
  <div class="controls">
    <div class="seg" role="group" aria-label="Modo">
      <button type="button" class="btn small" class:on={mode === 'tarjetas'} aria-pressed={mode === 'tarjetas'} onclick={() => (mode = 'tarjetas')}>Tarjetas</button>
      <button type="button" class="btn small" class:on={mode === 'lista'} aria-pressed={mode === 'lista'} onclick={() => (mode = 'lista')}>Lista</button>
    </div>
    <label class="visually-hidden" for="fdom">Dominio</label>
    <select id="fdom" bind:value={dom} onchange={build}>
      <option value="all">Todos los dominios</option>
      {#each EXAM_DOMAINS as d}<option value={d}>{DOMAINS[d].name}</option>{/each}
    </select>
    <label class="chk"><input type="checkbox" bind:checked={onlyPending} onchange={build} /> Solo pendientes</label>
    <span class="count" aria-live="polite">{knownCount} de {FC.length} dominadas</span>
  </div>

  {#if mode === 'tarjetas'}
    {#if cur}
      <p class="pos">{idx + 1} / {deck.length} · <span class="chip {cur.domain}">{DOMAINS[cur.domain as DomainKey]?.short ?? cur.domain}</span>{#if cur.module}{' '}<span class="mod">Módulo {pad(cur.module)}</span>{/if}</p>
      <div class="scene">
        <button type="button" class="card" class:flipped aria-label={flipped ? `Definición de ${cur.term}. Pulsa para volver al término` : `${cur.term}. Pulsa para ver la definición`} onclick={flip}>
          <div class="inner" style="transition-duration: {dur}ms">
            <div class="face front" aria-hidden={flipped}>
              <span class="term">{cur.term}</span>
              <span class="tip">clic o Espacio para ver la definición</span>
            </div>
            <div class="face back" aria-hidden={!flipped}>
              <span class="small">{cur.term}</span>
              <span class="def">{cur.def}</span>
            </div>
          </div>
        </button>
      </div>
      {#if flipped}<SourceLinks source={cur.source} />{/if}
      <div class="row">
        <button type="button" class="btn" onclick={prev} aria-label="Tarjeta anterior">Anterior</button>
        <button type="button" class="btn" onclick={next} aria-label="Tarjeta siguiente">Siguiente</button>
        <button type="button" class="btn right" class:primary={!isKnown(cur.term)} aria-pressed={isKnown(cur.term)} onclick={know}>{isKnown(cur.term) ? 'Quitar de dominadas' : 'La domino'}</button>
      </div>
      <p class="keys">Atajos: <kbd>Espacio</kbd> voltear, <kbd>←</kbd> <kbd>→</kbd> cambiar de tarjeta.</p>
    {:else}
      <div class="empty" role="status">
        <p>No quedan tarjetas pendientes en esta selección.</p>
        <p class="muted">Quita el filtro "Solo pendientes" o cambia de dominio para seguir repasando.</p>
      </div>
    {/if}
  {:else}
    <div class="search">
      <label class="visually-hidden" for="fq">Buscar término o definición</label>
      <input id="fq" type="search" placeholder="Buscar término o definición" bind:value={search} />
      <span class="muted">{list.length} {list.length === 1 ? 'término' : 'términos'}</span>
    </div>
    {#if list.length}
      <ul class="glos">
        {#each list as c (c.term)}
          <li class:known={isKnown(c.term)}>
            <div class="gt"><span class="term">{c.term}</span> <span class="chip {c.domain}">{DOMAINS[c.domain as DomainKey]?.short ?? c.domain}</span>{#if c.module}<a class="mod" href={url(`/modulos/${pad(c.module)}`)}>Módulo {pad(c.module)}</a>{/if}</div>
            <p class="gd">{c.def}</p>
            <SourceLinks source={c.source} />
            <label class="chk"><input type="checkbox" checked={isKnown(c.term)} onchange={() => toggleKnown(c.term)} /> La domino</label>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty muted" role="status">Ningún término coincide con la búsqueda.</p>
    {/if}
  {/if}
</div>

<style>
  .fc { max-width: 820px; }
  .muted { color: var(--ink-2); font-size: 0.92rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; margin-bottom: 14px; }
  .seg { display: inline-flex; gap: 4px; }
  .seg .btn.on { background: var(--helm-2); border-color: var(--helm); color: var(--helm-ink); }
  select, input[type='search'] { font: inherit; font-size: 0.95rem; padding: 7px 10px; border-radius: var(--r-s); border: 1px solid var(--line); background: var(--panel); color: var(--ink); }
  .chk { display: inline-flex; gap: 6px; align-items: center; font-size: 0.92rem; cursor: pointer; }
  .chk input { accent-color: var(--helm); width: 16px; height: 16px; margin: 0; }
  .count { margin-left: auto; font-size: 0.9rem; color: var(--ink-2); }
  .pos { font: 500 0.85rem var(--mono); color: var(--ink-3); margin-bottom: 10px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .pos .chip { font-family: var(--sans); }
  .mod { font-size: 0.82rem; color: var(--ink-3); }

  /* tarjeta que gira en 3D */
  .scene { perspective: 1400px; }
  .card { display: block; width: 100%; padding: 0; border: 0; background: none; font: inherit; color: var(--ink); cursor: pointer; text-align: center; border-radius: var(--r-l); }
  .inner { position: relative; display: grid; transform-style: preserve-3d; transition-property: transform; transition-timing-function: var(--ease); }
  .card.flipped .inner { transform: rotateY(180deg); }
  .face { grid-area: 1 / 1; min-height: 260px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; padding: 28px 24px; border-radius: var(--r-l); border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .back { transform: rotateY(180deg); background: var(--panel-2); border-color: var(--helm); }
  .term { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.01em; }
  .tip { color: var(--ink-3); font-size: 0.88rem; }
  .small { font: 500 0.85rem var(--mono); color: var(--ink-3); }
  .def { font-size: 1.05rem; max-width: 60ch; line-height: 1.5; }
  .card:hover .face { border-color: var(--helm); }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
  .right { margin-left: auto; }
  .keys { margin-top: 14px; font-size: 0.85rem; color: var(--ink-3); }
  kbd { font: 0.78rem var(--mono); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; background: var(--panel-2); color: var(--ink-2); }
  .empty { padding: 36px 20px; text-align: center; border: 1px dashed var(--line); border-radius: var(--r-l); }
  .empty p + p { margin-top: 6px; }

  /* glosario */
  .search { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
  .search input { flex: 1; min-width: 200px; }
  .glos { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
  .glos li { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; padding: 12px 0; border-bottom: 1px solid var(--line-2); align-items: start; }
  .glos .gt { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .glos .term { font-size: 1rem; font-weight: 600; }
  .glos .gd { grid-column: 1; color: var(--ink-2); font-size: 0.93rem; }
  .glos .chk { grid-column: 2; grid-row: 1 / span 2; align-self: center; white-space: nowrap; }
  .glos li.known .term { color: var(--ink-3); }
  .glos li.known .gd { color: var(--ink-3); }

  @media (max-width: 560px) {
    .term { font-size: 1.25rem; }
    .face { min-height: 220px; padding: 22px 16px; }
    .glos li { grid-template-columns: 1fr; }
    .glos .chk { grid-column: 1; grid-row: auto; }
    .count { margin-left: 0; }
  }
</style>
