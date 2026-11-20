import { apiJugadores } from '../../api/playersapi.js';
import { apiBatallas } from '../../api/battlesapi.js';

function resolverRutaPublica(rutaRelativa) {
  const limpia = String(rutaRelativa || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^public\//i, '');

  return limpia ? `/${limpia}` : '';
}

export class LeaderboardView extends HTMLElement {
  constructor() {
    super();
    this.jugadores = [];
    this.batallas = [];
    this.ranking = [];
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
      const [jugadores, batallas] = await Promise.all([
        apiJugadores.obtenerOrdenados(),
        apiBatallas.obtenerHistorial(),
      ]);

      this.jugadores = Array.isArray(jugadores) ? jugadores : [];
      this.batallas = Array.isArray(batallas) ? batallas : [];
      this.ranking = this.calcularRanking();
    } catch (errorCapturado) {
      this.mensajeError = errorCapturado.message || 'Error al cargar la clasificación.';
    } finally {
      this.cargando = false;
      this.render();
      this.configurarEventos();
    }
  }

  crearClaveJugador(jugador) {
    const id = String(jugador?.id ?? jugador?.playerId ?? '').trim();
    if (id) return `id:${id}`;

    const apodo = this.normalizarApodo(jugador?.nickname ?? jugador?.playerNickname);
    return apodo ? `name:${apodo}` : '';
  }

  normalizarApodo(apodo) {
    return String(apodo ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es');
  }

  calcularRanking() {
    const jugadoresPorClave = new Map();

    this.jugadores.forEach((jugador) => {
      const clave = this.crearClaveJugador(jugador);
      if (!clave) return;

      jugadoresPorClave.set(clave, {
        id: String(jugador.id ?? ''),
        nickname: String(jugador.nickname ?? 'Jugador').trim(),
        avatar: String(jugador.avatar ?? jugador.image ?? ''),
        points: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
      });
    });

    this.batallas.forEach((batalla) => {
      const clave = this.crearClaveJugador({
        id: batalla.playerId,
        nickname: batalla.playerNickname,
      });

      if (!clave) return;

      if (!jugadoresPorClave.has(clave)) {
        jugadoresPorClave.set(clave, {
          id: String(batalla.playerId ?? ''),
          nickname: String(batalla.playerNickname ?? 'Jugador').trim(),
          avatar: String(batalla.playerAvatar ?? batalla.avatar ?? ''),
          points: 0,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
        });
      }

      const jugador = jugadoresPorClave.get(clave);
      const puntosRegistrados = Number(batalla.pointsAwarded);
      let puntosPartida = Number.isFinite(puntosRegistrados) ? puntosRegistrados : 0;

      if (!Number.isFinite(puntosRegistrados) || puntosRegistrados < 0) {
        puntosPartida = batalla.winner === 'player' ? 50 : 10;
      }

      jugador.points += puntosPartida;
      jugador.gamesPlayed += 1;

      if (batalla.winner === 'player') {
        jugador.wins += 1;
      } else if (batalla.winner === 'cpu' || batalla.winner === 'machine') {
        jugador.losses += 1;
      }
    });

    // Completa victorias/derrotas de perfiles antiguos si no están presentes en el historial.
    jugadoresPorClave.forEach((jugador) => {
      const perfil = this.jugadores.find((item) => this.crearClaveJugador(item) === this.crearClaveJugador(jugador));
      if (!perfil) return;

      if (jugador.gamesPlayed === 0) {
        jugador.gamesPlayed = Number(perfil.gamesPlayed) || 0;
        jugador.wins = Number(perfil.wins) || 0;
        jugador.losses = Number(perfil.losses) || 0;
      }
    });

    return Array.from(jugadoresPorClave.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
      return a.nickname.localeCompare(b.nickname, 'es', { sensitivity: 'base' });
    });
  }

  normalizarAvatar(ruta) {
    if (!ruta) return '';
    const limpia = String(ruta).trim();
    if (/^(https?:\/\/|data:image\/|blob:)/i.test(limpia)) return limpia;
    return resolverRutaPublica(limpia);
  }

  obtenerInicial(nombre) {
    const inicial = String(nombre ?? '').trim().charAt(0);
    return inicial ? inicial.toLocaleUpperCase('es') : '?';
  }

  renderizarPodio() {
    if (this.ranking.length === 0) {
      return `
        <div class="bk-card mt-6 text-center text-slate-300">
          <div class="text-2xl mb-1">🏆</div>
          Aún no hay jugadores registrados en el ranking.
        </div>
      `;
    }

    const tresPrimeros = this.ranking.slice(0, 3);
    const posiciones = [
      { indice: 1, clase: 'lb-rank-2', medalla: '🥈' },
      { indice: 0, clase: 'lb-rank-1', medalla: '🥇' },
      { indice: 2, clase: 'lb-rank-3', medalla: '🥉' },
    ];

    return `
      <section class="lb-player-podium" aria-label="Tres mejores jugadores">
        ${posiciones
          .map(({ indice, clase, medalla }) => {
            const jugador = tresPrimeros[indice];
            if (!jugador) return '<div class="lb-player-podium-slot" aria-hidden="true"></div>';

            const posicion = indice + 1;
            const avatar = this.normalizarAvatar(jugador.avatar);
            const inicial = this.escaparHtml(this.obtenerInicial(jugador.nickname));
            const nombre = this.escaparHtml(jugador.nickname);

            return `
              <article class="lb-player-podium-slot ${clase}">
                ${indice === 0 ? '<div class="lb-blooket-crown" aria-hidden="true">👑</div>' : ''}
                <div class="lb-player-avatar" title="${nombre}">
                  ${
                    avatar
                      ? `<img src="${this.escaparHtml(avatar)}" alt="Avatar de ${nombre}" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" />
                         <span class="lb-player-avatar-initial" hidden>${inicial}</span>`
                      : `<span class="lb-player-avatar-initial">${inicial}</span>`
                  }
                </div>
                <div class="lb-player-podium-step">
                  <span class="lb-blooket-pos">${medalla} #${posicion}</span>
                  <h3 class="lb-blooket-name" title="${nombre}">${nombre}</h3>
                  <div class="lb-blooket-pts font-mono-num">${jugador.points} pts</div>
                  <div class="lb-blooket-stats">${jugador.gamesPlayed} partidas · ${jugador.wins}V / ${jugador.losses}D</div>
                </div>
              </article>
            `;
          })
          .join('')}
      </section>
    `;
  }

  render() {
    if (this.cargando) {
      this.innerHTML = `
        <section class="lb-blooket-shell">
          <div class="bk-card text-center text-slate-200 font-bold">
            Cargando ranking de jugadores...
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

    const filasRanking =
      this.ranking.length > 0
        ? this.ranking
            .map(
              (jugador, indice) => {
                const avatar = this.normalizarAvatar(jugador.avatar);
                const inicial = this.escaparHtml(this.obtenerInicial(jugador.nickname));
                const nombre = this.escaparHtml(jugador.nickname);
                return `
                  <tr>
                    <td class="lb-ranking-position">#${indice + 1}</td>
                    <td>
                      <div class="lb-ranking-player">
                        <div class="lb-ranking-avatar">
                          ${
                            avatar
                              ? `<img src="${this.escaparHtml(avatar)}" alt="" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" />
                                 <span hidden>${inicial}</span>`
                              : `<span>${inicial}</span>`
                          }
                        </div>
                        <span class="lb-ranking-name">${nombre}</span>
                      </div>
                    </td>
                    <td class="font-mono-num font-black text-amber-400">${jugador.points} pts</td>
                    <td class="font-mono-num text-slate-300">${jugador.gamesPlayed}</td>
                    <td class="font-mono-num text-emerald-400">${jugador.wins}</td>
                    <td class="font-mono-num text-rose-300">${jugador.losses}</td>
                  </tr>
                `;
              }
            )
            .join('')
        : `<tr><td colspan="6" class="text-center text-slate-400 py-6">Aún no hay jugadores para clasificar.</td></tr>`;

    this.innerHTML = `
      <section class="lb-blooket-shell">
        <header class="lb-blooket-header">
          <div>
            <span class="lb-blooket-badge">⚡ Campuslands Arena</span>
            <h2 class="lb-blooket-title">Ranking de Jugadores</h2>
            <p class="lb-blooket-subtitle">
              Clasificación oficial por puntos obtenidos en las partidas jugadas.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" id="btn-refresh-lb" class="bk-btn bk-btn-cyan">Actualizar</button>
            <button type="button" id="btn-play-from-lb" class="bk-btn bk-btn-amber">Ir a Jugar</button>
          </div>
        </header>

        ${this.renderizarPodio()}

        <div class="bk-card lb-ranking-card">
          <h3 class="bk-card-title">🏅 Tabla de posiciones</h3>
          <div class="bk-table-wrap">
            <table class="bk-table lb-ranking-table">
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Jugador</th>
                  <th>Puntos</th>
                  <th>Partidas</th>
                  <th>Victorias</th>
                  <th>Derrotas</th>
                </tr>
              </thead>
              <tbody>${filasRanking}</tbody>
            </table>
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
