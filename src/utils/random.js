/**
 * Utilidades de aleatoriedad para combate, sorteos y selección de mazos.
 */

export function factorAleatorio(minimo = 0.85, maximo = 1.15) {
  return minimo + Math.random() * (maximo - minimo);
}

export function lanzarMoneda() {
  return Math.random() < 0.5 ? 'player' : 'cpu';
}

export function mezclarArreglo(elementos) {
  const copia = [...elementos];
  for (let indice = copia.length - 1; indice > 0; indice -= 1) {
    const indiceAleatorio = Math.floor(Math.random() * (indice + 1));
    [copia[indice], copia[indiceAleatorio]] = [copia[indiceAleatorio], copia[indice]];
  }
  return copia;
}

export function elegirElementosAleatorios(elementos, cantidad) {
  return mezclarArreglo(elementos).slice(0, cantidad);
}
