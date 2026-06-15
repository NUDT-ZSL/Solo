export interface PresetMusic {
  name: string
  duration: number
  description: string
  generate: (sampleRate: number, duration: number) => Float32Array
}

const presets: PresetMusic[] = [
  {
    name: '动感节拍 (10秒)',
    duration: 10,
    description: '快速电子节拍，适合演示粒子效果',
    generate: (sampleRate, duration) => {
      const length = Math.floor(sampleRate * duration)
      const output = new Float32Array(length)
      const bpm = 140
      const beatInterval = 60 / bpm

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        let sample = 0

        const beatPhase = (t % beatInterval) / beatInterval
        if (beatPhase < 0.1) {
          const kickEnv = Math.exp(-beatPhase * 30)
          sample += Math.sin(2 * Math.PI * (60 - beatPhase * 40) * t) * 0.5 * kickEnv
        }

        if (Math.floor(t / (beatInterval / 2)) % 2 === 1) {
          const snarePhase = ((t % (beatInterval / 2)) / (beatInterval / 2))
          if (snarePhase < 0.15) {
            const snareEnv = Math.exp(-snarePhase * 25)
            const noise = Math.random() * 2 - 1
            sample += noise * 0.3 * snareEnv
          }
        }

        const bassNotes = [55, 65.41, 82.41, 65.41]
        const noteIndex = Math.floor(t / (beatInterval * 4)) % bassNotes.length
        const noteFreq = bassNotes[noteIndex]
        const bassPhase = ((t % (beatInterval * 4)) / (beatInterval * 4))
        const bassEnv = Math.exp(-bassPhase * 2) * 0.3 + 0.1
        sample += Math.sin(2 * Math.PI * noteFreq * t) * 0.25 * bassEnv

        const melodyFreqs = [440, 523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 659.25]
        const melIndex = Math.floor(t / beatInterval) % melodyFreqs.length
        const melFreq = melodyFreqs[melIndex]
        const melPhase = ((t % beatInterval) / beatInterval)
        const melEnv = Math.exp(-melPhase * 4) * 0.5
        sample += Math.sin(2 * Math.PI * melFreq * t) * 0.12 * melEnv
        sample += Math.sin(2 * Math.PI * melFreq * 2 * t) * 0.06 * melEnv

        const hihatPhase = ((t % (beatInterval / 4)) / (beatInterval / 4))
        if (hihatPhase < 0.05) {
          const hhEnv = Math.exp(-hihatPhase * 80)
          const noise = Math.random() * 2 - 1
          sample += noise * 0.15 * hhEnv
        }

        output[i] = Math.max(-1, Math.min(1, sample))
      }

      const fadeLen = Math.floor(sampleRate * 0.05)
      for (let i = 0; i < fadeLen; i++) {
        const f = i / fadeLen
        output[i] *= f
        output[length - 1 - i] *= f
      }

      return output
    }
  },
  {
    name: '氛围音乐 (30秒)',
    duration: 30,
    description: '舒缓的环境音效，带有丰富的频率变化',
    generate: (sampleRate, duration) => {
      const length = Math.floor(sampleRate * duration)
      const output = new Float32Array(length)

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        let sample = 0

        const pad1 = Math.sin(2 * Math.PI * 110 * t) * 0.15
        const pad2 = Math.sin(2 * Math.PI * 164.81 * t + Math.sin(t * 0.3) * 0.5) * 0.12
        const pad3 = Math.sin(2 * Math.PI * 220 * t + Math.cos(t * 0.2) * 0.3) * 0.1
        sample += pad1 + pad2 + pad3

        const arpNotes = [261.63, 329.63, 392, 523.25, 659.25, 523.25, 392, 329.63]
        const arpInterval = 0.25
        const arpIndex = Math.floor(t / arpInterval) % arpNotes.length
        const arpFreq = arpNotes[arpIndex]
        const arpPhase = ((t % arpInterval) / arpInterval)
        const arpEnv = Math.exp(-arpPhase * 6)
        sample += Math.sin(2 * Math.PI * arpFreq * t) * 0.08 * arpEnv
        sample += Math.sin(2 * Math.PI * arpFreq * 3 * t) * 0.03 * arpEnv

        const bellFreq = 880 + Math.sin(t * 0.5) * 100
        const bellPhase = (t % 3) / 3
        const bellEnv = Math.exp(-bellPhase * 4) * 0.3
        if (bellEnv > 0.01) {
          sample += Math.sin(2 * Math.PI * bellFreq * t) * 0.06 * bellEnv
          sample += Math.sin(2 * Math.PI * bellFreq * 2.01 * t) * 0.04 * bellEnv
        }

        const pulseFreq = 440 + Math.sin(t * 1.5) * 220
        const pulsePhase = ((t * 0.5) % 1)
        const pulseEnv = (Math.sin(pulsePhase * Math.PI)) ** 2
        sample += Math.sin(2 * Math.PI * pulseFreq * t) * 0.05 * pulseEnv
        sample += (Math.random() * 2 - 1) * 0.005 * pulseEnv

        output[i] = Math.max(-1, Math.min(1, sample))
      }

      const fadeLen = Math.floor(sampleRate * 1)
      for (let i = 0; i < fadeLen; i++) {
        const f = i / fadeLen
        output[i] *= f
        output[length - 1 - i] *= f
      }

      return output
    }
  },
  {
    name: '完整演示 (60秒)',
    duration: 60,
    description: '包含多种音乐风格变化的完整演示音乐',
    generate: (sampleRate, duration) => {
      const length = Math.floor(sampleRate * duration)
      const output = new Float32Array(length)
      const sectionLength = duration / 4

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        const section = Math.floor(t / sectionLength)
        const sectionT = (t % sectionLength) / sectionLength
        let sample = 0

        if (section === 0) {
          const env = Math.sin(sectionT * Math.PI)
          const notes = [261.63, 329.63, 392, 523.25]
          for (let n = 0; n < 4; n++) {
            const noteT = ((t + n * 0.1) % 2) / 2
            const noteEnv = Math.exp(-noteT * 3)
            sample += Math.sin(2 * Math.PI * notes[n] * t) * 0.1 * noteEnv * env
          }
          sample += (Math.random() * 2 - 1) * 0.01 * env
        } else if (section === 1) {
          const bpm = 120
          const beatInterval = 60 / bpm
          const beatPhase = (t % beatInterval) / beatInterval

          if (beatPhase < 0.12) {
            const kick = Math.exp(-beatPhase * 25)
            sample += Math.sin(2 * Math.PI * (70 - beatPhase * 50) * t) * 0.4 * kick
          }

          const bassLine = [82.41, 82.41, 110, 98, 82.41, 82.41, 110, 130.81]
          const bassIndex = Math.floor(t / (beatInterval / 2)) % bassLine.length
          const bassFreq = bassLine[bassIndex]
          const bassEnv = 0.3
          sample += Math.sin(2 * Math.PI * bassFreq * t) * bassEnv
          sample += (Math.random() * 2 - 1) * 0.05 * bassEnv

          const leadFreq = 440 + Math.sin(t * 4) * 200
          sample += Math.sin(2 * Math.PI * leadFreq * t) * 0.08
          sample += Math.sin(2 * Math.PI * leadFreq * 1.5 * t) * 0.04

          if (Math.floor(t * 4) % 2 === 0) {
            const hhPhase = ((t * 4) % 1)
            if (hhPhase < 0.05) {
              sample += (Math.random() * 2 - 1) * 0.15 * Math.exp(-hhPhase * 100)
            }
          }
        } else if (section === 2) {
          const chordProg = [
            [261.63, 329.63, 392],
            [220, 277.18, 329.63],
            [174.61, 220, 261.63],
            [196, 246.94, 293.66]
          ]
          const chordIndex = Math.floor(t / 4) % chordProg.length
          const chord = chordProg[chordIndex]

          for (const f of chord) {
            sample += Math.sin(2 * Math.PI * f * t) * 0.08
            sample += Math.sin(2 * Math.PI * f * 2 * t) * 0.04
          }

          const melInterval = 0.3
          const melNotes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 783.99, 659.25]
          const mIdx = Math.floor(t / melInterval) % melNotes.length
          const mFreq = melNotes[mIdx]
          const mPhase = ((t % melInterval) / melInterval)
          const mEnv = Math.exp(-mPhase * 5)
          sample += Math.sin(2 * Math.PI * mFreq * t) * 0.15 * mEnv

          const rippleFreq = 1500 + Math.sin(t * 8) * 500
          sample += Math.sin(2 * Math.PI * rippleFreq * t) * 0.02 * Math.abs(Math.sin(t * 2))
        } else {
          const fadeOut = 1 - sectionT * 0.8

          const frequencies = [130.81, 164.81, 196, 261.63, 329.63, 392, 523.25]
          for (let n = 0; n < frequencies.length; n++) {
            const f = frequencies[n]
            const detune = Math.sin(t * 0.5 + n) * 2
            const amp = 0.06 * (1 + Math.sin(t * 0.3 + n * 0.5))
            sample += Math.sin(2 * Math.PI * (f + detune) * t) * amp * fadeOut
          }

          const bpm = 90
          const beatInt = 60 / bpm
          const beatP = (t % beatInt) / beatInt
          if (beatP < 0.1) {
            const kickEnv = Math.exp(-beatP * 30)
            sample += Math.sin(2 * Math.PI * 60 * t) * 0.35 * kickEnv * fadeOut
          }

          if (Math.random() < 0.01) {
            sample += (Math.random() * 2 - 1) * 0.05 * fadeOut
          }
        }

        output[i] = Math.max(-1, Math.min(1, sample))
      }

      return output
    }
  }
]

export function getPresetMusic(index: number): PresetMusic {
  return presets[index]
}

export function getAllPresets(): PresetMusic[] {
  return presets
}

export async function generatePresetAudioBuffer(
  preset: PresetMusic,
  sampleRate = 44100
): Promise<AudioBuffer> {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  const monoData = preset.generate(sampleRate, preset.duration)
  const buffer = ctx.createBuffer(2, monoData.length, sampleRate)

  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < monoData.length; i++) {
    left[i] = monoData[i]
    right[i] = monoData[i]
  }

  ctx.close()
  return buffer
}

export function audioBufferToArrayBuffer(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  const samples = buffer.length
  const dataSize = samples * blockAlign
  const bufferSize = 44 + dataSize

  const ab = new ArrayBuffer(bufferSize)
  const view = new DataView(ab)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = buffer.getChannelData(ch)[i]
      sample = Math.max(-1, Math.min(1, sample))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return ab
}
