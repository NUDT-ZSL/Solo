import * as THREE from 'three';
import { RootSystem, RootNode, RootSegment, Particle } from './rootSystem';

export class RootRenderer {
    private scene: THREE.Scene;
    private rootSystem: RootSystem;
    private rootMeshes: Map<number, THREE.Mesh> = new Map();
    private nodeMeshes: Map<number, THREE.Mesh> = new Map();
    private seedMeshes: THREE.Mesh[] = [];
    private soilMesh: THREE.Mesh | null = null;
    private obstacleMesh: THREE.Mesh | null = null;
    private nutrientSliceMesh: THREE.Mesh | null = null;
    private particleMeshes: THREE.Points | null = null;
    private outlineMeshes: Map<number, THREE.LineSegments> = new Map();

    private readonly initialRootColor = new THREE.Color(0xA0522D);
    private readonly woodyRootColor = new THREE.Color(0x5C3317);
    private readonly primaryRootColor = new THREE.Color(0x8B5A2B);
    private readonly highlightColor = new THREE.Color(0x00FF00);
    private readonly outlineColor = new THREE.Color(0x87CEEB);

    constructor(scene: THREE.Scene, rootSystem: RootSystem) {
        this.scene = scene;
        this.rootSystem = rootSystem;
        this.createSoilCube();
        this.createSeeds();
        this.createObstacle();
        this.createNutrientSlice();
        this.createParticleSystem();
    }

    private createSoilCube(): void {
        const geometry = new THREE.BoxGeometry(6, 4, 6);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.15,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        this.soilMesh = new THREE.Mesh(geometry, material);
        this.soilMesh.position.set(0, 0, 0);
        this.scene.add(this.soilMesh);

        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x654321, 
            transparent: true, 
            opacity: 0.3 
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        this.soilMesh.add(wireframe);
    }

