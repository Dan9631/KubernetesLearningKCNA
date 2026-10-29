<script lang="ts">
  // Página /sincronizar: activar la sincronización, conectar otro dispositivo (código o QR) y gestionarla.
  import { onMount } from 'svelte';
  import { sync, syncAvailable, newCode, normalizeCode, prettyCode, connect, disconnect, deleteRemote, syncNow, connectUrl } from '../lib/sync.svelte';
  import { fmtDate } from './practica/quiz';

  let input = $state('');
  let fromLink = $state(''); // código recibido por el enlace del QR
  let showCode = $state(false);
  let svg = $state('');
  let askDelete = $state(false);
  let copied = $state(false);
  let busy = $state(false);
  const typed = $derived(normalizeCode(input));

  onMount(() => {
    const m = location.hash.match(/^#c=([0-9A-Za-z-]+)$/);
    if (m) {
      fromLink = normalizeCode(m[1]);
      history.replaceState(null, '', location.pathname + location.search); // el código no se queda en el historial
    }
  });

  async function run(fn: () => Promise<void>) { busy = true; try { await fn(); } finally { busy = false; } }
  const activate = () => run(() => connect(newCode())).then(() => reveal());
  const join = (code: string) => run(() => connect(code)).then(() => { fromLink = ''; input = ''; });

  async function reveal() {
    if (!sync.code) return;
    const { default: qrcode } = await import('qrcode-generator');
    const qr = qrcode(0, 'M');
    qr.addData(connectUrl(sync.code).href);
    qr.make();
    svg = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    showCode = true;
  }
  async function copy() {
    try { await navigator.clipboard.writeText(prettyCode(sync.code)); copied = true; setTimeout(() => (copied = false), 1600); } catch { /* sin portapapeles */ }
  }
</script>

{#if !syncAvailable}
  <div class="card">
    <h2>No disponible en esta copia</h2>
    <p>Esta copia del sitio se generó sin un servicio de sincronización (variable <code>PUBLIC_SYNC_URL</code>). Tu progreso sigue guardado en este navegador, y puedes llevar tu posición de lectura al teléfono con el código QR del botón flotante de cada módulo.</p>
  </div>
{:else if fromLink && fromLink !== sync.code}
  <div class="card hl">
    <h2>Conectar este dispositivo</h2>
    <p>Abriste un enlace de sincronización con el código <strong class="mono">{prettyCode(fromLink)}</strong>. Al conectar, el progreso de este navegador se combina con el guardado y desde ahí se mantienen iguales.</p>
    {#if sync.code}<p class="warn">Este dispositivo ya usa otro código. Si conectas, deja de sincronizarse con el anterior (sus datos siguen en el servidor).</p>{/if}
    <div class="row">
      <button type="button" class="btn primary" disabled={busy} onclick={() => join(fromLink)}>Conectar</button>
      <button type="button" class="btn" onclick={() => (fromLink = '')}>Ahora no</button>
    </div>
  </div>
{:else if !sync.code}
  <div class="grid">
    <div class="card">
      <h2>Activar en este dispositivo</h2>
      <p>Se crea un <strong>código de sincronización</strong>. Con él, tu progreso (práctica, repasos, lectura, laboratorios) se mantiene igual en todos tus dispositivos.</p>
      <button type="button" class="btn primary" disabled={busy} onclick={activate}>Activar sincronización</button>
    </div>
    <div class="card">
      <h2>Ya tengo un código</h2>
      <p>Escríbelo tal como lo guardaste (con o sin guiones) o escanea el QR desde el otro dispositivo.</p>
      <label class="visually-hidden" for="code">Código de sincronización</label>
      <input id="code" class="mono" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX" bind:value={input} />
      <div class="row"><button type="button" class="btn" disabled={!typed || busy} onclick={() => join(typed)}>Conectar</button>
        {#if input && !typed}<span class="muted">Son 26 caracteres.</span>{/if}</div>
    </div>
  </div>
{:else}
  <div class="card">
    <h2>Sincronización activa</h2>
    <p class="status" class:err={sync.status === 'error'} role="status">
      {#if sync.status === 'syncing'}Sincronizando…
      {:else if sync.status === 'error'}{sync.error}
      {:else if sync.last}Sincronizado el {fmtDate(sync.last)}.
      {:else}Pendiente de la primera sincronización.{/if}
    </p>
    <div class="row">
      <button type="button" class="btn primary" disabled={sync.status === 'syncing'} onclick={() => syncNow()}>Sincronizar ahora</button>
      <button type="button" class="btn" onclick={() => (showCode ? (showCode = false) : reveal())}>{showCode ? 'Ocultar código' : 'Conectar otro dispositivo'}</button>
    </div>

    {#if showCode}
      <div class="code">
        <div class="qr" role="img" aria-label="Código QR para conectar otro dispositivo">{@html svg}</div>
        <div>
          <p>Escanéalo con el teléfono, o escribe el código en <em>Sincronizar › Ya tengo un código</em>:</p>
          <p class="big mono">{prettyCode(sync.code)}</p>
          <button type="button" class="btn small" onclick={copy}>{copied ? 'Copiado' : 'Copiar código'}</button>
          <p class="warn">Guárdalo en un lugar seguro, como tu gestor de contraseñas. Es la única llave de tus datos: el servidor no puede leerlos ni recuperarlos. Quien tenga el código puede ver y cambiar tu progreso.</p>
          {#if connectUrl(sync.code).local}<p class="muted">Estás en una copia local: el QR apunta al sitio publicado, que sí abre desde el teléfono.</p>{/if}
        </div>
      </div>
    {/if}

    <details class="more">
      <summary>Desconectar o borrar</summary>
      <div class="row">
        <button type="button" class="btn small" onclick={() => { disconnect(); showCode = false; }}>Desconectar este dispositivo</button>
        {#if !askDelete}
          <button type="button" class="btn small" onclick={() => (askDelete = true)}>Borrar mis datos del servidor</button>
        {:else}
          <span class="warn">Se borra el registro del servidor y este dispositivo se desconecta; tu progreso local se queda.</span>
          <button type="button" class="btn small" onclick={() => run(() => deleteRemote()).then(() => (askDelete = false))}>Sí, borrar</button>
          <button type="button" class="btn small" onclick={() => (askDelete = false)}>Cancelar</button>
        {/if}
      </div>
      <p class="muted">Desconectar solo olvida el código en este navegador; los otros dispositivos siguen sincronizándose.</p>
    </details>
  </div>
{/if}

{#if syncAvailable}
  <section class="how">
    <h2>Cómo protege tus datos</h2>
    <ul>
      <li><strong>Sin cuentas:</strong> no hay usuario, contraseña ni correo. Solo el código.</li>
      <li><strong>Cifrado en tu navegador:</strong> el progreso se cifra con una clave que sale del código y nunca viaja. El servidor guarda bloques que no puede leer.</li>
      <li><strong>Sin conexión también funciona:</strong> tu navegador sigue siendo la copia principal; si el servicio no responde, nada se pierde.</li>
      <li><strong>Limpieza:</strong> los registros sin uso durante 400 días se borran.</li>
    </ul>
  </section>
{/if}

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 16px; }
  .card { border: 1px solid var(--line); border-radius: var(--r-l); background: var(--panel); padding: 18px 20px; max-width: 760px; }
  .card.hl { border-color: var(--helm); }
  h2 { font-size: 1.12rem; }
  p { color: var(--ink-2); margin-top: 6px; overflow-wrap: anywhere; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
  input { width: 100%; margin-top: 10px; font-size: 0.95rem; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--r-s); background: var(--panel-2); color: var(--ink); }
  .mono { font-family: var(--mono); }
  .muted { color: var(--ink-3); font-size: 0.86rem; }
  .warn { color: var(--wait); font-size: 0.88rem; }
  .status.err { color: var(--fail); }
  .code { display: grid; grid-template-columns: minmax(0, 200px) minmax(0, 1fr); gap: 18px; align-items: start; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line-2); }
  .qr { background: #fff; border-radius: var(--r-m); padding: 8px; }
  .qr :global(svg) { display: block; width: 100%; height: auto; }
  .big { font-size: 1.05rem; color: var(--ink); letter-spacing: 0.04em; }
  .more { margin-top: 16px; font-size: 0.92rem; }
  .more summary { cursor: pointer; color: var(--ink-2); }
  .how { margin-top: 28px; max-width: 760px; }
  .how ul { margin-top: 8px; padding-left: 20px; color: var(--ink-2); display: grid; gap: 6px; }
  @media (max-width: 560px) { .code { grid-template-columns: minmax(0, 1fr); } .qr { max-width: 220px; } }
</style>
