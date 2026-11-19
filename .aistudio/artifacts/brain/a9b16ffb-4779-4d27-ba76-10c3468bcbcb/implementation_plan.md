# Campuslands Battle Arena

Simulador web de combate de cartas 1v1 (Jugador vs. Máquina) ambientado en el ecosistema de Campuslands y la sede de Cajasan, construido con JavaScript Vanilla, Web Components nativos, ES Modules, Fetch API y un servidor backend en vivo conectado a almacenamiento JSON persistente.

## User Review & Critical Decisions

> [!IMPORTANT]
> Las decisiones clave de alcance, estética y contenido quedaron confirmadas durante la fase de aclaración y guiarán toda la implementación.

- **Alcance de Implementación (Confirmado)**: Juego completo funcional de extremo a extremo con backend REST en vivo para operar en la vista previa sin configuración manual adicional.
- **Identidad Visual (Confirmado)**: Mesa de cartas clásica en tonos azul institucional Campuslands y oro, con alto contraste y legibilidad táctica.
- **Arte y Audio Inmediatos (Confirmado)**: Avatares SVG personalizados por categoría y personaje (respaldados por rutas estáticas listas para activos gráficos) junto con efectos de sonido sintetizados mediante Web Audio API y botón de silencio.
- **Pool de 20 Cartas (Confirmado)**: Distribución exacta de 2 Profesores, 10 Estudiantes / Leyendas de Campus y 8 personajes de Personal de Apoyo (Cajasan & Campus) añadiendo 4 nuevos personajes en esta tercera categoría.

---

## 1. Overview & Core Concept

- **Qué hace**: Permite a los jugadores registrarse con un nickname único, armar un mazo estratégico de 5 cartas en orden de combate a partir de un pool mínimo de 10 cartas activas, enfrentarse contra una IA táctica por turnos y consultar tanto el ranking histórico como el historial de batallas. Además, ofrece un panel administrativo protegido para gestionar el catálogo completo de cartas.
- **Público Objetivo**: Estudiantes, mentores y comunidad de Campuslands y Cajasan en entornos de escritorio, tablet y móvil.
- **Valor Principal**: Demuestra una arquitectura frontend modular sin frameworks de UI mediante Web Components encapsulados y una separación estricta entre lógica de combate, servicios HTTP REST (evaluando `GET`, `POST`, `PUT`, `PATCH` y `DELETE`) y presentación visual.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Pantalla de Título y Registro de Jugador**: Vista inicial a pantalla completa con la temática Campuslands & Cajasan, acceso al registro/ingreso por nickname (validado en vivo contra duplicados o recuperación de jugador existente), acceso al Leaderboard, acceso al Panel Admin y botón principal para iniciar partida.
2. **Selector de Mazo Estratégico**: Galería filtrable por categoría (*Profesores*, *Estudiantes / Leyendas de Campus*, *Personal de Apoyo*) donde el jugador selecciona exactamente 5 cartas distintas y ordena su secuencia de salida (Posición 1 a 5). Al confirmar, la máquina selecciona 5 cartas distintas de las restantes.
3. **Arena de Combate 1v1**:
   - Sorteo inicial aleatorio de turno (`Math.random() < 0.5`).
   - Tablero dividido en zona del oponente (arriba), zona central de choque y registro táctico de turno, y zona del jugador con controles de combate (abajo).
   - El jugador ejecuta 1 de 6 acciones válidas por turno: 4 ataques normales, Defensa (-50% de daño en el siguiente golpe recibido) o Poder Especial (bloqueado en turno 1, habilitado desde turno 2, con enfriamiento estricto de 3 turnos propios mostrado numéricamente).
   - Al llegar una carta a `0 HP`, entra automáticamente la siguiente del mazo; la carta ganadora conserva su HP restante sin curarse.
4. **Cierre de Partida, Leaderboard e Historial**: Modal de Victoria o Derrota con resumen de daño/turnos, asignación de puntaje (+50 pts victoria / +10 pts derrota), actualización parcial (`PATCH`) de estadísticas del jugador, registro histórico (`POST`) de la batalla y botón directo para jugar de nuevo o ver el ranking Top 3.
5. **Panel de Administración (CRUD)**: Inicio de sesión contra credenciales almacenadas, listado con interruptor rápido de estado activo (`PATCH`), creación (`POST`), edición completa (`PUT`) y eliminación (`DELETE`) de cartas del pool.

### Visual Identity & Theme

