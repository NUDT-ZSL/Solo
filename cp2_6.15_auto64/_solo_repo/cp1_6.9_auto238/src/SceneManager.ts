import * as THREE from 'three';

interface StarNode {
  id: number;
  core: THREE.Mesh;
  halo: THREE.Sprite;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  driftTimer: number;
  pulseTimer: number;
  pulseInterval: number;
  scaleAnim: number;
  hoverAnim: number;
  baseHaloColor: THREE.Color;
  trailTimer: number;
}

interface ThreadLine {
  id: string;
  line: THREE.Line;
  nodeA: number;
  nodeB: number;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  baseWidth: number;
  pulseBrightness: number;
  pulseTimer: number;
}

interface PulseRing {
  id: number;
  mesh: THREE.Sprite;
  position: THREE.Vector3;
  radius: number;
  maxRadius: number;
  speed: number;
  life: number;
  maxLife: number;
  affectedThreads: Set<string>;
}

interface Particle {
  id: number;
  sprite: THREE.Sprite;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class SceneManager {
  private static _instance: SceneManager;

  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private nodes: Map<number, StarNode> = new Map();
  private threads: Map<string, ThreadLine> = new Map();
  private pulseRings: Map<number, PulseRing> = new Map();
  private particles: Map<number, Particle> = new Map();

  private nodeIdCounter = 0;
  private ringIdCounter = 0;
  private particleIdCounter = 0;

  private raycaster: THREE.Raycaster;

  private readonly CONNECT_THRESHOLD = 4;
  private readonly MAX_CONNECT_DISTANCE = 6;
  private readonly MAX_NODES = 200;
  private readonly MAX_THREADS = 5000;

  public globalBurst = false;
  public globalBurstTimer = 0;
  public globalBurstDuration = 1.2;

  public radialBlurAmount = 0;

  public onNodesUpdated?: (count: number) => void;

  private constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.025);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.raycaster = new THREE.Raycaster();

