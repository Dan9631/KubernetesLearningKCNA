<script lang="ts">
  // Grumete como compañero de estudio: vive en la esquina inferior izquierda de cada página (la derecha es del
  // botón de lectura) y reacciona a lo que pasa en el curso a través de lib/grumete-avisos.ts.
  //  - Acierto: salta. Fallo: se derrite un poco. Tres aciertos seguidos o un módulo terminado: se vuelve timón.
  //  - Un lote de respuestas a la vez (examen de módulo, simulacro): reacciona al resultado con un globo.
  //  - Pulsarlo: cuenta un dato de marinero sobre el examen. Arrastrarlo: se moldea como plastilina.
  //  - Si no pasa nada en un buen rato se duerme, y saluda al volver.
  // Se aparta cuando hay otro Grumete en la página, cuando suena el lector o se abre un diagrama a pantalla completa,
  // y el alumno puede esconderlo (se recuerda en este navegador).
  import { onMount } from 'svelte';
  import Grumete from './Grumete.svelte';
  import type { Estado } from '../lib/grumete';
  import { EV_AVISO, EV_LOCAL, EV_PREF, grumetesLocales, grumeteOculto, setGrumeteOculto, type Aviso } from '../lib/grumete-avisos';

  const KEY = 'kcna.grumete'; // sessionStorage: ya saludó en esta visita
  const SUENO = 120_000; // ms sin actividad para dormirse

  // Datos cortos y comprobables; el globo los lee el lector de pantalla (role=status) porque son contenido.
  const DATOS = [
    'Kubernetes significa «timonel» en griego. Por eso el logo es un timón… y por eso me transformo en uno.',
    'El timón tiene siete radios por «Project Seven», el nombre en clave del proyecto en Google.',
    'La unidad mínima que Kubernetes programa es el Pod, no el contenedor.',
    'Un Deployment no crea Pods: crea un ReplicaSet, y es el ReplicaSet quien crea los Pods.',
    'El scheduler solo elige el nodo. Quien arranca los contenedores es el kubelet de ese nodo.',
    'etcd guarda todo el estado del clúster, y solo el API server habla con él.',
    'Un Service encuentra sus Pods por las etiquetas (labels) de su selector, no por sus nombres.',
    'Un Secret no va cifrado por defecto: va en base64. Para cifrarlo en etcd hay que activarlo.',
    'La CNCF clasifica sus proyectos en tres niveles de madurez: sandbox, incubating y graduated.',
    '«kubectl explain pod.spec» te dice qué campos admite un recurso sin salir de la terminal.',
    'El examen KCNA dura 90 minutos y todas sus preguntas son de opción múltiple.',
    'Un Pod sin controlador que lo vigile no vuelve si se borra: por eso casi nunca se crean Pods sueltos.',
  ];
  const BIEN = ['¡Eso es!', '¡A toda vela!', '¡Buen rumbo!', '¡Bien leído!'];
  const MODULO = ['¡Módulo terminado! Rumbo al siguiente.', '¡Un puerto más en el mapa!'];

  let g: ReturnType<typeof Grumete> | undefined = $state();
  let listo = $state(false);
  let oculto = $state(false);
  let locales = $state(0);
  let estado = $state<Estado>('reposo');
  let globo = $state<{ texto: string; dato: boolean; n: number } | null>(null);

  let racha = 0, dato = Math.floor(Math.random() * DATOS.length), ultimo = Date.now();
  let lote: Aviso[] = [], tLote = 0, tGlobo = 0;
  let toques: number[] = [], desde = { x: 0, y: 0 }, arrastrado = false;
  const azar = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

  function decir(texto: string, esDato = false) {
    globo = { texto, dato: esDato, n: (globo?.n ?? 0) + 1 };
    clearTimeout(tGlobo);
    tGlobo = window.setTimeout(() => (globo = null), Math.min(9000, 2200 + texto.length * 55));
  }

  function actividad() {
    ultimo = Date.now();
    if (estado === 'dormido') { estado = 'reposo'; g?.go('saludo'); }
  }

  // Varios avisos casi a la vez son un lote (examen de módulo, simulacro): se reacciona al conjunto.
  function onAviso(e: Event) {
    lote.push((e as CustomEvent<Aviso>).detail);
    clearTimeout(tLote);
    tLote = window.setTimeout(reaccionar, 80);
    actividad();
  }
  function reaccionar() {
    const l = lote.splice(0);
    if (!g) return;
    if (l.includes('modulo')) { racha = 0; g.go('timon'); decir(azar(MODULO)); return; }
    if (l.includes('reto')) { g.go('feliz'); decir('¡Diagrama de memoria sin fallos!'); return; }
    const ok = l.filter((a) => a === 'acierto').length, total = ok + l.filter((a) => a === 'fallo').length;
    if (total > 1) {
      racha = 0;
      if (ok / total >= 0.7) { g.go('feliz'); g.go('timon'); decir(`${ok} de ${total}. ¡Buen rumbo!`); }
      else { g.go('triste'); decir(`${ok} de ${total}. Repasa los porqués y vuelve a intentarlo.`); }
    } else if (ok) {
      racha += 1;
      if (racha % 3 === 0) { g.go('timon'); decir(`¡${racha} seguidas!`); }
      else { g.go('feliz'); if (racha === 1 && Math.random() < 0.3) decir(azar(BIEN)); }
    } else if (total) {
      racha = 0; g.go('triste');
    }
  }

  // Pulsar (sin arrastrar) cuenta un dato; muchos toques seguidos lo marean.
  function onDown(e: PointerEvent) { desde = { x: e.clientX, y: e.clientY }; arrastrado = false; }
  function onMove(e: PointerEvent) { if (e.buttons && Math.hypot(e.clientX - desde.x, e.clientY - desde.y) > 6) arrastrado = true; }
  function onClick() {
    if (arrastrado) { arrastrado = false; return; }
    actividad();
    const ahora = Date.now();
    toques = [...toques.filter((t) => ahora - t < 1600), ahora];
    if (toques.length >= 4) { toques = []; g?.go('timon'); decir('¡Que me mareo!'); return; }
    dato = (dato + 1) % DATOS.length;
    g?.go(dato % 2 ? 'saludo' : 'feliz');
    decir(DATOS[dato], true);
  }

  function esconder() { globo = null; setGrumeteOculto(true); }
  function mostrar() { setGrumeteOculto(false); queueMicrotask(() => g?.go('saludo')); }

  onMount(() => {
    oculto = grumeteOculto();
    locales = grumetesLocales();
    listo = true;
    const onLocal = () => (locales = grumetesLocales());
    const onPref = () => (oculto = grumeteOculto());
    addEventListener(EV_AVISO, onAviso);
    addEventListener(EV_LOCAL, onLocal);
    addEventListener(EV_PREF, onPref);
    const eventos = ['pointerdown', 'keydown', 'scroll'] as const;
    for (const ev of eventos) addEventListener(ev, actividad, { passive: true });
    const reloj = setInterval(() => { if (estado !== 'dormido' && Date.now() - ultimo > SUENO) estado = 'dormido'; }, 10_000);
    // saludo una vez por visita, no en cada página
    let hola = false;
    try { hola = !sessionStorage.getItem(KEY); sessionStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ }
    const tHola = hola ? setTimeout(() => g?.go('saludo'), 700) : 0;
    return () => {
      removeEventListener(EV_AVISO, onAviso);
      removeEventListener(EV_LOCAL, onLocal);
      removeEventListener(EV_PREF, onPref);
      for (const ev of eventos) removeEventListener(ev, actividad);
      clearInterval(reloj); clearTimeout(tHola); clearTimeout(tLote); clearTimeout(tGlobo);
    };
  });
