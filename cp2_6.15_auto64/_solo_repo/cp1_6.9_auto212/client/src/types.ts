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

export interface ComponentDefinition {
  type: Component['type']
  name: string
  symbol: string
  defaultProps: Record<string, string>
  pins: { offsetX: number; offsetY: number }[]
}

export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  {
    type: 'resistor',
    name: '电阻',
    symbol: 'R',
    defaultProps: { resistance: '10kΩ' },
    pins: [
      { offsetX: -30, offsetY: 0 },
      { offsetX: 30, offsetY: 0 }
    ]
  },
  {
    type: 'capacitor',
    name: '电容',
    symbol: 'C',
    defaultProps: { capacitance: '100nF' },
    pins: [
      { offsetX: -25, offsetY: 0 },
      { offsetX: 25, offsetY: 0 }
    ]
  },
  {
    type: 'battery',
    name: '电池',
    symbol: 'V',
    defaultProps: { voltage: '9V' },
    pins: [
      { offsetX: -30, offsetY: 0 },
      { offsetX: 30, offsetY: 0 }
    ]
  },
  {
    type: 'switch',
    name: '开关',
    symbol: 'S',
    defaultProps: { state: 'off' },
    pins: [
      { offsetX: -25, offsetY: 0 },
      { offsetX: 25, offsetY: 0 }
    ]
  }
]
