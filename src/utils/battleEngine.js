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
  const danoOriginal = Math.round(danoBase * variacionAleatoria);
  const estabaDefendiendo = Boolean(unidadDefensora.defending);
  const reduccion = estabaDefendiendo
    ? Number(unidadDefensora.card?.defense?.damageReduction ?? 0.5)
    : 0;
  const danoFinal = estabaDefendiendo
    ? Math.max(1, Math.round(danoOriginal * (1 - reduccion)))
    : danoOriginal;

  return {
    rawDamage: danoOriginal,
    finalDamage: danoFinal,
    factor: Number(variacionAleatoria.toFixed(2)),
    wasDefended: estabaDefendiendo,
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
    ko: false,
    swappedUnit: false,
    winner: null,
  };

  if (accion.type === 'attack') {
    const ataque = unidadActor.card.attacks[accion.attackIndex] || unidadActor.card.attacks[0];
    const resultadoDano = calcularDanoAccion(ataque.baseDamage, unidadOponente);

    unidadOponente.currentHp = Math.max(0, unidadOponente.currentHp - resultadoDano.finalDamage);
    unidadOponente.defending = false;

    if (ladoActor.specialCooldown > 0) {
      ladoActor.specialCooldown -= 1;
    }

    evento.damage = resultadoDano.finalDamage;
    evento.wasDefended = resultadoDano.wasDefended;
    evento.actionName = ataque.name;

    const notaEscudo = resultadoDano.wasDefended
      ? ` (Escudo activo redujo de ${resultadoDano.rawDamage} a ${resultadoDano.finalDamage})`
      : '';
    siguienteEstado.logs.unshift({
      turn: siguienteEstado.globalTurn,
      actor: claveActor,
      type: 'attack',
      text: `${nombreActor} (${unidadActor.card.name}) usó ${ataque.name} causando ${resultadoDano.finalDamage} de daño a ${unidadOponente.card.name}${notaEscudo}.`,
    });
  } else if (accion.type === 'defense') {
    unidadActor.defending = true;
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

    unidadOponente.currentHp = Math.max(0, unidadOponente.currentHp - resultadoDano.finalDamage);
    unidadOponente.defending = false;
    ladoActor.specialCooldown = Number(especial.cooldown ?? 3);

    evento.damage = resultadoDano.finalDamage;
    evento.wasDefended = resultadoDano.wasDefended;
    evento.actionName = especial.name;

    const notaEscudo = resultadoDano.wasDefended
      ? ` (Escudo redujo de ${resultadoDano.rawDamage} a ${resultadoDano.finalDamage})`
      : '';
    siguienteEstado.logs.unshift({
      turn: siguienteEstado.globalTurn,
      actor: claveActor,
      type: 'special',
      text: `${nombreActor} desató poder especial ${especial.name} por ${resultadoDano.finalDamage} de daño${notaEscudo}. Cooldown: ${ladoActor.specialCooldown} turnos.`,
    });
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
  const ladoMaquina = estado.cpu;
  const ladoJugador = estado.player;
  const unidadMaquina = ladoMaquina.units[ladoMaquina.activeIndex];
  const unidadJugador = ladoJugador.units[ladoJugador.activeIndex];

  const revisionEspecial = obtenerDisponibilidadEspecial(ladoMaquina, unidadMaquina);
  if (revisionEspecial.available && (unidadJugador.currentHp <= 75 || Math.random() < 0.6)) {
    return { type: 'special' };
  }

  if (!unidadMaquina.defending && unidadMaquina.currentHp <= 115 && Math.random() < 0.32) {
    return { type: 'defense' };
  }

  // Elegir entre los 4 ataques normales con ligera preferencia táctica
  const resultadoAzar = Math.random();
  let indiceAtaque = 0;
  if (resultadoAzar > 0.72) indiceAtaque = 3;
  else if (resultadoAzar > 0.44) indiceAtaque = 2;
  else if (resultadoAzar > 0.18) indiceAtaque = 1;

  return { type: 'attack', attackIndex: indiceAtaque };
}
