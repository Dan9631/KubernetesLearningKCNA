<script lang="ts">
  // La hoja del diploma: se ve en pantalla y se guarda como PDF con la impresión del navegador (A4 apaisado).
  // Los colores son fijos, no los del tema: es papel, y debe salir igual en claro, en oscuro y en el PDF.
  import { onMount } from 'svelte';
  import { urlVerificar, FIRMANTE, type Diploma } from '../lib/diploma';

  let { diploma }: { diploma: Diploma } = $props();

  let marco = $state<HTMLElement>();
  let qr = $state('');
  const url = $derived(urlVerificar(diploma.id));
  // en la hoja van por separado la página (sin https:// ni el identificador) y el identificador, cada uno en su línea
  const pagina = $derived(url.split('?')[0].replace(/^https?:[/][/]/, ''));
  const fecha = $derived(new Intl.DateTimeFormat('es', { dateStyle: 'long' }).format(new Date(diploma.emitido)));
  // los nombres largos bajan de tamaño para no pasar de dos líneas
  // Formulario de «Licencias y certificaciones» de LinkedIn ya relleno. El nombre dice que es la constancia
  // del curso, para que no se confunda con la certificación KCNA
  const linkedin = $derived.by(() => {
    const d = new Date(diploma.emitido);
    return `https://www.linkedin.com/profile/add?${new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: `Constancia de finalización del curso ${diploma.curso}`,
      organizationName: FIRMANTE.nombre || diploma.curso,
      issueYear: String(d.getFullYear()),
      issueMonth: String(d.getMonth() + 1),
      certUrl: url,
      certId: diploma.id,
    })}`;
  });
  const talla = $derived(diploma.nombre.length <= 24 ? 'xl' : diploma.nombre.length <= 40 ? 'l' : diploma.nombre.length <= 60 ? 'm' : 's');

  onMount(async () => {
    const { default: qrcode } = await import('qrcode-generator');
    const q = qrcode(0, 'M');
    q.addData(url);
    q.make();
    qr = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  });

  // Imprime solo la hoja: se copia al final de <body> y se oculta todo lo demás mientras dura la impresión
  const IMPRESION = `
    @page { size: A4 landscape; margin: 0; }
    @media screen { .diploma-print { display: none; } }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body > :not(.diploma-print) { display: none !important; }
      .diploma-print { width: 297mm; height: 209.8mm; overflow: hidden; }
      .diploma-print .hoja { border-radius: 0 !important; box-shadow: none !important; border: 0 !important; }
    }`;

  function imprimir() {
    if (!marco) return;
    const copia = document.createElement('div');
    copia.className = 'diploma-print';
    copia.append(marco.cloneNode(true));
    const estilo = document.createElement('style');
    estilo.textContent = IMPRESION;
    const titulo = document.title;
    document.title = `Constancia - ${diploma.nombre}`; // el navegador lo propone como nombre del archivo
    document.head.append(estilo);
    document.body.append(copia);
    window.addEventListener('afterprint', () => { copia.remove(); estilo.remove(); document.title = titulo; }, { once: true });
    window.print();
  }
</script>

