import * as THREE from 'three';

export interface ShockWaveOptions {
    position: THREE.Vector3;
    maxRadius?: number;
    expansionSpeed?: number;
    ringWidth?: number;
    startOpacity?: number;
    color?: number;
}

export class ShockWave {
    public mesh: THREE.Mesh;
    public readonly maxRadius: number;
    public readonly expansionSpeed: number;
    public readonly startOpacity: number;
    public readonly ringWidth: number;

    public currentRadius: number;
    public currentOpacity: number;
    public isDead: boolean;

    private readonly material: THREE.MeshBasicMaterial;
    private readonly thetaSegments: number = 64;

    constructor(options: ShockWaveOptions) {
        const {
            position,
            maxRadius = 2,
            expansionSpeed = 0.5,
            ringWidth = 0.1,
            startOpacity = 0.8,
            color = 0x0066ff,
        } = options;

        this.maxRadius = maxRadius;
        this.expansionSpeed = expansionSpeed;
        this.startOpacity = startOpacity;
        this.ringWidth = ringWidth;
        this.currentRadius = 0;
        this.currentOpacity = startOpacity;
        this.isDead = false;

        const geometry = new THREE.RingGeometry(0, ringWidth, this.thetaSegments);

        this.material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: startOpacity,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.copy(position);
    }

    public update(deltaTime: number): void {
        if (this.isDead) {
            return;
        }

        this.currentRadius += this.expansionSpeed * deltaTime;
        const progress = this.currentRadius / this.maxRadius;

        if (progress >= 1) {
            this.isDead = true;
            return;
        }

        this.currentOpacity = this.startOpacity * (1 - progress);
        this.material.opacity = this.currentOpacity;

        const newInnerRadius = this.currentRadius;
        const newOuterRadius = this.currentRadius + this.ringWidth;

        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.RingGeometry(newInnerRadius, newOuterRadius, this.thetaSegments);
    }

    public dispose(): void {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}

export class WaveManager {
    private readonly scene: THREE.Scene;
    private readonly waves: ShockWave[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public createWave(options: ShockWaveOptions): ShockWave {
        const wave = new ShockWave(options);
        this.scene.add(wave.mesh);
        this.waves.push(wave);
        return wave;
    }

    public update(deltaTime: number): void {
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const wave = this.waves[i];
            wave.update(deltaTime);

            if (wave.isDead) {
                this.scene.remove(wave.mesh);
                wave.dispose();
                this.waves.splice(i, 1);
            }
        }
    }

    public disposeAll(): void {
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const wave = this.waves[i];
            this.scene.remove(wave.mesh);
            wave.dispose();
        }
        this.waves.length = 0;
    }

    public getWaveCount(): number {
        return this.waves.length;
    }
}
