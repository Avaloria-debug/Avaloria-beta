// Y7 (fase 9): recuperar lo robado. Cada robo (ext.robos) tiene ladrón, escena base y botín. Pistas: rumores con Naela,
// Sarin o en el mercado (t42.robo.rumor/rastro); pagar por información (precio de rumor) suma dos. Con pistas, en su
// escena y franja, aparece el ladrón: hablar, pagar, amenazar, denunciar (gancho de ley) o pelear. Lo robado se gasta
// con los días (10 % por día, tope 80 %) y los objetos pueden estar vendidos. Caduca a los 30 días.
import t42json from '../../data/contenido/ampliado/t42-combate.json' with { type: 'json' };
import precios from '../../data/config/precios.json' with { type: 'json' };
import { derivar } from '../azar.js';
import { normalizar } from '../comprension.js';
import { sinRepetir } from '../historial.js';
import { npcsPresentes } from '../turno.js';
import { franjaDe } from '../seleccion.js';
import { conArticulo, rellenar } from '../sistemas/combateOpciones.js';

export const DIAS_CADUCA = 30;
export const FUENTES_PISTA = Object.freeze(['naela_tabernera', 'sarin_mensajera']);
export const PROB_PISTA = 0.25;
export const PROB_APARECE = 0.5;
// A APROBAR (prov)
export const TEXTOS_ROBO = Object.freeze({
  prov: true,
  opciones: ['Podés hablarle, pagarle, amenazarlo, denunciarlo o pelear.'],
  recupera: ['Recuperás {monto}.', 'Te devuelve {monto}, contando de mala gana.'],
  nada: ['No te devuelve nada.', 'Se ríe en tu cara y se va.'],
  denuncia: ['Lo denunciás a la guardia. Para cuando llegan, ya no está; pero queda anotado.'],
  sin_pistas: ['Nadie sabe nada todavía.'],
  sin_robo: ['No te robaron nada que buscar.'],
  sin_dinero: ['No te alcanza para pagar.'],
});
const t42De = (amp) => amp?.combate ?? t42json;
const linea = (l, v, rng) => { const x = sinRepetir((l ?? []).map((t) => rellenar(t, v))); return x.length ? x[Math.floor(rng() * x.length)] : ''; };
const totalB = (j) => (j?.bronce ?? 0) + (j?.plata ?? 0) * 100;
const conTotalB = (j, t) => ({ ...j, bronce: Math.max(0, t) % 100, plata: Math.floor(Math.max(0, t) / 100) });
const fmt = (b) => { const p = Math.floor(b / 100); const r = b % 100; return p && r ? `${p} de plata y ${r} de bronce` : p ? `${p} de plata` : `${r} de bronce`; };
const nombreEscena = (c, id) => (c.escenas ?? []).find((e) => e.id === id)?.nombre ?? 'algún lado';
export const activos = (robos) => (robos ?? []).filter((r) => r.estado === 'activo');

/** Lo que queda del botín tras `dias`. */
export function recuperable(robo, dia) {
  const gastado = Math.min(0.8, 0.1 * Math.max(0, dia - robo.dia));
  return Math.floor(robo.monto * Math.round((1 - gastado) * 100) / 100);
}

/** Tick: caducidad, pistas y aparición del ladrón. */
export function tickRobos({ amp, contenido, estado, ext }) {
  const robos = ext?.robos ?? [];
  if (!activos(robos).length) return { ext, lineas: [] };
  const dia = estado.reloj.dia;
  const rng = derivar(ext?.semillaBase ?? 0, `robos:${dia}:${estado.reloj.hora}:${ext?.turno ?? 0}`);
  const T = t42De(amp);
  const lineas = [];
  const presentes = npcsPresentes(estado, contenido).map((p) => p.id);
  let encontrado = ext?.roboEncontrado ?? null;
  const nuevos = robos.map((r) => {
    if (r.estado !== 'activo') return r;
    if (dia - r.dia >= DIAS_CADUCA) return { ...r, estado: 'caducado' };
    const v = { rival: conArticulo(r.nombre), lugar: nombreEscena(contenido, r.escenaBase), objeto: r.objetos?.[0] ? (contenido.objetos.find((o) => o.id === r.objetos[0])?.nombre ?? 'cosa').toLowerCase() : 'bolsa' };
    const fuente = presentes.some((p) => FUENTES_PISTA.includes(p)) || estado.jugador.escenaId === 'escena_mercado_circular';
    if (fuente && r.pistaDia !== dia && rng() < PROB_PISTA) {
      lineas.push(linea(rng() < 0.5 ? T.robo?.rumor : T.robo?.rastro, v, rng));
      return { ...r, pistas: (r.pistas ?? 0) + 1, pistaDia: dia };
    }
    const mismaFranja = franjaDe(estado.reloj.hora) === franjaDe(r.hora ?? '22:00');
    if (!encontrado && (r.pistas ?? 0) > 0 && estado.jugador.escenaId === r.escenaBase && mismaFranja && r.vistoDia !== dia && rng() < PROB_APARECE) {
      encontrado = r.id;
      lineas.push(linea(T.robo?.recuperar, v, rng), linea(TEXTOS_ROBO.opciones, v, rng));
      return { ...r, vistoDia: dia };
    }
    return r;
  });
  if (encontrado && !nuevos.some((r) => r.id === encontrado && r.estado === 'activo')) encontrado = null;
  return { ext: { ...ext, robos: nuevos, roboEncontrado: encontrado }, lineas: lineas.filter(Boolean) };
}

