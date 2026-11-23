// Verificación sin dependencias. Uso (desde la raíz del repo):  node tools/verificar.mjs
// 1) archivos presentes  2) imports resolubles  3) humo en Node (crearPartida y narrar).
// No prueba el navegador: eso se hace a mano o con Chromium (ver LEEME-INTEGRACION.md).
import fs from 'node:fs';
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
if (!/avaloria-cache-v5/.test(sw)) mal('sw.js: la cache tiene que ser avaloria-cache-v5');

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
const { cargarAmpliadoNode } = await import(pathToFileURL(ruta('narrador/contenidoAmpliado.js')).href);
const r0 = await cargarAmpliadoNode({ dir: ruta('data/contenido/ampliado'), cargarPendientes: true });
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

console.log(fallos === 0 ? '\nTodo en orden.' : `\n${fallos} problema(s).`);
process.exit(fallos === 0 ? 0 : 1);
