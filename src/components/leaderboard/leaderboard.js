import { apiJugadores } from '../../api/playersapi.js';
import { apiBatallas } from '../../api/battlesapi.js';
import { apiCartas } from '../../api/cardsapi.js';

function resolverRutaPublica(rutaRelativa) {
  const limpia = String(rutaRelativa || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^public\//i, '');

  return limpia ? `/${limpia}` : '';
}

const IMAGEN_RESPALDO_WEBP = resolverRutaPublica('public/images/cards/juan-pablo.webp');
const IMAGEN_RESPALDO_SVG = resolverRutaPublica('public/images/cards/carlos-mantenimiento.svg');

export class LeaderboardView extends HTMLElement {
  constructor() {
    super();
    this.jugadores = [];
    this.batallas = [];
    this.cartas = [];
    this.cargando = true;
    this.mensajeError = '';
  }

  connectedCallback() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando = true;
    this.mensajeError = '';
    this.render();

    try {
      const [jugadores, batallas, cartas] = await Promise.all([
        apiJugadores.obtenerOrdenados(),
        apiBatallas.obtenerHistorial(),
        apiCartas?.obtenerTodas ? apiCartas.obtenerTodas() : Promise.resolve([]),
      ]);

      this.jugadores = Array.isArray(jugadores) ? jugadores : [];
      this.batallas = Array.isArray(batallas) ? batallas : [];
      this.cartas = Array.isArray(cartas) ? cartas : [];
    } catch (errorCapturado) {
      this.mensajeError = errorCapturado.message || 'Error al cargar la clasificación.';
    } finally {
      this.cargando = false;
      this.render();
      this.configurarEventos();
    }
  }

  normalizarRutaImagen(ruta) {
    if (!ruta || typeof ruta !== 'string') return '';
    let rutaLimpia = ruta.trim();

    if (!rutaLimpia) return '';

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(rutaLimpia)) {
      return rutaLimpia.replace(/\.(png|jpe?g|svg)$/i, '.webp');
    }

    rutaLimpia = rutaLimpia.replace(/^\/+/, '').replace(/^public\//i, '');

    if (!rutaLimpia.includes('/')) {
      const tieneExtension = /\.(webp|png|jpe?g|svg)$/i.test(rutaLimpia);
      rutaLimpia = tieneExtension
        ? `images/cards/${rutaLimpia}`
        : `images/cards/${rutaLimpia}.webp`;
    }

    rutaLimpia = rutaLimpia.replace(/\.(png|jpe?g|svg)$/i, '.webp');
    return resolverRutaPublica(rutaLimpia);
  }

  crearSlugDesdeTexto(valor) {
    if (!valor || typeof valor !== 'string') return '';
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  buscarCartaPorReferencia(referencia) {
    if (!referencia || !Array.isArray(this.cartas) || this.cartas.length === 0) {
      return null;
    }

    if (typeof referencia === 'object') {
      const idObj = referencia.id ?? referencia.cardId ?? referencia.slug;
      const nombreObj = referencia.name ?? referencia.nombre ?? referencia.title;
      if (idObj || nombreObj) {
        return this.buscarCartaPorReferencia(idObj || nombreObj);
      }
      return null;
    }

    const refTexto = String(referencia).trim();
    const refSlug = this.crearSlugDesdeTexto(refTexto);

    return (
      this.cartas.find((carta) => {
        const idCarta = String(carta?.id ?? '').trim();
        const slugCarta = this.crearSlugDesdeTexto(carta?.slug || carta?.id || '');
        const nombreSlug = this.crearSlugDesdeTexto(carta?.name || carta?.nombre || '');
        return (
          idCarta === refTexto ||
          (refSlug && (idCarta === refSlug || slugCarta === refSlug || nombreSlug === refSlug))
        );
      }) || null
    );
  }

  obtenerImagenJugador(jugador) {
    if (!jugador) return IMAGEN_RESPALDO_WEBP;

    const imagenDirecta =
      jugador.cardImage ||
      jugador.imagenCarta ||
      jugador.image ||
      jugador.imagen;

    if (imagenDirecta) {
      return this.normalizarRutaImagen(imagenDirecta) || IMAGEN_RESPALDO_WEBP;
    }

    const ultimaBatalla = this.batallas.find(
      (batalla) =>
        (jugador.id && batalla.playerId === jugador.id) ||
        (jugador.nickname &&
          String(batalla.playerNickname || '').toLowerCase() ===
            String(jugador.nickname || '').toLowerCase())
    );

    const identificadoresCartas =
      ultimaBatalla?.playerCardIds ||
      ultimaBatalla?.cartasJugador ||
      ultimaBatalla?.playerCards ||
      jugador.deckCardIds ||
      jugador.cards ||
      [];

    const listaCartas = Array.isArray(identificadoresCartas) ? identificadoresCartas : [];

    for (const itemCarta of listaCartas) {
      const cartaEncontrada = this.buscarCartaPorReferencia(itemCarta);
      const rutaCarta = cartaEncontrada?.image || cartaEncontrada?.imagen;
      if (rutaCarta) {
        return this.normalizarRutaImagen(rutaCarta) || IMAGEN_RESPALDO_WEBP;
      }

      const idOpcional = typeof itemCarta === 'string' ? itemCarta : itemCarta?.id || itemCarta?.name;
      const slugOpcional = this.crearSlugDesdeTexto(idOpcional);
      if (slugOpcional) {
        return resolverRutaPublica(`images/cards/${slugOpcional}.webp`);
      }
    }

    return IMAGEN_RESPALDO_WEBP;
  }

  renderizarPodio() {
    const tresPrimeros = this.jugadores.slice(0, 3);
    if (tresPrimeros.length === 0) {
      return `
        <div class="bk-card mt-6 text-center text-slate-300">
          <div class="text-2xl mb-1">🏆</div>
          ¡Aún no hay campeones! Juega tu primera batalla y ocupa un lugar en el podio.
        </div>
      `;
    }

    const segundoLugar = tresPrimeros[1];
    const primerLugar = tresPrimeros[0];
    const tercerLugar = tresPrimeros[2];

    const renderEscalon = (jugador, puesto, clasePuesto, medalla, esCampeon = false) => {
      if (!jugador) {
        return `<div class="lb-blooket-col ${clasePuesto}" aria-hidden="true"></div>`;
      }

      const rutaImagen = this.escaparHtml(this.obtenerImagenJugador(jugador));
      const nombreJugador = this.escaparHtml(jugador.nickname);
      const respaldoWebp = this.escaparHtml(IMAGEN_RESPALDO_WEBP);
      const respaldoSvg = this.escaparHtml(IMAGEN_RESPALDO_SVG);

      return `
        <article class="lb-blooket-col ${clasePuesto}">
          ${esCampeon ? `<div class="lb-blooket-crown" aria-hidden="true">👑</div>` : ''}
          <div class="lb-blooket-avatar" title="${puesto} lugar ${medalla}">
            <img
              src="${rutaImagen}"
              alt="Carta de ${nombreJugador}"
              class="lb-blooket-card-img"
              data-fallback-webp="${respaldoWebp}"
              data-fallback-svg="${respaldoSvg}"
              onerror="
                if (!this.dataset.triedWebpFallback && this.src !== this.dataset.fallbackWebp) {
                  this.dataset.triedWebpFallback = 'true';
                  this.src = this.dataset.fallbackWebp;
                } else if (!this.dataset.triedSvgFallback && this.src !== this.dataset.fallbackSvg) {
                  this.dataset.triedSvgFallback = 'true';
                  this.src = this.dataset.fallbackSvg;
                } else {
                  this.onerror = null;
                  this.style.display = 'none';
                  if (this.nextElementSibling) this.nextElementSibling.style.display = 'grid';
                }
              "
            />
            <span class="lb-blooket-fallback" style="display:none;" aria-hidden="true">${medalla}</span>
          </div>
          <div class="lb-blooket-step">
            <span class="lb-blooket-pos">${medalla} ${puesto}</span>
            <h3 class="lb-blooket-name" title="${nombreJugador}">
              ${nombreJugador}
            </h3>
            <div class="lb-blooket-pts font-mono-num">${jugador.points} pts</div>
            <div class="lb-blooket-stats font-mono-num">
              ${jugador.wins}V · ${jugador.losses}D · ${jugador.gamesPlayed} PJ
            </div>
          </div>
        </article>
      `;
    };

    return `
      <section class="lb-blooket-podium" aria-label="Podio de los tres mejores jugadores">
        ${renderEscalon(segundoLugar, '2.º', 'lb-blooket-2', '🥈', false)}
        ${renderEscalon(primerLugar, '1.º', 'lb-blooket-1', '🥇', true)}
        ${renderEscalon(tercerLugar, '3.º', 'lb-blooket-3', '🥉', false)}
      </section>
    `;
  }

  render() {
    if (this.cargando) {
      this.innerHTML = `
        <section class="lb-blooket-shell">
          <div class="bk-card text-center text-slate-200 font-bold">
            Cargando tabla de posiciones e historial de combates...
          </div>
        </section>
      `;
      return;
    }

    if (this.mensajeError) {
      this.innerHTML = `
        <section class="lb-blooket-shell">
          <div class="bk-card text-center">
            <p class="text-rose-300 font-semibold">${this.escaparHtml(this.mensajeError)}</p>
            <button type="button" id="btn-retry-lb" class="bk-btn bk-btn-amber mt-4">Reintentar</button>
          </div>
        </section>
      `;
      return;
    }

    const filasJugadores =
      this.jugadores.length > 0
        ? this.jugadores
            .map(
              (jugador, indice) => `
          <tr>
            <td class="font-mono-num font-black text-amber-400">#${indice + 1}</td>
            <td class="font-extrabold text-white">${this.escaparHtml(jugador.nickname)}</td>
            <td class="font-mono-num font-black text-cyan-300">${jugador.points}</td>
            <td class="font-mono-num font-bold text-emerald-400">${jugador.wins}</td>
            <td class="font-mono-num font-bold text-rose-400">${jugador.losses}</td>
            <td class="font-mono-num text-slate-300">${jugador.gamesPlayed}</td>
          </tr>
        `
            )
            .join('')
        : `<tr><td colspan="6" class="text-center text-slate-400 py-6">Sin jugadores registrados.</td></tr>`;

    const elementosBatalla =
      this.batallas.length > 0
        ? this.batallas
            .slice(0, 15)
            .map((batalla) => {
              const jugadorGano = batalla.winner === 'player';
              const textoFecha = batalla.playedAt
                ? new Date(batalla.playedAt).toLocaleString('es-CO', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';
              return `
            <div class="bk-battle-item">
              <div>
                <div class="font-extrabold text-white text-sm">
                  ${this.escaparHtml(batalla.playerNickname)} vs. Máquina
                </div>
                <div class="text-xs text-slate-400 mt-0.5 font-mono-num">
                  ${batalla.turnsPlayed} turnos · ${textoFecha}
                </div>
              </div>
              <span class="${jugadorGano ? 'bk-pill-win' : 'bk-pill-loss'} font-mono-num">
                ${jugadorGano ? 'Victoria' : 'Derrota'} · +${batalla.pointsAwarded} pts
              </span>
            </div>
          `;
            })
            .join('')
        : `<div class="text-sm text-slate-400 py-6 text-center">Todavía no se han registrado combates.</div>`;

    this.innerHTML = `
      <section class="lb-blooket-shell">
        <header class="lb-blooket-header">
          <div>
            <span class="lb-blooket-badge">⚡ Campuslands Arena</span>
            <h2 class="lb-blooket-title">Ranking Campuslands</h2>
            <p class="lb-blooket-subtitle">
              Clasificación general ordenada por puntaje (Victoria +50 pts · Derrota +10 pts).
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" id="btn-refresh-lb" class="bk-btn bk-btn-cyan">Actualizar</button>
            <button type="button" id="btn-play-from-lb" class="bk-btn bk-btn-amber">Ir a Jugar</button>
          </div>
        </header>

        ${this.renderizarPodio()}

        <div class="bk-grid">
          <div class="bk-card">
            <h3 class="bk-card-title">🏅 Tabla General de Jugadores</h3>
            <div class="bk-table-wrap">
              <table class="bk-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Nickname</th>
                    <th>Pts</th>
                    <th>V</th>
                    <th>D</th>
                    <th>PJ</th>
                  </tr>
                </thead>
                <tbody>${filasJugadores}</tbody>
              </table>
            </div>
          </div>

          <div class="bk-card">
            <h3 class="bk-card-title">⚔️ Historial Reciente de Batallas</h3>
            <div class="flex flex-col gap-2.5">
              ${elementosBatalla}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  configurarEventos() {
    this.querySelector('#btn-retry-lb')?.addEventListener('click', () => this.cargarDatos());
    this.querySelector('#btn-refresh-lb')?.addEventListener('click', () => this.cargarDatos());
    this.querySelector('#btn-play-from-lb')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'register' }, bubbles: true }));
    });
  }

  escaparHtml(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('leaderboard-view', LeaderboardView);