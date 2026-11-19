import './createCards.js';
import './editCards.js';
import './deleteCards.js';
import { apiCartas } from '../../api/cardsApi.js';
import { crearUrlSvgAlternativa, obtenerTemaCategoria } from '../../utils/cardAvatar.js';
import { motorAudio } from '../../utils/soundEngine.js';

export class CardsManager extends HTMLElement {
  constructor() {
    super();
    this.cartas = [];
    this.cargando = true;
    this.mensajeError = '';
    this.mensajeEstado = '';
  }

  connectedCallback() {
    this.cargarCartas();
  }

  async cargarCartas() {
    this.cargando = true;
    this.mensajeError = '';
    this.render();

    try {
      const datos = await apiCartas.obtenerTodas();
      this.cartas = Array.isArray(datos) ? datos : [];
    } catch (errorCapturado) {
      this.mensajeError = errorCapturado.message || 'Error al cargar cartas.';
    } finally {
      this.cargando = false;
      this.render();
      this.configurarEventos();
    }
  }

  // PATCH: alterna solo la propiedad `active` sin reenviar ataques ni metadatos
  async alternarCartaActiva(carta) {
    try {
      const siguienteEstado = carta.active === false;
      await apiCartas.actualizarParcial(carta.id, { active: siguienteEstado });
      motorAudio.reproducirClic();
      this.mensajeEstado = `PATCH aplicado a "${carta.name}": estado ${siguienteEstado ? 'Activo' : 'Inactivo'}.`;
      await this.cargarCartas();
    } catch (errorCapturado) {
      this.mensajeError = errorCapturado.message || 'Error ejecutando PATCH.';
      this.render();
      this.configurarEventos();
    }
  }

  render() {
    if (this.cargando) {
      this.innerHTML = `
        <section class="cards-admin-wrap">
          <div class="campus-surface p-8 text-center text-slate-300">Cargando inventario de cartas...</div>
        </section>
      `;
      return;
    }

    const cantidadActivas = this.cartas.filter((carta) => carta.active !== false).length;

    const contenidoCartas = this.cartas
      .map((carta) => {
        const estaActiva = carta.active !== false;
        const tema = obtenerTemaCategoria(carta.type);
        const urlAlternativa = crearUrlSvgAlternativa(carta);

        return `
        <article class="admin-card-tile ${estaActiva ? '' : 'is-inactive'}">
          <div>
            <img
              src="${this.escaparHtml(carta.image)}"
              alt="${this.escaparHtml(carta.name)}"
              class="admin-card-thumb"
              referrerpolicy="no-referrer"
              onerror="this.onerror=null;this.src='${urlAlternativa}'"
            />
            <div class="p-4">
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="text-slate-400">${this.escaparHtml(tema.shortLabel)}</span>
                <span class="font-semibold ${estaActiva ? 'text-emerald-400' : 'text-rose-300'}">
                  ${estaActiva ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <h3 class="text-base font-bold text-white mt-1">${this.escaparHtml(carta.name)}</h3>
              <p class="text-xs text-slate-300 mt-1 line-clamp-2">${this.escaparHtml(carta.description)}</p>
              <div class="mt-2.5 text-xs font-mono-num text-slate-400">
                ${carta.hp} HP · Esp: ${this.escaparHtml(carta.special?.name)} (${carta.special?.baseDamage})
              </div>
            </div>
          </div>

          <div class="p-3 pt-0 flex flex-wrap gap-2">
            <button type="button" class="campus-btn campus-btn-secondary flex-1" data-patch-id="${this.escaparHtml(carta.id)}">
              ${estaActiva ? 'Desactivar (PATCH)' : 'Activar (PATCH)'}
            </button>
            <button type="button" class="campus-btn campus-btn-secondary" data-edit-id="${this.escaparHtml(carta.id)}">
              Editar (PUT)
            </button>
            <button type="button" class="campus-btn campus-btn-danger" data-delete-id="${this.escaparHtml(carta.id)}">
              Eliminar
            </button>
          </div>
        </article>
      `;
      })
      .join('');

    this.innerHTML = `
      <section class="cards-admin-wrap">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl sm:text-3xl font-bold text-white">Administración de Cartas</h2>
            <p class="text-sm text-slate-300 mt-1 font-mono-num">
              Total: ${this.cartas.length} cartas · Activas para combate: ${cantidadActivas} (mínimo 10)
            </p>
          </div>

          <div class="flex flex-wrap gap-2.5">
            <button type="button" id="btn-open-create" class="campus-btn campus-btn-primary">
              + Nueva Carta (POST)
            </button>
            <button type="button" id="btn-admin-logout" class="campus-btn campus-btn-secondary">
              Cerrar Sesión Admin
            </button>
          </div>
        </div>

        ${
          this.mensajeEstado
            ? `<div class="auth-feedback auth-feedback-info mt-4">${this.escaparHtml(this.mensajeEstado)}</div>`
            : ''
        }
        ${
          this.mensajeError
            ? `<div class="auth-feedback auth-feedback-error mt-4">${this.escaparHtml(this.mensajeError)}</div>`
            : ''
        }

        <div class="cards-admin-grid">${contenidoCartas}</div>

        <create-card-modal id="create-modal"></create-card-modal>
        <edit-card-modal id="edit-modal"></edit-card-modal>
        <delete-card-modal id="delete-modal"></delete-card-modal>
      </section>
    `;
  }

  configurarEventos() {
    this.querySelector('#btn-open-create')?.addEventListener('click', () => {
      this.querySelector('#create-modal')?.abrir();
    });

    this.querySelector('#btn-admin-logout')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('admin-logout', { bubbles: true }));
    });

    this.querySelectorAll('[data-patch-id]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const carta = this.cartas.find((elemento) => elemento.id === boton.getAttribute('data-patch-id'));
        if (carta) this.alternarCartaActiva(carta);
      });
    });

    this.querySelectorAll('[data-edit-id]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const carta = this.cartas.find((elemento) => elemento.id === boton.getAttribute('data-edit-id'));
        if (carta) this.querySelector('#edit-modal')?.abrir(carta);
      });
    });

    this.querySelectorAll('[data-delete-id]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const carta = this.cartas.find((elemento) => elemento.id === boton.getAttribute('data-delete-id'));
        if (carta) this.querySelector('#delete-modal')?.abrir(carta);
      });
    });

    if (this._hostEventsBound) return;
    this._hostEventsBound = true;

    this.addEventListener('card-saved', () => {
      this.mensajeEstado = 'Catálogo actualizado y sincronizado con db.json.';
      this.cargarCartas();
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

customElements.define('cards-manager', CardsManager);
