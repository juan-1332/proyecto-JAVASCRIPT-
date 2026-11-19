import { solicitarApi } from './apiConfig.js';

/**
 * Servicio REST para jugadores, validación de nickname y actualización parcial de estadísticas.
 */
export const apiJugadores = {
  async obtenerOrdenados() {
    return solicitarApi('/players?_sort=points&_order=desc');
  },

  async buscarPorApodo(apodo) {
    const apodoLimpio = apodo.trim();
    return solicitarApi(`/players?nickname=${encodeURIComponent(apodoLimpio)}`);
  },

  async obtenerPorId(identificador) {
    return solicitarApi(`/players/${encodeURIComponent(identificador)}`);
  },

  async registrar(apodo) {
    const jugadorNuevo = {
      id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nickname: apodo.trim(),
      points: 0,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      createdAt: new Date().toISOString(),
    };

    return solicitarApi('/players', {
      method: 'POST',
      body: JSON.stringify(jugadorNuevo),
    });
  },

  // PATCH: actualiza únicamente puntaje, victorias, derrotas y partidas jugadas
  async actualizarEstadisticas(identificador, cambiosEstadisticas) {
    return solicitarApi(`/players/${encodeURIComponent(identificador)}`, {
      method: 'PATCH',
      body: JSON.stringify(cambiosEstadisticas),
    });
  },
};
