import * as THREE from 'three';

export interface RootNode {
    id: number;
    position: THREE.Vector3;
    direction: THREE.Vector3;
    length: number;
    age: number;
    nutrientValue: number;
    isHighlighted: boolean;
    parentId: number | null;
    childIds: number[];
    isLateral: boolean;
    diameter: number;
}

export interface RootSegment {
    startNode: number;
    endNode: number;
    controlPoints: THREE.Vector3[];
    rootId: number;
}

export interface Obstacle {
    position: THREE.Vector3;
    width: number;
    depth: number;
    height: number;
}

export interface Particle {
    position: THREE.Vector3;
    life: number;
    maxLife: number;
}

export class RootSystem {
    private seeds: THREE.Vector3[] = [];
    private roots: Map<number, RootNode[]> = new Map();
    private rootSegments: Map<number, RootSegment[]> = new Map();
    private allNodes: Map<number, RootNode> = new Map();
    private nextNodeId = 0;
    private nextRootId = 0;
    private totalRootCount = 0;
    private readonly maxRoots = 120;
    private readonly segmentLength = 0.15;
    private readonly lateralBranchingInterval = 0.2;
    private obstacle: Obstacle;
    private particles: Particle[] = [];
    private nutrientHotspot: { center: THREE.Vector3; intensity: number; radius: number };
    private growthSinceLastBranch: Map<number, number> = new Map();
    private elapsedTime = 0;

    constructor() {
        this.obstacle = {
            position: new THREE.Vector3(0, -1.75, 0),
            width: 2,
            depth: 2,
            height: 0.5
        };

        this.nutrientHotspot = {
            center: new THREE.Vector3(0, -1.8, 0),
            intensity: 0.7,
            radius: 2.5
        };

        this.initializeSeeds();
    }

