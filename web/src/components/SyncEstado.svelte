<script lang="ts">
  // Icono de la cabecera: estado de la sincronización y acceso a /sincronizar.
  // Al cargarse en todas las páginas, también pone en marcha la sincronización automática.
  import { sync, syncAvailable } from '../lib/sync.svelte';
  import { url } from '../lib/modules';

  const state = $derived(!sync.code ? 'off' : sync.status === 'syncing' ? 'busy' : sync.status === 'error' ? 'error' : 'ok');
  const label = $derived({ off: 'Sincronización desactivada', busy: 'Sincronizando…', error: 'Error de sincronización', ok: 'Progreso sincronizado' }[state]);
</script>

{#if syncAvailable}
  <a class="sync {state}" href={url('/sincronizar/')} aria-label={label} title={label}>
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.1 4.5 4.5 0 0 0 7 18Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
    <span class="dot" aria-hidden="true"></span>
  </a>
{/if}

<style>
  .sync { position: relative; display: grid; place-items: center; width: 34px; height: 34px; border-radius: var(--r-s); color: var(--ink-2); flex: none; }
  .sync:hover { color: var(--helm-ink); background: var(--helm-2); }
  .dot { position: absolute; right: 5px; bottom: 7px; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--paper); background: var(--line); }
  .ok .dot { background: var(--ready); }
  .error .dot { background: var(--fail); }
  .busy .dot { background: var(--wait); animation: pulse 1s ease-in-out infinite alternate; }
  @keyframes pulse { to { opacity: 0.3; } }
  @media (prefers-reduced-motion: reduce) { .busy .dot { animation: none; } }
</style>
