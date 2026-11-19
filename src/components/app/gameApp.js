import '../auth/playerRegister.js';
import '../auth/adminLogin.js';
import '../deck/deckSelector.js';
import '../battle/battle.js';
import '../leaderboard/leaderboard.js';
import '../cards/cards.js';
import { motorAudio } from '../../utils/soundEngine.js';

export class GameApp extends HTMLElement {
  constructor() {
    super();
    this.vistaActual = 'register'; // 'register' | 'deck' | 'battle' | 'leaderboard' | 'admin'
    this.jugadorActual = this.cargarSesion('cba_player');
    this.administradorActual = this.cargarSesion('cba_admin');
    this.batallaPendiente = null;
  }

  cargarSesion(clave) {
    try {
      const datosGuardados = sessionStorage.getItem(clave);
      return datosGuardados ? JSON.parse(datosGuardados) : null;
    } catch {
      return null;
    }
  }

  guardarSesion(clave, valor) {
    try {
      if (valor) {
        sessionStorage.setItem(clave, JSON.stringify(valor));
      } else {
        sessionStorage.removeItem(clave);
      }
    } catch {
      // Ignorar si sessionStorage no está disponible
    }
  }

  connectedCallback() {
    this.render();
    this.configurarEventos();
  }

  navegarA(vista) {
    if (vista === 'deck' && !this.jugadorActual) {
      this.vistaActual = 'register';
    } else if (vista === 'battle' && !this.batallaPendiente) {
      this.vistaActual = this.jugadorActual ? 'deck' : 'register';
    } else {
      this.vistaActual = vista;
    }
    motorAudio.reproducirClic();
    this.render();
    this.configurarEventos();
  }

  renderizarVistaActiva() {
    switch (this.vistaActual) {
      case 'deck':
        return `<deck-selector id="view-deck"></deck-selector>`;
      case 'battle':
        return `<battle-arena id="view-battle"></battle-arena>`;
      case 'leaderboard':
        return `<leaderboard-view id="view-leaderboard"></leaderboard-view>`;
      case 'admin':
        return this.administradorActual
          ? `<cards-manager id="view-cards-admin"></cards-manager>`
          : `<admin-login id="view-admin-login"></admin-login>`;
      case 'register':
      default:
        return `<player-register id="view-register"></player-register>`;
    }
  }

  render() {
    const textoBotonPrincipal = this.jugadorActual ? 'Elegir Mazo' : 'Entrar a Jugar';

    this.innerHTML = `
      <div class="min-h-screen flex flex-col">
        <header class="border-b border-white/10 bg-[#081226]/95">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
            <a href="#inicio" id="brand-home" class="font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
              Campuslands Arena
            </a>

            <nav class="flex items-center gap-5 sm:gap-7 text-sm font-medium text-slate-300 overflow-x-auto" aria-label="Navegación principal">
              <button type="button" data-nav="register" class="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${this.vistaActual === 'register' ? 'text-amber-400 underline underline-offset-8' : ''}">
                Inicio
              </button>
              <button type="button" data-nav="deck" class="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${this.vistaActual === 'deck' ? 'text-amber-400 underline underline-offset-8' : ''}">
                Mazo
              </button>
              <button type="button" data-nav="leaderboard" class="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${this.vistaActual === 'leaderboard' ? 'text-amber-400 underline underline-offset-8' : ''}">
                Leaderboard
              </button>
              <button type="button" data-nav="admin" class="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${this.vistaActual === 'admin' ? 'text-amber-400 underline underline-offset-8' : ''}">
                Admin
              </button>
            </nav>

            <div class="hidden sm:flex items-center shrink-0">
              <button type="button" id="btn-header-cta" class="campus-btn campus-btn-primary">
                ${textoBotonPrincipal}
              </button>
            </div>
          </div>
        </header>

        <main class="flex-1">
          ${this.renderizarVistaActiva()}
        </main>
      </div>
    `;

    // Hidratar estado hacia el subcomponente activo
    const vistaRegistro = this.querySelector('#view-register');
    if (vistaRegistro) {
      vistaRegistro.jugadorActual = this.jugadorActual;
    }

    const vistaMazo = this.querySelector('#view-deck');
    if (vistaMazo) {
      vistaMazo.jugadorActual = this.jugadorActual;
    }

    const vistaBatalla = this.querySelector('#view-battle');
    if (vistaBatalla && this.batallaPendiente) {
      vistaBatalla.configurarPartida({
        player: this.jugadorActual,
        playerDeck: this.batallaPendiente.playerDeck,
        cpuDeck: this.batallaPendiente.cpuDeck,
      });
    }
  }

  configurarEventos() {
    this.querySelector('#brand-home')?.addEventListener('click', (evento) => {
      evento.preventDefault();
      this.navegarA('register');
    });

    this.querySelector('#btn-header-cta')?.addEventListener('click', () => {
      this.navegarA(this.jugadorActual ? 'deck' : 'register');
    });

    this.querySelectorAll('[data-nav]').forEach((boton) => {
      boton.addEventListener('click', () => {
        this.navegarA(boton.getAttribute('data-nav'));
      });
    });

    if (this._eventosRaizVinculados) return;
    this._eventosRaizVinculados = true;

    this.addEventListener('navigate', (evento) => {
      if (evento.detail?.view) {
        this.navegarA(evento.detail.view);
      }
    });

    this.addEventListener('player-ready', (evento) => {
      this.jugadorActual = evento.detail.player;
      this.guardarSesion('cba_player', this.jugadorActual);
      this.navegarA('deck');
    });

    this.addEventListener('player-updated', (evento) => {
      this.jugadorActual = evento.detail.player;
      this.guardarSesion('cba_player', this.jugadorActual);
    });

    this.addEventListener('start-battle', (evento) => {
      this.batallaPendiente = {
        playerDeck: evento.detail.playerDeck,
        cpuDeck: evento.detail.cpuDeck,
      };
      this.vistaActual = 'battle';
      this.render();
      this.configurarEventos();
    });

    this.addEventListener('admin-authenticated', (evento) => {
      this.administradorActual = evento.detail.admin;
      this.guardarSesion('cba_admin', this.administradorActual);
      this.render();
      this.configurarEventos();
    });

    this.addEventListener('admin-logout', () => {
      this.administradorActual = null;
      this.guardarSesion('cba_admin', null);
      this.render();
      this.configurarEventos();
    });
  }
}

customElements.define('card-game-app', GameApp);
