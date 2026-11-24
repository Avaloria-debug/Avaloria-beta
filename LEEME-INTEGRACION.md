# Integración: juego original + narrador por código

**Qué cambió**
- `index.html` conserva pantallas, estilos, emblemas, íconos y audio; la lógica de Groq/lore/prompts fue reemplazada por el narrador (lore viejo en `docs/lore-juego-previo.md`). Versión 0.5.0.
- `js/puente-narrador.js` (módulo ES) importa `../narrador/index.js` y expone `window.Narrador` (`turno`, `vista`, `mochila`, `diario`, `botones`, `acciones`, `ia`…). Se carga con `import()` desde el juego; si falla, la portada muestra el motivo.
- Prioridad: código → Groq → IA local → plantilla. No se muestra nada sobre tokens (429 se traduce a texto neutro en el probador de claves).
- Copiado solo lo que el navegador usa: `narrador/` (sin tests; incluye `narrador/prueba/{filaOpciones,iaLocalPagina,noEntendidas,panel,ampliado}.js`, que importa el puente), 2 archivos de `core/`, `data/{contenido,diccionarios,config}`. `persistencia/` no se copió: nada la importa (lo comprueba `tools/verificar.mjs`).
- Nuevos: fuentes woff2 locales (solo subset latin), `icon-192.png`, `icon-512-maskable.png`, `sw.js` con precache de todo el juego (lo genera `tools/construir.mjs`), aviso "Hay una versión nueva".

**localStorage** (mismas claves del juego): `avaloriaGroqApiKey`, `personajeState` (v2, con `estadoNarrador`), `worldChronicle` (solo vidas anteriores), `avaloriaSaveSlot`, `avaloriaAudioPrefs`. Nuevas: `avaloriaDensidad`, `avaloriaIaLocalAvisada`, y las de la IA local (`ialocal_activa`, `ialocal_bloqueada`; sessionStorage `ialocal_cargando`), `avaloria_no_entendidas` (frases no entendidas). Partidas con formato viejo se ignoran. Registros de turnos: solo memoria.

**Decisiones / supuestos**
- Quité el bloque `skill:chrome` del `<head>` (crédito de otra herramienta, no del juego) y "Notas del narrador" (era el canon inventado por Groq).
- Año = 763 + días/360 (el narrador cuenta días); estación del calendario del narrador. Hora inicial 08:00.
- Fondo por escena: mercado/plaza→mercado, archivo→archivo, taberna, biblioteca/aula→conocimiento, caminos/cruce→camino, lago→bosque, puente→frontera; exteriores entre 21:00 y 05:00→noche.
- Texto inicial de la partida: frase del juego original con lugar y monedas del narrador. Muerte: pantalla original con el texto del turno fatal, 1,4 s después.
- Aviso de IA local: una sola vez; chip y sección solo si el dispositivo es compatible. Clave de Groq vacía = se borra.
- `avaloria-juego.html` no venía adjunto: no se usó.

**Publicación**
- El workflow (`.github/workflows/static.yml`) corre `tools/verificar.mjs` y ESLint (`eslint.config.mjs`); si pasan, `tools/construir.mjs` arma `_site/` y solo eso se publica (sin `docs/`, `tools/` ni `.md`).
- `construir.mjs` precachea todos los archivos publicados (el juego funciona sin conexión desde la primera visita) y pone en `CACHE_NAME` una huella del contenido: no se sube el número a mano. Si un archivo del precache falla al instalar, la instalación del SW falla entera y se reintenta (antes quedaba con la caché vacía).
- El SW solo borra cachés `avaloria-cache-*`: `avaloria-debug.github.io` lo comparten otros sitios.
- `icon-512.png` ahora mide 512×512 (63 KB; antes 1254 px y 606 KB).

**IA local**
- Los 4 `modeloId` del manifest, sus URLs y la API que usa `narrador/iaLocal/motor.js` (`CreateMLCEngine`, `chat.completions.create`, `extra_body.enable_thinking`, `unload`) existen en `@mlc-ai/web-llm@0.2.79` (revisado contra el código publicado en npm).
- `node tools/verificar-modelo.mjs` repite esa comprobación con red y compara `tamanoMB` con el tamaño real en Hugging Face (`--sin-hf` para omitirlo).
- Sigue sin verificar: WebGPU y la descarga real del modelo en un celular.

**Contenido ampliado (criterio de carga)**
- Beta: en el navegador cargan las tandas `a_aprobar` (31 archivos); el canon propuesto `a_aprobar_canon` (`calendario`, `t16`, `t21`, `t22`, `t27`, `valores`) no carga hasta que se apruebe. El criterio vive en `OPCIONES_AMPLIADO_PRODUCCION` (`narrador/contenidoAmpliado.js`) y `tools/verificar.mjs` comprueba que Node y el navegador cargan lo mismo.
- Excepción conocida: `valores.json` (canon) lo importan en forma estática `economia/` y `combate/`, así que se usa igual. Aprobarlo o moverlo a la carga por estado queda pendiente.
- `casos` (`narrador/casos/`, `data/contenido/casos.json`) no está conectado: nadie pasa `opciones.casos` a `narrar`. Se deja como está hasta decidir cuándo se activan los casos.

**Dónde van los cambios**
- `narrador/` se copia desde el repo de origen (el de los tests). Los módulos de `narrador/prueba/` que usa el juego (`panel`, `filaOpciones`, `ampliado`, `noEntendidas`, `iaLocalPagina`) quedan ahí a propósito: moverlos acá divergiría del origen. Si se quieren en `narrador/ui/`, hay que renombrar en el repo de origen (con sus tests) y volver a copiar.
- Lo propio de este repo: `index.html`, `js/`, `sw.js`, `tools/`, `.github/`, `eslint.config.mjs`, docs.

**PENDIENTE (sin tocar)**
1. **Voseo**: el narrador habla en voseo ("Perdés", "mirás"); el juego usa "usted".
   - A) Convertir por código en el puente: rápido y sin tocar `data/`; riesgo: "te/tu" no mapea solo a "lo/la/su" (género), irregulares, diálogos de NPC, y no cubre texto de Groq/IA local.
   - B) Reescribir el contenido: calidad pareja; costo alto (~1 MB de JSON), hay que revalidar con las pruebas del narrador y mantener dos versiones del contenido.
2. Los rasgos del personaje se guardan pero no afectan al narrador.
3. Los lugares ahora son los del narrador (Mercado Circular, Archivo Real, etc.).

**Verificado**: `node tools/verificar.mjs` (archivos, 85 módulos / 242 imports, humo Node); Chromium (Playwright, 412×915 táctil, 32 pruebas): nueva partida, texto libre, botones, Acciones (24), Mochila, Diario, Ajustes, viaje, guardar/continuar, partida vieja ignorada, combate, muerte, atrás cierra modales, offline sin Groq ni IA local, motivos de no compatibilidad (sin WebGPU, WebView, iOS), flujo real de SW nuevo → toast → recarga; ESLint `no-undef` sin errores.
**Sin verificar**: instalación real de la IA local (WebGPU, WebLLM, descarga del modelo); Groq con clave real; Android real (instalar PWA, atrás físico, pantalla completa); GitHub Pages/Actions; Safari/Firefox. Requiere Chrome ≥123 (imports JSON).
