// Verificación sin dependencias. Uso (desde la raíz del repo):  node tools/verificar.mjs
// 1) archivos presentes  2) imports resolubles  3) humo en Node (crearPartida y narrar)  4) contenido ampliado  5) build y precache.
// No prueba el navegador: eso se hace a mano o con Chromium (ver LEEME-INTEGRACION.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ruta = (...p) => path.join(RAIZ, ...p);
let fallos = 0;
const ok = (m) => console.log(`  ok  ${m}`);
const mal = (m) => { fallos += 1; console.log(`  MAL ${m}`); };

// ---- 1) archivos presentes ----
console.log('1) Archivos presentes');
const OBLIGATORIOS = [
  'index.html', 'manifest.json', 'sw.js', '.nojekyll', 'README.md', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png',
  '.github/workflows/static.yml', 'js/puente-narrador.js', 'narrador/index.js', 'narrador/iaLocal/modelo-manifest.json',
  'data/contenido/contenido-v3.json', 'data/contenido/ampliado/manifest.json', 'data/config/escenas.json',
  'data/diccionarios/diccionario-lexico.md', 'fonts/cinzel-latin-400-normal.woff2', 'fonts/cormorant-garamond-latin-400-normal.woff2',
];
for (const f of OBLIGATORIOS) (fs.existsSync(ruta(f)) ? ok : mal)(f);
const manifest = JSON.parse(fs.readFileSync(ruta('manifest.json'), 'utf8'));
for (const i of manifest.icons ?? []) (fs.existsSync(ruta(i.src)) ? ok : mal)(`manifest → ${i.src}`);
const ampManifest = JSON.parse(fs.readFileSync(ruta('data/contenido/ampliado/manifest.json'), 'utf8'));
for (const a of ampManifest.archivos ?? []) if (!fs.existsSync(ruta('data/contenido/ampliado', a.f))) mal(`ampliado/${a.f}`);
const sw = fs.readFileSync(ruta('sw.js'), 'utf8');
for (const m of sw.matchAll(/'\.\/([^']+)'/g)) if (!fs.existsSync(ruta(m[1]))) mal(`sw.js precache → ${m[1]}`);
for (const m of fs.readFileSync(ruta('index.html'), 'utf8').matchAll(/url\('(fonts\/[^']+)'\)/g)) (fs.existsSync(ruta(m[1])) ? ok : mal)(`css → ${m[1]}`);
if (!/const CACHE_NAME = 'avaloria-cache-[\w-]+';/.test(sw)) mal('sw.js: falta CACHE_NAME = \'avaloria-cache-…\' (lo completa tools/construir.mjs)');
if (!/cache: 'reload'/.test(sw)) mal("sw.js: el precache tiene que usar cache: 'reload' (si no, puede guardar archivos viejos de la caché HTTP)");
if (!/const PRECACHE = \[\];/.test(sw)) mal('sw.js: falta el marcador PRECACHE = [] que completa tools/construir.mjs');

// index.html: sin dependencias externas (todo local y offline), zoom permitido y claves ocultas.
const html = fs.readFileSync(ruta('index.html'), 'utf8');
(!/fonts\.(googleapis|gstatic)\.com/.test(html) ? ok : mal)('index.html: sin Google Fonts (las fuentes son locales)');
(!/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(html) ? ok : mal)('index.html: el viewport permite zoom');
(/id="api-key-input" type="password"/.test(html) && /id="settings-api-input" type="password"/.test(html) ? ok : mal)('index.html: las claves de Groq van en type="password"');

// ---- 2) imports resolubles (estáticos y dinámicos, con rutas relativas) ----
console.log('2) Imports resolubles');
const RE = /(?:^|[^\w.$])(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const vistos = new Set();
let imports = 0;
function visitar(f) {
  if (vistos.has(f)) return;
  vistos.add(f);
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch { mal(`no existe ${path.relative(RAIZ, f)}`); return; }
  for (const m of src.matchAll(RE)) {
    const s = m[1] ?? m[2];
    if (s.startsWith('node:')) continue; // solo en la rama de Node
    if (!s.startsWith('.')) { mal(`import no relativo en ${path.relative(RAIZ, f)}: ${s}`); continue; }
    imports += 1;
    visitar(path.resolve(path.dirname(f), s));
  }
}
visitar(ruta('js/puente-narrador.js'));
ok(`${vistos.size} módulos, ${imports} imports relativos`);
// Todo .js bajo narrador/ y core/ tiene que ser alcanzable o ser un módulo de Node declarado.
const SOLO_NODE = new Set(['narrador/cargarContenido.js']);
for (const dir of ['narrador', 'core']) {
  const rec = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return rec(p);
    if (/\.test\.js$/.test(e.name)) mal(`test en el repo: ${path.relative(RAIZ, p)}`);
    if (e.name.endsWith('.js') && !vistos.has(p) && !SOLO_NODE.has(path.relative(RAIZ, p))) mal(`módulo sin usar: ${path.relative(RAIZ, p)}`);
  });
  rec(ruta(dir));
}

