// Hoja de recuperación del código de sincronización: una página HTML autónoma (código, enlace y QR)
// que el alumno descarga o imprime para no perder la llave de su progreso. Ver docs/SINCRONIZACION.md.

export const SHEET_FILE = 'kcna-codigo-sincronizacion.html';

/** code: con guiones; href: enlace /sincronizar/#c=…; svg: el QR de ese enlace */
export function recoverySheet(code: string, href: string, svg: string): string {
  const date = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Código de sincronización · Curso KCNA</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1a1a1a; background: #fff; max-width: 640px; margin: 32px auto; padding: 0 20px; line-height: 1.5; }
  h1 { font-size: 1.4rem; margin: 0 0 4px; }
  .sub { color: #555; margin: 0 0 24px; }
  .box { border: 2px solid #1a1a1a; border-radius: 12px; padding: 20px; display: grid; grid-template-columns: 180px 1fr; gap: 20px; align-items: center; }
  .qr svg { display: block; width: 100%; height: auto; }
  .code { font-family: ui-monospace, Consolas, monospace; font-size: 1.3rem; font-weight: 700; letter-spacing: 0.04em; overflow-wrap: anywhere; }
  .url { font-family: ui-monospace, Consolas, monospace; font-size: 0.8rem; color: #333; overflow-wrap: anywhere; }
  h2 { font-size: 1.05rem; margin: 28px 0 6px; }
  ol { padding-left: 20px; margin: 0; }
  li { margin: 4px 0; }
  .warn { border-left: 4px solid #b45309; background: #fff7ed; padding: 10px 14px; margin-top: 24px; }
  @media (max-width: 520px) { .box { grid-template-columns: 1fr; } .qr { max-width: 200px; } }
  @media print { body { margin: 0 auto; } .warn { background: none; } }
</style></head><body>
<h1>Código de sincronización</h1>
<p class="sub">Curso KCNA en español · creado el ${date}</p>
<div class="box">
  <div class="qr">${svg}</div>
  <div>
    <div class="code">${code}</div>
    <p><a class="url" href="${href}">${href}</a></p>
  </div>
</div>
<h2>Para conectar otro dispositivo</h2>
<ol>
  <li>Escanea el QR con la cámara del teléfono o abre el enlace.</li>
  <li>Pulsa <strong>Conectar</strong>. Tu progreso se combina y desde ahí se mantiene igual en todos tus dispositivos.</li>
  <li>También puedes escribir el código en <em>Sincronizar › Ya tengo un código</em>, con o sin guiones.</li>
</ol>
<div class="warn"><strong>Guárdala como una contraseña.</strong> Este código es la única llave de tu progreso: quien lo tenga puede verlo y cambiarlo, y si lo pierdes nadie puede recuperar la copia del servidor. No contiene datos personales.</div>
</body></html>
`;
}
