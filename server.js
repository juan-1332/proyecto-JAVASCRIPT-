import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const RUTA_ARCHIVO_ACTUAL = fileURLToPath(import.meta.url);
const RUTA_CARPETA_ACTUAL = path.dirname(RUTA_ARCHIVO_ACTUAL);

const PUERTO = Number(process.env.PORT) || 3000;
const RUTA_BASE_DATOS = path.resolve(RUTA_CARPETA_ACTUAL, 'src/data/db.json');
const RECURSOS_VALIDOS = new Set(['cards', 'players', 'admins', 'battles']);

function leerBaseDatos() {
  const contenido = fs.readFileSync(RUTA_BASE_DATOS, 'utf-8');
  return JSON.parse(contenido);
}

function guardarBaseDatos(datos) {
  fs.writeFileSync(RUTA_BASE_DATOS, JSON.stringify(datos, null, 2), 'utf-8');
}

function esRecursoValido(nombre) {
  return RECURSOS_VALIDOS.has(nombre);
}

async function iniciarServidor() {
  const aplicacion = express();
  const servidorHttp = http.createServer(aplicacion);
  aplicacion.use(express.json({ limit: '2mb' }));

  const carpetaPublica = path.resolve(RUTA_CARPETA_ACTUAL, 'public');
  if (fs.existsSync(carpetaPublica)) {
    aplicacion.use('/public', express.static(carpetaPublica));
    aplicacion.use(express.static(carpetaPublica));
  }

  const enrutadorApi = express.Router();

  enrutadorApi.get('/:resource', (solicitud, respuesta) => {
    const recurso = solicitud.params.resource;
    if (!esRecursoValido(recurso)) {
      respuesta.status(404).json({ error: `Recurso "${recurso}" no encontrado.` });
      return;
    }

    const baseDatos = leerBaseDatos();
    let registros = [...(baseDatos[recurso] || [])];
    const { _sort, _order, ...filtros } = solicitud.query;

    for (const [clave, valorOriginal] of Object.entries(filtros)) {
      if (valorOriginal === undefined || valorOriginal === '') continue;
      const valor = String(valorOriginal);
      registros = registros.filter((registro) => {
        const campo = registro[clave];
        if (typeof campo === 'boolean') {
          return String(campo) === valor.toLowerCase();
        }
        if (typeof campo === 'string') {
          return campo.toLowerCase() === valor.toLowerCase();
        }
        return String(campo ?? '') === valor;
      });
    }

    if (typeof _sort === 'string' && _sort.length > 0) {
      const direccionOrden = String(_order ?? 'asc').toLowerCase() === 'desc' ? -1 : 1;
      registros.sort((registroA, registroB) => {
        const valorA = registroA[_sort];
        const valorB = registroB[_sort];
        if (typeof valorA === 'number' && typeof valorB === 'number') {
          return (valorA - valorB) * direccionOrden;
        }
        return String(valorA ?? '').localeCompare(String(valorB ?? '')) * direccionOrden;
      });
    }

    respuesta.json(registros);
  });

  enrutadorApi.get('/:resource/:id', (solicitud, respuesta) => {
    const { resource: recurso, id: identificador } = solicitud.params;
    if (!esRecursoValido(recurso)) {
      respuesta.status(404).json({ error: `Recurso "${recurso}" no encontrado.` });
      return;
    }

    const baseDatos = leerBaseDatos();
    const registro = (baseDatos[recurso] || []).find((elemento) => String(elemento.id) === identificador);
    if (!registro) {
      respuesta.status(404).json({ error: `Registro "${identificador}" no encontrado en ${recurso}.` });
      return;
    }

    respuesta.json(registro);
  });

  enrutadorApi.post('/:resource', (solicitud, respuesta) => {
    const recurso = solicitud.params.resource;
    if (!esRecursoValido(recurso)) {
      respuesta.status(404).json({ error: `Recurso "${recurso}" no encontrado.` });
      return;
    }

    const baseDatos = leerBaseDatos();
    const registro = { ...solicitud.body };
    if (!registro.id) {
      registro.id = `${recurso.slice(0, -1)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    }
    if (!registro.createdAt && recurso !== 'battles') {
      registro.createdAt = new Date().toISOString();
    }

    baseDatos[recurso].push(registro);
    guardarBaseDatos(baseDatos);
    respuesta.status(201).json(registro);
  });

  enrutadorApi.put('/:resource/:id', (solicitud, respuesta) => {
    const { resource: recurso, id: identificador } = solicitud.params;
    if (!esRecursoValido(recurso)) {
      respuesta.status(404).json({ error: `Recurso "${recurso}" no encontrado.` });
      return;
    }

    const baseDatos = leerBaseDatos();
    const indice = (baseDatos[recurso] || []).findIndex((elemento) => String(elemento.id) === identificador);
    if (indice === -1) {
      respuesta.status(404).json({ error: `Registro "${identificador}" no encontrado en ${recurso}.` });
      return;
    }

    const registroExistente = baseDatos[recurso][indice];
    const registroReemplazado = {
      ...solicitud.body,
      id: registroExistente.id,
      createdAt: solicitud.body.createdAt ?? registroExistente.createdAt ?? new Date().toISOString(),
    };
    baseDatos[recurso][indice] = registroReemplazado;
    guardarBaseDatos(baseDatos);
    respuesta.json(registroReemplazado);
  });

  enrutadorApi.patch('/:resource/:id', (solicitud, respuesta) => {
    const { resource: recurso, id: identificador } = solicitud.params;
    if (!esRecursoValido(recurso)) {
      respuesta.status(404).json({ error: `Recurso "${recurso}" no encontrado.` });
      return;
    }

    const baseDatos = leerBaseDatos();
    const indice = (baseDatos[recurso] || []).findIndex((elemento) => String(elemento.id) === identificador);
    if (indice === -1) {
      respuesta.status(404).json({ error: `Registro "${identificador}" no encontrado en ${recurso}.` });
      return;
    }

    const registroActualizado = {
      ...baseDatos[recurso][indice],
      ...solicitud.body,
      id: baseDatos[recurso][indice].id,
    };
    baseDatos[recurso][indice] = registroActualizado;
    guardarBaseDatos(baseDatos);
    respuesta.json(registroActualizado);
  });

  enrutadorApi.delete('/:resource/:id', (solicitud, respuesta) => {
    const { resource: recurso, id: identificador } = solicitud.params;
    if (!esRecursoValido(recurso)) {
      respuesta.status(404).json({ error: `Recurso "${recurso}" no encontrado.` });
      return;
    }

    const baseDatos = leerBaseDatos();
    const indice = (baseDatos[recurso] || []).findIndex((elemento) => String(elemento.id) === identificador);
    if (indice === -1) {
      respuesta.status(404).json({ error: `Registro "${identificador}" no encontrado en ${recurso}.` });
      return;
    }

    const [registroEliminado] = baseDatos[recurso].splice(indice, 1);
    guardarBaseDatos(baseDatos);
    respuesta.json(registroEliminado);
  });

  aplicacion.use('/api', enrutadorApi);

  if (process.env.NODE_ENV !== 'production') {
    const servidorVite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: servidorHttp },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    aplicacion.use(servidorVite.middlewares);
  } else {
    const carpetaDistribucion = path.resolve(RUTA_CARPETA_ACTUAL, 'dist');
    aplicacion.use(express.static(carpetaDistribucion));
    aplicacion.get('*', (_solicitud, respuesta) => {
      respuesta.sendFile(path.join(carpetaDistribucion, 'index.html'));
    });
  }

  servidorHttp.listen(PUERTO, '0.0.0.0', () => {
    console.log(`Campuslands Battle Arena corriendo en http://localhost:${PUERTO}`);
  });
}

iniciarServidor();
