import * as THREE from 'three';

export enum BlockType {
  SOLID = 'solid',
  TRANSPARENT = 'transparent',
  HIDDEN = 'hidden',
  DOUBLE_CLICK = 'double_click',
  EXIT = 'exit',
  START = 'start',
}

export interface BlockConfig {
  x: number;
  y: number;
  z: number;
  type: BlockType;
  baseOpacity: number;
  colorHex: string;
  glowIntensity: number;
  needsDoubleTap: boolean;
}

export interface LevelConfig {
  id: number;
  name: string;
  gridSize: { x: number; y: number; z: number };
  blocks: BlockConfig[];
  startPosition: { x: number; y: number; z: number };
  exitPosition: { x: number; y: number; z: number };
  proximityRadius: number;
  opacityCurve: (distance: number, baseOpacity: number) => number;
  colorShiftSpeed: number;
}

export interface MazeBlock {
  mesh: THREE.Mesh;
  edgeMesh: THREE.LineSegments;
  config: BlockConfig;
  currentOpacity: number;
  isSolidified: boolean;
  targetColor: THREE.Color;
  currentColor: THREE.Color;
  glowPulse: number;
}

const BLOCK_SIZE = 1;
const BLOCK_GAP = 0.05;

export class MazeBuilder {
  private scene: THREE.Scene;
  private blocks: MazeBlock[] = [];
  private currentLevel: LevelConfig | null = null;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private sharedGeometry: THREE.BoxGeometry;
  private edgeGeometry: THREE.EdgesGeometry;
  private clock: THREE.Clock;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sharedGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    this.edgeGeometry = new THREE.EdgesGeometry(this.sharedGeometry);
    this.clock = new THREE.Clock();
  }

  getBlocks(): MazeBlock[] {
    return this.blocks;
  }

  getLevel(): LevelConfig | null {
    return this.currentLevel;
  }

  buildLevel(config: LevelConfig): void {
    this.clear();
    this.currentLevel = config;

    for (const blockCfg of config.blocks) {
      const block = this.createBlock(blockCfg);
      this.blocks.push(block);
      this.scene.add(block.mesh);
      this.scene.add(block.edgeMesh);
    }
  }

  clear(): void {
    for (const block of this.blocks) {
      this.scene.remove(block.mesh);
      this.scene.remove(block.edgeMesh);
      (block.mesh.material as THREE.Material).dispose();
      (block.edgeMesh.material as THREE.Material).dispose();
    }
    this.blocks = [];
    this.currentLevel = null;
  }

  update(playerPos: THREE.Vector3): void {
    this.playerPosition.copy(playerPos);
    const dt = this.clock.getDelta();
    const level = this.currentLevel;
    if (!level) return;

    for (const block of this.blocks) {
      this.updateBlockOpacity(block, level);
      this.updateBlockColor(block, level, dt);
      this.updateBlockGlow(block, dt);
    }
  }

  findBlockAt(worldX: number, worldY: number, worldZ: number): MazeBlock | null {
    const gx = Math.round(worldX / (BLOCK_SIZE + BLOCK_GAP));
    const gy = Math.round(worldY / (BLOCK_SIZE + BLOCK_GAP));
    const gz = Math.round(worldZ / (BLOCK_SIZE + BLOCK_GAP));

    return (
      this.blocks.find((b) => {
        const bx = b.config.x;
        const by = b.config.y;
        const bz = b.config.z;
        return bx === gx && by === gy && bz === gz;
      }) || null
    );
  }

  solidifyBlock(block: MazeBlock): boolean {
    if (block.config.needsDoubleTap && !block.isSolidified) {
      block.isSolidified = true;
      block.config.type = BlockType.SOLID;
      block.config.baseOpacity = 1.0;
      return true;
    }
    return false;
  }

  isWalkable(gx: number, gy: number, gz: number): boolean {
    const block = this.findBlockAt(
      gx * (BLOCK_SIZE + BLOCK_GAP),
      gy * (BLOCK_SIZE + BLOCK_GAP),
      gz * (BLOCK_SIZE + BLOCK_GAP)
    );
    if (!block) return false;
    if (block.config.type === BlockType.HIDDEN) return false;
    if (block.config.type === BlockType.TRANSPARENT && !block.isSolidified) return false;
    if (block.config.needsDoubleTap && !block.isSolidified) return false;
    return true;
  }

  private createBlock(cfg: BlockConfig): MazeBlock {
    const spacing = BLOCK_SIZE + BLOCK_GAP;
    const pos = new THREE.Vector3(cfg.x * spacing, cfg.y * spacing, cfg.z * spacing);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.colorHex),
      transparent: true,
      opacity: cfg.type === BlockType.HIDDEN ? 0 : cfg.baseOpacity,
      emissive: new THREE.Color(cfg.colorHex),
      emissiveIntensity: cfg.glowIntensity * 0.3,
      roughness: 0.3,
      metalness: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(this.sharedGeometry, material);
    mesh.position.copy(pos);
    mesh.userData = { gridX: cfg.x, gridY: cfg.y, gridZ: cfg.z, blockType: cfg.type };

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(cfg.colorHex),
      transparent: true,
      opacity: cfg.type === BlockType.HIDDEN ? 0 : Math.min(cfg.glowIntensity, 1),
      linewidth: 1,
    });
    const edgeMesh = new THREE.LineSegments(this.edgeGeometry, edgeMaterial);
    edgeMesh.position.copy(pos);

    return {
      mesh,
      edgeMesh,
      config: { ...cfg },
      currentOpacity: cfg.type === BlockType.HIDDEN ? 0 : cfg.baseOpacity,
      isSolidified: false,
      targetColor: new THREE.Color(cfg.colorHex),
      currentColor: new THREE.Color(cfg.colorHex),
      glowPulse: 0,
    };
  }

  private updateBlockOpacity(block: MazeBlock, level: LevelConfig): void {
    const spacing = BLOCK_SIZE + BLOCK_GAP;
    const blockWorld = new THREE.Vector3(
      block.config.x * spacing,
      block.config.y * spacing,
      block.config.z * spacing
    );
    const dist = this.playerPosition.distanceTo(blockWorld);
    const targetOpacity = level.opacityCurve(dist, block.config.baseOpacity);

    if (block.config.type === BlockType.HIDDEN && dist < level.proximityRadius) {
      const revealFactor = 1 - dist / level.proximityRadius;
      block.currentOpacity = THREE.MathUtils.lerp(block.currentOpacity, revealFactor * 0.5, 0.05);
    } else if (block.config.type === BlockType.HIDDEN) {
      block.currentOpacity = THREE.MathUtils.lerp(block.currentOpacity, 0, 0.03);
    } else {
      block.currentOpacity = THREE.MathUtils.lerp(block.currentOpacity, targetOpacity, 0.08);
    }

    const mat = block.mesh.material as THREE.MeshStandardMaterial;
    mat.opacity = block.currentOpacity;
    mat.depthWrite = block.currentOpacity > 0.9;

    const edgeMat = block.edgeMesh.material as THREE.LineBasicMaterial;
    edgeMat.opacity = Math.min(block.currentOpacity + 0.2, 1);
  }

  private updateBlockColor(block: MazeBlock, level: LevelConfig, dt: number): void {
    const spacing = BLOCK_SIZE + BLOCK_GAP;
    const blockWorld = new THREE.Vector3(
      block.config.x * spacing,
      block.config.y * spacing,
      block.config.z * spacing
    );
    const dist = this.playerPosition.distanceTo(blockWorld);

    const proximityFactor = Math.max(0, 1 - dist / (level.proximityRadius * 2));
    const hue = (0.6 + proximityFactor * 0.2 + this.clock.elapsedTime * level.colorShiftSpeed * 0.1) % 1;
    block.targetColor.setHSL(hue, 0.8, 0.5 + proximityFactor * 0.2);

    block.currentColor.lerp(block.targetColor, dt * 2);

    const mat = block.mesh.material as THREE.MeshStandardMaterial;
    mat.color.copy(block.currentColor);
    mat.emissive.copy(block.currentColor);
    mat.emissiveIntensity = 0.2 + proximityFactor * 0.5;

    const edgeMat = block.edgeMesh.material as THREE.LineBasicMaterial;
    edgeMat.color.copy(block.currentColor);
  }

  private updateBlockGlow(block: MazeBlock, dt: number): void {
    block.glowPulse += dt * 2;
    const pulse = Math.sin(block.glowPulse) * 0.15 + 0.85;
    const scale = block.config.type === BlockType.EXIT ? 1 + Math.sin(block.glowPulse * 1.5) * 0.05 : 1;
    block.mesh.scale.setScalar(scale);
    block.edgeMesh.scale.setScalar(scale);

    const mat = block.mesh.material as THREE.MeshStandardMaterial;
    if (block.config.type === BlockType.EXIT || block.config.type === BlockType.START) {
      mat.emissiveIntensity *= pulse;
    }
  }
}

