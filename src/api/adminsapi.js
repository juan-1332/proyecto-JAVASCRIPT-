import { solicitarApi } from './apiconfig.js';

/**
 * Servicio REST para autenticación de administradores contra db.json.
 */
export const apiAdministradores = {
  async autenticar(nombreUsuario, contrasena) {
    const usuarioLimpio = nombreUsuario.trim();
    const coincidencias = await solicitarApi(`/admins?username=${encodeURIComponent(usuarioLimpio)}`);
    const administrador = coincidencias.find(
      (registro) => registro.username === usuarioLimpio && registro.password === contrasena
    );

    if (!administrador) {
      throw new Error('Credenciales de administrador inválidas.');
    }

    return {
      id: administrador.id,
      username: administrador.username,
      role: administrador.role,
    };
  },
};