// ---- 3) humo en Node ----
console.log('3) Humo en Node');
const { crearPartida, narrar, contenido } = await import(pathToFileURL(ruta('narrador/index.js')).href);
const { cargarAmpliadoNode, cargarAmpliadoFetch, leerArchivosAmpliado, validarAmpliado, seCarga, vaciarCacheAmpliado, OPCIONES_AMPLIADO_PRODUCCION } = await import(pathToFileURL(ruta('narrador/contenidoAmpliado.js')).href);
const r0 = await cargarAmpliadoNode({ dir: ruta('data/contenido/ampliado'), ...OPCIONES_AMPLIADO_PRODUCCION });
const ampliado = r0.ampliado ?? r0;
let estado = crearPartida({ semilla: 'verificar' });
estado.jugador.nombre = 'Prueba';
(estado.jugador.escenaId === contenido.reglas.escenaInicial ? ok : mal)('crearPartida: escena inicial');
const turnos = [
  { tipo: 'texto', texto: 'miro alrededor' },
  { tipo: 'texto', texto: 'hola' },
  { tipo: 'boton', intencionId: 'intencion_examinar', parametros: {} },
  { tipo: 'texto', texto: 'voy al archivo real' },
  { tipo: 'texto', texto: 'qwertyuiop asdf' },
];
for (const t of turnos) {
  const s = await narrar(estado, t, { ampliado, densidad: 'normal' });
  estado = s.estado;
  const bien = typeof s.texto === 'string' && s.texto.trim() !== '' && s.tipo !== 'error';
  (bien ? ok : mal)(`narrar ${JSON.stringify(t.texto ?? t.intencionId)} → ${s.tipo}, ${s.nivel?.nivel}`);
}
(estado.reloj.dia >= 1 ? ok : mal)(`reloj: día ${estado.reloj.dia}, ${estado.reloj.hora}`);
// Sin clave de Groq ni IA local, un texto que no se entiende no rompe el turno ni nombra tokens.
const raro = await narrar(estado, { tipo: 'texto', texto: 'zzzz xxxx qqqq' }, { ampliado });
(!/token|cupo|límite|limite/i.test(raro.texto) ? ok : mal)('sin aviso de tokens al jugador');

// ---- 4) contenido ampliado: coherencia y paridad con el navegador ----
console.log('4) Contenido ampliado');
const aviso = (m) => console.log(`  aviso ${m}`);
const dirAmp = ruta('data/contenido/ampliado');
const archivosAmp = await leerArchivosAmpliado(dirAmp);
const erroresAmp = validarAmpliado(archivosAmp, contenido);
(erroresAmp.length === 0 ? ok : mal)(`validarAmpliado: ${erroresAmp.length} errores${erroresAmp.length ? ' → ' + erroresAmp.slice(0, 3).join(' | ') : ''}`);
// El estado del manifest y el del propio archivo tienen que coincidir (el fetch filtra por uno y la fusión por el otro).
for (const [nombre, d] of archivosAmp) {
  const m = (ampManifest.archivos ?? []).find((a) => a.f === nombre);
  if (!m) { mal(`ampliado/${nombre}: no está en el manifest`); continue; }
  if (d.estado !== m.estado) mal(`ampliado/${nombre}: estado del manifest (${m.estado}) ≠ estado del archivo (${d.estado})`);
}
// Paridad: lo que carga el navegador (fetch) = lo que carga Node con el mismo criterio.
const fakeFetch = async (url) => {
  const p = fileURLToPath(url);
  try { const j = JSON.parse(fs.readFileSync(p, 'utf8')); return { ok: true, status: 200, json: async () => j }; } catch { return { ok: false, status: 404, json: async () => null }; }
};
vaciarCacheAmpliado();
const rNav = await cargarAmpliadoFetch({ base: pathToFileURL(dirAmp + path.sep), fetch: fakeFetch, v3: contenido, ...OPCIONES_AMPLIADO_PRODUCCION });
const { isDeepStrictEqual } = await import('node:util');
(rNav.avisos.length === 0 ? ok : mal)(`carga por fetch sin avisos (${rNav.avisos.length})`);
(isDeepStrictEqual(rNav.ampliado, ampliado) ? ok : mal)('paridad: fetch (navegador) = Node con OPCIONES_AMPLIADO_PRODUCCION');
// Imports estáticos de JSON ampliado: esquivan el filtro por estado. Los que no cargan en producción se avisan; uno nuevo es un fallo.
const ESTATICOS_CONOCIDOS = new Set(['valores.json']); // canon propuesto que la economía y el combate usan siempre
const estaticos = new Map();
const recorrer = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return recorrer(p);
  if (!e.name.endsWith('.js')) return;
  for (const m of fs.readFileSync(p, 'utf8').matchAll(/from\s+['"][^'"]*data\/contenido\/ampliado\/([^'"]+\.json)['"]/g)) estaticos.set(m[1], [...(estaticos.get(m[1]) ?? []), path.relative(RAIZ, p)]);
});
recorrer(ruta('narrador'));
for (const [nombre, usos] of estaticos) {
  const estado = (ampManifest.archivos ?? []).find((a) => a.f === nombre)?.estado;
  if (seCarga(estado, OPCIONES_AMPLIADO_PRODUCCION)) ok(`import estático ${nombre} (${estado}) coincide con el criterio de carga`);
  else if (ESTATICOS_CONOCIDOS.has(nombre)) aviso(`import estático ${nombre} (${estado}) se usa aunque no cargue por fetch: ${usos.join(', ')}`);
  else mal(`import estático ${nombre} (${estado}) esquiva el filtro por estado: ${usos.join(', ')}`);
}

