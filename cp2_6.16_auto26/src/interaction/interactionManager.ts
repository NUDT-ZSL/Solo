import * as THREE from 'three';
import type { TerrainPoint, Marker, PathSegment, Measurement } from '../ui/markerSystem';
import type { MarkerInfo, ControlEvents } from '../ui/overlayPanel';

export interface CameraState {
    theta: number;
    phi: number;
    distance: number;
    target: THREE.Vector3;
}

interface TerrainGenerator {
    getMesh(): THREE.Mesh;
    getElevation(x: number, z: number): number;
    toUTM(x: number, z: number): { utmX: number; utmY: number };
}

interface MarkerSystem {
    addMarker(point: TerrainPoint): Marker;
    addPathNode(point: TerrainPoint): void;
    addMeasurement(startPoint: TerrainPoint, endPoint: TerrainPoint): Measurement;
    updateLabels(): void;
    getLastMarker(): Marker | null;
    getTotalPathLength(): number;
    raycastPathSegments(raycaster: THREE.Raycaster): PathSegment | null;
    removeSegment(segmentId: string): void;
    clearAllPaths(): void;
    clearMeasurements(): void;
    exportPathData(): any;
    dispose(): void;
}

interface OverlayPanel {
    updateMarkerInfo(info: MarkerInfo): void;
    updatePathLength(length: number): void;
    setMeasureMode(active: boolean): void;
    showContextMenu(x: number, y: number, onDelete: () => void, onClearAll: () => void): void;
    hideContextMenu(): void;
    downloadJSON(data: any, filename: string): void;
}

export class InteractionManager {
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private terrain: TerrainGenerator;
    private markers: MarkerSystem;
    private panel: OverlayPanel;

    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;

    private isLeftDragging: boolean = false;
    private isRightDragging: boolean = false;
    private isShiftPressed: boolean = false;
    public isMeasureMode: boolean = false;

    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private dragStartX: number = 0;
    private dragStartY: number = 0;

    private cameraState: CameraState;
    private targetCameraState: CameraState;

    private isAnimating: boolean = false;
    private animationStartTime: number = 0;
    private animationDuration: number = 400;

    private measureFirstPoint: TerrainPoint | null = null;

    private readonly MIN_DISTANCE: number = 5;
    private readonly MAX_DISTANCE: number = 50;
    private readonly MIN_PHI: number = 15 * Math.PI / 180;
    private readonly MAX_PHI: number = 75 * Math.PI / 180;

    private readonly CUBIC_BEZIER = (t: number): number => {
        const x1 = 0.25, y1 = 0.1;
        const x2 = 0.25, y2 = 1;
        const cx = 3 * x1;
        const bx = 3 * (x2 - x1) - cx;
        const ax = 1 - cx - bx;
        const cy = 3 * y1;
        const by = 3 * (y2 - y1) - cy;
        const ay = 1 - cy - by;
        
        let sampleT = t;
        for (let i = 0; i < 8; i++) {
            const x = ((ax * sampleT + bx) * sampleT + cx) * sampleT - t;
            if (Math.abs(x) < 1e-3) break;
            const dx = (3 * ax * sampleT + 2 * bx) * sampleT + cx;
            if (Math.abs(dx) < 1e-6) break;
            sampleT -= x / dx;
        }
        return ((ay * sampleT + by) * sampleT + cy) * sampleT;
    };

    private boundHandleMouseDown: (e: MouseEvent) => void;
    private boundHandleMouseMove: (e: MouseEvent) => void;
    private boundHandleMouseUp: (e: MouseEvent) => void;
    private boundHandleWheel: (e: WheelEvent) => void;
    private boundHandleKeyDown: (e: KeyboardEvent) => void;
    private boundHandleKeyUp: (e: KeyboardEvent) => void;
    private boundHandleContextMenu: (e: MouseEvent) => void;

    constructor(
        camera: THREE.PerspectiveCamera,
        renderer: THREE.WebGLRenderer,
        terrainGenerator: TerrainGenerator,
        markerSystem: MarkerSystem,
        overlayPanel: OverlayPanel
    ) {
        this.camera = camera;
        this.renderer = renderer;
        this.terrain = terrainGenerator;
        this.markers = markerSystem;
        this.panel = overlayPanel;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        const initialPos = new THREE.Vector3(15, 20, 15);
        const target = new THREE.Vector3(0, 0, 0);
        const distance = initialPos.distanceTo(target);
        const dx = initialPos.x - target.x;
        const dy = initialPos.y - target.y;
        const dz = initialPos.z - target.z;
        const theta = Math.atan2(dx, dz);
        const phi = Math.acos(dy / distance);

        this.cameraState = { theta, phi, distance, target: target.clone() };
        this.targetCameraState = { theta, phi, distance, target: target.clone() };

        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleWheel = this.handleWheel.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundHandleContextMenu = this.handleContextMenu.bind(this);
    }

