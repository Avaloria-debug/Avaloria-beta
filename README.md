# Avaloria-beta

Crónicas de Avaloria: juego narrativo en el navegador (PWA, se instala en Android). Sitio: https://avaloria-debug.github.io/Avaloria-beta/

## El narrador

La narración la hace un **narrador por código** (carpetas `narrador/`, `core/` y `data/`), sin servidor y sin build.

Prioridad en cada turno: **código → Groq → IA local → plantilla**.

- **Código**: el narrador entiende la frase o el botón y responde con su contenido (`data/contenido/`).
- **Groq** (opcional): si hay una clave en Ajustes, ayuda cuando el código no entiende una frase.
- **IA local** (opcional): sin clave de Groq, un modelo chico corre dentro del dispositivo (WebGPU). Se instala desde Ajustes.
- El juego arranca sin ninguna clave.

`js/puente-narrador.js` conecta el juego (`index.html`) con el narrador y expone `window.Narrador`.
Más detalles en `LEEME-INTEGRACION.md`; pasos para publicar en `TUTORIAL.md`.
