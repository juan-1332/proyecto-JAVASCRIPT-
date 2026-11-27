# Campuslands Battle Arena

Simulador web de combate de cartas 1v1 (Jugador vs. Máquina) inspirado en el ecosistema de **Campuslands** y la sede de **Cajasan**, desarrollado exclusivamente en **JavaScript Vanilla (`.js` + ES Modules)**, **Web Components nativos (`HTMLElement`)**, **HTML5**, **CSS3** y **Fetch API (`fetch()`)**.

## Arquitectura

- **100% JavaScript Vanilla**: Sin TypeScript ni frameworks de frontend (React/Vue/Angular/Axios).
- **Web Components**: Todas las vistas y subcomponentes extienden de `HTMLElement` (`constructor`, `connectedCallback`, `render`, `configurarEventos`, `customElements.define`).
- **Capa API aislada (`src/api/`)**:
  - `apiconfig.js`: Lectura segura de variables de entorno (`VITE_API_MODE`, `VITE_API_DEV_URL`, `VITE_API_PROD_URL`) mediante `switch`, con respaldo automático contra `src/data/db.json` + `localStorage` cuando se ejecuta en servidores estáticos como Live Server o Vercel sin backend externo.
  - `cardsapi.js`, `playersapi.js`, `adminsapi.js`, `battlesapi.js`: Consumo exclusivo con `fetch()` cubriendo `GET`, `POST`, `PUT`, `PATCH` y `DELETE`.
- **20 Cartas Temáticas (`src/data/db.json`)**:
  - Profesores (3), Estudiantes / Leyendas de Campus (10) y Personal de Apoyo Cajasan & Campus (7).

## Ejecución en Local

### Opción 1: Servidor Completo Node + Vite (`server.js`)
```bash
npm install
npm run dev
```
Abre `http://localhost:3000`. Todos los métodos `GET`, `POST`, `PUT`, `PATCH` y `DELETE` persisten directamente sobre `src/data/db.json`.

### Opción 2: VS Code Live Server (Estático)
1. Abre la carpeta raíz del proyecto en VS Code.
2. Haz clic derecho sobre `index.html` y selecciona **Open with Live Server**.
3. `index.html` carga las hojas CSS3 y `./src/app.js` como módulo ES nativo; si no hay un backend activo en `/api`, `apiconfig.js` carga `./src/data/db.json` con `fetch()` y persiste los cambios en `localStorage`.
4. En este modo, jugadores, puntajes e historial se guardan solo en el almacenamiento local de ese navegador; no se comparten con otros dispositivos o jugadores.

### Opción 3: Despliegue en Vercel
1. Conecta el repositorio en Vercel (o ejecuta `npx vercel`).
2. `vercel.json` configura automáticamente el comando `npm run build` y el directorio de salida `dist`.
3. Sin una API externa, el respaldo usa `localStorage` y el ranking solo existe en el navegador de cada visitante. Para un ranking compartido, conecta una API respaldada por almacenamiento persistente y configura en Vercel:
   - `VITE_API_MODE=production`
   - `VITE_API_PROD_URL=https://tu-api-externa.com`

nuevas mecanicas agregadas

modo de batalla manual y automatico: seleccionable desde el selector de mazo antes de iniciar y alternable en vivo en la arena. en modod automatico, las acciones del jugador y de la maqiina se ejecutan por turnos con pausas visibles set time out botnes manuales desabilitados sin turnmos simultaneos y con limpieza automatica de temporizadores al finalizar o salir.
Selección Automática de Acciones (obtenerAccionesValidas y elegirAccionAutomatica): Construye las acciones disponibles del turno respetando desbloqueo y cooldown del poder especial.
Golpe Crítico (12% · ×1.5) y Esquivar Ataque (8% · 0 de daño): Integrados en ataques normales y poderes especiales siguiendo el orden estricto de resolución (selección → factor aleatorio → esquive → crítico → defensa 50% → redondeo → resta de HP ≥ 0), con animaciones, aviso visual y efectos sonoros diferenciados.
Persistencia del Modo: Cada partida finalizada guarda mode (manual o automatic) en el historial de /api/battles.