    public init(): void {
        const initialPos = new THREE.Vector3(15, 20, 15);
        const target = new THREE.Vector3(0, 0, 0);
        const distance = initialPos.distanceTo(target);
        const dx = initialPos.x - target.x;
        const dy = initialPos.y - target.y;
        const dz = initialPos.z - target.z;
        const theta = Math.atan2(dx, dz);
        const phi = Math.acos(dy / distance);

        this.cameraState = { theta, phi, distance, target: target.clone() };
        this.targetCameraState = { theta, phi, distance, target: target.clone() };

        this.renderer.domElement.addEventListener('mousedown', this.boundHandleMouseDown);
        this.renderer.domElement.addEventListener('mousemove', this.boundHandleMouseMove);
        this.renderer.domElement.addEventListener('mouseup', this.boundHandleMouseUp);
        this.renderer.domElement.addEventListener('wheel', this.boundHandleWheel);
        window.addEventListener('keydown', this.boundHandleKeyDown);
        window.addEventListener('keyup', this.boundHandleKeyUp);
        this.renderer.domElement.addEventListener('contextmenu', this.boundHandleContextMenu);
    }

    private handleMouseDown(e: MouseEvent): void {
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        if (e.button === 0) {
            this.isLeftDragging = true;
        } else if (e.button === 2) {
            this.mouse.x = (e.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const segment = this.markers.raycastPathSegments(this.raycaster);
            
            if (segment) {
                this.panel.showContextMenu(
                    e.clientX,
                    e.clientY,
                    () => this.handleDeleteSegment(segment.id),
                    () => this.handleClearAllPaths()
                );
                return;
            }
            this.isRightDragging = true;
        }
    }

    private handleMouseMove(e: MouseEvent): void {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        if (this.isLeftDragging) {
            this.targetCameraState.theta -= deltaX * 0.01;
            this.targetCameraState.phi -= deltaY * 0.01;
            this.targetCameraState.phi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.targetCameraState.phi));
            this.startAnimation();
        }

