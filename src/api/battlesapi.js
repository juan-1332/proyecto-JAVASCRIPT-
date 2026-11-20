import { solicitarApi } from './apiconfig.js';

/**
 * Servicio REST para historial de batallas completadas.
 */
export const apiBatallas = {
  async obtenerHistorial() {
    return solicitarApi('/battles?_sort=playedAt&_order=desc');
  },

  async registrarBatalla(resumenBatalla) {
    const registro = {
      id: `battle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...resumenBatalla,
      playedAt: new Date().toISOString(),
    };

    return solicitarApi('/battles', {
      method: 'POST',
      body: JSON.stringify(registro),
    });
  },
};
