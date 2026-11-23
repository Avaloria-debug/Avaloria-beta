// Puente entre el juego (index.html) y el narrador por código. Expone window.Narrador.
// Prioridad del narrador: código → Groq → IA local → plantilla. Nunca avisa al jugador de falta de tokens.
// Todo el texto que sale de acá viene del narrador; este archivo solo lo ordena.
import { crearPartida, cargarPartida, narrar, contenido, problemasDiccionarios } from '../narrador/index.js';
import { textoDeProblemasDeDiccionarios } from '../narrador/diccionarios.js';
import { cargarAmpliadoPagina } from '../narrador/prueba/ampliado.js';
import { ExportacionArchivo } from '../narrador/registro/exportacionArchivo.js';
import { crearIaLocal } from '../narrador/iaLocal/motor.js';
import { detectar, nivelDeIa } from '../narrador/iaLocal/capacidad.js';
import { botonesDeTurno, enCombate } from '../narrador/prueba/filaOpciones.js';
import { opcionesDeEscena, entradaDeBoton } from '../narrador/prueba/panel.js';
import { esNoEntendida, guardarNoEntendida, leerNoEntendidas, exportarNoEntendidas } from '../narrador/prueba/noEntendidas.js';
import { estadoDeBoton, textoDeAviso, textoDeProgreso, CLAVE_FLAG, leerFlag } from '../narrador/prueba/iaLocalPagina.js';
import { textoDiario, diarioGuardado } from '../narrador/diario.js';
import { estacionDe } from '../narrador/calendario.js';
import { totalBronce, formatoMonto } from '../narrador/economia/monedas.js';
import { crearRng } from '../narrador/azar.js';
import { VERSION } from '../narrador/version.js';

if (problemasDiccionarios.length > 0) throw new Error(textoDeProblemasDeDiccionarios(problemasDiccionarios));

const { ampliado, avisos: avisosAmpliado } = await cargarAmpliadoPagina({ v3: contenido });
if (avisosAmpliado.length > 0) console.warn('contenido ampliado no cargado', avisosAmpliado);

export const CLAVES = Object.freeze({ groq: 'avaloriaGroqApiKey', densidad: 'avaloriaDensidad' });
const DENSIDADES = ['breve', 'normal', 'rica'];
const lista = (v) => (Array.isArray(v) ? v : []);
const porId = (l, id) => lista(l).find((x) => x.id === id);
const leerLS = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const escribirLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

// Registros de turnos (solo memoria, exportables) y frases no entendidas (localStorage del navegador).
const registros = new ExportacionArchivo();

export function densidadGuardada() {
  const d = leerLS(CLAVES.densidad);
  return DENSIDADES.includes(d) ? d : 'normal';
}
export function guardarDensidad(d) { if (DENSIDADES.includes(d)) escribirLS(CLAVES.densidad, d); }

// ---- Partida ----
export function nueva(nombre = '') {
  const e = crearPartida();
  return { ...e, jugador: { ...e.jugador, nombre: String(nombre ?? '') } };
}
export const cargar = (json) => cargarPartida(json);

// ---- IA local ----
let iaLocal = null;
let manifestIa = null;
let estadoIa = 'apagada';
let alCambioIa = () => {};
let progresoIa = '';
const env = () => ({ navigator, sessionStorage, localStorage, location, window });
try { manifestIa = await (await fetch(new URL('../narrador/iaLocal/modelo-manifest.json', import.meta.url))).json(); } catch { manifestIa = null; }

