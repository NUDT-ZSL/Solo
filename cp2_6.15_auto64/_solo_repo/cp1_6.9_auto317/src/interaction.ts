import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NetworkSystem, NodeData } from './network.js';

export class InteractionSystem {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private network: NetworkSystem;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private labelElement: HTMLElement;
  private container: HTMLElement;

  private hoveredNodeId: number | null = null;
  private lastInteractionTime: number = 0;
  private autoRotateEnabled: boolean = true;
  private autoRotateAngle: number = 0;
  private autoRotateTransition: number = 1;
  private AUTO_ROTATE_SPEED = 0.5;
  private IDLE_TIMEOUT = 5;
  private TRANSITION_DURATION = 1;

  private isDragging: boolean = false;
  private mouseDownPosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    network: NetworkSystem,
    container: HTMLElement
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.network = network;
    this.container = container;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.setupControls();

    const label = document.getElementById('label');
    if (!label) throw new Error('Label element not found');
    this.labelElement = label;

    this.setupEventListeners();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.6;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 80;
    this.controls.screenSpacePanning = false;
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    this.controls.target.set(0, 0, 0);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerLeave.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.controls.addEventListener('start', () => {
      this.pauseAutoRotate();
      this.isDragging = true;
    });

    this.controls.addEventListener('end', () => {
      this.lastInteractionTime = performance.now() / 1000;
      this.isDragging = false;
    });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onPointerMove(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.updateHover(event.clientX, event.clientY);
  }

  private onPointerDown(event: PointerEvent): void {
    this.mouseDownPosition = { x: event.clientX, y: event.clientY };
    this.pauseAutoRotate();
  }

  private onPointerUp(event: PointerEvent): void {
    const dx = Math.abs(event.clientX - this.mouseDownPosition.x);
    const dy = Math.abs(event.clientY - this.mouseDownPosition.y);

    if (dx < 5 && dy < 5 && event.button === 0) {
      this.handleClick();
    }

    this.lastInteractionTime = performance.now() / 1000;
  }

  private onPointerLeave(): void {
    this.clearHover();
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.pauseAutoRotate();
    this.lastInteractionTime = performance.now() / 1000;
  }

  private onResize(): void {
    // Handled in main.ts
  }

  private updateHover(clientX: number, clientY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.network.nodeMesh);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined) {
        const nodeId = instanceId;
        if (this.hoveredNodeId !== nodeId) {
          this.clearHover();
          this.hoveredNodeId = nodeId;
          this.network.setNodeHover(nodeId, true);
          this.showLabel(clientX, clientY, nodeId);
        } else {
          this.updateLabelPosition(clientX, clientY);
        }
        this.renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }

    this.clearHover();
    this.renderer.domElement.style.cursor = 'grab';
  }

  private clearHover(): void {
    if (this.hoveredNodeId !== null) {
      this.network.setNodeHover(this.hoveredNodeId, false);
      this.hoveredNodeId = null;
      this.hideLabel();
    }
  }

  private showLabel(clientX: number, clientY: number, nodeId: number): void {
    const node = this.network.getNodeByInstanceId(nodeId);
    if (!node) return;

    this.labelElement.innerHTML = this.buildLabelContent(node);
    this.labelElement.style.display = 'block';
    this.updateLabelPosition(clientX, clientY);
  }

  private buildLabelContent(node: NodeData): string {
    const x = node.position.x.toFixed(2);
    const y = node.position.y.toFixed(2);
    const z = node.position.z.toFixed(2);
    const connections = node.connections.length;
    return `
      <div><span class="coord">坐标:</span> (${x}, ${y}, ${z})</div>
      <div><span class="connections">连接数:</span> ${connections}</div>
    `;
  }

  private updateLabelPosition(clientX: number, clientY: number): void {
    const padding = 15;
    let left = clientX + padding;
    let top = clientY + padding;

    const rect = this.labelElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    if (left + rect.width > containerRect.right) {
      left = clientX - rect.width - padding;
    }
    if (top + rect.height > containerRect.bottom) {
      top = clientY - rect.height - padding;
    }

    this.labelElement.style.left = `${left}px`;
    this.labelElement.style.top = `${top}px`;
  }

  private hideLabel(): void {
    this.labelElement.style.display = 'none';
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.network.nodeMesh);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined) {
        this.network.triggerRipple(instanceId, this.scene);
        this.network.flashNode(instanceId);
      }
    }
  }

  private pauseAutoRotate(): void {
    this.autoRotateEnabled = false;
  }

  public update(deltaTime: number, elapsedTime: number, currentTime: number): void {
    this.controls.update();

    const idleTime = currentTime - this.lastInteractionTime;

    if (!this.autoRotateEnabled && idleTime > this.IDLE_TIMEOUT) {
      this.autoRotateEnabled = true;
      this.autoRotateTransition = 0;
    }

    if (this.autoRotateEnabled) {
      this.autoRotateTransition = Math.min(1, this.autoRotateTransition + deltaTime / this.TRANSITION_DURATION);
      const angleDelta = (this.AUTO_ROTATE_SPEED * Math.PI / 180) * deltaTime * this.autoRotateTransition;
      this.network.group.rotation.y += angleDelta;
    } else {
      this.autoRotateTransition = Math.max(0, this.autoRotateTransition - deltaTime / this.TRANSITION_DURATION);
    }
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public dispose(): void {
    this.controls.dispose();
  }
}
