export class BattleControls extends HTMLElement {
  constructor() {
    super();
    this._estadoControles = null;
  }

  set estadoControles(datos) {
    this._estadoControles = datos;
    if (this.isConnected) {
      this.render();
      this.configurarEventos();
    }
  }

  connectedCallback() {
    this.render();
    this.configurarEventos();
  }

  render() {
    if (!this._estadoControles || !this._estadoControles.unit) {
      this.innerHTML = '';
      return;
    }

    const {
      unit: unidad,
      disabled: deshabilitado,
      specialStatus: estadoEspecial,
      isPlayerTurn: esTurnoJugador,
      automaticMode: modoAutomatico, // resiviendo el valor. 
    } = this._estadoControles;
    const carta =unidad.card;

    const botonesAtaque = carta.attacks
      .map(
        (ataque, indice) => `
      <button
        type="button"
        class="action-btn"
        data-action="attack"
        data-attack-index="${indice}"
        ${deshabilitado ? 'disabled' : ''}
      >
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate">${this.escaparHtml(ataque.name)}</div>
          <div class="text-xs text-slate-400">Ataque ${indice + 1} · Tecla ${indice + 1}</div>
        </div>
        <span class="font-mono-num text-xs font-bold text-amber-400 shrink-0">${ataque.baseDamage} base</span>
      </button>
    `
      )
      .join('');

    const especialDeshabilitado = deshabilitado || !estadoEspecial.available;
    const etiquetaEspecial = estadoEspecial.available
      ? `${carta.special.baseDamage} base · Listo`
      : estadoEspecial.lockedTurnOne
      ? 'Bloqueado T1'
      : `CD: ${estadoEspecial.cooldownRemaining}`;

    this.innerHTML = `
      <div>
        <div class="flex items-center justify-between text-xs text-slate-300 mt-1">
          <span>${
            modoAutomatico     // esto es lo que nos permite mostrar el mensaje de modo automatico.
              ? 'Modo automático: ambos participantes eligen sus acciones'
              : esTurnoJugador
              ? 'Tu turno: elige una acción de combate'
              : 'Turno de Máquina en proceso...'
          }</span>
          <span class="font-mono-num text-slate-400">±15% daño aleatorio</span>
        </div>

        <div class="battle-controls-grid">
          ${botonesAtaque}

          <button
            type="button"
            class="action-btn action-btn-defense"
            data-action="defense"
            ${deshabilitado ? 'disabled' : ''}
          >
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">${this.escaparHtml(carta.defense?.name || 'Defensa')}</div>
              <div class="text-xs text-sky-300">Defensa · Tecla D</div>
            </div>
            <span class="font-mono-num text-xs font-bold text-sky-300 shrink-0">-50% daño</span>
          </button>

          <button
            type="button"
            class="action-btn action-btn-special"
            data-action="special"
            ${especialDeshabilitado ? 'disabled' : ''}
          >
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">${this.escaparHtml(carta.special?.name || 'Poder Especial')}</div>
              <div class="text-xs text-amber-300">Especial · Tecla S</div>
            </div>
            <span class="font-mono-num text-xs font-bold text-amber-400 shrink-0">${etiquetaEspecial}</span>
          </button>
        </div>
      </div>
    `;
  }

  configurarEventos() {
    this.querySelectorAll('[data-action]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const tipoAccion = boton.getAttribute('data-action');
        const indiceAtaque = boton.getAttribute('data-attack-index');
        this.dispatchEvent(
          new CustomEvent('player-action', {
            detail: {
              type: tipoAccion,
              attackIndex: indiceAtaque !== null ? Number(indiceAtaque) : undefined,
            },
            bubbles: true,
          })
        );
      });
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

customElements.define('battle-controls', BattleControls);
