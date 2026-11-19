import { apiJugadores } from '../../api/playersApi.js';
import { apiBatallas } from '../../api/battlesApi.js';

export class LeaderboardView extends HTMLElement {
  constructor() {
    super();
    this.jugadores = [];
    this.batallas = [];
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
    } catch (errorCapturado) {
      this.mensajeError = errorCapturado.message || 'Error al cargar la clasificación.';
    } finally {
      this.cargando = false;
      this.render();
      this.configurarEventos();
    }
  }

  renderizarPodio() {
    const tresPrimeros = this.jugadores.slice(0, 3);
    if (tresPrimeros.length === 0) {
      return `
        <div class="campus-surface p-6 mt-5 text-center text-slate-300">
          Aún no hay jugadores registrados en el ranking. ¡Juega la primera batalla para inaugurar el podio de Campuslands!
        </div>
      `;
    }

    const titulosPuesto = ['1.er Puesto · Campeón Campus', '2.º Puesto · Subcampeón', '3.er Puesto · Podio'];
    return `
      <div class="lb-podium">
        ${tresPrimeros
          .map(
            (jugador, indice) => `
          <article class="lb-podium-card lb-rank-${indice + 1}">
            <div class="text-xs font-semibold text-amber-400">${titulosPuesto[indice]}</div>
            <h3 class="text-xl font-bold text-white mt-1 truncate">${this.escaparHtml(jugador.nickname)}</h3>
            <div class="mt-3 flex items-baseline justify-between gap-3">
              <span class="text-2xl font-extrabold text-amber-400 font-mono-num">${jugador.points} pts</span>
              <span class="text-xs text-slate-300 font-mono-num">
                ${jugador.wins}V · ${jugador.losses}D · ${jugador.gamesPlayed} PJ
              </span>
            </div>
          </article>
        `
          )
          .join('')}
      </div>
    `;
  }

  render() {
    if (this.cargando) {
      this.innerHTML = `
        <section class="lb-container">
          <div class="campus-surface p-8 text-center text-slate-300">
            Cargando tabla de posiciones e historial de combates...
          </div>
        </section>
      `;
      return;
    }

    if (this.mensajeError) {
      this.innerHTML = `
        <section class="lb-container">
          <div class="campus-surface p-6 text-center">
            <p class="text-red-300">${this.escaparHtml(this.mensajeError)}</p>
            <button type="button" id="btn-retry-lb" class="campus-btn campus-btn-primary mt-4">Reintentar</button>
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
            <td class="font-mono-num font-bold text-amber-400">#${indice + 1}</td>
            <td class="font-semibold">${this.escaparHtml(jugador.nickname)}</td>
            <td class="font-mono-num font-bold">${jugador.points}</td>
            <td class="font-mono-num text-emerald-300">${jugador.wins}</td>
            <td class="font-mono-num text-rose-300">${jugador.losses}</td>
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
            <div class="p-3.5 rounded-lg bg-[#091326] border border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="font-semibold text-white text-sm">
                  ${this.escaparHtml(batalla.playerNickname)} vs. Máquina
                </div>
                <div class="text-xs text-slate-400 mt-0.5 font-mono-num">
                  ${batalla.turnsPlayed} turnos · ${textoFecha}
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs font-semibold ${jugadorGano ? 'text-emerald-400' : 'text-rose-300'}">
                  ${jugadorGano ? 'Victoria' : 'Derrota'} · +${batalla.pointsAwarded} pts
                </div>
              </div>
            </div>
          `;
            })
            .join('')
        : `<div class="text-sm text-slate-400 py-6 text-center">Todavía no se han registrado combates.</div>`;

    this.innerHTML = `
      <section class="lb-container">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl sm:text-3xl font-bold text-white">Ranking  Campuslands</h2>
            <p class="text-sm text-slate-300 mt-1">
              Clasificación general ordenada por puntaje (Victoria +50 pts · Derrota +10 pts).
            </p>
          </div>
          <div class="flex items-center gap-2.5">
            <button type="button" id="btn-refresh-lb" class="campus-btn campus-btn-secondary">Actualizar</button>
            <button type="button" id="btn-play-from-lb" class="campus-btn campus-btn-primary">Ir a Jugar</button>
          </div>
        </div>

        ${this.renderizarPodio()}

        <div class="lb-grid">
          <div class="campus-surface p-5">
            <h3 class="text-lg font-bold text-white mb-3">Tabla General de Jugadores</h3>
            <div class="lb-table-wrap">
              <table class="lb-table">
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

          <div class="campus-surface p-5">
            <h3 class="text-lg font-bold text-white mb-3">Historial Reciente de Batallas</h3>
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
