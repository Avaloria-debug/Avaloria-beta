# Tutorial: publicar Avaloria-beta

Repo: https://github.com/Avaloria-debug/Avaloria-beta · Sitio: https://avaloria-debug.github.io/Avaloria-beta/

## a) Subir los archivos

Descomprimí `avaloria-repo.zip` en una carpeta. Adentro está todo lo que va en la **raíz** del repo (sin carpeta contenedora).

**Desde la web (sin instalar nada)**
1. Entrá al repo → **Add file → Upload files**.
2. GitHub acepta **100 archivos por vez**. Subí en dos tandas:
   - Tanda 1: todo el contenido de la carpeta **menos** `narrador/` (archivos sueltos, incluido `eslint.config.mjs`, y carpetas `.github`, `core`, `data`, `docs`, `fonts`, `js`, `tools`).
   - Tanda 2: la carpeta `narrador/`.
3. Arrastrá el *contenido* (no la carpeta que lo contiene). Abajo: **Commit changes** → rama `main`.
4. Las carpetas que empiezan con punto (`.github`, `.nojekyll`) quedan ocultas en Mac (Cmd+Shift+. las muestra). Si no se suben, el sitio no se publica: verificá que exista `.github/workflows/static.yml` en el repo.

**Con git**
```
git clone https://github.com/Avaloria-debug/Avaloria-beta.git
cd Avaloria-beta
# copiá acá todo el contenido descomprimido (incluidos los archivos ocultos)
git add -A
git commit -m "Juego con narrador integrado"
git push origin main
```

## b) Activar Pages
1. En el repo: **Settings → Pages → Source: GitHub Actions**.
2. Cada push a `main` corre `static.yml` (pestaña **Actions**). Esperá 1–2 minutos.
3. Abrí https://avaloria-debug.github.io/Avaloria-beta/

## c) Instalar como app en Android
Abrí el sitio en **Chrome** → menú ⋮ → **Instalar app** (o **Agregar a la pantalla principal**). Se abre a pantalla completa y funciona sin conexión después de la primera carga.

## d) IA local
Sirve cuando no tenés clave de Groq. Necesita Chrome con WebGPU en el celular (Android reciente).
- Si el dispositivo es compatible, al entrar al juego aparece un aviso. También: **Ajustes → IA local → Instalar y activar IA local**.
- Descarga el modelo una sola vez (cientos de MB; mejor con wifi) y muestra el progreso. Si falla, el mismo botón dice **Reintentar**.
- En las aperturas siguientes se activa sola. El chip **IA local** aparece en la fila de botones.
- Si no es compatible (otra app con WebView, sin WebGPU, iPhone), **Ajustes** muestra el motivo y el juego sigue andando con el narrador por código.

## e) Clave de Groq (opcional)
Menú de guardado (ícono de disquete) → **Cambiar API key**, o **Ajustes → Clave**. Pegá la clave `gsk_…` y **Guardar clave**. Sin clave el juego funciona igual.

## f) Actualizar el juego
1. Subí los archivos cambiados al repo (web o `git push`). El workflow corre `tools/verificar.mjs` y ESLint, y si pasan construye `_site/` y publica. Si fallan, no se publica nada (pestaña **Actions**).
2. No hace falta tocar `sw.js`: `tools/construir.mjs` calcula la versión de la caché a partir del contenido de los archivos y precachea todo el juego.
3. Al abrir el juego, aparece **Hay una versión nueva** → tocá **Recargar**.
4. Para forzarlo a mano: Chrome → ⋮ → Configuración del sitio → Borrar datos (borra también tus partidas guardadas), o en PC, DevTools → Application → Service Workers → Unregister.

## g) Problemas comunes
- **Pantalla en blanco**: casi siempre rutas. El sitio tiene que estar en `/Avaloria-beta/` y los archivos en la raíz del repo (no dentro de otra carpeta). Revisá que `index.html` esté en la raíz.
- **Sigo viendo la versión vieja**: caché. Confirmá en **Actions** que el último workflow terminó bien, y recargá dos veces (la primera baja la versión nueva, la segunda la usa).
- **"El juego no puede abrirse como archivo"**: los módulos no cargan con doble clic (`file://`). Usá la dirección https o, en PC, `python3 -m http.server` dentro de la carpeta y abrí `http://localhost:8000`.
- **El workflow falla en "Verificar el repo" o "ESLint"**: no se publica. Corré `node tools/verificar.mjs` en tu PC (hace falta Node 22) y mirá la línea que dice `MAL`.
- **Actions no corre / no hay sitio**: Settings → Pages → Source tiene que decir **GitHub Actions**; en la pestaña **Actions** habilitá los workflows si GitHub lo pide; confirmá que `.github/workflows/static.yml` llegó al repo y que el push fue a `main`.
- **Chrome viejo**: hace falta Chrome 123 o más nuevo.