</script>

{#if listo && !locales}
  {#if oculto}
    <button type="button" class="volver" aria-label="Mostrar a Grumete, la mascota" title="Mostrar a Grumete" onclick={mostrar}>
      <svg viewBox="-24 -22 48 30" width="26" height="17" aria-hidden="true"><path d="M-19 0C-19 -13 -12 -19 0 -19C12 -19 19 -13 19 0Z" fill="#fff" stroke="currentColor" stroke-width="2" /><rect x="-22" y="-4" width="44" height="7" rx="3.5" fill="#1d4f91" /></svg>
    </button>
  {:else}
    <div class="companero">
      {#if globo}
        {#key globo.n}
          <p class="globo g-globo" class:dato={globo.dato} role={globo.dato ? 'status' : undefined} aria-hidden={globo.dato ? undefined : 'true'}>{globo.texto}</p>
        {/key}
      {/if}
      <button type="button" class="cuerpo" aria-label="Grumete, la mascota del curso: pulsa para un dato sobre el examen"
        onpointerdown={onDown} onpointermove={onMove} onclick={onClick}>
        <Grumete bind:this={g} {estado} energia={0.85} size={96} local={false} />
      </button>
      <button type="button" class="cerrar" aria-label="Esconder a Grumete" title="Esconder a Grumete" onclick={esconder}>
        <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
      </button>
    </div>
  {/if}
{/if}

<style>
  .companero { position: fixed; z-index: 23; left: 8px; bottom: 4px; view-transition-name: grumete; }
  .cuerpo { display: block; padding: 0; border: 0; background: none; border-radius: 50%; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .cuerpo:focus-visible { outline: 2px solid var(--helm); outline-offset: -8px; }

  .globo { position: absolute; left: 22px; bottom: calc(100% - 14px); width: max-content; max-width: min(260px, calc(100vw - 40px)); margin: 0;
    padding: 9px 12px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); color: var(--ink);
    font-size: 0.86rem; line-height: 1.4; box-shadow: var(--shadow); pointer-events: none;
    transform-origin: 18px 100%; }
  .globo.dato { border-left: 3px solid var(--helm); }
  /* piquito hacia Grumete */
  .globo::after { content: ''; position: absolute; left: 16px; top: 100%; width: 10px; height: 10px; margin-top: -5px; background: inherit;
    border: inherit; border-width: 0 1px 1px 0; rotate: 45deg; }
  .globo.dato::after { border-left-width: 0; }

  /* la × aparece al pasar por encima o con el foco; en táctil está siempre */
  .cerrar { position: absolute; top: 14px; right: 2px; width: 24px; height: 24px; display: grid; place-items: center; padding: 0;
    border: 1px solid var(--line); border-radius: 50%; background: var(--panel); color: var(--ink-2); cursor: pointer;
    opacity: 0; transition: opacity var(--dur-fast) var(--ease); }
  .companero:hover .cerrar, .cerrar:focus-visible { opacity: 1; }
  .cerrar:hover { color: var(--ink); border-color: var(--ink-3); }
  @media (hover: none) { .cerrar { opacity: 0.75; } }

  .volver { position: fixed; z-index: 23; left: 12px; bottom: 12px; width: 40px; height: 40px; display: grid; place-items: center; padding: 0;
    border: 1px solid var(--line); border-radius: 50%; background: var(--panel); color: var(--ink-2); cursor: pointer; box-shadow: var(--shadow);
    opacity: 0.8; transition: opacity var(--dur-fast), scale var(--dur-fast) var(--ease); }
  .volver:hover, .volver:focus-visible { opacity: 1; }
  .volver:active { scale: 0.94; }

  /* se aparta de lo que ocupa la parte de abajo: el lector en marcha y los diagramas guiados */
  :global(body:has(.lector.on, .dg.full, .mermaid.dg-full)) .companero, :global(body:has(.lector.on, .dg.full, .mermaid.dg-full)) .volver { display: none; }
  @media (max-width: 700px) { :global(body:has(.dg .panel)) .companero { display: none; } }
  /* pantalla estrecha: entero pero más pequeño, separado del borde para que no parezca cortado */
  @media (max-width: 560px) {
    .companero { left: 6px; bottom: 6px; }
    .companero :global(.slot) { --g-size: 64px !important; }
    .cerrar { top: 2px; right: -6px; }
    .globo { left: 10px; bottom: calc(100% - 8px); }
  }
  @media print { .companero, .volver { display: none; } }
</style>
