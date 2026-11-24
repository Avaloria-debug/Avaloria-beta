// Construye la carpeta publicable (por defecto _site/). Uso (desde la raíz del repo):  node tools/construir.mjs [carpeta]
// - Copia solo lo que usa el navegador (sin docs/, tools/, .github/ ni *.md).
// - Completa sw.js: lista de precache = TODOS los archivos publicados, y CACHE_NAME = huella de su contenido.
//   Así el juego funciona sin conexión desde la primera visita y no hay que subir el número a mano:
//   cualquier cambio en un archivo cambia la huella y los celulares reciben el aviso "Hay una versión nueva".
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const INCLUIR = ['index.html', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', '.nojekyll', 'js', 'narrador', 'core', 'data', 'fonts'];
// No se precachean: el propio sw.js (el navegador lo revisa aparte) y el marcador de Pages.
const SIN_PRECACHE = new Set(['sw.js', '.nojekyll']);

function listar(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listar(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

/** @returns {{ salida: string, cache: string, precache: string[] }} */
export function construir({ raiz = RAIZ, salida = path.join(raiz, '_site') } = {}) {
  fs.rmSync(salida, { recursive: true, force: true });
  fs.mkdirSync(salida, { recursive: true });
  for (const item of INCLUIR) {
    const origen = path.join(raiz, item);
    if (!fs.existsSync(origen)) throw new Error(`construir: falta ${item}`);
    fs.cpSync(origen, path.join(salida, item), { recursive: true });
  }
  const archivos = listar(salida).filter((f) => !SIN_PRECACHE.has(f)).sort();
  const hash = crypto.createHash('sha256');
  for (const f of archivos) hash.update(f).update('\0').update(fs.readFileSync(path.join(salida, f))).update('\0');
  const cache = `avaloria-cache-${hash.digest('hex').slice(0, 12)}`;
  const precache = ['./', ...archivos.map((f) => `./${f}`)];

  const rutaSw = path.join(salida, 'sw.js');
  let sw = fs.readFileSync(rutaSw, 'utf8');
  const reCache = /const CACHE_NAME = '[^']*';/;
  const rePre = /const PRECACHE = \[\];[^\n]*/;
  if (!reCache.test(sw) || !rePre.test(sw)) throw new Error('construir: sw.js no tiene los marcadores CACHE_NAME / PRECACHE');
  sw = sw.replace(reCache, `const CACHE_NAME = '${cache}';`)
    .replace(rePre, () => `const PRECACHE = ${JSON.stringify(precache, null, 2)};`);
  fs.writeFileSync(rutaSw, sw);
  return { salida, cache, precache };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destino = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  const r = construir(destino ? { salida: destino } : {});
  console.log(`construido ${path.relative(process.cwd(), r.salida) || '.'}: ${r.precache.length} archivos precacheados, ${r.cache}`);
}
