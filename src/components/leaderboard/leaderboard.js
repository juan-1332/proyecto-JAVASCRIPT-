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

const IMAGEN_RESPALDO_WEBP = resolverRutaPublica('images/cards/juan-pablo.webp');
const IMAGEN_RESPALDO_SVG = resolverRutaPublica('images/cards/nikol-ortiz.webp');

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

  obtenerImagenFicha(ficha) {
    if (!ficha) return IMAGEN_RESPALDO_WEBP;

    if (ficha.image) {
      return this.normalizarRutaImagen(ficha.image) || IMAGEN_RESPALDO_WEBP;
    }

    const cartaEncontrada = this.buscarCartaPorReferencia(ficha.name);
    const rutaCarta = cartaEncontrada?.image || cartaEncontrada?.imagen;
    if (rutaCarta) {
      return this.normalizarRutaImagen(rutaCarta) || IMAGEN_RESPALDO_WEBP;
    }

    const slug = this.crearSlugDesdeTexto(ficha.name);
    return slug ? resolverRutaPublica(`images/cards/${slug}.webp`) : IMAGEN_RESPALDO_WEBP;
  }

  obtenerUltimaBatallaConPodio() {
    return (
      this.batallas.find(
        (batalla) => Array.isArray(batalla.podiumCards) && batalla.podiumCards.length > 0
      ) ||
      this.batallas[0] ||
      null
    );
  }

  obtenerTop3UltimaPartida() {
    const ultimaBatalla = this.obtenerUltimaBatallaConPodio();
    if (!ultimaBatalla) return [];

    if (Array.isArray(ultimaBatalla.podiumCards) && ultimaBatalla.podiumCards.length > 0) {
      return ultimaBatalla.podiumCards.slice(0, 3).map((ficha, idx) => ({
        posicion: ficha.posicion || idx + 1,
        name: ficha.name || `Ficha ${idx + 1}`,
        image: this.obtenerImagenFicha(ficha),
        hp: Number(ficha.hp ?? 0),
        attack: Number(ficha.attack ?? 0),
        propietario: ficha.propietario || ultimaBatalla.playerNickname || 'Jugador',
      }));
    }

    // Respaldo si es una batalla antigua sin podiumCards guardado
    const nombresMazo = [
      ...(Array.isArray(ultimaBatalla.playerDeck) ? ultimaBatalla.playerDeck : []),
      ...(Array.isArray(ultimaBatalla.cpuDeck) ? ultimaBatalla.cpuDeck : []),
    ];

    return nombresMazo.slice(0, 3).map((nombre, idx) => {
      const cartaRef = this.buscarCartaPorReferencia(nombre);
      return {
        posicion: idx + 1,
        name: cartaRef?.name || nombre || `Ficha ${idx + 1}`,
        image: this.obtenerImagenFicha({ name: nombre, image: cartaRef?.image }),
        hp: Number(cartaRef?.hp ?? 0),
        attack: Number(cartaRef?.attack ?? 0),
        propietario: idx < (ultimaBatalla.playerDeck?.length || 0) ? ultimaBatalla.playerNickname : 'Máquina',
      };
    });
  }

  renderizarPodio() {
    const tresPrimeros = this.obtenerTop3UltimaPartida();
    if (tresPrimeros.length === 0) {
      return `
        <div class="bk-card mt-6 text-center text-slate-300">
          <div class="text-2xl mb-1">🏆</div>
          ¡Aún no hay campeones! Juega una batalla para ver las 3 fichas ganadoras en el podio.
        </div>
      `;
    }

    const segundoLugar = tresPrimeros[1];
    const primerLugar = tresPrimeros[0];
    const tercerLugar = tresPrimeros[2];

    const renderEscalon = (ficha, puesto, clasePuesto, medalla, esCampeon = false) => {
      if (!ficha) {
        return `<div class="lb-blooket-col ${clasePuesto}" aria-hidden="true"></div>`;
      }

      const rutaImagen = this.escaparHtml(ficha.image);
      const nombreFicha = this.escaparHtml(ficha.name);
      const propietario = this.escaparHtml(ficha.propietario);
      const respaldoWebp = this.escaparHtml(IMAGEN_RESPALDO_WEBP);
      const respaldoSvg = this.escaparHtml(IMAGEN_RESPALDO_SVG);

      return `
        <article class="lb-blooket-col ${clasePuesto}">
          ${esCampeon ? `<div class="lb-blooket-crown" aria-hidden="true">👑</div>` : ''}
          <div class="lb-blooket-avatar" title="${puesto} lugar ${medalla}">
            <img
              src="${rutaImagen}"
              alt="Ficha ${nombreFicha}"
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
            <h3 class="lb-blooket-name" title="${nombreFicha}">
              ${nombreFicha}
            </h3>
            <div class="lb-blooket-pts font-mono-num">HP ${ficha.hp} · ATK ${ficha.attack}</div>
            <div class="lb-blooket-stats font-mono-num">
              ${propietario}
            </div>
          </div>
        </article>
      `;
    };

    return `
      <section class="lb-blooket-podium" aria-label="Podio de las tres mejores fichas de la partida">
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

    const top3Partida = this.obtenerTop3UltimaPartida();
    const ultimaBatalla = this.obtenerUltimaBatallaConPodio();

    const filasPodioPartida =
      top3Partida.length > 0
        ? top3Partida
            .map(
              (ficha) => `
          <tr>
            <td class="font-mono-num font-black text-amber-400">#${ficha.posicion}</td>
            <td class="font-extrabold text-white">${this.escaparHtml(ficha.name)}</td>
            <td class="text-slate-300">${this.escaparHtml(ficha.propietario)}</td>
            <td class="font-mono-num font-bold text-emerald-400">${ficha.hp}</td>
            <td class="font-mono-num font-bold text-cyan-300">${ficha.attack}</td>
          </tr>
        `
            )
            .join('')
        : `<tr><td colspan="5" class="text-center text-slate-400 py-6">Aún no hay fichas clasificadas en esta partida.</td></tr>`;

    const elementosBatalla =
      ultimaBatalla
        ? (() => {
            const jugadorGano = ultimaBatalla.winner === 'player';
            const textoFecha = ultimaBatalla.playedAt
              ? new Date(ultimaBatalla.playedAt).toLocaleString('es-CO', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';
            const listaPodio =
              top3Partida.length > 0
                ? ` · Top 3: ${top3Partida.map((f) => `#${f.posicion} ${this.escaparHtml(f.name)}`).join(', ')}`
                : '';
            return `
          <div class="bk-battle-item">
            <div>
              <div class="font-extrabold text-white text-sm">
                ${this.escaparHtml(ultimaBatalla.playerNickname)} vs. Máquina
              </div>
              <div class="text-xs text-slate-400 mt-0.5 font-mono-num">
                ${ultimaBatalla.turnsPlayed} turnos · ${textoFecha}${listaPodio}
              </div>
            </div>
            <span class="${jugadorGano ? 'bk-pill-win' : 'bk-pill-loss'} font-mono-num">
              ${jugadorGano ? 'Victoria' : 'Derrota'} · +${ultimaBatalla.pointsAwarded} pts
            </span>
          </div>
        `;
          })()
        : `<div class="text-sm text-slate-400 py-6 text-center">Todavía no se han registrado combates.</div>`;

    this.innerHTML = `
      <section class="lb-blooket-shell">
        <header class="lb-blooket-header">
          <div>
            <span class="lb-blooket-badge">⚡ Campuslands Arena</span>
            <h2 class="lb-blooket-title">Podio de la Partida</h2>
            <p class="lb-blooket-subtitle">
              Las 3 fichas ganadoras (1.º, 2.º y 3.º lugar) de la partida actual.
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
            <h3 class="bk-card-title">🏅 Clasificación de Fichas (Partida Actual)</h3>
            <div class="bk-table-wrap">
              <table class="bk-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Ficha</th>
                    <th>Equipo</th>
                    <th>HP</th>
                    <th>ATK</th>
                  </tr>
                </thead>
                <tbody>${filasPodioPartida}</tbody>
              </table>
            </div>
          </div>

          <div class="bk-card">
            <h3 class="bk-card-title">⚔️ Resultado de la Partida</h3>
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