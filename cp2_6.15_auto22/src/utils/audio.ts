export function playLiquidSound(): void {
  try {
    const AudioContextClass = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    const ctx = new AudioContextClass()
    const duration = 1.5

    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate
      const envelope = Math.exp(-t * 2.5)
      const noise = (Math.random() * 2 - 1) * 0.15
      const bubble = Math.sin(2 * Math.PI * (200 + Math.sin(t * 8) * 100) * t) * 0.1
      const pour = Math.sin(2 * Math.PI * 120 * t) * 0.08 * (1 - t / duration)
      data[i] = (noise + bubble + pour) * envelope
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800

    const gain = ctx.createGain()
    gain.gain.value = 0.4

    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    source.start()
    source.onended = () => ctx.close()
  } catch {
    // Web Audio not available
  }
}
