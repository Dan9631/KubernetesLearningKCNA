<script lang="ts">
  // Grumete como compañero de estudio: vive en la esquina inferior izquierda de cada página (la derecha es del
  // botón de lectura) y reacciona a lo que pasa en el curso a través de lib/grumete-avisos.ts.
  //  - Acierto: salta. Fallo: se derrite un poco. Tres aciertos seguidos o un módulo terminado: se vuelve timón.
  //  - Un examen entregado (aviso «lote», con su mínimo real): celebra solo si aprueba; si no, dice cuánto faltó.
  //  - Pulsarlo: cuenta un dato. En un módulo, un término de ese módulo; en otras páginas alterna datos de marinero
  //    con términos de lo que ya leíste y no has dominado. Arrastrarlo: se moldea como plastilina.
  //  - Portada: cuenta atrás del examen (14, 7, 3 días, víspera y día) con lo más flojo, y la graduación recomendada.
  //  - Laboratorio: asiente en cada paso y celebra el último. Comandos: asiente; con pistas explica por qué vuelven.
  //    Simulaciones: tras predecir, mira lo que haces en ella, sin globo.
  //  - Si no pasa nada en un buen rato se duerme, y saluda al volver (salvo leyendo o en un examen).
  //  - Modo examen (lib/grumete-avisos.ts): quieto, sin seguir el cursor, sin globos ni datos.
  //  - Leyendo un módulo: respira más despacio y no sigue el cursor, para no tirar de la vista; si el marcador
  //    ofrece «Continuar», lo mira y asiente (sin repetir lo que dice).
  //  - En /practica: avisa del formato de las preguntas que te cuestan y, al cerrar la ronda, busca un patrón en los fallos.
  //  - En la portada, además del parte del día: hitos de constancia (3, 7, 14, 30 días; 5 de 7), una vez cada uno.
  //  - Su menú (⋯) elige cuánto participa: habla, solo gestos o escondido.
  // Se aparta cuando hay otro Grumete en la página, cuando suena el lector o se abre un diagrama a pantalla completa,
  // y el alumno puede esconderlo (se recuerda en este navegador).
  import { onMount } from 'svelte';
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { ms } from '../lib/motion';
  import Grumete from './Grumete.svelte';
  import type { Estado } from '../lib/grumete';
  import { EV_AVISO, EV_HOY, EV_LOCAL, EV_MODO, EV_PREF, avisoPendiente, enExamen, grumetesLocales, guardarMemoria, leerHoy, leerMemoria, nivelGrumete, setNivelGrumete, type Aviso, type ClaseReto } from '../lib/grumete-avisos';
  import { alCargar, anotar, avisoTrampa, cierreRonda, datoAlPulsar, diasSinEstudiar, labCompleto, puedeDecir, reaccionComando, reaccionRespuesta, type Conf, type Decision, type Nivel, type Tarjeta } from '../lib/grumete-director';
  import { progress, isoDay } from '../lib/progress.svelte';

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
  const MODULO = ['¡Módulo terminado! Rumbo al siguiente.', '¡Un puerto más en el mapa!'];
  // cada clase de reto tiene su frase; el examen aprobado ya lo cuenta el lote (y el módulo terminado)
  const RETO: Record<ClaseReto, string | null> = {
    diagrama: 'Diagrama de memoria sin fallos.', terminal: 'Misión cumplida.', diagnostico: 'Caso resuelto.', examen: null, otro: null,
  };
  const esLote = (a: Aviso): a is Extract<Aviso, { tipo: 'lote' }> => typeof a === 'object' && a.tipo === 'lote';
  const esReto = (a: Aviso): a is Extract<Aviso, { tipo: 'reto' }> => typeof a === 'object' && a.tipo === 'reto';

  // modos que lo calman: examen (silencio) y lectura de un módulo (menos movimiento)
  let examen = $state(false);
  let lectura = $state(false);
  const energia = $derived(examen ? 0.3 : lectura ? 0.4 : 0.85);

  let g: ReturnType<typeof Grumete> | undefined = $state();
  let listo = $state(false);
  // habla / solo gestos / oculto (lib/grumete-avisos.ts); con «solo gestos» calla salvo si se le pulsa
  let nivel = $state<Nivel>('habla');
  const oculto = $derived(nivel === 'oculto');
  let menu = $state(false);
  let raiz: HTMLElement | undefined = $state();
  let locales = $state(0);
  let estado = $state<Estado>('reposo');
  let globo = $state<{ texto: string; dato: boolean; n: number } | null>(null);

  let racha = 0, dominadas = 0, dato =Math.floor(Math.random() * DATOS.length), ultimo = Date.now();
  let lote: Aviso[] = [], tLote = 0, tGlobo = 0, esperas = 0, pistaExplicada = false;
  let toques: number[] = [], desde = { x: 0, y: 0 }, arrastrado = false;
  const azar = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

  /** Lo que dice por su cuenta (reacciones y proactivas): con «solo gestos», nada */
  function hablar(texto: string, esDato = false) { if (nivel === 'habla') decir(texto, esDato); }
  function decir(texto: string, esDato = false) {
    globo ={ texto, dato: esDato, n: (globo?.n ?? 0) + 1 };
    clearTimeout(tGlobo);
    tGlobo = window.setTimeout(() => (globo = null), Math.min(9000, 2200 + texto.length * 55));
  }

  function actividad() {
    ultimo = Date.now();
    if (estado !== 'dormido') return;
    estado = 'reposo';
    // leyendo o en un examen despierta sin saludar: un gesto ahí tira de la vista
    if (!examen && !lectura) g?.go('saludo');
  }

  // Los avisos que llegan casi a la vez (un módulo aprobado trae lote, reto y módulo) se juntan y se reacciona
  // al más importante. El filtro de examen va al reaccionar, no al recibir: al entregar, el lote, el reto y el
  // módulo terminado llegan un instante antes de que se cierre el modo examen y no deben perderse.
  function onAviso(e: Event) {
    lote.push((e as CustomEvent<Aviso>).detail);
    clearTimeout(tLote);
    tLote = window.setTimeout(reaccionar, 80);
    actividad();
  }
  function reaccionar() {
    // recién hidratado, su figura puede no estar aún: el lote espera un poco (sin perderse)
    // (escondido o apartado no hay figura: se descarta)
    if (!g) {
      if (lote.length && !oculto && !locales && esperas++ < 10) tLote = window.setTimeout(reaccionar, 150); else lote = [];
      return;
    }
    esperas = 0;
    const l = lote.splice(0);
    if (examen && !l.some(esLote)) return; // respondiendo un examen: nada (las comprobaciones sueltas no cuentan)
    if (l.includes('modulo')) { racha = 0; g.go('timon'); hablar(azar(MODULO)); return; }
    // examen entregado: el umbral es el real de ese examen (80 % el de módulo, 75 % el simulacro)
    const ex = l.find(esLote);
    if (ex) {
      racha = 0;
      if (ex.ok >= ex.minimo) { g.go('feliz'); g.go('timon'); hablar(`${ex.ok} de ${ex.total}. ¡Aprobado!`); }
      else {
        const faltan = ex.minimo - ex.ok;
        g.go('triste');
        hablar(`${ex.ok} de ${ex.total}. ${faltan === 1 ? 'Faltó una' : `Faltaron ${faltan}`}: se aprueba con ${ex.minimo}.`);
      }
      return;
    }
    const reto = l.find(esReto);
    if (reto) { g.go('feliz'); const f = RETO[reto.clase]; if (f) hablar(f); return; }
    // fin de una ronda de práctica: un patrón en los fallos (o la ronda limpia, su momento de timón)
    const ronda = l.find((a): a is Extract<Aviso, { tipo: 'ronda' }> => typeof a === 'object' && a.tipo === 'ronda');
    if (ronda) { racha = 0; const d = cierreRonda(ronda.ok, ronda.total, ronda.fallos); if (d) ejecutar(d, true); return; }
    // pregunta de un tipo que le cuesta: aviso de formato (informa: se anuncia)
    const trampa = l.find((a): a is Extract<Aviso, { tipo: 'trampa' }> => typeof a === 'object' && a.tipo === 'trampa');
    if (trampa) { const d = avisoTrampa(trampa.tipos, trampa.dichas); if (d) ejecutar({ ...d, apunta: '.round .card .q' }, true); return; }
    // el laboratorio entero: el único cierre de la parte práctica con frase
    if (l.includes('lab')) { ejecutar(labCompleto()); return; }
    // comando de memoria: asiente; con pistas, una vez por página, por qué vuelve mañana
    const cmd = l.find((a): a is Extract<Aviso, { tipo: 'comando' }> => typeof a === 'object' && a.tipo === 'comando');
    if (cmd) {
      const d = reaccionComando(cmd.limpio, pistaExplicada);
      if (d.frase && nivel === 'habla') pistaExplicada = true;
      ejecutar(d, true);
      return;
    }
    // empieza a tocar una simulación tras predecir: la mira, nada más
    const mira = l.find((a): a is Extract<Aviso, { tipo: 'mira' }> => typeof a === 'object' && a.tipo === 'mira');
    if (mira) { g.mirar(mira.el); clearTimeout(tMirar); tMirar = window.setTimeout(() => g?.mirar(null), 4000); return; }
    // acuses pequeños: un paso del laboratorio o una tarjeta dominada; asiente sin hablar (cada 5 tarjetas, se alegra)
    if (l.includes('paso')) { g.go('asiente'); return; }
    if (l.includes('dominada')) { dominadas += 1; g.go(dominadas % 5 ? 'asiente' : 'feliz'); return; }
    // respuestas sueltas: el director decide según la confianza; en la esquina casi siempre es solo un gesto
    const resp = l.flatMap((a): { ok: boolean; conf?: Conf }[] =>
      a === 'acierto' ? [{ ok: true }] : a === 'fallo' ? [{ ok: false }] : typeof a === 'object' && a.tipo === 'respuesta' ? [{ ok: a.ok, conf: a.conf }] : []);
    // ya respondió: lo que dijera antes (un aviso de formato) ya no viene a cuento
    if (resp.length && globo) { globo = null; clearTimeout(tGlobo); }
    const fallo = resp.find((x) => !x.ok);
    if (fallo) { racha = 0; ejecutar(reaccionRespuesta(false, fallo.conf, 0, 'esquina')); return; }
    if (resp.length) { racha += 1; ejecutar(reaccionRespuesta(true, resp[resp.length - 1].conf, racha, 'esquina')); }
  }

  /** Ejecuta una decisión del director: gestos, mirada (si apunta a algo) y frase */
  let tPensar = 0, tMirar = 0;
  function ejecutar(d: Decision, informa = false) {
    if (!g) return;
    if (d.estado) { estado = d.estado; clearTimeout(tPensar); tPensar = window.setTimeout(() => { if (estado === 'pensando') estado = 'reposo'; }, 1400); }
    for (const x of d.gestos) g.go(x);
    const el = d.apunta ? document.querySelector(d.apunta) : null;
    if (el) { g.mirar(el); clearTimeout(tMirar); tMirar = window.setTimeout(() => g?.mirar(null), 5000); }
    if (d.frase) hablar(d.frase, informa);
  }

  // Por iniciativa propia, como mucho una frase por página (y tres al día, sin repetir: memoria del director).
  // Al cargar: la vuelta tras días sin estudiar y, en la portada, el parte del día con los datos de «Hoy».
  let hablo = false;
  function proactiva() {
    if (hablo || examen || !g) return;
    // en la portada espera a los datos de «Hoy» (llegan con su aviso): sin ellos diría algo más pobre
    if (!leerHoy() && document.querySelector('astro-island[component-url*="Hoy"]')) return;
    const hoy = isoDay();
    const m = leerMemoria(hoy);
    const d = nivel === 'habla' ? alCargar(diasSinEstudiar(progress.days, hoy), hoy, leerHoy(), m, progress.days) : null;
    if (d && puedeDecir(m, d)) {
      hablo = true;
      guardarMemoria(anotar(m, d));
      ejecutar(d, true); // trae información nueva: el globo se anuncia (role=status)
      return;
    }
    // leyendo, con la posición guardada: el marcador ya dice «Te quedaste en…»; él solo lo mira y asiente
    const continuar = lectura ? document.querySelector('.marcador .btn.primary') : null;
    if (continuar) { hablo = true; ejecutar({ gestos: ['asiente'], apunta: '.marcador .btn.primary' }); }
  }

  // Pulsar (sin arrastrar) cuenta un dato que venga a cuento (director: datoAlPulsar); muchos toques seguidos lo marean.
  // Los términos (data/flashcards.json) se cargan aparte y solo cuando se va a pulsar: no pesan en cada página.
  let tarjetas: Promise<Tarjeta[]> | undefined;
  const cargarTarjetas = () => (tarjetas ??= import('../data/flashcards.json').then((m) => m.default as Tarjeta[]).catch(() => []));
  function onDown(e: PointerEvent) { desde = { x: e.clientX, y: e.clientY }; arrastrado = false; cargarTarjetas(); }
  function onMove(e: PointerEvent) { if (e.buttons && Math.hypot(e.clientX - desde.x, e.clientY - desde.y) > 6) arrastrado = true; }
  async function onClick() {
    if (arrastrado) { arrastrado = false; return; }
    actividad();
    // en un examen no da datos (serían pistas): solo un gesto de «aquí estoy»
    if (examen) { g?.go('asiente'); return; }
    const ahora = Date.now();
    toques = [...toques.filter((t) => ahora - t < 1600), ahora];
    if (toques.length >= 4) { toques = []; g?.go('timon'); decir('¡Que me mareo!'); return; }
    dato += 1;
    g?.go(dato % 2 ? 'saludo' : 'feliz');
    const mod = Number(location.pathname.match(/\/modulos\/(\d{2})/)?.[1]) || undefined;
    const leidos = [...Object.keys(progress.reading), ...progress.done].map(Number);
    decir(datoAlPulsar(await cargarTarjetas(), mod, leidos, progress.known, dato, DATOS), true);
  }

  function elegir(n: Nivel) {
    menu = false;
    if (n !== 'habla') { globo = null; clearTimeout(tGlobo); }
    setNivelGrumete(n);
    if (n === 'gestos') queueMicrotask(() => g?.go('asiente'));
  }
  function mostrar() { setNivelGrumete('habla'); queueMicrotask(() => g?.go('saludo')); }

  onMount(() => {
    nivel = nivelGrumete();
    locales = grumetesLocales();
    listo = true;
    const onLocal = () => (locales = grumetesLocales());
    const onPref = () => (nivel = nivelGrumete());
    // el menú se cierra al pulsar fuera o con Escape
    const cerrarMenu = (e: Event) => {
      if (!menu) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !raiz?.contains(e.target as Node)) menu = false;
    };
    addEventListener('pointerdown', cerrarMenu);
    addEventListener('keydown', cerrarMenu);
    // al entrar en un examen se calla al instante: fuera el globo que hubiera y a reposo
    const onModo = () => {
      examen = enExamen();
      if (examen) { globo = null; clearTimeout(tGlobo); if (estado !== 'dormido') estado = 'reposo'; }
    };
    onModo();
    lectura = !!document.querySelector('article .prose');
    addEventListener(EV_AVISO, onAviso);
    // lo que se avisó justo antes de hidratarse (p. ej. la primera pregunta de una ronda que arranca al cargar)
    const pendiente = avisoPendiente();
    if (pendiente) { lote.push(pendiente); tLote = window.setTimeout(reaccionar, 700); }
    addEventListener(EV_LOCAL, onLocal);
    addEventListener(EV_PREF, onPref);
    addEventListener(EV_MODO, onModo);
    const eventos = ['pointerdown', 'keydown', 'scroll'] as const;
    for (const ev of eventos) addEventListener(ev, actividad, { passive: true });
    const reloj = setInterval(() => { if (estado !== 'dormido' && Date.now() - ultimo > SUENO) estado = 'dormido'; }, 10_000);
    // saludo una vez por visita, no en cada página
    let hola = false;
    try { hola = !sessionStorage.getItem(KEY); sessionStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ }
    const tHola = hola && !examen ? setTimeout(() => g?.go('saludo'), 700) : 0;
    // la frase del día llega después del saludo, cuando la página ya está quieta; si «Hoy» se hidrata más tarde,
    // su aviso la vuelve a intentar (solo en los primeros segundos: luego sería interrumpir)
    const tProactiva = setTimeout(proactiva, 1600);
    const desde = Date.now();
    const onHoy = () => { if (Date.now() - desde < 8000 && Date.now() - desde > 1600) proactiva(); };
    addEventListener(EV_HOY, onHoy);
    return () => {
      removeEventListener(EV_AVISO, onAviso);
      removeEventListener(EV_LOCAL, onLocal);
      removeEventListener(EV_PREF, onPref);
      removeEventListener(EV_MODO, onModo);
      removeEventListener(EV_HOY, onHoy);
      removeEventListener('pointerdown', cerrarMenu);
      removeEventListener('keydown', cerrarMenu);
      clearTimeout(tProactiva); clearTimeout(tPensar); clearTimeout(tMirar);
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
    <div class="companero" bind:this={raiz}>
      {#if globo && !menu}
        {#key globo.n}
          <p class="globo g-globo" class:dato={globo.dato} role={globo.dato ? 'status' : undefined} aria-hidden={globo.dato ? undefined : 'true'}>{globo.texto}</p>
        {/key}
      {/if}
      <button type="button" class="cuerpo" class:callado={examen}
        aria-label={examen ? 'Grumete, la mascota del curso: en silencio durante el examen' : 'Grumete, la mascota del curso: pulsa para un dato'}
        onpointerdown={onDown} onpointermove={onMove} onclick={onClick}>
        <Grumete bind:this={g} {estado} {energia} seguir={!examen && !lectura} size={96} local={false} />
      </button>
      <button type="button" class="cerrar" class:abierto={menu} aria-label="Opciones de Grumete" title="Opciones de Grumete" aria-expanded={menu} aria-controls="grumete-opciones" onclick={() => (menu = !menu)}>
        <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true"><circle cx="4" cy="10" r="1.9" fill="currentColor" /><circle cx="10" cy="10" r="1.9" fill="currentColor" /><circle cx="16" cy="10" r="1.9" fill="currentColor" /></svg>
      </button>
      {#if menu}
        <div class="opciones" id="grumete-opciones" role="group" aria-label="Cuánto participa Grumete"
          in:scale={{ start: 0.94, duration: ms(180), easing: cubicOut }} out:scale={{ start: 0.96, duration: ms(110) }}>
          <button type="button" aria-pressed={nivel === 'habla'} onclick={() => elegir('habla')}><strong>Habla</strong><span>Gestos y frases cortas</span></button>
          <button type="button" aria-pressed={nivel === 'gestos'} onclick={() => elegir('gestos')}><strong>Solo gestos</strong><span>Calla, salvo si lo pulsas</span></button>
          <button type="button" onclick={() => elegir('oculto')}><strong>Esconder</strong><span>Vuelve con el botón de la esquina</span></button>
        </div>
      {/if}
    </div>
  {/if}
{/if}

<style>
  .companero { position: fixed; z-index: 23; left: 8px; bottom: 4px; view-transition-name: grumete; }
  .cuerpo { display: block; padding: 0; border: 0; background: none; border-radius: 50%; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .cuerpo:focus-visible { outline: 2px solid var(--helm); outline-offset: -8px; }
  /* en un examen se queda atrás: más tenue, para no competir con las preguntas */
  .cuerpo { transition: opacity var(--dur) linear; }
  .cuerpo.callado { opacity: 0.55; }

  .globo { position: absolute; left: 22px; bottom: calc(100% - 14px); width: max-content; max-width: min(260px, calc(100vw - 40px)); margin: 0;
    padding: 9px 12px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel); color: var(--ink);
    font-size: 0.86rem; line-height: 1.4; box-shadow: var(--shadow); pointer-events: none;
    transform-origin: 18px 100%; }
  /* los datos pueden ser una definición entera: algo más anchos */
  .globo.dato { border-left: 3px solid var(--helm); max-width: min(300px, calc(100vw - 40px)); }
  /* piquito hacia Grumete */
  .globo::after { content: ''; position: absolute; left: 16px; top: 100%; width: 10px; height: 10px; margin-top: -5px; background: inherit;
    border: inherit; border-width: 0 1px 1px 0; rotate: 45deg; }
  .globo.dato::after { border-left-width: 0; }

  /* la × aparece al pasar por encima o con el foco; en táctil está siempre */
  .cerrar { position: absolute; top: 14px; right: 2px; width: 24px; height: 24px; display: grid; place-items: center; padding: 0;
    border: 1px solid var(--line); border-radius: 50%; background: var(--panel); color: var(--ink-2); cursor: pointer;
    opacity: 0; transition: opacity var(--dur-fast) var(--ease); }
  .companero:hover .cerrar, .cerrar:focus-visible, .cerrar.abierto { opacity: 1; }
  .cerrar:hover, .cerrar.abierto { color: var(--ink); border-color: var(--ink-3); }

  /* menú de participación: nace del botón de opciones (arriba a la derecha de Grumete) */
  .opciones { position: absolute; left: 44px; bottom: calc(100% - 8px); width: max-content; max-width: min(240px, calc(100vw - 90px));
    display: grid; gap: 2px; padding: 5px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--panel);
    box-shadow: var(--shadow); transform-origin: 0 100%; }
  .opciones button { display: grid; gap: 1px; padding: 7px 10px 7px 26px; border: 0; border-radius: calc(var(--r-m) - 3px); background: none;
    color: var(--ink); text-align: left; font: inherit; font-size: 0.86rem; cursor: pointer; position: relative;
    transition: background var(--dur-fast) var(--ease); }
  .opciones button span { color: var(--ink-3); font-size: 0.78rem; }
  .opciones button:hover, .opciones button:focus-visible { background: var(--line-2); }
  .opciones button:active { scale: var(--press, 0.97); }
  /* el nivel elegido lleva su punto */
  .opciones button[aria-pressed='true']::before { content: ''; position: absolute; left: 10px; top: 13px; width: 7px; height: 7px; border-radius: 50%; background: var(--helm); }
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
