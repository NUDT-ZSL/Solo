import * as THREE from 'three'
import type { Emotion } from './textParser'

const EMOTION_COLORS: Record<Emotion, { primary: THREE.Color; secondary: THREE.Color; line: THREE.Color }> = {
  positive: {
    primary: new THREE.Color('#FFD700'),
    secondary: new THREE.Color('#FF8C00'),
    line: new THREE.Color('#FFAA33'),
  },
  negative: {
    primary: new THREE.Color('#4169E1'),
    secondary: new THREE.Color('#9370DB'),
    line: new THREE.Color('#6A5ACD'),
  },
  neutral: {
    primary: new THREE.Color('#88CCFF'),
    secondary: new THREE.Color('#AADDFF'),
    line: new THREE.Color('#99BBDD'),
  },
}

export function getEmotionColors(emotion: Emotion) {
  return EMOTION_COLORS[emotion]
}

export function getEmotionColorArray(emotion: Emotion): Float32Array {
  const colors = EMOTION_COLORS[emotion]
  const arr = new Float32Array(9)
  colors.primary.toArray(arr, 0)
  colors.secondary.toArray(arr, 3)
  colors.line.toArray(arr, 6)
  return arr
}

export function lerpColorByEmotion(
  emotion: Emotion,
  t: number
): THREE.Color {
  const colors = EMOTION_COLORS[emotion]
  return new THREE.Color().lerpColors(colors.primary, colors.secondary, t)
}
