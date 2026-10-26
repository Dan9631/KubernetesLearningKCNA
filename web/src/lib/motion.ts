// Duraciones de animación que respetan prefers-reduced-motion.
export const reduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Devuelve ms (0 si el usuario pidió menos movimiento). */
export const ms = (n: number) => (reduced() ? 0 : n);

/** Espera n ms (0 con movimiento reducido): útil para encadenar etapas. */
export const wait = (n: number) => new Promise<void>((r) => setTimeout(r, ms(n)));
