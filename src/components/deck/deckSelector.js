import { apiCartas } from '../../api/cardsApi.js';
import { CATEGORIAS_CARTA, validarSeleccionMazo } from '../../utils/validators.js';
import { crearMazoMaquina } from '../../utils/battleEngine.js';
import { elegirElementosAleatorios } from '../../utils/random.js';
import { crearUrlSvgAlternativa, obtenerTemaCategoria } from '../../utils/cardAvatar.js';
import { motorAudio } from '../../utils/soundEngine.js';

export class DeckSelector extends HTMLElement {
  constructor() {
    super();
    this.cartasActivas = [];
    this.mazoSeleccionado = [];
    this.categoriaSeleccionada = 'Todos';
    this.cargando = true;
    this.mensajeError = '';
    this.errorValidacion = '';
    this.jugador = null;
  }

  set jugadorActual(jugador) {
    this.jugador = jugador;
    if (this.isConnected) {
      this.render();
      this.configurarEventos();
    }
  }

  connectedCallback() {
    this.cargarCartasActivas();
  }

  async cargarCartasActivas() {
    this.cargando = true;
    this.mensajeError = '';
    this.render();

    try {
      const cartas = await apiCartas.obtenerActivas();
      this.cartasActivas = Array.isArray(cartas) ? cartas.filter((carta) => carta.active !== false) : [];
      // Limpiar selección si alguna carta dejó de estar activa
      const identificadoresActivos = new Set(this.cartasActivas.map((carta) => carta.id));
      this.mazoSeleccionado = this.mazoSeleccionado.filter((carta) => identificadoresActivos.has(carta.id));
    } catch (errorCapturado) {
      this.mensajeError = errorCapturado.message || 'Error cargando las cartas activas.';
    } finally {
      this.cargando = false;
      this.render();
      this.configurarEventos();
    }
  }

  alternarSeleccionCarta(idCarta) {
    this.errorValidacion = '';
    const indiceExistente = this.mazoSeleccionado.findIndex((carta) => carta.id === idCarta);

    if (indiceExistente !== -1) {
      this.mazoSeleccionado.splice(indiceExistente, 1);
      motorAudio.reproducirClic();
    } else {
      if (this.mazoSeleccionado.length >= 5) {
        this.errorValidacion = 'Tu mazo ya tiene 5 cartas. Quita una antes de agregar otra.';
        this.render();
        this.configurarEventos();
        return;
      }
      const carta = this.cartasActivas.find((elemento) => elemento.id === idCarta);
      if (carta) {
        this.mazoSeleccionado.push(carta);
        motorAudio.reproducirClic();
      }
    }

    this.render();
    this.configurarEventos();
  }

  moverCartaMazo(indice, desplazamiento) {
    const destino = indice + desplazamiento;
    if (destino < 0 || destino >= this.mazoSeleccionado.length) return;
    const copia = [...this.mazoSeleccionado];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    this.mazoSeleccionado = copia;
    motorAudio.reproducirClic();
    this.render();
    this.configurarEventos();
  }

  completarMazoAleatorio() {
    if (this.cartasActivas.length < 5) return;
    this.mazoSeleccionado = elegirElementosAleatorios(this.cartasActivas, 5);
    this.errorValidacion = '';
    motorAudio.reproducirClic();
    this.render();
    this.configurarEventos();
  }

  iniciarPartida() {
    const validacion = validarSeleccionMazo(this.mazoSeleccionado, this.cartasActivas.length);
    if (!validacion.valid) {
      this.errorValidacion = validacion.message;
      this.render();
      this.configurarEventos();
      return;
    }

    const mazoMaquina = crearMazoMaquina(this.cartasActivas, this.mazoSeleccionado);
    motorAudio.reproducirDefensa();

    this.dispatchEvent(
      new CustomEvent('start-battle', {
        detail: {
          playerDeck: structuredClone(this.mazoSeleccionado),
          cpuDeck: structuredClone(mazoMaquina),
        },
        bubbles: true,
      })
    );
  }

