# Campuslands Battle Arena

Simulador web de combate de cartas 1v1 (Jugador vs. Máquina) inspirado en el ecosistema de **Campuslands** y la sede de **Cajasan**, desarrollado exclusivamente en **JavaScript Vanilla (`.js` + ES Modules)**, **Web Components nativos (`HTMLElement`)**, **HTML5**, **CSS3** y **Fetch API (`fetch()`)**.

## Arquitectura

- **100% JavaScript Vanilla**: Sin TypeScript ni frameworks de frontend (React/Vue/Angular/Axios).
- **Web Components**: Todas las vistas y subcomponentes extienden de `HTMLElement` (`constructor`, `connectedCallback`, `render`, `configurarEventos`, `customElements.define`).
- **Capa API aislada (`src/api/`)**:
  - `apiConfig.js`: Lectura segura de variables de entorno (`VITE_API_MODE`, `VITE_API_DEV_URL`, `VITE_API_PROD_URL`) mediante `switch`, con respaldo automático contra `src/data/db.json` + `localStorage` cuando se ejecuta en servidores estáticos como Live Server o Vercel sin backend externo.
  - `cardsApi.js`, `playersApi.js`, `adminsApi.js`, `battlesApi.js`: Consumo exclusivo con `fetch()` cubriendo `GET`, `POST`, `PUT`, `PATCH` y `DELETE`.
- **20 Cartas Temáticas (`src/data/db.json`)**:
  - Profesores (2), Estudiantes / Leyendas de Campus (10) y Personal de Apoyo Cajasan & Campus (8).

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
3. `index.html` carga las hojas CSS3 y `./src/app.js` como módulo ES nativo; si no hay un backend activo en `/api`, `apiConfig.js` carga `./src/data/db.json` con `fetch()` y persiste los cambios en `localStorage`.

### Opción 3: Despliegue en Vercel
1. Conecta el repositorio en Vercel (o ejecuta `npx vercel`).
2. `vercel.json` configura automáticamente el comando `npm run build` y el directorio de salida `dist`.
3. Opcionalmente, si conectas un backend externo (por ejemplo JSON Server desplegado), configura en Vercel:
   - `VITE_API_MODE=production`
   - `VITE_API_PROD_URL=https://tu-api-externa.com`
