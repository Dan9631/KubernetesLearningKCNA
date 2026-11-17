<script lang="ts">
  // Evaluación al final de un módulo, en una sola tarjeta con dos modos sobre el mismo banco de preguntas:
  // el examen (sin ayudas, con nota, deja el módulo aprobado) y la práctica (explica cada respuesta y programa repasos).
  import { onMount } from 'svelte';
  import ExamenModulo from './ExamenModulo.svelte';
  import ModuleQuiz from './ModuleQuiz.svelte';
  import { pastilla } from '../lib/pastilla';

  let { module }: { module: number } = $props();
  type Modo = 'examen' | 'practica';
  let modo = $state<Modo>('examen');
  const uid = $props.id();
  const MODOS: { id: Modo; label: string; hint: string }[] = [
    { id: 'examen', label: 'Examen', hint: 'Sin ayudas y con nota. El módulo se completa al aprobarlo.' },
    { id: 'practica', label: 'Práctica con explicaciones', hint: 'Cada respuesta se explica al momento y entra en tu repaso. No cuenta para aprobar.' },
  ];
  const actual = $derived(MODOS.find((m) => m.id === modo)!);
  // sentido del último cambio: el panel nuevo entra desde ese lado (1 = hacia la derecha)
  let dir = $state(1);
  function ir(m: Modo) {
    if (m === modo) return;
    dir = MODOS.findIndex((x) => x.id === m) > MODOS.findIndex((x) => x.id === modo) ? 1 : -1;
    modo = m;
  }

  // los enlaces antiguos a #practica abren ese modo; #examen y cualquier otro, el examen
  const segunHash = () => { if (location.hash === '#practica') ir('practica'); else if (location.hash === '#examen') ir('examen'); };
  onMount(() => {
    segunHash();
    window.addEventListener('hashchange', segunHash);
    // «Ir al examen» con la dirección ya en #examen no cambia el hash: se atiende el clic
    const alExamen = (e: MouseEvent) => { if ((e.target as Element | null)?.closest?.('a[href="#examen"]')) ir('examen'); };
    document.addEventListener('click', alExamen);
    return () => { window.removeEventListener('hashchange', segunHash); document.removeEventListener('click', alExamen); };
  });

  function tecla(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    ir(modo === 'examen' ? 'practica' : 'examen');
    document.getElementById(`${uid}-${modo}`)?.focus();
  }
</script>

<div class="modos" role="tablist" aria-label="Modo de evaluación" tabindex="-1" onkeydown={tecla} use:pastilla>
  {#each MODOS as m}
    <button type="button" role="tab" id="{uid}-{m.id}" aria-selected={modo === m.id} aria-controls="{uid}-panel" tabindex={modo === m.id ? 0 : -1} class:on={modo === m.id} onclick={() => ir(m.id)}>{m.label}</button>
  {/each}
</div>
<div id="{uid}-panel" role="tabpanel" aria-labelledby="{uid}-{modo}" style="--dir: {dir}">
  {#key modo}<p class="hint mc-aparece">{actual.hint}</p>{/key}
  <!-- los dos se mantienen montados: cambiar de modo no pierde un examen a medias ni la ronda de práctica -->
  <div class="mc-panel" hidden={modo !== 'examen'}><ExamenModulo {module} /></div>
  <div class="mc-panel" hidden={modo !== 'practica'}><ModuleQuiz {module} /></div>
</div>

<style>
  .modos { display: inline-flex; gap: 4px; padding: 4px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel-2); max-width: 100%; flex-wrap: wrap; }
  /* la pastilla es el fondo de la pestaña activa: viaja con resorte de una a otra */
  .modos :global(.pastilla) { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-s); box-shadow: var(--shadow); }
  .modos button { font: inherit; font-size: 0.95rem; font-weight: 500; padding: 7px 14px; min-height: 40px; border: 1px solid transparent; border-radius: var(--r-s); background: none; color: var(--ink-2); cursor: pointer;
    transition: color var(--dur-fast) linear, scale var(--spring-pop-dur) var(--spring-pop); }
  .modos button:hover { color: var(--ink); }
  .modos button:active { scale: var(--press); transition-duration: var(--dur-fast), var(--dur-press); }
  .modos button.on { color: var(--ink); }
  /* antes de hidratar (sin pastilla todavía) la activa lleva su propio fondo */
  .modos:not(:global(.con-pastilla)) button.on { background: var(--panel); border-color: var(--line); box-shadow: var(--shadow); }
  .hint { color: var(--ink-2); font-size: 0.95rem; margin: 12px 0 14px; max-width: var(--measure); animation: mc-fundido var(--dur-fade) linear both; }
</style>
