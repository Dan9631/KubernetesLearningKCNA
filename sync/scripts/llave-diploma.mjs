// Genera el par de llaves Ed25519 con el que el Worker firma los diplomas.
// Uso: node scripts/llave-diploma.mjs            (imprime las dos llaves)
//      node scripts/llave-diploma.mjs --local    (además escribe la privada en .dev.vars, para `npm run dev`)
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privada = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const publica = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64'); // los 32 bytes de la llave

if (process.argv.includes('--local')) {
  const file = new URL('../.dev.vars', import.meta.url);
  const rest = existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('DIPLOMA_KEY=')) : [];
  writeFileSync(file, [...rest, `DIPLOMA_KEY=${privada}`, ''].join('\n'));
  console.log('Llave privada de prueba escrita en .dev.vars (no se sube al repositorio).');
} else {
  console.log('Llave PRIVADA (secreto DIPLOMA_KEY del Worker; no la guardes en el repositorio):\n');
  console.log(privada);
}
console.log('\nLlave PÚBLICA (variable DIPLOMA_PUBLIC_KEY del repositorio en GitHub; se puede publicar):\n');
console.log(publica);