const RE = Object.freeze({
  info: /(^| )(quien me robo|pago por (informacion|el dato)|busco al ladron|quien fue el ladron|sabes quien me robo|vieron al ladron)( |$)/,
  hablar: /(^| )(hablo|le hablo|devolveme|devuelveme|dame lo mio|le pido)( |$)/,
  pagar: /(^| )(le pago|te pago|pago)( |$)/,
  amenazar: /(^| )(lo amenazo|amenazo|te voy a|le advierto)( |$)/,
  denunciar: /(^| )(denuncio|lo denuncio|llamo a la guardia|aviso a la guardia)( |$)/,
  pelear: /(^| )(peleo|lo ataco|le pego|me le tiro)( |$)/,
});

/** Turno de robo. Devuelve { estado, texto, ext, pelear?: robo } o null. */
export function turnoDeRobo({ amp, contenido, partida, texto }) {
  const n = normalizar(texto);
  const robos = partida.ext?.robos ?? [];
  const rng = derivar(partida.ext?.semillaBase ?? 0, `robo:${partida.reloj.dia}:${partida.reloj.hora}:${n.length}`);
  const dia = partida.reloj.dia;
  if (RE.info.test(n)) {
    const r = activos(robos).at(-1);
    if (!r) return { estado: partida, texto: linea(TEXTOS_ROBO.sin_robo, {}, rng), ext: {} };
    const [a, b] = precios.base.rumor; const precio = a + Math.floor(rng() * (b - a + 1));
    if (totalB(partida.jugador) < precio) return { estado: partida, texto: linea(TEXTOS_ROBO.sin_dinero, {}, rng), ext: {} };
    const v = { rival: conArticulo(r.nombre), lugar: nombreEscena(contenido, r.escenaBase), objeto: 'bolsa' };
    return { estado: { ...partida, jugador: conTotalB(partida.jugador, totalB(partida.jugador) - precio) }, texto: `${linea(t42De(amp).robo?.rastro, v, rng)} (${fmt(precio)})`, ext: { robos: robos.map((x) => (x === r ? { ...x, pistas: (x.pistas ?? 0) + 2 } : x)) } };
  }
  const id = partida.ext?.roboEncontrado;
  const r = robos.find((x) => x.id === id && x.estado === 'activo');
  if (!r || partida.jugador.escenaId !== r.escenaBase) return null;
  const queda = recuperable(r, dia);
  const v = { rival: conArticulo(r.nombre) };
  const cerrar = (estadoRobo, extra = {}) => ({ robos: robos.map((x) => (x === r ? { ...x, estado: estadoRobo } : x)), roboEncontrado: null, ...extra });
  const devolver = (e, monto) => {
    const vendidos = (r.objetos ?? []).filter(() => rng() < 0.3);
    const inv = [...(e.inventario ?? []), ...(r.objetos ?? []).filter((o) => !vendidos.includes(o)).map((o) => ({ objetoId: o, usosRestantes: contenido.objetos.find((x) => x.id === o)?.usos ?? 1 }))];
    return { ...e, jugador: conTotalB(e.jugador, totalB(e.jugador) + monto), inventario: inv };
  };
  const rasgos = t42De(amp).rivales[r.rivalId]?.rasgos ?? { piedad: 1, coraje: 1 };
  if (RE.denunciar.test(n)) return { estado: partida, texto: linea(TEXTOS_ROBO.denuncia, v, rng), ext: cerrar('denunciado', { ley: { ...(partida.ext?.ley ?? {}), denuncias: [...(partida.ext?.ley?.denuncias ?? []), { robo: r.id, dia, escena: r.escenaBase }] } }) };
  if (RE.pelear.test(n)) return { estado: partida, texto: '', ext: {}, pelear: r };
  if (RE.pagar.test(n)) {
    const precio = Math.ceil(queda * 0.3);
    if (totalB(partida.jugador) < precio) return { estado: partida, texto: linea(TEXTOS_ROBO.sin_dinero, v, rng), ext: {} };
    const e = devolver({ ...partida, jugador: conTotalB(partida.jugador, totalB(partida.jugador) - precio) }, queda);
    return { estado: e, texto: linea(TEXTOS_ROBO.recupera, { monto: fmt(queda) }, rng), ext: cerrar('recuperado') };
  }
  if (RE.amenazar.test(n) || RE.hablar.test(n)) {
    const amenaza = RE.amenazar.test(n);
    const p = amenaza ? 0.6 - 0.15 * (rasgos.coraje ?? 1) : 0.3 + 0.1 * (rasgos.piedad ?? 0);
    if (rng() < p) {
      const monto = amenaza ? queda : Math.floor(queda / 2);
      return { estado: devolver(partida, monto), texto: linea(TEXTOS_ROBO.recupera, { monto: fmt(monto) }, rng), ext: cerrar('recuperado') };
    }
    if (amenaza) return { estado: partida, texto: '', ext: {}, pelear: r };
    return { estado: partida, texto: linea(TEXTOS_ROBO.nada, v, rng), ext: cerrar('perdido') };
  }
  return null;
}
