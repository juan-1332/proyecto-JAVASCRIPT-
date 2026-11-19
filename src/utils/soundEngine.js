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
    freq: frecuencia = 440,
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

  reproducirClic() {
    this.reproducirTono({ freq: 620, endFreq: 480, duration: 0.06, type: 'sine', gain: 0.08 });
  }

  reproducirAtaque() {
    this.reproducirTono({ freq: 290, endFreq: 110, duration: 0.14, type: 'sawtooth', gain: 0.12 });
    this.reproducirTono({ freq: 520, endFreq: 180, duration: 0.11, type: 'triangle', gain: 0.1, delay: 0.04 });
  }

  reproducirImpacto() {
    this.reproducirTono({ freq: 150, endFreq: 55, duration: 0.18, type: 'square', gain: 0.14 });
  }

  reproducirDefensa() {
    this.reproducirTono({ freq: 340, endFreq: 540, duration: 0.16, type: 'sine', gain: 0.11 });
    this.reproducirTono({ freq: 540, endFreq: 720, duration: 0.14, type: 'triangle', gain: 0.09, delay: 0.07 });
  }

  reproducirEspecial() {
    this.reproducirTono({ freq: 320, endFreq: 880, duration: 0.22, type: 'sawtooth', gain: 0.12 });
    this.reproducirTono({ freq: 640, endFreq: 1180, duration: 0.26, type: 'triangle', gain: 0.11, delay: 0.09 });
    this.reproducirTono({ freq: 220, endFreq: 80, duration: 0.28, type: 'square', gain: 0.1, delay: 0.18 });
  }

  reproducirDerrotaCarta() {
    this.reproducirTono({ freq: 240, endFreq: 65, duration: 0.35, type: 'sawtooth', gain: 0.14 });
  }

  reproducirVictoria() {
    const notas = [523.25, 659.25, 783.99, 1046.5];
    notas.forEach((frecuencia, indice) => {
      this.reproducirTono({ freq: frecuencia, duration: 0.22, type: 'triangle', gain: 0.13, delay: indice * 0.11 });
    });
  }

  reproducirDerrota() {
    const notas = [392, 349.23, 311.13, 261.63];
    notas.forEach((frecuencia, indice) => {
      this.reproducirTono({ freq: frecuencia, duration: 0.24, type: 'sine', gain: 0.12, delay: indice * 0.13 });
    });
  }
}

export const motorAudio = new MotorAudio();
