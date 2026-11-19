import { solicitarApi } from './apiConfig.js';

/**
 * Servicio REST completo para gestión de cartas.
 * Implementa GET, POST, PUT (reemplazo completo), PATCH (actualización parcial) y DELETE.
 */
export const apiCartas = {
  async obtenerTodas() {
    return solicitarApi('/cards');
  },

  async obtenerActivas() {
    return solicitarApi('/cards?active=true');
  },

  async obtenerPorId(identificador) {
    return solicitarApi(`/cards/${encodeURIComponent(identificador)}`);
  },

  async crear(datosCarta) {
    return solicitarApi('/cards', {
      method: 'POST',
      body: JSON.stringify(datosCarta),
    });
  },

  // PUT: reemplazo completo de la entidad carta al editar todo el formulario
  async reemplazar(identificador, datosCompletosCarta) {
    return solicitarApi(`/cards/${encodeURIComponent(identificador)}`, {
      method: 'PUT',
      body: JSON.stringify(datosCompletosCarta),
    });
  },

  // PATCH: actualización parcial (ejemplo: activar/desactivar carta sin reenviar ataques)
  async actualizarParcial(identificador, camposParciales) {
    return solicitarApi(`/cards/${encodeURIComponent(identificador)}`, {
      method: 'PATCH',
      body: JSON.stringify(camposParciales),
    });
  },

  async eliminar(identificador) {
    return solicitarApi(`/cards/${encodeURIComponent(identificador)}`, {
      method: 'DELETE',
    });
  },
};
