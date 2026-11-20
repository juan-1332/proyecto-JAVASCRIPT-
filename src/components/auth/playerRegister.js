import { apiJugadores } from '../../api/playersapi.js';
import { validarApodo } from '../../utils/validators.js';
import { motorAudio } from '../../utils/soundEngine.js';

export class PlayerRegister extends HTMLElement {
  constructor() {
    super();
    this.cargando = false;
    this.mensajeError = '';
    this.coincidenciaExistente = null;
    this.apodoTemporal = '';
    this.jugadorActivo = null;
  }

  set jugadorActual(jugador) {
    this.jugadorActivo = jugador;
    if (this.isConnected) {
      this.render();
      this.configurarEventos();
    }
  }

  connectedCallback() {
    this.render();
    this.configurarEventos();
  }

  async buscarYRegistrar() {
    const validacion = validarApodo(this.apodoTemporal);
    if (!validacion.valid) {
      this.mensajeError = validacion.message;
      this.coincidenciaExistente = null;
      this.render();
      this.configurarEventos();
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.coincidenciaExistente = null;
    this.render();
    this.configurarEventos();

    try {
      const jugadorEncontrado = await apiJugadores.buscarPorApodo(validacion.value);
      if (Array.isArray(jugadorEncontrado) && jugadorEncontrado.length > 0) {
        this.coincidenciaExistente = jugadorEncontrado[0];
        this.cargando = false;
        this.render();
        this.configurarEventos();
        return;
      }

      const jugadorCreado = await apiJugadores.registrar(validacion.value);
      motorAudio.reproducirClic();
      this.cargando = false;
      this.dispatchEvent(
        new CustomEvent('player-ready', {
          detail: { player: jugadorCreado },
          bubbles: true,
        })
      );
    } catch (errorCapturado) {
      this.cargando = false;
      this.mensajeError = errorCapturado.message || 'No fue posible validar tu nickname.';
      this.render();
      this.configurarEventos();
    }
  }

  continuarConExistente(jugador) {
    motorAudio.reproducirClic();
    this.dispatchEvent(
      new CustomEvent('player-ready', {
        detail: { player: jugador },
        bubbles: true,
      })
    );
  }

  render() {
    const avisoSesion = this.jugadorActivo
      ? `
        <div class="auth-feedback auth-feedback-info mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="font-semibold text-amber-200">Sesión activa: ${this.escaparHtml(this.jugadorActivo.nickname)}</div>
            <div class="text-xs text-slate-300 font-mono-num">${this.jugadorActivo.points} pts · ${this.jugadorActivo.wins}V / ${this.jugadorActivo.losses}D</div>
          </div>
          <button type="button" id="btn-resume-player" class="campus-btn campus-btn-primary">
            Armar Mazo
          </button>
        </div>
      `
      : '';

    const avisoDuplicado = this.coincidenciaExistente
      ? `
        <div class="auth-feedback auth-feedback-info">
          <div class="font-semibold text-amber-200">El nickname "${this.escaparHtml(this.coincidenciaExistente.nickname)}" ya está registrado.</div>
          <p class="text-xs text-slate-200 mt-1">
            No se permiten registros duplicados. Puedes continuar con este perfil (${this.coincidenciaExistente.points} pts) o elegir otro apodo.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" id="btn-use-existing" class="campus-btn campus-btn-primary">
              Entrar como ${this.escaparHtml(this.coincidenciaExistente.nickname)}
            </button>
            <button type="button" id="btn-clear-match" class="campus-btn campus-btn-secondary">
              Usar otro nickname
            </button>
          </div>
        </div>
      `
      : '';

    this.innerHTML = `
      <section class="auth-stage" aria-label="Inicio Campuslands Battle Arena">
        <div class="auth-hero">
          <div>
            <div class="flex items-center gap-3 mb-5">
              <svg width="44" height="44" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <rect width="64" height="64" rx="14" fill="#081226"/>
                <rect x="3" y="3" width="58" height="58" rx="12" stroke="#F59E0B" stroke-width="2.5"/>
                <path d="M20 20L32 14L44 20V34C44 43 32 50 32 50C32 50 20 43 20 34V20Z" fill="#17294D" stroke="#F59E0B" stroke-width="2.5"/>
                <path d="M27 31L31 35L38 26" stroke="#F59E0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="text-xs text-slate-300 font-medium">
                Campuslands · Sede Cajasan · Duelo 1v1
              </div>
            </div>

            <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Campuslands Battle Arena
            </h1>
            <p class="mt-3 text-slate-300 text-base leading-relaxed max-w-xl">
            Forma tu mazo con las cartas de campuslands, divierte y juega.   
            </p>
          </div>

          <div class="auth-rules-grid">
            <div class="auth-rule-item">
              <div class="text-xs font-semibold text-amber-400">¿Como armar tu mazo?</div>
              <div class="text-sm text-slate-200 mt-1">Elige 5 cartas en orden de salida, ellas combatiran contra la maquina.</div>
            </div>
            <div class="auth-rule-item">
              <div class="text-xs font-semibold text-amber-400">250 HP</div>
              <div class="text-sm text-slate-200 mt-1">La carta ganadora conserva su vida restante al enfrentar al siguiente relevo.</div>
            </div>
            <div class="auth-rule-item">
              <div class="text-xs font-semibold text-amber-400">Defensa 50%</div>
              <div class="text-sm text-slate-200 mt-1">Consume el turno y reduce a la mitad el próximo ataque recibido.</div>
            </div>
            <div class="auth-rule-item">
              <div class="text-xs font-semibold text-amber-400">Especial (cada dos turnos)</div>
              <div class="text-sm text-slate-200 mt-1">Bloqueado en turno 1; entra despues de 3 turnos propios.</div>
            </div>
          </div>
        </div>

        <div class="auth-panel">
          ${avisoSesion}
          <h2 class="text-2xl font-bold text-white">Ingreso de Jugador</h2>
          <p class="text-sm text-slate-300 mt-1 mb-5">
            Registra un nickname único para acumular puntos en el ranking oficial (+50 victoria · +10 derrota).
          </p>

          <form id="player-register-form" novalidate>
            <label for="nickname-input" class="block text-sm font-medium text-slate-200 mb-2">
              Nickname del retador
            </label>
            <input
              id="nickname-input"
              type="text"
              class="campus-input"
              placeholder="Ej. CamperPro2026"
              value="${this.escaparHtml(this.apodoTemporal)}"
              maxlength="20"
              autocomplete="off"
              ${this.cargando ? 'disabled' : ''}
            />

            ${
              this.mensajeError
                ? `<div class="auth-feedback auth-feedback-error" role="alert">${this.escaparHtml(this.mensajeError)}</div>`
                : ''
            }
            ${avisoDuplicado}

            <div class="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                class="campus-btn campus-btn-primary w-full"
                ${this.cargando ? 'disabled' : ''}
              >
                ${this.cargando ? 'Validando nickname...' : 'Validar y Entrar al Combate'}
              </button>
            </div>
          </form>

          <div class="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>20 cartas listas para combatir</span>
            <button type="button" id="btn-go-leaderboard" class="text-amber-400 hover:underline font-medium cursor-pointer">
              Ver ranking
            </button>
          </div>
        </div>
      </section>
    `;
  }

  configurarEventos() {
    const formulario = this.querySelector('#player-register-form');
    const entradaApodo = this.querySelector('#nickname-input');
    const botonUsarExistente = this.querySelector('#btn-use-existing');
    const botonLimpiarCoincidencia = this.querySelector('#btn-clear-match');
    const botonReanudar = this.querySelector('#btn-resume-player');
    const botonClasificacion = this.querySelector('#btn-go-leaderboard');

    if (entradaApodo) {
      entradaApodo.addEventListener('input', (evento) => {
        this.apodoTemporal = evento.target.value;
      });
    }

    if (formulario) {
      formulario.addEventListener('submit', (evento) => {
        evento.preventDefault();
        this.buscarYRegistrar();
      });
    }

    if (botonUsarExistente && this.coincidenciaExistente) {
      botonUsarExistente.addEventListener('click', () => {
        this.continuarConExistente(this.coincidenciaExistente);
      });
    }

    if (botonLimpiarCoincidencia) {
      botonLimpiarCoincidencia.addEventListener('click', () => {
        this.coincidenciaExistente = null;
        this.apodoTemporal = '';
        this.render();
        this.configurarEventos();
        this.querySelector('#nickname-input')?.focus();
      });
    }

    if (botonReanudar && this.jugadorActivo) {
      botonReanudar.addEventListener('click', () => {
        this.continuarConExistente(this.jugadorActivo);
      });
    }

    if (botonClasificacion) {
      botonClasificacion.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'leaderboard' }, bubbles: true }));
      });
    }
  }

  escaparHtml(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('player-register', PlayerRegister);
