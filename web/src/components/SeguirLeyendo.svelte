<script lang="ts">
  // Tarjeta de la portada: vuelve al módulo leído más recientemente, al párrafo donde te quedaste.
  import { progress } from '../lib/progress.svelte';
  import { lastRead, pctOf } from '../lib/lectura';
  import { MODULES, moduleUrl } from '../lib/modules';
  import Compartir from './Compartir.svelte';

  // progress.reading se lee para que la tarjeta reaccione si cambia en otra isla
  const top = $derived(Object.keys(progress.reading).length ? lastRead() : null);
  const meta = $derived(top ? MODULES.find((m) => m.n === +top.mod) : undefined);
</script>

{#if top && meta}
  <div class="seguir">
    <div class="txt">
      <span class="k">Seguir leyendo</span>
      <a href={`${moduleUrl(meta.n)}#continuar`}><strong>Módulo {top.mod} · {meta.title}</strong></a>
      <span class="bar" role="img" aria-label="Te quedaste en el {pctOf(top.last)} %"><span style="width:{pctOf(top.last)}%"></span></span>
      <span class="p">Te quedaste en el {pctOf(top.last)} %{top.far.i > top.last.i + 2 ? ` · lo más lejos: ${pctOf(top.far)} %` : ''}</span>
    </div>
    <div class="act">
      <a class="btn small primary" href={`${moduleUrl(meta.n)}#continuar`}>Continuar</a>
      <Compartir />
    </div>
  </div>
{/if}

<style>
  .seguir { display: flex; flex-wrap: wrap; gap: 12px 18px; align-items: center; justify-content: space-between; margin-top: 22px; padding: 12px 14px; border: 1px solid var(--line); border-left: 3px solid var(--helm); border-radius: var(--r-m); background: var(--panel); }
  .txt { display: grid; gap: 3px; min-width: 0; }
  .k { font-size: 0.8rem; color: var(--ink-3); }
  .txt a { color: var(--ink); text-decoration: none; overflow-wrap: anywhere; }
  .txt a:hover strong { color: var(--helm-ink); text-decoration: underline; }
  .bar { display: block; width: min(220px, 100%); height: 4px; border-radius: 2px; background: var(--line-2); overflow: hidden; margin-top: 3px; }
  .bar > span { display: block; height: 100%; background: var(--helm); }
  .p { font-size: 0.85rem; color: var(--ink-2); }
  .act { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  a.btn { text-decoration: none; }
</style>
