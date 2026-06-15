import * as THREE from 'three';
import { RootSystem, RootNode } from './rootSystem';
import { RootRenderer } from './renderer';

export interface CameraControlsOptions {
    minDistance: number;
    maxDistance: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    rotateSpeed: number;
    zoomSpeed: number;
}

export class CameraControls {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    private target: THREE.Vector3;
    private spherical: THREE.Spherical;

    private isDragging = false;
    private previousMouse = { x: 0, y: 0 };
    private options: CameraControlsOptions;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = new THREE.Vector3(0, 0, 0);
        this.spherical = new THREE.Spherical();

        this.options = {
            minDistance: 3,
            maxDistance: 20,
            minPolarAngle: (30 * Math.PI) / 180,
            maxPolarAngle: (105 * Math.PI) / 180,
            rotateSpeed: 0.005,
            zoomSpeed: 0.001
        };

        this.spherical.setFromVector3(camera.position.clone().sub(this.target));
        this.bindEvents();
    }

    private bindEvents(): void {
        this.domElement.addEventListener('mousedown', this.onMouseDown);
        this.domElement.addEventListener('mousemove', this.onMouseMove);
        this.domElement.addEventListener('mouseup', this.onMouseUp);
        this.domElement.addEventListener('mouseleave', this.onMouseUp);
        this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
        
        this.domElement.addEventListener('touchstart', this.onTouchStart);
        this.domElement.addEventListener('touchmove', this.onTouchMove);
        this.domElement.addEventListener('touchend', this.onTouchEnd);
    }

    private onMouseDown = (e: MouseEvent): void => {
        if (e.button !== 0) return;
        this.isDragging = true;
        this.previousMouse = { x: e.clientX, y: e.clientY };
    };

    private onMouseMove = (e: MouseEvent): void => {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.previousMouse.x;
        const deltaY = e.clientY - this.previousMouse.y;

        this.spherical.theta -= deltaX * this.options.rotateSpeed;
        this.spherical.phi -= deltaY * this.options.rotateSpeed;

        this.constrainSpherical();
        this.updateCamera();

        this.previousMouse = { x: e.clientX, y: e.clientY };
    };

    private onMouseUp = (): void => {
        this.isDragging = false;
    };

    private onWheel = (e: WheelEvent): void => {
        e.preventDefault();
        this.spherical.radius += e.deltaY * this.options.zoomSpeed;
        this.constrainSpherical();
        this.updateCamera();
    };

    private onTouchStart = (e: TouchEvent): void => {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    private onTouchMove = (e: TouchEvent): void => {
        if (!this.isDragging || e.touches.length !== 1) return;

        const deltaX = e.touches[0].clientX - this.previousMouse.x;
        const deltaY = e.touches[0].clientY - this.previousMouse.y;

        this.spherical.theta -= deltaX * this.options.rotateSpeed;
        this.spherical.phi -= deltaY * this.options.rotateSpeed;

        this.constrainSpherical();
        this.updateCamera();

        this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    private onTouchEnd = (): void => {
        this.isDragging = false;
    };

    private constrainSpherical(): void {
        this.spherical.radius = Math.max(this.options.minDistance, Math.min(this.options.maxDistance, this.spherical.radius));
        this.spherical.phi = Math.max(this.options.minPolarAngle, Math.min(this.options.maxPolarAngle, this.spherical.phi));
    }

    private updateCamera(): void {
        const offset = new THREE.Vector3().setFromSpherical(this.spherical);
        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
    }

    public update(): void {
    }
}

export class InteractionManager {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    private rootSystem: RootSystem;
    private rootRenderer: RootRenderer;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;

    private isDraggingObstacle = false;
    private dragPlane: THREE.Plane;
    private onNodeSelect: ((node: RootNode | null) => void) | null = null;
    private dragStartPos = { x: 0, y: 0 };
    private isClick = true;

    constructor(
        camera: THREE.PerspectiveCamera,
        domElement: HTMLElement,
        rootSystem: RootSystem,
        rootRenderer: RootRenderer
    ) {
        this.camera = camera;
        this.domElement = domElement;
        this.rootSystem = rootSystem;
        this.rootRenderer = rootRenderer;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        this.bindEvents();
    }

    public setNodeSelectCallback(callback: (node: RootNode | null) => void): void {
        this.onNodeSelect = callback;
    }

    private bindEvents(): void {
        this.domElement.addEventListener('mousedown', this.onMouseDown);
        this.domElement.addEventListener('mousemove', this.onMouseMove);
        this.domElement.addEventListener('mouseup', this.onMouseUp);
        this.domElement.addEventListener('click', this.onClick);
    }

    private onMouseDown = (e: MouseEvent): void => {
        if (e.button !== 0) return;
        
        this.updateMouse(e);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.isClick = true;

        const obstacleMesh = this.rootRenderer.getObstacleMesh();
        if (obstacleMesh) {
            const intersects = this.raycaster.intersectObject(obstacleMesh);
            if (intersects.length > 0) {
                this.isDraggingObstacle = true;
                this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -obstacleMesh.position.y);
                this.isClick = false;
                return;
            }
        }
    };

    private onMouseMove = (e: MouseEvent): void => {
        const dx = Math.abs(e.clientX - this.dragStartPos.x);
        const dy = Math.abs(e.clientY - this.dragStartPos.y);
        if (dx > 3 || dy > 3) {
            this.isClick = false;
        }

        if (!this.isDraggingObstacle) return;

        this.updateMouse(e);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersection = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
            const obstacle = this.rootSystem.getObstacle();
            const newX = Math.max(-2.5, Math.min(2.5, intersection.x));
            const newZ = Math.max(-2.5, Math.min(2.5, intersection.z));
            this.rootRenderer.updateObstaclePosition(new THREE.Vector3(newX, obstacle.position.y, newZ));
        }
    };

    private onMouseUp = (): void => {
        this.isDraggingObstacle = false;
    };

    private onClick = (e: MouseEvent): void => {
        if (!this.isClick) return;

        this.updateMouse(e);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const nodeMeshes = this.rootRenderer.getNodeMeshes();
        const meshArray = Array.from(nodeMeshes.values());
        const intersects = this.raycaster.intersectObjects(meshArray, false);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object as THREE.Mesh;
            const nodeId = hitMesh.userData.nodeId as number;
            if (nodeId !== undefined) {
                this.rootSystem.highlightNode(nodeId);
                const node = this.rootSystem.getAllNodes().get(nodeId);
                if (this.onNodeSelect) {
                    this.onNodeSelect(node || null);
                }
            }
        } else {
            this.rootSystem.clearHighlight();
            if (this.onNodeSelect) {
                this.onNodeSelect(null);
            }
        }
    };

    private updateMouse(e: MouseEvent): void {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
}

