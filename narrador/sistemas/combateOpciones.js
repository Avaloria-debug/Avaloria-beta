// Y3 (fase 9): generador de opciones del combate (botones vivos). 4–6 por ronda, nunca el mismo conjunto ni la misma
// frase dos rondas seguidas; al menos una A/B y una C/D para la intención actual (no se marcan). Fuentes: intención,
// entorno (focos de la escena), inventario (arma, comida, objeto), estado del rival, distancia y testigos.
import cfg from '../../data/config/combate.json' with { type: 'json' };
import t42 from '../../data/contenido/ampliado/t42-combate.json' with { type: 'json' };

const FEMENINOS = /^(banda|jauria|jauría|manada|vibora|víbora)\b/;
export const conArticulo = (nombre) => `${FEMENINOS.test(nombre) ? 'la' : 'el'} ${nombre}`;
/** Rellena placeholders de combate; «de el» → «del», «a el» → «al». */
export function rellenar(texto, v) {
  const t = texto.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined && v[k] !== null ? String(v[k]) : m));
  return t.replace(/\b([Dd])e el\b/g, '$1el').replace(/\b([Aa]) el\b/g, '$1l');
}

const SOLO_ANIMAL = new Set(['intimidar_animal', 'lanzar_comida']);
const NUNCA_ANIMAL = new Set(['hablar', 'ofrecer', 'entregar', 'amenazar', 'rendirse', 'gritar']);

function nivelDe(intencion, tipo) {
  const e = cfg.efectividad[intencion] ?? {};
  for (const n of ['A', 'B', 'C', 'D']) if ((e[n] ?? []).includes(tipo)) return n;
  return 'D';
}

/** Valores para rellenar los textos de opciones. */
export function valoresDe(sub) {
  return {
    rival: sub.rival.propio ? sub.rival.nombre : conArticulo(sub.rival.nombre), arma: sub.armaJugador ? `${sub.armaJugador}` : null,
    arma_rival: ['puño', 'ninguna', 'dientes', 'garras', 'colmillos', 'cuernos', 'cascos', 'pico', 'veneno'].includes(sub.rival.arma) ? null : `su ${sub.rival.arma}`,
    foco: sub.entorno?.[0] ?? null, obstaculo: sub.entorno?.[1] ?? sub.entorno?.[0] ?? null,
    objeto: sub.objeto ?? null, salida: sub.salida ?? null,
  };
}

/** Tipos posibles en este momento. */
export function tiposPosibles(sub) {
  const animal = sub.rival.clase === 'animal';
  const e = cfg.efectividad[sub.intencion] ?? {};
  const set = new Set(Object.values(e).flat());
  for (const t of ['golpear', 'retroceder', 'huir', 'esquivar']) set.add(t);
  if (sub.armaJugador && !sub.armaFuera) set.add('sacar_arma');
  if (sub.moral <= 0 || sub.intencion === 'dudar') { set.add('dejar_ir'); if (!animal) { set.add('hablar'); set.add('ofrecer'); } }
  if (sub.estadoRival >= 3) { set.add('dejar_ir'); set.add('rematar'); }
  if (!animal && sub.estadoJugador >= 2) set.add('rendirse');
  if (animal) { set.add('intimidar_animal'); if (sub.comida) set.add('lanzar_comida'); }
  const v = valoresDe(sub);
  return [...set].filter((t) => {
    if (animal ? NUNCA_ANIMAL.has(t) : SOLO_ANIMAL.has(t)) return false;
    if (t === 'gritar' && !(sub.testigos || sub.ciudadDia)) return false;
    if (t === 'entorno' && !v.foco) return false;
    if (t === 'lanzar_comida' && !sub.comida) return false;
    if (t === 'rematar' && sub.estadoRival < 3) return false;
    if ((t === 'ofrecer' || t === 'entregar') && !v.objeto && !textosDe(t, v).length) return false;
    return textosDe(t, v).length > 0;
  });
}

/** Variantes de un tipo con todos sus placeholders resolubles. */
export function textosDe(tipo, v) {
  return (t42.opciones[tipo] ?? []).filter((x) => [...x.matchAll(/\{(\w+)\}/g)].every((m) => v[m[1]] !== null && v[m[1]] !== undefined)).map((x) => rellenar(x, v));
}

const barajar = (l, rng) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** 4–6 opciones { texto, tipo, datos }. */
export function generarOpciones(sub, rng) {
  const [min, max] = cfg.opciones_por_ronda;
  const n = min + Math.floor(rng() * (max - min + 1));
  const posibles = barajar(tiposPosibles(sub), rng);
  const AB = posibles.filter((t) => ['A', 'B'].includes(nivelDe(sub.intencion, t)));
  const CD = posibles.filter((t) => !AB.includes(t));
  const previos = new Set((sub.opciones ?? []).map((o) => o.tipo));
  const elegidos = [];
  if (AB.length) elegidos.push(AB[0]);
  if (CD.length) elegidos.push(CD[0]);
  for (const t of posibles) if (elegidos.length < n && !elegidos.includes(t)) elegidos.push(t);
  // Nunca el mismo conjunto que la ronda anterior.
  if (previos.size && elegidos.length === previos.size && elegidos.every((t) => previos.has(t))) {
    const fuera = posibles.find((t) => !previos.has(t));
    if (fuera) elegidos.splice(elegidos.length - 1, 1, fuera);
    else elegidos.pop();
  }
  const v = valoresDe(sub);
  const usados = new Set((sub.opciones ?? []).map((o) => o.texto));
  const out = [];
  for (const t of elegidos) {
    const libres = textosDe(t, v).filter((x) => !usados.has(x) && !out.some((o) => o.texto === x));
    if (!libres.length) continue;
    out.push({ texto: libres[Math.floor(rng() * libres.length)], tipo: t, datos: { intencion: sub.intencion } });
  }
  return out.slice(0, max);
}
