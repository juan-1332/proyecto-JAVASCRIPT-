# Guion de Exposición — Campuslands Battle Arena

> **Duración estimada:** 7 a 9 minutos (+ 2 minutos de demo en vivo / preguntas)  
> **Archivo de presentación:** `presentacion.html` (abre con doble clic o desde `http://localhost:3000/presentacion.html`)  
> **Formato:** Presentación web interactiva estilo *scroll-video* (navegable con **scroll**, flechas `↓` / `↑`, barra inferior de capítulos o botón **▶ Modo Película**).

---

## Preparación antes de pasar al frente (30 segundos)

1. Abre `presentacion.html` en Chrome o Edge.
2. Verifica que el **volumen del computador/proyector esté encendido** (el Acto 5 y el Acto 7 tienen sonido sintetizado en vivo que sorprende mucho).
3. Pulsa la tecla **`F`** (o el botón **⛶ Fullscreen**) para presentar a pantalla completa.
4. Si tienen el servidor local activo (`npm run dev`), tengan `http://localhost:3000` listo para el botón **"🎮 Jugar Demo en Vivo"** del cierre.
5. **Tip de equipo:** El guion está dividido en **Expositor 1** y **Expositor 2**, pero si expone una sola persona basta con leer todo de corrido.

---

## Acto 01 — Portada Cinematográfica (~45 seg)

**En pantalla:** Portada con las 3 cartas de los profesores en abanico 3D (`Mr. Fernando`, `Super teacher`, `Ma'am Pau`).  
**Acción en pantalla:** Pasa el cursor suavemente sobre las cartas del abanico para que se abran en 3D mientras hablas.

**Expositor 1:**
> "Buenas tardes profesor y compañeros. Hoy les presentamos **Campuslands Battle Arena**: un simulador táctico de combate de cartas 1 contra 1 inspirado en nuestra propia comunidad de Campuslands y la sede Cajasan.
>
> Lo más importante desde el punto de vista técnico es que **todo el proyecto está construido 100% en JavaScript Vanilla**, utilizando estándares nativos del navegador: **ES Modules, Web Components, Fetch API y Web Audio API**, sin usar ni un solo framework externo como React, Vue o Angular."

*(Hacer scroll suave o presionar `↓` hacia el Acto 02)*

---

## Acto 02 — Visión y Números Clave (~45 seg)

**En pantalla:** Contadores animados (`0 Frameworks`, `20 Cartas`, `5 Métodos HTTP`, `3 Modos de Despliegue`) y 3 pilares de ingeniería.  
**Acción en pantalla:** Deja que los números terminen su animación y señala los 3 pilares inferiores.

**Expositor 2:**
> "Antes de entrar en el detalle, aquí resumimos el alcance real del proyecto:
> - **Cero frameworks de frontend:** todo el enrutamiento de vistas, componentes y estado fue diseñado por nosotros con JavaScript puro.
> - **20 cartas temáticas** con arte propio, divididas en profesores, leyendas de Campus y personal de apoyo de Cajasan.
> - **Los 5 métodos HTTP REST** implementados (`GET`, `POST`, `PUT`, `PATCH` y `DELETE`).
> - Y **3 modos de ejecución**: servidor local Express + Vite, Live Server estático y despliegue listo para Vercel.
>
> Nuestra prioridad fue combinar una experiencia divertida con **arquitectura limpia, modular y resiliente**."

*(Avanzar al Acto 03)*

---

## Acto 03 — El Universo de Cartas (~1 min)

**En pantalla:** Galería interactiva 3D con filtros (*Destacadas*, *Profesores*, *Leyendas de Campus*, *Personal Cajasan*).  
**Acción en pantalla:**
1. Haz clic en la carta de **Mr. Fernando** para que gire en 3D y muestre su descripción y su poder especial (*Examen sorpresa de CS50*).
2. Luego haz clic en el filtro **Profesores** o voltea otra carta que reconozca el salón (por ejemplo **Super teacher** o **Don Tintero**). *(Esto suele generar risas y engancha al público al instante).*

**Expositor 1:**
> "Queríamos que el proyecto tuviera identidad propia, así que modelamos 20 personajes reales de nuestro entorno en `db.json`.
>
> Si hacemos clic en cualquier carta —por ejemplo la del profe **Mr. Fernando**— vemos que cada unidad tiene 250 puntos de vida, 4 ataques con daño escalonado, una defensa táctica que reduce el 50% del daño y un poder especial único con tiempo de recarga.
>
> Además, el catálogo está organizado por facciones: **Profesores**, **Leyendas de Campus** y **Personal de apoyo de Cajasan**."

*(Avanzar al Acto 04)*

---

## Acto 04 — Arquitectura Modular con Web Components (~1 min)

