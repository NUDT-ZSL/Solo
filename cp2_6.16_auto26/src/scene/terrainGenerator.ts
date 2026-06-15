import * as THREE from 'three';

class ImprovedPerlinNoise {
    private permutation: number[];
    private gradP: { x: number; y: number }[];

    private static grad3: { x: number; y: number }[] = [
        { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    constructor(seed: number = Math.random() * 65536) {
        this.permutation = new Array(512);
        this.gradP = new Array(512);
        this.seed(seed);
    }

    private seed(seed: number): void {
        const p: number[] = [
            151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
            140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
            247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
            57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
            74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
            60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
            65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
            200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
            52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
            207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
            119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
            129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
            218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
            81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
            184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
            222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
        ];

        for (let i: number = 0; i < 256; i++) {
            const v: number = i > 0 ? p[i] : Math.floor(seed * 256) % 256;
            this.permutation[i] = this.permutation[i + 256] = v;
            this.gradP[i] = this.gradP[i + 256] = ImprovedPerlinNoise.grad3[v % 8];
        }
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(a: number, b: number, t: number): number {
        return (1 - t) * a + t * b;
    }

    private dot(g: { x: number; y: number }, x: number, y: number): number {
        return g.x * x + g.y * y;
    }

    noise2D(x: number, y: number): number {
        let X: number = Math.floor(x);
        let Y: number = Math.floor(y);

        x = x - X;
        y = y - Y;

        X = X & 255;
        Y = Y & 255;

        const n00: number = this.dot(this.gradP[X + this.permutation[Y]], x, y);
        const n01: number = this.dot(this.gradP[X + this.permutation[Y + 1]], x, y - 1);
        const n10: number = this.dot(this.gradP[X + 1 + this.permutation[Y]], x - 1, y);
        const n11: number = this.dot(this.gradP[X + 1 + this.permutation[Y + 1]], x - 1, y - 1);

        const u: number = this.fade(x);
        const v: number = this.fade(y);

        return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), v);
    }
}

interface TerrainConfig {
    size: number;
    resolution: number;
    noiseFrequency: number;
    noiseAmplitude: number;
    smoothness: number;
}

class TerrainGenerator {
    private scene: THREE.Scene;
    private config: TerrainConfig;
    private heightData: Float32Array;
    private mesh: THREE.Mesh;
    private gridLines: THREE.LineSegments;
    private noise: ImprovedPerlinNoise;

    constructor(scene: THREE.Scene, config: Partial<TerrainConfig> = {}) {
        this.scene = scene;
        this.config = {
            size: 64,
            resolution: 64,
            noiseFrequency: 0.02,
            noiseAmplitude: 5,
            smoothness: 3,
            ...config
        };
        this.heightData = new Float32Array();
        this.mesh = new THREE.Mesh();
        this.gridLines = new THREE.LineSegments();
        this.noise = new ImprovedPerlinNoise();
        this.generate();
    }

