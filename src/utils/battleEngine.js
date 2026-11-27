import { elegirElementosAleatorios, factorAleatorio, lanzarMoneda } from './random.js';

/**
 * Motor puro de reglas de combate 1v1 para Campuslands Battle Arena.
 */

export function crearMazoMaquina(cartasActivas, mazoJugador) {
  const identificadoresJugador = new Set(mazoJugador.map((carta) => carta.id));
  const cartasRestantes = cartasActivas.filter((carta) => !identificadoresJugador.has(carta.id));
  return elegirElementosAleatorios(cartasRestantes, 5);
}

function prepararUnidadMazo(carta) {
  const vidaMaxima = Number(carta.hp) || 250;
  return {
    card: structuredClone(carta),
    maxHp: vidaMaxima,
    currentHp: vidaMaxima,
    defending: false,
    defeated: false,
  };
}

export function crearEstadoInicialBatalla(mazoJugador, mazoMaquina, apodoJugador) {
  const primerTurno = lanzarMoneda();

  return {
    playerNickname: apodoJugador,
    globalTurn: 1,
    currentActor: primerTurno,
    firstActor: primerTurno,
    status: 'playing', // 'playing' | 'finished'
    winner: null,
    player: {
      units: mazoJugador.map(prepararUnidadMazo),
      activeIndex: 0,
      ownTurnsStarted: primerTurno === 'player' ? 1 : 0,
      specialCooldown: 0,
    },
    cpu: {
      units: mazoMaquina.map(prepararUnidadMazo),
      activeIndex: 0,
      ownTurnsStarted: primerTurno === 'cpu' ? 1 : 0,
      specialCooldown: 0,
    },
    logs: [
      {
        turn: 0,
        actor: 'system',
        type: 'toss',
        text:
          primerTurno === 'player'
            ? `Sorteo inicial: ${apodoJugador} toma la iniciativa en el Turno 1.`
            : 'Sorteo inicial: La Máquina toma la iniciativa en el Turno 1.',
      },
    ],
  };
}

export function obtenerDisponibilidadEspecial(estadoLado, unidadActiva) {
  const turnoDesbloqueo = Number(unidadActiva?.card?.special?.unlockTurn ?? 2);
  const enfriamiento = estadoLado.specialCooldown;
  const desbloqueadoPorTurno = estadoLado.ownTurnsStarted >= turnoDesbloqueo;

  if (!desbloqueadoPorTurno) {
    return {
      available: false,
      reason: `Desbloquea en turno ${turnoDesbloqueo}`,
      cooldownRemaining: enfriamiento,
      lockedTurnOne: true,
    };
  }

  if (enfriamiento > 0) {
    return {
      available: false,
      reason: `Cooldown: ${enfriamiento} ${enfriamiento === 1 ? 'turno' : 'turnos'}`,
      cooldownRemaining: enfriamiento,
      lockedTurnOne: false,
    };
  }

  return {
    available: true,
    reason: 'Listo',
    cooldownRemaining: 0,
    lockedTurnOne: false,
  };
}

export function calcularDanoAccion(danoBase, unidadDefensora) {
  const variacionAleatoria = factorAleatorio(0.85, 1.15);
  const danoConFactor = danoBase * variacionAleatoria;
  const danoOriginal = Math.round(danoConFactor);
  const esquivado = Math.random() < PROBABILIDAD_ESQUIVE;

  if (esquivado) {
    return {
      rawDamage: danoOriginal,
      finalDamage: 0,
      factor: Number(variacionAleatoria.toFixed(2)),
      wasDefended: false,
      isCritical: false,
      dodged: true,
    };
  }

  const esCritico = Math.random() < PROBABILIDAD_CRITICO;
  let danoCalculado = esCritico ? danoConFactor * MULTIPLICADOR_CRITICO : danoConFactor;

  const estabaDefendiendo = Boolean(unidadDefensora.defending);
  const reduccion = estabaDefendiendo
    ? Number(unidadDefensora.card?.defense?.damageReduction ?? 0.5)
    : 0;
  if (estabaDefendiendo) {
    danoCalculado = danoCalculado * (1 - reduccion);
  }
  const danoFinal = Math.max(1, Math.round(danoCalculado));

  return {
    rawDamage: danoOriginal,
    finalDamage: danoFinal,
    factor: Number(variacionAleatoria.toFixed(2)),
    wasDefended: estabaDefendiendo,
    isCritical: esCritico,
    dodged: false,
  };
}

