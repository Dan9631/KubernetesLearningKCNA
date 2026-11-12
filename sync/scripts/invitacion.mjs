// Crea un código de invitación para pedir un diploma e imprime la sentencia SQL que lo da de alta.
// Uso: node scripts/invitacion.mjs [usos]   (usos: cuántos diplomas permite el código; por defecto 1)
// La sentencia se pega en la consola de la base D1 (panel de Cloudflare) o se ejecuta con
// `npx wrangler d1 execute kcna-sync --remote --command "<sentencia>"`. En la base solo queda el hash.
import { randomBytes, createHash } from 'node:crypto';

const usos = Number(process.argv[2] ?? 1);
if (!Number.isInteger(usos) || usos < 1 || usos > 1000) { console.error('usos: un entero entre 1 y 1000'); process.exit(1); }

const ALFABETO = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'; // sin letras y cifras que se confunden (I, L, O, U, 0, 1)
// sin sesgo: se descartan los bytes que no caben en un múltiplo exacto del alfabeto
let codigo = '';
while (codigo.length < 16) for (const b of randomBytes(32)) if (b < 240 && codigo.length < 16) codigo += ALFABETO[b % 30];
const hash = createHash('sha256').update(codigo).digest('hex');

console.log(`Código (entrégalo a quien vaya a pedir el diploma): ${codigo.match(/.{4}/g).join('-')}`);
console.log(`Diplomas que permite: ${usos}\n`);
console.log(`INSERT INTO invitacion (codigo_hash, usos_max, usos, creado) VALUES ('${hash}', ${usos}, 0, ${Date.now()});`);