export class UIController {
    private sliceOpacitySlider: HTMLInputElement;
    private sliceOpacityValue: HTMLElement;
    private controlPanel: HTMLElement;
    private drawerToggle: HTMLElement;

    constructor(onSliceOpacityChange: (opacity: number) => void) {
        this.sliceOpacitySlider = document.getElementById('slice-opacity') as HTMLInputElement;
        this.sliceOpacityValue = document.getElementById('slice-opacity-value') as HTMLElement;
        this.controlPanel = document.getElementById('control-panel') as HTMLElement;
        this.drawerToggle = document.getElementById('drawer-toggle') as HTMLElement;

        this.sliceOpacitySlider.addEventListener('input', () => {
            const value = parseFloat(this.sliceOpacitySlider.value);
            this.sliceOpacityValue.textContent = value.toFixed(1);
            onSliceOpacityChange(value);
        });

        this.drawerToggle.addEventListener('click', () => {
            this.controlPanel.classList.toggle('open');
            this.drawerToggle.textContent = this.controlPanel.classList.contains('open') 
                ? '▼ 收起控制面板' 
                : '▲ 展开控制面板';
        });
    }

    public updateStatus(rootCount: number, fps: number, elapsedTime: number): void {
        const rootCountEl = document.getElementById('root-count');
        const fpsEl = document.getElementById('fps-counter');
        const timeEl = document.getElementById('elapsed-time');

        if (rootCountEl) rootCountEl.textContent = `根数量: ${rootCount}`;
        if (fpsEl) fpsEl.textContent = `FPS: ${fps.toFixed(0)}`;
        if (timeEl) timeEl.textContent = `时间: ${elapsedTime.toFixed(1)}s`;
    }

    public updateNodeInfo(node: RootNode | null): void {
        const content = document.getElementById('node-info-content');
        if (!content) return;

        if (!node) {
            content.innerHTML = '<div class="no-selection">点击节点查看详情</div>';
            return;
        }

        const directionDeg = Math.atan2(node.direction.x, -node.direction.y) * 180 / Math.PI;
        
        content.innerHTML = `
            <div class="info-row">
                <span class="info-label">节点序号</span>
                <span class="info-value">#${node.id}</span>
            </div>
            <div class="info-row">
                <span class="info-label">当前长度</span>
                <span class="info-value">${node.length.toFixed(3)} 单位</span>
            </div>
            <div class="info-row">
                <span class="info-label">方向角</span>
                <span class="info-value">${directionDeg.toFixed(1)}°</span>
            </div>
            <div class="info-row">
                <span class="info-label">营养浓度</span>
                <span class="info-value">${(node.nutrientValue * 100).toFixed(1)}%</span>
            </div>
            <div class="info-row">
                <span class="info-label">根类型</span>
                <span class="info-value">${node.isLateral ? '侧根' : '主根'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">子节点数</span>
                <span class="info-value">${node.childIds.length}</span>
            </div>
        `;
    }
}
