import * as THREE from 'three'
import { useStore, type FragmentInfo } from './store'

const FRAGMENT_COUNT = 24
const COLORS = [
  { hex: '#ff3355', name: '绯红' },
  { hex: '#ff7733', name: '琥珀' },
  { hex: '#ffcc22', name: '鎏金' },
  { hex: '#33ff88', name: '翡翠' },
  { hex: '#3388ff', name: '蔚蓝' },
  { hex: '#8833ff', name: '紫晶' },
]

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRefractionIntensity;
  uniform float uHovered;
  uniform float uDimmed;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);

    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);

    vec3 refracted = refract(-viewDir, normal, 1.0 / max(uRefractionIntensity, 0.1));

    vec3 layer1 = uColor * 0.8;
    vec3 layer2 = uColor * 1.2 + refracted * 0.15;
    vec3 layer3 = uColor * 0.6 + vec3(0.1, 0.05, 0.15) * refracted.y;

    float layerMix = sin(vUv.y * 3.14159 + uTime * 0.5) * 0.5 + 0.5;
    vec3 refractedColor = mix(mix(layer1, layer2, layerMix), layer3, fresnel * 0.6);

    vec3 edgeGlow = uColor * 2.5 * fresnel;
    vec3 finalColor = mix(refractedColor, edgeGlow, fresnel * 0.5);

    float shimmer = sin(vWorldPos.x * 5.0 + uTime * 2.0) * sin(vWorldPos.y * 5.0 + uTime * 1.5) * 0.08;
    finalColor += uColor * shimmer;

    finalColor += uColor * uHovered * 0.8;
    finalColor *= 1.0 - uDimmed * 0.5;

    float alpha = uOpacity * (0.4 + 0.6 * fresnel);
    alpha = max(alpha, fresnel * 0.9);
    alpha *= (1.0 - uDimmed * 0.4);

    gl_FragColor = vec4(finalColor, alpha);
  }
