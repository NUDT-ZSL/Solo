import * as THREE from 'three';
import {
  EmotionType,
  RoomData,
  easeOut,
} from './labyrinth';

export const EMOTION_COLORS: Record<EmotionType, number> = {
  happy: 0xffd54a,
  sad: 0x4ac3ff,
  angry: 0xff4a5c,
  calm: 0x4affc3,
  anxious: 0x9a7fc1,
};

export const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: '快乐',
  sad: '悲伤',
  angry: '愤怒',
  calm: '平静',
  anxious: '焦虑',
};

interface WallParticleData {
  baseX: Float32Array;
  baseY: Float32Array;
  baseZ: Float32Array;
  offsets: Float32Array;
  wallNormal: THREE.Vector3;
}

export class MemoryRoom {
  public group: THREE.Group;
  public data: RoomData;
  public center: THREE.Vector3;
  private walls: THREE.Points[] = [];
  private wallData: WallParticleData[] = [];
  private textGroup: THREE.Group;
  private textMeshes: THREE.Mesh[] = [];
  private convergeParticles: THREE.Points;
  private convergeData: { baseX: Float32Array; baseY: Float32Array; baseZ: Float32Array };
  private clock: THREE.Clock;
  private animationState: 'idle' | 'rising' | 'display' | 'fading' = 'idle';
  private animElapsed = 0;
  private readonly RISE_TIME = 1.5;
  private readonly DISPLAY_TIME = 5;
  private readonly FADE_TIME = 2;
  private readonly BREATH_PERIOD = 4;
  private userPosition: THREE.Vector3;

  constructor(roomData: RoomData) {
    this.data = roomData;
    this.clock = new THREE.Clock();
    this.userPosition = new THREE.Vector3();
    this.center = new THREE.Vector3(roomData.centerX, 2, roomData.centerZ);

    this.group = new THREE.Group();
    this.group.position.set(roomData.centerX, 0, roomData.centerZ);

    this.textGroup = new THREE.Group();
    this.textGroup.position.y = -2;
    this.textGroup.visible = false;
    this.group.add(this.textGroup);

    this.buildParticleWalls();
    this.buildTextDisplay();
    this.convergeParticles = this.createConvergeParticles();
    this.group.add(this.convergeParticles);
  }

  private hslToHex(h: number, s: number, l: number): number {
    const color = new THREE.Color();
    color.setHSL(h / 360, s / 100, l / 100);
    return color.getHex();
  }

  private emotionToHSL(emotion: EmotionType): { h: number; s: number; l: number } {
    const c = new THREE.Color(EMOTION_COLORS[emotion]);
    return { h: c.getHSL({ h: 0, s: 0, l: 0 }).h * 360, s: 60, l: 82 };
  }

