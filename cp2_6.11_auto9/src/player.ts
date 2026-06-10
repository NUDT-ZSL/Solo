export interface GridPos {
    row: number;
    col: number;
}

export interface PixelPos {
    x: number;
    y: number;
}

export enum Direction {
    UP = 'UP',
    DOWN = 'DOWN',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT'
}

export interface Particle {
    id: number;
    position: PixelPos;
    velocity: PixelPos;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    active: boolean;
    type: 'projectile' | 'explosion' | 'halo';
    rotation?: number;
    rotationSpeed?: number;
}

export interface CollisionHalo {
    position: PixelPos;
    radius: number;
    maxRadius: number;
    life: number;
    active: boolean;
}

export interface ProjectileState {
    position: PixelPos;
    velocity: PixelPos;
    active: boolean;
    trailPositions: PixelPos[];
}

export interface PlayerState {
    direction: Direction;
    selectedDirection: Direction;
    lives: number;
    projectile: ProjectileState | null;
    isAiming: boolean;
}

const MAX_PARTICLES = 50;
const GRAVITY = 0.15;
const PROJECTILE_SPEED = 8;
const TRAIL_LENGTH = 20;

export class ParticlePool {
    private pool: Particle[];
    private nextId: number;

    constructor() {
        this.pool = [];
        this.nextId = 0;
        this.initPool();
    }

    private initPool(): void {
        for (let i = 0; i < MAX_PARTICLES; i++) {
            this.pool.push({
                id: this.nextId++,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                life: 0,
                maxLife: 1,
                color: '#00FFAA',
                size: 2,
                active: false,
                type: 'explosion'
            });
        }
    }

    acquire(
        position: PixelPos,
        velocity: PixelPos,
        maxLife: number,
        color: string,
        size: number,
        type: 'projectile' | 'explosion' | 'halo',
        rotation?: number,
        rotationSpeed?: number
    ): Particle | null {
        const particle = this.pool.find(p => !p.active);
        if (!particle) {
            return null;
        }
        particle.position = { ...position };
        particle.velocity = { ...velocity };
        particle.life = maxLife;
        particle.maxLife = maxLife;
        particle.color = color;
        particle.size = size;
        particle.active = true;
        particle.type = type;
        particle.rotation = rotation ?? 0;
        particle.rotationSpeed = rotationSpeed ?? 0;
        return particle;
    }

    release(particle: Particle): void {
        particle.active = false;
    }

    getActiveParticles(): Particle[] {
        return this.pool.filter(p => p.active);
    }

    update(deltaTime: number): void {
        for (const particle of this.pool) {
            if (!particle.active) continue;

            if (particle.type === 'explosion' || particle.type === 'projectile') {
                particle.velocity.y += GRAVITY * 0.05;
            }

            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;

            if (particle.rotationSpeed !== undefined) {
                particle.rotation = (particle.rotation ?? 0) + particle.rotationSpeed;
            }

            particle.life -= deltaTime;
            if (particle.life <= 0) {
                this.release(particle);
            }
        }
    }

    clear(): void {
        for (const particle of this.pool) {
            this.release(particle);
        }
    }
}

export class CollisionHaloManager {
    private halos: CollisionHalo[];

    constructor() {
        this.halos = [];
    }

    spawn(position: PixelPos, maxRadius: number = 30): void {
        this.halos.push({
            position: { ...position },
            radius: 5,
            maxRadius,
            life: 300,
            active: true
        });
    }

    update(deltaTime: number): void {
        this.halos = this.halos.filter(halo => {
            halo.radius += (halo.maxRadius - halo.radius) * 0.1;
            halo.life -= deltaTime;
            return halo.life > 0;
        });
    }

    getHalos(): CollisionHalo[] {
        return this.halos;
    }

    clear(): void {
        this.halos = [];
    }
}

export class AudioManager {
    private audioContext: AudioContext | null;

    constructor() {
        this.audioContext = null;
    }

    private ensureContext(): AudioContext {
        if (!this.audioContext) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            this.audioContext = new AudioContextClass();
        }
        return this.audioContext;
    }

    playUnlockSound(): void {
        try {
            const ctx = this.ensureContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.2);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }

    playErrorSound(): void {
        try {
            const ctx = this.ensureContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }
}

export class Player {
    state: PlayerState;
    particlePool: ParticlePool;
    haloManager: CollisionHaloManager;
    audioManager: AudioManager;
    emitterPosition: PixelPos;
    private keyState: Set<string>;
    onProjectileHit?: () => void;
    onProjectileFail?: () => void;
    onDirectionChange?: (direction: Direction) => void;

