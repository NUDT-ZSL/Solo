import * as THREE from 'three';
import { Medium } from './Medium';

interface BeamSegment {
  line: THREE.Line;
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: THREE.Color;
}

interface DispersionParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class LightBeam {
  private scene: THREE.Scene;
  private beamSegments: BeamSegment[] = [];
  private particles: DispersionParticle[] = [];
  private particleGroup: THREE.Group;
  private beamGroup: THREE.Group;
  private sourceAngle: number = 0;
  private dispersionStrength: number = 0.5;
  private sourcePosition: THREE.Vector3;
  private sourceDirection: THREE.Vector3;
  private glowMaterial: THREE.ShaderMaterial;
  private time: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.beamGroup = new THREE.Group();
    this.particleGroup = new THREE.Group();
    scene.add(this.beamGroup);
    scene.add(this.particleGroup);

    this.sourcePosition = new THREE.Vector3(-10, 1, 0);
    this.sourceDirection = new THREE.Vector3(1, -0.1, 0).normalize();

    this.glowMaterial = this.createGlowShader();
  }

  private createGlowShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
        uOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float intensity = 1.0 - abs(vUv.y - 0.5) * 2.0;
          intensity = pow(intensity, 2.0);
          float pulse = 0.9 + 0.1 * sin(uTime * 3.0 + vUv.x * 10.0);
          gl_FragColor = vec4(uColor * intensity * pulse * 1.5, intensity * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  setSourceAngle(angle: number): void {
    this.sourceAngle = angle;
    const rad = THREE.MathUtils.degToRad(angle);
    this.sourceDirection.set(Math.cos(rad), Math.sin(rad) * -0.1, Math.sin(rad) * 0.3).normalize();
  }

  setDispersionStrength(strength: number): void {
    this.dispersionStrength = strength;
  }

  private clearBeams(): void {
    for (const seg of this.beamSegments) {
      seg.line.geometry.dispose();
      (seg.line.material as THREE.Material).dispose();
      this.beamGroup.remove(seg.line);
    }
    this.beamSegments = [];
  }

  private createBeamLine(start: THREE.Vector3, end: THREE.Vector3, color: THREE.Color, opacity: number = 1.0): THREE.Line {
    const points = [start.clone(), end.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const mat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 2,
    });

    const line = new THREE.Line(geometry, mat);
    return line;
  }

  private createGlowBeam(start: THREE.Vector3, end: THREE.Vector3, color: THREE.Color): THREE.Mesh {
    const dir = end.clone().sub(start);
    const length = dir.length();
    dir.normalize();

    const geometry = new THREE.PlaneGeometry(length, 0.15, 32, 1);
    geometry.translate(length * 0.5, 0, 0);

    const mat = this.glowMaterial.clone();
    mat.uniforms.uColor.value = color;

    const mesh = new THREE.Mesh(geometry, mat);

    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    mesh.position.copy(midpoint);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    mesh.quaternion.copy(quaternion);

    mesh.renderOrder = 1;
    return mesh;
  }

  private spawnDispersionParticles(position: THREE.Vector3, directions: THREE.Vector3[], colors: THREE.Color[]): void {
    for (let i = 0; i < directions.length; i++) {
      const particleCount = 2;
      for (let j = 0; j < particleCount; j++) {
        const size = 0.03 + Math.random() * 0.04;
        const geom = new THREE.SphereGeometry(size, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
          color: colors[i % colors.length],
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(position);

        const vel = directions[i].clone().multiplyScalar(0.5 + Math.random() * 0.5);
        vel.x += (Math.random() - 0.5) * 0.3;
        vel.y += (Math.random() - 0.5) * 0.3;
        vel.z += (Math.random() - 0.5) * 0.3;

        this.particles.push({
          mesh,
          velocity: vel,
          life: 1.0,
          maxLife: 2.0 + Math.random() * 1.0,
          color: colors[i % colors.length],
        });

        this.particleGroup.add(mesh);
      }
    }
  }

  computeBeamPaths(media: Medium[]): void {
    this.clearBeams();

    const ray = new THREE.Ray(this.sourcePosition.clone(), this.sourceDirection.clone());
    let currentPos = this.sourcePosition.clone();
    let currentDir = this.sourceDirection.clone();
    const maxBounces = 6;
    const beamLength = 20;

    let sortedMedia = [...media].sort((a, b) => {
      const distA = a.group.position.distanceTo(currentPos);
      const distB = b.group.position.distanceTo(currentPos);
      return distA - distB;
    });

    for (let bounce = 0; bounce < maxBounces; bounce++) {
      let closestHit: { point: THREE.Vector3; medium: Medium; dist: number } | null = null;

      for (const medium of sortedMedia) {
        const hitPoint = medium.intersectRay(ray);
        if (hitPoint) {
          const dist = hitPoint.distanceTo(currentPos);
          if (dist > 0.1 && (!closestHit || dist < closestHit.dist)) {
            closestHit = { point: hitPoint, medium, dist };
          }
        }
      }

      if (closestHit) {
        const beamLine = this.createBeamLine(currentPos, closestHit.point, new THREE.Color(0xffffff), 0.9);
        this.beamGroup.add(beamLine);
        this.beamSegments.push({
          line: beamLine,
          start: currentPos.clone(),
          end: closestHit.point.clone(),
          color: new THREE.Color(0xffffff),
        });

        const glowBeam = this.createGlowBeam(currentPos, closestHit.point, new THREE.Color(0xffffff));
        this.beamGroup.add(glowBeam);

        const { refractedDirs, colors } = closestHit.medium.computeRefraction(
          currentDir,
          closestHit.point,
          this.dispersionStrength
        );

        if (refractedDirs.length > 1) {
          for (let i = 0; i < refractedDirs.length; i++) {
            const exitDir = refractedDirs[i];
            const exitPoint = closestHit.point.clone().add(exitDir.clone().multiplyScalar(beamLength * 0.5));
            const colorBeam = this.createBeamLine(closestHit.point, exitPoint, colors[i], 0.7);
            this.beamGroup.add(colorBeam);
            this.beamSegments.push({
              line: colorBeam,
              start: closestHit.point.clone(),
              end: exitPoint.clone(),
              color: colors[i],
            });

            const glowSegment = this.createGlowBeam(closestHit.point, exitPoint, colors[i]);
            this.beamGroup.add(glowSegment);
          }

          this.spawnDispersionParticles(closestHit.point, refractedDirs, colors);
          break;
        } else if (refractedDirs.length === 1) {
          currentPos = closestHit.point.clone();
          currentDir = refractedDirs[0];
          ray.origin.copy(currentPos);
          ray.direction.copy(currentDir);
          sortedMedia = sortedMedia.filter(m => m !== closestHit!.medium);
        }
      } else {
        const endPoint = currentPos.clone().add(currentDir.clone().multiplyScalar(beamLength));
        const beamLine = this.createBeamLine(currentPos, endPoint, new THREE.Color(0xffffff), 0.8);
        this.beamGroup.add(beamLine);
        this.beamSegments.push({
          line: beamLine,
          start: currentPos.clone(),
          end: endPoint.clone(),
          color: new THREE.Color(0xffffff),
        });

        const glowBeam = this.createGlowBeam(currentPos, endPoint, new THREE.Color(0xffffff));
        this.beamGroup.add(glowBeam);
        break;
      }
    }
  }

  updateParticles(deltaTime: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= deltaTime / p.maxLife;
      p.velocity.multiplyScalar(0.98);
      p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      p.velocity.y -= 0.02 * deltaTime;

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, p.life * 0.8);

      const scale = Math.max(0.01, p.life);
      p.mesh.scale.setScalar(scale);

      if (p.life <= 0) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const p = this.particles[toRemove[i]];
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      this.particleGroup.remove(p.mesh);
      this.particles.splice(toRemove[i], 1);
    }
  }

  update(deltaTime: number, media: Medium[]): void {
    this.time += deltaTime;
    this.glowMaterial.uniforms.uTime.value = this.time;
    this.computeBeamPaths(media);
    this.updateParticles(deltaTime);
  }

  dispose(): void {
    this.clearBeams();
    for (const p of this.particles) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      this.particleGroup.remove(p.mesh);
    }
    this.particles = [];
    this.glowMaterial.dispose();
  }
}
