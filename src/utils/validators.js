/**
 * Validadores de formularios, reglas de mazo y estructura de cartas.
 */

export const CATEGORIAS_CARTA = [
  'Profesores',
  'Estudiantes / Leyendas de Campus',
  'Personal de Apoyo (Cajasan & Campus)',
];

export function validarApodo(apodo) {
  const apodoLimpio = String(apodo ?? '').trim();
  if (!apodoLimpio) {
    return { valid: false, message: 'El nickname es obligatorio.' };
  }
  if (apodoLimpio.length < 3 || apodoLimpio.length > 20) {
    return { valid: false, message: 'El nickname debe tener entre 3 y 20 caracteres.' };
  } 
  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _.-]+$/.test(apodoLimpio)) {
    return { valid: false, message: 'Usa solo letras, números, espacios, guiones o puntos.' };
  }
  return { valid: true, value: apodoLimpio };
}

export function validarSeleccionMazo(cartasSeleccionadas, cantidadCartasActivas) {
  if (cantidadCartasActivas < 10) {
    return {
      valid: false,
      message: `Se necesitan al menos 10 cartas activas en el pool (actualmente hay ${cantidadCartasActivas}).`,
    };
  }
  if (!Array.isArray(cartasSeleccionadas) || cartasSeleccionadas.length !== 5) {
    return {
      valid: false,
      message: 'Debes seleccionar exactamente 5 cartas diferentes para tu mazo.',
    };
  }
  const identificadoresUnicos = new Set(cartasSeleccionadas.map((carta) => carta.id));
  if (identificadoresUnicos.size !== 5) {
    return { valid: false, message: 'No puedes repetir cartas dentro del mismo mazo.' };
  }
  return { valid: true };
}

export function validarFormularioCarta(carta) {
  if (!carta.name || carta.name.trim().length < 2) {
    return { valid: false, message: 'El nombre de la carta es obligatorio (mínimo 2 caracteres).' };
  }
  if (!CATEGORIAS_CARTA.includes(carta.type)) {
    return { valid: false, message: 'Selecciona una categoría válida de Campuslands.' };
  }
  if (!carta.description || carta.description.trim().length < 10) {
    return { valid: false, message: 'Agrega una descripción de al menos 10 caracteres.' };
  }
  const vida = Number(carta.hp);
  if (!Number.isFinite(vida) || vida < 100 || vida > 500) {
    return { valid: false, message: 'El HP base debe estar entre 100 y 500.' };
  }
  if (!Array.isArray(carta.attacks) || carta.attacks.length !== 4) {
    return { valid: false, message: 'La carta debe incluir exactamente 4 ataques.' };
  }
  for (let indice = 0; indice < carta.attacks.length; indice += 1) {
    const ataque = carta.attacks[indice];
    if (!ataque.name || ataque.name.trim().length < 2) {
      return { valid: false, message: `El ataque ${indice + 1} necesita un nombre válido.` };
    }
    const dano = Number(ataque.baseDamage);
    if (!Number.isFinite(dano) || dano < 10 || dano > 80) {
      return { valid: false, message: `El daño del ataque ${indice + 1} debe estar entre 10 y 80.` };
    }
  }
  if (!carta.defense?.name || carta.defense.name.trim().length < 2) {
    return { valid: false, message: 'El nombre de la defensa es obligatorio.' };
  }
  if (!carta.special?.name || carta.special.name.trim().length < 2) {
    return { valid: false, message: 'El nombre del poder especial es obligatorio.' };
  }
  const danoEspecial = Number(carta.special.baseDamage);
  if (!Number.isFinite(danoEspecial) || danoEspecial < 50 || danoEspecial > 90) {
    return { valid: false, message: 'El daño del poder especial debe estar entre 50 y 90.' };
  }
  return { valid: true };
}
