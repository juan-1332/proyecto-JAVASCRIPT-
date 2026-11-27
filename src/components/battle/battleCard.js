import { crearUrlSvgAlternativa, obtenerTemaCategoria } from '../../utils/cardAvatar.js';

export class BattleCard extends HTMLElement {
  constructor() {
    super();
    this.estadoDatos = null;
  }

  set estadoCarta(datos) {
    this.estadoDatos = datos;
    if (this.isConnected) {
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  reproducirAnimacion(claseAnimacion) {
    const contenedor = this.querySelector('.battle-card-box');
    if (!contenedor || !claseAnimacion) return;
    contenedor.classList.remove(
      'anim-attack-up',
      'anim-attack-down',
      'anim-hit',
      'anim-defend',
      'anim-special',
      'anim-dodge',
      'anim-critical-hit',
      'anim-ko',
      'anim-enter'
    );
    void contenedor.offsetWidth;
    contenedor.classList.add(claseAnimacion);
  }

  render() {
    if (!this.estadoDatos || !this.estadoDatos.unit) {
      this.innerHTML = '';
      return;
    }

    const {
      sideLabel: etiquetaLado,
      ownerName: nombrePropietario,
      unit: unidad,
      units: unidades,
      activeIndex: indiceActivo,
      specialStatus: estadoEspecial,
    } = this.estadoDatos;
    const carta = unidad.card;
    const porcentajeVida = Math.max(0, Math.min(100, Math.round((unidad.currentHp / unidad.maxHp) * 100)));
    const colorVida =
      porcentajeVida > 55 ? '#10b981' : porcentajeVida > 25 ? '#f59e0b' : '#ef4444';
    const tema = obtenerTemaCategoria(carta.type);
    const urlAlternativa = crearUrlSvgAlternativa(carta);

    const indicadoresMazo = unidades
      .map((unidadMazo, indice) => {
        const clase = unidadMazo.defeated ? 'is-ko' : indice === indiceActivo ? 'is-active' : '';
        return `<span class="deck-pip ${clase}" title="${this.escaparHtml(unidadMazo.card.name)}"></span>`;
      })
      .join('');

    const resumenEspecial = estadoEspecial.available
      ? 'Especial Listo'
      : estadoEspecial.lockedTurnOne
      ? 'Especial: Bloqueado Turno 1'
      : `Especial Cooldown: ${estadoEspecial.cooldownRemaining} ${estadoEspecial.cooldownRemaining === 1 ? 'turno' : 'turnos'}`;

    this.innerHTML = `
      <article class="battle-card-box ${unidad.defending ? 'is-defending' : ''}">
        <div>
          <img
            src="${this.escaparHtml(carta.image)}"
            alt="${this.escaparHtml(carta.name)}"
            class="battle-card-img"
            referrerpolicy="no-referrer"
            onerror="this.onerror=null;this.src='${urlAlternativa}'"
          />
          <div class="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Mazo ${indiceActivo + 1}/5</span>
            <div class="deck-pips">${indicadoresMazo}</div>
          </div>
        </div>

        <div class="flex flex-col justify-between min-w-0">
          <div>
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span class="text-amber-400 font-semibold">${this.escaparHtml(etiquetaLado)} · ${this.escaparHtml(nombrePropietario)}</span>
              <span class="text-slate-400">${this.escaparHtml(tema.shortLabel)}</span>
            </div>

            <h3 class="text-lg sm:text-xl font-bold text-white mt-0.5 truncate">${this.escaparHtml(carta.name)}</h3>
            <p class="text-xs text-slate-300 mt-0.5 line-clamp-2">${this.escaparHtml(carta.description)}</p>
          </div>

          <div class="mt-3">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-slate-300 font-medium">
                ${unidad.defending ? 'Escudo Activo (-50% próximo golpe)' : resumenEspecial}
              </span>
              <span class="font-mono-num font-bold text-white">${unidad.currentHp}/${unidad.maxHp} HP</span>
            </div>
            <div class="hp-track" role="progressbar" aria-valuenow="${unidad.currentHp}" aria-valuemin="0" aria-valuemax="${unidad.maxHp}">
              <div class="hp-fill" style="width: ${porcentajeVida}%; background-color: ${colorVida};"></div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  configurarEventos() {}

  escaparHtml(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('battle-card', BattleCard);
