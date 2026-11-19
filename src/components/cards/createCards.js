import { apiCartas } from '../../api/cardsApi.js';
import { CATEGORIAS_CARTA, validarFormularioCarta } from '../../utils/validators.js';
import { motorAudio } from '../../utils/soundEngine.js';

export class CreateCardModal extends HTMLElement {
  constructor() {
    super();
    this.estaAbierto = false;
    this.guardando = false;
    this.mensajeError = '';
  }

  abrir() {
    this.estaAbierto = true;
    this.mensajeError = '';
    this.render();
    this.configurarEventos();
  }

  cerrar() {
    this.estaAbierto = false;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  async enviarFormulario(elementoFormulario) {
    const datosFormulario = new FormData(elementoFormulario);
    const datosCarta = {
      name: String(datosFormulario.get('name') || '').trim(),
      type: String(datosFormulario.get('type') || CATEGORIAS_CARTA[0]),
      image: String(datosFormulario.get('image') || '/public/images/cards/mr-fernando.svg').trim(),
      description: String(datosFormulario.get('description') || '').trim(),
      hp: Number(datosFormulario.get('hp') || 250),
      attacks: [
        { id: 'atk-1', name: String(datosFormulario.get('atk1Name') || '').trim(), baseDamage: Number(datosFormulario.get('atk1Dmg') || 20), description: 'Ataque básico' },
        { id: 'atk-2', name: String(datosFormulario.get('atk2Name') || '').trim(), baseDamage: Number(datosFormulario.get('atk2Dmg') || 30), description: 'Ataque medio' },
        { id: 'atk-3', name: String(datosFormulario.get('atk3Name') || '').trim(), baseDamage: Number(datosFormulario.get('atk3Dmg') || 40), description: 'Ataque fuerte' },
        { id: 'atk-4', name: String(datosFormulario.get('atk4Name') || '').trim(), baseDamage: Number(datosFormulario.get('atk4Dmg') || 50), description: 'Ataque definitivo' },
      ],
      defense: {
        name: String(datosFormulario.get('defenseName') || '').trim(),
        damageReduction: 0.5,
        description: 'Reduce el 50% del próximo ataque recibido.',
      },
      special: {
        name: String(datosFormulario.get('specialName') || '').trim(),
        baseDamage: Number(datosFormulario.get('specialDmg') || 65),
        unlockTurn: 2,
        cooldown: 3,
        description: String(datosFormulario.get('specialDesc') || 'Poder especial de Campuslands.'),
      },
      sounds: {
        attack: '/public/sounds/attack.mp3',
        defense: '/public/sounds/defense.mp3',
        special: '/public/sounds/special.mp3',
        hit: '/public/sounds/hit.mp3',
      },
      active: true,
      createdAt: new Date().toISOString(),
    };

    const validacion = validarFormularioCarta(datosCarta);
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
      const cartaCreada = await apiCartas.crear(datosCarta);
      motorAudio.reproducirDefensa();
      this.guardando = false;
      this.estaAbierto = false;
      this.render();
      this.dispatchEvent(new CustomEvent('card-saved', { detail: { card: cartaCreada }, bubbles: true }));
    } catch (errorCapturado) {
      this.guardando = false;
      this.mensajeError = errorCapturado.message || 'No se pudo crear la carta.';
      this.render();
      this.configurarEventos();
    }
  }

