// Verifica narrador/iaLocal/modelo-manifest.json contra la realidad. Necesita red. Uso (desde la raíz del repo):
//   node tools/verificar-modelo.mjs                  ids contra el motor publicado + tamaño real en Hugging Face
//   node tools/verificar-modelo.mjs --sin-hf         solo los ids (sin consultar Hugging Face)
//   node tools/verificar-modelo.mjs --archivo ruta   usa un archivo local del motor (ej. lib/index.js de @mlc-ai/web-llm) en vez de bajarlo
// Comprueba: (1) cada modeloId existe en el motor, (2) cada `origen` coincide con la URL del modelo en el motor,
// (3) el tamaño real de los pesos (suma de archivos del repo en Hugging Face) vs `tamanoMB` del manifest (aviso si difiere >30 %).
// No prueba WebGPU ni la descarga real en el dispositivo: eso sigue siendo a mano en un celular.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const sinHf = args.includes('--sin-hf');
const iArchivo = args.indexOf('--archivo');
const archivoLocal = iArchivo >= 0 ? args[iArchivo + 1] : null;

const manifest = JSON.parse(fs.readFileSync(path.join(RAIZ, 'narrador/iaLocal/modelo-manifest.json'), 'utf8'));
let fallos = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const aviso = (m) => console.log(`  aviso ${m}`);
const mal = (m) => { fallos += 1; console.log(`  MAL   ${m}`); };

const modelos = [manifest.principal, manifest.movil, ...(manifest.respaldo ?? [])].filter((m) => m?.modeloId);

console.log('1) Motor');
let fuente = '';
try {
  fuente = archivoLocal ? fs.readFileSync(archivoLocal, 'utf8') : await (await fetch(manifest.motor.origen)).text();
  if (fuente.length < 10000) throw new Error(`respuesta demasiado corta (${fuente.length} caracteres)`);
  ok(`${archivoLocal ?? manifest.motor.origen} (${Math.round(fuente.length / 1024)} KB)`);
} catch (e) {
  mal(`no se pudo leer el motor: ${e.message}`);
}

console.log('2) Modelos en el motor');
for (const m of modelos) {
  if (!fuente) break;
  if (!fuente.includes(m.modeloId)) { mal(`${m.modeloId}: no está en el motor (cambió el id o la versión)`); continue; }
  ok(`${m.modeloId} existe en el motor`);
  if (m.origen && !fuente.includes(m.origen)) aviso(`${m.modeloId}: el origen del manifest no aparece tal cual en el motor (${m.origen})`);
}

console.log('3) Tamaño en Hugging Face');
if (sinHf) aviso('omitido (--sin-hf)');
else {
  for (const m of modelos) {
    try {
      const repo = m.origen.replace(/^https?:\/\/huggingface\.co\//, '');
      const r = await fetch(`https://huggingface.co/api/models/${repo}?blobs=true`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const info = await r.json();
      const mb = Math.round((info.siblings ?? []).reduce((a, f) => a + (f.size ?? 0), 0) / 1048576);
      if (!mb) { aviso(`${m.modeloId}: Hugging Face no informó tamaños`); continue; }
      const desvio = Math.abs(mb - m.tamanoMB) / m.tamanoMB;
      (desvio > 0.3 ? aviso : ok)(`${m.modeloId}: real ${mb} MB, manifest ${m.tamanoMB} MB${desvio > 0.3 ? ' → actualizar tamanoMB' : ''}`);
    } catch (e) {
      aviso(`${m.modeloId}: no se pudo consultar Hugging Face (${e.message})`);
    }
  }
}

console.log(fallos === 0 ? '\nTodo en orden.' : `\n${fallos} problema(s).`);
process.exit(fallos === 0 ? 0 : 1);
