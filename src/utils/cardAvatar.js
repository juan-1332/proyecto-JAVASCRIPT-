/**
 * Helper visual para retratos SVG por categoría y respaldo ante imágenes faltantes.
 */

export function obtenerTemaCategoria(tipo) {
  switch (tipo) {
    case 'Profesores':
      return {
        shortLabel: 'Profesores',
        accent: '#F59E0B',
        bgStart: '#1E3A8A',
        bgEnd: '#0B162C',
        ring: '#FBBF24',
      };
    case 'Estudiantes / Leyendas de Campus':
      return {
        shortLabel: 'Leyendas Campus',
        accent: '#38BDF8',
        bgStart: '#1D4ED8',
        bgEnd: '#0F172A',
        ring: '#60A5FA',
      };
    case 'Personal de Apoyo (Cajasan & Campus)':
    default:
      return {
        shortLabel: 'Apoyo Cajasan',
        accent: '#34D399',
        bgStart: '#065F46',
        bgEnd: '#0B162C',
        ring: '#6EE7B7',
      };
  }
}

export function obtenerIniciales(nombre) {
  return String(nombre || 'CL')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function crearUrlSvgAlternativa(carta) {
  const tema = obtenerTemaCategoria(carta?.type);
  const iniciales = obtenerIniciales(carta?.name);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${tema.bgStart}" />
          <stop offset="100%" stop-color="${tema.bgEnd}" />
        </linearGradient>
      </defs>
      <rect width="240" height="180" fill="url(#g)" />
      <circle cx="120" cy="78" r="42" fill="#0B162C" fill-opacity="0.72" stroke="${tema.accent}" stroke-width="3" />
      <text x="120" y="90" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="30" fill="#F8FAFC">${iniciales}</text>
      <rect x="44" y="138" width="152" height="4" rx="2" fill="${tema.accent}" fill-opacity="0.8" />
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