<div class="marco" bind:this={marco}>
  <div class="hoja">
    <div class="filete">
      <p class="titulo">Constancia de finalización del curso</p>
      <p class="otorga">Se otorga a</p>
      <p class="nombre {talla}">{diploma.nombre}</p>
      <p class="motivo">
        por completar el curso <strong>{diploma.curso}</strong>, de preparación para KCNA, y aprobar su examen final{#if diploma.nota !== null}&nbsp;con una nota de <strong>{diploma.nota}&nbsp;%</strong>{/if}.
      </p>

      <div class="pie">
        <div class="firma">
          {#if FIRMANTE.nombre}
            <p class="quien">{FIRMANTE.nombre}</p>
            {#if FIRMANTE.cargo}<p class="dato">{FIRMANTE.cargo}</p>{/if}
          {:else}
            <p class="quien">{diploma.curso}</p>
          {/if}
          <p class="dato">Emitida el {fecha}</p>
        </div>
        <div class="verifica">
          <div class="textos">
            <p class="dato">Comprueba que es auténtica en</p>
            <p class="url">{pagina}</p>
            <p class="dato">Identificador</p>
            <p class="url">{diploma.id}</p>
          </div>
          <div class="qr" aria-hidden="true">{@html qr}</div>
        </div>
      </div>

      <p class="aviso">Esta constancia acredita que se terminó este curso. No es la certificación KCNA, que solo emiten la CNCF y la Linux Foundation.</p>
    </div>
  </div>
</div>

<div class="row">
  <button type="button" class="btn primary" onclick={imprimir}>Guardar como PDF</button>
  <a class="btn" href={linkedin} target="_blank" rel="noopener noreferrer">Añadir a LinkedIn</a>
</div>
<p class="muted">«Guardar como PDF» abre la impresión del navegador: elige ese destino. «Añadir a LinkedIn» abre en tu perfil el formulario de Licencias y certificaciones ya relleno.</p>

<style>
  /* todas las medidas de la hoja van en cqw (centésimas del ancho) para que escale igual en pantalla y en el papel */
  .marco { container-type: inline-size; margin-top: 18px; }
  .hoja {
    aspect-ratio: 297 / 210; box-sizing: border-box; padding: 2.4cqw;
    background: #fff; color: #10213a; border: 1px solid #d3dbe6; border-radius: 1cqw; box-shadow: var(--shadow);
    font-family: var(--sans); line-height: 1.35;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .filete {
    height: 100%; box-sizing: border-box; padding: 4.2cqw 6cqw 2.6cqw;
    border: 0.3cqw solid #2f5fd0; outline: 0.1cqw solid #2f5fd0; outline-offset: -1cqw;
    display: flex; flex-direction: column; align-items: center; text-align: center;
  }
  p { margin: 0; color: inherit; }
  .titulo { font-size: 1.85cqw; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: #1d3f94; }
  .otorga { font-size: 1.9cqw; color: #4a5a72; margin-top: auto; padding-top: 2cqw; }
  .nombre { font-weight: 600; line-height: 1.12; margin-top: 1.4cqw; padding-bottom: 1.6cqw; border-bottom: 0.15cqw solid #d3dbe6; min-width: 46%; max-width: 100%; overflow-wrap: anywhere; text-wrap: balance; }
  .nombre.xl { font-size: 5.6cqw; }
  .nombre.l { font-size: 4.4cqw; }
  .nombre.m { font-size: 3.5cqw; }
  .nombre.s { font-size: 2.9cqw; }
  .motivo { font-size: 2.1cqw; color: #4a5a72; margin-top: 2.4cqw; padding-bottom: 2cqw; max-width: 76%; text-wrap: balance; }
  .motivo strong { color: #10213a; font-weight: 600; }

  .pie { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; gap: 3cqw; text-align: left; }
  .firma { min-width: 0; padding-top: 1cqw; border-top: 0.15cqw solid #10213a; flex: 0 1 37%; }
  .quien { font-size: 1.7cqw; font-weight: 600; }
  .dato { font-size: 1.45cqw; color: #4a5a72; margin-top: 0.3cqw; }
  .verifica { display: flex; align-items: flex-end; gap: 1.6cqw; min-width: 0; }
  .textos { min-width: 0; text-align: right; }
  .url { font-family: var(--mono); font-size: 1cqw; color: #10213a; margin-top: 0.2cqw; white-space: nowrap; }
  .textos .dato + .url + .dato { margin-top: 0.9cqw; }
  .qr { flex: none; width: 11cqw; height: 11cqw; }
  .qr :global(svg) { display: block; width: 100%; height: 100%; }
  .aviso { font-size: 1.2cqw; color: #5f6b80; margin-top: 2.2cqw; }

  .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 14px; }
  .muted { color: var(--ink-3); font-size: 0.86rem; margin-top: 8px; max-width: var(--measure); }
</style>
