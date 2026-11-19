import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const RUTA_ARCHIVO_ACTUAL = fileURLToPath(import.meta.url);
const RUTA_CARPETA_ACTUAL = path.dirname(RUTA_ARCHIVO_ACTUAL);

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'copy-static-public-and-db',
        apply: 'build',
        closeBundle(errorDeCierre) {
          if (errorDeCierre) return;

          const carpetaDistribucion = path.resolve(RUTA_CARPETA_ACTUAL, 'dist');
          const carpetaPublica = path.resolve(RUTA_CARPETA_ACTUAL, 'public');
          const carpetaPublicaDistribucion = path.resolve(carpetaDistribucion, 'public');
          const rutaBaseDatosOrigen = path.resolve(RUTA_CARPETA_ACTUAL, 'src/data/db.json');
          const rutaBaseDatosDistribucion = path.resolve(carpetaDistribucion, 'src/data/db.json');

          if (fs.existsSync(carpetaDistribucion) && fs.existsSync(carpetaPublica)) {
            fs.cpSync(carpetaPublica, carpetaPublicaDistribucion, { recursive: true, force: true });
          }

          if (fs.existsSync(carpetaDistribucion) && fs.existsSync(rutaBaseDatosOrigen)) {
            fs.mkdirSync(path.dirname(rutaBaseDatosDistribucion), { recursive: true });
            fs.copyFileSync(rutaBaseDatosOrigen, rutaBaseDatosDistribucion);
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(RUTA_CARPETA_ACTUAL, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
