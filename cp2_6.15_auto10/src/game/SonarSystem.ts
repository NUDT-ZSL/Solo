import { SonarWave, SonarReflection, SonarFeedbackPoint, Vector2, Rect, Player } from '../types';

export class SonarSystem {
  private waves: SonarWave[] = [];
  private feedback: SonarFeedbackPoint[] = [];
  private waveIdCounter: number = 0;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  emitSonarWave(origin: Vector2, isFake: boolean = false): void {
    const wave: SonarWave = {
      id: this.waveIdCounter++,
      origin: { ...origin },
      radius: 0,
      maxRadius: 600,
      speed: 4,
      reflections: [],
      isFake,
      createdAt: performance.now()
    };
    this.waves.push(wave);
    this.playSonarSound(isFake);
  }

  private playSonarSound(isFake: boolean): void {
    if (!this.audioContext || !this.analyser) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(
        isFake ? 600 : 800,
        this.audioContext.currentTime
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        isFake ? 300 : 400,
        this.audioContext.currentTime + 0.1
      );
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + 0.2
      );
      
      oscillator.connect(gainNode);
      gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.2);
    } catch (e) {
      // Ignore audio errors
    }
  }

  update(
    obstacles: Rect[],
    stalker: Player,
    stalkerCrouching: boolean
  ): { detectionCount: number; hunterHits: Vector2[] } {
    const newFeedback: SonarFeedbackPoint[] = [];
    let detectionCount = 0;
    const hunterHits: Vector2[] = [];
    
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      const prevRadius = wave.radius;
      wave.radius += wave.speed;
      
      if (wave.radius >= wave.maxRadius) {
        this.waves.splice(i, 1);
        continue;
      }
      
      const reflectionPoints = this.calculateReflections(
        wave,
        prevRadius,
        obstacles
      );
      
      const stalkerHit = this.checkStalkerHit(
        wave,
        prevRadius,
        stalker.position,
        stalkerCrouching
      );
      
      if (stalkerHit && !wave.isFake) {
        const strength = stalkerCrouching ? 0.5 : 1.0;
        newFeedback.push({
          position: { ...stalker.position },
          isHit: true,
          timestamp: performance.now(),
          strength
        });
        hunterHits.push({ ...stalker.position });
        detectionCount++;
        
        wave.reflections.push({
          points: [{ ...stalker.position }],
          isHit: true,
          hitTime: performance.now(),
          signalStrength: strength
        });
      }
      
      for (const point of reflectionPoints) {
        newFeedback.push({
          position: point,
          isHit: false,
          timestamp: performance.now(),
          strength: 1.0
        });
      }
    }
    
    this.feedback = [...this.feedback, ...newFeedback];
    this.cleanupOldFeedback();
    
    return { detectionCount, hunterHits };
  }

  private calculateReflections(
    wave: SonarWave,
    prevRadius: number,
    obstacles: Rect[]
  ): Vector2[] {
    const points: Vector2[] = [];
    const sampleCount = 36;
    const angleStep = (Math.PI * 2) / sampleCount;
    
    for (let i = 0; i < sampleCount; i++) {
      const angle = i * angleStep;
      const prevPoint = {
        x: wave.origin.x + Math.cos(angle) * prevRadius,
        y: wave.origin.y + Math.sin(angle) * prevRadius
      };
      const currPoint = {
        x: wave.origin.x + Math.cos(angle) * wave.radius,
        y: wave.origin.y + Math.sin(angle) * wave.radius
      };
      
      for (const obstacle of obstacles) {
        const hit = this.rayRectIntersection(prevPoint, currPoint, obstacle);
        if (hit) {
          points.push(hit);
          break;
        }
      }
    }
    
    return points;
  }

  private rayRectIntersection(
    p1: Vector2,
    p2: Vector2,
    rect: Rect
  ): Vector2 | null {
    const edges = [
      { x1: rect.x, y1: rect.y, x2: rect.x + rect.w, y2: rect.y },
      { x1: rect.x + rect.w, y1: rect.y, x2: rect.x + rect.w, y2: rect.y + rect.h },
      { x1: rect.x + rect.w, y1: rect.y + rect.h, x2: rect.x, y2: rect.y + rect.h },
      { x1: rect.x, y1: rect.y + rect.h, x2: rect.x, y2: rect.y }
    ];
    
    let closest: Vector2 | null = null;
    let closestDist = Infinity;
    
    for (const edge of edges) {
      const hit = this.lineIntersection(p1, p2, 
        { x: edge.x1, y: edge.y1 }, 
        { x: edge.x2, y: edge.y2 }
      );
      
      if (hit) {
        const dist = Math.sqrt(
          (hit.x - p1.x) ** 2 + (hit.y - p1.y) ** 2
        );
        if (dist < closestDist) {
          closestDist = dist;
          closest = hit;
        }
      }
    }
    
    return closest;
  }

  private lineIntersection(
    p1: Vector2,
    p2: Vector2,
    p3: Vector2,
    p4: Vector2
  ): Vector2 | null {
    const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    
    if (Math.abs(denominator) < 0.0001) return null;
    
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
    
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return {
        x: p1.x + ua * (p2.x - p1.x),
        y: p1.y + ua * (p2.y - p1.y)
      };
    }
    
    return null;
  }

  private checkStalkerHit(
    wave: SonarWave,
    prevRadius: number,
    stalkerPos: Vector2,
    isCrouching: boolean
  ): boolean {
    const stalkerRadius = isCrouching ? 6 : 8;
    const dx = stalkerPos.x - wave.origin.x;
    const dy = stalkerPos.y - wave.origin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const effectivePrev = prevRadius;
    const effectiveCurr = wave.radius;
    
    return (dist + stalkerRadius) >= effectivePrev && 
           (dist - stalkerRadius) <= effectiveCurr;
  }

  private cleanupOldFeedback(): void {
    const now = performance.now();
    this.feedback = this.feedback.filter(f => now - f.timestamp < 1500);
  }

  getWaves(): SonarWave[] {
    return this.waves.map(w => ({
      ...w,
      reflections: w.reflections.map(r => ({
        ...r,
        points: r.points.map(p => ({ ...p }))
      }))
    }));
  }

  getFeedback(): SonarFeedbackPoint[] {
    return this.feedback.map(f => ({
      ...f,
      position: { ...f.position }
    }));
  }

  clear(): void {
    this.waves = [];
    this.feedback = [];
    this.waveIdCounter = 0;
  }

  getWaveCount(): number {
    return this.waveIdCounter;
  }
}
