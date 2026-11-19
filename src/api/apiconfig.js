/**
 * Configuración central de entornos y cliente HTTP con fetch() nativo.
 * Compatible con Vite (import.meta.env), servidor Express, JSON Server,
 * Live Server estático y despliegue en Vercel.
 */

const CLAVE_ALMACENAMIENTO = 'campuslands_battle_arena_db_v1';

function leerEntornoSeguro() {
  const entornoVite =
    typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const entornoGlobal =
    typeof window !== 'undefined' && window.__ENV__ ? window.__ENV__ : {};

  return {
    VITE_API_MODE: entornoVite.VITE_API_MODE || entornoGlobal.VITE_API_MODE || '',
    VITE_API_DEV_URL: entornoVite.VITE_API_DEV_URL || entornoGlobal.VITE_API_DEV_URL || '',
    VITE_API_PROD_URL: entornoVite.VITE_API_PROD_URL || entornoGlobal.VITE_API_PROD_URL || '',
  };
}

export function obtenerModoApi() {
  const entorno = leerEntornoSeguro();
  if (entorno.VITE_API_MODE) {
    return entorno.VITE_API_MODE;
  }

  if (typeof window !== 'undefined') {
    const nombreServidor = window.location.hostname;
    if (nombreServidor && nombreServidor !== 'localhost' && nombreServidor !== '127.0.0.1') {
      return 'production';
    }
  }

  return 'development';
}

export function obtenerUrlBaseApi() {
  const entorno = leerEntornoSeguro();
  const modo = obtenerModoApi();

  switch (modo) {
    case 'production':
      return entorno.VITE_API_PROD_URL || '/api';
    case 'development':
    default:
      return entorno.VITE_API_DEV_URL || '/api';
  }
}

/**
 * Respaldo local (solo se activa cuando no existe servidor REST en vivo,
 * por ejemplo al abrir index.html con VS Code Live Server o hosting estático en Vercel).
 */
async function asegurarBaseLocal() {
  if (typeof localStorage !== 'undefined') {
    const baseGuardada = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (baseGuardada) {
      try {
        return JSON.parse(baseGuardada);
      } catch {
        localStorage.removeItem(CLAVE_ALMACENAMIENTO);
      }
    }
  }

  const rutasCandidatas = ['./src/data/db.json', '/src/data/db.json'];
  for (const rutaBase of rutasCandidatas) {
    try {
      const respuesta = await fetch(rutaBase);
      if (respuesta.ok) {
        const datos = await respuesta.json();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(datos));
        }
        return datos;
      }
    } catch {
      // Continuar con siguiente ruta candidata
    }
  }

  throw new Error('No se pudo cargar la base de datos inicial db.json.');
}

function guardarBaseLocal(baseDatos) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(baseDatos));
  }
}

