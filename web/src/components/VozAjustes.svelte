<script lang="ts">
  // Ajustes de la voz: qué voz usar en español y en inglés, y la velocidad. Se guardan en este navegador.
  import { voz, voicesFor, voiceFor, setPref, sample, type Lang } from '../lib/voz.svelte';

  const RATES = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
  const LANGS: { k: Lang; label: string }[] = [{ k: 'es', label: 'Voz en español' }, { k: 'en', label: 'Voz en inglés' }];
  // "Microsoft Dalia Online (Natural) - Spanish (Mexico)" → "Dalia Online (Natural) · es-MX"
  const short = (name: string, lang: string) => `${name.replace(/^(Microsoft|Google)\s+/, '').replace(/\s+-\s+.*$/, '')} · ${lang}`;
  const quality = $derived(voz.voices.some((v) => v.score >= 20));
</script>

{#if voz.supported}
  <details class="ajustes">
    <summary aria-label="Ajustes de voz">
      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm7 4.6v-2.2l-2-.4a5 5 0 0 0-.6-1.4l1.1-1.7-1.5-1.5-1.7 1.1a5 5 0 0 0-1.4-.6l-.4-2H8.3l-.4 2a5 5 0 0 0-1.4.6L4.8 3.9 3.3 5.4l1.1 1.7a5 5 0 0 0-.6 1.4l-2 .4v2.2l2 .4c.1.5.3 1 .6 1.4l-1.1 1.7 1.5 1.5 1.7-1.1c.4.3.9.5 1.4.6l.4 2h2.2l.4-2c.5-.1 1-.3 1.4-.6l1.7 1.1 1.5-1.5-1.1-1.7c.3-.4.5-.9.6-1.4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" /></svg>
      <span>Voz</span>
    </summary>
    <div class="panel">
      {#each LANGS as l}
        {@const list = voicesFor(l.k)}
        <label>
          <span>{l.label}</span>
          {#if list.length}
            <span class="pick">
              <select value={voiceFor(l.k)?.name ?? ''} onchange={(e) => setPref(l.k, e.currentTarget.value)}>
                {#each list as v}<option value={v.name}>{short(v.name, v.lang)}</option>{/each}
              </select>
              <button type="button" class="btn small" onclick={() => sample(l.k)}>Probar</button>
            </span>
          {:else}
            <span class="muted">Este navegador no tiene voces en {l.k === 'es' ? 'español' : 'inglés'}.</span>
          {/if}
        </label>
      {/each}
      <label>
        <span>Velocidad</span>
        <select value={voz.prefs.rate} onchange={(e) => setPref('rate', +e.currentTarget.value)}>
          {#each RATES as r}<option value={r}>{r === 1 ? 'Normal' : `${r}×`}</option>{/each}
        </select>
      </label>
      {#if !quality}
        <p class="muted">Solo hay voces básicas. En Edge aparecen las voces "Natural" de Microsoft; en iPhone puedes descargar voces "Mejoradas" en Ajustes › Accesibilidad › Contenido leído.</p>
      {/if}
    </div>
  </details>
{/if}

<style>
  .ajustes { position: relative; display: inline-block; }
  summary { display: inline-flex; align-items: center; gap: 6px; list-style: none; cursor: pointer; font-size: 0.82rem; color: var(--ink-2); border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px 3px 8px; }
  summary::-webkit-details-marker { display: none; }
  summary:hover, .ajustes[open] summary { border-color: var(--helm); color: var(--helm-ink); }
  .panel { position: absolute; z-index: 30; right: 0; top: calc(100% + 6px); width: min(340px, calc(100vw - 32px)); display: grid; gap: 12px; padding: 14px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); box-shadow: 0 10px 30px rgb(0 0 0 / 0.15); }
  label { display: grid; gap: 4px; font-size: 0.85rem; color: var(--ink-2); }
  .pick { display: flex; gap: 6px; min-width: 0; }
  select { flex: 1; min-width: 0; font: inherit; font-size: 0.88rem; color: var(--ink); background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--r-s); padding: 5px 6px; }
  .muted { color: var(--ink-3); font-size: 0.82rem; margin: 0; }
</style>
