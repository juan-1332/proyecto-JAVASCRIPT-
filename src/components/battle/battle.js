import './battleCard.js';
import './battleControls.js';
import {
  elegirAccionMaquina,
  crearEstadoInicialBatalla,
  ejecutarAccionTurno,
  obtenerDisponibilidadEspecial,
} from '../../utils/battleEngine.js';
import { apiJugadores } from '../../api/playersapi.js';
import { apiBatallas } from '../../api/battlesapi.js';
import { motorAudio } from '../../utils/soundEngine.js';

export class BattleArena extends HTMLElement {
  constructor() {
    super();
    this.estadoBatalla = null;
    this.jugador = null;
    this.mazoJugador = [];
    this.mazoMaquina = [];
    this.animando = false;
    this.temporizadorMaquina = null;
    this.guardandoResultado = false;
    this.resultadoGuardado = false;
    this.errorGuardado = '';
    this.controladorTeclas = this.manejarTecla.bind(this);
  }

  configurarPartida({ player, playerDeck, cpuDeck }) {
    this.limpiarTemporizadores();
    this.jugador = player;
    this.mazoJugador = playerDeck;
    this.mazoMaquina = cpuDeck;
    this.animando = false;
    this.guardandoResultado = false;
    this.resultadoGuardado = false;
    this.errorGuardado = '';
    this.estadoBatalla = crearEstadoInicialBatalla(
      playerDeck,
      cpuDeck,
      player?.nickname || 'Retador'
    );

    if (this.isConnected) {
      this.render();
      this.configurarEventos();
      this.programarTurnoMaquina();
    }
  }

  connectedCallback() {
    window.addEventListener('keydown', this.controladorTeclas);
    this.render();
    this.configurarEventos();
    this.programarTurnoMaquina();
  }

  disconnectedCallback() {
    this.limpiarTemporizadores();
    window.removeEventListener('keydown', this.controladorTeclas);
  }

  limpiarTemporizadores() {
    if (this.temporizadorMaquina) {
      clearTimeout(this.temporizadorMaquina);
      this.temporizadorMaquina = null;
    }
  }

  manejarTecla(evento) {
    if (!this.estadoBatalla || this.estadoBatalla.status !== 'playing') return;
    if (evento.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(evento.target.tagName)) return;

    const tecla = evento.key.toLowerCase();
    if (tecla === 'm') {
      motorAudio.alternarSilencio();
      this.render();
      this.configurarEventos();
      return;
    }

    if (this.estadoBatalla.currentActor !== 'player' || this.animando) return;

    if (['1', '2', '3', '4'].includes(tecla)) {
      this.manejarAccion('player', { type: 'attack', attackIndex: Number(tecla) - 1 });
    } else if (tecla === 'd') {
      this.manejarAccion('player', { type: 'defense' });
    } else if (tecla === 's') {
      this.manejarAccion('player', { type: 'special' });
    }
  }

  programarTurnoMaquina() {
    if (!this.estadoBatalla || this.estadoBatalla.status !== 'playing') return;
    if (this.estadoBatalla.currentActor !== 'cpu') return;

    this.limpiarTemporizadores();
    this.temporizadorMaquina = setTimeout(() => {
      const accion = elegirAccionMaquina(this.estadoBatalla);
      this.manejarAccion('cpu', accion);
    }, 780);
  }

