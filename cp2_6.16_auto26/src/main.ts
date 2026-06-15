import * as THREE from 'three';
import { TerrainGenerator } from './scene/terrainGenerator';
import { MarkerSystem } from './ui/markerSystem';
import { OverlayPanel } from './ui/overlayPanel';
import { InteractionManager } from './interaction/interactionManager';

class App {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private container: HTMLElement;
    private terrain: TerrainGenerator;
    private markers: MarkerSystem;
    private panel: OverlayPanel;
    private interaction: InteractionManager;
    private clock: THREE.Clock;
    private animationId: number;

    constructor() {
        this.container = document.getElementById('app') as HTMLElement;
        this.clock = new THREE.Clock();
        this.animationId = 0;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x121212);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(15, 20, 15);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.addLights();

        this.terrain = new TerrainGenerator(this.scene);
        this.markers = new MarkerSystem(this.scene, this.camera, this.container);

        this.panel = new OverlayPanel(this.container, {
            onResetView: () => this.interaction.resetView(),
            onSmoothnessChange: (value: number) => this.terrain.updateSmoothness(value),
            onToggleGrid: (show: boolean) => this.terrain.toggleGrid(show),
            onExportPath: () => this.exportPath(),
            onMeasureMode: (active: boolean) => this.handleMeasureMode(active)
        }, this.markers);

        this.interaction = new InteractionManager(
            this.camera,
            this.renderer,
            this.terrain,
            this.markers,
            this.panel
        );
        this.interaction.init();

        window.addEventListener('resize', this.handleResize.bind(this));

        this.animate();
    }

    private addLights(): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    }

    private handleResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private handleMeasureMode(active: boolean): void {
        this.interaction.isMeasureMode = active;
        if (!active) {
            this.markers.clearMeasurements();
        }
    }

    private exportPath(): void {
        const data = this.markers.exportPathData();
        this.panel.downloadJSON(data, 'path-data.json');
    }

    private animate(): void {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        const deltaTime = this.clock.getDelta();
        this.interaction.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    public dispose(): void {
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize.bind(this));
        this.interaction.dispose();
        this.terrain.dispose();
        this.markers.dispose();
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
    app = new App();
});

window.addEventListener('beforeunload', () => {
    if (app) {
        app.dispose();
        app = null;
    }
});

export { App };
