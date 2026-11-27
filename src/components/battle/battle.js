import './battleCard.js';
import './battleControls.js';
import {
  elegirAccionAutomatica,
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
    if (Array.isArray(this.temporizadoresEfectos)) {
      this.temporizadoresEfectos.forEach((id) => clearTimeout(id));
      this.temporizadoresEfectos = [];
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

    if (this.modoBatalla === 'automatic') return;
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
    this.programarSiguienteTurno();
  }

  obtenerTop3Fichas() {
    if (!this.estadoBatalla) return [];

    const buscarEnMazo = (carta, mazo, idx) => {
      const idOrName = carta?.id || carta?.cardId || carta?.name || carta?.nombre;
      return (
        (mazo || []).find(
          (item) =>
            (idOrName && (item?.id === idOrName || item?.name === idOrName || item?.nombre === idOrName))
        ) ||
        mazo?.[idx] ||
        null
      );
    };

    const extraerNombre = (carta, respaldoMazo, fallback) =>
      carta?.name ||
      carta?.nombre ||
      carta?.title ||
      carta?.cardName ||
      respaldoMazo?.name ||
      respaldoMazo?.nombre ||
      respaldoMazo?.title ||
      fallback;

    const extraerHp = (carta, respaldoMazo) =>
      Number(
        carta?.hp ??
          carta?.currentHp ??
          carta?.stats?.hp ??
          respaldoMazo?.hp ??
          respaldoMazo?.stats?.hp ??
          0
      );

    const extraerAtk = (carta, respaldoMazo) =>
      Number(
        carta?.attack ??
          carta?.atk ??
          carta?.stats?.attack ??
          carta?.stats?.atk ??
          respaldoMazo?.attack ??
          respaldoMazo?.atk ??
          respaldoMazo?.stats?.attack ??
          0
      );

    const extraerImagen = (carta, respaldoMazo) =>
      carta?.image || carta?.imagen || respaldoMazo?.image || respaldoMazo?.imagen || '';

    const unidadesJugador = (this.estadoBatalla.player?.units || []).map((carta, idx) => {
      const respaldoMazo = buscarEnMazo(carta, this.mazoJugador, idx);
      return {
        ...carta,
        nombreReal: extraerNombre(carta, respaldoMazo, `Carta ${idx + 1}`),
        hpReal: extraerHp(carta, respaldoMazo),
        atkReal: extraerAtk(carta, respaldoMazo),
        imagenReal: extraerImagen(carta, respaldoMazo),
        bando: 'player',
        propietario: this.estadoBatalla.playerNickname || 'Jugador',
        ordenOriginal: idx,
      };
    });

    const unidadesCpu = (this.estadoBatalla.cpu?.units || []).map((carta, idx) => {
      const respaldoMazo = buscarEnMazo(carta, this.mazoMaquina, idx);
      return {
        ...carta,
        nombreReal: extraerNombre(carta, respaldoMazo, `Carta CPU ${idx + 1}`),
        hpReal: extraerHp(carta, respaldoMazo),
        atkReal: extraerAtk(carta, respaldoMazo),
        imagenReal: extraerImagen(carta, respaldoMazo),
        bando: 'cpu',
        propietario: 'Máquina',
        ordenOriginal: idx + 10,
      };
    });

    const todasLasFichas = [...unidadesJugador, ...unidadesCpu];

    const ordenadas = todasLasFichas.sort((a, b) => {
      if (b.hpReal !== a.hpReal) return b.hpReal - a.hpReal;
      if (b.atkReal !== a.atkReal) return b.atkReal - a.atkReal;
      return a.ordenOriginal - b.ordenOriginal;
    });

    return ordenadas.slice(0, 3).map((carta, indice) => ({
      posicion: indice + 1,
      id: carta.id || carta.cardId || '',
      name: carta.nombreReal,
      image: carta.imagenReal,
      hp: carta.hpReal,
      attack: carta.atkReal,
      propietario: carta.propietario,
    }));
  }

  async manejarAccion(claveActor, accion) {
    if (!this.estadoBatalla || this.estadoBatalla.status !== 'playing' || this.animando) return;
    if (this.estadoBatalla.currentActor !== claveActor) return;

    const { nextState: siguienteEstado, event: evento } = ejecutarAccionTurno(
      this.estadoBatalla,
      claveActor,
      accion
    );
    if (!evento) return;

    this.animando = true;
    this.eventoDestacado = evento.dodged
      ? { tipo: 'dodge', texto: '¡ATAQUE ESQUIVADO!' }
      : evento.isCritical
      ? { tipo: 'critical', texto: '¡GOLPE CRÍTICO! ×1.5' }
      : null;

    const elementoCartaJugador = this.querySelector('#player-battle-card');
    const elementoCartaMaquina = this.querySelector('#cpu-battle-card');

    const elementoAtacante = claveActor === 'player' ? elementoCartaJugador : elementoCartaMaquina;
    const elementoDefensor = claveActor === 'player' ? elementoCartaMaquina : elementoCartaJugador;

    const reproducirRespuestaDefensor = () => {
      if (evento.dodged) {
        motorAudio.reproducirEsquive();
        elementoDefensor?.reproducirAnimacion('anim-dodge');
      } else if (evento.isCritical) {
        motorAudio.reproducirCritico();
        elementoDefensor?.reproducirAnimacion('anim-crit');
      } else {
        motorAudio.reproducirImpacto();
        elementoDefensor?.reproducirAnimacion('anim-hit');
      }
    };

    if (evento.actionType === 'attack') {
      motorAudio.reproducirAtaque();
      elementoAtacante?.reproducirAnimacion(
        claveActor === 'player' ? 'anim-attack-up' : 'anim-attack-down'
      );
      this.registrarTemporizadorEfecto(reproducirRespuestaDefensor, 130);
    } else if (evento.actionType === 'defense') {
      motorAudio.reproducirDefensa();
      elementoAtacante?.reproducirAnimacion('anim-defend');
    } else if (evento.actionType === 'special') {
      motorAudio.reproducirEspecial();
      elementoAtacante?.reproducirAnimacion('anim-special');
      this.registrarTemporizadorEfecto(reproducirRespuestaDefensor, 170);
    }

    if (evento.ko) {
      this.registrarTemporizadorEfecto(() => {
        motorAudio.reproducirDerrotaCarta();
        elementoDefensor?.reproducirAnimacion('anim-ko');
      }, 260);
    }

    this.registrarTemporizadorEfecto(async () => {
      this.estadoBatalla = siguienteEstado;
      this.animando = false;
      this.render();
      this.configurarEventos();

      if (evento.swappedUnit) {
        const elementoRelevo =
          evento.opponent === 'player'
            ? this.querySelector('#player-battle-card')
            : this.querySelector('#cpu-battle-card');
        elementoRelevo?.reproducirAnimacion('anim-enter');
      }

      if (this.estadoBatalla.status === 'finished') {
        this.limpiarTemporizadores();
        if (this.estadoBatalla.winner === 'player') {
          motorAudio.reproducirVictoria();
        } else {
          motorAudio.reproducirDerrota();
        }
        await this.guardarResultadoBatalla();
      } else {
        this.programarSiguienteTurno();
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
      const top3Fichas = this.obtenerTop3Fichas();
      const cartaGanadora = top3Fichas[0] || null;

      const jugadorActualizado = await apiJugadores.actualizarEstadisticas(jugadorPersistido.id, {
        points: (Number(jugadorPersistido.points) || 0) + puntosOtorgados,
        wins: (Number(jugadorPersistido.wins) || 0) + (jugadorGano ? 1 : 0),
        losses: (Number(jugadorPersistido.losses) || 0) + (jugadorGano ? 0 : 1),
        gamesPlayed: (Number(jugadorPersistido.gamesPlayed) || 0) + 1,
      });

      await apiBatallas.registrarBatalla({
        playerId: jugadorPersistido.id,
        playerNickname: jugadorPersistido.nickname,
        playerDeck: this.mazoJugador.map((carta) => carta.name || carta.nombre || ''),
        cpuDeck: this.mazoMaquina.map((carta) => carta.name || carta.nombre || ''),
        winningCardName: cartaGanadora?.name || '',
        winningCardImage: cartaGanadora?.image || '',
        podiumCards: top3Fichas,
        winner: this.estadoBatalla.winner,
        mode: this.modoBatalla || 'manual',
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

    const top3Fichas = estado.status === 'finished' ? this.obtenerTop3Fichas() : [];
    const bloquePodioPartida =
      estado.status === 'finished' && top3Fichas.length > 0
        ? `
      <div class="arena-podium-panel">
        <div class="text-[11px] uppercase tracking-wider font-semibold text-amber-400 mb-3 text-center">
          Top 3 Fichas de la Partida
        </div>
        <div class="arena-podium-grid">
          ${top3Fichas
            .map(
              (ficha) => `
            <article class="arena-podium-card">
              <span class="arena-podium-position">#${ficha.posicion}</span>
              <div class="arena-podium-media" role="img" aria-label="${this.escaparHtml(ficha.name)}">
                ${
                  ficha.image
                    ? `<img src="${this.escaparHtml(ficha.image)}" alt="${this.escaparHtml(ficha.name)}" class="arena-podium-image" />`
                    : `<span class="arena-podium-image-placeholder">Sin imagen</span>`
                }
              </div>
              <span class="text-xs font-bold text-white mt-1.5 line-clamp-1">${this.escaparHtml(ficha.name)}</span>
              <span class="text-[10px] text-slate-400">${this.escaparHtml(ficha.propietario)}</span>
              <span class="text-[11px] text-slate-300 font-mono-num">HP ${ficha.hp} · ATK ${ficha.attack}</span>
            </article>
          `
            )
            .join('')}
        </div>
      </div>
    `
        : '';

    const modalFinalizado =
      estado.status === 'finished'
        ? `
      <div class="arena-modal-backdrop" role="dialog" aria-modal="true" aria-label="Resultado del Combate">
        <div class="arena-modal-card">
          <div class="text-xs font-semibold text-amber-400">Combate Finalizado · ${estado.globalTurn} turnos</div>
          <h2 class="arena-modal-title text-3xl font-extrabold text-white mt-1">
            ${estado.winner === 'player' ? '¡Victoria en Campuslands!' : 'Derrota ante la Máquina'}
          </h2>
          <p class="text-sm text-slate-300 mt-2">
            ${
              estado.winner === 'player'
                ? `${this.escaparHtml(estado.playerNickname)} dominó la mesa y suma +50 puntos al ranking.`
                : 'La Máquina completó la eliminación de tu mazo. Recibes +10 puntos por competir.'
            }
          </p>

          ${bloquePodioPartida}

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

          <div class="arena-modal-actions mt-5 flex flex-wrap gap-2.5">
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
    this.querySelectorAll('.arena-podium-image').forEach((imagen) => {
      imagen.addEventListener('error', () => {
        const contenedor = imagen.closest('.arena-podium-media');
        imagen.hidden = true;
        contenedor?.classList.add('is-image-error');
        if (!contenedor?.querySelector('.arena-podium-image-placeholder')) {
          contenedor?.insertAdjacentHTML(
            'beforeend',
            '<span class="arena-podium-image-placeholder">Sin imagen</span>'
          );
        }
      });
    });

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

  registrarTemporizadorEfecto(funcion, retraso) {
    if (!this.temporizadoresEfectos) this.temporizadoresEfectos = [];
    const id = setTimeout(() => {
      this.temporizadoresEfectos = this.temporizadoresEfectos.filter((item) => item !== id);
      funcion();
    }, retraso);
    this.temporizadoresEfectos.push(id);
    return id;
  }

  aplicarModoInicial(modo) {
    this.modoBatalla = modo === 'automatic' ? 'automatic' : 'manual';
    this.eventoDestacado = null;
    if (this.estadoBatalla) this.estadoBatalla.mode = this.modoBatalla;
    this.limpiarTemporizadores();
    if (this.isConnected) {
      this.render();
      this.configurarEventos();
      this.programarSiguienteTurno();
    }
  }

  cambiarModoBatalla(nuevoModo) {
    const modoNormalizado = nuevoModo === 'automatic' ? 'automatic' : 'manual';
    if (!this.estadoBatalla || this.estadoBatalla.status !== 'playing') return;
    if ((this.modoBatalla || 'manual') === modoNormalizado) return;

    this.modoBatalla = modoNormalizado;
    this.estadoBatalla.mode = modoNormalizado;
    motorAudio.reproducirClic();

    if (this.modoBatalla === 'manual' && this.estadoBatalla.currentActor === 'player' && this.temporizadorMaquina) {
      clearTimeout(this.temporizadorMaquina);
      this.temporizadorMaquina = null;
    }

    this.render();
    this.configurarEventos();

    if (!this.animando) {
      this.programarSiguienteTurno();
    }
  }

  programarSiguienteTurno() {
    if (!this.estadoBatalla || this.estadoBatalla.status !== 'playing' || this.animando) return;

    const actorActual = this.estadoBatalla.currentActor;
    const esAutomatico =
      actorActual === 'cpu' || (actorActual === 'player' && this.modoBatalla === 'automatic');
    if (!esAutomatico) return;

    if (this.temporizadorMaquina) {
      clearTimeout(this.temporizadorMaquina);
      this.temporizadorMaquina = null;
    }

    this.temporizadorMaquina = setTimeout(() => {
      this.temporizadorMaquina = null;
      if (!this.estadoBatalla || this.estadoBatalla.status !== 'playing' || this.animando) return;
      if (this.estadoBatalla.currentActor !== actorActual) return;

      const accion = elegirAccionAutomatica(this.estadoBatalla, actorActual);
      this.manejarAccion(actorActual, accion);
    }, 850);
  }
}

customElements.define('battle-arena', BattleArena);

const renderBatallaOriginal = BattleArena.prototype.render;
BattleArena.prototype.render = function () {
  if (!this.modoBatalla) this.modoBatalla = 'manual';
  renderBatallaOriginal.call(this);
  if (!this.estadoBatalla) return;

  const estado = this.estadoBatalla;
  const botonSilencio = this.querySelector('#btn-toggle-mute');
  if (botonSilencio?.parentElement) {
    botonSilencio.parentElement.classList.add('flex-wrap');
    botonSilencio.insertAdjacentHTML(
      'beforebegin',
      `
        <div class="arena-mode-toggle" role="group" aria-label="Modo de combate">
          <button
            type="button"
            data-mode-switch="manual"
            class="arena-mode-btn ${this.modoBatalla === 'manual' ? 'is-active' : ''}"
            ${estado.status !== 'playing' ? 'disabled' : ''}
          >
            Manual
          </button>
          <button
            type="button"
            data-mode-switch="automatic"
            class="arena-mode-btn ${this.modoBatalla === 'automatic' ? 'is-active' : ''}"
            ${estado.status !== 'playing' ? 'disabled' : ''}
          >
            Automático
          </button>
        </div>
      `
    );
  }

  if (this.eventoDestacado) {
    const tituloMesa = this.querySelector('.arena-clash-divider span');
    if (tituloMesa) {
      tituloMesa.innerHTML = `<span class="arena-event-callout is-${this.eventoDestacado.tipo}">${this.escaparHtml(this.eventoDestacado.texto)}</span>`;
    }
  }

  const registrosVisibles = estado.logs.slice(0, 18);
  this.querySelectorAll('.arena-log-item').forEach((elemento, indice) => {
    const tipo = registrosVisibles[indice]?.type;
    if (tipo === 'critical') elemento.classList.add('arena-log-critical');
    if (tipo === 'dodge') elemento.classList.add('arena-log-dodge');
  });

  const controles = this.querySelector('#battle-controls-panel');
  if (controles && controles._estadoControles) {
    controles.estadoControles = {
      ...controles._estadoControles,
      disabled: controles._estadoControles.disabled || this.modoBatalla === 'automatic',
      battleMode: this.modoBatalla,
    };
  }
};

const configurarEventosBatallaOriginal = BattleArena.prototype.configurarEventos;
BattleArena.prototype.configurarEventos = function () {
  const panelControles = this.querySelector('#battle-controls-panel');
  panelControles?.addEventListener('player-action', (evento) => {
    if (this.modoBatalla === 'automatic' || this.animando) {
      evento.stopImmediatePropagation();
    }
  });

  configurarEventosBatallaOriginal.call(this);

  this.querySelectorAll('[data-mode-switch]').forEach((boton) => {
    boton.addEventListener('click', () => {
      this.cambiarModoBatalla(boton.getAttribute('data-mode-switch'));
    });
  });
};