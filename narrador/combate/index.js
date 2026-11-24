// Fase 9: combate en el juego (con ampliado). Encuentros al final de cada turno fuera de combate (Y4), combate contra
// un NPC presente desde texto libre, narración de las rondas con t42 y aplicación de desenlaces (Y5…Y8).
// Neutral: la probabilidad de encuentro sale de combate.json y del estado del mundo; nunca de cómo le va al jugador.
import cfg from '../../data/config/combate.json' with { type: 'json' };
import t42json from '../../data/contenido/ampliado/t42-combate.json' with { type: 'json' };
import valoresJson from '../../data/contenido/ampliado/valores.json' with { type: 'json' };
import { abrirSistema, turnoSistema, sistemaActivo } from '../sistemas/index.js';
import { EJ, CFG } from '../sistemas/combate.js';
import { conArticulo, rellenar } from '../sistemas/combateOpciones.js';
import { derivar } from '../azar.js';
import { normalizar } from '../comprension.js';
import { npcsPresentes } from '../turno.js';
import { franjaDe } from '../seleccion.js';
import { sinRepetir } from '../historial.js';
import { FOCOS_ESCENAS } from '../focos.js';
import { avanzar } from '../reloj.js';
import { turnoDeRobo, recuperable, TEXTOS_ROBO } from './robos.js';

export const ESCENAS_URBANAS = Object.freeze(['ciudad', 'mercado', 'conocimiento']);
// A APROBAR (prov): intenciones genéricas de un NPC que pelea (los NPC no tienen ficha de combate en t42) y avisos.
export const TEXTOS_COMBATE = Object.freeze({
  prov: true,
  intenciones: {
    golpe_rapido: ['{rival} te tira un golpe corto.', '{rival} lanza el puño sin pensarlo.'],
    empujar: ['{rival} te empuja con las dos manos.', '{rival} busca sacarte de encima.'],
    amenazar: ['«No te me acerques», dice {rival}.', '{rival} levanta los puños, tenso.'],
    dudar: ['{rival} mira alrededor, buscando ayuda.', '{rival} duda: no quiere esto.'],
    buscar_salida: ['{rival} retrocede hacia la salida.', '{rival} busca por dónde irse.'],
    golpe_fuerte: ['{rival} carga con todo el peso del cuerpo.'],
  },
  rinde: ['{rival} levanta las manos. «Basta. Basta.»'],
  huye: ['{rival} se va, sin darte la espalda del todo.'],
  muere: ['{rival} cae y no se mueve más.'],
  elige: ['Elegí una de las opciones.', 'No hay tiempo para otra cosa: elegí qué hacés.'],
});

const t42De = (amp) => amp?.combate ?? t42json;
const escenaDef = (contenido, id) => (contenido.escenas ?? []).find((e) => e.id === id) ?? null;
export const esUrbana = (contenido, id) => ESCENAS_URBANAS.includes(escenaDef(contenido, id)?.categoria);
const nombreEscena = (contenido, id) => escenaDef(contenido, id)?.nombre ?? 'algún lado';

const ATAQUE_TEXTO = /(^| )(le pego|lo golpeo|la golpeo|golpeo a|le doy una pina|le tiro una pina|le pego una pina|ataco|lo ataco|la ataco|atacar a|lo empujo|la empujo|empujo a|lo pateo|la pateo|le pateo|lo apunalo|le clavo|saco el cuchillo|saco la daga|saco mi arma|saco el arma|desenfundo|me defiendo|me le tiro encima|lo agarro a pinas|le rompo la cara|lo cago a pinas)( |$)/;
export const iniciaCombate = (texto) => { const n = normalizar(texto); return ATAQUE_TEXTO.test(n) && !/(^| )(palabras|acusacion|argumentos|discusion|en el juicio|puerta|mesa|pared|piedra|carro|cajon|barril|arbol)( |$)/.test(n); };
const BUSCA = /(^| )(provoco|lo provoco|insulto|lo insulto|la insulto|imbecil|idiota|me meto en (el|un) callejon|callejon|fisgoneo|husmeo|me meto donde no|busco pelea|busco problemas)( |$)/;
export const buscaProblemas = (texto) => BUSCA.test(normalizar(texto));

