import { apiCartas } from '../../api/cardsApi.js';
import { CATEGORIAS_CARTA, validarFormularioCarta } from '../../utils/validators.js';
import { motorAudio } from '../../utils/soundEngine.js';

export class EditCardModal extends HTMLElement {
  constructor() {
    super();
    this.carta = null;
    this.guardando = false;
    this.mensajeError = '';
  }

  abrir(carta) {
    this.carta = structuredClone(carta);
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

  async enviarFormulario(elementoFormulario) {
    if (!this.carta) return;
    const datosFormulario = new FormData(elementoFormulario);

    // PUT reemplaza el recurso completo conservando id, sounds y createdAt
    const reemplazoCompleto = {
      id: this.carta.id,
      name: String(datosFormulario.get('name') || '').trim(),
      type: String(datosFormulario.get('type') || this.carta.type),
      image: String(datosFormulario.get('image') || this.carta.image).trim(),
      description: String(datosFormulario.get('description') || '').trim(),
      hp: Number(datosFormulario.get('hp') || 250),
      attacks: [0, 1, 2, 3].map((indice) => ({
        id: this.carta.attacks[indice]?.id || `atk-${indice + 1}`,
        name: String(datosFormulario.get(`atk${indice + 1}Name`) || '').trim(),
        baseDamage: Number(datosFormulario.get(`atk${indice + 1}Dmg`) || 20),
        description: this.carta.attacks[indice]?.description || 'Ataque actualizado',
      })),
      defense: {
        name: String(datosFormulario.get('defenseName') || '').trim(),
        damageReduction: 0.5,
        description: this.carta.defense?.description || 'Reduce 50% el próximo ataque recibido.',
      },
      special: {
        name: String(datosFormulario.get('specialName') || '').trim(),
        baseDamage: Number(datosFormulario.get('specialDmg') || 65),
        unlockTurn: 2,
        cooldown: 3,
        description: this.carta.special?.description || 'Poder especial de Campuslands.',
      },
      sounds: this.carta.sounds || {
        attack: '/public/sounds/attack.mp3',
        defense: '/public/sounds/defense.mp3',
        special: '/public/sounds/special.mp3',
        hit: '/public/sounds/hit.mp3',
      },
      active: datosFormulario.get('active') === 'on',
      createdAt: this.carta.createdAt || new Date().toISOString(),
    };

    const validacion = validarFormularioCarta(reemplazoCompleto);
    if (!validacion.valid) {
      this.mensajeError = validacion.message;
      this.render();
      this.configurarEventos();
      return;
    }

    this.guardando = true;
    this.mensajeError = '';
    this.render();
    this.configurarEventos();

    try {
      const cartaActualizada = await apiCartas.reemplazar(this.carta.id, reemplazoCompleto);
      motorAudio.reproducirDefensa();
      this.guardando = false;
      this.carta = null;
      this.render();
      this.dispatchEvent(new CustomEvent('card-saved', { detail: { card: cartaActualizada }, bubbles: true }));
    } catch (errorCapturado) {
      this.guardando = false;
      this.mensajeError = errorCapturado.message || 'No se pudo actualizar la carta.';
      this.render();
      this.configurarEventos();
    }
  }

  render() {
    if (!this.carta) {
      this.innerHTML = '';
      return;
    }

    const carta = this.carta;
    const opcionesCategoria = CATEGORIAS_CARTA.map(
      (categoria) =>
        `<option value="${this.escaparHtml(categoria)}" ${carta.type === categoria ? 'selected' : ''}>${this.escaparHtml(categoria)}</option>`
    ).join('');

    this.innerHTML = `
      <div class="crud-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar carta">
        <div class="crud-modal-panel">
          <div class="flex items-center justify-between gap-4 mb-4">
            <div>
              <div class="text-xs font-medium text-amber-400">Método HTTP PUT (Reemplazo completo)</div>
              <h3 class="text-xl font-bold text-white">Editar Carta: ${this.escaparHtml(carta.name)}</h3>
            </div>
            <button type="button" id="btn-close-edit" class="campus-btn campus-btn-secondary">Cerrar</button>
          </div>

          <form id="edit-card-form" novalidate>
            <div class="crud-form-grid">
              <div>
                <label class="block text-xs text-slate-300 mb-1">Nombre</label>
                <input name="name" type="text" class="campus-input" value="${this.escaparHtml(carta.name)}" required />
              </div>
              <div>
                <label class="block text-xs text-slate-300 mb-1">Categoría</label>
                <select name="type" class="campus-input">${opcionesCategoria}</select>
              </div>
              <div>
                <label class="block text-xs text-slate-300 mb-1">HP Base</label>
                <input name="hp" type="number" class="campus-input" value="${carta.hp}" min="100" max="500" />
              </div>
              <div>
                <label class="block text-xs text-slate-300 mb-1">Ruta Imagen</label>
                <input name="image" type="text" class="campus-input" value="${this.escaparHtml(carta.image)}" />
              </div>
            </div>

            <div class="mt-3">
              <label class="block text-xs text-slate-300 mb-1">Descripción</label>
              <textarea name="description" rows="2" class="campus-input">${this.escaparHtml(carta.description)}</textarea>
            </div>

            <div class="mt-4 text-xs font-semibold text-amber-400">4 Ataques Normales</div>
            <div class="crud-form-grid mt-2">
              ${[0, 1, 2, 3]
                .map(
                  (indice) => `
                <div class="flex gap-2">
                  <input name="atk${indice + 1}Name" type="text" class="campus-input" value="${this.escaparHtml(carta.attacks[indice]?.name || '')}" />
                  <input name="atk${indice + 1}Dmg" type="number" class="campus-input w-24" value="${carta.attacks[indice]?.baseDamage || 20}" min="10" max="80" />
                </div>
              `
                )
                .join('')}
            </div>

            <div class="crud-form-grid mt-4">
              <div>
                <label class="block text-xs text-slate-300 mb-1">Defensa (-50%)</label>
                <input name="defenseName" type="text" class="campus-input" value="${this.escaparHtml(carta.defense?.name || '')}" />
              </div>
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-xs text-slate-300 mb-1">Poder Especial</label>
                  <input name="specialName" type="text" class="campus-input" value="${this.escaparHtml(carta.special?.name || '')}" />
                </div>
                <div class="w-24">
                  <label class="block text-xs text-slate-300 mb-1">Daño Esp.</label>
                  <input name="specialDmg" type="number" class="campus-input" value="${carta.special?.baseDamage || 65}" min="50" max="90" />
                </div>
              </div>
            </div>

            <label class="mt-4 flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
              <input name="active" type="checkbox" ${carta.active !== false ? 'checked' : ''} />
              Carta activa para selección de mazos
            </label>

            ${
              this.mensajeError
                ? `<div class="auth-feedback auth-feedback-error mt-3">${this.escaparHtml(this.mensajeError)}</div>`
                : ''
            }

            <div class="mt-5 flex justify-end gap-2.5">
              <button type="button" id="btn-cancel-edit" class="campus-btn campus-btn-secondary">Cancelar</button>
              <button type="submit" class="campus-btn campus-btn-primary" ${this.guardando ? 'disabled' : ''}>
                ${this.guardando ? 'Actualizando...' : 'Reemplazar Carta (PUT)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  configurarEventos() {
    this.querySelector('#btn-close-edit')?.addEventListener('click', () => this.cerrar());
    this.querySelector('#btn-cancel-edit')?.addEventListener('click', () => this.cerrar());
    this.querySelector('#edit-card-form')?.addEventListener('submit', (evento) => {
      evento.preventDefault();
      this.enviarFormulario(evento.target);
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

customElements.define('edit-card-modal', EditCardModal);
