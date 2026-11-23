// Y6 (fase 9): heridas y curación, solo narradas. `ext.salud = { estado, dia, curaDia }`:
// ileso → magullado → herido → grave. Cura un nivel cuando llega `curaDia` (combate.json.curacion_dias); descansar
// adelanta un día; la medicina, dos; el curandero cura un nivel ya (precio de combate.json). Curandero: NPC genérico
// en la taberna o el mercado (sin ficha). Se menciona al empezar el día y al hacer esfuerzo.
import cfg from '../../data/config/combate.json' with { type: 'json' };
import t42json from '../../data/contenido/ampliado/t42-combate.json' with { type: 'json' };
import { derivar } from '../azar.js';
import { normalizar } from '../comprension.js';
import { sinRepetir } from '../historial.js';
import { npcsPresentes } from '../turno.js';

export const NIVELES = Object.freeze(['ileso', 'magullado', 'herido', 'grave']);
export const ESCENAS_CURANDERO = Object.freeze(['escena_taberna_lareth', 'escena_mercado_circular']);
export const VERBOS_ESFUERZO = Object.freeze(['trabajar', 'explorar', 'viajar', 'huir', 'atacar', 'emboscar', 'avanzar_cautela']);
// A APROBAR (prov): avisos de salud y reacciones de NPC.
export const TEXTOS_SALUD = Object.freeze({
  prov: true,
  sin_curandero: ['Acá no hay quien cure heridas. En la taberna o en el mercado, quizás.'],
  sin_dinero: ['La curandera mira tus monedas y niega con la cabeza. «No alcanza.»'],
  ileso: ['No tenés nada que curar.'],
  cobra: ['Pagás {monto}.'],
  reaccion: {
    naela_tabernera: ['«Estás hecho un desastre. Sentate, que te traigo algo caliente», dice Naela.'],
    oren_peregrino: ['Oren te mira la herida y murmura una bendición en voz baja.'],
  },
});

const t42De = (amp) => amp?.combate ?? t42json;
const linea = (l, rng, v = {}) => { const x = sinRepetir((l ?? []).map((t) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m))); return x.length ? x[Math.floor(rng() * x.length)] : ''; };
const totalB = (j) => (j?.bronce ?? 0) + (j?.plata ?? 0) * 100;
const conTotalB = (j, t) => ({ ...j, bronce: Math.max(0, t) % 100, plata: Math.floor(Math.max(0, t) / 100) });
const fmt = (b) => { const p = Math.floor(b / 100); const r = b % 100; return p && r ? `${p} de plata y ${r} de bronce` : p ? `${p} de plata` : `${r} de bronce`; };

/** Días hasta curar un nivel desde `estado`. */
export function diasCura(estado, rng) {
  const d = cfg.curacion_dias[estado];
  if (Array.isArray(d)) return d[0] + Math.floor(rng() * (d[1] - d[0] + 1));
  return Number.isFinite(d) ? d : 0;
}
/** Salud con su día de cura (se calcula al entrar en un nivel). */
export function conCura(salud, dia, semillaBase = 0) {
  if (!salud || !NIVELES.includes(salud.estado) || salud.estado === 'ileso') return null;
  if (Number.isFinite(salud.curaDia)) return salud;
  return { ...salud, dia, curaDia: dia + diasCura(salud.estado, derivar(semillaBase, `cura:${salud.estado}:${dia}`)) };
}
const bajar = (salud, dia, semillaBase) => {
  const i = NIVELES.indexOf(salud.estado);
  return i <= 1 ? null : conCura({ estado: NIVELES[i - 1] }, dia, semillaBase);
};

