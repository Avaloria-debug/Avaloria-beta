// Y2 (fase 9): motor de combate como módulo de sistema. Mecánica en data/config/combate.json (provisional);
// textos en t42 (los arma narrador/combate/index.js a partir de `sub.eventos`). Neutral: la probabilidad depende solo
// de la intención del rival, la opción elegida, los rasgos, el número, las armas, los estados y la práctica; nunca del
// historial de resultados del jugador. RNG derivado «combate» (determinista con semilla).
import cfg from '../../data/config/combate.json' with { type: 'json' };
import { registrarSistema } from './index.js';
import { derivar } from '../azar.js';
import { normalizar } from '../comprension.js';
import { generarOpciones } from './combateOpciones.js';

export const CFG = cfg;
export const EJ = cfg.estados_jugador; // ileso, magullado, herido, grave, inconsciente, muerto
export const ER = cfg.estados_rival; // entero, golpeado, herido, quebrado
export const ATAQUES = Object.freeze(['golpe_fuerte', 'golpe_rapido', 'agarrar', 'embestir', 'empujar', 'morder']);
export const OFENSIVAS = Object.freeze(['golpear', 'empujar', 'agarrar', 'entorno', 'rematar', 'sacar_arma']);
export const DEFENSIVAS = Object.freeze(['esquivar', 'bloquear', 'retroceder', 'quedarse_quieto']);
export const SOCIALES = Object.freeze(['hablar', 'amenazar', 'ofrecer', 'gritar', 'intimidar_animal', 'lanzar_comida', 'dejar_ir']);
export const FINES = Object.freeze(['victoria', 'huida_exitosa', 'negociado', 'guardia', 'cansado', 'robado', 'inconsciente', 'muerte', 'huida_fallida']);

