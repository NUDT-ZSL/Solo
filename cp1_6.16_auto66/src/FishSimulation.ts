export interface FishType {
  name: string;
  color: string;
  shape: 'triangle' | 'circle' | 'streamline' | 'flat' | 'long';
  diet: string;
  funFact: string;
}

export interface Fish {
  id: number;
  type: number;
  color: string;
  name: string;
  diet: string;
  funFact: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  speed: number;
  baseSpeed: number;
  pathOffset: number;
  wavePhase: number;
  isPaused: boolean;
  isBoosted: boolean;
  boostEndTime: number;
  pauseEndTime: number;
  angle: number;
  centerX: number;
  centerZ: number;
  radius: number;
  yOffset: number;
  yAmplitude: number;
}

export interface ControlData {
  globalSpeed: number;
  boostedFishId: number | null;
}

export const FISH_TYPES: FishType[] = [
  {
    name: '小丑鱼',
    color: '#FF6B6B',
    shape: 'triangle',
    diet: '杂食',
    funFact: '小丑鱼会变性，最强壮的母鱼是首领'
  },
  {
    name: '蓝倒吊',
    color: '#4ECDC4',
    shape: 'flat',
    diet: '草食',
    funFact: '蓝倒吊尾部有尖锐毒刺，用于防御天敌'
  },
  {
    name: '蝴蝶鱼',
    color: '#FFD93D',
    shape: 'circle',
    diet: '肉食',
    funFact: '蝴蝶鱼通常成对生活，对伴侣忠贞不渝'
  },
  {
    name: '霓虹灯鱼',
    color: '#6BCB77',
    shape: 'streamline',
    diet: '杂食',
    funFact: '霓虹灯鱼身体侧面有闪亮的蓝色条纹，如霓虹灯光'
  },
  {
    name: '神仙鱼',
    color: '#7C4DFF',
    shape: 'long',
    diet: '肉食',
    funFact: '神仙鱼背鳍和臀鳍很长，游动姿态优雅如天使'
  }
];

const TANK_BOUNDS = {
  minX: -7,
  maxX: 7,
  minY: -2,
  maxY: 3,
  minZ: -4,
  maxZ: 4
};

export function generateInitialFish(count: number = 30): Fish[] {
  const fish: Fish[] = [];
  
  for (let i = 0; i < count; i++) {
    const typeIndex = i % 5;
    const fishType = FISH_TYPES[typeIndex];
    
    const centerX = (Math.random() - 0.5) * 6;
    const centerZ = (Math.random() - 0.5) * 4;
    const radius = 1.5 + Math.random() * 2.5;
    const yOffset = (Math.random() - 0.5) * 3;
    const yAmplitude = 0.3 + Math.random() * 0.5;
    
    fish.push({
      id: i,
      type: typeIndex,
      color: fishType.color,
      name: fishType.name,
      diet: fishType.diet,
      funFact: fishType.funFact,
      position: {
        x: centerX + radius * Math.cos(Math.random() * Math.PI * 2),
        y: yOffset,
        z: centerZ + radius * Math.sin(Math.random() * Math.PI * 2)
      },
      rotation: { x: 0, y: 0, z: 0 },
      speed: 0.8 + Math.random() * 0.6,
      baseSpeed: 0.8 + Math.random() * 0.6,
      pathOffset: Math.random() * Math.PI * 2,
      wavePhase: Math.random() * Math.PI * 2,
      isPaused: false,
      isBoosted: false,
      boostEndTime: 0,
      pauseEndTime: 0,
      angle: Math.random() * Math.PI * 2,
      centerX,
      centerZ,
      radius,
      yOffset,
      yAmplitude
    });
  }
  
  return fish;
}

export function updateFish(
  fishList: Fish[],
  deltaTime: number,
  elapsedTime: number,
  controlData: ControlData
): Fish[] {
  return fishList.map(fish => {
    const updatedFish = { ...fish };
    
    if (updatedFish.isPaused && elapsedTime > updatedFish.pauseEndTime) {
      updatedFish.isPaused = false;
    }
    
    if (updatedFish.isBoosted && elapsedTime > updatedFish.boostEndTime) {
      updatedFish.isBoosted = false;
    }
    
    let speedMultiplier = controlData.globalSpeed;
    if (controlData.boostedFishId === fish.id || updatedFish.isBoosted) {
      speedMultiplier *= 1.5;
    }
    
    if (updatedFish.isPaused) {
      speedMultiplier = 0;
    }
    
    const angularSpeed = updatedFish.speed * speedMultiplier * 0.8;
    updatedFish.angle += angularSpeed * deltaTime;
    
    const xOffset = Math.sin(updatedFish.angle * 0.7 + updatedFish.pathOffset) * 0.5;
    const zOffset = Math.cos(updatedFish.angle * 0.5 + updatedFish.pathOffset * 1.3) * 0.3;
    
    updatedFish.position.x = updatedFish.centerX + 
      updatedFish.radius * Math.cos(updatedFish.angle) + xOffset;
    updatedFish.position.z = updatedFish.centerZ + 
      updatedFish.radius * Math.sin(updatedFish.angle) + zOffset;
    
    updatedFish.position.y = updatedFish.yOffset + 
      updatedFish.yAmplitude * Math.sin(updatedFish.angle * 2 + updatedFish.pathOffset);
    
    updatedFish.position.x = Math.max(TANK_BOUNDS.minX, Math.min(TANK_BOUNDS.maxX, updatedFish.position.x));
    updatedFish.position.y = Math.max(TANK_BOUNDS.minY, Math.min(TANK_BOUNDS.maxY, updatedFish.position.y));
    updatedFish.position.z = Math.max(TANK_BOUNDS.minZ, Math.min(TANK_BOUNDS.maxZ, updatedFish.position.z));
    
    const nextX = updatedFish.centerX + 
      updatedFish.radius * Math.cos(updatedFish.angle + 0.01) + xOffset;
    const nextZ = updatedFish.centerZ + 
      updatedFish.radius * Math.sin(updatedFish.angle + 0.01) + zOffset;
    updatedFish.rotation.y = Math.atan2(nextX - updatedFish.position.x, nextZ - updatedFish.position.z);
    
    updatedFish.wavePhase += deltaTime * (1 / 0.2);
    
    return updatedFish;
  });
}

export function pauseFish(fish: Fish, elapsedTime: number, duration: number = 0.5): Fish {
  return {
    ...fish,
    isPaused: true,
    pauseEndTime: elapsedTime + duration
  };
}

export function boostFish(fish: Fish, elapsedTime: number, duration: number = 5): Fish {
  return {
    ...fish,
    isBoosted: true,
    boostEndTime: elapsedTime + duration
  };
}
