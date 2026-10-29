<script lang="ts">
  // Panel "Preparación real": tres señales para decidir cuándo reservar fecha sin engañarse
  // por haber memorizado el banco. Cálculo en lib/preparacion.ts.
  import { progress } from '../../lib/progress.svelte';
  import { READY, HOLDOUT, readiness } from '../../lib/preparacion';
  import { DOMAINS, type DomainKey } from '../../lib/modules';
  import { fmtDate, pct } from './quiz';

  let { onfinal }: { onfinal: () => void } = $props();
  const r = $derived(readiness(progress));
  const covered = $derived(r.rows.filter((x) => x.seen >= x.need).length);
  let ask = $state(false);

  const next = $derived(
    r.ready ? 'Listo para reservar fecha. Mantén el ritmo con simulacros hasta el día del examen.'
    : !r.coverOk ? 'Siguiente paso: practica las competencias que faltan.'
    : !r.firstReady ? 'Siguiente paso: sube tu acierto en preguntas nuevas antes de gastar el examen de graduación.'
    : !r.final ? 'Siguiente paso: haz el examen de graduación.'
    : 'Siguiente paso: repasa los dominios flojos del examen de graduación; tu estimación no mejorará repitiéndolo.'
  );
</script>

<section class="prep" class:ready={r.ready} aria-labelledby="h-prep">
  <div class="head">
    <h2 id="h-prep">Preparación real</h2>
    <p class="verdict" class:ok={r.ready}>{next}</p>
  </div>

  <ol class="steps">
    <li class:ok={r.coverOk}>
      <span class="mark" aria-hidden="true">{r.coverOk ? '✓' : '1'}</span>
      <div>
        <h3>Cobertura del temario</h3>
        <p>{covered} de {r.rows.length} competencias practicadas, con al menos {READY.cover} preguntas distintas cada una.</p>
        <details>
          <summary>Ver por competencia</summary>
          <table>
            <thead><tr><th>Competencia</th><th class="n">Vistas</th><th class="n">1.er intento</th></tr></thead>
            <tbody>
              {#each r.rows as row}
                <tr class:low={row.seen < row.need}>
                  <td>{row.c.name} <span class="dom">{DOMAINS[row.c.domain as DomainKey].short}</span></td>
                  <td class="n">{row.seen}/{row.need}</td>
                  <td class="n" class:bad={row.firstN >= 4 && pct(row.firstOk, row.firstN) < READY.firstPass}>{row.firstN ? `${pct(row.firstOk, row.firstN)} %` : '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </details>
      </div>
    </li>

    <li class:ok={r.firstReady}>
      <span class="mark" aria-hidden="true">{r.firstReady ? '✓' : '2'}</span>
      <div>
        <h3>Acierto en preguntas nuevas</h3>
        {#if r.recent.n >= READY.recent}
          <p>Aciertas el <strong>{r.recent.pct} %</strong> de tus últimas {READY.recent} preguntas vistas por primera vez (meta: {READY.firstPass} %).</p>
        {:else}
          <p>Llevas {r.recent.n} de {READY.recent} preguntas nuevas{r.recent.n ? `, con ${r.recent.pct} % de acierto` : ''}. Solo cuenta la primera vez que respondes cada una: repetirlas mide memoria, no conocimiento.</p>
        {/if}
      </div>
    </li>

    <li class:ok={r.finalOk}>
      <span class="mark" aria-hidden="true">{r.finalOk ? '✓' : '3'}</span>
      <div>
        <h3>Examen de graduación</h3>
        {#if r.final}
          <p>
            <strong class:pass={r.finalOk} class:fail={!r.finalOk}>{r.final.score} %</strong> el {fmtDate(r.final.date)}
            {#if r.finalOk}· supera el {READY.finalPass} % y ningún dominio queda por debajo del {READY.domainPass} %.
            {:else if r.final.score < READY.finalPass}· la meta es {READY.finalPass} %.
            {:else}· por debajo del {READY.domainPass} % en {r.weakDoms.map((d) => DOMAINS[d as DomainKey]?.short ?? d).join(', ')}.{/if}
          </p>
          <p class="muted">Solo cuenta el primer intento{r.retakes > 0 ? ` (lo has repetido ${r.retakes} ${r.retakes === 1 ? 'vez' : 'veces'}, sin efecto)` : ''}: al repetirlo ya conoces las preguntas.</p>
          <div class="act"><button type="button" class="btn small" onclick={onfinal}>Repetir (no cuenta)</button></div>
        {:else}
          <p>{HOLDOUT.length} preguntas que nunca salen en la práctica, con los pesos del examen y 90 minutos. Meta: {READY.finalPass} % y ningún dominio por debajo del {READY.domainPass} %.</p>
          {#if ask}
            <div class="confirm" role="alertdialog" aria-labelledby="fin-t">
              <p id="fin-t">Solo cuenta el primer intento.{r.finalAdvised ? '' : ' Aún no tienes los pasos 1 y 2 en verde: si lo haces ahora, gastas tu mejor medida antes de estar listo.'} ¿Empiezas?</p>
              <div class="act">
                <button type="button" class="btn small primary" onclick={() => { ask = false; onfinal(); }}>Sí, empezar</button>
                <button type="button" class="btn small" onclick={() => (ask = false)}>Todavía no</button>
              </div>
            </div>
          {:else}
            <div class="act"><button type="button" class="btn small" class:primary={r.finalAdvised} onclick={() => (ask = true)}>Hacer el examen de graduación</button>
              {#if !r.finalAdvised}<span class="muted">Recomendado cuando tengas los pasos 1 y 2 en verde.</span>{/if}</div>
          {/if}
        {/if}
      </div>
    </li>
  </ol>

  <p class="fine">Es una estimación sobre el banco del curso, no sobre el examen real. Tu progreso vive en este navegador: si lo borras, el examen de graduación vuelve a aparecer, pero ya conocerías sus preguntas.</p>
</section>

<style>
  .prep { border: 1px solid var(--line); border-left: 3px solid var(--wait); border-radius: var(--r-l); background: var(--panel); padding: 18px 20px; }
  .prep.ready { border-left-color: var(--ready); }
  .head h2 { font-size: 1.15rem; }
  .verdict { margin-top: 4px; color: var(--ink-2); }
  .verdict.ok { color: var(--ready); font-weight: 500; }
  .steps { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 14px; }
  .steps > li { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; align-items: start; }
  .mark { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font: 600 0.85rem var(--mono); border: 1.5px solid var(--line); color: var(--ink-3); }
  li.ok .mark { background: var(--ready); border-color: var(--ready); color: #fff; }
  h3 { font-size: 0.98rem; font-weight: 600; }
  li p { color: var(--ink-2); font-size: 0.93rem; margin-top: 3px; }
  .muted { color: var(--ink-3); font-size: 0.85rem; }
  .pass { color: var(--ready); }
  .fail { color: var(--fail); }
  .act { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
  .confirm { margin-top: 10px; padding: 10px 12px; border-radius: var(--r-m); background: var(--wait-2); border-left: 3px solid var(--wait); }
  .confirm p { color: var(--ink); margin: 0; }
  details { margin-top: 6px; font-size: 0.9rem; }
  summary { cursor: pointer; color: var(--helm-ink); }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 0.86rem; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid var(--line-2); }
  th { color: var(--ink-2); font-weight: 600; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  td.n { white-space: nowrap; }
  td:first-child { overflow-wrap: anywhere; }
  tr.low td:nth-child(2), td.bad { color: var(--fail); }
  .dom { font-size: 0.75rem; color: var(--ink-3); }
  .fine { margin-top: 14px; font-size: 0.82rem; color: var(--ink-3); }
  @media (max-width: 420px) { .prep { padding: 14px; } }
</style>
