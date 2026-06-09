import { FiberData, NodeData } from './dataGenerator'

export interface NodePulseState {
  scaleMultiplier: number
  emissiveBoost: number
  startTime: number
  duration: number
}

export interface FiberWaveState {
  startTime: number
  duration: number
  amplitude: number
  active: boolean
}

export interface NodeBounceState {
  startTime: number
  duration: number
  offset: [number, number, number]
  direction: [number, number, number]
}

export interface HoverState {
  isHovered: boolean
  startTime: number
  fadeDuration: number
}

export interface InteractionState {
  nodePulses: Map<number, NodePulseState>
  fiberWaves: Map<string, FiberWaveState>
  nodeBounces: Map<number, NodeBounceState>
  nodeHover: Map<number, HoverState>
  adjacentFibers: Map<number, Set<string>>
  adjacentNodes: Map<number, Set<number>>
}

export function createInteractionState(nodes: NodeData[], fibers: FiberData[]): InteractionState {
  const adjacentFibers = new Map<number, Set<string>>()
  const adjacentNodes = new Map<number, Set<number>>()

  nodes.forEach((node) => {
    adjacentFibers.set(node.id, new Set())
    adjacentNodes.set(node.id, new Set())
  })

  fibers.forEach((fiber) => {
    adjacentFibers.get(fiber.nodeAId)?.add(fiber.id)
    adjacentFibers.get(fiber.nodeBId)?.add(fiber.id)
    adjacentNodes.get(fiber.nodeAId)?.add(fiber.nodeBId)
    adjacentNodes.get(fiber.nodeBId)?.add(fiber.nodeAId)
  })

  return {
    nodePulses: new Map(),
    fiberWaves: new Map(),
    nodeBounces: new Map(),
    nodeHover: new Map(),
    adjacentFibers,
    adjacentNodes,
  }
}

export function triggerNodeClick(
  state: InteractionState,
  nodeId: number,
  nodes: NodeData[],
  currentTime: number
): void {
  state.nodePulses.set(nodeId, {
    scaleMultiplier: 1.5,
    emissiveBoost: 0.5,
    startTime: currentTime,
    duration: 300,
  })

  const connectedFibers = state.adjacentFibers.get(nodeId)
  if (connectedFibers) {
    connectedFibers.forEach((fiberId) => {
      state.fiberWaves.set(fiberId, {
        startTime: currentTime,
        duration: 400,
        amplitude: 0.2,
        active: true,
      })
    })
  }

  const connectedNodeIds = state.adjacentNodes.get(nodeId)
  const clickedNode = nodes.find((n) => n.id === nodeId)
  if (connectedNodeIds && clickedNode) {
    connectedNodeIds.forEach((connectedId) => {
      const connNode = nodes.find((n) => n.id === connectedId)
      if (connNode) {
        const dx = connNode.initialPosition[0] - clickedNode.initialPosition[0]
        const dy = connNode.initialPosition[1] - clickedNode.initialPosition[1]
        const dz = connNode.initialPosition[2] - clickedNode.initialPosition[2]
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
        const bounceOffset = 0.1

        state.nodeBounces.set(connectedId, {
          startTime: currentTime,
          duration: 100,
          offset: [0, 0, 0],
          direction: [
            (dx / len) * bounceOffset,
            (dy / len) * bounceOffset,
            (dz / len) * bounceOffset,
          ],
        })
      }
    })
  }
}

export function triggerNodeHover(
  state: InteractionState,
  nodeId: number,
  isHovered: boolean,
  currentTime: number
): void {
  state.nodeHover.set(nodeId, {
    isHovered,
    startTime: currentTime,
    fadeDuration: 1000,
  })
}

export function getPulseScale(state: InteractionState, nodeId: number, currentTime: number): number {
  const pulse = state.nodePulses.get(nodeId)
  if (!pulse) return 1
  const elapsed = currentTime - pulse.startTime
  if (elapsed >= pulse.duration) return 1
  const t = elapsed / pulse.duration
  const easeOut = 1 - Math.pow(1 - t, 3)
  return 1 + (pulse.scaleMultiplier - 1) * (1 - easeOut)
}