  render() {
    if (!this.estaAbierto) {
      this.innerHTML = '';
      return;
    }

    const opcionesCategoria = CATEGORIAS_CARTA.map(
      (categoria) => `<option value="${this.escaparHtml(categoria)}">${this.escaparHtml(categoria)}</option>`
    ).join('');

    this.innerHTML = `
      <div class="crud-modal-backdrop" role="dialog" aria-modal="true" aria-label="Crear nueva carta">
        <div class="crud-modal-panel">
          <div class="flex items-center justify-between gap-4 mb-4">
            <div>
              <div class="text-xs font-medium text-amber-400">Método HTTP POST</div>
              <h3 class="text-xl font-bold text-white">Crear Nueva Carta</h3>
            </div>
            <button type="button" id="btn-close-create" class="campus-btn campus-btn-secondary">Cerrar</button>
          </div>

          <form id="create-card-form" novalidate>
            <div class="crud-form-grid">
              <div>
                <label class="block text-xs text-slate-300 mb-1">Nombre</label>
                <input name="name" type="text" class="campus-input" placeholder="Ej. Mentor DevOps" required />
              </div>
              <div>
                <label class="block text-xs text-slate-300 mb-1">Categoría</label>
                <select name="type" class="campus-input">${opcionesCategoria}</select>
              </div>
              <div>
                <label class="block text-xs text-slate-300 mb-1">HP Base</label>
                <input name="hp" type="number" class="campus-input" value="250" min="100" max="500" />
              </div>
              <div>
                <label class="block text-xs text-slate-300 mb-1">Ruta Imagen</label>
                <input name="image" type="text" class="campus-input" value="/public/images/cards/senor-gemini.svg" />
              </div>
            </div>

            <div class="mt-3">
              <label class="block text-xs text-slate-300 mb-1">Descripción</label>
              <textarea name="description" rows="2" class="campus-input" placeholder="Rol y estilo en Campuslands..."></textarea>
            </div>

            <div class="mt-4 text-xs font-semibold text-amber-400">4 Ataques Normales</div>
            <div class="crud-form-grid mt-2">
              <div class="flex gap-2">
                <input name="atk1Name" type="text" class="campus-input" placeholder="Ataque 1" value="Golpe Inicial" />
                <input name="atk1Dmg" type="number" class="campus-input w-24" value="20" min="10" max="80" />
              </div>
              <div class="flex gap-2">
                <input name="atk2Name" type="text" class="campus-input" placeholder="Ataque 2" value="Compilación Rápida" />
                <input name="atk2Dmg" type="number" class="campus-input w-24" value="30" min="10" max="80" />
              </div>
              <div class="flex gap-2">
                <input name="atk3Name" type="text" class="campus-input" placeholder="Ataque 3" value="Despliegue Firme" />
                <input name="atk3Dmg" type="number" class="campus-input w-24" value="40" min="10" max="80" />
              </div>
              <div class="flex gap-2">
                <input name="atk4Name" type="text" class="campus-input" placeholder="Ataque 4" value="Impacto Final" />
                <input name="atk4Dmg" type="number" class="campus-input w-24" value="50" min="10" max="80" />
              </div>
            </div>

            <div class="crud-form-grid mt-4">
              <div>
                <label class="block text-xs text-slate-300 mb-1">Defensa (-50%)</label>
                <input name="defenseName" type="text" class="campus-input" value="Escudo Campus" />
              </div>
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-xs text-slate-300 mb-1">Poder Especial (T2+, CD 3)</label>
                  <input name="specialName" type="text" class="campus-input" value="Sobrecarga Maestra" />
                </div>
                <div class="w-24">
                  <label class="block text-xs text-slate-300 mb-1">Daño Esp.</label>
                  <input name="specialDmg" type="number" class="campus-input" value="65" min="50" max="90" />
                </div>
              </div>
            </div>

            ${
              this.mensajeError
                ? `<div class="auth-feedback auth-feedback-error mt-3">${this.escaparHtml(this.mensajeError)}</div>`
                : ''
            }

            <div class="mt-5 flex justify-end gap-2.5">
              <button type="button" id="btn-cancel-create" class="campus-btn campus-btn-secondary">Cancelar</button>
              <button type="submit" class="campus-btn campus-btn-primary" ${this.guardando ? 'disabled' : ''}>
                ${this.guardando ? 'Guardando...' : 'Guardar Carta (POST)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  configurarEventos() {
    this.querySelector('#btn-close-create')?.addEventListener('click', () => this.cerrar());
    this.querySelector('#btn-cancel-create')?.addEventListener('click', () => this.cerrar());
    this.querySelector('#create-card-form')?.addEventListener('submit', (evento) => {
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

customElements.define('create-card-modal', CreateCardModal);