async function atenderRespaldoEstatico(ruta, opciones = {}) {
  const metodo = (opciones.method || 'GET').toUpperCase();
  const [rutaOriginal, consultaOriginal = ''] = ruta.replace(/^\//, '').split('?');
  const [recurso, id] = rutaOriginal.split('/');
  const baseDatos = await asegurarBaseLocal();

  if (!baseDatos[recurso]) {
    throw new Error(`Recurso "${recurso}" no encontrado.`);
  }

  if (metodo === 'GET' && !id) {
    let elementos = [...baseDatos[recurso]];
    const parametros = new URLSearchParams(consultaOriginal);
    const campoOrden = parametros.get('_sort');
    const orden = parametros.get('_order') || 'asc';

    for (const [clave, valor] of parametros.entries()) {
      if (clave === '_sort' || clave === '_order' || valor === '') continue;
      elementos = elementos.filter((elemento) => {
        const campo = elemento[clave];
        if (typeof campo === 'boolean') return String(campo) === valor.toLowerCase();
        if (typeof campo === 'string') return campo.toLowerCase() === valor.toLowerCase();
        return String(campo ?? '') === valor;
      });
    }

    if (campoOrden) {
      const direccion = orden.toLowerCase() === 'desc' ? -1 : 1;
      elementos.sort((elementoA, elementoB) => {
        const valorA = elementoA[campoOrden];
        const valorB = elementoB[campoOrden];
        if (typeof valorA === 'number' && typeof valorB === 'number') return (valorA - valorB) * direccion;
        return String(valorA ?? '').localeCompare(String(valorB ?? '')) * direccion;
      });
    }

    return elementos;
  }

  if (metodo === 'GET' && id) {
    const encontrado = baseDatos[recurso].find((elemento) => String(elemento.id) === decodeURIComponent(id));
    if (!encontrado) throw new Error(`Registro "${id}" no encontrado en ${recurso}.`);
    return encontrado;
  }

  const cuerpo = opciones.body ? JSON.parse(opciones.body) : {};

  if (metodo === 'POST') {
    const registro = { ...cuerpo };
    if (!registro.id) {
      registro.id = `${recurso.slice(0, -1)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    }
    if (!registro.createdAt && recurso !== 'battles') {
      registro.createdAt = new Date().toISOString();
    }
    baseDatos[recurso].push(registro);
    guardarBaseLocal(baseDatos);
    return registro;
  }

  const idObjetivo = decodeURIComponent(id || '');
  const indice = baseDatos[recurso].findIndex((elemento) => String(elemento.id) === idObjetivo);
  if (indice === -1) {
    throw new Error(`Registro "${idObjetivo}" no encontrado en ${recurso}.`);
  }

  if (metodo === 'PUT') {
    const existente = baseDatos[recurso][indice];
    const reemplazado = {
      ...cuerpo,
      id: existente.id,
      createdAt: cuerpo.createdAt ?? existente.createdAt ?? new Date().toISOString(),
    };
    baseDatos[recurso][indice] = reemplazado;
    guardarBaseLocal(baseDatos);
    return reemplazado;
  }

  if (metodo === 'PATCH') {
    const actualizado = {
      ...baseDatos[recurso][indice],
      ...cuerpo,
      id: baseDatos[recurso][indice].id,
    };
    baseDatos[recurso][indice] = actualizado;
    guardarBaseLocal(baseDatos);
    return actualizado;
  }

  if (metodo === 'DELETE') {
    const [eliminado] = baseDatos[recurso].splice(indice, 1);
    guardarBaseLocal(baseDatos);
    return eliminado;
  }

  throw new Error(`Método HTTP ${metodo} no soportado.`);
}

export async function solicitarApi(ruta, opciones = {}) {
  const urlBase = obtenerUrlBaseApi().replace(/\/$/, '');
  const rutaLimpia = ruta.startsWith('/') ? ruta : `/${ruta}`;
  const url = `${urlBase}${rutaLimpia}`;

  const configuracion = {
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.headers || {}),
    },
    ...opciones,
  };

  try {
    const respuesta = await fetch(url, configuracion);
    const tipoContenido = respuesta.headers.get('content-type') || '';

    if (respuesta.ok && tipoContenido.includes('application/json')) {
      return await respuesta.json();
    }

    // Si el servidor responde con error JSON real de la API REST, propagar error
    if (tipoContenido.includes('application/json')) {
      const datosError = await respuesta.json();
      throw new Error(datosError?.error || `Error HTTP ${respuesta.status}`);
    }

    // Si un servidor estático (Live Server / Vercel sin backend) devuelve 404/HTML en /api/*
    if (urlBase.startsWith('/')) {
      return await atenderRespaldoEstatico(rutaLimpia, opciones);
    }

    throw new Error(`Error HTTP ${respuesta.status}`);
  } catch (errorCapturado) {
    // Si falló la red hacia ruta relativa /api (sin servidor backend activo), usar respaldo local db.json
    if (urlBase.startsWith('/') && (errorCapturado.name === 'TypeError' || /Failed to fetch/i.test(errorCapturado.message))) {
      return await atenderRespaldoEstatico(rutaLimpia, opciones);
    }
    throw errorCapturado;
  }
}
