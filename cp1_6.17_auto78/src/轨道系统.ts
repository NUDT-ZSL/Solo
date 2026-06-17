export interface Diamond {
  id: number;
  track: number;
  y: number;
  size: number;
  color: string;
  glowColor: string;
  opacity: number;
  passed: boolean;
  hit: boolean;
}

export interface TrackState {
  diamonds: Diamond[];
  trackCount: number;
  trackWidth: number;
  diamondSize: number;
  speed: number;
}

let diamondIdCounter = 0;

export const createTrackState = (trackCount: number = 3, trackWidth: number = 120): TrackState => {
  return {
    diamonds: [],
    trackCount,
    trackWidth,
    diamondSize: 40,
    speed: 150,
  };
};

export const generateDiamond = (track: number, startY: number, color: string = '#00FFFF'): Diamond => {
  diamondIdCounter++;
  return {
    id: diamondIdCounter,
    track,
    y: startY,
    size: 40,
    color,
    glowColor: color,
    opacity: 0.8,
    passed: false,
    hit: false,
  };
};

export const updateDiamonds = (
  state: TrackState,
  deltaTime: number,
  playerY: number
): { state: TrackState; passedDiamonds: Diamond[] } => {
  const newDiamonds: Diamond[] = [];
  const passedDiamonds: Diamond[] = [];

  for (const diamond of state.diamonds) {
    const newY = diamond.y + state.speed * deltaTime;
    const updatedDiamond = { ...diamond, y: newY };

    if (!diamond.passed && newY >= playerY) {
      updatedDiamond.passed = true;
      passedDiamonds.push(updatedDiamond);
    }

    if (newY < playerY + 200) {
      newDiamonds.push(updatedDiamond);
    }
  }

  return {
    state: { ...state, diamonds: newDiamonds.slice(-50) },
    passedDiamonds,
  };
};

export const checkCollision = (
  diamond: Diamond,
  playerTrack: number,
  playerY: number,
  isJumping: boolean,
  jumpHeight: number = 200
): 'perfect' | 'normal' | 'miss' | 'none' => {
  const trackMatch = diamond.track === playerTrack;
  const yDistance = Math.abs(diamond.y - playerY);
  
  if (yDistance > 40) {
    return 'none';
  }

  if (!trackMatch) {
    if (yDistance < 20) {
      return 'normal';
    }
    return 'none';
  }

  if (isJumping && jumpHeight > 100) {
    if (yDistance <= 5) {
      return 'perfect';
    }
    return 'normal';
  }

  if (yDistance <= 5) {
    return 'perfect';
  }

  return 'miss';
};

export const checkPlayerCollision = (
  diamonds: Diamond[],
  playerTrack: number,
  playerY: number,
  isJumping: boolean,
  jumpHeight: number = 200
): { diamond: Diamond; result: 'perfect' | 'normal' | 'miss' } | null => {
  for (const diamond of diamonds) {
    if (diamond.hit) continue;
    
    const result = checkCollision(diamond, playerTrack, playerY, isJumping, jumpHeight);
    if (result !== 'none') {
      return { diamond, result };
    }
  }
  return null;
};

export const clearAllDiamonds = (state: TrackState): TrackState => {
  return { ...state, diamonds: [] };
};

export const resetDiamondIdCounter = (): void => {
  diamondIdCounter = 0;
};