- **Dirección Estética**: Mesa de batalla académica clásica inspirada en tableros de cartas de competición, combinando sobriedad táctica y humor local de Campuslands.
- **Paleta y Presupuesto 60-30-10**:
  - *60% Superficie Dominante*: Azul marino profundo Campuslands (`#0B162C` y `#102042`) con textura sutil de paño de mesa.
  - *30% Estructuras y Cartas*: Paneles azul pizarra (`#17294D`), bordes finos translúcidos y tarjetas con contraste elevado en marfil/blanco técnico (`#F8FAFC`) o pizarra oscura según jerarquía.
  - *10% Acento Focal*: Oro Campuslands (`#F59E0B`) para acciones principales, indicadores de turno y podio, junto con semántica explícita acompañada de texto e íconos (rojo carmesí para daño, cian para escudo, ámbar para poder especial).
- **Tipografía y Jerarquía**:
  - *Display / Títulos*: `Outfit` (pesos 600–700) para encabezados balanceados sin líneas huérfanas.
  - *Cuerpo / Controles*: `Plus Jakarta Sans` (pesos 400–600) con controles en una sola línea y áreas táctiles mínimas de `44px`.
  - *Datos y Contadores*: `JetBrains Mono` con `tabular-nums` obligatorio en HP, porcentajes, cooldowns, puntajes y tabla de posiciones.
- **Disciplina Anti-Ruido**: Cero cápsulas decorativas alrededor de metadatos (separadores tipográficos `·` o `/`), sin prefijos tipo código ni puntos parpadeantes decorativos.

### Interactive Feedback & Motion

- Animaciones CSS basadas exclusivamente en propiedades de composición (`transform`, `opacity`, `filter`) activadas por eventos del motor: embestida de ataque, sacudida por impacto, aura de escudo defensivo, destello de poder especial, desvanecimiento por derrota de carta, transición de relevo y celebración de victoria/derrota.
- Efectos de sonido generados mediante Web Audio API sincronizados con cada evento de juego, con control visible de silencio en el encabezado de la arena.

---

## 3. Key Product Decisions & Trade-Offs

- **Backend en Vivo con Express + Almacenamiento JSON vs. Servidor Externo Manual**:
  - *Enfoque Elegido*: Servidor Express integrado en el entorno de ejecución (puerto 3000 junto con Vite) que expone la API REST completa (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) leyendo y escribiendo directamente sobre el archivo JSON de datos, manteniendo en el cliente el selector de URL basado en `import.meta.env.VITE_API_MODE`.
  - *Por qué*: Garantiza que toda operación CRUD, registro de jugador, combate y leaderboard funcione inmediatamente en vivo sin depender de levantar manualmente un proceso separado de `json-server`, conservando intacta la arquitectura de entornos `.env`.
  - *Alternativas Descartadas*: Usar solo almacenamiento local en navegador (rompería la evaluación real de métodos HTTP) o requerir arranque manual externo de `json-server` (no funcionaría en la vista previa integrada).

- **Avatares SVG Categorizados + Rutas Estáticas vs. Imágenes Externas**:
  - *Enfoque Elegido*: Generador/renderizador de retratos SVG temáticos por personaje y categoría con contenedor de respaldo robusto, manteniendo definidas las rutas de imágenes y sonidos en el JSON de datos.
  - *Por qué*: Evita cualquier imagen rota en entornos cerrados, carga de forma instantánea y da identidad visual coherente a los 20 personajes de Campuslands y Cajasan.
  - *Alternativas Descartadas*: Enlaces externos aleatorios (frágiles y propensos a bloqueo) o cuadros vacíos sin ilustración.

- **Web Components Nativos sin React en UI vs. Migración a Framework**:
  - *Enfoque Elegido*: Mantener la raíz `<card-game-app>` y cada módulo visual como clases nativas que extienden `HTMLElement` (`constructor`, `render()`, `configurarEventos()`, `customElements.define`), utilizando Tailwind CSS como capa visual de apoyo y hojas CSS modulares por dominio.
  - *Por qué*: Cumple estrictamente con el objetivo académico de dominar Web Components nativos, ES Modules y desacoplamiento por capas.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                          Presentación (Browser)                          │
