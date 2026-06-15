import * as THREE from 'three'
import { ParticleEmitter } from './ParticleEmitter'
import { RockLayer } from './RockLayer'
import { useLavaStore } from './store'

interface LavaFlow {
  mesh: THREE.Mesh
  origin: THREE.Vector3
  radius: number
  maxRadius: number
  temperature: number
  age: number
  isJunction: boolean
}

interface EruptionAnimation {
  column: THREE.Mesh
  origin: THREE.Vector3
  age: number
  maxAge: number
  maxHeight: number
}

const lavaVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const lavaFragmentShader = `
  uniform float uTime;
  uniform float uTemperature;
  uniform float uFlowSpeed;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 flowUv = vWorldPos.xz * 0.5 + vec2(uTime * 0.08 * uFlowSpeed, uTime * 0.04 * uFlowSpeed);
    float n = fbm(flowUv);
    float n2 = fbm(flowUv * 1.5 + 3.7);

    float dist = length(vUv - 0.5) * 2.0;
    float edge = 1.0 - smoothstep(0.7, 1.0, dist);

    vec3 hotColor = vec3(1.0, 0.65, 0.1);
    vec3 warmColor = vec3(0.85, 0.2, 0.02);
    vec3 coolColor = vec3(0.15, 0.06, 0.03);
    vec3 solidColor = vec3(0.08, 0.06, 0.06);

    float temp = uTemperature;
    vec3 color;
    if (temp > 0.7) {
      color = mix(warmColor, hotColor, (temp - 0.7) / 0.3);
      color += vec3(n * 0.3, n * 0.15, n * 0.02);
    } else if (temp > 0.3) {
      color = mix(coolColor, warmColor, (temp - 0.3) / 0.4);
      color += vec3(n * 0.1, n * 0.03, 0.0);
    } else if (temp > 0.1) {
      color = mix(solidColor, coolColor, (temp - 0.1) / 0.2);
    } else {
      color = solidColor;
    }

    float glow = n2 * temp * 0.5;

    float alpha = edge * (0.6 + 0.4 * temp);
    if (temp > 0.3) {
      alpha = edge;
    }

    gl_FragColor = vec4(color + vec3(glow, glow * 0.3, 0.0), alpha);
  }
`

export class LavaSystem {
  group: THREE.Group
  flows: LavaFlow[]
  eruptions: EruptionAnimation[]
  particleEmitter: ParticleEmitter
  rockLayer: RockLayer
  sourcePoints: THREE.Vector3[]
  junctionPoints: THREE.Vector3[]
  time: number
  clickables: THREE.Mesh[]

