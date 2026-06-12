import { Car, InputState, Track, Point, distanceToSegment } from './engine';

export class AIController {
  private track: Track;
  private targetIndex: number;
  private lookAhead: number;
  
  constructor(track: Track) {
    this.track = track;
    this.targetIndex = 0;
    this.lookAhead = 8;
  }
  
  setTrack(track: Track) {
    this.track = track;
    this.targetIndex = 0;
  }
  
  getInput(car: Car): InputState {
    const input: InputState = {
      accelerate: false,
      brake: false,
      left: false,
      right: false
    };
    
    if (car.finished) return input;
    
    this.findNearestSegment(car);
    
    const targetPoint = this.getTargetPoint(car);
    
    const dx = targetPoint.x - car.x;
    const dy = targetPoint.y - car.y;
    const targetAngle = Math.atan2(dy, dx);
    
    let angleDiff = targetAngle - car.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    const turnThreshold = 0.08;
    if (angleDiff < -turnThreshold) {
      input.left = true;
    } else if (angleDiff > turnThreshold) {
      input.right = true;
    }
    
    const absAngleDiff = Math.abs(angleDiff);
    const speedFactor = 1 - absAngleDiff / Math.PI * 0.6;
    
    if (car.speed < car.maxSpeed * speedFactor) {
      input.accelerate = true;
    }
    
    if (absAngleDiff > 0.8 && car.speed > 4) {
      input.brake = true;
    }
    
    return input;
  }
  
  private findNearestSegment(car: Car) {
    let minDist = Infinity;
    let nearestIndex = 0;
    
    for (let i = 0; i < this.track.centerline.length; i++) {
      const a = this.track.centerline[i];
      const b = this.track.centerline[(i + 1) % this.track.centerline.length];
      const { distance, t } = distanceToSegment({ x: car.x, y: car.y }, a, b);
      
      if (distance < minDist) {
        minDist = distance;
        nearestIndex = i + (t > 0.5 ? 1 : 0);
      }
    }
    
    this.targetIndex = nearestIndex % this.track.centerline.length;
  }
  
  private getTargetPoint(car: Car): Point {
    const speedFactor = Math.min(1, Math.abs(car.speed) / car.maxSpeed);
    const lookDist = Math.floor(this.lookAhead * (0.5 + speedFactor * 0.5));
    
    const targetIdx = (this.targetIndex + lookDist) % this.track.centerline.length;
    return this.track.centerline[targetIdx];
  }
  
  reset() {
    this.targetIndex = 0;
  }
}