export function ejecutarAccionTurno(estado, claveActor, accion) {
  if (estado.status !== 'playing' || estado.currentActor !== claveActor) {
    return { nextState: estado, event: null };
  }

  const siguienteEstado = structuredClone(estado);
  const claveOponente = claveActor === 'player' ? 'cpu' : 'player';
  const ladoActor = siguienteEstado[claveActor];
  const ladoOponente = siguienteEstado[claveOponente];

  const unidadActor = ladoActor.units[ladoActor.activeIndex];
  const unidadOponente = ladoOponente.units[ladoOponente.activeIndex];
  const nombreActor = claveActor === 'player' ? siguienteEstado.playerNickname : 'Máquina';

  const evento = {
    actor: claveActor,
    opponent: claveOponente,
    actionType: accion.type,
    damage: 0,
    wasDefended: false,
    isCritical: false,
    dodged: false,
    ko: false,
    swappedUnit: false,
    winner: null,
  };

  if (accion.type === 'attack') {
    const ataque = unidadActor.card.attacks[accion.attackIndex] || unidadActor.card.attacks[0];
    const resultadoDano = calcularDanoAccion(ataque.baseDamage, unidadOponente);

    ladoActor.consecutiveDefenses = 0;
    if (ladoActor.specialCooldown > 0) {
      ladoActor.specialCooldown -= 1;
    }

    evento.damage = resultadoDano.finalDamage;
    evento.wasDefended = resultadoDano.wasDefended;
    evento.isCritical = resultadoDano.isCritical;
    evento.dodged = resultadoDano.dodged;
    evento.actionName = ataque.name;

    if (resultadoDano.dodged) {
      siguienteEstado.logs.unshift({
        turn: siguienteEstado.globalTurn,
        actor: claveActor,
        type: 'dodge',
        text: `¡ATAQUE ESQUIVADO! ${unidadOponente.card.name} evitó ${ataque.name} de ${nombreActor} (0 de daño).`,
      });
    } else {
      unidadOponente.currentHp = Math.max(0, unidadOponente.currentHp - resultadoDano.finalDamage);
      unidadOponente.defending = false;

      const notaCritico = resultadoDano.isCritical ? ' ¡GOLPE CRÍTICO! (×1.5)' : '';
      const notaEscudo = resultadoDano.wasDefended
        ? ` (Escudo activo redujo el daño a ${resultadoDano.finalDamage})`
        : '';
      siguienteEstado.logs.unshift({
        turn: siguienteEstado.globalTurn,
        actor: claveActor,
        type: resultadoDano.isCritical ? 'critical' : 'attack',
        text: `${nombreActor} (${unidadActor.card.name}) usó ${ataque.name} causando ${resultadoDano.finalDamage} de daño a ${unidadOponente.card.name}.${notaCritico}${notaEscudo}`,
      });
    }
  } else if (accion.type === 'defense') {
    unidadActor.defending = true;
    ladoActor.consecutiveDefenses = (ladoActor.consecutiveDefenses || 0) + 1;
    if (ladoActor.specialCooldown > 0) {
      ladoActor.specialCooldown -= 1;
    }

    evento.actionName = unidadActor.card.defense?.name || 'Defensa Táctica';
    siguienteEstado.logs.unshift({
      turn: siguienteEstado.globalTurn,
      actor: claveActor,
      type: 'defense',
      text: `${nombreActor} (${unidadActor.card.name}) activó ${evento.actionName}: reducirá 50% el próximo golpe.`,
    });
  } else if (accion.type === 'special') {
    const disponibilidad = obtenerDisponibilidadEspecial(ladoActor, unidadActor);
    if (!disponibilidad.available) {
      return { nextState: estado, event: null };
    }

    const especial = unidadActor.card.special;
    const resultadoDano = calcularDanoAccion(especial.baseDamage, unidadOponente);

    ladoActor.consecutiveDefenses = 0;
    ladoActor.specialCooldown = Number(especial.cooldown ?? 3);

    evento.damage = resultadoDano.finalDamage;
    evento.wasDefended = resultadoDano.wasDefended;
    evento.isCritical = resultadoDano.isCritical;
    evento.dodged = resultadoDano.dodged;
    evento.actionName = especial.name;

    if (resultadoDano.dodged) {
      siguienteEstado.logs.unshift({
        turn: siguienteEstado.globalTurn,
        actor: claveActor,
        type: 'dodge',
        text: `¡ATAQUE ESQUIVADO! ${unidadOponente.card.name} evitó el poder especial ${especial.name} de ${nombreActor} (0 de daño). Cooldown: ${ladoActor.specialCooldown} turnos.`,
      });
    } else {
      unidadOponente.currentHp = Math.max(0, unidadOponente.currentHp - resultadoDano.finalDamage);
      unidadOponente.defending = false;

      const notaCritico = resultadoDano.isCritical ? ' ¡GOLPE CRÍTICO! (×1.5)' : '';
      const notaEscudo = resultadoDano.wasDefended
        ? ` (Escudo redujo el daño a ${resultadoDano.finalDamage})`
        : '';
      siguienteEstado.logs.unshift({
        turn: siguienteEstado.globalTurn,
        actor: claveActor,
        type: resultadoDano.isCritical ? 'critical' : 'special',
        text: `${nombreActor} desató poder especial ${especial.name} por ${resultadoDano.finalDamage} de daño.${notaCritico}${notaEscudo} Cooldown: ${ladoActor.specialCooldown} turnos.`,
      });
    }
  }

  // Verificar derrota de carta oponente
  if (unidadOponente.currentHp <= 0) {
    unidadOponente.defeated = true;
    unidadOponente.defending = false;
    evento.ko = true;

    siguienteEstado.logs.unshift({
      turn: siguienteEstado.globalTurn,
      actor: 'system',
      type: 'ko',
      text: `${unidadOponente.card.name} cayó derrotada. ${unidadActor.card.name} conserva ${unidadActor.currentHp} HP.`,
    });

    const siguienteIndice = ladoOponente.units.findIndex((unidad) => !unidad.defeated);
    if (siguienteIndice === -1) {
      siguienteEstado.status = 'finished';
      siguienteEstado.winner = claveActor;
      evento.winner = claveActor;
      siguienteEstado.logs.unshift({
        turn: siguienteEstado.globalTurn,
        actor: 'system',
        type: 'victory',
        text:
          claveActor === 'player'
            ? `Victoria total para ${siguienteEstado.playerNickname}. (+50 puntos)`
            : 'La Máquina ha derrotado todo tu mazo. (+10 puntos de participación)',
      });
      return { nextState: siguienteEstado, event: evento };
    }

    ladoOponente.activeIndex = siguienteIndice;
    evento.swappedUnit = true;
    const cartaEntrante = ladoOponente.units[siguienteIndice];
    siguienteEstado.logs.unshift({
      turn: siguienteEstado.globalTurn,
      actor: 'system',
      type: 'swap',
      text: `Entra al campo ${cartaEntrante.card.name} (${cartaEntrante.currentHp} HP).`,
    });
  }

  // Avanzar turno hacia el oponente
  siguienteEstado.globalTurn += 1;
  siguienteEstado.currentActor = claveOponente;
  siguienteEstado[claveOponente].ownTurnsStarted += 1;

  return { nextState: siguienteEstado, event: evento };
}

