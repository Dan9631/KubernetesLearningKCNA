<script lang="ts">
  // SLI, SLO y presupuesto de error: calcula el error budget y gástalo con incidentes.
  interface Incident { label: string; minutes: number; reqs: number }

  const SLOS = [99, 99.9, 99.95, 99.99];
  let slo = $state(99.9);
  let days = $state(30);
  let rps = $state(100);
  let sla = $state(99.5);
  let incidents = $state<Incident[]>([]);
  let note = $state<{ kind: '' | 'ok' | 'warn' | 'fail'; text: string }>({ kind: '', text: 'Elige el SLO y lanza incidentes. Cada uno resta minutos (y peticiones fallidas) del presupuesto de error.' });

  const windowMin = $derived(days * 24 * 60);
  const budgetMin = $derived(windowMin * (1 - slo / 100));
  const budgetReq = $derived(rps * windowMin * 60 * (1 - slo / 100));
  const slaMin = $derived(windowMin * (1 - sla / 100));
  const usedMin = $derived(incidents.reduce((a, i) => a + i.minutes, 0));
  const usedReq = $derived(incidents.reduce((a, i) => a + i.reqs, 0));
  const pct = $derived(Math.min(100, (100 * usedMin) / budgetMin));
  const left = $derived(budgetMin - usedMin);
  const exhausted = $derived(left <= 0);
  const slaBroken = $derived(usedMin > slaMin);
  const availability = $derived(100 - (100 * usedMin) / windowMin);

  const fmtMin = (m: number) => m >= 1440 ? `${(m / 1440).toFixed(1)} días` : m >= 60 ? `${(m / 60).toFixed(1)} h` : `${m.toFixed(1)} min`;
  const fmtN = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 });

  function incident(minutes: number, fraction: number, label: string) {
    const reqs = minutes * 60 * rps * fraction;
    incidents = [...incidents, { label, minutes: minutes * fraction, reqs }];
    const l = budgetMin - usedMin;
    if (l <= 0) note = { kind: 'fail', text: `Presupuesto agotado (${fmtMin(usedMin)} de ${fmtMin(budgetMin)}). Decisión del equipo: se congelan los despliegues de funcionalidad, se prioriza fiabilidad (postmortem sin culpables, arreglar la causa raíz, mejorar alertas) hasta que la ventana de ${days} días vuelva a dejar margen.` };
    else if (l < budgetMin * 0.25) note = { kind: 'warn', text: `${label}: quedan ${fmtMin(l)} (${(100 - pct).toFixed(0)} %). Con tan poco margen, el SRE pide ir más despacio: despliegues pequeños, canary, nada arriesgado un viernes.` };
    else note = { kind: 'ok', text: `${label}: consumió ${fmtMin(minutes * fraction)} y ${fmtN(reqs)} peticiones fallidas. Quedan ${fmtMin(l)}: hay presupuesto para seguir desplegando y experimentar.` };
  }
  function reset() { incidents = []; note = { kind: '', text: 'Nueva ventana de 30 días: el presupuesto vuelve a estar completo.' }; }
  function onSlo() {
    note = { kind: '', text: `SLO ${slo} %: ${fmtMin(budgetMin)} de caída permitidos en ${days} días (${fmtN(budgetReq)} peticiones a ${rps} req/s). Cada "nueve" extra divide el presupuesto por 10 y multiplica el costo de cumplirlo.` };
  }
</script>