  private buildParticleWalls(): void {
    const half = this.data.size / 2;
    const height = 3;
    const emotion = this.data.memory.emotion;
    const baseHSL = this.emotionToHSL(emotion);

    const wallDefs = [
      { name: 'north', cx: 0, cz: -half, nx: 0, ny: 0, nz: -1, rx: 0, ry: 0, rz: 0, w: this.data.size, h: height },
      { name: 'south', cx: 0, cz: half, nx: 0, ny: 0, nz: 1, rx: 0, ry: Math.PI, rz: 0, w: this.data.size, h: height },
      { name: 'east', cx: half, cz: 0, nx: 1, ny: 0, nz: 0, rx: 0, ry: Math.PI / 2, rz: 0, w: this.data.size, h: height },
      { name: 'west', cx: -half, cz: 0, nx: -1, ny: 0, nz: 0, rx: 0, ry: -Math.PI / 2, rz: 0, w: this.data.size, h: height },
    ];

    for (const wall of wallDefs) {
      const particleCount = 3500;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const baseX = new Float32Array(particleCount);
      const baseY = new Float32Array(particleCount);
      const baseZ = new Float32Array(particleCount);
      const offsets = new Float32Array(particleCount * 3);

      const cols = Math.ceil(Math.sqrt(particleCount * (wall.w / height)));
      const rows = Math.ceil(particleCount / cols);

      let idx = 0;
      for (let r = 0; r < rows && idx < particleCount; r++) {
        for (let c = 0; c < cols && idx < particleCount; c++) {
          const u = (c + 0.5) / cols;
          const v = (r + 0.5) / rows;
          const jitterX = (Math.random() - 0.5) * 0.05;
          const jitterY = (Math.random() - 0.5) * 0.05;
          const px = (u - 0.5) * wall.w + jitterX;
          const py = v * height + jitterY;
          const pz = 0;

          const hueShift = (Math.random() - 0.5) * 15;
          const h = baseHSL.h + hueShift;
          const s = baseHSL.s + (Math.random() - 0.5) * 5;
          const l = baseHSL.l + (Math.random() - 0.5) * 8;
          const colorHex = this.hslToHex(h, s, l);
          const color = new THREE.Color(colorHex);

          baseX[idx] = px;
          baseY[idx] = py;
          baseZ[idx] = pz;
          positions[idx * 3] = px;
          positions[idx * 3 + 1] = py;
          positions[idx * 3 + 2] = pz;
          colors[idx * 3] = color.r;
          colors[idx * 3 + 1] = color.g;
          colors[idx * 3 + 2] = color.b;
          offsets[idx * 3] = 0;
          offsets[idx * 3 + 1] = 0;
          offsets[idx * 3 + 2] = 0;
          idx++;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const points = new THREE.Points(geometry, material);
      points.position.set(wall.cx, 0, wall.cz);
      points.rotation.set(wall.rx, wall.ry, wall.rz);
      this.group.add(points);
      this.walls.push(points);
      this.wallData.push({
        baseX,
        baseY,
        baseZ,
        offsets,
        wallNormal: new THREE.Vector3(wall.nx, wall.ny, wall.nz),
      });
    }
  }

  private createTextTexture(text: string, isTitle = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const fontSize = isTitle ? 96 : 60;
    canvas.width = 2048;
    canvas.height = 256;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private buildTextDisplay(): void {
    const m = this.data.memory;
    const summaryLines: string[] = [
      m.title,
      `${m.date}  ${EMOTION_LABELS[m.emotion]}`,
      `🌤️ ${m.weather ?? '晴朗'}  👥 ${(m.people ?? ['自己']).join('、')}  💭 ${m.mood ?? '难忘'}`,
      m.description,
    ];

    summaryLines.forEach((line, i) => {
      const isTitle = i === 0;
      const texture = this.createTextTexture(line, isTitle);
      const aspect = texture.image.width / texture.image.height;
      const h = isTitle ? 0.9 : 0.55;
      const w = h * aspect * 0.5;
      const geometry = new THREE.PlaneGeometry(w, h);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 1.8 - i * 0.8;
      this.textGroup.add(mesh);
      this.textMeshes.push(mesh);
    });
  }

  private createConvergeParticles(): THREE.Points {
    const count = 600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const baseX = new Float32Array(count);
    const baseY = new Float32Array(count);
    const baseZ = new Float32Array(count);
    const half = this.data.size / 2;
    const color = new THREE.Color(EMOTION_COLORS[this.data.memory.emotion]);

    for (let i = 0; i < count; i++) {
      const corner = i % 4;
      const cx = corner < 2 ? -half + 0.3 : half - 0.3;
      const cz = corner % 2 === 0 ? -half + 0.3 : half - 0.3;
      const x = cx + (Math.random() - 0.5) * 0.5;
      const y = Math.random() * 3;
      const z = cz + (Math.random() - 0.5) * 0.5;
      baseX[i] = x;
      baseY[i] = y;
      baseZ[i] = z;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.convergeData = { baseX, baseY, baseZ };

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  public triggerAnimation(): void {
    this.animationState = 'rising';
    this.animElapsed = 0;
    this.textGroup.visible = true;
    (this.convergeParticles.material as THREE.PointsMaterial).opacity = 1;
  }

  public replay(): void {
    this.animationState = 'rising';
    this.animElapsed = 0;
    this.textGroup.position.y = -2;
    this.textGroup.visible = true;
    this.textMeshes.forEach((m) => {
      (m.material as THREE.MeshBasicMaterial).opacity = 0;
    });
    (this.convergeParticles.material as THREE.PointsMaterial).opacity = 1;
  }

  public update(userPos: THREE.Vector3, delta: number): void {
    this.userPosition.copy(userPos);
    const time = this.clock.getElapsedTime();

    const breath = 0.8 + 0.2 * (0.5 + 0.5 * Math.sin((time / this.BREATH_PERIOD) * Math.PI * 2));
    this.walls.forEach((w) => {
      (w.material as THREE.PointsMaterial).opacity = 0.75 * breath;
    });

    this.walls.forEach((points, wallIdx) => {
      const data = this.wallData[wallIdx];
      const posAttr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const worldWallPos = new THREE.Vector3();
      points.getWorldPosition(worldWallPos);
      const wallNormalWorld = data.wallNormal.clone().applyEuler(points.rotation).normalize();

      for (let i = 0; i < posAttr.count; i++) {
        const brownX = (Math.random() - 0.5) * 0.01;
        const brownY = (Math.random() - 0.5) * 0.01;
        const brownZ = (Math.random() - 0.5) * 0.01;

        data.offsets[i * 3] += brownX - data.offsets[i * 3] * 0.1;
        data.offsets[i * 3 + 1] += brownY - data.offsets[i * 3 + 1] * 0.1;
        data.offsets[i * 3 + 2] += brownZ - data.offsets[i * 3 + 2] * 0.1;

        const particleWorld = new THREE.Vector3(
          data.baseX[i] + data.offsets[i * 3],
          data.baseY[i] + data.offsets[i * 3 + 1],
          data.baseZ[i] + data.offsets[i * 3 + 2]
        ).add(worldWallPos);

        const dist = this.userPosition.distanceTo(particleWorld);
        let bulge = 0;
        if (dist < 2) {
          bulge = (1 - dist / 2) * 0.4;
        }

        positions[i * 3] = data.baseX[i] + data.offsets[i * 3] + wallNormalWorld.x * bulge;
        positions[i * 3 + 1] = data.baseY[i] + data.offsets[i * 3 + 1] + wallNormalWorld.y * bulge;
        positions[i * 3 + 2] = data.baseZ[i] + data.offsets[i * 3 + 2] + wallNormalWorld.z * bulge;
      }
      posAttr.needsUpdate = true;
    });

    if (this.animationState !== 'idle') {
      this.animElapsed += delta;
      if (this.animationState === 'rising') {
        const t = Math.min(1, this.animElapsed / this.RISE_TIME);
        const eased = easeOut(t);
        this.textGroup.position.y = -2 + eased * 2;
        this.textMeshes.forEach((m, i) => {
          const delay = i * 0.15;
          const mt = Math.max(0, Math.min(1, (this.animElapsed - delay) / this.RISE_TIME));
          (m.material as THREE.MeshBasicMaterial).opacity = easeOut(mt);
        });

        const convMat = this.convergeParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
        const convPos = convMat.array as Float32Array;
        for (let i = 0; i < convMat.count; i++) {
          const tx = (Math.random() - 0.5) * 1.2;
          const ty = 1.5 + (Math.random() - 0.5) * 1;
          const tz = (Math.random() - 0.5) * 1.2;
          const speed = 0.5 * delta;
          convPos[i * 3] += (tx - convPos[i * 3]) * speed * 2;
          convPos[i * 3 + 1] += (ty - convPos[i * 3 + 1]) * speed * 2;
          convPos[i * 3 + 2] += (tz - convPos[i * 3 + 2]) * speed * 2;
        }
        convMat.needsUpdate = true;

        if (this.animElapsed >= this.RISE_TIME) {
          this.animationState = 'display';
          this.animElapsed = 0;
          (this.convergeParticles.material as THREE.PointsMaterial).opacity = 0.5;
        }
      } else if (this.animationState === 'display') {
        const convMat = this.convergeParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
        const convPos = convMat.array as Float32Array;
        for (let i = 0; i < convMat.count; i++) {
          convPos[i * 3] += (Math.random() - 0.5) * 0.003;
          convPos[i * 3 + 1] += (Math.random() - 0.5) * 0.003;
          convPos[i * 3 + 2] += (Math.random() - 0.5) * 0.003;
        }
        convMat.needsUpdate = true;

        if (this.animElapsed >= this.DISPLAY_TIME) {
          this.animationState = 'fading';
          this.animElapsed = 0;
        }
      } else if (this.animationState === 'fading') {
        const t = Math.min(1, this.animElapsed / this.FADE_TIME);
        const invT = 1 - t;
        this.textMeshes.forEach((m) => {
          (m.material as THREE.MeshBasicMaterial).opacity = invT;
        });
        (this.convergeParticles.material as THREE.PointsMaterial).opacity = 0.5 * invT;
        if (this.animElapsed >= this.FADE_TIME) {
          this.animationState = 'idle';
          this.textGroup.visible = false;
        }
      }
    } else {
      const convMat = this.convergeParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const convPos = convMat.array as Float32Array;
      for (let i = 0; i < convMat.count; i++) {
        convPos[i * 3] = this.convergeData.baseX[i];
        convPos[i * 3 + 1] = this.convergeData.baseY[i];
        convPos[i * 3 + 2] = this.convergeData.baseZ[i];
      }
      convMat.needsUpdate = false;
    }
  }

  public containsPoint(worldPos: THREE.Vector3): boolean {
    const half = this.data.size / 2;
    const local = worldPos.clone().sub(new THREE.Vector3(this.data.centerX, 0, this.data.centerZ));
    return Math.abs(local.x) <= half && Math.abs(local.z) <= half;
  }
}
