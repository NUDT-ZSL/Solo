import * as THREE from 'three';
import type { CameraState, HoverInfo, Vector3, ClusterData, ConnectionData } from './types';
import { ParticleSystem } from './particleSystem';
import { ConnectionLines } from './connectionLines';

const MIN_ROTATION_X = -Math.PI / 6;
const MAX_ROTATION_X = Math.PI / 6;
const MIN_DISTANCE = 10;
const MAX_DISTANCE = 500;
const PAN_LIMIT = 200;
const TRANSITION_DURATION = 500;

export class InteractionManager {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private particleSystem: ParticleSystem;
  private connectionLines: ConnectionLines;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private cameraState: CameraState = {
    targetRotationX: 0,
    targetRotationY: 0,
    rotationX: 0,
    rotationY: 0,
    targetDistance: 120,
    distance: 120,
    targetPanX: 0,
    targetPanY: 0,
    panX: 0,
    panY: 0
  };

  private isLeftDragging = false;
  private isRightDragging = false;
  private isClusterDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;
  private draggedCluster: ClusterData | null = null;

  private hoverInfo: HoverInfo = {
    type: null,
    clusterId: null,
    word: null,
    connectionWords: null,
    screenX: 0,
    screenY: 0
  };

  private transitionStartTime = 0;
  private isTransitioning = false;
  private transitionStartState: CameraState | null = null;

  public onClusterClick: ((cluster: ClusterData) => void) | null = null;
  public onHoverChange: ((hover: HoverInfo) => void) | null = null;
  public onClusterDragEnd: ((cluster: ClusterData) => void) | null = null;

