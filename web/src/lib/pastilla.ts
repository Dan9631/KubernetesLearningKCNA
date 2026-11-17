// Indicador que se desliza bajo la opción activa de un grupo (pestañas, segmentados): use:pastilla en el contenedor.
// Mide la opción marcada (aria-selected / aria-checked / aria-pressed) y mueve un <span class="pastilla"> con
// variables CSS; la transición vive en global.css (.pastilla-lista), así que un clic a mitad la redirige sin saltos.
// La primera medida se pinta sin animar. Con pestañas en dos filas (móvil) también viaja en vertical.
const ACTIVA = '[aria-selected="true"], [aria-checked="true"], [aria-pressed="true"]';

export function pastilla(node: HTMLElement, sel: string = ACTIVA) {
  const p = document.createElement('span');
  p.className = 'pastilla';
  p.setAttribute('aria-hidden', 'true');
  node.prepend(p);
  node.classList.add('con-pastilla');
  let lista = false;

  function medir() {
    const a = node.querySelector<HTMLElement>(sel);
    if (!a || !a.offsetWidth) { p.style.visibility = 'hidden'; return; }
    p.style.visibility = '';
    p.style.setProperty('--px', `${a.offsetLeft}px`);
    p.style.setProperty('--py', `${a.offsetTop}px`);
    p.style.setProperty('--pw', `${a.offsetWidth}px`);
    p.style.setProperty('--ph', `${a.offsetHeight}px`);
    // a partir del siguiente cuadro ya anima: la posición inicial no viaja desde la esquina
    if (!lista) requestAnimationFrame(() => requestAnimationFrame(() => { lista = true; node.classList.add('pastilla-lista'); }));
  }

  const mo = new MutationObserver(medir);
  mo.observe(node, { subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-checked', 'aria-pressed'] });
  // cambia de tamaño al aparecer (panel que estaba hidden), al girar el móvil o al cargar la fuente
  const ro = new ResizeObserver(medir);
  ro.observe(node);
  medir();

  return { destroy() { mo.disconnect(); ro.disconnect(); p.remove(); } };
}
