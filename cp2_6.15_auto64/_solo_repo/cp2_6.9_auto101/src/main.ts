import * as THREE from 'three';
import { RootSystem } from './rootSystem';
import { RootRenderer } from './renderer';
import { CameraControls, InteractionManager, UIController } from './controls';

class App {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private rootSystem: RootSystem;
    private rootRenderer: RootRenderer;
    private cameraControls: CameraControls;
    private interactionManager: InteractionManager;
    private uiController: UIController;

    private clock: THREE.Clock;
    private frameCount = 0;
    private fpsTime = 0;
    private currentFps = 0;

    constructor() {
        this.clock = new THREE.Clock();

        this.scene = new THREE.Scene();
        this.scene.background = null;
        this.scene.fog = new THREE.FogExp2(0x16213e, 0.02);

        const container = document.getElementById('canvas-container')!;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
        this.camera.position.set(6, 4, 6);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        container.appendChild(this.renderer.domElement);

        this.setupLights();

        this.rootSystem = new RootSystem();
        this.rootRenderer = new RootRenderer(this.scene, this.rootSystem);

        this.cameraControls = new CameraControls(this.camera, this.renderer.domElement);
        this.interactionManager = new InteractionManager(
            this.camera,
            this.renderer.domElement,
            this.rootSystem,
            this.rootRenderer
        );

        this.uiController = new UIController((opacity: number) => {
            this.rootRenderer.setSliceOpacity(opacity);
        });

        this.interactionManager.setNodeSelectCallback((node) => {
            this.uiController.updateNodeInfo(node);
        });

        this.bindWindowEvents();
        this.animate();
    }

    private setupLights(): void {
        const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        const bottomLight = new THREE.PointLight(0x8B4513, 0.4, 20);
        bottomLight.position.set(0, -3, 0);
        this.scene.add(bottomLight);
    }

    private bindWindowEvents(): void {
        window.addEventListener('resize', this.onWindowResize);
    }

    private onWindowResize = (): void => {
        const container = document.getElementById('canvas-container')!;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    };

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        const deltaTime = Math.min(this.clock.getDelta(), 0.1);
        this.fpsTime += deltaTime;
        this.frameCount++;

        if (this.fpsTime >= 0.5) {
            this.currentFps = this.frameCount / this.fpsTime;
            this.frameCount = 0;
            this.fpsTime = 0;
        }

        const updateStart = performance.now();
        this.rootSystem.update(deltaTime);
        const updateEnd = performance.now();
        
        if (updateEnd - updateStart > 2) {
            console.warn(`Root update took ${(updateEnd - updateStart).toFixed(2)}ms`);
        }

        this.rootRenderer.update();
        this.cameraControls.update();

        this.uiController.updateStatus(
            this.rootSystem.getTotalRootCount(),
            this.currentFps,
            this.rootSystem.getElapsedTime()
        );

        this.renderer.render(this.scene, this.camera);
    };
}

window.addEventListener('DOMContentLoaded', () => {
    new App();
});
