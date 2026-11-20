/**
 * Motor de audio procedural basado en Web Audio API.
 * Reproduce efectos inmediatos de combate sin depender de archivos binarios externos
 * e incluye control global de silencio.
 */

class MotorAudio {
  constructor() {
    this.contextoAudio = null;
    this.silenciado = false;
  }

  asegurarContexto() {
    if (this.silenciado) return null;
    if (!this.contextoAudio) {
      const ConstructorAudio = window.AudioContext || window.webkitAudioContext;
      if (!ConstructorAudio) return null;
      this.contextoAudio = new ConstructorAudio();
    }
    if (this.contextoAudio.state === 'suspended') {
      this.contextoAudio.resume().catch(() => {});
    }
    return this.contextoAudio;
  }

  alternarSilencio() {
    this.silenciado = !this.silenciado;
    return this.silenciado;
  }

  estaSilenciado() {
    return this.silenciado;
  }

  reproducirTono({
    freq: frecuencia = 600,
    endFreq: frecuenciaFinal = null,
    duration: duracion = 0.16,
    type: formaOnda = 'triangle',
    gain: ganancia = 0.14,
    delay: retraso = 0,
  }) {
    const contexto = this.asegurarContexto();
    if (!contexto) return;

    const tiempoActual = contexto.currentTime + retraso;
    const oscilador = contexto.createOscillator();
    const amplitud = contexto.createGain();

    oscilador.type = formaOnda;
    oscilador.frequency.setValueAtTime(frecuencia, tiempoActual);
    if (frecuenciaFinal !== null) {
      oscilador.frequency.exponentialRampToValueAtTime(Math.max(30, frecuenciaFinal), tiempoActual + duracion);
    }

    amplitud.gain.setValueAtTime(0.001, tiempoActual);
    amplitud.gain.exponentialRampToValueAtTime(ganancia, tiempoActual + 0.02);
    amplitud.gain.exponentialRampToValueAtTime(0.001, tiempoActual + duracion);

    oscilador.connect(amplitud);
    amplitud.connect(contexto.destination);
    oscilador.start(tiempoActual);
    oscilador.stop(tiempoActual + duracion + 0.02);
  }

  reproducirVariacion(variaciones) {
    const indice = Math.floor(Math.random() * variaciones.length);
    variaciones[indice].forEach((tono) => this.reproducirTono(tono));
  }

  reproducirClic() {
    this.reproducirTono({ freq: 620, endFreq: 480, duration: 0.06, type: 'sine', gain: 0.08 });
  }

  reproducirAtaque() {
    this.reproducirVariacion([
      [
        { freq: 1500, endFreq: 240, duration: 0.13, type: 'sawtooth', gain: 0.3 },
        { freq: 2200, endFreq: 620, duration: 0.1, type: 'triangle', gain: 0.24, delay: 0.025 },
      ],
      [
        { freq: 980, endFreq: 170, duration: 0.16, type: 'square', gain: 0.32 },
        { freq: 1850, endFreq: 360, duration: 0.12, type: 'sawtooth', gain: 0.2, delay: 0.02 },
      ],
      [
        { freq: 2400, endFreq: 420, duration: 0.12, type: 'triangle', gain: 0.28 },
        { freq: 1050, endFreq: 130, duration: 0.18, type: 'sawtooth', gain: 0.24, delay: 0.035 },
      ],
    ]);
  }

  reproducirImpacto() {
    this.reproducirVariacion([
      [
        { freq: 82, endFreq: 32, duration: 0.22, type: 'square', gain: 0.34 },
        { freq: 1850, endFreq: 420, duration: 0.07, type: 'sine', gain: 0.18 },
      ],
      [
        { freq: 135, endFreq: 38, duration: 0.19, type: 'sawtooth', gain: 0.32 },
        { freq: 2600, endFreq: 760, duration: 0.08, type: 'triangle', gain: 0.18, delay: 0.015 },
      ],
      [
        { freq: 62, endFreq: 30, duration: 0.26, type: 'square', gain: 0.3 },
        { freq: 1250, endFreq: 300, duration: 0.09, type: 'sawtooth', gain: 0.2 },
      ],
    ]);
  }

  reproducirDefensa() {
    this.reproducirVariacion([
      [
        { freq: 1650, endFreq: 920, duration: 0.16, type: 'sine', gain: 0.22 },
        { freq: 2800, endFreq: 1450, duration: 0.14, type: 'triangle', gain: 0.2, delay: 0.045 },
      ],
      [
        { freq: 720, endFreq: 1900, duration: 0.2, type: 'triangle', gain: 0.24 },
        { freq: 2100, endFreq: 3200, duration: 0.12, type: 'sine', gain: 0.18, delay: 0.035 },
      ],
    ]);
  }

  reproducirEspecial() {
    this.reproducirVariacion([
      [
        { freq: 130, endFreq: 1750, duration: 0.3, type: 'sawtooth', gain: 0.3 },
        { freq: 420, endFreq: 2600, duration: 0.28, type: 'triangle', gain: 0.26, delay: 0.06 },
        { freq: 95, endFreq: 34, duration: 0.34, type: 'square', gain: 0.28, delay: 0.16 },
      ],
      [
        { freq: 210, endFreq: 2300, duration: 0.32, type: 'triangle', gain: 0.32 },
        { freq: 1450, endFreq: 180, duration: 0.26, type: 'sawtooth', gain: 0.28, delay: 0.1 },
        { freq: 72, endFreq: 30, duration: 0.3, type: 'square', gain: 0.3, delay: 0.18 },
      ],
      [
        { freq: 2800, endFreq: 360, duration: 0.24, type: 'sawtooth', gain: 0.32 },
        { freq: 900, endFreq: 3400, duration: 0.3, type: 'triangle', gain: 0.26, delay: 0.05 },
        { freq: 115, endFreq: 32, duration: 0.34, type: 'square', gain: 0.3, delay: 0.15 },
      ],
    ]);
  }

  reproducirDerrotaCarta() {
    this.reproducirVariacion([
      [
        { freq: 880, endFreq: 42, duration: 0.48, type: 'sawtooth', gain: 0.34 },
        { freq: 230, endFreq: 30, duration: 0.32, type: 'square', gain: 0.3, delay: 0.08 },
      ],
      [
        { freq: 1250, endFreq: 35, duration: 0.55, type: 'square', gain: 0.34 },
        { freq: 480, endFreq: 55, duration: 0.38, type: 'sawtooth', gain: 0.26, delay: 0.06 },
      ],
      [
        { freq: 640, endFreq: 30, duration: 0.42, type: 'sawtooth', gain: 0.34 },
        { freq: 1600, endFreq: 44, duration: 0.4, type: 'triangle', gain: 0.3, delay: 0.1 },
      ],
    ]);
  }

  reproducirVictoria() {
    const notas = [523.25, 659.25, 783.99, 1046.5];
    notas.forEach((frecuencia, indice) => {
      this.reproducirTono({ freq: frecuencia, duration: 0.22, type: 'triangle', gain: 0.13, delay: indice * 0.11 });
    });
  }

  reproducirDerrota() {
    const notas = [130.81, 110, 82.41, 65.41];
    notas.forEach((frecuencia, indice) => {
      this.reproducirTono({ freq: frecuencia, duration: 0.24, type: 'square', gain: 0.24, delay: indice * 0.13 });
    });
  }
}

export const motorAudio = new MotorAudio();
