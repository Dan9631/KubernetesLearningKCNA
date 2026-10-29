<script lang="ts">
  // "Seguir en otro dispositivo": enlace con las posiciones de lectura y su código QR para abrirlo en el teléfono.
  import { shareUrl } from '../lib/lectura';
  import { syncAvailable, sync } from '../lib/sync.svelte';
  import { url } from '../lib/modules';

  // boton=false: sin botón propio; otro componente abre el diálogo con open() (bind:this)
  let { label = 'Seguir en el teléfono', boton = true }: { label?: string; boton?: boolean } = $props();
  let dlg: HTMLDialogElement | undefined = $state();
  let link = $state<{ href: string; local: boolean } | null>(null);
  let svg = $state('');
  let copied = $state(false);
  const uid = $props.id(); // puede haber varios en la página (aviso y botón flotante)

  export async function open() {
    link = shareUrl();
    if (!link) return;
    // la librería del QR solo se descarga al abrir el diálogo
    const { default: qrcode } = await import('qrcode-generator');
    const qr = qrcode(0, 'M');
    qr.addData(link.href);
    qr.make();
    svg = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    copied = false;
    dlg?.showModal();
  }
  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.href); copied = true; } catch { copied = false; }
  }
</script>

{#if boton}
<button type="button" class="btn small" onclick={open}>
  <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><rect x="5.5" y="2.5" width="9" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M9 15h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
  {label}
</button>
{/if}

<dialog bind:this={dlg} aria-labelledby="{uid}-t" onclick={(e) => { if (e.target === dlg) dlg?.close(); }}>
  {#if link}
    <h2 id="{uid}-t">Sigue leyendo en otro dispositivo</h2>
    <p>Escanea el código con la cámara del teléfono. Se abre el módulo donde te quedaste y guarda tus posiciones de lectura en ese navegador.</p>
    <div class="qr" role="img" aria-label="Código QR del enlace">{@html svg}</div>
    <label class="url"><span class="visually-hidden">Enlace</span><input readonly value={link.href} onfocus={(e) => e.currentTarget.select()} /></label>
    {#if link.local}<p class="note">Estás en una copia local del curso, así que el enlace apunta al sitio publicado, que sí abre desde el teléfono.</p>{/if}
    {#if syncAvailable && !sync.code}
      <p class="note">Solo lleva las posiciones de lectura. Para llevar también tu práctica y tus repasos, <a href={url('/sincronizar/')}>activa la sincronización</a>.</p>
    {:else if !syncAvailable}
      <p class="note">Solo lleva las posiciones de lectura; tus estadísticas de práctica se quedan en este navegador.</p>
    {/if}
    <div class="row">
      <button type="button" class="btn small primary" onclick={copy}>{copied ? 'Copiado' : 'Copiar enlace'}</button>
      <button type="button" class="btn small" onclick={() => dlg?.close()}>Cerrar</button>
    </div>
  {/if}
</dialog>

<style>
  dialog { border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); color: var(--ink); padding: 20px; width: min(380px, calc(100vw - 32px)); box-shadow: 0 20px 50px rgb(0 0 0 / 0.25); }
  dialog::backdrop { background: rgb(0 0 0 / 0.45); }
  h2 { font-size: 1.1rem; }
  p { color: var(--ink-2); font-size: 0.9rem; margin-top: 6px; }
  /* el QR siempre en blanco y negro (también en modo oscuro), para que la cámara lo lea */
  .qr { background: #fff; border-radius: var(--r-m); padding: 10px; margin: 14px auto 10px; width: min(240px, 100%); }
  .qr :global(svg) { display: block; width: 100%; height: auto; }
  .url input { width: 100%; font: 0.8rem var(--mono); padding: 6px 8px; border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); color: var(--ink); }
  .note { font-size: 0.82rem; color: var(--ink-3); }
  .row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
</style>