    generate(): void {
        const { size, resolution, noiseFrequency, noiseAmplitude, smoothness } = this.config;
        const segments: number = resolution - 1;
        const vertices: number = resolution * resolution;

        const geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
        const positions: Float32Array = new Float32Array(vertices * 3);
        const colors: Float32Array = new Float32Array(vertices * 3);
        this.heightData = new Float32Array(vertices);

        const halfSize: number = size / 2;
        const step: number = size / segments;

        const octaves: number = Math.max(1, Math.min(5, Math.floor(smoothness)));

        for (let z: number = 0; z < resolution; z++) {
            for (let x: number = 0; x < resolution; x++) {
                const index: number = z * resolution + x;
                const posX: number = x * step - halfSize;
                const posZ: number = z * step - halfSize;

                let height: number = 0;
                let amplitude: number = 1;
                let frequency: number = noiseFrequency;
                let maxValue: number = 0;

                for (let o: number = 0; o < octaves; o++) {
                    height += this.noise.noise2D(posX * frequency, posZ * frequency) * amplitude;
                    maxValue += amplitude;
                    amplitude *= 0.5;
                    frequency *= 2;
                }

                height = (height / maxValue) * noiseAmplitude;
                this.heightData[index] = height;

                positions[index * 3] = posX;
                positions[index * 3 + 1] = height;
                positions[index * 3 + 2] = posZ;

                let color: THREE.Color;
                if (height < 0) {
                    color = new THREE.Color(0x2e7d32);
                } else if (height < 2) {
                    color = new THREE.Color(0x66bb6a);
                } else if (height < 4) {
                    color = new THREE.Color(0xc5a059);
                } else {
                    color = new THREE.Color(0x9e9e9e);
                }

                colors[index * 3] = color.r;
                colors[index * 3 + 1] = color.g;
                colors[index * 3 + 2] = color.b;
            }
        }

        const indices: number[] = [];
        for (let z: number = 0; z < segments; z++) {
            for (let x: number = 0; x < segments; x++) {
                const a: number = z * resolution + x;
                const b: number = a + resolution;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial({
            vertexColors: true,
            side: THREE.DoubleSide
        });

        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }
        if (this.mesh.material) {
            (this.mesh.material as THREE.Material).dispose();
        }
        if (this.mesh.parent) {
            this.scene.remove(this.mesh);
        }

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        this.createGridLines(size, segments);
    }

    private createGridLines(size: number, segments: number): void {
        const halfSize: number = size / 2;
        const step: number = size / segments;
        const gridPoints: number[] = [];

        for (let i: number = 0; i <= segments; i++) {
            const pos: number = i * step - halfSize;
            for (let j: number = 0; j <= segments; j++) {
                const x1: number = -halfSize + j * step;
                const z1: number = pos;
                const y1: number = this.getElevation(x1, z1) + 0.01;
                const x2: number = -halfSize + (j + 1) * step;
                const z2: number = pos;
                const y2: number = j < segments ? this.getElevation(x2, z2) + 0.01 : y1;
                if (j < segments) {
                    gridPoints.push(x1, y1, z1, x2, y2, z2);
                }
            }
            for (let j: number = 0; j <= segments; j++) {
                const x1: number = pos;
                const z1: number = -halfSize + j * step;
                const y1: number = this.getElevation(x1, z1) + 0.01;
                const x2: number = pos;
                const z2: number = -halfSize + (j + 1) * step;
                const y2: number = j < segments ? this.getElevation(x2, z2) + 0.01 : y1;
                if (j < segments) {
                    gridPoints.push(x1, y1, z1, x2, y2, z2);
                }
            }
        }

        const gridGeometry: THREE.BufferGeometry = new THREE.BufferGeometry();
        gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));

        const gridMaterial: THREE.LineBasicMaterial = new THREE.LineBasicMaterial({
            color: 0x555555,
            transparent: true,
            opacity: 0.4
        });

        if (this.gridLines.geometry) {
            this.gridLines.geometry.dispose();
        }
        if (this.gridLines.material) {
            (this.gridLines.material as THREE.Material).dispose();
        }
        if (this.gridLines.parent) {
            this.scene.remove(this.gridLines);
        }

        this.gridLines = new THREE.LineSegments(gridGeometry, gridMaterial);
        this.scene.add(this.gridLines);
    }

    updateSmoothness(value: number): void {
        this.config.smoothness = Math.max(1, Math.min(5, value));
        this.generate();
    }

    getElevation(x: number, z: number): number {
        const { size, resolution } = this.config;
        const halfSize: number = size / 2;
        const step: number = size / (resolution - 1);

        const localX: number = x + halfSize;
        const localZ: number = z + halfSize;

        const gridX: number = localX / step;
        const gridZ: number = localZ / step;

        const x0: number = Math.floor(gridX);
        const z0: number = Math.floor(gridZ);
        const x1: number = x0 + 1;
        const z1: number = z0 + 1;

        if (x0 < 0 || x1 >= resolution || z0 < 0 || z1 >= resolution) {
            return 0;
        }

        const fx: number = gridX - x0;
        const fz: number = gridZ - z0;

        const h00: number = this.heightData[z0 * resolution + x0];
        const h10: number = this.heightData[z0 * resolution + x1];
        const h01: number = this.heightData[z1 * resolution + x0];
        const h11: number = this.heightData[z1 * resolution + x1];

        const h0: number = h00 * (1 - fx) + h10 * fx;
        const h1: number = h01 * (1 - fx) + h11 * fx;

        return h0 * (1 - fz) + h1 * fz;
    }

    toUTM(x: number, z: number): { utmX: number; utmY: number } {
        const utmX: number = 500000 + x;
        const utmY: number = 4000000 - z;
        return {
            utmX: parseFloat(utmX.toFixed(2)),
            utmY: parseFloat(utmY.toFixed(2))
        };
    }

    toggleGrid(show: boolean): void {
        this.gridLines.visible = show;
    }

    getMesh(): THREE.Mesh {
        return this.mesh;
    }

    dispose(): void {
        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }
        if (this.mesh.material) {
            (this.mesh.material as THREE.Material).dispose();
        }
        if (this.gridLines.geometry) {
            this.gridLines.geometry.dispose();
        }
        if (this.gridLines.material) {
            (this.gridLines.material as THREE.Material).dispose();
        }
        if (this.mesh.parent) {
            this.scene.remove(this.mesh);
        }
        if (this.gridLines.parent) {
            this.scene.remove(this.gridLines);
        }
    }
}

export { TerrainGenerator, ImprovedPerlinNoise };
export type { TerrainConfig };