/** Rival a partir de un NPC presente: rasgos derivados de valores.json (Darío = guardia de t42). */
export function rivalDeNpc(npc, amp) {
  const v = amp?.valores?.[npc.id] ?? valoresJson.valores?.[npc.id] ?? {};
  const T = t42De(amp);
  if (npc.id === 'dario_guardia' && T.rivales.guardia_honesto) return { ...structuredClone(T.rivales.guardia_honesto), nombre: npc.nombre.split(' ')[0], propio: true, numero: [1, 1] };
  const c = (x) => Math.max(0, Math.min(3, x));
  return {
    nombre: npc.nombre.split(' ')[0], propio: true, clase: 'humano',
    rasgos: { habilidad: 1, fuerza: 1, coraje: c(1 + (v.lealtad ?? 0) - (v.miedo ?? 0)), codicia: c(1 + (v.dinero ?? 0)), piedad: c(1 + (v.lealtad ?? 0)) },
    arma: 'puño', numero: [1, 1],
    intenciones: Object.fromEntries(['golpe_rapido', 'empujar', 'amenazar', 'dudar', 'buscar_salida'].map((k) => [k, TEXTOS_COMBATE.intenciones[k]])),
    aparicion: [], dialogo: [], rinde: TEXTOS_COMBATE.rinde, huye: TEXTOS_COMBATE.huye, muere: TEXTOS_COMBATE.muere,
  };
}

/** Rival por escena, franja y disparadores (o null). */
export function elegirRival(amp, { escena, franja, disparadores = [], rng }) {
  const T = t42De(amp);
  const cand = Object.entries(T.rivales).filter(([, r]) => (r.escenas ?? []).includes(escena) && (r.franjas ?? []).includes(franja));
  if (!cand.length) return null;
  const peso = ([, r]) => 1 + 2 * (r.disparadores ?? []).filter((d) => disparadores.includes(d)).length;
  const total = cand.reduce((s, c) => s + peso(c), 0);
  let x = rng() * total;
  for (const c of cand) { x -= peso(c); if (x <= 0) return c[0]; }
  return cand.at(-1)[0];
}

/** Probabilidad de encuentro del turno (combate.json.disparo). */
export function probEncuentro({ urbana, camino, franja, atencion, busca }) {
  const d = cfg.disparo;
  if (busca) return d.busca_problemas;
  const noche = franja === 'noche' || franja === 'madrugada';
  if (noche && camino) return d.noche_camino;
  if (noche && urbana && atencion > 0) return d.noche_ciudad_exhibido;
  if (!noche && atencion > 0) return d.exhibido_dia;
  return d.base;
}

/** Contexto del combate para el motor. */
function ctxCombate({ contenido, estado, amp, rivalId, rival, numero, npcId = null }) {
  const presentes = npcsPresentes(estado, contenido);
  const escena = estado.jugador.escenaId;
  const franja = franjaDe(estado.reloj.hora);
  const arma = (estado.inventario ?? []).map((x) => (contenido.objetos ?? []).find((o) => o.id === x.objetoId)).find((o) => o?.tipo === 'arma');
  const comida = (estado.inventario ?? []).some((x) => (contenido.objetos ?? []).find((o) => o.id === x.objetoId)?.tipo === 'consumible');
  // Entorno: focos de la escena con clase objeto/lugar (FOCOS_ESCENAS), los activos primero.
  const activos = new Set((estado.ext?.focos ?? []).map((f) => f.id));
  const focos = Object.entries(amp?.focos?.defs ?? {})
    .filter(([id, f]) => ['objeto', 'lugar'].includes(f.clase) && (FOCOS_ESCENAS[id] ?? []).includes(escena))
    .sort(([a], [b]) => Number(activos.has(b)) - Number(activos.has(a)))
    .map(([, f]) => f.alias?.[0]).filter(Boolean).map((n) => `${/a$/.test(n.split(' ')[0]) ? 'la' : 'el'} ${n}`);
  const salidaId = escenaDef(contenido, escena)?.salidas?.[0];
  return {
    rivalId, rival, numero, npcId, escena,
    estadoJugador: estado.ext?.salud?.estado ?? 'ileso',
    armaJugador: arma ? `${arma.nombre.toLowerCase().startsWith('el ') || arma.nombre.toLowerCase().startsWith('la ') ? '' : 'el '}${arma.nombre.toLowerCase()}` : null,
    practica: estado.ext?.practica ?? 0, semilla: `${estado.ext?.semillaBase ?? 0}:${estado.reloj.dia}:${estado.reloj.hora}:${rivalId}`,
    testigos: presentes.filter((p) => p.id !== npcId).length > 0, ciudadDia: esUrbana(contenido, escena) && !['noche', 'madrugada'].includes(franja),
    entorno: focos.length ? focos.slice(0, 2) : (esUrbana(contenido, escena) ? ['un puesto', 'unos cajones'] : ['una piedra', 'unas ramas']),
    comida, objeto: 'la bolsa', salida: salidaId ? nombreEscena(contenido, salidaId) : null,
  };
}