  async manejarAccion(claveActor, accion) {
    if (!this.estadoBatalla || this.estadoBatalla.status !== 'playing' || this.animando) return;
    if (this.estadoBatalla.currentActor !== claveActor) return;

    const { nextState: siguienteEstado, event: evento } = ejecutarAccionTurno(this.estadoBatalla, claveActor, accion);
    if (!evento) return;

    this.animando = true;
    const elementoCartaJugador = this.querySelector('#player-battle-card');
    const elementoCartaMaquina = this.querySelector('#cpu-battle-card');

    const elementoAtacante = claveActor === 'player' ? elementoCartaJugador : elementoCartaMaquina;
    const elementoDefensor = claveActor === 'player' ? elementoCartaMaquina : elementoCartaJugador;

    if (evento.actionType === 'attack') {
      motorAudio.reproducirAtaque();
      elementoAtacante?.reproducirAnimacion(claveActor === 'player' ? 'anim-attack-up' : 'anim-attack-down');
      setTimeout(() => {
        motorAudio.reproducirImpacto();
        elementoDefensor?.reproducirAnimacion('anim-hit');
      }, 130);
    } else if (evento.actionType === 'defense') {
      motorAudio.reproducirDefensa();
      elementoAtacante?.reproducirAnimacion('anim-defend');
    } else if (evento.actionType === 'special') {
      motorAudio.reproducirEspecial();
      elementoAtacante?.reproducirAnimacion('anim-special');
      setTimeout(() => {
        motorAudio.reproducirImpacto();
        elementoDefensor?.reproducirAnimacion('anim-hit');
      }, 170);
    }

    if (evento.ko) {
      setTimeout(() => {
        motorAudio.reproducirDerrotaCarta();
        elementoDefensor?.reproducirAnimacion('anim-ko');
      }, 260);
    }

    setTimeout(async () => {
      this.estadoBatalla = siguienteEstado;
      this.animando = false;
      this.render();
      this.configurarEventos();

      if (evento.swappedUnit) {
        const elementoRelevo = evento.opponent === 'player'
          ? this.querySelector('#player-battle-card')
          : this.querySelector('#cpu-battle-card');
        elementoRelevo?.reproducirAnimacion('anim-enter');
      }

      if (this.estadoBatalla.status === 'finished') {
        if (this.estadoBatalla.winner === 'player') {
          motorAudio.reproducirVictoria();
        } else {
          motorAudio.reproducirDerrota();
        }
        await this.guardarResultadoBatalla();
      } else {
        this.programarTurnoMaquina();
      }
    }, evento.ko ? 560 : 380);
  }

  async guardarResultadoBatalla() {
    if (this.guardandoResultado || this.resultadoGuardado || !this.jugador) return;
    this.guardandoResultado = true;
    this.render();
    this.configurarEventos();

    try {
      const coincidencias = await apiJugadores.buscarPorApodo(this.jugador.nickname);
      const jugadorPersistido = Array.isArray(coincidencias) ? coincidencias[0] : null;
      if (!jugadorPersistido) {
        throw new Error(
          `No se encontró el perfil "${this.jugador.nickname}" en la base de datos actual. Vuelve a registrarlo antes de jugar otra partida.`
        );
      }

      const jugadorGano = this.estadoBatalla.winner === 'player';
      const puntosOtorgados = jugadorGano ? 50 : 10;
      const jugadorActualizado = await apiJugadores.actualizarEstadisticas(jugadorPersistido.id, {
        points: (Number(jugadorPersistido.points) || 0) + puntosOtorgados,
        wins: (Number(jugadorPersistido.wins) || 0) + (jugadorGano ? 1 : 0),
        losses: (Number(jugadorPersistido.losses) || 0) + (jugadorGano ? 0 : 1),
        gamesPlayed: (Number(jugadorPersistido.gamesPlayed) || 0) + 1,
      });

      await apiBatallas.registrarBatalla({
        playerId: jugadorPersistido.id,
        playerNickname: jugadorPersistido.nickname,
        playerDeck: this.mazoJugador.map((carta) => carta.name),
        cpuDeck: this.mazoMaquina.map((carta) => carta.name),
        winner: this.estadoBatalla.winner,
        turnsPlayed: this.estadoBatalla.globalTurn,
        pointsAwarded: puntosOtorgados,
      });

      this.jugador = jugadorActualizado;
      this.resultadoGuardado = true;
      this.dispatchEvent(
        new CustomEvent('player-updated', {
          detail: { player: jugadorActualizado },
          bubbles: true,
        })
      );
    } catch (errorCapturado) {
      this.errorGuardado = errorCapturado.message || 'No se pudo guardar el resultado de la batalla.';
    } finally {
      this.guardandoResultado = false;
      this.render();
      this.configurarEventos();
    }
  }

