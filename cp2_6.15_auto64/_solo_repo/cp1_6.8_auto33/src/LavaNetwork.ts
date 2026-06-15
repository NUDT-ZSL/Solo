import * as THREE from 'three'

const LAVA_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uFlowSpeed;
  uniform float uGlowIntensity;
  uniform float uEruption;
  varying vec2 vUv;
  varying float vGlow;

  void main() {
    vUv = uv;
    float flow = uTime * uFlowSpeed;
    float wave = sin(vUv.x * 20.0 + flow * 3.0) * 0.5 + 0.5;
    float pulse = sin(uTime * 2.0 + vUv.x * 5.0) * 0.15 + 0.85;
    vGlow = (0.6 + wave * 0.4) * pulse * uGlowIntensity + uEruption * 2.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const LAVA_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uGlowIntensity;
  uniform float uEruption;
  varying vec2 vUv;
  varying float vGlow;

  void main() {
    float flow = uTime;
    float ripple = sin(vUv.x * 30.0 - flow * 4.0) * sin(vUv.y * 10.0 + flow * 2.0);
    float crackPattern = smoothstep(0.3, 0.7, ripple * 0.5 + 0.5);
    vec3 hotColor = vec3(1.0, 0.65, 0.0);
    vec3 coolColor = vec3(0.55, 0.05, 0.0);
    vec3 eruptionColor = vec3(1.0, 0.95, 0.6);
    vec3 baseColor = mix(coolColor, hotColor, crackPattern);
    baseColor = mix(baseColor, eruptionColor, uEruption * 0.7);
    float glow = vGlow * (0.8 + crackPattern * 0.4);
    vec3 finalColor = baseColor * glow;
    float alpha = 0.75 + crackPattern * 0.25 + uEruption * 0.2;
    gl_FragColor = vec4(finalColor, alpha);
  }
`

export interface LavaBranchData {
  id: string
  points: THREE.Vector3[]
  speed: number
  temperature: number
  childCount: number
  mesh: THREE.Mesh
  glowIntensity: number
  isErupting: boolean
  eruptionTimer: number
  material: THREE.ShaderMaterial
  children: LavaBranchData[]
}

export class LavaNetwork {
  private branches: LavaBranchData[] = []
  private scene: THREE.Scene
  private flowSpeed: number = 1.0
  private glowIntensity: number = 1.0
  private branchDensity: number = 3
  private volcanoTop: THREE.Vector3 = new THREE.Vector3(0, 4, 0)
  private time: number = 0
  private needsRebuild: boolean = true

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  setParams(flowSpeed: number, glowIntensity: number, branchDensity: number) {
    const densityChanged = this.branchDensity !== branchDensity
    this.flowSpeed = flowSpeed
    this.glowIntensity = glowIntensity
    if (densityChanged) {
      this.branchDensity = branchDensity
      this.needsRebuild = true
    }
  }

  private generateBranchPath(
    start: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    spread: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [start.clone()]
    const pos = start.clone()
    const dir = direction.clone().normalize()
    const segments = Math.floor(length * 8)

    for (let i = 0; i < segments; i++) {
      const wobble = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.2,
        (Math.random() - 0.5) * spread
      )
      dir.add(wobble).normalize()
      if (pos.y < 0.05) {
        dir.y = Math.min(dir.y, 0)
      }
      const step = dir.clone().multiplyScalar(length / segments)
      pos.add(step)
      pos.y = Math.max(pos.y, 0.02)
      points.push(pos.clone())
    }
    return points
  }

  private createLavaMesh(points: THREE.Vector3[]): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
    if (points.length < 2) {
      return { mesh: new THREE.Mesh(), material: new THREE.ShaderMaterial() }
    }

    const curve = new THREE.CatmullRomCurve3(points)
    const tubularSegments = Math.max(points.length * 4, 16)
    const radius = 0.12 + Math.random() * 0.08
    const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 8, false)

    const material = new THREE.ShaderMaterial({
      vertexShader: LAVA_VERTEX_SHADER,
      fragmentShader: LAVA_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0.0 },
        uFlowSpeed: { value: this.flowSpeed },
        uGlowIntensity: { value: this.glowIntensity },
        uEruption: { value: 0.0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const mesh = new THREE.Mesh(geometry, material)
    return { mesh, material }
  }

  private buildNetwork() {
    this.clear()
    const numRoots = this.branchDensity
    const angleStep = (Math.PI * 2) / numRoots

    for (let i = 0; i < numRoots; i++) {
      const angle = angleStep * i + (Math.random() - 0.5) * 0.5
      const direction = new THREE.Vector3(
        Math.cos(angle),
        -0.5,
        Math.sin(angle)
      )
      const path = this.generateBranchPath(
        this.volcanoTop.clone().add(new THREE.Vector3(0, -0.3, 0)),
        direction,
        8 + Math.random() * 4,
        0.4
      )

      const { mesh, material } = this.createLavaMesh(path)
      this.scene.add(mesh)

      const branch: LavaBranchData = {
        id: `branch_${i}_${Date.now()}`,
        points: path,
        speed: 0.5 + Math.random() * 1.5,
        temperature: 800 + Math.random() * 600,
        childCount: 0,
        mesh,
        glowIntensity: 1.0,
        isErupting: false,
        eruptionTimer: 0,
        material,
        children: [],
      }

      const numChildren = Math.floor(Math.random() * Math.min(this.branchDensity, 3))
      for (let j = 0; j < numChildren; j++) {
        const splitIdx = Math.floor(path.length * (0.3 + Math.random() * 0.4))
        const splitPoint = path[splitIdx]
        const childDir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          -0.3,
          (Math.random() - 0.5) * 2
        )
        const childPath = this.generateBranchPath(splitPoint, childDir, 4 + Math.random() * 3, 0.3)
        const childResult = this.createLavaMesh(childPath)
        this.scene.add(childResult.mesh)

        const childBranch: LavaBranchData = {
          id: `branch_${i}_${j}_${Date.now()}`,
          points: childPath,
          speed: 0.3 + Math.random() * 1.0,
          temperature: 600 + Math.random() * 400,
          childCount: 0,
          mesh: childResult.mesh,
          glowIntensity: 1.0,
          isErupting: false,
          eruptionTimer: 0,
          material: childResult.material,
          children: [],
        }
        branch.children.push(childBranch)
        this.branches.push(childBranch)
      }

      branch.childCount = branch.children.length
      this.branches.unshift(branch)
    }

    this.needsRebuild = false
  }

  private clear() {
    for (const branch of this.branches) {
      this.scene.remove(branch.mesh)
      branch.mesh.geometry.dispose()
      branch.material.dispose()
      for (const child of branch.children) {
        this.scene.remove(child.mesh)
        child.mesh.geometry.dispose()
        child.material.dispose()
      }
    }
    this.branches = []
  }

  triggerEruption(branchId: string) {
    for (const branch of this.branches) {
      if (branch.id === branchId) {
        branch.isErupting = true
        branch.eruptionTimer = 2.0
      }
    }
  }

  getBranchById(id: string): LavaBranchData | null {
    for (const branch of this.branches) {
      if (branch.id === id) return branch
    }
    return null
  }

  getAllBranches(): LavaBranchData[] {
    return this.branches
  }

  getAllMeshes(): THREE.Mesh[] {
    return this.branches.map((b) => b.mesh)
  }

  update(delta: number) {
    if (this.needsRebuild) {
      this.buildNetwork()
    }

    this.time += delta

    for (const branch of this.branches) {
      branch.material.uniforms.uTime.value = this.time
      branch.material.uniforms.uFlowSpeed.value = this.flowSpeed
      branch.material.uniforms.uGlowIntensity.value = this.glowIntensity

      if (branch.isErupting) {
        branch.eruptionTimer -= delta
        const eruptionValue = Math.max(0, branch.eruptionTimer / 2.0)
        branch.material.uniforms.uEruption.value = eruptionValue
        if (branch.eruptionTimer <= 0) {
          branch.isErupting = false
          branch.material.uniforms.uEruption.value = 0.0
        }
      }

      for (const child of branch.children) {
        child.material.uniforms.uTime.value = this.time
        child.material.uniforms.uFlowSpeed.value = this.flowSpeed
        child.material.uniforms.uGlowIntensity.value = this.glowIntensity
        if (branch.isErupting) {
          const pulse = Math.sin(this.time * 8.0) * 0.3 + 0.3
          child.material.uniforms.uEruption.value = pulse * 0.5
        } else {
          child.material.uniforms.uEruption.value = 0
        }
      }
    }
  }

  rebuild() {
    this.needsRebuild = true
  }

  dispose() {
    this.clear()
  }
}