**En pantalla:** Diagrama interactivo de `<card-game-app>` a la izquierda + fragmento real de `gameApp.js` a la derecha.  
**Acción en pantalla:** Haz clic en 2 o 3 cajas del diagrama (`<deck-selector>`, `<battle-arena>`, `<cards-manager>`) para que se actualice la descripción verde en vivo.

**Expositor 2:**
> "A nivel de arquitectura, aplicamos el estándar nativo de **Web Components** extendiendo de `HTMLElement`.
>
> Como ven en el diagrama, tenemos un componente raíz llamado `<card-game-app>` que actúa como orquestador. Él administra la sesión del jugador y del administrador en `sessionStorage`, y renderiza dinámicamente cada vista: registro, selector de mazo, arena de batalla, ranking y panel de administración.
>
> Para mantener un bajo acoplamiento, los componentes hijos no manipulan al padre directamente, sino que se comunican mediante **`CustomEvent`** nativos como `player-ready`, `start-battle` y `navigate`. En el bloque de la derecha pueden ver exactamente cómo registramos y orquestamos estas vistas en `gameApp.js`."

*(Avanzar al Acto 05)*

---

## Acto 05 — Motor de Combate Táctico + Demo Interactiva (~1 min 30 seg)

**En pantalla:** Reglas del motor + código real de `calcularDanoAccion` a la izquierda; **Mini-Arena Interactiva en vivo** a la derecha.  
**Acción en pantalla (¡MOMENTO WOW #1!):**
1. Primero haz clic en **🛡️ Escudo (-50%)** y muestra cómo se ilumina el borde azul y la Máquina responde con menos daño.
2. Al pasar al Turno 2, verás que se desbloquea **⚡ Examen CS50 (100)**: ¡presiónalo! Escucharán el sonido especial y verán caer la barra de HP de la Máquina.

**Expositor 1:**
> "Toda la lógica de combate vive separada de la interfaz dentro de `battleEngine.js`. Es un motor puro e inmutable: cada turno clona el estado con `structuredClone` para evitar efectos secundarios.
>
> Las reglas incluyen:
> - Variación aleatoria de daño entre el **85% y 115%** para que ninguna partida sea igual.
> - **Defensa táctica**, que reduce a la mitad el siguiente impacto.
> - **Poder especial**, bloqueado en el Turno 1 y con un **cooldown de 3 turnos** tras usarse.
> - Y una **IA para la Máquina** (`elegirAccionMaquina`) que decide cuándo defenderse o rematar con su poder especial según la vida restante.
>
> Para no quedarnos solo en teoría, aquí mismo tenemos una **mini-arena funcionando en vivo**. Voy a activar el escudo primero... vemos cómo mitiga el contraataque de la máquina. Y ahora que estamos en el Turno 2, se desbloquea el poder especial... ¡y ejecutamos el *Examen sorpresa de CS50*!"

*(Avanzar al Acto 06)*

---

## Acto 06 — Capa API Híbrida y Persistencia Inteligente (~1 min)

**En pantalla:** Flujo de 3 pasos de `apiconfig.js` a la izquierda + explorador interactivo de verbos HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) a la derecha.  
**Acción en pantalla:** Haz clic en las pestañas **`PUT`** y luego **`PATCH`** para resaltar que diferencian claramente reemplazo total vs. actualización parcial.

**Expositor 2:**
> "En la capa de datos (`src/api/`), centralizamos todas las peticiones con **`fetch()` nativo** dentro de `apiconfig.js` y separamos los servicios por recurso: `cardsapi.js`, `playersapi.js`, `battlesapi.js` y `adminsapi.js`.
>
> Un punto del que estamos muy orgullosos es la **resiliencia**:
> - En local, nuestro servidor `server.js` con Express persiste todos los cambios directamente sobre `src/data/db.json`.
> - Pero si alguien abre el proyecto en **Live Server** o en un hosting estático como **Vercel** sin backend externo, `apiconfig.js` detecta automáticamente la ausencia del servidor y activa un **respaldo transparente** sobre `db.json` + `localStorage` emulando los 5 verbos HTTP.
>
> Además, implementamos correctamente la semántica REST: usamos **`PUT`** cuando el administrador edita una carta completa y **`PATCH`** para cambios parciales, como activar o desactivar una carta sin reenviar todo el objeto."

*(Avanzar al Acto 07)*

---

## Acto 07 — Sonido Procedural con Web Audio API (~45 seg)

