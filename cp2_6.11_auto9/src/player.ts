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
    type: 'projectile' | 'explosion' | 'halo' | 'lockUnlock';
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
    basePosition: PixelPos;
    velocity: PixelPos;
    initialVelocity: PixelPos;
    gravity: number;
    launchAngle: number;
    active: boolean;
    trailPositions: PixelPos[];
    elapsedFrames: number;
    direction: Direction;
}

export interface PlayerState {
    direction: Direction;
    selectedDirection: Direction;
    lives: number;
    projectile: ProjectileState | null;
    isAiming: boolean;
}

const MAX_PARTICLES = 50;
const PROJECTILE_BASE_SPEED = 6;
const TRAIL_LENGTH = 25;
const GRAVITY = 0.18;
const LAUNCH_ANGLE = Math.PI / 7;
const EXPLOSION_PARTICLE_COUNT = 10;
const EXPLOSION_LIFETIME = 300;
const EXPLOSION_BASE_SPEED = 2.5;
const EXPLOSION_SPEED_VARIANCE = 2;

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
        type: 'projectile' | 'explosion' | 'halo' | 'lockUnlock',
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

            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;

            if (particle.type === 'explosion') {
                particle.velocity.x *= 0.98;
                particle.velocity.y *= 0.98;
            }

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
            halo.radius += (halo.maxRadius - halo.radius) * 0.12;
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
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
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
            oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

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

    playBounceSound(): void {
        try {
            const ctx = this.ensureContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(660, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.08);

            gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.08);
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
    private dpr: number;
    onProjectileHit?: (receiverId: string) => void;
    onProjectileFail?: () => void;
    onDirectionChange?: (direction: Direction) => void;

    constructor(emitterPosition: PixelPos, dpr?: number) {
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
        this.dpr = dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    }

    setDpr(dpr: number): void {
        this.dpr = dpr;
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

    private getInitialVelocityForDirection(direction: Direction): PixelPos {
        const angle = LAUNCH_ANGLE;
        const speed = PROJECTILE_BASE_SPEED;

        switch (direction) {
            case Direction.UP:
                return {
                    x: 0,
                    y: -speed * Math.cos(angle)
                };
            case Direction.DOWN:
                return {
                    x: 0,
                    y: speed * Math.cos(angle)
                };
            case Direction.LEFT:
                return {
                    x: -speed * Math.cos(angle),
                    y: -speed * Math.sin(angle)
                };
            case Direction.RIGHT:
                return {
                    x: speed * Math.cos(angle),
                    y: -speed * Math.sin(angle)
                };
        }
    }

    fireProjectile(): void {
        if (this.state.projectile && this.state.projectile.active) {
            return;
        }
        if (this.state.lives <= 0) {
            return;
        }

        const direction = this.state.selectedDirection;
        const initialVelocity = this.getInitialVelocityForDirection(direction);

        this.state.projectile = {
            position: { ...this.emitterPosition },
            basePosition: { ...this.emitterPosition },
            velocity: { ...initialVelocity },
            initialVelocity: { ...initialVelocity },
            gravity: GRAVITY,
            launchAngle: LAUNCH_ANGLE,
            active: true,
            trailPositions: [],
            elapsedFrames: 0,
            direction: direction
        };
    }

    createExplosion(position: PixelPos): void {
        const particleSize = 2 * this.dpr;

        for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
            const baseAngle = (Math.PI * 2 * i) / EXPLOSION_PARTICLE_COUNT;
            const randomOffset = (Math.random() - 0.5) * 0.35;
            const angle = baseAngle + randomOffset;
            const speed = EXPLOSION_BASE_SPEED + Math.random() * EXPLOSION_SPEED_VARIANCE;

            this.particlePool.acquire(
                { ...position },
                {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                EXPLOSION_LIFETIME,
                '#00FFAA',
                particleSize,
                'explosion',
                Math.random() * Math.PI * 2,
                0
            );
        }
    }

    createLockUnlockParticles(position: PixelPos): void {
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            const speed = 2.5 + Math.random() * 1.5;
            this.particlePool.acquire(
                { ...position },
                {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                800,
                '#FFD700',
                6 * this.dpr,
                'lockUnlock',
                Math.random() * Math.PI * 2,
                0.08 + Math.random() * 0.06
            );
        }
    }

    spawnHalo(position: PixelPos): void {
        this.haloManager.spawn(position, 40);
    }

    bounceProjectile(normalX: number, normalY: number): void {
        if (!this.state.projectile) return;

        const v = this.state.projectile.velocity;
        const dot = v.x * normalX + v.y * normalY;

        const reflectedX = v.x - 2 * dot * normalX;
        const reflectedY = v.y - 2 * dot * normalY;

        this.state.projectile.velocity.x = reflectedX;
        this.state.projectile.velocity.y = reflectedY;

        this.state.projectile.initialVelocity.x = reflectedX;
        this.state.projectile.initialVelocity.y = reflectedY;
        this.state.projectile.basePosition = { ...this.state.projectile.position };
        this.state.projectile.elapsedFrames = 0;

        const speed = Math.sqrt(reflectedX ** 2 + reflectedY ** 2);
        const targetSpeed = PROJECTILE_BASE_SPEED;
        if (speed > 0) {
            this.state.projectile.velocity.x = (reflectedX / speed) * targetSpeed;
            this.state.projectile.velocity.y = (reflectedY / speed) * targetSpeed;
            this.state.projectile.initialVelocity.x = this.state.projectile.velocity.x;
            this.state.projectile.initialVelocity.y = this.state.projectile.velocity.y;
        }

        this.spawnHalo({ ...this.state.projectile.position });
        this.audioManager.playBounceSound();
    }

    calculateProjectilePosition(proj: ProjectileState, frames: number): PixelPos {
        const t = frames;
        const baseX = proj.basePosition.x + proj.initialVelocity.x * t;
        const baseY = proj.basePosition.y + proj.initialVelocity.y * t;
        const gravityY = 0.5 * proj.gravity * t * t;

        return {
            x: baseX,
            y: baseY + gravityY
        };
    }

    calculateTrajectory(startPos: PixelPos, direction: Direction, steps: number = 80): PixelPos[] {
        const points: PixelPos[] = [];
        const initialVelocity = this.getInitialVelocityForDirection(direction);

        const simProj: ProjectileState = {
            position: { ...startPos },
            basePosition: { ...startPos },
            velocity: { ...initialVelocity },
            initialVelocity: { ...initialVelocity },
            gravity: GRAVITY,
            launchAngle: LAUNCH_ANGLE,
            active: false,
            trailPositions: [],
            elapsedFrames: 0,
            direction: direction
        };

        for (let i = 0; i < steps; i++) {
            const pos = this.calculateProjectilePosition(simProj, i);
            points.push(pos);
        }

        return points;
    }

    update(
        deltaTime: number,
        checkCollision: (pos: PixelPos) => {
            hit: boolean;
            absorbed?: boolean;
            normalX?: number;
            normalY?: number;
            reachedReceiver?: boolean;
            receiverId?: string;
            outOfBounds?: boolean;
        }
    ): void {
        this.particlePool.update(deltaTime);
        this.haloManager.update(deltaTime);

        if (this.state.projectile && this.state.projectile.active) {
            const proj = this.state.projectile;
            proj.elapsedFrames++;

            const renderPos = this.calculateProjectilePosition(proj, proj.elapsedFrames);
            proj.position = { ...renderPos };

            proj.trailPositions.unshift({ ...renderPos });
            if (proj.trailPositions.length > TRAIL_LENGTH) {
                proj.trailPositions.pop();
            }

            const collision = checkCollision(renderPos);

            if (collision.reachedReceiver && collision.receiverId) {
                proj.active = false;
                this.state.projectile = null;
                this.audioManager.playUnlockSound();
                if (this.onProjectileHit) {
                    this.onProjectileHit(collision.receiverId);
                }
                return;
            }

            if (collision.outOfBounds || collision.absorbed) {
                this.createExplosion(renderPos);
                proj.active = false;
                this.state.projectile = null;
                this.state.lives--;
                this.audioManager.playErrorSound();
                if (this.onProjectileFail) {
                    this.onProjectileFail();
                }
                return;
            }

            if (collision.hit && collision.normalX !== undefined && collision.normalY !== undefined) {
                this.bounceProjectile(collision.normalX, collision.normalY);
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

        if (particle.type === 'explosion' || particle.type === 'lockUnlock') {
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 15;
        }

        ctx.fillStyle = particle.color;

        if (particle.type === 'lockUnlock') {
            ctx.save();
            ctx.translate(particle.position.x, particle.position.y);
            ctx.rotate(particle.rotation ?? 0);
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
        } else if (particle.rotation !== undefined && particle.type === 'explosion') {
            ctx.save();
            ctx.translate(particle.position.x, particle.position.y);
            ctx.rotate(particle.rotation);
            ctx.beginPath();
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
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
        const renderPos = { ...proj.position };

        for (let i = 0; i < proj.trailPositions.length; i++) {
            const trail = proj.trailPositions[i];
            const alpha = 1 - i / proj.trailPositions.length;
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#00FFAA';
            ctx.shadowColor = '#00FFAA';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, Math.max(1, 4 - i * 0.12), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = '#00FFAA';
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(renderPos.x, renderPos.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 15;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(renderPos.x, renderPos.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (player.state.isAiming || (!player.state.projectile || !player.state.projectile.active)) {
        const trajectory = player.calculateTrajectory(player.emitterPosition, player.state.selectedDirection);
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
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

    const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 35);
    gradient.addColorStop(0, 'rgba(0, 170, 187, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 170, 187, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();

    const time = Date.now() / 1000;
    ctx.strokeStyle = '#00AABB';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00AABB';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, 16, time * 1.5, time * 1.5 + Math.PI * 1.5);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 20, -time * 0.8, -time * 0.8 + Math.PI);
    ctx.stroke();

    ctx.shadowBlur = 20;
    const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
    coreGradient.addColorStop(0, '#FFFFFF');
    coreGradient.addColorStop(0.5, '#00FFAA');
    coreGradient.addColorStop(1, '#00AABB');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    let arrowX = 0;
    let arrowY = 0;
    const arrowSize = 10;

    switch (direction) {
        case Direction.UP:
            arrowY = -24;
            break;
        case Direction.DOWN:
            arrowY = 24;
            break;
        case Direction.LEFT:
            arrowX = -24;
            break;
        case Direction.RIGHT:
            arrowX = 24;
            break;
    }

    ctx.fillStyle = '#00FFAA';
    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    if (direction === Direction.UP || direction === Direction.DOWN) {
        const sign = direction === Direction.UP ? -1 : 1;
        ctx.moveTo(arrowX, arrowY + sign * arrowSize);
        ctx.lineTo(arrowX - 7, arrowY - sign * 5);
        ctx.lineTo(arrowX + 7, arrowY - sign * 5);
    } else {
        const sign = direction === Direction.LEFT ? -1 : 1;
        ctx.moveTo(arrowX + sign * arrowSize, arrowY);
        ctx.lineTo(arrowX - sign * 5, arrowY - 7);
        ctx.lineTo(arrowX - sign * 5, arrowY + 7);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}
