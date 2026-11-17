<script lang="ts">
  // Grumete, la mascota del curso: una masa de plastilina con gorro de marinero (motor en lib/grumete.ts).
  // Es decorativa (aria-hidden): lo que celebra o lamenta también se dice con texto donde aparece.
  // Uso: <Grumete estado="pensando" /> para un bucle, o bind:this y .go('feliz') para una acción.
  import { onMount } from 'svelte';
  import { createGrumete, type Estado, type Grumete } from '../lib/grumete';
  import { grumetesLocales } from '../lib/grumete-avisos';

  // local: un Grumete puesto en la página (práctica, examen, banco de pruebas). Mientras se ve en pantalla,
  // el compañero de la esquina se aparta para que no haya dos a la vez.
  // seguir: la mirada sigue al cursor (se apaga mientras se lee o en un examen, para no distraer)
  let { estado = 'reposo', energia = 1, size = 160, moldeable = true, local = true, seguir = true }: { estado?: Estado; energia?: number; size?: number; moldeable?: boolean; local?: boolean; seguir?: boolean } = $props();
  let slot: HTMLDivElement;
  let g: Grumete | undefined = $state();

  // órdenes que llegan antes de montar (p. ej. el padre reacciona en cuanto existe la referencia)
  const pendientes: Estado[] = [];
  onMount(() => {
    g = createGrumete(slot, { energia, moldeable });
    g.go(estado);
    for (const e of pendientes.splice(0)) g.go(e);
    let contado = false;
    const contar = (si: boolean) => { if (si !== contado) { contado = si; grumetesLocales(si ? 1 : -1); } };
    const io = local && typeof IntersectionObserver === 'function' ? new IntersectionObserver(([e]) => contar(e.isIntersecting)) : null;
    if (io) io.observe(slot); else if (local) contar(true);
    return () => { io?.disconnect(); contar(false); g?.destroy(); };
  });
  $effect(() => { g?.go(estado); });
  $effect(() => { g?.setEnergia(energia); });
  $effect(() => { g?.setSeguir(seguir); });

  /** Lanza un estado (bucle o acción) desde fuera. */
  export function go(e: Estado) { if (g) g.go(e); else pendientes.push(e); }
  /** Hace que mire un elemento (null: vuelve a seguir el cursor). */
  export function mirar(el: Element | null) { g?.mirar(el); }
</script>

<div class="slot" class:moldeable bind:this={slot} style="--g-size: {size}px"></div>

<style>
  .slot {
    width: var(--g-size); aspect-ratio: 1; flex: none;
    /* paleta propia, verde agua de mar; en oscuro se aclara para que no se pierda contra el fondo */
    --g-masa: #5fbfae; --g-borde: #3e9a8a; --g-brillo: #ffffffaa; --g-tinta: #12324a;
    --g-gorro: #ffffff; --g-cinta: #1d4f91; --g-lazo: #d64545;
  }
  :global([data-theme='dark']) .slot { --g-masa: #6fd0bf; --g-borde: #4fae9e; --g-tinta: #0b1b2b; --g-gorro: #eef3f8; --g-cinta: #7aa0ff; --g-lazo: #f06a6a; }
  .slot :global(svg) { display: block; width: 100%; height: 100%; overflow: visible; touch-action: none; }
  .moldeable :global(svg) { cursor: grab; }
  .moldeable :global([data-agarrado] svg) { cursor: grabbing; }
  .slot :global(.g-sombra) { fill: var(--g-tinta); }
  .slot :global(.g-cuerpo) { fill: var(--g-masa); stroke: var(--g-borde); stroke-width: 2.5; stroke-linejoin: round; }
  .slot :global(.g-brillo) { fill: none; stroke: var(--g-brillo); stroke-width: 4; stroke-linecap: round; }
  .slot :global(.g-rueda) { fill: none; stroke: var(--g-borde); stroke-width: 3.5; stroke-linecap: round; opacity: 0; }
  .slot :global(.g-ojo) { fill: var(--g-tinta); }
  .slot :global(.g-arco) { fill: none; stroke: var(--g-tinta); stroke-width: 2.6; stroke-linecap: round; opacity: 0; }
  .slot :global([data-alegre] .g-arco) { opacity: 1; }
  .slot :global([data-alegre] .g-ojo) { opacity: 0; }
  .slot :global(.g-boca) { fill: none; stroke: var(--g-tinta); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .slot :global([data-boca-abierta] .g-boca) { fill: var(--g-tinta); }
  .slot :global(.g-lazo) { fill: var(--g-lazo); }
  .slot :global(.g-copa) { fill: var(--g-gorro); stroke: var(--g-tinta); stroke-width: 1.6; }
  .slot :global(.g-cinta) { fill: var(--g-cinta); }
</style>
