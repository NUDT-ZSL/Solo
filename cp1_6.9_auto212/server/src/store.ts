import { v4 as uuidv4 } from 'uuid'

export interface Pin {
  id: string
  offsetX: number
  offsetY: number
}

export interface Component {
  id: string
  type: 'resistor' | 'capacitor' | 'battery' | 'switch'
  x: number
  y: number
  rotation: number
  properties: Record<string, string>
  pins: Pin[]
}

export interface Wire {
  id: string
  fromComponentId: string
  fromPinId: string
  toComponentId: string
  toPinId: string
  controlPoints: { x: number; y: number }[]
}

export interface Comment {
  id: string
  userId: string
  username: string
  text: string
  timestamp: number
}

export interface Circuit {
  id: string
  name: string
  components: Component[]
  wires: Wire[]
  comments: Comment[]
  createdAt: number
  updatedAt: number
  shared: boolean
  shareToken?: string
}

export interface VersionSnapshot {
  id: string
  circuitId: string
  timestamp: number
  name: string
  components: Component[]
  wires: Wire[]
}

class Store {
  private circuits: Map<string, Circuit> = new Map()
  private versions: Map<string, VersionSnapshot[]> = new Map()
  private sseClients: Map<string, Set<(data: any) => void>> = new Map()

  constructor() {
    const demoCircuitId = uuidv4()
    const demoCircuit: Circuit = {
      id: demoCircuitId,
      name: '示例电路 - RC振荡器',
      components: [
        {
          id: uuidv4(),
          type: 'battery',
          x: 200,
          y: 200,
          rotation: 0,
          properties: { voltage: '9V' },
          pins: [
            { id: uuidv4(), offsetX: -30, offsetY: 0 },
            { id: uuidv4(), offsetX: 30, offsetY: 0 }
          ]
        },
        {
          id: uuidv4(),
          type: 'resistor',
          x: 400,
          y: 200,
          rotation: 0,
          properties: { resistance: '10kΩ' },
          pins: [
            { id: uuidv4(), offsetX: -30, offsetY: 0 },
            { id: uuidv4(), offsetX: 30, offsetY: 0 }
          ]
        },
        {
          id: uuidv4(),
          type: 'capacitor',
          x: 600,
          y: 200,
          rotation: 0,
          properties: { capacitance: '100nF' },
          pins: [
            { id: uuidv4(), offsetX: -25, offsetY: 0 },
            { id: uuidv4(), offsetX: 25, offsetY: 0 }
          ]
        }
      ],
      wires: [],
      comments: [
        {
          id: uuidv4(),
          userId: 'user-demo',
          username: '系统消息',
          text: '欢迎使用芯桥！拖拽左侧元件到画布开始设计您的电路。',
          timestamp: Date.now() - 60000
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      shared: false
    }
    this.circuits.set(demoCircuitId, demoCircuit)
    this.versions.set(demoCircuitId, [])
  }

  createCircuit(name: string): Circuit {
    const id = uuidv4()
    const circuit: Circuit = {
      id,
      name,
      components: [],
      wires: [],
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      shared: false
    }
    this.circuits.set(id, circuit)
    this.versions.set(id, [])
    return circuit
  }

  getCircuit(id: string): Circuit | undefined {
    return this.circuits.get(id)
  }

  getCircuits(): Circuit[] {
    return Array.from(this.circuits.values()).map(c => ({
      ...c,
      components: [],
      wires: []
    }))
  }

  updateCircuit(id: string, data: Partial<Circuit>): Circuit | undefined {
    const circuit = this.circuits.get(id)
    if (!circuit) return undefined
    const updated: Circuit = {
      ...circuit,
      ...data,
      updatedAt: Date.now()
    }
    this.circuits.set(id, updated)
    return updated
  }

  deleteCircuit(id: string): boolean {
    this.versions.delete(id)
    return this.circuits.delete(id)
  }

  createVersion(circuitId: string, name?: string): VersionSnapshot | undefined {
    const circuit = this.circuits.get(circuitId)
    if (!circuit) return undefined

    const snapshot: VersionSnapshot = {
      id: uuidv4(),
      circuitId,
      timestamp: Date.now(),
      name: name || `快照 ${new Date().toLocaleString()}`,
      components: JSON.parse(JSON.stringify(circuit.components)),
      wires: JSON.parse(JSON.stringify(circuit.wires))
    }

    const versions = this.versions.get(circuitId) || []
    versions.push(snapshot)
    this.versions.set(circuitId, versions)
    return snapshot
  }

  getVersions(circuitId: string): VersionSnapshot[] {
    return this.versions.get(circuitId) || []
  }

  restoreVersion(circuitId: string, versionId: string): Circuit | undefined {
    const versions = this.versions.get(circuitId) || []
    const version = versions.find(v => v.id === versionId)
    if (!version) return undefined

    const circuit = this.circuits.get(circuitId)
    if (!circuit) return undefined

    const updated: Circuit = {
      ...circuit,
      components: JSON.parse(JSON.stringify(version.components)),
      wires: JSON.parse(JSON.stringify(version.wires)),
      updatedAt: Date.now()
    }
    this.circuits.set(circuitId, updated)
    return updated
  }

  addComment(circuitId: string, comment: Omit<Comment, 'id' | 'timestamp'>): Comment | undefined {
    const circuit = this.circuits.get(circuitId)
    if (!circuit) return undefined

    const newComment: Comment = {
      ...comment,
      id: uuidv4(),
      timestamp: Date.now()
    }
    circuit.comments.push(newComment)
    circuit.updatedAt = Date.now()
    this.broadcast(circuitId, { type: 'comment', data: newComment })
    return newComment
  }

  getComments(circuitId: string): Comment[] {
    return this.circuits.get(circuitId)?.comments || []
  }

  createShareLink(circuitId: string): { token: string; url: string } | undefined {
    const circuit = this.circuits.get(circuitId)
    if (!circuit) return undefined
    const token = uuidv4().replace(/-/g, '').substring(0, 16)
    circuit.shared = true
    circuit.shareToken = token
    this.circuits.set(circuitId, circuit)
    return { token, url: `/share/${token}` }
  }

  getCircuitByShareToken(token: string): Circuit | undefined {
    for (const circuit of this.circuits.values()) {
      if (circuit.shareToken === token) {
        return {
          ...circuit,
          comments: circuit.comments
        }
      }
    }
    return undefined
  }

  subscribe(circuitId: string, client: (data: any) => void): () => void {
    if (!this.sseClients.has(circuitId)) {
      this.sseClients.set(circuitId, new Set())
    }
    this.sseClients.get(circuitId)!.add(client)
    return () => {
      this.sseClients.get(circuitId)?.delete(client)
    }
  }

  broadcast(circuitId: string, data: any): void {
    const clients = this.sseClients.get(circuitId)
    if (!clients) return
    for (const client of clients) {
      try {
        client(data)
      } catch (e) {
        // ignore
      }
    }
  }
}

export const store = new Store()