export function elegirAccionMaquina(estado) {
  return elegirAccionAutomatica(estado, 'cpu');
}

export const PROBABILIDAD_CRITICO = 0.12;
export const MULTIPLICADOR_CRITICO = 1.5;
export const PROBABILIDAD_ESQUIVE = 0.08;

export function obtenerAccionesValidas(estado, claveActor) {
  const ladoActor = estado[claveActor];
  const unidadActiva = ladoActor.units[ladoActor.activeIndex];
  const ataques = (unidadActiva.card.attacks || []).map((_ataque, indice) => ({
    type: 'attack',
    attackIndex: indice,
  }));

  const accionesDisponibles = [...ataques, { type: 'defense' }];
  const disponibilidadEspecial = obtenerDisponibilidadEspecial(ladoActor, unidadActiva);

  if (disponibilidadEspecial.available) {
    accionesDisponibles.push({ type: 'special' });
  }

  return accionesDisponibles;
}

export function elegirAccionAutomatica(estado, claveActor) {
  const claveOponente = claveActor === 'player' ? 'cpu' : 'player';
  const ladoActor = estado[claveActor];
  const ladoOponente = estado[claveOponente];
  const unidadActor = ladoActor.units[ladoActor.activeIndex];
  const unidadOponente = ladoOponente.units[ladoOponente.activeIndex];

  const accionesDisponibles = obtenerAccionesValidas(estado, claveActor);
  const accionEspecial = accionesDisponibles.find((accion) => accion.type === 'special');
  const accionDefensa = accionesDisponibles.find((accion) => accion.type === 'defense');
  const accionesAtaque = accionesDisponibles.filter((accion) => accion.type === 'attack');

  if (accionEspecial && (unidadOponente.currentHp <= 85 || Math.random() < 0.6)) {
    return accionEspecial;
  }

  const defensasSeguidas = ladoActor.consecutiveDefenses || 0;
  if (
    accionDefensa &&
    !unidadActor.defending &&
    defensasSeguidas < 2 &&
    unidadActor.currentHp <= 115 &&
    Math.random() < 0.35
  ) {
    return accionDefensa;
  }

  if (accionesAtaque.length > 0) {
    const azar = Math.random();
    let indiceElegido = 0;
    if (azar > 0.72 && accionesAtaque.length >= 4) indiceElegido = 3;
    else if (azar > 0.44 && accionesAtaque.length >= 3) indiceElegido = 2;
    else if (azar > 0.18 && accionesAtaque.length >= 2) indiceElegido = 1;
    return accionesAtaque[indiceElegido] || accionesAtaque[0];
  }

  return accionesDisponibles[0];
}
