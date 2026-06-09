import * as THREE from 'three';

const CRYSTAL_COLORS: readonly number[] = [0x4A90D9, 0x6A5ACD, 0x20B2AA] as const;

const COLOR_THEMES: readonly string[] = ['Nebula', 'Aurora', 'Frost'] as const;

type FadeState = 'fadingIn' | 'fadingOut' | 'visible' | 'hidden';

export interface CrystalStats {
    total: number;
    averageHeight: number;
    colorTheme: string;
}

export class Crystal {
    public readonly group: THREE.Group;
    public readonly mesh: THREE.Mesh;
    public readonly topMesh: THREE.Mesh;
    public readonly material: THREE.MeshPhysicalMaterial;
    public readonly topMaterial: THREE.MeshPhysicalMaterial;
    public readonly haloLight: THREE.PointLight;
    public readonly height: number;
    public readonly radius: number;

    private baseRotationSpeed: number;
    private rotationSpeedMultiplier: number;
    private rotationSpeedBoostTime: number;
    private baseColor: THREE.Color;
    private targetColor: THREE.Color;
    private currentColor: THREE.Color;
    private colorBlend: number;
    private haloPulsePhase: number;
    private baseHaloIntensity: number;
    private haloBoostTime: number;
    private fadeState: FadeState;
    private fadeOpacity: number;
    private readonly fadeDuration: number;
    private readonly baseMaterialOpacity: number;