    constructor(emitterPosition: PixelPos) {
        this.state = {
            direction: Direction.RIGHT,
            selectedDirection: Direction.RIGHT,
            lives: 5,
            projectile: null,
            isAiming: true
        };
        this.particlePool = new ParticlePool();
        this.haloManager = new CollisionHaloManager();
        this.audioManager = new AudioManager();
        this.emitterPosition = { ...emitterPosition };
        this.keyState = new Set();
    }

    handleKeyDown(key: string): void {
        this.keyState.add(key);

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.setDirection(Direction.UP);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.setDirection(Direction.DOWN);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.setDirection(Direction.LEFT);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.setDirection(Direction.RIGHT);
                break;
            case ' ':
                this.fireProjectile();
                break;
        }
    }

    handleKeyUp(key: string): void {
        this.keyState.delete(key);
    }

    setDirection(direction: Direction): void {
        this.state.direction = direction;
        this.state.selectedDirection = direction;
        if (this.onDirectionChange) {
            this.onDirectionChange(direction);
        }
    }

    getDirectionVector(): Direction {
        return this.state.selectedDirection;
    }

    fireProjectile(): void {
        if (this.state.projectile && this.state.projectile.active) {
            return;
        }
        if (this.state.lives <= 0) {
            return;
        }

        const direction = this.state.selectedDirection;
        let vx = 0;
        let vy = 0;

        switch (direction) {
            case Direction.UP:
                vx = 0;
                vy = -PROJECTILE_SPEED;
                break;
            case Direction.DOWN:
                vx = 0;
                vy = PROJECTILE_SPEED;
                break;
            case Direction.LEFT:
                vx = -PROJECTILE_SPEED;
                vy = 0;
                break;
            case Direction.RIGHT:
                vx = PROJECTILE_SPEED;
                vy = 0;
                break;
        }

        this.state.projectile = {
            position: { ...this.emitterPosition },
            velocity: { x: vx, y: vy },
            active: true,
            trailPositions: []
        };
    }

    createExplosion(position: PixelPos): void {
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
            const speed = 2 + Math.random() * 3;
            this.particlePool.acquire(
                position,
                {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                300,
                '#00FFAA',
                2,
                'explosion'
            );
        }
    }

    spawnHalo(position: PixelPos): void {
        this.haloManager.spawn(position, 35);
    }

    bounceProjectile(normalX: number, normalY: number): void {
        if (!this.state.projectile) return;

        const dot = this.state.projectile.velocity.x * normalX + this.state.projectile.velocity.y * normalY;

        this.state.projectile.velocity.x = this.state.projectile.velocity.x - 2 * dot * normalX;
        this.state.projectile.velocity.y = this.state.projectile.velocity.y - 2 * dot * normalY;

        this.spawnHalo({ ...this.state.projectile.position });
    }

    calculateTrajectory(startPos: PixelPos, direction: Direction, steps: number = 60): PixelPos[] {
        const points: PixelPos[] = [];
        let vx = 0;
        let vy = 0;

        switch (direction) {
            case Direction.UP:
                vy = -PROJECTILE_SPEED;
                break;
            case Direction.DOWN:
                vy = PROJECTILE_SPEED;
                break;
            case Direction.LEFT:
                vx = -PROJECTILE_SPEED;
                break;
            case Direction.RIGHT:
                vx = PROJECTILE_SPEED;
                break;
        }

        let pos = { ...startPos };
        let vel = { x: vx, y: vy };

        for (let i = 0; i < steps; i++) {
            points.push({ ...pos });
            vel.y += GRAVITY;
            pos.x += vel.x;
            pos.y += vel.y;
        }

        return points;
    }

    update(deltaTime: number, checkCollision: (pos: PixelPos) => { hit: boolean; normalX?: number; normalY?: number; reachedReceiver?: boolean }): void {
        this.particlePool.update(deltaTime);
        this.haloManager.update(deltaTime);

        if (this.state.projectile && this.state.projectile.active) {
            const proj = this.state.projectile;

            proj.trailPositions.unshift({ ...proj.position });
            if (proj.trailPositions.length > TRAIL_LENGTH) {
                proj.trailPositions.pop();
            }

            proj.velocity.y += GRAVITY;
            proj.position.x += proj.velocity.x;
            proj.position.y += proj.velocity.y;

            const collision = checkCollision(proj.position);

            if (collision.reachedReceiver) {
                proj.active = false;
                this.state.projectile = null;
                this.audioManager.playUnlockSound();
                if (this.onProjectileHit) {
                    this.onProjectileHit();
                }
                return;
            }

            if (collision.hit) {
                if (collision.normalX !== undefined && collision.normalY !== undefined) {
                    this.bounceProjectile(collision.normalX, collision.normalY);
                } else {
                    this.createExplosion(proj.position);
                    proj.active = false;
                    this.state.projectile = null;
                    this.state.lives--;
                    this.audioManager.playErrorSound();
                    if (this.onProjectileFail) {
                        this.onProjectileFail();
                    }
                }
            }
        }
    }

    reset(emitterPosition?: PixelPos): void {
        if (emitterPosition) {
            this.emitterPosition = { ...emitterPosition };
        }
        this.state.projectile = null;
        this.state.isAiming = true;
        this.state.lives = 5;
        this.particlePool.clear();
        this.haloManager.clear();
    }

    resetPosition(emitterPosition?: PixelPos): void {
        if (emitterPosition) {
            this.emitterPosition = { ...emitterPosition };
        }
        this.state.projectile = null;
        this.state.isAiming = true;
        this.particlePool.clear();
        this.haloManager.clear();
    }
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
    const activeParticles = player.particlePool.getActiveParticles();
    for (const particle of activeParticles) {
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);

        if (particle.type === 'halo' || particle.type === 'explosion') {
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 15;
        }

        ctx.fillStyle = particle.color;

        if (particle.rotation !== undefined && particle.type === 'explosion') {
            ctx.save();
            ctx.translate(particle.position.x, particle.position.y);
            ctx.rotate(particle.rotation);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 * i) / 6;
                const px = Math.cos(angle) * particle.size;
                const py = Math.sin(angle) * particle.size;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    const halos = player.haloManager.getHalos();
    for (const halo of halos) {
        const alpha = halo.life / 300;
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = '#00FFAA';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(halo.position.x, halo.position.y, halo.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    if (player.state.projectile && player.state.projectile.active) {
        const proj = player.state.projectile;

        for (let i = 0; i < proj.trailPositions.length; i++) {
            const trail = proj.trailPositions[i];
            const alpha = 1 - i / proj.trailPositions.length;
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = '#00FFAA';
            ctx.shadowColor = '#00FFAA';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, 3 - i * 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = '#00FFAA';
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(proj.position.x, proj.position.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (player.state.isAiming || (!player.state.projectile || !player.state.projectile.active)) {
        const trajectory = player.calculateTrajectory(player.emitterPosition, player.state.selectedDirection);
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(trajectory[0].x, trajectory[0].y);
        for (let i = 1; i < trajectory.length; i++) {
            ctx.lineTo(trajectory[i].x, trajectory[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }

    drawEmitter(ctx, player.emitterPosition, player.state.selectedDirection);
}

function drawEmitter(ctx: CanvasRenderingContext2D, position: PixelPos, direction: Direction): void {
    ctx.save();
    ctx.translate(position.x, position.y);

    const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 30);
    gradient.addColorStop(0, 'rgba(0, 170, 187, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 170, 187, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();

    const time = Date.now() / 1000;
    ctx.strokeStyle = '#00AABB';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00AABB';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 15, time, time + Math.PI * 1.5);
    ctx.stroke();

    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00AABB';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    let arrowX = 0;
    let arrowY = 0;
    const arrowSize = 10;

    switch (direction) {
        case Direction.UP:
            arrowY = -22;
            break;
        case Direction.DOWN:
            arrowY = 22;
            break;
        case Direction.LEFT:
            arrowX = -22;
            break;
        case Direction.RIGHT:
            arrowX = 22;
            break;
    }

    ctx.fillStyle = '#00FFAA';
    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    if (direction === Direction.UP || direction === Direction.DOWN) {
        const sign = direction === Direction.UP ? -1 : 1;
        ctx.moveTo(arrowX, arrowY + sign * arrowSize);
        ctx.lineTo(arrowX - 6, arrowY - sign * 5);
        ctx.lineTo(arrowX + 6, arrowY - sign * 5);
    } else {
        const sign = direction === Direction.LEFT ? -1 : 1;
        ctx.moveTo(arrowX + sign * arrowSize, arrowY);
        ctx.lineTo(arrowX - sign * 5, arrowY - 6);
        ctx.lineTo(arrowX - sign * 5, arrowY + 6);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}
