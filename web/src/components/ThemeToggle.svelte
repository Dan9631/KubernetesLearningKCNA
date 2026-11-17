<script lang="ts">
  import { reduced } from '../lib/motion';

  let dark = $state(typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark');
  let girado = $state(false); // solo gira al pulsar, no al cargar la página
  function aplicar() {
    dark = !dark; girado = true;
    document.documentElement.dataset.theme = dark ? 'dark' : '';
    if (!dark) document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('kcna.theme', dark ? 'dark' : 'light'); } catch {}
  }
  // el cambio de colores se funde (View Transition de la misma página) en vez de parpadear;
  // sin soporte o con movimiento reducido, cambia al instante
  function toggle() {
    const raiz = document.documentElement;
    if (!document.startViewTransition || reduced()) { aplicar(); return; }
    raiz.classList.add('vt-tema');
    document.startViewTransition(aplicar).finished.finally(() => raiz.classList.remove('vt-tema'));
  }
</script>

<button class="btn small" onclick={toggle} aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} title="Tema">
  {#key dark}
    <span class="ico" class:gira={girado}>
      {#if dark}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      {/if}
    </span>
  {/key}
</button>

<style>
  /* el icono entra girando un cuarto de vuelta: el sol «sale», la luna «se pone» */
  .ico { display: grid; }
  .ico.gira { animation: giro var(--spring-pop-dur) var(--spring-pop); }
  @keyframes giro { from { rotate: -90deg; scale: 0.6; } }
</style>
