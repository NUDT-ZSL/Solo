export interface Capsule {
  id: string;
  title: string;
  content: string;
  images: string[];
  audioUrl: string | null;
  unlockDate: string;
  createdAt: string;
  isPublic: boolean;
  isLocked: boolean;
  creatorId: string;
  tags: string[];
}

export interface CreateCapsuleRequest {
  title: string;
  content: string;
  images: File[];
  audio: File | null;
  unlockDate: string;
  isPublic: boolean;
  tags: string[];
}

export interface TimelineItem {
  id: string;
  title: string;
  summary: string;
  unlockDate: string;
  isLocked: boolean;
  tags: string[];
  color: string;
  createdAt: string;
}

export interface OrbState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: string;
  glowIntensity: number;
  phase: "flying" | "hovering" | "selected";
  flyProgress: number;
  hoverOffset: number;
  itemId: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  opacityDir: number;
}
