import { apiCartas } from '../../api/cardsApi.js';
import { motorAudio } from '../../utils/soundEngine.js';

export class DeleteCardModal extends HTMLElement {
  constructor() {
    super();
    this.carta = null;
    this.eliminando = false;
    this.mensajeError = '';
  }

  abrir(carta) {
    this.carta = carta;
    this.mensajeError = '';
    this.render();
    this.configurarEventos();
  }

  cerrar() {
    this.carta = null;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  async confirmarEliminacion() {
    if (!this.carta) return;
    this.eliminando = true;
    this.mensajeError = '';
    this.render();
    this.configurarEventos();

    try {
      await apiCartas.eliminar(this.carta.id);
      motorAudio.reproducirImpacto();
      this.eliminando = false;
      this.carta = null;
      this.render();
      this.dispatchEvent(new CustomEvent('card-saved', { bubbles: true }));
    } catch (errorCapturado) {
      this.eliminando = false;
      this.mensajeError = errorCapturado.message || 'No se pudo eliminar la carta.';
      this.render();
      this.configurarEventos();
    }
  }

  render() {
    if (!this.carta) {
      this.innerHTML = '';
      return;
    }

    this.innerHTML = `
      <div class="crud-modal-backdrop" role="dialog" aria-modal="true" aria-label="Eliminar carta">
        <div class="crud-modal-panel" style="max-width: 460px;">
          <div class="text-xs font-medium text-rose-300">Método HTTP DELETE</div>
          <h3 class="text-xl font-bold text-white mt-1">Eliminar "${this.escaparHtml(this.carta.name)}"</h3>
          <p class="text-sm text-slate-300 mt-2">
            Esta acción eliminará permanentemente la carta del archivo <span class="font-mono-num">db.json</span>. Si solo deseas ocultarla temporalmente del juego, usa el botón de alternar estado (PATCH).
          </p>

          ${
            this.mensajeError
              ? `<div class="auth-feedback auth-feedback-error mt-3">${this.escaparHtml(this.mensajeError)}</div>`
              : ''
          }

          <div class="mt-5 flex justify-end gap-2.5">
            <button type="button" id="btn-cancel-delete" class="campus-btn campus-btn-secondary">Cancelar</button>
            <button type="button" id="btn-confirm-delete" class="campus-btn campus-btn-danger" ${this.eliminando ? 'disabled' : ''}>
              ${this.eliminando ? 'Eliminando...' : 'Eliminar (DELETE)'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  configurarEventos() {
    this.querySelector('#btn-cancel-delete')?.addEventListener('click', () => this.cerrar());
    this.querySelector('#btn-confirm-delete')?.addEventListener('click', () => this.confirmarEliminacion());
  }

  escaparHtml(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('delete-card-modal', DeleteCardModal);
