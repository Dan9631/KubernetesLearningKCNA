// Prueba del director de Grumete: node src/lib/grumete-director.test.mjs
import { reaccionRespuesta, alDia, puedeDecir, anotar, memoriaVacia, MAX_DIA, diasSinEstudiar, regreso, parteDelDia, alCargar, rachaActual, hitoConstancia, cierreRonda, avisoTrampa, MAX_TRAMPAS } from './grumete-director.ts';

let n = 0; let failures = 0;
const check = (name, cond, extra = '') => { n++; if (cond) console.log(`ok ${n}: ${name}`); else { failures++; console.log(`\nFALLO ${n}: ${name}\n  ${extra}`); } };
const HOY = '2026-11-17';

// ---- respuestas según confianza ----
let d = reaccionRespuesta(false, 's', 0, 'chat');
check('seguro y fallo: triste y la idea hay que cambiarla', d.gestos[0] === 'triste' && /cambiarla/.test(d.frase), JSON.stringify(d));
d = reaccionRespuesta(false, 'd', 0, 'chat');
check('dudo y fallo: «Casi»', /^Casi/.test(d.frase));
d = reaccionRespuesta(true, 'd', 1, 'chat');
check('dudo y acierto: feliz y «Dudabas»', d.gestos[0] === 'feliz' && /Dudabas/.test(d.frase));
d = reaccionRespuesta(true, 'a', 1, 'chat');
check('adivino y acierto: pensando, asiente y vuelve pronto', d.estado === 'pensando' && d.gestos[0] === 'asiente' && /vuelve/.test(d.frase));
d = reaccionRespuesta(true, 's', 1, 'chat');
check('seguro y acierto: asiente, sin elogio', d.gestos[0] === 'asiente' && !/!/.test(d.frase));
d = reaccionRespuesta(true, 's', 3, 'chat');
check('tres seguidas: timón', d.gestos[0] === 'timon' && /3 seguidas/.test(d.frase));
d = reaccionRespuesta(true, 'a', 3, 'chat');
check('tres seguidas adivinando: no celebra', d.gestos[0] !== 'timon');
for (const [ok, conf] of [[true, 's'], [true, 'd'], [true, 'a'], [false, 's'], [false, 'd']]) {
  check(`esquina (${ok ? 'acierto' : 'fallo'}, ${conf}): solo gesto`, !reaccionRespuesta(ok, conf, 1, 'esquina').frase);
}
check('esquina: la racha sí se dice', !!reaccionRespuesta(true, 'd', 6, 'esquina').frase);

// ---- memoria y presupuesto ----
let m = alDia(null, HOY);
check('memoria vacía', m.proactivas === 0 && m.dia === HOY);
check('otro día: empieza de cero', alDia({ dia: '2026-11-16', proactivas: 3, dichas: ['x'] }, HOY).proactivas === 0);
const f = { gestos: ['saludo'], frase: 'hola', clave: 'k1' };
check('puede decir la primera', puedeDecir(m, f));
m = anotar(m, f);
check('no repite la misma clave el mismo día', !puedeDecir(m, f));
m = anotar(anotar(m, { gestos: [], frase: 'a', clave: 'k2' }), { gestos: [], frase: 'b', clave: 'k3' });
check(`tope de ${MAX_DIA} al día`, !puedeDecir(m, { gestos: [], frase: 'c', clave: 'k4' }));
check('sin frase no cuenta', !puedeDecir(memoriaVacia(HOY), { gestos: ['asiente'] }));

// ---- días sin estudiar ----
check('nunca estudió: null', diasSinEstudiar([], HOY) === null);
check('estudió ayer: 1', diasSinEstudiar(['2026-11-16'], HOY) === 1);
check('hoy no cuenta como último día', diasSinEstudiar(['2026-11-13', HOY], HOY) === 4);
check('cruza de mes', diasSinEstudiar(['2026-10-30'], '2026-11-02') === 3);