    private createSeeds(): void {
        const seeds = this.rootSystem.getSeeds();
        for (const seed of seeds) {
            const geometry = new THREE.SphereGeometry(0.15, 16, 12);
            geometry.scale(1, 0.7, 1);
            const material = new THREE.MeshStandardMaterial({
                color: 0x3D2314,
                roughness: 0.8,
                metalness: 0.2
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(seed);
            mesh.userData.isSeed = true;
            this.scene.add(mesh);
            this.seedMeshes.push(mesh);
        }
    }

    private createObstacle(): void {
        const obstacle = this.rootSystem.getObstacle();
        const geometry = new THREE.BoxGeometry(obstacle.width, obstacle.height, obstacle.depth);
        const material = new THREE.MeshStandardMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.5,
            roughness: 0.7
        });
        this.obstacleMesh = new THREE.Mesh(geometry, material);
        this.obstacleMesh.position.copy(obstacle.position);
        this.obstacleMesh.userData.isObstacle = true;
        this.scene.add(this.obstacleMesh);

        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.6 });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        this.obstacleMesh.add(wireframe);
    }

    private createNutrientSlice(): void {
        const size = 5;
        const resolution = 64;
        const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
        const positions = geometry.attributes.position;
        
        const colors = new Float32Array(positions.count * 3);
        const purple = new THREE.Color(0x800080);
        const yellow = new THREE.Color(0xFFFF00);

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getY(i);
            const nutrient = this.rootSystem.getNutrientField(x, z);
            
            const color = purple.clone().lerp(yellow, nutrient);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });

        this.nutrientSliceMesh = new THREE.Mesh(geometry, material);
        this.nutrientSliceMesh.rotation.x = -Math.PI / 2;
        this.nutrientSliceMesh.position.y = -1.0;
        this.scene.add(this.nutrientSliceMesh);
    }

    private createParticleSystem(): void {
        const maxParticles = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(maxParticles * 3);
        const colors = new Float32Array(maxParticles * 3);
        const sizes = new Float32Array(maxParticles);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        this.particleMeshes = new THREE.Points(geometry, material);
        this.scene.add(this.particleMeshes);
    }

    private createTubeGeometry(segment: RootSegment, diameter: number): THREE.BufferGeometry {
        const points: THREE.Vector3[] = [];
        const [p0, p1, p2] = segment.controlPoints;
        
        for (let t = 0; t <= 1; t += 0.1) {
            const mt = 1 - t;
            const point = new THREE.Vector3(
                mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
                mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
                mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z
            );
            points.push(point);
        }

        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, 8, diameter, 8, false);
    }

    private getRootColor(node: RootNode, elapsedTime: number): THREE.Color {
        if (node.isHighlighted) {
            return this.highlightColor.clone();
        }

        const baseColor = node.isLateral ? this.initialRootColor.clone() : this.primaryRootColor.clone();
        
        if (elapsedTime > 30) {
            const woodProgress = Math.min((elapsedTime - 30) / 30, 1);
            return baseColor.lerp(this.woodyRootColor, woodProgress);
        }
        
        return baseColor;
    }

    public update(): void {
        const allNodes = this.rootSystem.getAllNodes();
        const rootSegments = this.rootSystem.getRootSegments();
        const elapsedTime = this.rootSystem.getElapsedTime();

        const renderedRootIds = new Set<number>();

        for (const [rootId, segments] of rootSegments) {
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const meshKey = rootId * 1000 + i;
                renderedRootIds.add(meshKey);

                const endNode = allNodes.get(segment.endNode);
                if (!endNode) continue;

                if (!this.rootMeshes.has(meshKey)) {
                    const diameter = endNode.diameter;
                    const geometry = this.createTubeGeometry(segment, diameter);
                    const material = new THREE.MeshStandardMaterial({
                        color: this.getRootColor(endNode, elapsedTime),
                        roughness: 0.85,
                        metalness: 0.05
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.userData.segmentKey = meshKey;
                    mesh.userData.rootId = rootId;
                    mesh.userData.segmentIndex = i;
                    this.scene.add(mesh);
                    this.rootMeshes.set(meshKey, mesh);

                    const edges = new THREE.EdgesGeometry(geometry);
                    const outlineMat = new THREE.LineBasicMaterial({
                        color: this.outlineColor,
                        transparent: true,
                        opacity: 0.3
                    });
                    const outline = new THREE.LineSegments(edges, outlineMat);
                    mesh.add(outline);
                    this.outlineMeshes.set(meshKey, outline);
                } else {
                    const mesh = this.rootMeshes.get(meshKey)!;
                    const material = mesh.material as THREE.MeshStandardMaterial;
                    material.color.copy(this.getRootColor(endNode, elapsedTime));
                }
            }
        }

        const renderedNodeIds = new Set<number>();
        for (const [nodeId, node] of allNodes) {
            renderedNodeIds.add(nodeId);
            
            if (!this.nodeMeshes.has(nodeId)) {
                const geometry = new THREE.SphereGeometry(node.diameter * 1.5, 8, 6);
                const material = new THREE.MeshStandardMaterial({
                    color: this.getRootColor(node, elapsedTime),
                    emissive: node.isHighlighted ? this.highlightColor : new THREE.Color(0x000000),
                    emissiveIntensity: node.isHighlighted ? 0.5 : 0
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.copy(node.position);
                mesh.userData.nodeId = nodeId;
                mesh.userData.isRootNode = true;
                this.scene.add(mesh);
                this.nodeMeshes.set(nodeId, mesh);
            } else {
                const mesh = this.nodeMeshes.get(nodeId)!;
                mesh.position.copy(node.position);
                const material = mesh.material as THREE.MeshStandardMaterial;
                material.color.copy(this.getRootColor(node, elapsedTime));
                material.emissive.copy(node.isHighlighted ? this.highlightColor : new THREE.Color(0x000000));
                material.emissiveIntensity = node.isHighlighted ? 0.5 : 0;
            }
        }

        this.updateParticles();
    }

    private updateParticles(): void {
        if (!this.particleMeshes) return;

        const particles = this.rootSystem.getParticles();
        const positions = this.particleMeshes.geometry.attributes.position.array as Float32Array;
        const colors = this.particleMeshes.geometry.attributes.color.array as Float32Array;
        const sizes = this.particleMeshes.geometry.attributes.size.array as Float32Array;

        for (let i = 0; i < positions.length / 3; i++) {
            if (i < particles.length) {
                const p = particles[i];
                positions[i * 3] = p.position.x + (Math.random() - 0.5) * 0.1;
                positions[i * 3 + 1] = p.position.y + (Math.random() - 0.5) * 0.1;
                positions[i * 3 + 2] = p.position.z + (Math.random() - 0.5) * 0.1;
                
                const alpha = p.life / p.maxLife;
                colors[i * 3] = 1;
                colors[i * 3 + 1] = 1;
                colors[i * 3 + 2] = 1;
                sizes[i] = 0.05 + alpha * 0.05;
            } else {
                positions[i * 3] = 0;
                positions[i * 3 + 1] = -1000;
                positions[i * 3 + 2] = 0;
                sizes[i] = 0;
            }
        }

        this.particleMeshes.geometry.attributes.position.needsUpdate = true;
        this.particleMeshes.geometry.attributes.color.needsUpdate = true;
        this.particleMeshes.geometry.attributes.size.needsUpdate = true;
    }

    public setSliceOpacity(opacity: number): void {
        if (this.nutrientSliceMesh) {
            const material = this.nutrientSliceMesh.material as THREE.MeshBasicMaterial;
            material.opacity = Math.min(opacity, 1.0);
        }
    }

    public getObstacleMesh(): THREE.Mesh | null {
        return this.obstacleMesh;
    }

    public getNodeMeshes(): Map<number, THREE.Mesh> {
        return this.nodeMeshes;
    }

    public updateObstaclePosition(position: THREE.Vector3): void {
        if (this.obstacleMesh) {
            this.obstacleMesh.position.copy(position);
        }
        this.rootSystem.setObstaclePosition(position);
    }
}
