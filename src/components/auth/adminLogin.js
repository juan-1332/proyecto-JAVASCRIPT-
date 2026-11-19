import { apiAdministradores } from '../../api/adminsApi.js';
import { motorAudio } from '../../utils/soundEngine.js';

export class AdminLogin extends HTMLElement {
  constructor() {
    super();
    this.nombreUsuario = '';
    this.contrasena = '';
    this.cargando = false;
    this.mensajeError = '';
  }

  connectedCallback() {
    this.render();
    this.configurarEventos();
  }

  async iniciarSesion() {
    if (!this.nombreUsuario.trim() || !this.contrasena) {
      this.mensajeError = 'Ingresa usuario y contraseña de administrador.';
      this.render();
      this.configurarEventos();
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.render();
    this.configurarEventos();

    try {
      const administrador = await apiAdministradores.autenticar(this.nombreUsuario, this.contrasena);
      motorAudio.reproducirClic();
      this.cargando = false;
      this.dispatchEvent(
        new CustomEvent('admin-authenticated', {
          detail: { admin: administrador },
          bubbles: true,
        })
      );
    } catch (errorCapturado) {
      this.cargando = false;
      this.mensajeError = errorCapturado.message || 'Acceso denegado.';
      this.render();
      this.configurarEventos();
    }
  }

  render() {
    this.innerHTML = `
      <div class="admin-login-wrap">
        <div class="auth-panel">
          <div class="text-xs font-medium text-amber-400">Gestión del Pool de Cartas</div>
          <h2 class="text-2xl font-bold text-white mt-1">Panel de Administración</h2>
          <p class="text-sm text-slate-300 mt-1 mb-5">
            Inicia sesión para crear, editar (PUT), alternar disponibilidad (PATCH) o eliminar cartas del ecosistema Campuslands.
          </p>

          <form id="admin-login-form" novalidate>
            <div class="mb-4">
              <label for="admin-user" class="block text-sm font-medium text-slate-200 mb-1.5">Usuario</label>
              <input
                id="admin-user"
                type="text"
                class="campus-input"
                placeholder="usuario administrador"
                value="${this.escaparHtml(this.nombreUsuario)}"
                autocomplete="username"
                ${this.cargando ? 'disabled' : ''}
              />
            </div>

            <div class="mb-4">
              <label for="admin-pass" class="block text-sm font-medium text-slate-200 mb-1.5">Contraseña</label>
              <input
                id="admin-pass"
                type="password"
                class="campus-input"
                placeholder="••••••••"
                value="${this.escaparHtml(this.contrasena)}"
                autocomplete="current-password"
                ${this.cargando ? 'disabled' : ''}
              />
            </div>

            ${
              this.mensajeError
                ? `<div class="auth-feedback auth-feedback-error mb-4" role="alert">${this.escaparHtml(this.mensajeError)}</div>`
                : ''
            }

            <button
              type="submit"
              class="campus-btn campus-btn-primary w-full"
              ${this.cargando ? 'disabled' : ''}
            >
              ${this.cargando ? 'Verificando...' : 'Ingresar al Panel CRUD'}
            </button>
          </form>

          <div class="mt-4 pt-4 border-t border-white/10 text-xs text-slate-400">
            Juego creado para su entretenimiento ( menos el de Pipe) <span class="font-mono-num text-slate-200"> by:Juan and Nikol</span>
          </div>
        </div>
      </div>
    `;
  }

  configurarEventos() {
    const formulario = this.querySelector('#admin-login-form');
    const entradaUsuario = this.querySelector('#admin-user');
    const entradaContrasena = this.querySelector('#admin-pass');

    if (entradaUsuario) {
      entradaUsuario.addEventListener('input', (evento) => {
        this.nombreUsuario = evento.target.value;
      });
    }

    if (entradaContrasena) {
      entradaContrasena.addEventListener('input', (evento) => {
        this.contrasena = evento.target.value;
      });
    }

    if (formulario) {
      formulario.addEventListener('submit', (evento) => {
        evento.preventDefault();
        this.iniciarSesion();
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

customElements.define('admin-login', AdminLogin);
