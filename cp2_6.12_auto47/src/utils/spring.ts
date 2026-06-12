export class SpringValue {
  current: number;
  target: number;
  velocity: number;
  stiffness: number;
  damping: number;

  constructor(initial: number, stiffness = 180, damping = 14) {
    this.current = initial;
    this.target = initial;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  setTarget(target: number) {
    this.target = target;
  }

  update(dt: number): number {
    const clampedDt = Math.min(dt, 0.05);
    const force = (this.target - this.current) * this.stiffness;
    this.velocity += force * clampedDt;
    this.velocity *= Math.exp(-this.damping * clampedDt);
    this.current += this.velocity * clampedDt;
    return this.current;
  }

  isSettled(threshold = 0.005): boolean {
    return (
      Math.abs(this.current - this.target) < threshold &&
      Math.abs(this.velocity) < threshold
    );
  }

  snap(target: number) {
    this.current = target;
    this.target = target;
    this.velocity = 0;
  }
}

export class SpringVector3 {
  x: SpringValue;
  y: SpringValue;
  z: SpringValue;

  constructor(
    x: number,
    y: number,
    z: number,
    stiffness = 180,
    damping = 14
  ) {
    this.x = new SpringValue(x, stiffness, damping);
    this.y = new SpringValue(y, stiffness, damping);
    this.z = new SpringValue(z, stiffness, damping);
  }

  setTarget(x: number, y: number, z: number) {
    this.x.setTarget(x);
    this.y.setTarget(y);
    this.z.setTarget(z);
  }

  update(dt: number): [number, number, number] {
    return [this.x.update(dt), this.y.update(dt), this.z.update(dt)];
  }

  isSettled(): boolean {
    return this.x.isSettled() && this.y.isSettled() && this.z.isSettled();
  }

  snap(x: number, y: number, z: number) {
    this.x.snap(x);
    this.y.snap(y);
    this.z.snap(z);
  }
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