<div class="slo">
  <div class="controls">
    <label>SLO disponibilidad
      <select bind:value={slo} onchange={onSlo}>
        {#each SLOS as s}<option value={s}>{s.toLocaleString('es-ES')} %</option>{/each}
      </select>
    </label>
    <label>ventana
      <select bind:value={days} onchange={onSlo}>
        <option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option>
      </select>
    </label>
    <label>tráfico <input type="number" min="1" max="100000" bind:value={rps} onchange={onSlo} /> req/s</label>
    <label>SLA (contrato)
      <select bind:value={sla}>
        <option value={99}>99 %</option><option value={99.5}>99,5 %</option><option value={99.9}>99,9 %</option>
      </select>
    </label>
  </div>

  <div class="stats">
    <div class="stat"><span class="k">error budget</span><strong class="mono">{fmtMin(budgetMin)}</strong><span class="s">100 % − {slo.toLocaleString('es-ES')} % de {fmtMin(windowMin)}</span></div>
    <div class="stat"><span class="k">peticiones fallidas permitidas</span><strong class="mono">{fmtN(budgetReq)}</strong><span class="s">a {rps} req/s</span></div>
    <div class="stat"><span class="k">consumido</span><strong class="mono" class:bad={exhausted}>{fmtMin(usedMin)}</strong><span class="s">{fmtN(usedReq)} peticiones</span></div>
    <div class="stat"><span class="k">disponibilidad real</span><strong class="mono" class:bad={availability < slo}>{availability.toFixed(3)} %</strong><span class="s">objetivo {slo.toLocaleString('es-ES')} %</span></div>
  </div>

  <div class="budget" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(pct)} aria-label="Presupuesto de error consumido">
    <span class="fill" class:warn={pct > 75} class:full={exhausted} style={`width:${pct}%`}></span>
    <em>{pct.toFixed(0)} % consumido · quedan {fmtMin(Math.max(0, left))}</em>
    {#if slaMin < budgetMin * 4}<span class="mark" style={`left:${Math.min(100, (100 * slaMin) / budgetMin)}%`} title="SLA">SLA</span>{/if}
  </div>

  <div class="controls">
    <button type="button" class="btn small primary" onclick={() => incident(20, 1, 'Incidente de 20 min (caída total)')}>Incidente de 20 min</button>
    <button type="button" class="btn small" onclick={() => incident(60, 0.5, 'Degradación de 1 h al 50 %')}>Degradación 1 h al 50 %</button>
    <button type="button" class="btn small" onclick={() => incident(5, 1, 'Despliegue fallido: 5 min')}>Despliegue fallido (5 min)</button>
    <button type="button" class="btn small" onclick={reset}>Nueva ventana</button>
  </div>

  {#if incidents.length}
    <ol class="list">
      {#each incidents as i, k (k)}<li><span>{i.label}</span><span class="mono">−{fmtMin(i.minutes)}</span></li>{/each}
    </ol>
  {/if}

  <div class="explain {note.kind}" aria-live="polite">
    {note.text}
    {#if slaBroken}<p class="sla">Además superaste el SLA del {sla.toLocaleString('es-ES')} % ({fmtMin(slaMin)}): ahora hay consecuencias contractuales (penalización, devolución de parte de la factura).</p>{/if}
  </div>

  <div class="cards">
    <div class="card"><strong>SLI</strong><p>La medida. Ejemplo: porcentaje de peticiones HTTP de la tienda respondidas con 2xx en menos de 300 ms, calculado en Prometheus con <span class="mono">rate()</span> sobre contadores de éxito y total.</p></div>
    <div class="card"><strong>SLO</strong><p>El objetivo interno para ese SLI en una ventana: SLI ≥ {slo.toLocaleString('es-ES')} % cada {days} días. Lo fija el equipo y da lugar al error budget: {fmtMin(budgetMin)} de fallo tolerado.</p></div>
    <div class="card"><strong>SLA</strong><p>El contrato con el cliente, con consecuencias: {sla.toLocaleString('es-ES')} % mensual o se devuelve el 10 % de la factura. Siempre más laxo que el SLO: el SLO es tu margen de seguridad antes de pagar.</p></div>
    <div class="card"><strong>Error budget</strong><p>100 % − SLO. Es la herramienta de negociación del SRE: si queda, se despliega rápido y se experimenta; si se agota, se congelan cambios y se prioriza fiabilidad. Regla rápida: 99 % → 7,2 h/mes, 99,9 % → 43 min, 99,99 % → 4,3 min.</p></div>
  </div>
</div>

<style>
  .slo { display: grid; gap: 12px; }
  .controls { margin-bottom: 0; }
  .controls label { display: inline-flex; align-items: center; gap: 6px; }
  .controls input[type='number'] { width: 90px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
  .stat { display: grid; gap: 2px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); }
  .stat .k { font-size: 0.78rem; color: var(--ink-2); }
  .stat strong { font-size: 1.15rem; }
  .stat strong.bad { color: var(--fail); }
  .stat .s { font-size: 0.74rem; color: var(--ink-3); }
  .budget { position: relative; height: 26px; border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); overflow: hidden; }
  .fill { position: absolute; inset: 0 auto 0 0; background: var(--ready); transition: width var(--dur-slow) var(--ease), background var(--dur); }
  .fill.warn { background: var(--wait); }
  .fill.full { background: var(--fail); }
  .budget em { position: relative; font: 500 0.78rem var(--mono); color: var(--ink); line-height: 24px; padding-left: 8px; font-style: normal; }
  .mark { position: absolute; top: 0; bottom: 0; border-left: 2px dashed var(--fail); font: 600 0.66rem var(--mono); color: var(--fail); padding-left: 3px; line-height: 24px; }
  .list { margin: 0; padding-left: 1.2em; font-size: 0.86rem; color: var(--ink-2); display: grid; gap: 2px; }
  .list li { display: flex; justify-content: space-between; gap: 10px; }
  .explain { margin-top: 0; }
  .sla { margin-top: 6px; color: var(--fail); }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
  .card { border: 1px solid var(--line); border-radius: var(--r-m); padding: 10px 12px; background: var(--panel-2); font-size: 0.88rem; display: grid; gap: 4px; }
  .card p { color: var(--ink-2); }
</style>