export function createLevelConfigs(): LevelConfig[] {
  return [
    {
      id: 1,
      name: '启程',
      gridSize: { x: 5, y: 2, z: 5 },
      startPosition: { x: 0, y: 0, z: 0 },
      exitPosition: { x: 4, y: 0, z: 4 },
      proximityRadius: 4,
      opacityCurve: (dist, base) => {
        if (dist < 2) return Math.min(base + 0.3, 1);
        if (dist < 5) return base;
        return Math.max(base - 0.2, 0.1);
      },
      colorShiftSpeed: 0.5,
      blocks: generateLevel1Blocks(),
    },
    {
      id: 2,
      name: '迷雾',
      gridSize: { x: 6, y: 3, z: 6 },
      startPosition: { x: 0, y: 0, z: 0 },
      exitPosition: { x: 5, y: 2, z: 5 },
      proximityRadius: 3,
      opacityCurve: (dist, base) => {
        if (dist < 3) return Math.min(base + 0.4, 1);
        return Math.max(base * 0.3, 0.05);
      },
      colorShiftSpeed: 0.8,
      blocks: generateLevel2Blocks(),
    },
    {
      id: 3,
      name: '虚空',
      gridSize: { x: 7, y: 3, z: 7 },
      startPosition: { x: 0, y: 0, z: 0 },
      exitPosition: { x: 6, y: 2, z: 6 },
      proximityRadius: 2.5,
      opacityCurve: (dist, base) => {
        if (dist < 2) return Math.min(base + 0.5, 1);
        if (dist < 4) return base * 0.6;
        return 0.03;
      },
      colorShiftSpeed: 1.2,
      blocks: generateLevel3Blocks(),
    },
  ];
}

