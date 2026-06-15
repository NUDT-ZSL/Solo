import * as THREE from "three";
import {
  SCENE,
  PLANET,
  TRAIL,
  PARTICLE,
  CAMERA,
} from "../utils/constants";

interface PlanetData {
  mesh: THREE.Mesh;
  glow: THREE.Sprite;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  orbitTiltX: number;
  orbitTiltZ: number;
  rotationSpeed: number;
  velocity: THREE.Vector3;
  trailPoints: THREE.Vector3[];
  trailLine: THREE.Line;
  trailGeometry: THREE.BufferGeometry;
  perturbed: boolean;
  perturbTimer: number;
  baseColor: number;
}

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class Universe {
  public scene: THREE.Scene;
  public planets: PlanetData[] = [];
  public particles: ParticleData[] = [];
  public particlePoints: THREE.Points;
  public particleGeometry: THREE.BufferGeometry;
  public backgroundStars: THREE.Points;

  private particleDensity: number = PARTICLE.DEFAULT_DENSITY;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(SCENE.FOG_COLOR, SCENE.FOG_NEAR, SCENE.FOG_FAR);
    this.createBackground();
    this.backgroundStars = this.createStars();
    this.scene.add(this.backgroundStars);
    this.createPlanets();
    const pResult = this.createParticleSystem();
    this.particlePoints = pResult.points;
    this.particleGeometry = pResult.geometry;
    this.scene.add(this.particlePoints);
  }

  private createBackground(): void {
    const geo = new THREE.SphereGeometry(200, 32, 32);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uColorTop: { value: SCENE.BG_COLOR_TOP },
        uColorBottom: { value: SCENE.BG_COLOR_BOTTOM },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorTop;
        uniform vec3 uColorBottom;
        varying vec3 vWorldPos;
        void main() {
          float t = clamp((vWorldPos.y + 200.0) / 400.0, 0.0, 1.0);
          gl_FragColor = vec4(mix(uColorBottom, uColorTop, t), 1.0);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  private createStars(): THREE.Points {
    const positions = new Float32Array(SCENE.STAR_COUNT * 3);
    const colors = new Float32Array(SCENE.STAR_COUNT * 3);
    const sizes = new Float32Array(SCENE.STAR_COUNT);

    for (let i = 0; i < SCENE.STAR_COUNT; i++) {
      const r = SCENE.STAR_SPREAD * (0.5 + Math.random() * 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      const tint = Math.random();
      if (tint < 0.3) {
        colors[i * 3] = brightness * 0.8;
        colors[i * 3 + 1] = brightness * 0.85;
        colors[i * 3 + 2] = brightness;
      } else if (tint < 0.6) {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness * 0.9;
        colors[i * 3 + 2] = brightness * 0.8;
      } else {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness;
      }
      sizes[i] = 0.1 + Math.random() * 0.3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      vertexColors: true,
    });

    return new THREE.Points(geo, mat);
  }

  private createGlowTexture(color: number): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const c = new THREE.Color(color);
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, `rgba(${r},${g},${b},1.0)`);
    gradient.addColorStop(0.2, `rgba(${r},${g},${b},0.6)`);
    gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0.0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  private createPlanets(): void {
    for (let i = 0; i < PLANET.COUNT; i++) {
      const radius = PLANET.MIN_RADIUS + Math.random() * (PLANET.MAX_RADIUS - PLANET.MIN_RADIUS);
      const colorIdx = i % PLANET.COLORS.length;
      const color = PLANET.COLORS[colorIdx];

      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        roughness: 0.6,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const glowTex = this.createGlowTexture(color);
      const glowMat = new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Sprite(glowMat);
      glow.scale.set(radius * PLANET.GLOW_SCALE, radius * PLANET.GLOW_SCALE, 1);
      mesh.add(glow);

      const orbitRadius = PLANET.ORBIT_RADIUS_MIN + (i / PLANET.COUNT) * (PLANET.ORBIT_RADIUS_MAX - PLANET.ORBIT_RADIUS_MIN);
      const orbitSpeed = PLANET.ORBIT_SPEED_MIN + Math.random() * (PLANET.ORBIT_SPEED_MAX - PLANET.ORBIT_SPEED_MIN);
      const orbitAngle = Math.random() * Math.PI * 2;
      const orbitTiltX = (Math.random() - 0.5) * PLANET.ORBIT_TILT_RANGE;
      const orbitTiltZ = (Math.random() - 0.5) * PLANET.ORBIT_TILT_RANGE;
      const rotationSpeed = PLANET.ROTATION_SPEED_MIN + Math.random() * (PLANET.ROTATION_SPEED_MAX - PLANET.ROTATION_SPEED_MIN);

      const pos = this.computeOrbitPosition(orbitRadius, orbitAngle, orbitTiltX, orbitTiltZ);
      mesh.position.copy(pos);

      const trailPoints: THREE.Vector3[] = [];
      const trailGeometry = new THREE.BufferGeometry();
      const trailMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: TRAIL.OPACITY,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const trailLine = new THREE.Line(trailGeometry, trailMat);

      this.scene.add(mesh);
      this.scene.add(trailLine);

      this.planets.push({
        mesh,
        glow,
        orbitRadius,
        orbitSpeed,
        orbitAngle,
        orbitTiltX,
        orbitTiltZ,
        rotationSpeed,
        velocity: new THREE.Vector3(),
        trailPoints,
        trailLine,
        trailGeometry,
        perturbed: false,
        perturbTimer: 0,
        baseColor: color,
      });
    }

    const ambient = new THREE.AmbientLight(0x222244, 0.5);
    this.scene.add(ambient);

    const pointLight = new THREE.PointLight(0x6688cc, 2, 100);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);
  }

  private computeOrbitPosition(
    radius: number,
    angle: number,
    tiltX: number,
    tiltZ: number
  ): THREE.Vector3 {
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = x * Math.sin(tiltX) + z * Math.sin(tiltZ);
    return new THREE.Vector3(x, y, z);
  }

  private createParticleSystem(): { points: THREE.Points; geometry: THREE.BufferGeometry } {
    const maxParticles = PLANET.COUNT * PARTICLE.COUNT_PER_TRAIL * 3;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const opacities = new Float32Array(maxParticles);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aOpacity;
        varying float vOpacity;
        varying vec3 vColor;
        void main() {
          vOpacity = aOpacity;
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = ${PARTICLE.SIZE.toFixed(2)} * (200.0 / -mvPos.z) * aOpacity;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, d)) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      vertexColors: true,
    });

    geo.setDrawRange(0, 0);
    return { points: new THREE.Points(geo, mat), geometry: geo };
  }

  public emitParticles(position: THREE.Vector3, color: THREE.Color, count?: number): void {
    const actualCount = Math.round((count ?? PARTICLE.COUNT_PER_TRAIL) * this.particleDensity);
    for (let i = 0; i < actualCount; i++) {
      this.particles.push({
        position: position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * PARTICLE.SPREAD,
            (Math.random() - 0.5) * PARTICLE.SPREAD,
            (Math.random() - 0.5) * PARTICLE.SPREAD
          )
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ),
        life: PARTICLE.LIFETIME,
        maxLife: PARTICLE.LIFETIME,
        color: color.clone().offsetHSL(
          (Math.random() - 0.5) * 0.1,
          0,
          (Math.random() - 0.5) * 0.2
        ),
      });
    }
  }

  public updatePlanets(delta: number): void {
    for (const p of this.planets) {
      p.orbitAngle += p.orbitSpeed * delta;

      const orbitalPos = this.computeOrbitPosition(
        p.orbitRadius,
        p.orbitAngle,
        p.orbitTiltX,
        p.orbitTiltZ
      );

      if (p.velocity.lengthSq() > 0.0001) {
        p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.multiplyScalar(0.98);

        if (p.velocity.lengthSq() < 0.001) {
          p.velocity.set(0, 0, 0);
          const toOrbit = orbitalPos.clone().sub(p.mesh.position);
          p.orbitRadius = p.mesh.position.length();
          p.orbitAngle = Math.atan2(p.mesh.position.z, p.mesh.position.x);
          p.orbitTiltX = Math.asin(p.mesh.position.y / Math.max(p.orbitRadius, 0.01)) * 0.5;
        }
      } else {
        p.mesh.position.copy(orbitalPos);
      }

      p.mesh.rotation.y += p.rotationSpeed * delta;

      p.trailPoints.push(p.mesh.position.clone());
      if (p.trailPoints.length > TRAIL.MAX_LENGTH) {
        p.trailPoints.shift();
      }
      this.updateTrailGeometry(p);

      if (p.perturbed) {
        p.perturbTimer -= delta;
        if (p.perturbTimer <= 0) {
          p.perturbed = false;
        }
      }
    }
  }

  private updateTrailGeometry(p: PlanetData): void {
    const count = p.trailPoints.length;
    if (count < 2) {
      p.trailGeometry.setDrawRange(0, 0);
      return;
    }

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const startColor = TRAIL.COLOR_START;
    const endColor = TRAIL.COLOR_END;
    const baseColor = new THREE.Color(p.baseColor);

    for (let i = 0; i < count; i++) {
      const pt = p.trailPoints[i];
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;

      const t = i / (count - 1);
      const c = new THREE.Color().copy(startColor).lerp(endColor, t);
      c.lerp(baseColor, 0.3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    p.trailGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    p.trailGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    p.trailGeometry.setDrawRange(0, count);
  }

  public updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.95);
    }

    const maxParticles = PLANET.COUNT * PARTICLE.COUNT_PER_TRAIL * 3;
    const posAttr = this.particleGeometry.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = this.particleGeometry.getAttribute("color") as THREE.BufferAttribute;
    const opaAttr = this.particleGeometry.getAttribute("aOpacity") as THREE.BufferAttribute;

    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;
    const opacities = opaAttr.array as Float32Array;

    const count = Math.min(this.particles.length, maxParticles);
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      opacities[i] = p.life / p.maxLife;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    opaAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, count);
  }

  public setParticleDensity(density: number): void {
    this.particleDensity = density;
  }

  public reset(): void {
    for (const p of this.planets) {
      p.velocity.set(0, 0, 0);
      p.perturbed = false;
      p.perturbTimer = 0;
      p.trailPoints.length = 0;
      p.orbitAngle = Math.random() * Math.PI * 2;
      p.orbitRadius = PLANET.ORBIT_RADIUS_MIN + (this.planets.indexOf(p) / PLANET.COUNT) * (PLANET.ORBIT_RADIUS_MAX - PLANET.ORBIT_RADIUS_MIN);
      p.orbitTiltX = (Math.random() - 0.5) * PLANET.ORBIT_TILT_RANGE;
      p.orbitTiltZ = (Math.random() - 0.5) * PLANET.ORBIT_TILT_RANGE;
      p.mesh.position.copy(
        this.computeOrbitPosition(p.orbitRadius, p.orbitAngle, p.orbitTiltX, p.orbitTiltZ)
      );
      p.trailGeometry.setDrawRange(0, 0);
    }
    this.particles.length = 0;
    this.particleGeometry.setDrawRange(0, 0);
  }
}