`

interface FragmentData {
  mesh: THREE.Mesh
  colorHex: string
  colorName: string
  thickness: number
  refractionIndex: number
  originalPosition: THREE.Vector3
  originalRotation: THREE.Euler
  orbitAngle: number
  orbitRadius: number
  orbitSpeed: number
  selfRotSpeed: THREE.Vector3
  floatOffset: number
  floatAmplitude: number
  floatSpeed: number
  material: THREE.ShaderMaterial
  explodeProgress: number
  isExploding: boolean
  explodeDirection: THREE.Vector3
}

export class FragmentSystem {
  private fragments: FragmentData[] = []
  private group: THREE.Group
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private hoveredIndex: number = -1
  private camera: THREE.Camera
  private container: HTMLElement

  constructor(scene: THREE.Scene, camera: THREE.Camera, container: HTMLElement) {
    this.group = new THREE.Group()
    scene.add(this.group)
    this.camera = camera
    this.container = container
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2(-999, -999)

    this.createFragments()
    this.setupEvents()
  }

  private createIrregularShape(): THREE.Shape {
    const sides = Math.floor(Math.random() * 3) + 4
    const shape = new THREE.Shape()
    const angles: number[] = []
    for (let i = 0; i < sides; i++) {
      angles.push((Math.PI * 2 * i) / sides + (Math.random() - 0.5) * 0.5)
    }
    angles.sort((a, b) => a - b)

    for (let i = 0; i < angles.length; i++) {
      const r = 0.3 + Math.random() * 0.4
      const x = Math.cos(angles[i]) * r
      const y = Math.sin(angles[i]) * r
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return shape
  }

  private createFragments() {
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const colorData = COLORS[i % COLORS.length]
      const thickness = Math.round((0.02 + Math.random() * 0.08) * 100) / 100
      const refractionIndex = Math.round((1.3 + Math.random() * 0.7) * 100) / 100
      const scale = 0.6 + Math.random() * 1.2

      const shape = this.createIrregularShape()
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: thickness * 10,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
      })
      geometry.center()

      const color = new THREE.Color(colorData.hex)
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uColor: { value: color },
          uOpacity: { value: 0.7 },
          uRefractionIntensity: { value: 1.0 },
          uHovered: { value: 0.0 },
          uDimmed: { value: 0.0 },
          uTime: { value: 0.0 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.scale.setScalar(scale)

      const phi = Math.random() * Math.PI * 2
      const theta = Math.acos(2 * Math.random() - 1)
      const radius = 2.5 + Math.random() * 3.5
      const x = radius * Math.sin(theta) * Math.cos(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(theta)
      mesh.position.set(x, y, z)
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )

      this.group.add(mesh)

      this.fragments.push({
        mesh,
        colorHex: colorData.hex,
        colorName: colorData.name,
        thickness,
        refractionIndex,
        originalPosition: mesh.position.clone(),
        originalRotation: mesh.rotation.clone(),
        orbitAngle: phi,
        orbitRadius: radius,
        orbitSpeed: 0.05 + Math.random() * 0.1,
        selfRotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.01
        ),
        floatOffset: Math.random() * Math.PI * 2,
        floatAmplitude: 0.15 + Math.random() * 0.25,
        floatSpeed: 0.3 + Math.random() * 0.4,
        material,
        explodeProgress: 0,
        isExploding: false,
        explodeDirection: new THREE.Vector3(),
      })
    }
  }

  private setupEvents() {
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.container.addEventListener('click', this.onClick.bind(this))
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  private onClick(_e: MouseEvent) {
    if (this.hoveredIndex < 0) return
    const frag = this.fragments[this.hoveredIndex]
    if (!frag || frag.isExploding) return

    frag.isExploding = true
    frag.explodeProgress = 0
    frag.explodeDirection = frag.mesh.position.clone().normalize()

    const nearbyFragments = this.fragments.filter((f, idx) => {
      if (idx === this.hoveredIndex) return false
      return f.mesh.position.distanceTo(frag.mesh.position) < 3.0
    })
    nearbyFragments.forEach((f) => {
      if (!f.isExploding) {
        f.isExploding = true
        f.explodeProgress = 0
        f.explodeDirection = f.mesh.position.clone().sub(frag.mesh.position).normalize().multiplyScalar(0.5)
      }
    })

    useStore.getState().setClickedPosition(frag.mesh.position.clone())
  }

  public update(time: number, deltaTime: number) {
    const state = useStore.getState()
    const rotationSpeed = state.rotationSpeed
    const fragmentOpacity = state.fragmentOpacity
    const refractionIntensity = state.refractionIntensity

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const meshes = this.fragments.map((f) => f.mesh)
    const intersects = this.raycaster.intersectObjects(meshes)

    const newHoveredIndex = intersects.length > 0
      ? this.fragments.findIndex((f) => f.mesh === intersects[0].object)
      : -1

    if (newHoveredIndex !== this.hoveredIndex) {
      this.hoveredIndex = newHoveredIndex
      if (this.hoveredIndex >= 0) {
        const frag = this.fragments[this.hoveredIndex]
        const screenPos = frag.mesh.position.clone().project(this.camera)
        const rect = this.container.getBoundingClientRect()
        useStore.getState().setHoveredFragment({
          id: this.hoveredIndex,
          color: frag.colorHex,
          colorName: frag.colorName,
          thickness: frag.thickness,
          refractionIndex: frag.refractionIndex,
          screenPosition: {
            x: ((screenPos.x + 1) / 2) * rect.width,
            y: ((-screenPos.y + 1) / 2) * rect.height,
          },
        })
      } else {
        useStore.getState().setHoveredFragment(null)
      }
    }

    for (let i = 0; i < this.fragments.length; i++) {
      const frag = this.fragments[i]
      const mat = frag.material

      mat.uniforms.uOpacity.value = fragmentOpacity
      mat.uniforms.uRefractionIntensity.value = refractionIntensity
      mat.uniforms.uTime.value = time

      const isHovered = i === this.hoveredIndex
      const targetHover = isHovered ? 1.0 : 0.0
      mat.uniforms.uHovered.value += (targetHover - mat.uniforms.uHovered.value) * 0.1

      const targetDim = (this.hoveredIndex >= 0 && !isHovered) ? 1.0 : 0.0
      mat.uniforms.uDimmed.value += (targetDim - mat.uniforms.uDimmed.value) * 0.08

      frag.orbitAngle += frag.orbitSpeed * deltaTime * rotationSpeed
      const baseX = frag.orbitRadius * Math.cos(frag.orbitAngle)
      const baseZ = frag.orbitRadius * Math.sin(frag.orbitAngle)
      const floatY = Math.sin(time * frag.floatSpeed + frag.floatOffset) * frag.floatAmplitude

      if (frag.isExploding) {
        frag.explodeProgress += deltaTime * 2.0
        if (frag.explodeProgress >= 1.0) {
          frag.isExploding = false
          frag.explodeProgress = 0
        }
      }

      const explodeEase = frag.isExploding
        ? Math.sin(frag.explodeProgress * Math.PI)
        : 0
      const explodeOffset = frag.explodeDirection.clone().multiplyScalar(explodeEase * 2.0)

      frag.mesh.position.set(
        baseX + explodeOffset.x,
        frag.originalPosition.y * 0.3 + floatY + explodeOffset.y,
        baseZ + explodeOffset.z
      )

      frag.mesh.rotation.x += frag.selfRotSpeed.x * rotationSpeed
      frag.mesh.rotation.y += frag.selfRotSpeed.y * rotationSpeed
      frag.mesh.rotation.z += frag.selfRotSpeed.z * rotationSpeed
    }
  }

  public getGroup() {
    return this.group
  }

  public resetCamera(controlTarget: THREE.Vector3) {
    controlTarget.set(0, 0, 0)
  }

  public dispose() {
    this.container.removeEventListener('mousemove', this.onMouseMove.bind(this))
    this.container.removeEventListener('click', this.onClick.bind(this))
    this.fragments.forEach((frag) => {
      frag.mesh.geometry.dispose()
      frag.material.dispose()
    })
    this.group.parent?.remove(this.group)
  }
}