/** Tick de salud del turno: cura por tiempo, menciones al empezar el día / al hacer esfuerzo, reacciones de NPC. */
export function tickSalud({ amp, contenido, antes, estado, ext, turno }) {
  let salud = ext?.salud && ext.salud.estado !== 'muerto' ? conCura(ext.salud, estado.reloj.dia, ext?.semillaBase) : null;
  if (!salud) return { ext: ext?.salud && ext.salud.estado !== 'muerto' ? { ...ext, salud: null } : ext, lineas: [] };
  const rng = derivar(ext?.semillaBase ?? 0, `salud:${estado.reloj.dia}:${estado.reloj.hora}`);
  const T = t42De(amp);
  const lineas = [];
  while (salud && estado.reloj.dia >= salud.curaDia) {
    salud = bajar(salud, salud.curaDia, ext?.semillaBase);
    if (!salud) lineas.push(linea(T.curacion?.recuperado, rng));
  }
  if (salud) {
    const nuevoDia = antes && estado.reloj.dia > antes.reloj.dia;
    const esfuerzo = VERBOS_ESFUERZO.includes(turno?.accion?.verbo);
    if ((nuevoDia || esfuerzo) && salud.estado !== 'magullado' || nuevoDia) lineas.push(linea(T.estados?.jugador?.[salud.estado], rng));
    if (['herido', 'grave'].includes(salud.estado) && salud.reaccion !== estado.reloj.dia) {
      const npc = npcsPresentes(estado, contenido).find((p) => TEXTOS_SALUD.reaccion[p.id]);
      if (npc) { lineas.push(linea(TEXTOS_SALUD.reaccion[npc.id], rng)); salud = { ...salud, reaccion: estado.reloj.dia }; }
    }
  }
  return { ext: { ...ext, salud }, lineas: lineas.filter(Boolean) };
}

const RE = Object.freeze({
  curandero: /(^| )(busco (un |una |a la |al )?(curandero|curandera|medico|sanador)|me curo|curarme|que me curen|curandero|curandera)( |$)/,
  medicina: /(^| )(compro (una |un )?(medicina|unguento|remedio|infusion)|tomo (la |el )?(medicina|remedio|infusion)|me pongo (el )?unguento)( |$)/,
  descanso: /^(descanso|descansar|me acuesto|duermo|reposo|hago reposo)( |$)/,
});

/** Turno de salud (texto con ampliado). null → sigue el flujo. Descansar no se intercepta (solo acelera en el tick). */
export function turnoDeSalud({ amp, contenido, partida, texto }) {
  const n = normalizar(texto);
  const cur = RE.curandero.test(n); const med = RE.medicina.test(n);
  if (!cur && !med) return null;
  const T = t42De(amp);
  const rng = derivar(partida.ext?.semillaBase ?? 0, `curar:${partida.reloj.dia}:${partida.reloj.hora}`);
  const salud = partida.ext?.salud && partida.ext.salud.estado !== 'muerto' ? conCura(partida.ext.salud, partida.reloj.dia, partida.ext?.semillaBase) : null;
  const turnoTexto = (estado, t, extra = {}) => ({ tipo: 'foco', estado: { ...estado, reformulacionPendiente: false }, intencionId: null, texto: t, foco: { id: null, verbo: 'salud' }, extFocos: extra });
  if (!salud) return turnoTexto(partida, linea(TEXTOS_SALUD.ileso, rng));
  if (cur && !ESCENAS_CURANDERO.includes(partida.jugador.escenaId)) return turnoTexto(partida, linea(TEXTOS_SALUD.sin_curandero, rng));
  const [a, b] = cur ? cfg.curandero_precio : cfg.medicina_precio;
  const precio = a + Math.floor(derivar(partida.ext?.semillaBase ?? 0, `precio_cura:${partida.reloj.dia}:${cur}`)() * (b - a + 1));
  const total = totalB(partida.jugador);
  if (total < precio) return turnoTexto(partida, linea(TEXTOS_SALUD.sin_dinero, rng));
  const pagado = { ...partida, jugador: conTotalB(partida.jugador, total - precio) };
  const nueva = cur ? bajar(salud, partida.reloj.dia, partida.ext?.semillaBase) : { ...salud, curaDia: salud.curaDia - 2 };
  const txt = [linea(cur ? T.curacion?.curandero : T.curacion?.medicina, rng), linea(TEXTOS_SALUD.cobra, rng, { monto: fmt(precio) }), nueva ? '' : linea(T.curacion?.recuperado, rng)].filter(Boolean).join(' ');
  return turnoTexto(pagado, txt, { salud: nueva });
}

/** Descansar con heridas adelanta un día la cura (se llama desde el tick si el verbo fue descansar). */
export function descansoAcelera(ext) {
  if (!ext?.salud || !Number.isFinite(ext.salud.curaDia)) return ext;
  return { ...ext, salud: { ...ext.salud, curaDia: ext.salud.curaDia - 1 } };
}
