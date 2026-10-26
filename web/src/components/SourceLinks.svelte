<script lang="ts">
  // Enlace(s) a la documentación oficial que respalda una pregunta o una definición.
  let { source }: { source?: string | string[] } = $props();
  const list = $derived(!source ? [] : Array.isArray(source) ? source : [source]);
  // kubernetes.io/docs/concepts/services-networking/service/#type-nodeport -> kubernetes.io › services-networking › service
  function label(u: string) {
    try {
      const x = new URL(u);
      const host = x.hostname.replace(/^www\./, '');
      const parts = x.pathname.split('/').filter((p) => p && !/^(docs|en|latest|stable|concepts|reference)$/.test(p));
      return [host, ...parts.slice(-2)].join(' › ');
    } catch { return u; }
  }
</script>

{#if list.length}
  <p class="src">
    <span>Fuente oficial:</span>
    {#each list as u, i}
      <a href={u} target="_blank" rel="noopener noreferrer">{label(u)}</a>{i < list.length - 1 ? ' · ' : ''}
    {/each}
  </p>
{/if}

<style>
  .src { margin-top: 8px; font-size: 0.85rem; color: var(--ink-3); overflow-wrap: anywhere; }
  .src span { margin-right: 4px; }
  .src a { color: var(--ink-2); }
  .src a:hover { color: var(--helm-ink); }
</style>
