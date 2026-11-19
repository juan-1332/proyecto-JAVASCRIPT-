# Recursos de Audio — Campuslands Battle Arena

Las rutas `/public/sounds/attack.mp3`, `/public/sounds/defense.mp3`, `/public/sounds/special.mp3` y `/public/sounds/hit.mp3` están mapeadas en `db.json` por carta. En ejecución inmediata, `src/utils/soundEngine.js` sintetiza cada efecto mediante Web Audio API para respuesta instantánea sin latencia de red.
