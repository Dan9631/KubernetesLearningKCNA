// Diplomas de finalización: presentar el examen final con un código de invitación, pedir el diploma al
// aprobarlo, consultarlo y comprobar su firma. El examen lo sortea y califica el Worker de sync/ (rutas
// /v1/examen y /v1/diplomas): aquí solo se muestran las preguntas y se envían las opciones marcadas.
// Ver docs/PLAN-DIPLOMAS.md.
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

export interface Pregunta {
  texto: string;
  opciones: string[];
  /** cuántas opciones hay que marcar */
  elige: number;
}
/** Un intento en curso: las preguntas que tocaron y hasta cuándo se puede entregar */
export interface Examen { expira: number; aprobar: number; preguntas: Pregunta[] }
/** Un intento ya entregado */
export interface Resultado { entregado: number; nota: number; aprobado: boolean; aprobar: number; aciertos?: number; total?: number; diploma: string | null }

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Dirección de la página que verifica un diploma */
export const urlVerificar = (id: string) =>
  new URL(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/verificar/?id=${id}`, location.origin).href;

const ERRORES: Record<string, string> = {
  codigo_invalido: 'Ese código de invitación no existe o ya se usó.',
  sin_intentos: 'Ese código ya no tiene intentos de examen disponibles.',
  nombre_invalido: 'Escribe tu nombre con letras, entre 3 y 80 caracteres.',
  no_aprobado: 'Este intento no permite pedir un diploma: no está aprobado o ya se usó.',
  expirado: 'Se acabó el tiempo de este intento.',
  ya_entregado: 'Este intento ya se había entregado.',
  rate_limited: 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.',
  unavailable: 'El examen todavía no está activado en este sitio.',
};

async function llamar<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${SYNC_URL}${path}`, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) return res.json();
  const { error } = await res.json().catch(() => ({ error: '' }));
  throw Object.assign(new Error(ERRORES[error] ?? `El servicio respondió ${res.status}.`), { code: error || String(res.status) });
}

/** null si no existe */
export async function consultar(id: string): Promise<Diploma | null> {
  const res = await fetch(`${SYNC_URL}/v1/diplomas/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`El servicio respondió ${res.status}.`);
  return res.json();
}

/** Empieza un intento; `intento` es el identificador secreto con el que se retoma, se entrega y se pide el diploma */
export const empezarExamen = (codigo: string) => llamar<Examen & { intento: string }>('/v1/examen', { codigo });
/** Las preguntas si sigue en curso, o el resultado si ya se entregó */
export const verIntento = (intento: string) => llamar<Examen | Resultado>(`/v1/examen/${intento}`);
/** Una lista de posiciones marcadas por pregunta, en el mismo orden */
export const entregarExamen = (intento: string, respuestas: number[][]) => llamar<Resultado>(`/v1/examen/${intento}`, { respuestas });
export const pedir = (intento: string, nombre: string) => llamar<Diploma>('/v1/diplomas', { intento, nombre });

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
