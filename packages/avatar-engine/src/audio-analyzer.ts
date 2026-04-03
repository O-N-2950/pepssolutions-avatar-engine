// ─────────────────────────────────────────────────────────────────────────────
// Audio Analyzer — Extract amplitude from TTS audio for fallback lip-sync
// Uses Web Audio API AnalyserNode
// ─────────────────────────────────────────────────────────────────────────────

export interface AudioAnalyzer {
  getAmplitude(): number
  connectSource(source: AudioNode): void
  destroy(): void
}

export function createAudioAnalyzer(audioContext: AudioContext): AudioAnalyzer {
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.4
  analyser.connect(audioContext.destination)

  const dataArray = new Uint8Array(analyser.frequencyBinCount)

  return {
    getAmplitude(): number {
      analyser.getByteTimeDomainData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128
        sum += v * v
      }
      return Math.min(1, Math.sqrt(sum / dataArray.length) * 4)
    },

    connectSource(source: AudioNode): void {
      source.connect(analyser)
    },

    destroy(): void {
      analyser.disconnect()
    },
  }
}
