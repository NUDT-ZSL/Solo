import * as THREE from 'three'
import type { Crystal, CrystalFaceInfo } from './crystal'

export class ParticleSystem {
  public group: THREE.Group
  public adsorptionParticles!: THREE.Points
  public hoverHighlightMesh!: THREE.Mesh
  public labelElement!: HTMLDivElement

  private scene: THREE.Scene
  private crystal: Crystal
  private adsorptionData: {
    velocities: Float32Array
    targets: Float32Array
    active: Uint8Array
    life: Float32Array
  } | null = null

  private readonly MAX_PARTICLES = 600
  private currentHoverFace: CrystalFaceInfo | null = null

  constructor(scene: THREE.Scene, container: HTMLElement, crystal: Crystal) {
    this.scene = scene
    this.crystal = crystal
    this.group = new THREE.Group()
    scene.add(this.group)
    this.createAdsorptionParticles()
    this.createHoverHighlight()
    this.createLabel(container)
  }

  private createAdsorptionParticles(): void {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.MAX_PARTICLES * 3)
    const colors = new Float32Array(this.MAX_PARTICLES * 3)
    const sizes = new Float32Array(this.MAX_PARTICLES)

    this.adsorptionData = {
      velocities: new Float32Array(this.MAX_PARTICLES * 3),
      targets: new Float32Array(this.MAX_PARTICLES * 3),
      active: new Uint8Array(this.MAX_PARTICLES),
      life: new Float32Array(this.MAX_PARTICLES)
    }

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const r = 6 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      colors[i * 3] = 1.0
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.15
      colors[i * 3 + 2] = 0.2 + Math.random() * 0.3