    constructor(position: THREE.Vector3) {
        this.group = new THREE.Group();
        this.group.position.copy(position);

        this.height = 1 + Math.random() * 4;
        this.radius = 0.2 + Math.random() * 0.2;

        const geometry = new THREE.CylinderGeometry(
            this.radius,
            this.radius * 1.1,
            this.height,
            6,
            1,
            false
        );

        const topGeometry = new THREE.CircleGeometry(this.radius, 6);
        topGeometry.rotateX(-Math.PI / 2);

        const baseColorHex = CRYSTAL_COLORS[Math.floor(Math.random() * CRYSTAL_COLORS.length)];

        this.baseColor = new THREE.Color(baseColorHex);
        this.targetColor = this.baseColor.clone();
        this.currentColor = this.baseColor.clone();
        this.colorBlend = 0;

        this.baseMaterialOpacity = 0.6 + Math.random() * 0.2;

        this.material = new THREE.MeshPhysicalMaterial({
            color: this.currentColor,
            transparent: true,
            opacity: this.baseMaterialOpacity,
            roughness: 0.2,
            metalness: 0.1,
            transmission: 0.4,
            thickness: 0.5,
            side: THREE.DoubleSide,
        });

        this.topMaterial = new THREE.MeshPhysicalMaterial({
            color: this.currentColor,
            transparent: true,
            opacity: 0.8,
            emissive: 0xffffff,
            emissiveIntensity: 0.5,
            side: THREE.DoubleSide,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.y = this.height / 2;
        this.group.add(this.mesh);

        this.topMesh = new THREE.Mesh(topGeometry, this.topMaterial);
        this.topMesh.position.y = this.height;
        this.topMesh.name = 'crystalTop';
        this.group.add(this.topMesh);

        this.baseHaloIntensity = 0.3;
        this.haloBoostTime = 0;
        this.haloPulsePhase = Math.random() * Math.PI * 2;

        this.haloLight = new THREE.PointLight(0xffffff, this.baseHaloIntensity, 3, 2);
        this.haloLight.position.y = this.height + 0.1;
        this.group.add(this.haloLight);

        this.baseRotationSpeed = 0.005;
        this.rotationSpeedMultiplier = 1;
        this.rotationSpeedBoostTime = 0;

        this.fadeState = 'visible';
        this.fadeOpacity = 1;
        this.fadeDuration = 0.5;
    }

    public setTargetColor(color: THREE.Color): void {
        this.targetColor = color.clone();
        this.colorBlend = 0;
    }

    public randomizeTargetColor(): void {
        const colorHex = CRYSTAL_COLORS[Math.floor(Math.random() * CRYSTAL_COLORS.length)];
        this.setTargetColor(new THREE.Color(colorHex));
    }

    public boostRotation(duration: number = 2, multiplier: number = 5): void {
        this.rotationSpeedBoostTime = duration;
        this.rotationSpeedMultiplier = multiplier;
    }

    public boostHalo(duration: number = 1.5, intensityMultiplier: number = 2.5): void {
        this.haloBoostTime = duration;
        this.baseHaloIntensity = 0.3 * intensityMultiplier;
    }

    public fadeIn(): void {
        if (this.fadeState === 'fadingIn') return;
        if (this.fadeState === 'visible') return;
        this.fadeState = 'fadingIn';
    }

    public resetToHidden(): void {
        this.fadeOpacity = 0;
        this.material.opacity = 0;
        this.topMaterial.opacity = 0;
        this.haloLight.intensity = 0;
        this.fadeState = 'hidden';
    }

    public fadeOut(): void {
        if (this.fadeState === 'hidden' || this.fadeState === 'fadingOut') return;
        this.fadeState = 'fadingOut';
    }

    public isFullyHidden(): boolean {
        return this.fadeState === 'hidden';
    }

    public isFullyVisible(): boolean {
        return this.fadeState === 'visible';
    }

    public isFadingIn(): boolean {
        return this.fadeState === 'fadingIn';
    }

    public update(deltaTime: number, colorTransitionSpeed: number): void {
        this.group.rotation.y += this.baseRotationSpeed * this.rotationSpeedMultiplier;

        if (this.rotationSpeedBoostTime > 0) {
            this.rotationSpeedBoostTime -= deltaTime;
            if (this.rotationSpeedBoostTime <= 0) {
                this.rotationSpeedMultiplier = 1;
                this.rotationSpeedBoostTime = 0;
            }
        }

        if (this.colorBlend < 1) {
            this.colorBlend = Math.min(1, this.colorBlend + deltaTime * colorTransitionSpeed);
            this.currentColor.lerpColors(this.baseColor, this.targetColor, this.colorBlend);
            this.material.color.copy(this.currentColor);
            this.topMaterial.color.copy(this.currentColor);
            if (this.colorBlend >= 1) {
                this.baseColor.copy(this.targetColor);
            }
        }

        this.haloPulsePhase += deltaTime * 2;
        let haloIntensity = this.baseHaloIntensity * (0.8 + 0.4 * Math.sin(this.haloPulsePhase));
        haloIntensity *= this.fadeOpacity;
        this.haloLight.intensity = haloIntensity;
        this.topMaterial.emissiveIntensity = haloIntensity * 1.5;

        if (this.haloBoostTime > 0) {
            this.haloBoostTime -= deltaTime;
            if (this.haloBoostTime <= 0) {
                this.baseHaloIntensity = 0.3;
                this.haloBoostTime = 0;
            }
        }

        this.updateFade(deltaTime);
    }

    private updateFade(deltaTime: number): void {
        if (this.fadeState === 'fadingIn') {
            this.fadeOpacity = Math.min(1, this.fadeOpacity + deltaTime / this.fadeDuration);
            this.material.opacity = this.baseMaterialOpacity * this.fadeOpacity;
            this.topMaterial.opacity = 0.8 * this.fadeOpacity;
            if (this.fadeOpacity >= 1) {
                this.fadeState = 'visible';
            }
        } else if (this.fadeState === 'fadingOut') {
            this.fadeOpacity = Math.max(0, this.fadeOpacity - deltaTime / this.fadeDuration);
            this.material.opacity = this.baseMaterialOpacity * this.fadeOpacity;
            this.topMaterial.opacity = 0.8 * this.fadeOpacity;
            if (this.fadeOpacity <= 0) {
                this.fadeState = 'hidden';
            }
        }
    }

    public dispose(): void {
        this.mesh.geometry.dispose();
        this.topMesh.geometry.dispose();
        this.material.dispose();
        this.topMaterial.dispose();
        this.haloLight.dispose();
    }
}

export class CrystalForest {
    public readonly group: THREE.Group;
    private crystals: Crystal[];
    private readonly radius: number;
    private colorTransitionSpeed: number;
    private colorChangeTimer: number;
    private colorChangeInterval: number;
    private currentThemeIndex: number;

    constructor() {
        this.group = new THREE.Group();
        this.crystals = [];
        this.radius = 10;
        this.colorTransitionSpeed = 1.5;
        this.colorChangeTimer = 0;
        this.colorChangeInterval = 5;
        this.currentThemeIndex = 0;

        this.initializeCrystals(150);
    }

    private initializeCrystals(count: number): void {
        for (let i = 0; i < count; i++) {
            this.addCrystal(false);
        }
    }

    private getRandomPosition(): THREE.Vector3 {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * this.radius;
        return new THREE.Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
    }

    public addCrystal(animate: boolean = true): Crystal {
        const position = this.getRandomPosition();
        const crystal = new Crystal(position);
        if (animate) {
            crystal.resetToHidden();
            crystal.fadeIn();
        }
        this.crystals.push(crystal);
        this.group.add(crystal.group);
        return crystal;
    }

    public removeCrystal(crystal: Crystal): void {
        const index = this.crystals.indexOf(crystal);
        if (index === -1) return;
        crystal.fadeOut();
        setTimeout(() => {
            const currentIndex = this.crystals.indexOf(crystal);
            if (currentIndex !== -1) {
                this.group.remove(crystal.group);
                crystal.dispose();
                this.crystals.splice(currentIndex, 1);
            }
        }, 500);
    }

    public removeRandomCrystal(): void {
        if (this.crystals.length === 0) return;
        const visibleCrystals = this.crystals.filter(c => c.isFullyVisible() || c.isFadingIn());
        if (visibleCrystals.length === 0) return;
        const crystal = visibleCrystals[Math.floor(Math.random() * visibleCrystals.length)];
        this.removeCrystal(crystal);
    }

    public setDensity(targetCount: number): void {
        const clampedTarget = Math.max(150, Math.min(300, targetCount));
        const diff = clampedTarget - this.crystals.length;

        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                setTimeout(() => this.addCrystal(true), i * 20);
            }
        } else if (diff < 0) {
            for (let i = 0; i < -diff; i++) {
                setTimeout(() => this.removeRandomCrystal(), i * 20);
            }
        }
    }