  constructor(particleEmitter: ParticleEmitter, rockLayer: RockLayer) {
    this.group = new THREE.Group()
    this.flows = []
    this.eruptions = []
    this.particleEmitter = particleEmitter
    this.rockLayer = rockLayer
    this.time = 0
    this.clickables = []

    this.sourcePoints = [
      new THREE.Vector3(-4, 0, -3),
      new THREE.Vector3(3, 0, -4),
      new THREE.Vector3(-3, 0, 4),
      new THREE.Vector3(4, 0, 3),
    ]

    this.junctionPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-1, 0, 1),
      new THREE.Vector3(2, 0, -1),
    ]

    this.initFlows()
  }

  private createLavaMaterial(temperature: number, flowSpeed: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTemperature: { value: temperature },
        uFlowSpeed: { value: flowSpeed },
      },
      vertexShader: lavaVertexShader,
      fragmentShader: lavaFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  }

  private initFlows() {
    for (const source of this.sourcePoints) {
      this.createFlow(source, 3 + Math.random() * 3, false)
    }

    for (const junction of this.junctionPoints) {
      this.createFlow(junction, 1.5 + Math.random() * 2, true)
    }
  }

  private createFlow(origin: THREE.Vector3, maxRadius: number, isJunction: boolean) {
    const segments = 48
    const geo = new THREE.CircleGeometry(0.1, segments)
    geo.rotateX(-Math.PI / 2)

    const material = this.createLavaMaterial(1.0, 1.0)
    const mesh = new THREE.Mesh(geo, material)
    mesh.position.copy(origin)
    mesh.position.y = 0.01
    mesh.userData = { isJunction, origin: origin.clone() }
    this.group.add(mesh)

    const flow: LavaFlow = {
      mesh,
      origin: origin.clone(),
      radius: 0.1,
      maxRadius,
      temperature: 1.0,
      age: 0,
      isJunction,
    }
    this.flows.push(flow)
    this.clickables.push(mesh)
  }

  triggerEruption(point: THREE.Vector3) {
    const height = 4 + Math.random() * 4
    const columnGeo = new THREE.CylinderGeometry(0.15, 0.5, 0.1, 16)
    const columnMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.9,
    })
    const column = new THREE.Mesh(columnGeo, columnMat)
    column.position.copy(point)
    column.position.y = 0.05
    this.group.add(column)

    this.eruptions.push({
      column,
      origin: point.clone(),
      age: 0,
      maxAge: 3.0,
      maxHeight: height,
    })

    const density = useLavaStore.getState().particleDensity
    this.particleEmitter.spawnEruption(point, density)
    this.rockLayer.triggerEruption(point)

    const store = useLavaStore.getState()
    store.triggerEruption({
      id: `eruption-${Date.now()}`,
      position: [point.x, point.y, point.z],
      temperature: 800 + Math.random() * 400,
      flowRate: 1 + Math.random() * 4,
      pressure: 10 + Math.random() * 40,
      timestamp: Date.now(),
    })
  }

  handleClick(raycaster: THREE.Raycaster): boolean {
    const intersects = raycaster.intersectObjects(this.clickables)
    if (intersects.length > 0) {
      const hit = intersects[0]
      const point = hit.point
      this.triggerEruption(point)
      return true
    }
    return false
  }

  update(delta: number) {
    this.time += delta
    const store = useLavaStore.getState()
    const lavaSpeed = store.lavaSpeed
    const coolingRate = store.coolingRate
    const particleDensity = store.particleDensity

    for (const flow of this.flows) {
      flow.age += delta

      if (flow.radius < flow.maxRadius) {
        flow.radius += delta * 0.3 * lavaSpeed
        flow.radius = Math.min(flow.radius, flow.maxRadius)

        const scale = flow.radius / 0.1
        flow.mesh.scale.set(scale, 1, scale)
      }

      flow.temperature -= delta * 0.05 * coolingRate
      flow.temperature = Math.max(0.02, flow.temperature)

      const mat = flow.mesh.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = this.time
      mat.uniforms.uTemperature.value = flow.temperature
      mat.uniforms.uFlowSpeed.value = lavaSpeed

      if (flow.temperature > 0.3 && Math.random() < 0.05 * particleDensity) {
        const angle = Math.random() * Math.PI * 2
        const r = Math.random() * flow.radius * 0.8
        const spawnPos = new THREE.Vector3(
          flow.origin.x + Math.cos(angle) * r,
          0.1,
          flow.origin.z + Math.sin(angle) * r
        )
        this.particleEmitter.spawnAmbient(spawnPos, particleDensity)
      }
    }

    for (let i = this.eruptions.length - 1; i >= 0; i--) {
      const eruption = this.eruptions[i]
      eruption.age += delta
      const t = eruption.age / eruption.maxAge

      if (t >= 1.0) {
        this.group.remove(eruption.column)
        eruption.column.geometry.dispose()
        ;(eruption.column.material as THREE.Material).dispose()
        this.eruptions.splice(i, 1)
        continue
      }

      const currentHeight = eruption.maxHeight * Math.sin(t * Math.PI)
      const hScale = currentHeight / 0.1
      eruption.column.scale.set(
        1.0 + Math.sin(t * Math.PI) * 0.5,
        Math.max(0.01, hScale),
        1.0 + Math.sin(t * Math.PI) * 0.5
      )
      eruption.column.position.y = currentHeight / 2

      const mat = eruption.column.material as THREE.MeshBasicMaterial
      mat.opacity = 0.9 * (1.0 - t)
      const r = 1.0
      const g = 0.3 + 0.3 * (1.0 - t)
      const b = 0.02
      mat.color.setRGB(r, g, b)
    }
  }

  reset() {
    for (const flow of this.flows) {
      this.group.remove(flow.mesh)
      flow.mesh.geometry.dispose()
      ;(flow.mesh.material as THREE.Material).dispose()
    }
    this.flows = []
    this.clickables = []

    for (const eruption of this.eruptions) {
      this.group.remove(eruption.column)
      eruption.column.geometry.dispose()
      ;(eruption.column.material as THREE.Material).dispose()
    }
    this.eruptions = []

    this.time = 0
    this.initFlows()
  }
}