function infoIa() {
  const info = detectar(env());
  return { ...info, nivel: nivelDeIa(info) };
}
/** Motivo visible cuando el dispositivo no puede correr la IA local; null si es compatible. */
export function motivoNoCompatible() {
  const i = infoIa();
  if (i.param === '0') return 'La IA local está apagada por la dirección (?ialocal=0).';
  if (!manifestIa) return 'No se pudo leer la configuración del modelo.';
  if (i.nivel !== 'ninguna') return null;
  if (i.ios) return 'iOS todavía no permite la IA local en el navegador.';
  if (i.enApp) return 'Está abierto dentro de otra app (WebView). Ábralo en Chrome.';
  if (!i.webgpu) return 'Este navegador no tiene WebGPU.';
  if (i.bloqueada) return 'Una carga anterior falló en este dispositivo.';
  return 'Este dispositivo no es compatible.';
}
const claveGroq = () => (leerLS(CLAVES.groq) ?? '').trim();

export const ia = {
  compatible: () => motivoNoCompatible() === null,
  motivo: motivoNoCompatible,
  estado: () => estadoIa,
  progreso: () => progresoIa,
  aviso: () => textoDeAviso(infoIa(), manifestIa),
  botonTexto: () => estadoDeBoton(infoIa(), estadoIa),
  /** Aviso automático: sin clave de Groq, dispositivo compatible y IA local todavía apagada y sin decidir. */
  debeAvisar: () => claveGroq() === '' && ia.compatible() && estadoIa === 'apagada' && leerLS(CLAVE_FLAG) !== '1' && leerLS('avaloriaIaLocalAvisada') !== '1',
  marcarAvisada: () => escribirLS('avaloriaIaLocalAvisada', '1'),
  alCambio: (fn) => { alCambioIa = typeof fn === 'function' ? fn : () => {}; },
  /** Instala y activa. Devuelve true si quedó lista. Se puede reintentar tras un fallo. */
  async activar() {
    if (!ia.compatible() || estadoIa === 'cargando' || estadoIa === 'lista') return estadoIa === 'lista';
    const info = infoIa();
    estadoIa = 'cargando'; progresoIa = ''; alCambioIa();
    iaLocal = crearIaLocal({ manifest: manifestIa, nivel: info.nivel, env: env(), alProgreso: (p) => { progresoIa = textoDeProgreso(p); alCambioIa(); } });
    let ok = false;
    try { ok = await iaLocal.cargar(); } catch { ok = false; }
    estadoIa = ok ? 'lista' : 'fallida';
    if (ok) escribirLS(CLAVE_FLAG, '1'); else iaLocal = null;
    alCambioIa();
    return ok;
  },
  /** Se activa sola en aperturas siguientes si el jugador ya la instaló. */
  async autoActivar() {
    if (ia.compatible() && leerFlag(location, localStorage) && estadoIa === 'apagada') return ia.activar();
    return false;
  },
};

// ---- Turno ----
/**
 * Un turno. entrada: { tipo: 'texto', texto } o la que da entradaDeBoton / botonesDeTurno.
 * @returns {Promise<{ texto, estado, tipo, errores, nivel, noEntendida }>}
 */
export async function turno(estado, entrada, { groqKey = claveGroq() || null, densidad = densidadGuardada() } = {}) {
  const antes = estado;
  const local = iaLocal?.listo() ? { listo: () => true, pedir: (o) => iaLocal.pedir(o) } : null;
  const salida = await narrar(estado, entrada, { groqKey: groqKey || null, registroTurnos: registros, ...(ampliado ? { ampliado } : {}), ...(local ? { iaLocal: local } : {}), densidad });
  const noEntendida = entrada?.tipo === 'texto' && esNoEntendida(salida);
  if (noEntendida) guardarNoEntendida(localStorage, entrada.texto, antes);
  return { texto: salida.texto, estado: salida.estado, tipo: salida.tipo, errores: salida.errores, nivel: salida.nivel, noEntendida };
}