// ---- 5) build y precache (offline desde la primera visita) ----
console.log('5) Build y precache');
const { construir } = await import(pathToFileURL(ruta('tools/construir.mjs')).href);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'avaloria-build-'));
try {
  const b1 = construir({ raiz: RAIZ, salida: path.join(tmp, 'a') });
  const b2 = construir({ raiz: RAIZ, salida: path.join(tmp, 'b') });
  (b1.cache === b2.cache && /^avaloria-cache-[0-9a-f]{12}$/.test(b1.cache) ? ok : mal)(`huella estable entre dos builds: ${b1.cache}`);
  const swOut = fs.readFileSync(path.join(b1.salida, 'sw.js'), 'utf8');
  (/PRECACHE = \[\];/.test(swOut) || /avaloria-cache-dev/.test(swOut) ? mal : ok)('sw.js construido sin marcadores');
  const faltan = b1.precache.filter((p) => p !== './' && !fs.existsSync(path.join(b1.salida, p)));
  (faltan.length === 0 ? ok : mal)(`precache: ${b1.precache.length} entradas, todas existen${faltan.length ? ' (faltan ' + faltan.slice(0, 3).join(', ') + ')' : ''}`);
  const pre = new Set(b1.precache);
  const sinPrecache = [...vistos].map((f) => './' + path.relative(RAIZ, f).split(path.sep).join('/')).filter((p) => !pre.has(p));
  (sinPrecache.length === 0 ? ok : mal)(`cada módulo del puente está precacheado${sinPrecache.length ? ': ' + sinPrecache.slice(0, 3).join(', ') : ''}`);
  const DATOS = ['./', './index.html', './manifest.json', './data/contenido/contenido-v3.json', './data/contenido/ampliado/manifest.json', './narrador/iaLocal/modelo-manifest.json',
    ...ampManifest.archivos.map((a) => `./data/contenido/ampliado/${a.f}`),
    ...['diccionario-lexico', 'ortografia-tipeo', 'temas-conocimiento', 'frases-patrones', 'contexto-palabras'].map((d) => `./data/diccionarios/${d}.md`)];
  const sinDato = DATOS.filter((p) => !pre.has(p));
  (sinDato.length === 0 ? ok : mal)(`datos que el juego pide al arrancar, precacheados${sinDato.length ? ': ' + sinDato.slice(0, 3).join(', ') : ''}`);
  const colados = b1.precache.filter((p) => /^\.\/(docs|tools|\.github)\//.test(p) || /\.md$/.test(p) && !p.startsWith('./data/'));
  (colados.length === 0 ? ok : mal)(`_site sin docs/, tools/, .github/ ni .md sueltos${colados.length ? ': ' + colados.join(', ') : ''}`);
  const png = fs.readFileSync(path.join(b1.salida, 'icon-512.png'));
  const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  (w === 512 && h === 512 ? ok : mal)(`icon-512.png mide ${w}×${h} (el manifest declara 512×512)`);
  const kb = Math.round(b1.precache.filter((p) => p !== './').reduce((a, p) => a + fs.statSync(path.join(b1.salida, p)).size, 0) / 1024);
  ok(`peso del precache: ${kb} KB`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(fallos === 0 ? '\nTodo en orden.' : `\n${fallos} problema(s).`);
process.exit(fallos === 0 ? 0 : 1);
