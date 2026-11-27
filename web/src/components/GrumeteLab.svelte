<script lang="ts">
  // Mandos del banco de pruebas (pages/grumete.astro): estados, acciones y energía.
  import Grumete from './Grumete.svelte';
  import type { Estado } from '../lib/grumete';
  import { avisoTrampa, cierreRonda, cuentaAtras, datoAlPulsar, graduacion, hitoConstancia, labCompleto, parteDelDia, reaccionComando, reaccionRespuesta, regreso, type DatosHoy, type Decision, type Tarjeta } from '../lib/grumete-director';
  import { isoDay, DAY } from '../lib/progress.svelte';

  const BUCLES: [Estado, string][] = [['reposo', 'Reposo'], ['pensando', 'Pensando'], ['dormido', 'Dormido']];
  const ACCIONES: [Estado, string][] = [['feliz', 'Feliz'], ['saludo', 'Saludo'], ['asiente', 'Asiente'],['triste', 'Triste'], ['timon', 'Timón']];
  let estado = $state<Estado>('reposo');
  let energia = $state(1);
  let g: ReturnType<typeof Grumete> | undefined = $state();

  // Banco del director: cada escena llama a la función real con datos de ejemplo y la representa aquí
  // (gestos, estado y frase), para revisar el tono de todas las frases sin tener que provocar cada situación.
  const HOY = isoDay();
  const hace = (n: number) => isoDay(Date.now() - n * DAY);
  const PARTE: DatosHoy = { due: 6, sure: 1, cmdDue: 2, tomorrow: 4 };
  const EXAMEN = (faltan: number): DatosHoy => ({ ...PARTE, examen: { fecha: '2026-12-01', faltan, flojo: { nombre: 'Observability', mod: 11 } } });
  const TARJETA: Tarjeta[] = [{ term: 'Pod', def: 'La unidad mínima que Kubernetes programa: uno o varios contenedores que comparten red y volúmenes.', module: 3 }];
  const ESCENAS: { grupo: string; label: string; d: () => Decision | null }[] = [
    { grupo: 'Respuestas', label: 'Seguro y fallo', d: () => reaccionRespuesta(false, 's', 0, 'chat') },
    { grupo: 'Respuestas', label: 'Dudo y acierto', d: () => reaccionRespuesta(true, 'd', 1, 'chat') },
    { grupo: 'Respuestas', label: 'Adivino y acierto', d: () => reaccionRespuesta(true, 'a', 1, 'chat') },
    { grupo: 'Respuestas', label: 'Tres seguidas', d: () => reaccionRespuesta(true, 's', 3, 'chat') },
    { grupo: 'Al cargar', label: 'Vuelta tras 4 días', d: () => regreso(4, HOY, PARTE) },
    { grupo: 'Al cargar', label: 'Parte del día', d: () => parteDelDia(PARTE, HOY) },
    { grupo: 'Al cargar', label: 'Racha de 7', d: () => hitoConstancia(Array.from({ length: 7 }, (_, k) => hace(k)), HOY) },
    { grupo: 'Examen', label: 'Quedan 7 días', d: () => cuentaAtras(EXAMEN(7)) },
    { grupo: 'Examen', label: 'Víspera', d: () => cuentaAtras(EXAMEN(1)) },
    { grupo: 'Examen', label: 'El día', d: () => cuentaAtras(EXAMEN(0)) },
    { grupo: 'Examen', label: 'Graduación', d: () => graduacion({ ...PARTE, examen: { graduacion: true } }) },
    { grupo: 'Práctica', label: 'Ronda limpia', d: () => cierreRonda(8, 8, []) },
    { grupo: 'Práctica', label: 'Fallos del mismo tema', d: () => cierreRonda(5, 8, [{ topic: 'Networking', module: 6 }, { topic: 'Networking', module: 6 }, { topic: 'Storage', module: 8 }]) },
    { grupo: 'Práctica', label: 'Trampa NOT', d: () => avisoTrampa(['neg'], 0) },
    { grupo: 'Práctica', label: 'Comando con pista', d: () => reaccionComando(false, false) },
    { grupo: 'Práctica', label: 'Laboratorio completo', d: () => labCompleto() },
    { grupo: 'Al pulsar', label: 'Dato de un módulo', d: () => ({ gestos: ['saludo'], frase: datoAlPulsar(TARJETA, 3, [], [], 0, ['—']) }) },
  ];
  const GRUPOS = [...new Set(ESCENAS.map((e) => e.grupo))];
  let frase = $state<{ texto: string; n: number } | null>(null);
  function escena(e: (typeof ESCENAS)[number]) {
    const d = e.d();
    frase = { texto: d?.frase ?? (d ? '(solo gesto)' : '(calla: no hay nada que decir)'), n: (frase?.n ?? 0) + 1 };
    if (!d) return;
    estado = d.estado ?? 'reposo';
    for (const x of d.gestos) g?.go(x);
  }
</script>

<div class="lab">
  <div class="escena"><Grumete bind:this={g} {estado} {energia} size={240} /></div>
  <div class="mandos">
    <div class="grupo" role="group" aria-label="Estado de fondo">
      <span class="k">Estado</span>
      {#each BUCLES as [e, label] (e)}
        <button type="button" class="btn small" class:primary={estado === e} aria-pressed={estado === e} onclick={() => (estado = e)}>{label}</button>
      {/each}
    </div>
    <div class="grupo" role="group" aria-label="Acciones">
      <span class="k">Acción</span>
      {#each ACCIONES as [e, label] (e)}
        <button type="button" class="btn small" onclick={() => g?.go(e)}>{label}</button>
      {/each}
    </div>
    <label class="grupo"><span class="k">Energía</span>
      <input type="range" min="0" max="1.5" step="0.1" bind:value={energia} />
      <output class="mono">{energia.toFixed(1)}</output>
    </label>
  </div>
  <section class="director" aria-labelledby="h-director">
    <h2 id="h-director">Lo que dice y cuándo</h2>
    <p class="hint">Cada botón ejecuta la regla real del director (lib/grumete-director.ts) con datos de ejemplo.</p>
    {#each GRUPOS as grupo (grupo)}
      <div class="grupo" role="group" aria-label={grupo}>
        <span class="k">{grupo}</span>
        {#each ESCENAS.filter((e) => e.grupo === grupo) as e (e.label)}
          <button type="button" class="btn small" onclick={() => escena(e)}>{e.label}</button>
        {/each}
      </div>
    {/each}
    <p class="frase" role="status">{#if frase}{#key frase.n}<span class="g-globo">{frase.texto}</span>{/key}{/if}</p>
  </section>
</div>

<style>
  .lab { display: grid; gap: 18px; margin-top: 24px; }
  .escena { display: grid; place-items: center; padding: 36px 16px 20px; border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); }
  .mandos { display: grid; gap: 12px; }
  .grupo { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .k { min-width: 70px; font-size: 0.85rem; font-weight: 600; color: var(--ink-2); }
  input[type='range'] { width: 200px; max-width: 60vw; }
  .director { display: grid; gap: 10px; padding-top: 14px; border-top: 1px solid var(--line); }
  .director h2 { margin: 0; font-size: 1.05rem; }
  .director .hint { margin: 0; color: var(--ink-3); font-size: 0.85rem; }
  .frase { min-height: 3.2em; margin: 4px 0 0; }
  .frase span { display: inline-block; padding: 9px 12px; border: 1px solid var(--line); border-left: 3px solid var(--helm); border-radius: var(--r-m); background: var(--panel); }
</style>