/** Línea de una lista sin repetir en la ventana, rellenada. */
function linea(lista, v, rng) {
  const l = (lista ?? []).map((t) => rellenar(t, v));
  if (!l.length) return '';
  const libres = sinRepetir(l);
  const t = libres[Math.floor(rng() * libres.length)];
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Texto de los eventos de una ronda. */
export function narrarEventos(sub, amp, { contenido, extra = {} } = {}) {
  const T = t42De(amp);
  const def = sub.npcId ? rivalDeNpc((contenido.npcs ?? []).find((n) => n.id === sub.npcId) ?? { id: sub.npcId, nombre: sub.rival.nombre }, amp) : T.rivales[sub.rivalId];
  const rivalTxt = def?.propio ? def.nombre : conArticulo(sub.rival.nombre);
  const v = { rival: rivalTxt, arma: sub.armaJugador, arma_rival: `su ${sub.rival.arma}`, ...extra };
  const rng = derivar(sub.semilla, `narrar:${sub.ronda}`);
  const partes = [];
  for (const e of sub.eventos ?? []) {
    let t = '';
    if (e.clave === 'eleccion') t = e.texto;
    else if (e.clave === 'aparicion') t = linea(def?.aparicion?.length ? def.aparicion : [], v, rng);
    else if (e.clave === 'intencion') t = linea(def?.intenciones?.[e.intencion] ?? TEXTOS_COMBATE.intenciones[e.intencion] ?? [], v, rng);
    else if (e.clave === 'dialogo') t = linea(def?.dialogo ?? [], v, rng);
    else if (e.clave === 'elige') t = linea(TEXTOS_COMBATE.elige, v, rng);
    else if (e.clave.startsWith('rival.')) { const k = e.clave.slice(6); t = linea(def?.[k]?.length ? def[k] : (def?.huye ?? TEXTOS_COMBATE.huye), v, rng); }
    else { let x = T; for (const p of e.clave.split('.')) x = x?.[p]; t = linea(Array.isArray(x) ? x : [], v, rng); }
    if (t && !/\{\w+\}/.test(t)) partes.push(t);
  }
  return partes.join(' ');
}

const turnoTexto = (estado, texto, ext) => ({
  tipo: 'foco', estado: { ...estado, reformulacionPendiente: false }, intencionId: null, texto,
  foco: { id: null, verbo: 'combate' }, extFocos: ext,
});

/** Abre un combate en el estado (sin narrar): devuelve { estado, sub }. */
export function abrirCombate({ amp, contenido, estado, rivalId, npcId = null, rng }) {
  const T = t42De(amp);
  const npc = npcId ? (contenido.npcs ?? []).find((n) => n.id === npcId) : null;
  const rival = npc ? rivalDeNpc(npc, amp) : T.rivales[rivalId];
  const [a, b] = rival.numero ?? [1, 1];
  const numero = a + Math.floor(rng() * (b - a + 1));
  const e = abrirSistema(estado, 'combate', ctxCombate({ contenido, estado, amp, rivalId: npc ? `npc:${npcId}` : rivalId, rival, numero, npcId }));
  return { estado: e, sub: e.ext.sistema.sub };
}

/** Turno de texto con ampliado: ronda de combate activo o inicio de combate contra un NPC presente. null → sigue. */
export function turnoDeCombate({ amp, contenido, partida, texto }) {
  const s = sistemaActivo(partida);
  if (s?.id === 'combate') {
    const r = turnoSistema(partida, { tipo: 'texto', texto }, () => 0, { contenido, amp });
    const narr = narrarEventos(r.sub, amp, { contenido });
    if (!r.terminado) return turnoTexto({ ...r.estado, ext: partida.ext }, narr, { sistema: r.estado.ext.sistema });
    const fin = aplicarDesenlace({ amp, contenido, estado: { ...r.estado, ext: partida.ext }, sub: r.sub });
    return turnoTexto(fin.estado, [narr, fin.texto].filter(Boolean).join(' '), { sistema: null, ...fin.ext });
  }
  if (s) return null;
  // Y7: frente al ladrón (o pidiendo pistas).
  const rb = turnoDeRobo({ amp, contenido, partida, texto });
  if (rb?.pelear) {
    const rng = derivar(partida.ext?.semillaBase ?? 0, `combate:robo:${rb.pelear.id}`);
    const { estado, sub } = abrirCombate({ amp, contenido, estado: partida, rivalId: rb.pelear.rivalId, rng });
    const sistema = { ...estado.ext.sistema, sub: { ...sub, roboId: rb.pelear.id } };
    return turnoTexto({ ...estado, ext: partida.ext }, narrarEventos({ ...sub, eventos: sub.eventos.filter((e) => e.clave !== 'aparicion') }, amp, { contenido }), { sistema, roboEncontrado: null });
  }
  if (rb) return turnoTexto(rb.estado, rb.texto, rb.ext);
  if (!iniciaCombate(texto)) return null;
  const n = normalizar(texto);
  const presentes = npcsPresentes(partida, contenido).filter((p) => !(partida.ext?.npcsMuertos ?? []).includes(p.id));
  const objetivo = presentes.find((p) => n.includes(normalizar(p.nombre.split(' ')[0])) || (p.alias ?? []).some((a) => new RegExp(`(^| )${normalizar(a)}( |$)`).test(n))) ?? (/(^| )(lo|la|le) /.test(n) || /me defiendo|saco/.test(n) ? presentes[0] : null);
  if (!objetivo) return null;
  const rng = derivar(partida.ext?.semillaBase ?? 0, `combate:npc:${partida.reloj.dia}:${partida.reloj.hora}`);
  const { estado, sub } = abrirCombate({ amp, contenido, estado: partida, npcId: objetivo.id, rng });
  const relacion = { ...estado.npcs, [objetivo.id]: { ...estado.npcs[objetivo.id], relacion: -2 } };
  const ley = hechoDeLey(partida, contenido, { verbo: 'atacó', npcId: objetivo.id, testigos: sub.testigos });
  const narr = narrarEventos({ ...sub, eventos: sub.eventos.filter((e) => e.clave !== 'aparicion') }, amp, { contenido });
  return turnoTexto({ ...estado, npcs: relacion, ext: partida.ext }, narr, { sistema: estado.ext.sistema, ...ley });
}

/** Encuentro al final de un turno fuera de combate. Devuelve { ext, texto } (sin cambios si no hay encuentro). */
export function encuentroDelTurno({ amp, contenido, estado, ext, texto = '' }) {
  if (!amp || ext?.sistema || ext?.muerto) return { ext, texto: '' };
  const escena = estado.jugador.escenaId;
  const franja = franjaDe(estado.reloj.hora);
  const cat = escenaDef(contenido, escena)?.categoria;
  const busca = buscaProblemas(texto);
  const atencion = ext?.atencion_ladrones?.valor ?? 0;
  const deuda = Object.keys(ext?.hechosSistema ?? {}).some((k) => k.startsWith('rumor_incumplido:'));
  let p = probEncuentro({ urbana: ESCENAS_URBANAS.includes(cat), camino: cat === 'camino', franja, atencion, busca });
  const rng = derivar(ext?.semillaBase ?? 0, `combate:encuentro:${ext?.turno ?? 0}:${estado.reloj.dia}:${estado.reloj.hora}`);
  if (rng() >= p) return { ext, texto: '' };
  const disparadores = [...(atencion > 0 ? ['exhibir'] : []), ...(['noche', 'madrugada'].includes(franja) ? ['noche'] : []), ...(busca ? ['callejon', 'provocar', 'insulto'] : []), ...(deuda ? ['deuda'] : [])];
  let rivalId = null;
  // Rivales que nacen de hechos.
  if (deuda && esUrbana(contenido, escena) && rng() < 0.5) rivalId = 'maton_cobrador';
  if (busca && /insult|imbecil|idiota/.test(normalizar(texto)) && rng() < 0.5) rivalId = 'duelista';
  if ((ext?.ley?.buscado?.[escena] ?? 0) > 0 && esUrbana(contenido, escena) && rng() < 0.5) rivalId = 'guardia_honesto';
  rivalId ??= elegirRival(amp, { escena, franja, disparadores, rng });
  if (!rivalId || !t42De(amp).rivales[rivalId]) return { ext, texto: '' };
  const conExt = { ...estado, ext };
  const { estado: e, sub } = abrirCombate({ amp, contenido, estado: conExt, rivalId, rng });
  const T = t42De(amp);
  const disparo = busca ? linea(T.disparo?.busca_problemas, {}, rng) : '';
  return { ext: { ...ext, sistema: e.ext.sistema }, texto: [disparo, narrarEventos(sub, amp, { contenido })].filter(Boolean).join(' ') };
}

// ---- Y5: desenlaces, muerte y crónica ----
// A APROBAR (prov): frases de la crónica y avisos de partida cerrada.
export const TEXTOS_CRONICA = Object.freeze({
  prov: true,
  hechos: { ayudar: 'haber ayudado a {npc}', atacar: 'haber peleado con {npc}', mato: 'la muerte de {npc}', trabajo: 'trabajar para {npc}', deuda: 'una deuda sin pagar con {npc}', nada: 'andar sin rumbo por {lugar}' },
  causa: { muerte: 'a manos de {rival}' },
  cerrada: ['Tu crónica terminó. Escribí «nueva partida» para empezar otra.'],
  nueva: ['Empieza otra crónica.'],
});
const totalB = (j) => (j?.bronce ?? 0) + (j?.plata ?? 0) * 100;
const conTotalB = (j, t) => ({ ...j, bronce: Math.max(0, t) % 100, plata: Math.floor(Math.max(0, t) / 100) });
const mayusTras = (t) => t.replace(/(^|[.!?]\s+)([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase());

/** Robo: el rival se lleva dinero (y con codicia 3, un objeto con precio). Crea el registro del ladrón (Y7). */
export function robar(estado, sub, contenido, rng) {
  const cod = sub.rival.rasgos.codicia ?? 1;
  const frac = cod >= 3 ? 1 : cod === 2 ? 0.75 : 0.5;
  const total = totalB(estado.jugador);
  const monto = Math.floor(total * frac);
  let inventario = estado.inventario ?? [];
  const objetos = [];
  if (cod >= 3) {
    const i = inventario.findIndex((x) => (contenido.objetos ?? []).find((o) => o.id === x.objetoId)?.precio);
    if (i >= 0) { objetos.push(inventario[i].objetoId); inventario = inventario.filter((_, j) => j !== i); }
  }
  const robo = { id: `robo_${estado.reloj.dia}_${sub.rivalId}_${Math.floor(rng() * 1e6)}`, rivalId: sub.rivalId, nombre: sub.rival.nombre, escenaBase: sub.escena, monto, objetos, dia: estado.reloj.dia, hora: estado.reloj.hora, estado: 'activo', pistas: 0 };
  return { estado: { ...estado, jugador: conTotalB(estado.jugador, total - monto), inventario }, robo };
}

/** Crónica final (t42.cronica) con días, 2–3 hechos pesados, 1–2 NPC con mayor relación, lugar y causa. */
export function cronicaFinal({ amp, contenido, estado, lugar, causa, rng }) {
  const C = t42De(amp).cronica ?? {};
  const nom = (id) => (contenido.npcs ?? []).find((n) => n.id === id)?.nombre.split(' ')[0] ?? id;
  const H = TEXTOS_CRONICA.hechos;
  const pesados = [];
  for (const id of estado.ext?.npcsMuertos ?? []) pesados.push(H.mato.replace('{npc}', nom(id)));
  for (const k of Object.keys(estado.ext?.hechosSistema ?? {})) {
    const [tipo, npc] = k.split(':');
    if (tipo === 'rumor_incumplido') pesados.push(H.deuda.replace('{npc}', nom(npc)));
    if (tipo === 'trabajo') pesados.push(H.trabajo.replace('{npc}', nom(npc)));
  }
  for (const h of estado.ext?.hechos ?? []) if (h?.npc && ['ayudar', 'atacar', 'presionar'].includes(h.verbo)) pesados.push((h.verbo === 'ayudar' ? H.ayudar : H.atacar).replace('{npc}', nom(h.npc)));
  const unicos = [...new Set(pesados)].slice(0, 3);
  if (!unicos.length) unicos.push(H.nada.replace('{lugar}', lugar));
  const top = Object.entries(estado.npcs ?? {}).filter(([id]) => !(estado.ext?.npcsMuertos ?? []).includes(id)).sort((a, b) => (b[1].relacion ?? 0) - (a[1].relacion ?? 0)).slice(0, (estado.npcs && Object.keys(estado.npcs).length > 1) ? 2 : 1);
  const dias = estado.reloj.dia;
  const lugarInicial = nombreEscena(contenido, contenido.reglas?.escenaInicial);
  const l = (k, v) => linea(C[k] ?? [], v, rng);
  const partes = [l('inicio', { lugar_inicial: lugarInicial }), l('dias', { dias }), ...unicos.slice(0, 2 + Math.floor(rng() * 2)).map((h) => l('hechos', { hecho: h })), ...top.slice(0, 1 + Math.floor(rng() * 2)).map(([id]) => l('npc', { npc: nom(id) })), l('final', { lugar, causa }), l('cierre', {})];
  return mayusTras(partes.filter(Boolean).join(' '));
}

// ---- Y8: ganchos de ley (el sistema completo es de la fase 10) ----
/** Hecho de ley: «atacó/mató en {escena}» con testigos → marca `buscado` por escena (+1 atacar, +2 matar). Devuelve { ley }. */
export function hechoDeLey(estado, contenido, { verbo, npcId = null, testigos = false, escena = null }) {
  const esc = escena ?? estado.jugador.escenaId;
  const ley = structuredClone(estado.ext?.ley ?? {});
  ley.hechos = [...(ley.hechos ?? []), { verbo, npc: npcId, escena: esc, dia: estado.reloj.dia, testigos: !!testigos }].slice(-30);
  if (testigos && esUrbana(contenido, esc)) ley.buscado = { ...(ley.buscado ?? {}), [esc]: Math.min(5, (ley.buscado?.[esc] ?? 0) + (verbo === 'mató' ? 2 : 1)) };
  return { ley };
}

/** Aplica el desenlace del combate. Devuelve { estado, texto, ext (claves a fusionar en ext) }. */
export function aplicarDesenlace({ amp, contenido, estado, sub }) {
  const T = t42De(amp);
  const rng = derivar(sub.semilla, 'desenlace');
  const rivalTxt = sub.rival.propio ? sub.rival.nombre : conArticulo(sub.rival.nombre);
  const L = (clave, v = {}) => { let x = T; for (const p of clave.split('.')) x = x?.[p]; return linea(Array.isArray(x) ? x : [], { rival: rivalTxt, ...v }, rng); };
  let e = estado;
  const ext = { practica: (estado.ext?.practica ?? 0) + 1, ultimoCombate: { rival: sub.rivalId, fin: sub.fin, dia: estado.reloj.dia } };
  const textos = [];
  const lugar = nombreEscena(contenido, estado.jugador.escenaId);
  const robos = [...(estado.ext?.robos ?? [])];
  let saludEstado = EJ[Math.min(sub.estadoJugador, 3)];

  if (sub.fin === 'muerte') {
    const causa = TEXTOS_CRONICA.causa.muerte.replace('{rival}', rivalTxt);
    ext.muerto = { dia: estado.reloj.dia, escena: estado.jugador.escenaId, causa };
    textos.push(cronicaFinal({ amp, contenido, estado, lugar, causa, rng }));
    ext.salud = { estado: 'muerto', dia: estado.reloj.dia };
    return { estado: e, texto: textos.join('\n\n'), ext };
  }
  if (sub.fin === 'robado' || (sub.fin === 'inconsciente' && (sub.rival.rasgos.codicia ?? 0) >= 2 && sub.rival.clase !== 'animal')) {
    const r = robar(e, sub, contenido, rng);
    e = r.estado;
    if (r.robo.monto > 0 || r.robo.objetos.length) robos.push(r.robo);
  }
  if (sub.fin === 'negociado') {
    const t = totalB(e.jugador); const pago = Math.ceil(t * 0.3);
    e = { ...e, jugador: conTotalB(e.jugador, t - pago) };
  }
  if (sub.fin === 'inconsciente') {
    const horas = 2 + Math.floor(rng() * 7);
    const salidas = escenaDef(contenido, e.jugador.escenaId)?.salidas ?? [];
    const destino = rng() < 0.5 || !salidas.length ? e.jugador.escenaId : salidas[Math.floor(rng() * salidas.length)];
    e = { ...e, reloj: avanzar(e.reloj, horas), jugador: { ...e.jugador, escenaId: destino } };
    textos.push(L('desenlaces.despertar', { lugar: nombreEscena(contenido, destino) }));
    saludEstado = 'grave';
  }
  if (sub.fin === 'huida_exitosa') {
    const salidas = escenaDef(contenido, e.jugador.escenaId)?.salidas ?? [];
    if (salidas.length) e = { ...e, jugador: { ...e.jugador, escenaId: salidas[Math.floor(rng() * salidas.length)] } };
  }
  if (sub.fin === 'victoria') {
    const lista = (T.desenlaces?.victoria ?? []).filter((t) => sub.rivalMuerto || !/no se mueve/.test(t));
    textos.push(linea(lista, { rival: rivalTxt }, rng));
    if (sub.rivalMuerto && sub.npcId) {
      ext.npcsMuertos = [...new Set([...(estado.ext?.npcsMuertos ?? []), sub.npcId])];
      ext.hechosSistema = { ...(estado.ext?.hechosSistema ?? {}), [`mato:${sub.npcId}`]: estado.reloj.dia };
      Object.assign(ext, hechoDeLey(estado, contenido, { verbo: 'mató', npcId: sub.npcId, testigos: sub.testigos, escena: sub.escena }));
    }
  }
  if (['magullado', 'herido', 'grave'].includes(saludEstado) && sub.fin !== 'inconsciente') { if (saludEstado !== 'magullado') textos.push(L('desenlaces.herido')); }
  if (saludEstado !== 'ileso') ext.salud = { ...(estado.ext?.salud ?? {}), estado: saludEstado, dia: e.reloj.dia };
  // Y7: ganarle al ladrón devuelve lo que queda del botín.
  if (sub.roboId && sub.fin === 'victoria') {
    const r = robos.find((x) => x.id === sub.roboId && x.estado === 'activo');
    if (r) {
      const queda = recuperable(r, e.reloj.dia);
      e = { ...e, jugador: conTotalB(e.jugador, totalB(e.jugador) + queda), inventario: [...(e.inventario ?? []), ...(r.objetos ?? []).map((o) => ({ objetoId: o, usosRestantes: 1 }))] };
      robos.splice(robos.indexOf(r), 1, { ...r, estado: 'recuperado' });
      textos.push(linea(TEXTOS_ROBO.recupera, { monto: (queda / 100 >= 1 ? `${Math.floor(queda / 100)} de plata${queda % 100 ? ` y ${queda % 100} de bronce` : ''}` : `${queda} de bronce`) }, rng));
    }
  }
  if (JSON.stringify(robos) !== JSON.stringify(estado.ext?.robos ?? [])) ext.robos = robos;
  return { estado: e, texto: textos.filter(Boolean).join(' '), ext };
}

/** Partida cerrada por muerte: solo se acepta «nueva partida». */
export const partidaCerrada = (estado) => !!estado?.ext?.muerto;
export const pideNuevaPartida = (texto) => /^(nueva partida|empezar de nuevo|otra partida)$/.test(normalizar(texto ?? ''));
export { EJ, CFG };