      sizes[i] = 0.04 + Math.random() * 0.08
      this.adsorptionData.active[i] = 0
      this.adsorptionData.life[i] = 0
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    })

    this.adsorptionParticles = new THREE.Points(geometry, material)
    this.group.add(this.adsorptionParticles)
  }

  private spawnParticle(): void {
    if (!this.adsorptionData) return

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (!this.adsorptionData.active[i]) {
        const positions = this.adsorptionParticles.geometry.getAttribute('position') as THREE.BufferAttribute
        const r = 5 + Math.random() * 7
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI

        positions.setXYZ(
          i,
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        )

        const crystalScale = this.crystal.currentScale
        const targetR = 0.8 + crystalScale * 1.2
        const targetTheta = Math.random() * Math.PI * 2
        const targetPhi = Math.random() * Math.PI

        this.adsorptionData.targets[i * 3] = targetR * Math.sin(targetPhi) * Math.cos(targetTheta)
        this.adsorptionData.targets[i * 3 + 1] = targetR * Math.sin(targetPhi) * Math.sin(targetTheta) * 0.6
        this.adsorptionData.targets[i * 3 + 2] = targetR * Math.cos(targetPhi)

        this.adsorptionData.velocities[i * 3] = (Math.random() - 0.5) * 0.02
        this.adsorptionData.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02
        this.adsorptionData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02

        this.adsorptionData.active[i] = 1
        this.adsorptionData.life[i] = 1.0
        positions.needsUpdate = true
        return
      }
    }
  }

  public createHoverHighlight(): void {
    const geometry = new THREE.RingGeometry(0.2, 0.5, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    this.hoverHighlightMesh = new THREE.Mesh(geometry, material)
    this.hoverHighlightMesh.visible = false
    this.group.add(this.hoverHighlightMesh)
  }

  private createLabel(container: HTMLElement): void {
    this.labelElement = document.createElement('div')
    Object.assign(this.labelElement.style, {
      position: 'absolute',
      padding: '10px 14px',
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(139, 92, 246, 0.5)',
      borderRadius: '8px',
      color: '#E2E8F0',
      fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      zIndex: '100',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 15px rgba(139, 92, 246, 0.2)',
      whiteSpace: 'nowrap',
      transform: 'translate(-50%, -120%)'
    })
    this.labelElement.innerHTML = '<div style="font-weight:600;color:#A78BFA;margin-bottom:4px;">晶面信息</div>'
    container.appendChild(this.labelElement)
  }

  public update(time: number, delta: number, isGrowing: boolean): void {
    if (this.adsorptionData) {
      const positions = this.adsorptionParticles.geometry.getAttribute('position') as THREE.BufferAttribute
      const spawnRate = isGrowing ? 6 : 0.5

      if (Math.random() < spawnRate * delta * 60) {
        this.spawnParticle()
      }

      for (let i = 0; i < this.MAX_PARTICLES; i++) {
        if (!this.adsorptionData.active[i]) continue

        const px = positions.getX(i)
        const py = positions.getY(i)
        const pz = positions.getZ(i)

        const tx = this.adsorptionData.targets[i * 3]
        const ty = this.adsorptionData.targets[i * 3 + 1]
        const tz = this.adsorptionData.targets[i * 3 + 2]

        const crystalScale = this.crystal.currentScale
        const attractionStrength = isGrowing ? 0.015 : 0.005

        this.adsorptionData.velocities[i * 3] += (tx - px) * attractionStrength * crystalScale
        this.adsorptionData.velocities[i * 3 + 1] += (ty - py) * attractionStrength * crystalScale
        this.adsorptionData.velocities[i * 3 + 2] += (tz - pz) * attractionStrength * crystalScale

        this.adsorptionData.velocities[i * 3] *= 0.96
        this.adsorptionData.velocities[i * 3 + 1] *= 0.96
        this.adsorptionData.velocities[i * 3 + 2] *= 0.96

        positions.setXYZ(
          i,
          px + this.adsorptionData.velocities[i * 3],
          py + this.adsorptionData.velocities[i * 3 + 1],
          pz + this.adsorptionData.velocities[i * 3 + 2]
        )

        const dist = Math.sqrt(
          Math.pow(positions.getX(i) - tx, 2) +
          Math.pow(positions.getY(i) - ty, 2) +
          Math.pow(positions.getZ(i) - tz, 2)
        )

        if (dist < 0.15 || this.adsorptionData.life[i] <= 0) {
          this.adsorptionData.active[i] = 0
          this.adsorptionData.life[i] = 0
          positions.setXYZ(i, 100, 100, 100)
        } else {
          this.adsorptionData.life[i] -= delta * 0.3
        }
      }

      positions.needsUpdate = true
    }

    if (this.currentHoverFace) {
      const mat = this.hoverHighlightMesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.4 + Math.sin(time * 0.008) * 0.15

      const labelOpacity = this.currentHoverFace ? 1 : 0
      if (parseFloat(this.labelElement.style.opacity) !== labelOpacity) {
        this.labelElement.style.opacity = String(labelOpacity)
      }
    }
  }

  public updateHover(
    faceInfo: CrystalFaceInfo | null,
    screenPosition: { x: number; y: number } | null
  ): void {
    this.currentHoverFace = faceInfo

    if (faceInfo && screenPosition) {
      this.hoverHighlightMesh.visible = true
      this.hoverHighlightMesh.position.copy(faceInfo.worldPosition)
      this.hoverHighlightMesh.lookAt(
        faceInfo.worldPosition.x + faceInfo.normal.x,
        faceInfo.worldPosition.y + faceInfo.normal.y,
        faceInfo.worldPosition.z + faceInfo.normal.z
      )
      this.hoverHighlightMesh.rotateZ(Math.random() * Math.PI)
      const scale = 0.4 + this.crystal.currentScale * 0.3
      this.hoverHighlightMesh.scale.setScalar(scale)

      this.labelElement.style.left = `${screenPosition.x}px`
      this.labelElement.style.top = `${screenPosition.y}px`
      this.labelElement.style.opacity = '1'
      this.labelElement.innerHTML = `
        <div style="font-weight:600;color:#A78BFA;margin-bottom:6px;letter-spacing:0.5px;">晶面信息</div>
        <div style="display:flex;gap:12px;align-items:center;">
          <span style="background:rgba(139,92,246,0.2);padding:2px 8px;border-radius:4px;font-family:monospace;font-size:14px;color:#C4B5FD;">${faceInfo.index}</span>
        </div>
        <div style="margin-top:6px;font-size:12px;color:#94A3B8;">
          生长速率: <span style="color:#34D399;font-weight:600;">${faceInfo.growthRate.toFixed(3)}</span> nm/s
        </div>
        <div style="margin-top:3px;font-size:12px;color:#94A3B8;">
          离子浓度: <span style="color:#FBBF24;">${this.crystal.currentParams.ionConcentration.toFixed(1)}</span> mol/L
        </div>
      `

      this.crystal.highlightFace(faceInfo)
    } else {
      this.hoverHighlightMesh.visible = false
      this.labelElement.style.opacity = '0'
      this.crystal.highlightFace(null)
    }
  }

  public dispose(): void {
    this.adsorptionParticles.geometry.dispose()
    ;(this.adsorptionParticles.material as THREE.Material).dispose()
    this.hoverHighlightMesh.geometry.dispose()
    ;(this.hoverHighlightMesh.material as THREE.Material).dispose()
    if (this.labelElement.parentNode) {
      this.labelElement.parentNode.removeChild(this.labelElement)
    }
  }
}