  render() {
    if (!this.estadoBatalla) {
      this.innerHTML = `
        <section class="arena-shell">
          <div class="campus-surface p-8 text-center text-slate-300">
            Arma tu mazo de 5 cartas primero para entrar a la Arena.
          </div>
        </section>
      `;
      return;
    }

    const estado = this.estadoBatalla;
    const unidadMaquina = estado.cpu.units[estado.cpu.activeIndex];
    const unidadJugador = estado.player.units[estado.player.activeIndex];
    const especialJugador = obtenerDisponibilidadEspecial(estado.player, unidadJugador);
    const especialMaquina = obtenerDisponibilidadEspecial(estado.cpu, unidadMaquina);
    const esTurnoJugador = estado.currentActor === 'player' && estado.status === 'playing';
    const audioSilenciado = motorAudio.estaSilenciado();

    const contenidoBitacora = estado.logs
      .slice(0, 18)
      .map(
        (registro) => `
      <div class="arena-log-item">
        <span class="font-mono-num text-amber-400 mr-1.5">T${registro.turn}</span>
        <span class="text-slate-200">${this.escaparHtml(registro.text)}</span>
      </div>
    `
      )
      .join('');

    const modalFinalizado =
      estado.status === 'finished'
        ? `
      <div class="arena-modal-backdrop" role="dialog" aria-modal="true" aria-label="Resultado del Combate">
        <div class="arena-modal-card">
          <div class="text-xs font-semibold text-amber-400">Combate Finalizado · ${estado.globalTurn} turnos</div>
          <h2 class="text-3xl font-extrabold text-white mt-1">
            ${estado.winner === 'player' ? '¡Victoria en Campuslands!' : 'Derrota ante la Máquina'}
          </h2>
          <p class="text-sm text-slate-300 mt-2">
            ${
              estado.winner === 'player'
                ? `${this.escaparHtml(estado.playerNickname)} dominó la mesa y suma +50 puntos al ranking.`
                : 'La Máquina completó la eliminación de tu mazo. Recibes +10 puntos por competir.'
            }
          </p>

          <div class="mt-4 p-3.5 rounded-lg bg-[#091326] border border-white/10 flex items-center justify-between">
            <span class="text-sm text-slate-300">Puntaje acumulado</span>
            <span class="font-mono-num text-xl font-bold text-amber-400">${this.jugador?.points ?? 0} pts</span>
          </div>

          ${
            this.guardandoResultado
              ? `<p class="text-xs text-slate-400 mt-3">Guardando resultado en el historial...</p>`
              : this.errorGuardado
              ? `<p class="text-xs text-rose-300 mt-3">${this.escaparHtml(this.errorGuardado)}</p>`
              : `<p class="text-xs text-emerald-300 mt-3">Estadísticas e historial actualizados correctamente.</p>`
          }

          <div class="mt-5 flex flex-wrap gap-2.5">
            <button type="button" id="btn-play-again" class="campus-btn campus-btn-primary flex-1">
              Jugar de Nuevo
            </button>
            <button type="button" id="btn-view-lb" class="campus-btn campus-btn-secondary flex-1">
              Ver ranking
            </button>
          </div>
        </div>
      </div>
    `
        : '';

    this.innerHTML = `
      <section class="arena-shell">
        <div class="arena-hud">
          <div class="flex flex-wrap items-center gap-4">
            <div>
              <span class="text-xs text-slate-400">Turno Global</span>
              <div class="font-mono-num text-lg font-bold text-white">#${estado.globalTurn}</div>
            </div>
            <div class="h-7 w-px bg-white/10 hidden sm:block"></div>
            <div>
              <span class="text-xs text-slate-400">Iniciativa Actual</span>
              <div class="text-sm font-bold ${esTurnoJugador ? 'text-emerald-400' : 'text-amber-400'}">
                ${
                  estado.status === 'finished'
                    ? 'Partida Cerrada'
                    : esTurnoJugador
                    ? `Turno de ${this.escaparHtml(estado.playerNickname)}`
                    : 'Turno de la Máquina'
                }
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" id="btn-toggle-mute" class="campus-btn campus-btn-secondary">
              ${audioSilenciado ? 'Audio Silenciado' : 'Audio Activo'}
            </button>
            <button type="button" id="btn-exit-battle" class="campus-btn campus-btn-danger">
              Salir al Mazo
            </button>
          </div>
        </div>

        <div class="arena-board">
          <div class="arena-felt">
            <battle-card id="cpu-battle-card"></battle-card>

            <div class="arena-clash-divider">
              <span class="font-semibold text-amber-400">Mesa de Combate Campuslands</span>
              <span class="text-xs text-slate-300 font-mono-num">
                Turnos propios: Tú ${estado.player.ownTurnsStarted} · CPU ${estado.cpu.ownTurnsStarted}
              </span>
            </div>

            <battle-card id="player-battle-card"></battle-card>
            <battle-controls id="battle-controls-panel"></battle-controls>
          </div>

          <aside class="arena-log-panel">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-white">Bitácora de Combate</h3>
              <span class="text-xs text-slate-400 font-mono-num">${estado.logs.length} eventos</span>
            </div>
            <div class="arena-log-list">${contenidoBitacora}</div>
          </aside>
        </div>

        ${modalFinalizado}
      </section>
    `;

    // Hidratar propiedades complejas en los subcomponentes
    const cartaMaquina = this.querySelector('#cpu-battle-card');
    if (cartaMaquina) {
      cartaMaquina.estadoCarta = {
        sideLabel: 'Oponente',
        ownerName: 'Máquina',
        unit: unidadMaquina,
        units: estado.cpu.units,
        activeIndex: estado.cpu.activeIndex,
        specialStatus: especialMaquina,
      };
    }

    const cartaJugador = this.querySelector('#player-battle-card');
    if (cartaJugador) {
      cartaJugador.estadoCarta = {
        sideLabel: 'Tu Carta',
        ownerName: estado.playerNickname,
        unit: unidadJugador,
        units: estado.player.units,
        activeIndex: estado.player.activeIndex,
        specialStatus: especialJugador,
      };
    }

    const controles = this.querySelector('#battle-controls-panel');
    if (controles) {
      controles.estadoControles = {
        unit: unidadJugador,
        disabled: !esTurnoJugador || this.animando || estado.status !== 'playing',
        specialStatus: especialJugador,
        isPlayerTurn: esTurnoJugador,
      };
    }
  }

  configurarEventos() {
    this.querySelector('#battle-controls-panel')?.addEventListener('player-action', (evento) => {
      this.manejarAccion('player', evento.detail);
    });

    this.querySelector('#btn-toggle-mute')?.addEventListener('click', () => {
      motorAudio.alternarSilencio();
      this.render();
      this.configurarEventos();
    });

    this.querySelector('#btn-exit-battle')?.addEventListener('click', () => {
      this.limpiarTemporizadores();
      this.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'deck' }, bubbles: true }));
    });

    this.querySelector('#btn-play-again')?.addEventListener('click', () => {
      this.limpiarTemporizadores();
      this.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'deck' }, bubbles: true }));
    });

    this.querySelector('#btn-view-lb')?.addEventListener('click', () => {
      this.limpiarTemporizadores();
      this.dispatchEvent(
        new CustomEvent('navigate', { detail: { view: 'leaderboard' }, bubbles: true })
      );
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

customElements.define('battle-arena', BattleArena);