        if (this.isRightDragging) {
            const panSpeed = 0.05 * this.cameraState.distance;
            const right = new THREE.Vector3();
            const up = new THREE.Vector3(0, 1, 0);
            this.camera.getWorldDirection(right);
            right.cross(up).normalize();
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            this.targetCameraState.target.addScaledVector(right, -deltaX * panSpeed);
            this.targetCameraState.target.addScaledVector(forward, deltaY * panSpeed);
            this.startAnimation();
        }

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    private handleMouseUp(e: MouseEvent): void {
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - this.dragStartX, 2) +
            Math.pow(e.clientY - this.dragStartY, 2)
        );

        this.isLeftDragging = false;
        this.isRightDragging = false;

        if (moveDistance < 5 && e.button === 0) {
            this.pickTerrain(e);
        }
    }

    private handleWheel(e: WheelEvent): void {
        e.preventDefault();
        const zoomSpeed = 0.001;
        this.targetCameraState.distance += e.deltaY * zoomSpeed * this.targetCameraState.distance;
        this.targetCameraState.distance = Math.max(this.MIN_DISTANCE, Math.min(this.MAX_DISTANCE, this.targetCameraState.distance));
        this.startAnimation();
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Shift') {
            this.isShiftPressed = true;
        }
        if (e.key === 'Escape') {
            this.isMeasureMode = false;
            this.measureFirstPoint = null;
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        if (e.key === 'Shift') {
            this.isShiftPressed = false;
        }
    }

    private handleContextMenu(e: MouseEvent): void {
        e.preventDefault();
    }

    private handleDeleteSegment(segmentId: string): void {
        this.markers.removeSegment?.(segmentId);
        this.panel.updatePathLength(this.markers.getTotalPathLength());
    }

    private handleClearAllPaths(): void {
        this.markers.clearAllPaths?.();
        this.panel.updatePathLength(0);
    }

    private pickTerrain(e: MouseEvent): void {
        this.mouse.x = (e.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain.getMesh());

        if (intersects.length > 0) {
            const point = intersects[0].point;
            const elevation = this.terrain.getElevation(point.x, point.z);
            const utm = this.terrain.toUTM(point.x, point.z);

            const terrainPoint: TerrainPoint = {
                x: point.x,
                z: point.z,
                elevation,
                utmX: utm.utmX,
                utmY: utm.utmY
            };

            if (this.isMeasureMode) {
                if (this.measureFirstPoint === null) {
                    this.measureFirstPoint = terrainPoint;
                } else {
                    this.markers.addMeasurement(this.measureFirstPoint, terrainPoint);
                    this.measureFirstPoint = null;
                    this.isMeasureMode = false;
                    this.panel.setMeasureMode(false);
                }
            } else if (this.isShiftPressed) {
                this.markers.addPathNode(terrainPoint);
                const pathLength = this.markers.getTotalPathLength();
                this.panel.updatePathLength(pathLength);
            } else {
                const lastMarker = this.markers.getLastMarker();
                let horizontalDistance: number | undefined;
                let slope: number | undefined;

                if (lastMarker) {
                    const dx = terrainPoint.x - lastMarker.position.x;
                    const dz = terrainPoint.z - lastMarker.position.z;
                    horizontalDistance = Math.sqrt(dx * dx + dz * dz);
                    const elevationDiff = terrainPoint.elevation - lastMarker.position.elevation;
                    if (horizontalDistance > 0) {
                        slope = (elevationDiff / horizontalDistance) * 100;
                    }
                }

                this.markers.addMarker(terrainPoint);

                this.panel.updateMarkerInfo({
                    utmX: terrainPoint.utmX,
                    utmY: terrainPoint.utmY,
                    elevation: terrainPoint.elevation,
                    distance: horizontalDistance,
                    slope: slope
                });
            }
        }
    }

    private startAnimation(): void {
        this.isAnimating = true;
        this.animationStartTime = performance.now();
        this.animationDuration = 400;
    }

    public update(deltaTime: number): void {
        if (this.isAnimating) {
            const now = performance.now();
            let t = (now - this.animationStartTime) / this.animationDuration;
            t = Math.max(0, Math.min(1, t));

            const easedT = this.CUBIC_BEZIER(t);

            this.cameraState.theta += (this.targetCameraState.theta - this.cameraState.theta) * easedT;
            this.cameraState.phi += (this.targetCameraState.phi - this.cameraState.phi) * easedT;
            this.cameraState.distance += (this.targetCameraState.distance - this.cameraState.distance) * easedT;
            this.cameraState.target.lerp(this.targetCameraState.target, easedT);

            if (t >= 1) {
                this.isAnimating = false;
                this.cameraState.theta = this.targetCameraState.theta;
                this.cameraState.phi = this.targetCameraState.phi;
                this.cameraState.distance = this.targetCameraState.distance;
                this.cameraState.target.copy(this.targetCameraState.target);
            }
        } else if (this.isLeftDragging || this.isRightDragging) {
            const fastSpeed = 10 * deltaTime;
            this.cameraState.theta += (this.targetCameraState.theta - this.cameraState.theta) * fastSpeed;
            this.cameraState.phi += (this.targetCameraState.phi - this.cameraState.phi) * fastSpeed;
            this.cameraState.distance += (this.targetCameraState.distance - this.cameraState.distance) * fastSpeed;
            this.cameraState.target.lerp(this.targetCameraState.target, fastSpeed);
        }

        const theta = this.cameraState.theta;
        const phi = this.cameraState.phi;
        const distance = this.cameraState.distance;
        const target = this.cameraState.target;

        this.camera.position.x = target.x + distance * Math.sin(phi) * Math.sin(theta);
        this.camera.position.y = target.y + distance * Math.cos(phi);
        this.camera.position.z = target.z + distance * Math.sin(phi) * Math.cos(theta);
        this.camera.lookAt(target);

        this.markers.updateLabels();
    }

    public resetView(): void {
        const initialPos = new THREE.Vector3(15, 20, 15);
        const target = new THREE.Vector3(0, 0, 0);
        const distance = initialPos.distanceTo(target);
        const dx = initialPos.x - target.x;
        const dy = initialPos.y - target.y;
        const dz = initialPos.z - target.z;
        const theta = Math.atan2(dx, dz);
        const phi = Math.acos(dy / distance);

        this.targetCameraState = { theta, phi, distance, target: target.clone() };
        this.startAnimation();
    }

    public dispose(): void {
        this.renderer.domElement.removeEventListener('mousedown', this.boundHandleMouseDown);
        this.renderer.domElement.removeEventListener('mousemove', this.boundHandleMouseMove);
        this.renderer.domElement.removeEventListener('mouseup', this.boundHandleMouseUp);
        this.renderer.domElement.removeEventListener('wheel', this.boundHandleWheel);
        window.removeEventListener('keydown', this.boundHandleKeyDown);
        window.removeEventListener('keyup', this.boundHandleKeyUp);
        this.renderer.domElement.removeEventListener('contextmenu', this.boundHandleContextMenu);
    }
}