    this.setupAmbientStars();
  }

  public static get instance(): SceneManager {
    if (!SceneManager._instance) {
      SceneManager._instance = new SceneManager();
    }
    return SceneManager._instance;
  }

  private setupAmbientStars(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 40 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const colorT = Math.random();
      colors[i * 3] = 0.6 + colorT * 0.4;
      colors[i * 3 + 1] = 0.6 + colorT * 0.2;
      colors[i * 3 + 2] = 0.8 + colorT * 0.2;
      sizes[i] = Math.random() * 1.5 + 0.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.8 + 0.2 * sin(time * 2.0 + position.x * 0.1 + position.y * 0.1);
          gl_PointSize = size * (300.0 / -mvPosition.z) * twinkle;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    starField.name = 'ambientStars';
    this.scene.add(starField);
  }

  private makeHaloTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.15)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  private makeRingTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 100, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,220,150,0.9)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  private makeParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(200,180,255,0.6)');
    gradient.addColorStop(1, 'rgba(200,180,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  public addNode(worldPos?: THREE.Vector3): StarNode | null {
    if (this.nodes.size >= this.MAX_NODES) return null;

    let pos: THREE.Vector3;
    if (worldPos) {
      pos = worldPos.clone();
    } else {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = (Math.random() - 0.5) * Math.PI;
      const radius = 2 + Math.random() * 6;
      pos = new THREE.Vector3(
        radius * Math.cos(angle2) * Math.cos(angle1),
        radius * Math.cos(angle2) * Math.sin(angle1),
        radius * Math.sin(angle2)
      );
    }

    const id = this.nodeIdCounter++;
    const haloTex = this.makeHaloTexture();

    const coreGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(pos);
    core.userData.nodeId = id;

    const hue = 0.65 + (pos.x + pos.y + pos.z) * 0.02;
    const baseColor = new THREE.Color().setHSL(hue % 1, 0.8, 0.6);

    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      color: baseColor,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const halo = new THREE.Sprite(haloMat);
    halo.position.copy(pos);
    halo.scale.set(1.5, 1.5, 1.5);

    this.scene.add(core);
    this.scene.add(halo);

    const speed = 0.02 + Math.random() * 0.06;
    const velDir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();

    const node: StarNode = {
      id,
      core,
      halo,
      position: pos.clone(),
      velocity: velDir.multiplyScalar(speed),
      driftTimer: 5,
      pulseTimer: 1 + Math.random() * 2,
      pulseInterval: 1 + Math.random() * 2,
      scaleAnim: 0,
      hoverAnim: 0,
      baseHaloColor: baseColor.clone(),
      trailTimer: 0
    };

    this.nodes.set(id, node);
    this.updateConnectionsForNode(id);
    this.onNodesUpdated?.(this.nodes.size);
    return node;
  }

  public clickAtPosition(ndcX: number, ndcY: number): void {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const cores = Array.from(this.nodes.values()).map(n => n.core);
    const hits = this.raycaster.intersectObjects(cores, false);

    if (hits.length > 0) {
      const nodeId = hits[0].object.userData.nodeId as number;
      const node = this.nodes.get(nodeId);
      if (node) {
        this.triggerLocalPulse(nodeId);
        node.scaleAnim = 0.2;
      }
    } else {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const hitPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, hitPoint);

      const depthJitter = (Math.random() - 0.5) * 4;
      hitPoint.z += depthJitter;

      const dist = hitPoint.length();
      if (dist > 10) {
        hitPoint.multiplyScalar(10 / dist);
      }

      const node = this.addNode(hitPoint);
      if (node) {
        node.scaleAnim = 0.2;
      }
    }
  }

  public getHoveredNode(ndcX: number, ndcY: number): number | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const cores = Array.from(this.nodes.values()).map(n => n.core);
    const hits = this.raycaster.intersectObjects(cores, false);
    if (hits.length > 0) {
      return hits[0].object.userData.nodeId as number;
    }
    return null;
  }

  private getThreadKey(a: number, b: number): string {
    return a < b ? `${a}_${b}` : `${b}_${a}`;
  }

  private updateConnectionsForNode(nodeId: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const toRemove: string[] = [];
    this.threads.forEach((t) => {
      if (t.nodeA === nodeId || t.nodeB === nodeId) {
        toRemove.push(t.id);
      }
    });
    toRemove.forEach((id) => this.removeThread(id));

    if (this.threads.size >= this.MAX_THREADS) return;

    this.nodes.forEach((other, otherId) => {
      if (otherId === nodeId) return;
      if (this.threads.size >= this.MAX_THREADS) return;

      const dist = node.position.distanceTo(other.position);
      if (dist > this.MAX_CONNECT_DISTANCE) return;
      if (dist > this.CONNECT_THRESHOLD && this.nodes.size > 80) return;

      const key = this.getThreadKey(nodeId, otherId);
      if (this.threads.has(key)) return;

      this.createThread(nodeId, otherId, dist);
    });
  }

  private createThread(nodeAId: number, nodeBId: number, dist: number): void {
    const nodeA = this.nodes.get(nodeAId);
    const nodeB = this.nodes.get(nodeBId);
    if (!nodeA || !nodeB) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mid = new THREE.Vector3().addVectors(nodeA.position, nodeB.position).multiplyScalar(0.5);
    const hueFactor = (mid.x + mid.y + mid.z) / 15 + 0.5;
    const hue = THREE.MathUtils.clamp(0.61 + hueFactor * 0.3, 0.08, 0.75);
    const baseColor = new THREE.Color().setHSL(hue, 0.85, 0.55);

    const widthFactor = 1 - Math.min(dist / this.MAX_CONNECT_DISTANCE, 1);
    const baseWidth = 1 + widthFactor * 2;

    const material = new THREE.LineBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;

    this.scene.add(line);

    const id = this.getThreadKey(nodeAId, nodeBId);
    this.threads.set(id, {
      id,
      line,
      nodeA: nodeAId,
      nodeB: nodeBId,
      baseColor: baseColor.clone(),
      currentColor: baseColor.clone(),
      baseWidth,
      pulseBrightness: 0,
      pulseTimer: 0
    });
  }

  private removeThread(id: string): void {
    const t = this.threads.get(id);
    if (!t) return;
    this.scene.remove(t.line);
    t.line.geometry.dispose();
    (t.line.material as THREE.Material).dispose();
    this.threads.delete(id);
  }

  private spawnParticle(position: THREE.Vector3, velDir: THREE.Vector3): void {
    if (this.particles.size > 800) return;
    const tex = this.makeParticleTexture();
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: 0xccaaff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    const scale = 0.15 + Math.random() * 0.15;
    sprite.scale.set(scale, scale, scale);
    this.scene.add(sprite);

    const id = this.particleIdCounter++;
    this.particles.set(id, {
      id,
      sprite,
      position: position.clone(),
      velocity: velDir.clone().multiplyScalar(0.02 + Math.random() * 0.03),
      life: 0.3,
      maxLife: 0.3
    });
  }

  public triggerPulse(nodeId: number, maxRadius: number = 4): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const ringTex = this.makeRingTexture();
    const mat = new THREE.SpriteMaterial({
      map: ringTex,
      color: 0xffd89a,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Sprite(mat);
    mesh.position.copy(node.position);
    mesh.scale.set(0.2, 0.2, 0.2);
    this.scene.add(mesh);

    const life = 2;
    const id = this.ringIdCounter++;
    this.pulseRings.set(id, {
      id,
      mesh,
      position: node.position.clone(),
      radius: 0.1,
      maxRadius,
      speed: maxRadius / life,
      life,
      maxLife: life,
      affectedThreads: new Set()
    });
  }

  public triggerLocalPulse(nodeId: number): void {
    this.triggerPulse(nodeId, 4);
  }

  public triggerGlobalBurst(): void {
    this.globalBurst = true;
    this.globalBurstTimer = this.globalBurstDuration;
    this.radialBlurAmount = 1;

    this.nodes.forEach((_node, id) => {
      this.triggerPulse(id, 8);
    });
  }

  private updateThreadPulse(thread: ThreadLine): void {
    if (thread.pulseTimer > 0) {
      thread.pulseTimer = Math.max(0, thread.pulseTimer - 0.016);
      const t = thread.pulseTimer / 0.6;
      thread.pulseBrightness = t * 0.5;
    } else {
      thread.pulseBrightness = Math.max(0, thread.pulseBrightness - 0.02);
    }
  }

  private updateThreadColor(thread: ThreadLine): void {
    const mat = thread.line.material as THREE.LineBasicMaterial;

    if (this.globalBurst) {
      const flicker = 0.7 + 0.3 * Math.sin(Date.now() * 0.05);
      mat.color.setRGB(1, 1, 1).multiplyScalar(flicker);
      mat.opacity = 0.95;
    } else if (thread.pulseBrightness > 0.01) {
      const gold = new THREE.Color(0xffd27a);
      const blended = thread.baseColor.clone().lerp(gold, thread.pulseBrightness * 2);
      mat.color.copy(blended).multiplyScalar(1 + thread.pulseBrightness * 0.5);
      mat.opacity = 0.7 + thread.pulseBrightness * 0.3;
    } else {
      mat.color.copy(thread.baseColor);
      mat.opacity = 0.7;
    }
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);

    const stars = this.scene.getObjectByName('ambientStars') as THREE.Points | undefined;
    if (stars && (stars.material as THREE.ShaderMaterial).uniforms) {
      (stars.material as THREE.ShaderMaterial).uniforms.time.value += dt;
    }

    if (this.globalBurst) {
      this.globalBurstTimer -= dt;
      if (this.globalBurstTimer <= 0) {
        this.globalBurst = false;
        this.globalBurstTimer = 0;
      }
      this.radialBlurAmount = Math.max(0, this.radialBlurAmount - dt * 2);
    } else {
      this.radialBlurAmount = Math.max(0, this.radialBlurAmount - dt * 0.5);
    }

    this.nodes.forEach((node) => {
      node.driftTimer -= dt;
      if (node.driftTimer <= 0) {
        node.driftTimer = 5;
        const speed = node.velocity.length();
        const newDir = new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).normalize();
        node.velocity.copy(newDir).multiplyScalar(speed * 0.6 + (0.02 + Math.random() * 0.06) * 0.4);
      }

      node.position.addScaledVector(node.velocity, dt);

      if (node.position.length() > 10) {
        node.position.normalize().multiplyScalar(10);
        node.velocity.negate();
      }

      node.core.position.copy(node.position);
      node.halo.position.copy(node.position);

      if (node.scaleAnim > 0) {
        node.scaleAnim = Math.max(0, node.scaleAnim - dt);
      }
      const t = 1 - node.scaleAnim / 0.2;
      const elasticScale = t < 0.5
        ? t * 2 * 1.2
        : 1.2 - (t - 0.5) * 2 * 0.2;
      const baseScale = 1 + node.hoverAnim * 0.3;
      const finalScale = node.scaleAnim > 0 ? elasticScale : baseScale;
      node.core.scale.setScalar(finalScale);
      node.halo.scale.setScalar(1.5 * finalScale * (0.9 + node.hoverAnim * 0.1));

      const coreMat = node.core.material as THREE.MeshBasicMaterial;
      coreMat.opacity = 0.9 + node.hoverAnim * 0.3 + Math.sin(Date.now() * 0.005 + node.id) * 0.05;

      const haloMat = node.halo.material as THREE.SpriteMaterial;
      const hueShift = 0.03 * Math.sin(Date.now() * 0.001 + node.id);
      const haloColor = node.baseHaloColor.clone();
      const hsl = { h: 0, s: 0, l: 0 };
      haloColor.getHSL(hsl);
      haloColor.setHSL((hsl.h + hueShift + 1) % 1, hsl.s, hsl.l * (1 + node.hoverAnim * 0.2));
      haloMat.color.copy(haloColor);
      haloMat.opacity = 0.75 + node.hoverAnim * 0.1 + Math.sin(Date.now() * 0.003 + node.id * 0.5) * 0.1;

      if (node.hoverAnim > 0) {
        node.hoverAnim = Math.max(0, node.hoverAnim - dt * 3.3);
      }

      node.pulseTimer -= dt;
      if (node.pulseTimer <= 0) {
        node.pulseTimer = node.pulseInterval;
        node.pulseInterval = 1 + Math.random() * 2;
        this.triggerPulse(node.id, 4);
      }

      node.trailTimer -= dt;
      if (node.trailTimer <= 0) {
        node.trailTimer = 0.05;
        const trailDir = node.velocity.clone().negate().normalize();
        trailDir.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        )).normalize();
        this.spawnParticle(node.position.clone(), trailDir);
      }
    });

    const ringsToRemove: number[] = [];
    this.pulseRings.forEach((ring) => {
      ring.life -= dt;
      if (ring.life <= 0) {
        ringsToRemove.push(ring.id);
        return;
      }

      ring.radius += ring.speed * dt;
      const scale = ring.radius * 2;
      ring.mesh.scale.set(scale, scale, scale);
      ring.mesh.position.copy(ring.position);
      const alpha = ring.life / ring.maxLife;
      (ring.mesh.material as THREE.SpriteMaterial).opacity = 0.7 * alpha;

      this.threads.forEach((thread) => {
        if (ring.affectedThreads.has(thread.id)) return;
        const nodeA = this.nodes.get(thread.nodeA);
        const nodeB = this.nodes.get(thread.nodeB);
        if (!nodeA || !nodeB) return;

        const mid = new THREE.Vector3().addVectors(nodeA.position, nodeB.position).multiplyScalar(0.5);
        const distToRingCenter = mid.distanceTo(ring.position);
        const halfLen = nodeA.position.distanceTo(nodeB.position) / 2;

        if (Math.abs(distToRingCenter - ring.radius) < 0.5 + halfLen * 0.3) {
          ring.affectedThreads.add(thread.id);
          thread.pulseTimer = 0.6;
        }
      });
    });
    ringsToRemove.forEach((id) => {
      const ring = this.pulseRings.get(id);
      if (ring) {
        this.scene.remove(ring.mesh);
        (ring.mesh.material as THREE.SpriteMaterial).map?.dispose();
        (ring.mesh.material as THREE.Material).dispose();
        this.pulseRings.delete(id);
      }
    });

    const threadsToCheck: string[] = [];
    this.threads.forEach((thread, id) => {
      const nodeA = this.nodes.get(thread.nodeA);
      const nodeB = this.nodes.get(thread.nodeB);
      if (!nodeA || !nodeB) {
        threadsToCheck.push(id);
        return;
      }

      const pos = thread.line.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, nodeA.position.x, nodeA.position.y, nodeA.position.z);
      pos.setXYZ(1, nodeB.position.x, nodeB.position.y, nodeB.position.z);
      pos.needsUpdate = true;

      const dist = nodeA.position.distanceTo(nodeB.position);
      if (dist > this.MAX_CONNECT_DISTANCE + 2) {
        threadsToCheck.push(id);
      }

      this.updateThreadPulse(thread);
      this.updateThreadColor(thread);
    });

    threadsToCheck.forEach((id) => {
      const t = this.threads.get(id);
      if (!t) return;
      const nodeA = this.nodes.get(t.nodeA);
      const nodeB = this.nodes.get(t.nodeB);
      if (!nodeA || !nodeB) {
        this.removeThread(id);
      } else if (nodeA.position.distanceTo(nodeB.position) > this.MAX_CONNECT_DISTANCE + 2) {
        this.removeThread(id);
      }
    });

    const nodeArray = Array.from(this.nodes.values());
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        if (this.threads.size >= this.MAX_THREADS) break;
        const a = nodeArray[i];
        const b = nodeArray[j];
        const key = this.getThreadKey(a.id, b.id);
        if (this.threads.has(key)) continue;
        const dist = a.position.distanceTo(b.position);
        if (dist <= this.CONNECT_THRESHOLD) {
          this.createThread(a.id, b.id, dist);
        }
      }
    }

    const particlesToRemove: number[] = [];
    this.particles.forEach((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        particlesToRemove.push(p.id);
        return;
      }
      p.position.addScaledVector(p.velocity, dt);
      p.sprite.position.copy(p.position);
      const alpha = p.life / p.maxLife;
      (p.sprite.material as THREE.SpriteMaterial).opacity = alpha * 0.85;
      const s = 0.15 + (1 - alpha) * 0.1;
      p.sprite.scale.set(s, s, s);
    });
    particlesToRemove.forEach((id) => {
      const p = this.particles.get(id);
      if (p) {
        this.scene.remove(p.sprite);
        (p.sprite.material as THREE.SpriteMaterial).map?.dispose();
        (p.sprite.material as THREE.Material).dispose();
        this.particles.delete(id);
      }
    });
  }

  public setHoveredNode(nodeId: number | null): void {
    this.nodes.forEach((node, id) => {
      if (id === nodeId) {
        node.hoverAnim = 1;
      }
    });
  }

  public getStats(): { nodes: number; threads: number; particles: number } {
    return {
      nodes: this.nodes.size,
      threads: this.threads.size,
      particles: this.particles.size
    };
  }

  public handleResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public mount(container: HTMLElement): void {
    container.appendChild(this.renderer.domElement);
  }
}