/** Nivel A..D de un tipo de opción ante una intención (no listado = D). */
export function nivelDe(intencion, tipo) {
  const e = cfg.efectividad[intencion] ?? {};
  for (const n of ['A', 'B', 'C', 'D']) if ((e[n] ?? []).includes(tipo)) return n;
  return 'D';
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dañoDe = (arma) => cfg.daño[arma] ?? 1;

/** Probabilidad de éxito de una opción (sin historial de resultados). */
export function probabilidad(sub, tipo) {
  const a = cfg.ajustes;
  let p = cfg.prob_nivel[nivelDe(sub.intencion, tipo)];
  p += a.habilidad_rival * (sub.rival.rasgos.habilidad ?? 0);
  p += a.por_rival_extra * Math.max(0, sub.numero - 1);
  if (sub.armaJugador && sub.armaFuera) p += a.arma_jugador;
  if (!['puño', 'ninguna'].includes(sub.rival.arma) && sub.rival.clase !== 'animal') p += a.arma_rival;
  if (EJ[sub.estadoJugador] === 'herido') p += a.jugador_herido;
  if (EJ[sub.estadoJugador] === 'grave') p += a.jugador_grave;
  if (sub.estadoRival >= 2) p += a.rival_herido;
  p += Math.min(a.practica_max, (sub.practica ?? 0) * a.practica_por_combate);
  return clamp(p, 0.02, 0.95);
}

/** Intención siguiente del rival: pesos por rasgos, estado y moral. */
export function elegirIntencion(sub, rng) {
  const ints = Object.keys(sub.rival.intenciones);
  const r = sub.rival.rasgos;
  const peso = (k) => {
    let w = 1;
    if ((sub.moral <= 0 || sub.estadoRival >= 2) && ['dudar', 'buscar_salida', 'negociar'].includes(k)) w *= 3;
    if (sub.moral > 0 && ['dudar', 'buscar_salida'].includes(k)) w *= 0.5;
    if (r.codicia >= 2 && ['amenazar', 'agarrar'].includes(k)) w *= 2;
    if (r.fuerza >= 2 && ['golpe_fuerte', 'embestir'].includes(k)) w *= 2;
    if (sub.ronda === 0 && ['amenazar', 'grunir'].includes(k)) w *= 3;
    if (k === sub.intencion) w *= 0.6;
    return w;
  };
  const total = ints.reduce((s, k) => s + peso(k), 0);
  let x = rng() * total;
  for (const k of ints) { x -= peso(k); if (x <= 0) return k; }
  return ints.at(-1);
}

const rngDe = (sub, paso) => derivar(sub.semilla, `combate:${sub.ronda}:${paso}`);

/**
 * ctx: { rivalId, rival (def t42), numero, estadoJugador ('ileso'…), armaJugador, practica, semilla, escena,
 *        testigos, ciudadDia, entorno: [nombres], comida, objeto, salida, npcId }
 */
export function iniciarCombate(ctx) {
  const rival = ctx.rival;
  const sub = {
    rivalId: ctx.rivalId, npcId: ctx.npcId ?? null,
    rival: { nombre: rival.nombre, propio: !!rival.propio, clase: rival.clase, rasgos: { ...rival.rasgos }, arma: rival.arma, intenciones: Object.fromEntries(Object.keys(rival.intenciones).map((k) => [k, true])) },
    numero: ctx.numero ?? 1, estadoJugador: Math.max(0, EJ.indexOf(ctx.estadoJugador ?? 'ileso')), estadoRival: 0,
    moral: (rival.rasgos.coraje ?? 1) + Math.max(0, (ctx.numero ?? 1) - 1), distancia: 'cerca', ronda: 0,
    intencion: null, opciones: [], historialOpciones: [], eventos: [],
    armaJugador: ctx.armaJugador ?? null, armaFuera: false, practica: ctx.practica ?? 0, semilla: ctx.semilla ?? 0,
    escena: ctx.escena, testigos: !!ctx.testigos, ciudadDia: !!ctx.ciudadDia,
    entorno: ctx.entorno ?? [], comida: !!ctx.comida, objeto: ctx.objeto ?? null, salida: ctx.salida ?? null,
    fin: null, ultimo: 'abre',
    // Carterista y afines (codicia 3, sin amenazar ni golpear): el robo ya ocurrió; si se escapa, se lleva la bolsa.
    yaRobo: (rival.rasgos.codicia ?? 0) >= 3 && !Object.keys(rival.intenciones).some((k) => ['amenazar', 'golpe_rapido', 'golpe_fuerte'].includes(k)),
  };
  sub.intencion = elegirIntencion(sub, rngDe(sub, 'intencion'));
  sub.eventos = [{ clave: 'aparicion' }, { clave: 'intencion', intencion: sub.intencion }];
  sub.opciones = generarOpciones(sub, rngDe(sub, 'opciones'));
  return sub;
}

/** Índice de la opción elegida: número 1..n, texto exacto, o `entrada.opcion`. */
export function opcionElegida(sub, entrada) {
  if (Number.isInteger(entrada?.opcion)) return entrada.opcion >= 0 && entrada.opcion < sub.opciones.length ? entrada.opcion : -1;
  const n = normalizar(entrada?.texto ?? '');
  if (/^\d$/.test(n)) { const i = Number(n) - 1; return i >= 0 && i < sub.opciones.length ? i : -1; }
  return sub.opciones.findIndex((o) => normalizar(o.texto) === n);
}

function golpeAlJugador(sub, ev, rng) {
  const intencion = sub.intencion;
  let dmg = dañoDe(sub.rival.arma);
  if (intencion === 'golpe_rapido') dmg = Math.max(1, dmg - 1);
  if (intencion === 'golpe_fuerte' || intencion === 'embestir') dmg += (sub.rival.rasgos.fuerza ?? 0) >= 3 ? 1 : 0;
  const antes = sub.estadoJugador;
  if (dmg <= 0) { sub.estadoJugador = Math.max(antes, 1); ev.push({ clave: 'resolucion.jugador_recibe' }, { clave: `estados.jugador.${EJ[sub.estadoJugador]}` }); return; } // picotazos: duelen, no matan
  const sube = dmg >= 3 ? 2 : 1;
  sub.estadoJugador = Math.min(4, antes + sube);
  ev.push({ clave: 'resolucion.jugador_recibe' });
  if (sub.estadoJugador >= 4) {
    const muere = (EJ[antes] === 'grave' && dmg >= 3 && rng() < cfg.umbral_muerte.grave_y_daño_3)
      || ((sub.rival.rasgos.piedad ?? 0) === 0 && rng() < cfg.umbral_muerte.inconsciente_y_rival_sin_piedad);
    sub.estadoJugador = muere ? 5 : 4;
    sub.fin = muere ? 'muerte' : 'inconsciente';
    ev.push({ clave: muere ? 'desenlaces.muerte' : 'desenlaces.inconsciente' });
  } else ev.push({ clave: `estados.jugador.${EJ[sub.estadoJugador]}` });
}

function dañarRival(sub, ev, cuanto) {
  sub.estadoRival = Math.min(3, sub.estadoRival + cuanto);
  sub.moral -= cuanto;
  ev.push({ clave: `estados.rival.${ER[sub.estadoRival]}` });
}

/** Moral y rasgos: rendición o huida del rival. */
function quiebre(sub, ev) {
  const r = sub.rival.rasgos;
  if (sub.fin) return;
  if ((r.coraje ?? 0) <= 1 && sub.estadoRival >= 2) { sub.fin = 'victoria'; ev.push({ clave: sub.rival.clase === 'animal' ? 'rival.huye' : 'rival.rinde' }); return; }
  if (sub.estadoRival >= 3 || sub.moral < 0 || ((r.codicia ?? 0) >= 2 && sub.intencion === 'dudar' && sub.moral <= 0)) { sub.fin = 'victoria'; ev.push({ clave: 'rival.huye' }); }
}

/** Una ronda. Devuelve un sub nuevo (no muta el recibido). */
export function resolverRonda(sub0, indice) {
  const sub = structuredClone(sub0);
  const op = sub.opciones[indice];
  const rng = rngDe(sub, 'resolver');
  const ev = [{ clave: 'eleccion', texto: op.texto }];
  const t = op.tipo;
  const ok = rng() < probabilidad(sub, t);
  const ataque = ATAQUES.includes(sub.intencion);
  sub.historialOpciones = [...sub.historialOpciones, { tipo: t, ok }].slice(-10);

  if (t === 'huir') {
    if (ok) { sub.fin = 'huida_exitosa'; ev.push({ clave: 'desenlaces.huida_exitosa' }); }
    else { ev.push({ clave: 'desenlaces.huida_fallida' }); golpeAlJugador(sub, ev, rng); }
  } else if (t === 'rendirse' || t === 'entregar') {
    if ((sub.rival.rasgos.piedad ?? 0) >= 1 || t === 'entregar') { sub.fin = 'robado'; ev.push({ clave: 'desenlaces.robado' }); }
    else golpeAlJugador(sub, ev, rng);
  } else if (t === 'dejar_ir') {
    if (ok) { sub.fin = 'victoria'; ev.push({ clave: 'rival.huye' }); } else { sub.moral += 1; ev.push({ clave: 'resolucion.rival_enfurece' }); }
  } else if (t === 'ofrecer') {
    if (ok) { sub.fin = 'negociado'; ev.push({ clave: 'desenlaces.negociado' }); }
    else { ev.push({ clave: 'resolucion.rival_enfurece' }); if (ataque) golpeAlJugador(sub, ev, rng); }
  } else if (t === 'gritar') {
    if (ok && (sub.testigos || sub.ciudadDia)) { sub.fin = 'guardia'; ev.push({ clave: 'resolucion.testigo' }, { clave: 'resolucion.guardia_llega' }); }
    else if (ok) { sub.moral -= 1; ev.push({ clave: 'resolucion.rival_duda' }); }
    else { ev.push({ clave: 'resolucion.rival_enfurece' }); if (ataque) golpeAlJugador(sub, ev, rng); }
  } else if (SOCIALES.includes(t)) {
    if (ok) { sub.moral -= 1; ev.push({ clave: 'resolucion.rival_duda' }); }
    else { sub.moral += 1; ev.push({ clave: 'resolucion.rival_enfurece' }); if (ataque) golpeAlJugador(sub, ev, rng); }
  } else if (t === 'sacar_arma') {
    sub.armaFuera = true;
    if (ok) { sub.moral -= 1; ev.push({ clave: 'resolucion.rival_duda' }); }
    else if (ataque) golpeAlJugador(sub, ev, rng);
  } else if (DEFENSIVAS.includes(t)) {
    if (ok) ev.push({ clave: 'resolucion.jugador_evita' });
    else if (ataque) golpeAlJugador(sub, ev, rng);
    if (t === 'retroceder' && ok) sub.distancia = 'lejos';
  } else { // ofensivas
    if (ok) {
      const base = t === 'rematar' ? 2 : t === 'golpear' && sub.armaJugador && sub.armaFuera ? Math.max(1, Math.min(2, dañoDe(sub.armaJugador))) : 1;
      ev.push({ clave: 'resolucion.jugador_acierta' });
      if (t === 'rematar' && sub.estadoRival >= 3) { sub.fin = 'victoria'; sub.rivalMuerto = true; ev.push({ clave: 'rival.muere' }); }
      else dañarRival(sub, ev, base);
    } else { ev.push({ clave: 'resolucion.jugador_falla' }); if (ataque) golpeAlJugador(sub, ev, rng); }
  }
  // El ladrón que agarra con éxito se lleva la bolsa y se va.
  if (!sub.fin && sub.intencion === 'agarrar' && (sub.rival.rasgos.codicia ?? 0) >= 2 && ev.some((e) => e.clave === 'resolucion.jugador_recibe') && sub.rival.clase !== 'animal') {
    sub.fin = 'robado'; ev.push({ clave: 'desenlaces.robado' });
  }
  quiebre(sub, ev);
  sub.ronda += 1;
  if (!sub.fin && sub.ronda >= cfg.rondas_max) { sub.fin = 'cansado'; ev.push({ clave: 'rival.huye' }); }
  if (sub.yaRobo && (sub.fin === 'cansado' || sub.fin === 'huida_exitosa' || (sub.fin === 'victoria' && sub.estadoRival < 1 && ev.some((e) => e.clave === 'rival.huye')))) { sub.fin = 'robado'; ev.push({ clave: 'desenlaces.robado' }); }
  if (!sub.fin) {
    sub.intencion = elegirIntencion(sub, rngDe(sub, 'intencion'));
    ev.push({ clave: 'intencion', intencion: sub.intencion });
    if (sub.rival.clase !== 'animal' && rngDe(sub, 'dialogo')() < 0.3) ev.push({ clave: 'dialogo' });
    sub.opciones = generarOpciones(sub, rngDe(sub, 'opciones'));
  } else sub.opciones = [];
  sub.eventos = ev;
  sub.ultimo = sub.fin ?? 'ronda';
  return sub;
}

// A APROBAR (prov): el jugador escribe algo que no es una opción.
export const TEXTO_DUDA = Object.freeze(['Dudás un instante.', 'Te quedás un segundo sin saber qué hacer.', 'Vacilás.']);
const PALABRAS_TIPO = Object.freeze({ huir: /(^| )(huyo|corro|escapo|me escapo|me voy)( |$)/, golpear: /(^| )(pego|golpeo|ataco|le doy)( |$)/, esquivar: /(^| )esquivo( |$)/, bloquear: /(^| )(bloqueo|me cubro)( |$)/, hablar: /(^| )(hablo|le digo|calmate|tranquilo)( |$)/, retroceder: /(^| )retrocedo( |$)/, gritar: /(^| )(grito|auxilio|ayuda)( |$)/, rendirse: /(^| )me rindo( |$)/, empujar: /(^| )empujo( |$)/ });
/** Texto libre con una palabra clara de un tipo presente entre las opciones → esa opción. */
export function opcionPorPalabra(sub, texto) {
  const n = normalizar(texto ?? '');
  for (const [tipo, re] of Object.entries(PALABRAS_TIPO)) if (re.test(n)) { const i = sub.opciones.findIndex((o) => o.tipo === tipo); if (i >= 0) return i; }
  return -1;
}

export const combate = registrarSistema({
  id: 'combate',
  iniciar: (_e, ctx) => iniciarCombate(ctx),
  cerrable: () => false, // solo se sale por las opciones (huir, rendirse…)
  turno(sub, entrada) {
    let i = opcionElegida(sub, entrada);
    if (i < 0) i = opcionPorPalabra(sub, entrada?.texto);
    // Texto que no es ninguna opción: el tiempo no se detiene; cuenta como quedarse quieto (nivel según la intención).
    const base = i < 0 ? { ...sub, opciones: [...sub.opciones, { texto: TEXTO_DUDA[sub.ronda % TEXTO_DUDA.length], tipo: 'quedarse_quieto', datos: {} }] } : sub;
    const nuevo = resolverRonda(base, i < 0 ? base.opciones.length - 1 : i);
    return { texto: '', sub: nuevo, terminado: !!nuevo.fin };
  },
  resultado: () => [], // los desenlaces los aplica narrador/combate/index.js
});