    public setColorTransitionSpeed(speed: number): void {
        this.colorTransitionSpeed = Math.max(0.5, Math.min(3, speed));
    }

    public triggerShockwave(
        position: THREE.Vector3,
        radius: number,
        intensity: number
    ): void {
        for (const crystal of this.crystals) {
            const distance = crystal.group.position.distanceTo(position);
            if (distance <= radius) {
                const falloff = 1 - distance / radius;
                const effectIntensity = falloff * intensity;
                crystal.boostRotation(1 + effectIntensity, 2 + effectIntensity * 4);
                crystal.boostHalo(0.8 + effectIntensity, 1.5 + effectIntensity * 2);
                crystal.randomizeTargetColor();
            }
        }
    }

    public getInteractables(): THREE.Object3D[] {
        return this.crystals.map(c => c.topMesh);
    }

    public getStats(): CrystalStats {
        if (this.crystals.length === 0) {
            return {
                total: 0,
                averageHeight: 0,
                colorTheme: COLOR_THEMES[0],
            };
        }

        const totalHeight = this.crystals.reduce((sum, c) => sum + c.height, 0);

        return {
            total: this.crystals.length,
            averageHeight: totalHeight / this.crystals.length,
            colorTheme: COLOR_THEMES[this.currentThemeIndex],
        };
    }

    public update(deltaTime: number): void {
        for (const crystal of this.crystals) {
            crystal.update(deltaTime, this.colorTransitionSpeed);
        }

        this.crystals = this.crystals.filter(c => !c.isFullyHidden());

        this.colorChangeTimer += deltaTime;
        if (this.colorChangeTimer >= this.colorChangeInterval) {
            this.colorChangeTimer = 0;
            this.currentThemeIndex = (this.currentThemeIndex + 1) % COLOR_THEMES.length;
            this.randomizeColors();
        }
    }

    private randomizeColors(): void {
        for (const crystal of this.crystals) {
            if (Math.random() < 0.3) {
                crystal.randomizeTargetColor();
            }
        }
    }

    public dispose(): void {
        for (const crystal of this.crystals) {
            crystal.dispose();
            this.group.remove(crystal.group);
        }
        this.crystals = [];
    }
}
