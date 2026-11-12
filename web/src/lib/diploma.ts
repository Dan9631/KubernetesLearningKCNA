// Diplomas de finalización: pedir uno con un código de invitación, consultarlo y comprobar su firma.
// Los emite y firma el Worker de sync/ (rutas /v1/diplomas). Ver docs/PLAN-DIPLOMAS.md.
import { SYNC_URL, syncAvailable } from './sync.svelte';

/** Llave pública Ed25519 (32 bytes en base64) con la que se comprueban las firmas; vacía = no se comprueban aquí */
export const LLAVE_PUBLICA = (import.meta.env.PUBLIC_DIPLOMA_KEY ?? '').trim();
export const diplomasDisponibles = syncAvailable;

export interface Diploma {
  id: string;
  nombre: string;
  curso: string;
  nota: number | null;
  emitido: number;
  firma: string;
  revocado: number | null;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Dirección de la página que verifica un diploma */
export const urlVerificar = (id: string) =>
  new URL(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/verificar/?id=${id}`, location.origin).href;

/** null si no existe */
export async function consultar(id: string): Promise<Diploma | null> {
  const res = await fetch(`${SYNC_URL}/v1/diplomas/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`El servicio respondió ${res.status}.`);
  return res.json();
}

const ERRORES: Record<string, string> = {
  codigo_invalido: 'Ese código de invitación no existe o ya se usó.',
  nombre_invalido: 'Escribe tu nombre con letras, entre 3 y 80 caracteres.',
  rate_limited: 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.',
  unavailable: 'La emisión de diplomas todavía no está activada en este sitio.',
};

export async function pedir(codigo: string, nombre: string): Promise<Diploma> {
  const res = await fetch(`${SYNC_URL}/v1/diplomas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo, nombre }),
  });
  if (res.status === 201) return res.json();
  const { error } = await res.json().catch(() => ({ error: '' }));
  throw new Error(ERRORES[error] ?? `El servicio respondió ${res.status}.`);
}

const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/**
 * Comprueba la firma en el navegador, sin fiarse de la respuesta del servidor.
 * 'sin-comprobar': el sitio no trae la llave pública o el navegador no admite Ed25519.
 */
export async function comprobarFirma(d: Diploma): Promise<'valida' | 'invalida' | 'sin-comprobar'> {
  if (!LLAVE_PUBLICA) return 'sin-comprobar';
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey('raw', bytes(LLAVE_PUBLICA), { name: 'Ed25519' }, false, ['verify']);
  } catch {
    return 'sin-comprobar';
  }
  try {
    // el mismo texto que firma el Worker (mensajeDiploma en sync/src/index.js)
    const texto = JSON.stringify([1, d.id, d.nombre, d.curso, d.nota, d.emitido]);
    const ok = await crypto.subtle.verify('Ed25519', key, bytes(d.firma), new TextEncoder().encode(texto));
    return ok ? 'valida' : 'invalida';
  } catch {
    return 'invalida';
  }
}