// ---- vuelta tras ausencia ----
check('2 días: nada', regreso(2, HOY) === null);
let r = regreso(4, HOY);
check('4 días sin datos: dónde están los repasos', /Cuatro días en puerto/.test(r.frase) && /Hoy/.test(r.frase) && !r.apunta, r.frase);
r = regreso(4, HOY, { due: 18, sure: 0, cmdDue: 4, tomorrow: 0 });
check('4 días con datos: cuántos repasos', /22 repasos/.test(r.frase) && !!r.apunta, r.frase);
check('un solo repaso pendiente: singular', /un solo repaso/.test(regreso(4, HOY, { due: 1, sure: 0, cmdDue: 0, tomorrow: 0 }).frase));
check('sin reproche', !/(deberías|abandon|olvid)/i.test(r.frase));
r = regreso(12, HOY);
check('12 días: número en cifra', /^12 días/.test(r.frase), r.frase);

// ---- parte del día ----
let p = parteDelDia({ due: 14, sure: 3, cmdDue: 0, tomorrow: 5 }, HOY);
check('fallos con seguridad primero', /Hoy tocan 14; 3 son ideas que dabas por seguras\. Empezamos por esas\./.test(p.frase), p.frase);
p = parteDelDia({ due: 5, sure: 1, cmdDue: 2, tomorrow: 0 }, HOY);
check('singular: una idea', /una es una idea que dabas por segura\. Empezamos por esa\./.test(p.frase), p.frase);
p = parteDelDia({ due: 8, sure: 0, cmdDue: 0, tomorrow: 0 }, HOY);
check('solo repasos: cuántos y minutos', /Hoy tocan 8 repasos\. Unos 6 minutos\./.test(p.frase), p.frase);
p = parteDelDia({ due: 0, sure: 0, cmdDue: 0, tomorrow: 3, leyendo: { mod: '06', titulo: 'Networking' } }, HOY);
check('al día y leyendo: seguir con el módulo', /Módulo 06/.test(p.frase), p.frase);
p = parteDelDia({ due: 0, sure: 0, cmdDue: 0, tomorrow: 0, siguiente: 'aprueba el examen del módulo 07.' }, HOY);
check('al día: siguiente paso sin doble punto', /Siguiente: aprueba el examen del módulo 07\.$/.test(p.frase), p.frase);
check('un solo repaso: singular', parteDelDia({ due: 1, sure: 0, cmdDue: 0, tomorrow: 0 }, HOY).frase === 'Hoy toca un repaso: un minuto y listo.');
check('2 repasos: «Unos 2 minutos»', /Unos 2 minutos\./.test(parteDelDia({ due: 2, sure: 0, cmdDue: 0, tomorrow: 0 }, HOY).frase));
check('nada que decir: null', parteDelDia({ due: 0, sure: 0, cmdDue: 0, tomorrow: 0 }, HOY) === null);
check('la clave es del día', parteDelDia({ due: 1, sure: 0, cmdDue: 0, tomorrow: 0 }, HOY).clave === `parte:${HOY}`);

// ---- al cargar ----
check('ausencia gana al parte del día', /puerto/.test(alCargar(5, HOY, { due: 3, sure: 0, cmdDue: 0, tomorrow: 0 }).frase));
check('sin ausencia, en la portada: parte del día', /Hoy tocan/.test(alCargar(1, HOY, { due: 3, sure: 0, cmdDue: 0, tomorrow: 0 }).frase));
check('sin ausencia, fuera de la portada: nada', alCargar(1, HOY) === null);
const datos = { due: 3, sure: 0, cmdDue: 0, tomorrow: 0 };
const yaDijo = anotar(memoriaVacia(HOY), regreso(5, HOY, datos));
check('vuelta ya dicha: pasa al parte del día', /Hoy tocan/.test(alCargar(5, HOY, datos, yaDijo).frase));
const todoDicho = anotar(yaDijo, parteDelDia(datos, HOY));
check('todo dicho hoy: nada', alCargar(5, HOY, datos, todoDicho) === null);