  constructor(
    container: HTMLElement,
    camera: THREE.PerspectiveCamera,
    particleSystem: ParticleSystem,
    connectionLines: ConnectionLines
  ) {
    this.container = container;
    this.camera = camera;
    this.particleSystem = particleSystem;
    this.connectionLines = connectionLines;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.bindEvents();
    this.updateCamera();
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.container.addEventListener('contextmenu', this.onContextMenu.bind(this));

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      const cluster = this.getClusterAtMouse(e);
      if (cluster) {
        this.isClusterDragging = true;
        this.draggedCluster = cluster;
        this.particleSystem.clickCluster(cluster.id);
        this.connectionLines.highlightConnectionsForCluster(cluster.id, true);
      } else {
        this.isLeftDragging = true;
        this.startTransition();
      }
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    } else if (e.button === 2) {
      this.isRightDragging = true;
      this.startTransition();
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    }
  }

  private startTransition(): void {
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
    this.transitionStartState = { ...this.cameraState };
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMousePosition(e);

    if (this.isClusterDragging && this.draggedCluster) {
      const newPosition = this.screenToWorld(e.clientX, e.clientY, this.draggedCluster.position.z);
      if (newPosition) {
        this.particleSystem.moveCluster(this.draggedCluster.id, newPosition);
      }
    } else if (this.isLeftDragging) {
      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;

      this.cameraState.targetRotationY -= deltaX * 0.005;
      this.cameraState.targetRotationX -= deltaY * 0.005;
      this.cameraState.targetRotationX = Math.max(
        MIN_ROTATION_X,
        Math.min(MAX_ROTATION_X, this.cameraState.targetRotationX)
      );

      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    } else if (this.isRightDragging) {
      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;

      this.cameraState.targetPanX += deltaX * 0.3;
      this.cameraState.targetPanY -= deltaY * 0.3;
      this.cameraState.targetPanX = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, this.cameraState.targetPanX));
      this.cameraState.targetPanY = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, this.cameraState.targetPanY));

      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    } else {
      this.updateHoverState(e);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      if (this.isClusterDragging && this.draggedCluster) {
        this.connectionLines.createFromClusters(this.particleSystem.getClusters());
        if (this.onClusterDragEnd) {
          this.onClusterDragEnd(this.draggedCluster);
        }
      } else if (!this.isLeftDragging) {
        const cluster = this.getClusterAtMouse(e);
        if (cluster) {
          this.particleSystem.clickCluster(cluster.id);
          if (this.onClusterClick) {
            this.onClusterClick(cluster);
          }
        }
      }

      this.isLeftDragging = false;
      this.isClusterDragging = false;
      this.draggedCluster = null;
      this.isTransitioning = false;
    } else if (e.button === 2) {
      this.isRightDragging = false;
      this.isTransitioning = false;
    }
  }

  private onMouseLeave(): void {
    this.isLeftDragging = false;
    this.isRightDragging = false;
    this.isClusterDragging = false;
    this.draggedCluster = null;
    this.isTransitioning = false;

    if (this.hoverInfo.clusterId) {
      this.particleSystem.highlightCluster(this.hoverInfo.clusterId, false);
      this.connectionLines.highlightConnectionsForCluster(this.hoverInfo.clusterId, false);
    }

    this.hoverInfo.type = null;
    this.hoverInfo.clusterId = null;
    this.hoverInfo.word = null;
    this.hoverInfo.connectionWords = null;

    if (this.onHoverChange) {
      this.onHoverChange(this.hoverInfo);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const zoomSpeed = 0.001;
    const delta = e.deltaY * zoomSpeed;

    this.cameraState.targetDistance *= (1 + delta);
    this.cameraState.targetDistance = Math.max(
      MIN_DISTANCE,
      Math.min(MAX_DISTANCE, this.cameraState.targetDistance)
    );

    this.startTransition();
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private onResize(): void {
    // handled by main app
  }

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.hoverInfo.screenX = e.clientX;
    this.hoverInfo.screenY = e.clientY;
  }

  private getClusterAtMouse(e: MouseEvent): ClusterData | null {
    this.updateMousePosition(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.particleSystem.getClusterAtPosition(this.raycaster, this.camera);
  }

  private getConnectionAtMouse(e: MouseEvent): ConnectionData | null {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return this.connectionLines.getConnectionAtScreenPosition(
      x, y,
      this.camera,
      rect.width,
      rect.height
    );
  }

  private updateHoverState(e: MouseEvent): void {
    const cluster = this.getClusterAtMouse(e);
    const connection = this.getConnectionAtMouse(e);

    if (cluster) {
      if (this.hoverInfo.clusterId !== cluster.id) {
        if (this.hoverInfo.clusterId) {
          this.particleSystem.highlightCluster(this.hoverInfo.clusterId, false);
          this.connectionLines.highlightConnectionsForCluster(this.hoverInfo.clusterId, false);
        }

        this.particleSystem.highlightCluster(cluster.id, true);
        this.connectionLines.highlightConnectionsForCluster(cluster.id, true);

        this.hoverInfo.type = 'particle';
        this.hoverInfo.clusterId = cluster.id;
        this.hoverInfo.word = cluster.word;
        this.hoverInfo.connectionWords = null;

        this.container.style.cursor = 'pointer';

        if (this.onHoverChange) {
          this.onHoverChange(this.hoverInfo);
        }
      }
    } else if (connection) {
      if (this.hoverInfo.type !== 'connection' ||
          (this.hoverInfo.connectionWords !== `${connection.fromWord}-${connection.toWord}`)) {
        if (this.hoverInfo.clusterId) {
          this.particleSystem.highlightCluster(this.hoverInfo.clusterId, false);
          this.connectionLines.highlightConnectionsForCluster(this.hoverInfo.clusterId, false);
        }

        this.connectionLines.highlightConnection(connection.fromClusterId, connection.toClusterId, true);
        this.particleSystem.highlightCluster(connection.fromClusterId, true);
        this.particleSystem.highlightCluster(connection.toClusterId, true);

        this.hoverInfo.type = 'connection';
        this.hoverInfo.clusterId = connection.fromClusterId;
        this.hoverInfo.word = null;
        this.hoverInfo.connectionWords = `${connection.fromWord} — ${connection.toWord}`;

        this.container.style.cursor = 'pointer';

        if (this.onHoverChange) {
          this.onHoverChange(this.hoverInfo);
        }
      }
    } else if (this.hoverInfo.type !== null) {
      if (this.hoverInfo.clusterId) {
        this.particleSystem.highlightCluster(this.hoverInfo.clusterId, false);
        this.connectionLines.highlightConnectionsForCluster(this.hoverInfo.clusterId, false);
      }
      if (this.hoverInfo.connectionWords) {
        const [fromWord, toWord] = this.hoverInfo.connectionWords.split(' — ');
        const clusters = this.particleSystem.getClusters();
        const fromCluster = clusters.find(c => c.word === fromWord);
        const toCluster = clusters.find(c => c.word === toWord);
        if (fromCluster && toCluster) {
          this.connectionLines.highlightConnection(fromCluster.id, toCluster.id, false);
          this.particleSystem.highlightCluster(fromCluster.id, false);
          this.particleSystem.highlightCluster(toCluster.id, false);
        }
      }

      this.hoverInfo.type = null;
      this.hoverInfo.clusterId = null;
      this.hoverInfo.word = null;
      this.hoverInfo.connectionWords = null;

      this.container.style.cursor = 'grab';

      if (this.onHoverChange) {
        this.onHoverChange(this.hoverInfo);
      }
    }
  }

  private screenToWorld(screenX: number, screenY: number, targetZ: number): Vector3 | null {
    const rect = this.container.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(this.camera);

    const dir = vector.sub(this.camera.position).normalize();
    const distance = (targetZ - this.camera.position.z) / dir.z;

    if (distance < 0) return null;

    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  public update(_deltaTime: number): void {
    const now = performance.now();
    const elapsed = now - this.transitionStartTime;
    const t = Math.min(1, elapsed / TRANSITION_DURATION);

    let smoothing: number;

    if (this.isTransitioning && this.transitionStartState) {
      const easeFactor = this.easeOut(t);
      smoothing = 0.05 + easeFactor * 0.15;
    } else {
      smoothing = 0.08;
    }

    this.cameraState.rotationX += (this.cameraState.targetRotationX - this.cameraState.rotationX) * smoothing;
    this.cameraState.rotationY += (this.cameraState.targetRotationY - this.cameraState.rotationY) * smoothing;
    this.cameraState.distance += (this.cameraState.targetDistance - this.cameraState.distance) * smoothing;
    this.cameraState.panX += (this.cameraState.targetPanX - this.cameraState.panX) * smoothing;
    this.cameraState.panY += (this.cameraState.targetPanY - this.cameraState.panY) * smoothing;

    if (t >= 1 && this.isTransitioning && !this.isLeftDragging && !this.isRightDragging) {
      this.isTransitioning = false;
    }

    this.updateCamera();
  }

  private updateCamera(): void {
    const { rotationX, rotationY, distance, panX, panY } = this.cameraState;

    const x = Math.sin(rotationY) * Math.cos(rotationX) * distance + panX;
    const y = Math.sin(rotationX) * distance + panY;
    const z = Math.cos(rotationY) * Math.cos(rotationX) * distance;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(panX, panY, 0);
  }

  public resetView(): void {
    this.startTransition();
    this.cameraState.targetRotationX = 0;
    this.cameraState.targetRotationY = 0;
    this.cameraState.targetDistance = 120;
    this.cameraState.targetPanX = 0;
    this.cameraState.targetPanY = 0;
  }

  public getCameraState(): CameraState {
    return { ...this.cameraState };
  }

  public setCameraState(state: Partial<CameraState>): void {
    if (state.targetRotationX !== undefined) {
      this.cameraState.targetRotationX = state.targetRotationX;
      this.cameraState.rotationX = state.targetRotationX;
    }
    if (state.targetRotationY !== undefined) {
      this.cameraState.targetRotationY = state.targetRotationY;
      this.cameraState.rotationY = state.targetRotationY;
    }
    if (state.targetDistance !== undefined) {
      this.cameraState.targetDistance = state.targetDistance;
      this.cameraState.distance = state.targetDistance;
    }
    if (state.targetPanX !== undefined) {
      this.cameraState.targetPanX = state.targetPanX;
      this.cameraState.panX = state.targetPanX;
    }
    if (state.targetPanY !== undefined) {
      this.cameraState.targetPanY = state.targetPanY;
      this.cameraState.panY = state.targetPanY;
    }
  }

  public getHoverInfo(): HoverInfo {
    return { ...this.hoverInfo };
  }

  public dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.container.removeEventListener('wheel', this.onWheel.bind(this));
    this.container.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