  render() {
    if (this.cargando) {
      this.innerHTML = `
        <section class="deck-page">
          <div class="campus-surface p-8 text-center text-slate-300">
            Cargando catálogo de cartas activas de Campuslands...
          </div>
        </section>
      `;
      return;
    }

    if (this.mensajeError) {
      this.innerHTML = `
        <section class="deck-page">
          <div class="campus-surface p-6 text-center">
            <p class="text-red-300">${this.escaparHtml(this.mensajeError)}</p>
            <button type="button" id="btn-retry-deck" class="campus-btn campus-btn-primary mt-4">Reintentar</button>
          </div>
        </section>
      `;
      return;
    }

    const cartasFiltradas =
      this.categoriaSeleccionada === 'Todos'
        ? this.cartasActivas
        : this.cartasActivas.filter((carta) => carta.type === this.categoriaSeleccionada);

    const identificadoresSeleccionados = new Map(this.mazoSeleccionado.map((carta, indice) => [carta.id, indice + 1]));
    const poolSuficiente = this.cartasActivas.length >= 10;

    const pestanasFiltro = ['Todos', ...CATEGORIAS_CARTA]
      .map(
        (categoria) => `
      <button
        type="button"
        class="deck-filter-btn ${this.categoriaSeleccionada === categoria ? 'is-active' : ''}"
        data-category="${this.escaparHtml(categoria)}"
      >
        ${this.escaparHtml(categoria === 'Personal de Apoyo (Cajasan & Campus)' ? 'Personal de Apoyo' : categoria === 'Estudiantes / Leyendas de Campus' ? 'Leyendas de Campus' : categoria)}
      </button>
    `
      )
      .join('');

    const elementosCarta = cartasFiltradas
      .map((carta) => {
        const numeroOrden = identificadoresSeleccionados.get(carta.id);
        const estaSeleccionada = numeroOrden !== undefined;
        const tema = obtenerTemaCategoria(carta.type);
        const urlAlternativa = crearUrlSvgAlternativa(carta);
        const danoMaximoAtaque = Math.max(...carta.attacks.map((ataque) => ataque.baseDamage));

        return `
        <button
          type="button"
          class="deck-card-item ${estaSeleccionada ? 'is-selected' : ''}"
          data-card-id="${this.escaparHtml(carta.id)}"
        >
          <img
            src="${this.escaparHtml(carta.image)}"
            alt="${this.escaparHtml(carta.name)}"
            class="deck-card-art"
            referrerpolicy="no-referrer"
            onerror="this.onerror=null;this.src='${urlAlternativa}'"
          />
          <div class="p-3.5 flex flex-col flex-1 justify-between w-full">
            <div>
              <div class="text-xs text-slate-400">
                ${this.escaparHtml(tema.shortLabel)} · <span class="font-mono-num text-amber-400">${carta.hp} HP</span>
              </div>
              <div class="text-base font-bold text-white mt-0.5 leading-snug">${this.escaparHtml(carta.name)}</div>
              <p class="text-xs text-slate-300 mt-1 line-clamp-2">${this.escaparHtml(carta.description)}</p>
            </div>
            <div class="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
              <span class="text-slate-300 font-mono-num">Atq máx ${danoMaximoAtaque} · Esp ${carta.special.baseDamage}</span>
              <span class="font-semibold ${estaSeleccionada ? 'text-amber-400' : 'text-sky-300'}">
                ${estaSeleccionada ? `Orden #${numeroOrden}` : 'Seleccionar'}
              </span>
            </div>
          </div>
        </button>
      `;
      })
      .join('');

    const espaciosMazo = [0, 1, 2, 3, 4]
      .map((indice) => {
        const carta = this.mazoSeleccionado[indice];
        if (!carta) {
          return `
          <div class="deck-slot-row">
            <span class="text-xs text-slate-500 font-mono-num">${indice + 1}.º Combate — Vacío</span>
          </div>
        `;
        }
        return `
        <div class="deck-slot-row">
          <div class="min-w-0 flex-1">
            <div class="text-xs font-mono-num text-amber-400">Posición #${indice + 1}</div>
            <div class="text-sm font-semibold text-white truncate">${this.escaparHtml(carta.name)}</div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" class="deck-order-btn" data-move-up="${indice}" ${indice === 0 ? 'disabled' : ''} title="Subir orden">↑</button>
            <button type="button" class="deck-order-btn" data-move-down="${indice}" ${indice === this.mazoSeleccionado.length - 1 ? 'disabled' : ''} title="Bajar orden">↓</button>
            <button type="button" class="deck-order-btn text-rose-300" data-remove-idx="${indice}" title="Quitar del mazo">×</button>
          </div>
        </div>
      `;
      })
      .join('');

    this.innerHTML = `
      <section class="deck-page">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl sm:text-3xl font-bold text-white">Selección de Mazo</h2>
            <p class="text-sm text-slate-300 mt-1">
              Jugador: <strong class="text-amber-400">${this.escaparHtml(this.jugador?.nickname || 'Retador')}</strong> · Elige exactamente 5 cartas diferentes y define su orden de salida.
            </p>
          </div>
          <div class="text-xs text-slate-300 font-mono-num">
            Pool activo: ${this.cartasActivas.length} cartas (mínimo 10 requeridas)
          </div>
        </div>

        ${
          !poolSuficiente
            ? `<div class="auth-feedback auth-feedback-error mt-4">No hay suficientes cartas activas (${this.cartasActivas.length}/10). Activa más cartas desde el Panel Admin.</div>`
            : ''
        }

        <div class="deck-layout">
          <div>
            <div class="deck-filters" role="tablist" aria-label="Filtrar por categoría">
              ${pestanasFiltro}
            </div>
            <div class="deck-cards-grid">
              ${elementosCarta}
            </div>
          </div>

          <aside class="deck-sidebar">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h3 class="text-lg font-bold text-white">Tu Mazo</h3>
              <span class="font-mono-num text-sm font-bold text-amber-400">${this.mazoSeleccionado.length}/5</span>
            </div>

            <div class="flex flex-col gap-2">
              ${espaciosMazo}
            </div>

            ${
              this.errorValidacion
                ? `<div class="auth-feedback auth-feedback-error mt-3">${this.escaparHtml(this.errorValidacion)}</div>`
                : ''
            }

            <div class="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                id="btn-start-battle"
                class="campus-btn campus-btn-primary w-full"
                ${this.mazoSeleccionado.length !== 5 || !poolSuficiente ? 'disabled' : ''}
              >
                Iniciar Batalla 1v1
              </button>
              <button
                type="button"
                id="btn-autofill-deck"
                class="campus-btn campus-btn-secondary w-full"
                ${this.cartasActivas.length < 5 ? 'disabled' : ''}
              >
                Completar Mazo al Azar
              </button>
            </div>
          </aside>
        </div>
      </section>
    `;
  }

  configurarEventos() {
    this.querySelector('#btn-retry-deck')?.addEventListener('click', () => this.cargarCartasActivas());
    this.querySelector('#btn-autofill-deck')?.addEventListener('click', () => this.completarMazoAleatorio());
    this.querySelector('#btn-start-battle')?.addEventListener('click', () => this.iniciarPartida());

    this.querySelectorAll('[data-category]').forEach((boton) => {
      boton.addEventListener('click', () => {
        this.categoriaSeleccionada = boton.getAttribute('data-category');
        motorAudio.reproducirClic();
        this.render();
        this.configurarEventos();
      });
    });

    this.querySelectorAll('[data-card-id]').forEach((cardBtn) => {
      cardBtn.addEventListener('click', () => {
        this.alternarSeleccionCarta(cardBtn.getAttribute('data-card-id'));
      });
    });

    this.querySelectorAll('[data-move-up]').forEach((boton) => {
      boton.addEventListener('click', () => {
        this.moverCartaMazo(Number(boton.getAttribute('data-move-up')), -1);
      });
    });

    this.querySelectorAll('[data-move-down]').forEach((boton) => {
      boton.addEventListener('click', () => {
        this.moverCartaMazo(Number(boton.getAttribute('data-move-down')), 1);
      });
    });

    this.querySelectorAll('[data-remove-idx]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const indice = Number(boton.getAttribute('data-remove-idx'));
        this.mazoSeleccionado.splice(indice, 1);
        motorAudio.reproducirClic();
        this.render();
        this.configurarEventos();
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

customElements.define('deck-selector', DeckSelector);