// ---- constancia ----
const seguidos = (n, hasta = HOY) => { const out = []; const t = new Date(hasta + 'T12:00:00'); for (let k = n - 1; k >= 0; k--) { const d = new Date(t.getTime() - k * 86_400_000); out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); } return out; };
check('racha hasta hoy', rachaActual(seguidos(4), HOY).n === 4);
check('racha hasta ayer (hoy aún no estudió)', rachaActual(seguidos(3, '2026-11-16'), HOY).n === 3);
check('racha rota: 0', rachaActual(seguidos(3, '2026-11-15'), HOY).n === 0);
check('racha que cruza de mes', rachaActual(seguidos(5, '2026-11-02'), '2026-11-02').desde === '2026-10-29');
check('2 días: sin hito', hitoConstancia(seguidos(2), HOY) === null);
let h = hitoConstancia(seguidos(7), HOY);
check('7 seguidos: timón y su frase', h.gestos[0] === 'timon' && /Siete días seguidos/.test(h.frase) && h.perdura, JSON.stringify(h));
check('9 seguidos: el hito alcanzado es el de 7', /Siete/.test(hitoConstancia(seguidos(9), HOY).frase));
check('la clave lleva el inicio de la racha', hitoConstancia(seguidos(3), HOY).clave === 'hito:racha3:2026-11-15');
const cinco = ['2026-11-11', '2026-11-12', '2026-11-14', '2026-11-15', HOY]; // racha de 2 hasta hoy (16 no)
h = hitoConstancia(cinco, HOY);
check('5 de 7 sin racha larga', /Cinco de los últimos siete/.test(h.frase) && h.clave === 'hito:cinco:2026-11-16', JSON.stringify(h));
check('sin culpa ni contador', !/(perdiste|rompiste|racha de)/i.test(hitoConstancia(seguidos(14), HOY).frase));
let mh = anotar(memoriaVacia(HOY), hitoConstancia(seguidos(7), HOY));
check('hito celebrado: no se repite', !puedeDecir(mh, hitoConstancia(seguidos(7), HOY)));
mh = alDia(mh, '2026-11-18');
check('otro día: el hito sigue celebrado', !puedeDecir(mh, hitoConstancia(seguidos(8, '2026-11-18'), '2026-11-18')) && mh.proactivas === 0);
check('memoria antigua sin hitos: no rompe', alDia({ dia: HOY, proactivas: 1, dichas: [] }, HOY).hitos.length === 0);
check('portada: el hito va después del parte del día', /Hoy tocan/.test(alCargar(1, HOY, datos, memoriaVacia(HOY), seguidos(7)).frase));
check('parte ya dicho: llega el hito', /Siete/.test(alCargar(1, HOY, datos, anotar(memoriaVacia(HOY), parteDelDia(datos, HOY)), seguidos(7)).frase));
check('fuera de la portada: sin hito', alCargar(1, HOY, undefined, undefined, seguidos(7)) === null);

// ---- cierre de ronda ----
check('ronda vacía: nada', cierreRonda(0, 0, []) === null);
let c = cierreRonda(20, 20, []);
check('ronda limpia: timón', c.gestos[0] === 'timon' && /Ronda limpia/.test(c.frase));
check('ronda corta limpia: solo gesto', !cierreRonda(3, 3, []).frase);
c = cierreRonda(16, 20, [{ topic: 'Scheduling', module: 4 }, { topic: 'Networking', module: 6 }, { topic: 'Scheduling', module: 4 }, { topic: 'Security', module: 8 }]);
check('dos del mismo tema: el tema y su módulo', c.frase === 'Dos fallos son del mismo tema: Scheduling. El Módulo 04 lo explica.' && c.apunta.includes('/modulos/04'), c.frase);
c = cierreRonda(17, 20, [{ topic: 'Networking', module: 6 }, { topic: 'Networking', module: 7 }, { topic: 'Networking', module: 6 }]);
check('todos del mismo tema: el módulo más repetido', /^Todos los fallos son del mismo tema: Networking\. El Módulo 06/.test(c.frase), c.frase);
c = cierreRonda(18, 20, [{ topic: 'Scheduling', module: 4 }, { topic: 'Security', module: 8 }]);
check('sin patrón: repasarlos ya', /^Dos fallos: repásalos ahora/.test(c.frase) && c.apunta.includes('btn.primary'), c.frase);
check('un fallo: singular', /^Un fallo: repásalo/.test(cierreRonda(19, 20, [{ topic: 'Storage', module: 9 }]).frase));

// ---- trampas de formato ----
check('negación primero', /opción falsa/.test(avisoTrampa(['multi', 'neg'], 0).frase));
check('ningún tipo débil: nada', avisoTrampa([], 0) === null);
check(`como mucho ${MAX_TRAMPAS} por ronda`, avisoTrampa(['neg'], MAX_TRAMPAS) === null);
check('no da la respuesta (habla del formato)', !/(correcta es|la respuesta)/i.test(avisoTrampa(['superl'], 0).frase));

console.log(failures ? `\n${failures} de ${n} pruebas fallaron` : `\n${n} pruebas correctas`);
if (failures) process.exit(1);