// ---- Vista del estado (hora, estación, salud, escena, fondo) ----
const FONDO_POR_ESCENA = {
  escena_mercado_circular: 'mercado', escena_plaza_cambistas: 'mercado', escena_archivo_real: 'archivo',
  escena_taberna_lareth: 'taberna', escena_biblioteca_publica: 'conocimiento', escena_aula_cartografia: 'conocimiento',
  escena_camino_norte: 'camino', escena_camino_este: 'camino', escena_camino_sur: 'camino', escena_cruce_colinas: 'camino',
  escena_lago_espejos: 'bosque', escena_puente_aduana: 'frontera',
};
const INTERIORES = new Set(['archivo', 'taberna', 'conocimiento']);
const SALUD_TEXTO = {
  ileso: 'Se siente bien, sin heridas.',
  magullado: 'Tiene algún golpe, pero está entero.',
  herido: 'Le duele el cuerpo y moverse cuesta.',
  grave: 'Está muy malherido y le cuesta mantenerse en pie.',
  inconsciente: 'Está muy malherido y le cuesta mantenerse en pie.',
  muerto: 'Está al borde de la muerte.',
};
const ESTACION_TEXTO = { primavera: 'primavera', verano: 'verano', otono: 'otoño', invierno: 'invierno' };
const ANIO_INICIAL = 763;

export function fondoDe(estado) {
  const base = FONDO_POR_ESCENA[estado?.jugador?.escenaId] ?? 'ciudad';
  const h = Number.parseInt(String(estado?.reloj?.hora ?? '12:00'), 10);
  return !INTERIORES.has(base) && (h >= 21 || h < 5) ? 'noche' : base;
}

export function vista(estado) {
  const escena = porId(contenido.escenas, estado.jugador.escenaId);
  const dia = estado.reloj.dia;
  const nivel = estado.ext?.salud?.estado ?? 'ileso';
  return {
    escenaId: estado.jugador.escenaId,
    lugar: escena?.nombre ?? '',
    ciudad: escena?.ciudad ?? '',
    fondo: fondoDe(estado),
    hora: estado.reloj.hora,
    dia,
    estacion: ESTACION_TEXTO[estacionDe(dia)] ?? estacionDe(dia),
    anio: ANIO_INICIAL + Math.floor((dia - 1) / 360),
    salud: nivel,
    saludTexto: SALUD_TEXTO[nivel] ?? SALUD_TEXTO.ileso,
    muerto: Boolean(estado.ext?.muerto),
    causaMuerte: estado.ext?.muerto?.causa ?? '',
    enCombate: enCombate(estado),
  };
}

export function mochila(estado) {
  const cuenta = new Map();
  for (const i of lista(estado.inventario)) cuenta.set(i.objetoId, (cuenta.get(i.objetoId) ?? 0) + 1);
  return {
    monedas: formatoMonto(totalBronce(estado.jugador)),
    objetos: [...cuenta].map(([id, n]) => ({ id, nombre: porId(contenido.objetos, id)?.nombre ?? id, cantidad: n })),
  };
}

export function diario(estado) {
  const rng = crearRng(Number.isInteger(estado.semilla) ? estado.semilla : 0);
  try { return textoDiario(diarioGuardado(estado.ext), { amp: ampliado ?? {}, contenido, rng }); } catch { return ''; }
}

export const botones = (estado) => (ampliado ? botonesDeTurno(estado, { amp: ampliado, contenido }) : []);
export const acciones = (estado) => opcionesDeEscena(estado, contenido);

export const registrosDeTurnos = {
  cantidad: () => registros.cantidad,
  descargar: () => registros.descargar('registros-turnos.jsonl'),
};
export const noEntendidas = {
  cantidad: () => leerNoEntendidas(localStorage).length,
  async exportar() {
    const json = exportarNoEntendidas(localStorage);
    try { await navigator.clipboard.writeText(json); return 'copiado'; } catch {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = 'no-entendidas.json'; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
      return 'descargado';
    }
  },
};

window.Narrador = {
  VERSION, nueva, cargar, turno, entradaDeBoton, vista, mochila, diario, botones, acciones, enCombate,
  densidadGuardada, guardarDensidad, ia, registros: registrosDeTurnos, noEntendidas, CLAVES, contenido,
};
export default window.Narrador;