export function getPulseEmissive(state: InteractionState, nodeId: number, currentTime: number): number {
  const pulse = state.nodePulses.get(nodeId)
  if (!pulse) return 0
  const elapsed = currentTime - pulse.startTime
  if (elapsed >= pulse.duration) return 0
  const t = elapsed / pulse.duration
  const easeOut = 1 - Math.pow(1 - t, 3)
  return pulse.emissiveBoost * (1 - easeOut)
}

export function getFiberWaveOffset(
  state: InteractionState,
  fiberId: string,
  tParam: number,
  currentTime: number
): number {
  const wave = state.fiberWaves.get(fiberId)
  if (!wave || !wave.active) return 0
  const elapsed = currentTime - wave.startTime
  if (elapsed >= wave.duration) return 0
  const progress = elapsed / wave.duration
  const decay = 1 - progress
  const wavePhase = Math.sin(progress * Math.PI * 2 - Math.PI / 2)
  const positionFactor = Math.sin(tParam * Math.PI)
  return wave.amplitude * decay * positionFactor * (0.5 + 0.5 * wavePhase)
}

export function getNodeBounceOffset(
  state: InteractionState,
  nodeId: number,
  currentTime: number
): [number, number, number] {
  const bounce = state.nodeBounces.get(nodeId)
  if (!bounce) return [0, 0, 0]
  const elapsed = currentTime - bounce.startTime
  if (elapsed >= bounce.duration) return [0, 0, 0]
  const t = elapsed / bounce.duration
  const easeOut = 1 - Math.pow(1 - t, 2)
  const factor = 1 - easeOut
  return [
    bounce.direction[0] * factor,
    bounce.direction[1] * factor,
    bounce.direction[2] * factor,
  ]
}

export function getHoverIntensity(state: InteractionState, nodeId: number, currentTime: number): number {
  const hover = state.nodeHover.get(nodeId)
  if (!hover) return 0
  const elapsed = currentTime - hover.startTime
  const progress = Math.min(elapsed / hover.fadeDuration, 1)
  return hover.isHovered ? progress : 1 - progress
}

export function getFiberHighlightOpacity(
  state: InteractionState,
  _fiberId: string,
  fiber: FiberData,
  currentTime: number
): number {
  const hoverA = state.nodeHover.get(fiber.nodeAId)
  const hoverB = state.nodeHover.get(fiber.nodeBId)

  let maxIntensity = 0

  if (hoverA) {
    const elapsed = currentTime - hoverA.startTime
    const progress = Math.min(elapsed / hoverA.fadeDuration, 1)
    const intensity = hoverA.isHovered ? progress : 1 - progress
    maxIntensity = Math.max(maxIntensity, intensity)
  }

  if (hoverB) {
    const elapsed = currentTime - hoverB.startTime
    const progress = Math.min(elapsed / hoverB.fadeDuration, 1)
    const intensity = hoverB.isHovered ? progress : 1 - progress
    maxIntensity = Math.max(maxIntensity, intensity)
  }

  const baseOpacity = 0.3
  const targetOpacity = 0.8
  return baseOpacity + (targetOpacity - baseOpacity) * maxIntensity
}

export function cleanupExpiredStates(state: InteractionState, currentTime: number): void {
  state.nodePulses.forEach((pulse, id) => {
    if (currentTime - pulse.startTime >= pulse.duration) {
      state.nodePulses.delete(id)
    }
  })

  state.fiberWaves.forEach((wave, id) => {
    if (currentTime - wave.startTime >= wave.duration) {
      state.fiberWaves.delete(id)
    }
  })

  state.nodeBounces.forEach((bounce, id) => {
    if (currentTime - bounce.startTime >= bounce.duration) {
      state.nodeBounces.delete(id)
    }
  })
}
