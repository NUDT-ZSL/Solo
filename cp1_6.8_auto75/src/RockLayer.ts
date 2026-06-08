import * as THREE from 'three'

interface CrackLine {
  line: THREE.Line
  age: number
  maxAge: number
  baseIntensity: number
}

export class RockLayer {
  group: THREE.Group
  rocks: THREE.Mesh[]
  cracks: CrackLine[]
  eruptionCracks: CrackLine[]
  crackGeometryPool: THREE.BufferGeometry[]

  constructor() {
    this.group = new THREE.Group()
    this.rocks = []
    this.cracks = []
    this.eruptionCracks = []
    this.crackGeometryPool = []

    this.createRockField()
    this.createBaseCracks()
  }

  private createRockField() {
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
    })

    const positions = [
      [-8, 0.4, -6], [7, 0.3, -8], [-6, 0.5, 7], [9, 0.35, 5],
      [0, 0.3, -10], [-10, 0.4, 0], [5, 0.3, 10], [-3, 0.45, -4],
      [4, 0.35, -3], [-5, 0.4, 4], [6, 0.3, 3], [-9, 0.45, -3],
    ]

    for (const pos of positions) {
      const geo = this.createRockGeometry(
        0.8 + Math.random() * 1.5,
        0.4 + Math.random() * 0.6,
        0.8 + Math.random() * 1.5
      )
      const mesh = new THREE.Mesh(geo, rockMaterial)
      mesh.position.set(pos[0], pos[1], pos[2])
      mesh.rotation.y = Math.random() * Math.PI * 2
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.rocks.push(mesh)
      this.group.add(mesh)
    }

    const groundGeo = new THREE.PlaneGeometry(40, 40, 64, 64)
    const posAttr = groundGeo.getAttribute('position')
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i)
      const z = posAttr.getY(i)
      const h = (Math.sin(x * 0.3) * Math.cos(z * 0.3)) * 0.15 + (Math.random() - 0.5) * 0.05
      posAttr.setZ(i, h)
    }
    groundGeo.computeVertexNormals()

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: true,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.05
    ground.receiveShadow = true
    this.group.add(ground)
  }

  private createRockGeometry(w: number, h: number, d: number) {
    const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2)
    const posAttr = geo.getAttribute('position')
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i)
      const y = posAttr.getY(i)
      const z = posAttr.getZ(i)
      const distort = 0.15
      posAttr.setX(i, x + (Math.random() - 0.5) * distort * w)
      posAttr.setY(i, y + (Math.random() - 0.5) * distort * h * 0.5)
      posAttr.setZ(i, z + (Math.random() - 0.5) * distort * d)
    }
    geo.computeVertexNormals()
    return geo
  }

  private createBaseCracks() {
    const crackPaths = [
      [[-8, 0.02, -6], [-4, 0.02, -3], [0, 0.02, 0], [4, 0.02, -3], [7, 0.02, -8]],
      [[-6, 0.02, 7], [-3, 0.02, 4], [0, 0.02, 0], [3, 0.02, 3], [6, 0.02, 3]],
      [[-10, 0.02, 0], [-5, 0.02, -1], [0, 0.02, 0], [5, 0.02, 1], [9, 0.02, 5]],
      [[0, 0.02, -10], [-1, 0.02, -5], [0, 0.02, 0], [1, 0.02, 5], [5, 0.02, 10]],
    ]

    for (const path of crackPaths) {
      this.addCrackLine(path, 1.0, false)
    }
  }

  private addCrackLine(points: number[][], intensity: number, isEruption: boolean) {
    const points3 = points.map(p => new THREE.Vector3(p[0], p[1], p[2]))
    const curve = new THREE.CatmullRomCurve3(points3)
    const curvePoints = curve.getPoints(40)

    const geo = new THREE.BufferGeometry().setFromPoints(curvePoints)
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(1.0 * intensity, 0.3 * intensity, 0.05 * intensity),
      transparent: true,
      opacity: intensity,
      linewidth: 1,
    })
    const line = new THREE.Line(geo, mat)
    this.group.add(line)

    const crack: CrackLine = {
      line,
      age: 0,
      maxAge: isEruption ? 4.0 : Infinity,
      baseIntensity: intensity,
    }

    if (isEruption) {
      this.eruptionCracks.push(crack)
    } else {
      this.cracks.push(crack)
    }
  }

  triggerEruption(point: THREE.Vector3) {
    const numCracks = 4 + Math.floor(Math.random() * 4)
    for (let i = 0; i < numCracks; i++) {
      const angle = (i / numCracks) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const length = 2 + Math.random() * 4
      const points: number[][] = []
      const segments = 5 + Math.floor(Math.random() * 5)
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        const r = t * length
        const jitter = (Math.random() - 0.5) * 0.8
        points.push([
          point.x + Math.cos(angle) * r + jitter,
          0.02,
          point.z + Math.sin(angle) * r + jitter,
        ])
      }
      this.addCrackLine(points, 1.0, true)
    }

    const glowLight = new THREE.PointLight(0xff4400, 8, 10)
    glowLight.position.set(point.x, 0.5, point.z)
    this.group.add(glowLight)

    const startTime = performance.now()
    const animateGlow = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed > 4.0) {
        this.group.remove(glowLight)
        return
      }
      glowLight.intensity = 8 * (1.0 - elapsed / 4.0)
      requestAnimationFrame(animateGlow)
    }
    animateGlow()
  }

  update(delta: number) {
    for (let i = this.eruptionCracks.length - 1; i >= 0; i--) {
      const crack = this.eruptionCracks[i]
      crack.age += delta

      const t = crack.age / crack.maxAge
      const intensity = crack.baseIntensity * (1.0 - t * t)
      const mat = crack.line.material as THREE.LineBasicMaterial
      mat.opacity = Math.max(0, intensity)
      mat.color.setRGB(1.0 * intensity, 0.3 * intensity, 0.05 * intensity)

      if (crack.age >= crack.maxAge) {
        this.group.remove(crack.line)
        crack.line.geometry.dispose()
        ;(crack.line.material as THREE.Material).dispose()
        this.eruptionCracks.splice(i, 1)
      }
    }

    for (const crack of this.cracks) {
      const pulse = 0.7 + 0.3 * Math.sin(performance.now() * 0.002 + crack.baseIntensity * 10)
      const mat = crack.line.material as THREE.LineBasicMaterial
      mat.opacity = crack.baseIntensity * pulse
    }
  }

  reset() {
    for (const crack of this.eruptionCracks) {
      this.group.remove(crack.line)
      crack.line.geometry.dispose()
      ;(crack.line.material as THREE.Material).dispose()
    }
    this.eruptionCracks = []
  }
}