│  <card-game-app> (Enrutador de estado y barra de navegación de 3 zonas)  │
│   ├── <player-register>  ── Registro / Selección de Jugador              │
│   ├── <deck-selector>    ── Selección y orden de mazo (5 cartas)         │
│   ├── <battle-arena>     ── Orquestación 1v1 + Web Audio FX              │
│   │    ├── <battle-card>     (Carta activa, barra HP, aura, animaciones) │
│   │    └── <battle-controls> (4 Ataques, Defensa, Especial con cooldown) │
│   ├── <leaderboard-view> ── Top 3 + Ranking + Historial de Batallas      │
│   └── <admin-panel>      ── <admin-login>, <cards-manager>, CRUD Modals  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Eventos & Llamadas a Servicios
┌────────────────────────────────────▼─────────────────────────────────────┐
│                     Lógica de Dominio & Capa HTTP                        │
│  Utilidades: motor de combate (turnos, daño 0.85-1.15, cooldowns, IA),   │
│              aleatoriedad y validadores de formularios/reglas.           │
│  Servicios API (switch VITE_API_MODE):                                   │
│    • cardsApi   -> GET, POST, PUT (edición total), PATCH (activo), DELETE│
│    • playersApi -> GET (validación/ranking), POST (nuevo), PATCH (stats) │
│    • adminsApi  -> GET (verificación de credenciales)                    │
│    • battlesApi -> GET (historial), POST (registro de encuentro)         │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Fetch JSON (HTTP REST)
┌────────────────────────────────────▼─────────────────────────────────────┐
│                   Servidor Backend REST (Express + JSON)                 │
│  Endpoints REST persistentes sobre db.json:                              │
│    /cards   /players   /admins   /battles                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **Cards (20 iniciales)**: `id`, `name`, `type` (*Profesores*, *Estudiantes / Leyendas de Campus*, *Personal de Apoyo (Cajasan & Campus)*), `image`, `description`, `hp` (250), `attacks` (4 objetos con nombre y `baseDamage`), `defense` (`name`, `damageReduction: 0.5`), `special` (`name`, `baseDamage`, `unlockTurn: 2`, `cooldown: 3`), `sounds`, `active`, `createdAt`.
  - *Profesores (2)*: Mr. Fernando (Super Teacher), Sir Pau.
  - *Estudiantes / Leyendas de Campus (10)*: Juan Pablo, Nikol Ortiz, Señor Gemini, Diana, Chico NKD, Don Tintero, El Consumidor de APIs, Chico COD, Mr. Faltas, Chico "La Caliente".
  - *Personal de Apoyo Cajasan & Campus (8)*: Doña Rosa, Don Luis, Chef Martha, Carlos Mantenimiento, más 4 nuevos personajes temáticos de Cajasan & Campus (Doña Elena de Enfermería, Don Héctor de Transporte, Sofía de Bienestar Cajasan y Memo de Audio/Eventos).
- **Players**: `id`, `nickname`, `points`, `wins`, `losses`, `gamesPlayed`, `createdAt`.
- **Admins**: `id`, `username`, `password`, `role`.
- **Battles**: `id`, `playerId`, `playerNickname`, `playerDeck`, `cpuDeck`, `winner` (`player` | `cpu`), `turnsPlayed`, `pointsAwarded`, `playedAt`.

### Interactive Component & State Mapping

- **Registro (`playerRegister`)**: Consulta por nickname vía `GET`; si existe permite continuar con ese perfil o avisa duplicado al intentar crear nuevo; si es nuevo ejecuta `POST` y pasa a selección de mazo.
- **Selección de Mazo (`deckSelector`)**: Filtra cartas activas (`active === true`), exige mínimo 10 disponibles para jugar, permite añadir/quitar hasta 5 cartas y reordenar prioridades; al iniciar combate sortea 5 cartas distintas de la máquina y lanza el sorteo inicial de turno.
- **Combate (`battle` + `battleEngine`)**:
  - Mantiene estado inmutable por turno: carta activa de cada bando, colas de reemplazo, turno global, turnos propios de cada bando, bandera de defensa activa, cooldown restante del poder especial (en jugador y CPU) y registro de acciones.
  - Bloquea controles durante animaciones y turno de la CPU (retardo táctico ~800ms) para evitar dobles envíos.
  - Al finalizar la partida dispara `PATCH` en el jugador y `POST` en historial de batallas antes de mostrar el modal de resultado.
- **Administración (`adminLogin` + `cards` + `createCards` + `editCards` + `deleteCards`)**:
  - Valida credenciales contra la colección de administradores.
  - Demuestra explícitamente `PUT` al guardar edición integral de una carta y `PATCH` al alternar disponibilidad (`active`) sin reenviar todo el objeto, además de `POST` y `DELETE` con confirmación modal sin usar `window.alert`.