function generateLevel1Blocks(): BlockConfig[] {
  const blocks: BlockConfig[] = [];
  const floor: [number, number, number][] = [];
  const walls = new Set<string>();

  const path = [
    [0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 0, 1], [2, 0, 2],
    [3, 0, 2], [4, 0, 2], [4, 0, 3], [4, 0, 4],
  ];
  const pathSet = new Set(path.map((p) => p.join(',')));

  for (let x = 0; x < 5; x++) {
    for (let z = 0; z < 5; z++) {
      if (pathSet.has(`${x},0,${z}`)) {
        floor.push([x, 0, z]);
      } else if (Math.random() < 0.3) {
        floor.push([x, 0, z]);
      }
    }
  }

  for (const [x, y, z] of floor) {
    const isStart = x === 0 && y === 0 && z === 0;
    const isExit = x === 4 && y === 0 && z === 4;
    const isPath = pathSet.has(`${x},${y},${z}`);

    blocks.push({
      x, y, z,
      type: isStart ? BlockType.START : isExit ? BlockType.EXIT : BlockType.SOLID,
      baseOpacity: isPath ? 0.9 : 0.6,
      colorHex: isStart ? '#00ff88' : isExit ? '#ff44aa' : '#4488ff',
      glowIntensity: isStart || isExit ? 1.5 : 0.5,
      needsDoubleTap: false,
    });
  }

  walls.add('1,1,0'); walls.add('2,1,1'); walls.add('3,1,2'); walls.add('3,1,3');
  for (const key of walls) {
    const [x, y, z] = key.split(',').map(Number);
    blocks.push({
      x, y, z,
      type: BlockType.TRANSPARENT,
      baseOpacity: 0.35,
      colorHex: '#8844ff',
      glowIntensity: 0.8,
      needsDoubleTap: false,
    });
  }

  return blocks;
}