**En pantalla:** Soundboard interactivo con 5 botones + código real de `soundEngine.js`.  
**Acción en pantalla (¡MOMENTO WOW #2!):** Presiona 2 o 3 botones del soundboard en vivo (**⚔️ Ataque**, **⚡ Especial**, **🏆 Victoria**).

**Expositor 1:**
> "Otro detalle técnico que quisimos cuidar fue el audio. En lugar de depender únicamente de archivos MP3 pesados que pueden fallar al cargar, creamos `soundEngine.js` usando la **Web Audio API**.
>
> Cada efecto de sonido se sintetiza matemáticamente en tiempo real combinando ondas (`sawtooth`, `triangle`, `square`, `sine`) y rampas de frecuencia. Escuchemos algunos directamente desde el navegador..." *(presionar Ataque, Especial y Victoria)* "...todo esto sin descargar ni un solo kilobyte de audio externo, e incluye control global de silencio."

*(Avanzar al Acto 08)*

---

## Acto 08 — Flujo Completo de la Aplicación (~45 seg)

**En pantalla:** 5 tarjetas del recorrido completo del usuario (Registro → Mazo → Arena 1v1 → Ranking Global → Panel Admin).

**Expositor 2:**
> "Integrando todas estas piezas, el usuario vive un flujo completo de principio a fin:
> 1. Se registra con su apodo y recupera sus estadísticas automáticamente.
> 2. Arma su mazo de **5 cartas** mientras el sistema genera un mazo rival sin cartas repetidas.
> 3. Combate en la **Arena 1v1** con bitácora en vivo y podio Top 3 al finalizar.
> 4. Suma puntos en el **Ranking Global** (+50 por victoria, +10 por participación) y guarda el historial de batallas.
> 5. Y desde el **Panel Admin**, protegido por login, se puede gestionar todo el catálogo de cartas con CRUD completo."

*(Avanzar al Acto 09)*

---

## Acto 09 — Cierre y Paso a la Demo Real (~30 seg)

**En pantalla:** Tarjeta final con los avatares del equipo/profesores y el botón **"🎮 Jugar Demo en Vivo ↗"**.

**Expositor 1 (y/o ambos):**
> "En conclusión, **Campuslands Battle Arena** demuestra que dominando los fundamentos de JavaScript moderno se pueden construir aplicaciones escalables, reactivas y con calidad de producto real sin depender de librerías pesadas.
>
> Muchas gracias por su atención. Si gustan, podemos abrir la aplicación real ahora mismo para jugar una partida en vivo o responder cualquier pregunta técnica que tengan."

*(Hacer clic en **"🎮 Jugar Demo en Vivo ↗"** si el profesor quiere ver el juego completo).*

---

## Banco de Preguntas del Profesor (y Respuestas Ganadoras)

| Posible pregunta del profesor | Respuesta clara y directa |
| :--- | :--- |
| **¿Por qué usaron Web Components y no solo funciones que inyectan HTML?** | Porque `HTMLElement` nos da un ciclo de vida nativo (`constructor`, `connectedCallback`), encapsulación por responsabilidad y etiquetas semánticas propias (`<battle-arena>`, `<deck-selector>`) que se comunican limpiamente con `CustomEvent`. |
| **¿Cuál es la diferencia entre `PUT` y `PATCH` en su proyecto?** | Usamos `PUT` en `cardsapi.reemplazar()` cuando el admin guarda el formulario completo de edición de una carta (reemplaza toda la entidad). Usamos `PATCH` en `cardsapi.actualizarParcial()` para modificar solo un campo puntual, como `active: true/false`, sin reenviar ataques ni descripciones. |
| **¿Cómo evitan bugs de mutación en el combate?** | En `battleEngine.js`, cada vez que se ejecuta un turno clonamos el estado actual con `structuredClone(estado)` y devolvemos `{ nextState, event }`. Así la lógica es predecible y está totalmente desacoplada del DOM. |
| **¿Qué pasa si abro el proyecto sin correr `node server.js`?** | `apiconfig.js` intenta consumir `/api/*`; si detecta un error de red o un 404 estático (como en Live Server o Vercel), ejecuta `atenderRespaldoEstatico()`, carga la semilla inicial de `src/data/db.json` y persiste las operaciones CRUD en `localStorage`. |
| **¿Cómo funciona la IA de la Máquina?** | En `elegirAccionMaquina()` revisa primero si el especial está disponible y si el jugador tiene ≤ 75 HP (o un 60% de probabilidad táctica); si tiene ≤ 115 HP considera defenderse; de lo contrario selecciona entre los 4 ataques con preferencia ponderada hacia los más fuertes. |
| **¿Por qué Web Audio API en vez de archivos `.mp3`?** | Garantiza respuesta instantánea con cero latencia de red, no depende de rutas externas rotas en despliegues estáticos y nos permitió aplicar variaciones aleatorias de frecuencia para que los golpes nunca suenen repetitivos. |