    private initializeSeeds(): void {
        const seedCount = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < seedCount; i++) {
            const seed = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 5
            );
            this.seeds.push(seed);
            this.createPrimaryRoot(seed);
        }
    }

    private createPrimaryRoot(seedPosition: THREE.Vector3): void {
        if (this.totalRootCount >= this.maxRoots) return;

        const rootId = this.nextRootId++;
        const nodes: RootNode[] = [];
        const segments: RootSegment[] = [];

        const initialDir = new THREE.Vector3(0, -1, 0);
        const startPos = seedPosition.clone();
        const endPos = startPos.clone().add(initialDir.clone().multiplyScalar(0.5));

        const startNode = this.createNode(startPos, initialDir, 0, null, false, 0.05);
        const endNode = this.createNode(endPos, initialDir, 0.5, startNode.id, false, 0.05);

        nodes.push(startNode, endNode);
        this.allNodes.set(startNode.id, startNode);
        this.allNodes.set(endNode.id, endNode);
        startNode.childIds.push(endNode.id);

        const midControl = startPos.clone().add(endPos).multiplyScalar(0.5);
        midControl.add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            0,
            (Math.random() - 0.5) * 0.05
        ));

        segments.push({
            startNode: startNode.id,
            endNode: endNode.id,
            controlPoints: [startPos.clone(), midControl, endPos.clone()],
            rootId
        });

        this.roots.set(rootId, nodes);
        this.rootSegments.set(rootId, segments);
        this.growthSinceLastBranch.set(rootId, 0.5);
        this.totalRootCount++;
    }

    private createNode(
        position: THREE.Vector3,
        direction: THREE.Vector3,
        length: number,
        parentId: number | null,
        isLateral: boolean,
        diameter: number
    ): RootNode {
        const id = this.nextNodeId++;
        return {
            id,
            position: position.clone(),
            direction: direction.clone().normalize(),
            length,
            age: 0,
            nutrientValue: this.getNutrientAt(position),
            isHighlighted: false,
            parentId,
            childIds: [],
            isLateral,
            diameter
        };
    }

    private getNutrientAt(position: THREE.Vector3): number {
        const dist = position.distanceTo(this.nutrientHotspot.center);
        const gaussian = Math.exp(-(dist * dist) / (2 * this.nutrientHotspot.radius * this.nutrientHotspot.radius));
        return 0.3 + gaussian * 0.7;
    }

    public getNutrientField(x: number, z: number): number {
        const pos = new THREE.Vector3(x, -1.0, z);
        return this.getNutrientAt(pos);
    }

    private computeGrowthDirection(currentDir: THREE.Vector3, position: THREE.Vector3): THREE.Vector3 {
        const gravity = new THREE.Vector3(0, -1, 0);
        const randomAngle = (Math.random() - 0.5) * 10 * Math.PI / 180;
        const randomAxis = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();

        const nutrientDir = this.nutrientHotspot.center.clone().sub(position).normalize();
        const nutrientWeight = this.getNutrientAt(position) * 0.3;

        const newDir = new THREE.Vector3();
        newDir.add(currentDir.clone().multiplyScalar(0.5));
        newDir.add(gravity.clone().multiplyScalar(0.35));
        newDir.add(nutrientDir.clone().multiplyScalar(nutrientWeight));
        newDir.normalize();

        const quat = new THREE.Quaternion().setFromAxisAngle(randomAxis, randomAngle);
        newDir.applyQuaternion(quat);

        return newDir.normalize();
    }

    private checkObstacleCollision(position: THREE.Vector3, direction: THREE.Vector3): { hit: boolean; newDir?: THREE.Vector3 } {
        const ob = this.obstacle;
        const halfW = ob.width / 2;
        const halfD = ob.depth / 2;
        const halfH = ob.height / 2;

        const nextPos = position.clone().add(direction.clone().multiplyScalar(this.segmentLength));

        if (
            nextPos.x >= ob.position.x - halfW && nextPos.x <= ob.position.x + halfW &&
            nextPos.y >= ob.position.y - halfH && nextPos.y <= ob.position.y + halfH &&
            nextPos.z >= ob.position.z - halfD && nextPos.z <= ob.position.z + halfD
        ) {
            const deflectAngle = (Math.random() > 0.5 ? 1 : -1) * 45 * Math.PI / 180;
            const upAxis = new THREE.Vector3(0, 1, 0);
            const newDir = direction.clone().applyAxisAngle(upAxis, deflectAngle).normalize();
            newDir.y = Math.abs(newDir.y) * 0.3;
            newDir.normalize();

            for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
                this.particles.push({
                    position: position.clone(),
                    life: 0.2,
                    maxLife: 0.2
                });
            }

            return { hit: true, newDir };
        }

        return { hit: false };
    }

    public update(deltaTime: number): void {
        this.elapsedTime += deltaTime;
        const growthSpeed = 0.08 * deltaTime;

        this.particles = this.particles.filter(p => {
            p.life -= deltaTime;
            return p.life > 0;
        });

        const rootIds = Array.from(this.roots.keys());
        for (const rootId of rootIds) {
            const nodes = this.roots.get(rootId)!;
            const segments = this.rootSegments.get(rootId)!;

            if (nodes.length === 0) continue;

            const lastNode = nodes[nodes.length - 1];

            if (this.elapsedTime > 30) {
                for (const node of nodes) {
                    node.age += deltaTime;
                }
            }

            let growthDir = this.computeGrowthDirection(lastNode.direction, lastNode.position);
            const collision = this.checkObstacleCollision(lastNode.position, growthDir);
            
            if (collision.hit && collision.newDir) {
                growthDir = collision.newDir;
            }

            const growthAmount = growthSpeed;
            const newGrowth = this.growthSinceLastBranch.get(rootId) || 0;

            if (newGrowth + growthAmount >= this.segmentLength) {
                const actualGrowth = this.segmentLength - newGrowth;
                const newPosition = lastNode.position.clone().add(growthDir.clone().multiplyScalar(actualGrowth));

                const isLateral = lastNode.isLateral;
                const diameter = isLateral ? 0.03 : 0.05;
                const newNode = this.createNode(newPosition, growthDir, lastNode.length + actualGrowth, lastNode.id, isLateral, diameter);
                nodes.push(newNode);
                this.allNodes.set(newNode.id, newNode);
                lastNode.childIds.push(newNode.id);

                const midControl = lastNode.position.clone().add(newPosition).multiplyScalar(0.5);
                midControl.add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.05,
                    (Math.random() - 0.5) * 0.05,
                    (Math.random() - 0.5) * 0.05
                ));

                segments.push({
                    startNode: lastNode.id,
                    endNode: newNode.id,
                    controlPoints: [lastNode.position.clone(), midControl, newPosition.clone()],
                    rootId
                });

                this.growthSinceLastBranch.set(rootId, 0);

                const totalGrowthSinceBranch = newGrowth + actualGrowth;
                if (totalGrowthSinceBranch >= this.lateralBranchingInterval && this.totalRootCount < this.maxRoots) {
                    this.createLateralRoot(rootId, newNode);
                }
            } else {
                this.growthSinceLastBranch.set(rootId, newGrowth + growthAmount);
            }
        }
    }

    private createLateralRoot(parentRootId: number, parentNode: RootNode): void {
        if (this.totalRootCount >= this.maxRoots) return;

        const rootId = this.nextRootId++;
        const nodes: RootNode[] = [];
        const segments: RootSegment[] = [];

        const angle = (30 + Math.random() * 30) * Math.PI / 180;
        const perpAxis = new THREE.Vector3(
            Math.random() - 0.5,
            0,
            Math.random() - 0.5
        ).normalize();

        const lateralDir = parentNode.direction.clone()
            .applyAxisAngle(perpAxis, angle)
            .normalize();

        const startNode = this.createNode(
            parentNode.position.clone(),
            lateralDir,
            0,
            parentNode.id,
            true,
            0.03
        );

        const endPos = parentNode.position.clone().add(lateralDir.clone().multiplyScalar(this.segmentLength));
        const endNode = this.createNode(
            endPos,
            lateralDir,
            this.segmentLength,
            startNode.id,
            true,
            0.03
        );

        nodes.push(startNode, endNode);
        this.allNodes.set(startNode.id, startNode);
        this.allNodes.set(endNode.id, endNode);
        startNode.childIds.push(endNode.id);
        parentNode.childIds.push(startNode.id);

        const midControl = parentNode.position.clone().add(endPos).multiplyScalar(0.5);
        midControl.add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            0,
            (Math.random() - 0.5) * 0.05
        ));

        segments.push({
            startNode: startNode.id,
            endNode: endNode.id,
            controlPoints: [parentNode.position.clone(), midControl, endPos.clone()],
            rootId
        });

        this.roots.set(rootId, nodes);
        this.rootSegments.set(rootId, segments);
        this.growthSinceLastBranch.set(rootId, this.segmentLength);
        this.totalRootCount++;
    }

    public getSeeds(): THREE.Vector3[] {
        return this.seeds;
    }

    public getAllNodes(): Map<number, RootNode> {
        return this.allNodes;
    }

    public getRootSegments(): Map<number, RootSegment[]> {
        return this.rootSegments;
    }

    public getRoots(): Map<number, RootNode[]> {
        return this.roots;
    }

    public getObstacle(): Obstacle {
        return this.obstacle;
    }

    public setObstaclePosition(pos: THREE.Vector3): void {
        this.obstacle.position.copy(pos);
    }

    public getParticles(): Particle[] {
        return this.particles;
    }

    public getTotalRootCount(): number {
        return this.totalRootCount;
    }

    public getElapsedTime(): number {
        return this.elapsedTime;
    }

    public getNutrientHotspot() {
        return this.nutrientHotspot;
    }

    public highlightNode(nodeId: number): void {
        for (const node of this.allNodes.values()) {
            node.isHighlighted = false;
        }

        const node = this.allNodes.get(nodeId);
        if (node) {
            node.isHighlighted = true;
            for (const childId of node.childIds) {
                const child = this.allNodes.get(childId);
                if (child) child.isHighlighted = true;
            }
        }
    }

    public clearHighlight(): void {
        for (const node of this.allNodes.values()) {
            node.isHighlighted = false;
        }
    }
}
