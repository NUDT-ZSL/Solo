export interface GrassConfig {
  x: number;
  baseY: number;
  height: number;
  windStrength: number;
  windDirection: number;
}

interface Joint {
  x: number;
  y: number;
  angle: number;
}

export class Grass {
  private x: number;
  private baseY: number;
  private height: number;
  private segments: number = 3;
  private segmentLength: number;
  private joints: Joint[] = [];
  private baseAngle: number = -Math.PI / 2;
  private currentAngle: number = -Math.PI / 2;
  private targetAngle: number = -Math.PI / 2;
  private windStrength: number;
  private windDirection: number;
  private phaseOffset: number;
  private time: number = 0;

  private isFallen: boolean = false;
  private fallStartTime: number = 0;
  private fallDuration: number = 500;
  private recoverDuration: number = 2000;
  private wobbleDuration: number = 300;
  private fallDirection: number = 1;

  constructor(config: GrassConfig) {
    this.x = config.x;
    this.baseY = config.baseY;
    this.height = config.height;
    this.windStrength = config.windStrength;
    this.windDirection = config.windDirection;
    this.segmentLength = this.height / this.segments;
    this.phaseOffset = Math.random() * Math.PI * 2;
    this.initJoints();
  }

  private initJoints(): void {
    this.joints = [];
    let currentX = this.x;
    let currentY = this.baseY;
    let angle = this.baseAngle;

    for (let i = 0; i <= this.segments; i++) {
      this.joints.push({ x: currentX, y: currentY, angle });
      if (i < this.segments) {
        angle = this.baseAngle;
        currentX += Math.cos(angle) * this.segmentLength;
        currentY += Math.sin(angle) * this.segmentLength;
      }
    }
  }

  public setWind(strength: number, direction: number): void {
    this.windStrength = strength;
    this.windDirection = direction;
  }

  public getX(): number {
    return this.x;
  }

  public getBaseY(): number {
    return this.baseY;
  }

  public getHeight(): number {
    return this.height;
  }

  public checkCollision(mouseX: number, mouseY: number, moveDirection: number): boolean {
    if (this.isFallen) return false;

    const topJoint = this.joints[this.joints.length - 1];
    const midJoint = this.joints[1];

    const distToTop = Math.sqrt(
      Math.pow(mouseX - topJoint.x, 2) + Math.pow(mouseY - topJoint.y, 2)
    );
    const distToMid = Math.sqrt(
      Math.pow(mouseX - midJoint.x, 2) + Math.pow(mouseY - midJoint.y, 2)
    );

    if (distToTop < 20 || distToMid < 15) {
      this.triggerFall(moveDirection);
      return true;
    }
    return false;
  }

  // 线段碰撞检测：检测鼠标拖拽路径是否经过草叶
  // 通过采样线段上的多个点进行碰撞检测，避免快速移动时漏检
  public checkSegmentCollision(
    x1: number, y1: number,
    x2: number, y2: number,
    moveDirection: number
  ): boolean {
    if (this.isFallen) return false;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      return this.checkCollision(x2, y2, moveDirection);
    }

    // 每5像素采样一个检测点，确保连续路径覆盖
    const step = 5;
    const steps = Math.max(1, Math.ceil(dist / step));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;

      if (this.checkCollision(px, py, moveDirection)) {
        return true;
      }
    }

    return false;
  }

  public triggerFall(direction: number): void {
    if (this.isFallen) return;
    this.isFallen = true;
    this.fallStartTime = performance.now();
    this.fallDirection = direction >= 0 ? 1 : -1;
  }

  public update(deltaTime: number, currentTime: number): void {
    this.time += deltaTime * 0.001;

    if (this.isFallen) {
      this.updateFallAnimation(currentTime);
    } else {
      this.updateWindAngle();
    }

    this.updateJointPositions();
  }

  private updateFallAnimation(currentTime: number): void {
    const elapsed = currentTime - this.fallStartTime;
    const fallAngle = (15 * Math.PI) / 180;

    if (elapsed < this.fallDuration) {
      const t = elapsed / this.fallDuration;
      const easeT = t * t;
      this.currentAngle = this.baseAngle + this.fallDirection * (Math.PI / 2 - fallAngle) * easeT;
    } else if (elapsed < this.fallDuration + this.recoverDuration) {
      const t = (elapsed - this.fallDuration) / this.recoverDuration;
      const easeT = 1 - Math.pow(1 - t, 3);
      const baseRecoverAngle = this.baseAngle + this.fallDirection * (Math.PI / 2 - fallAngle) * (1 - easeT);

      if (t < this.wobbleDuration / this.recoverDuration) {
        const wobbleT = t * (this.recoverDuration / this.wobbleDuration);
        const wobbleAmount = Math.sin(wobbleT * Math.PI * 3) * 0.1 * (1 - wobbleT);
        this.currentAngle = baseRecoverAngle + wobbleAmount;
      } else {
        this.currentAngle = baseRecoverAngle;
      }
    } else {
      this.isFallen = false;
      this.currentAngle = this.baseAngle;
    }
  }

  private updateWindAngle(): void {
    const windEffect = this.windStrength * 0.15 * this.windDirection;
    const swayAmount = Math.sin(this.time * 2 + this.phaseOffset) * 0.1 * (1 + this.windStrength * 0.3);
    this.targetAngle = this.baseAngle + windEffect + swayAmount;
    this.currentAngle += (this.targetAngle - this.currentAngle) * 0.1;
  }

  private updateJointPositions(): void {
    this.joints[0].x = this.x;
    this.joints[0].y = this.baseY;
    this.joints[0].angle = this.currentAngle;

    for (let i = 1; i <= this.segments; i++) {
      const angleMultiplier = 1 + (i - 1) * 0.3;
      const jointAngle = this.baseAngle + (this.currentAngle - this.baseAngle) * angleMultiplier;

      this.joints[i].angle = jointAngle;
      this.joints[i].x = this.joints[i - 1].x + Math.cos(jointAngle) * this.segmentLength;
      this.joints[i].y = this.joints[i - 1].y + Math.sin(jointAngle) * this.segmentLength;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const gradient = ctx.createLinearGradient(
      this.joints[0].x, this.joints[0].y,
      this.joints[this.segments].x, this.joints[this.segments].y
    );
    gradient.addColorStop(0, '#228B22');
    gradient.addColorStop(0.5, '#32CD32');
    gradient.addColorStop(1, '#90EE90');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.joints[0].x, this.joints[0].y);

    for (let i = 1; i <= this.segments; i++) {
      ctx.lineTo(this.joints[i].x, this.joints[i].y);
    }

    ctx.stroke();

    ctx.fillStyle = '#90EE90';
    ctx.beginPath();
    ctx.arc(
      this.joints[this.segments].x,
      this.joints[this.segments].y,
      4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }
}
