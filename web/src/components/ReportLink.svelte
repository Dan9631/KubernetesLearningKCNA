<script lang="ts">
  // Enlace discreto que abre en GitHub el formulario de error ya rellenado.
  let { href, label = 'Reportar un error' }: { href: string; label?: string } = $props();
</script>

<a class="report" {href} target="_blank" rel="noopener noreferrer" title="Abre un issue en GitHub con la ubicación ya rellenada">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 22V4m0 0h12l-2 4 2 4H4"/></svg>
  {label}
</a>

<style>
  .report { display: inline-flex; align-items: center; gap: 5px; font-size: 0.82rem; color: var(--ink-3); text-decoration: none; white-space: nowrap; }
  .report:hover { color: var(--fail); text-decoration: underline; text-underline-offset: 3px; }
</style>