function generateLevel2Blocks(): BlockConfig[] {
  const blocks: BlockConfig[] = [];
  const path = [
    [0,0,0],[1,0,0],[2,0,0],[2,0,1],[2,0,2],
    [2,1,2],[2,2,2],[3,2,2],[4,2,2],[4,2,3],
    [4,2,4],[5,2,4],[5,2,5],
  ];
  const pathSet = new Set(path.map((p) => p.join(',')));

  for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 6; z++) {
        const key = `${x},${y},${z}`;
        if (!pathSet.has(key) && Math.random() < 0.2) continue;
        if (!pathSet.has(key) && Math.random() > 0.5) continue;

        const isStart = x === 0 && y === 0 && z === 0;
        const isExit = x === 5 && y === 2 && z === 5;
        const isPath = pathSet.has(key);
        const isDblClick = isPath && Math.random() < 0.2 && !isStart && !isExit;

        if (isPath || Math.random() < 0.15) {
          blocks.push({
            x, y, z,
            type: isStart ? BlockType.START : isExit ? BlockType.EXIT
              : isDblClick ? BlockType.DOUBLE_CLICK
              : y > 0 ? BlockType.TRANSPARENT : BlockType.SOLID,
            baseOpacity: isPath ? 0.85 : 0.3,
            colorHex: isStart ? '#00ff88' : isExit ? '#ff44aa'
              : isDblClick ? '#ffaa00' : '#6644ff',
            glowIntensity: isStart || isExit ? 1.5 : isDblClick ? 1.2 : 0.6,
            needsDoubleTap: isDblClick,
          });
        }
      }
    }
  }

  const hiddenPositions = [[1,0,1],[3,1,2],[4,1,3],[3,2,5]];
  for (const [x, y, z] of hiddenPositions) {
    blocks.push({
      x, y, z,
      type: BlockType.HIDDEN,
      baseOpacity: 0,
      colorHex: '#2244aa',
      glowIntensity: 0,
      needsDoubleTap: false,
    });
  }

  return blocks;
}

function generateLevel3Blocks(): BlockConfig[] {
  const blocks: BlockConfig[] = [];
  const path = [
    [0,0,0],[1,0,0],[2,0,0],[2,0,1],[2,0,2],
    [2,1,2],[2,2,2],[3,2,2],[3,2,3],[4,2,3],
    [4,1,3],[4,0,3],[4,0,4],[4,0,5],[5,0,5],
    [5,1,5],[5,2,5],[6,2,5],[6,2,6],
  ];
  const pathSet = new Set(path.map((p) => p.join(',')));

  for (let x = 0; x < 7; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 7; z++) {
        const key = `${x},${y},${z}`;
        if (pathSet.has(key)) {
          const isStart = x === 0 && y === 0 && z === 0;
          const isExit = x === 6 && y === 2 && z === 6;
          const isDblClick = !isStart && !isExit && Math.random() < 0.25;

          blocks.push({
            x, y, z,
            type: isStart ? BlockType.START : isExit ? BlockType.EXIT
              : isDblClick ? BlockType.DOUBLE_CLICK : BlockType.TRANSPARENT,
            baseOpacity: isDblClick ? 0.4 : 0.7,
            colorHex: isStart ? '#00ff88' : isExit ? '#ff44aa'
              : isDblClick ? '#ffaa00' : '#4466ff',
            glowIntensity: isStart || isExit ? 1.5 : isDblClick ? 1.2 : 0.7,
            needsDoubleTap: isDblClick,
          });
        } else if (Math.random() < 0.08) {
          blocks.push({
            x, y, z,
            type: Math.random() < 0.4 ? BlockType.HIDDEN : BlockType.TRANSPARENT,
            baseOpacity: Math.random() < 0.4 ? 0 : 0.15,
            colorHex: '#3322aa',
            glowIntensity: 0.3,
            needsDoubleTap: false,
          });
        }
      }
    }
  }

  return blocks;
}
