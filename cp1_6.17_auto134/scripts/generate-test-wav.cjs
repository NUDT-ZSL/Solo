const fs = require('fs')
const path = require('path')

const SAMPLE_RATE = 44100
const DURATION_SEC = 15
const NUM_SAMPLES = SAMPLE_RATE * DURATION_SEC
const OUTPUT = path.join(__dirname, '..', 'test-climax.wav')

function writeString(buf, offset, str) {
  for (let i = 0; i < str.length; i++) buf[offset + i] = str.charCodeAt(i)
}

function writeUint16(buf, offset, v) {
  buf[offset] = v & 0xff
  buf[offset + 1] = (v >> 8) & 0xff
}

function writeUint32(buf, offset, v) {
  buf[offset] = v & 0xff
  buf[offset + 1] = (v >> 8) & 0xff
  buf[offset + 2] = (v >> 16) & 0xff
  buf[offset + 3] = (v >> 24) & 0xff
}

const dataSize = NUM_SAMPLES * 2
const buffer = Buffer.alloc(44 + dataSize)

writeString(buffer, 0, 'RIFF')
writeUint32(buffer, 4, 36 + dataSize)
writeString(buffer, 8, 'WAVE')
writeString(buffer, 12, 'fmt ')
writeUint32(buffer, 16, 16)
writeUint16(buffer, 20, 1)
writeUint16(buffer, 22, 1)
writeUint32(buffer, 24, SAMPLE_RATE)
writeUint32(buffer, 28, SAMPLE_RATE * 2)
writeUint16(buffer, 32, 2)
writeUint16(buffer, 34, 16)
writeString(buffer, 36, 'data')
writeUint32(buffer, 40, dataSize)

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE
  let amplitude = 0.1

  if (t >= 5 && t < 10) {
    const local = (t - 5) / 5
    const envelope = Math.sin(local * Math.PI)
    amplitude = 0.1 + 0.55 * envelope
  } else if (t >= 10 && t < 11) {
    amplitude = 0.1 + 0.1 * (1 - (t - 10))
  } else if (t >= 12.5 && t < 13.5) {
    const local = (t - 12.5) / 1
    const envelope = Math.sin(local * Math.PI)
    amplitude = 0.1 + 0.5 * envelope
  }

  let sample = 0
  sample += Math.sin(2 * Math.PI * 60 * t) * 0.5
  sample += Math.sin(2 * Math.PI * 120 * t) * 0.3
  sample += Math.sin(2 * Math.PI * 250 * t) * 0.15

  if (t >= 5 && t < 10) {
    sample += Math.sin(2 * Math.PI * 440 * t) * 0.25
    sample += Math.sin(2 * Math.PI * 880 * t) * 0.2
    sample += Math.sin(2 * Math.PI * 1760 * t) * 0.15
  }

  if (t >= 12.5 && t < 13.5) {
    sample += Math.sin(2 * Math.PI * 520 * t) * 0.2
    sample += Math.sin(2 * Math.PI * 1040 * t) * 0.18
  }

  sample *= amplitude
  sample = Math.max(-1, Math.min(1, sample))

  const intVal = Math.round(sample * 32767)
  const offset = 44 + i * 2
  writeUint16(buffer, offset, intVal & 0xffff)
}

fs.writeFileSync(OUTPUT, buffer)
console.log('Wrote:', OUTPUT)
console.log('Size:', (buffer.length / 1024).toFixed(1), 'KB')
console.log('Duration:', DURATION_SEC, 's')
console.log('Climax windows: 5-10s (main), 12.5-13.5s (short)')
