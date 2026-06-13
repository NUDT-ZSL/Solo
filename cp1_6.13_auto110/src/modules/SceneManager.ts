import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NodeData, EdgeData, NodeType, NODE_COLORS } from '@/types';
import { easeInOutCubic, lerpVector3 } from '@/utils/easing';

interface SceneManagerOptions {
  container: HTMLElement;
  onNodeClick?: (node: NodeData | null) => void;
  onNodeHover?: (node: NodeData | null) => void;
}

interface NodeMesh extends THREE.Mesh {
  userData: {
    nodeData: NodeData;
    baseScale: number;
    isHovered: boolean;
    isSelected: boolean;
    halo?: THREE.Mesh;
  };
}

interface EdgeMesh extends THREE.Mesh {
  userData: {
    edgeData: EdgeData;
    sourceNode: NodeData;
    targetNode: NodeData;
    isHighlighted: boolean;
  };
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private nodeMeshes: Map<string, NodeMesh> = new Map();
  private edgeMeshes: Map<string, EdgeMesh> = new Map();
  private nodes: NodeData[] = [];
  private edges: EdgeData[] = [];

  private selectedNodeId: string | null = null;
  private hoveredNodeId: string | null = null;
  private hiddenTypes: Set<NodeType> = new Set();
  private searchFilter: string = '';

  private animationFrameId: number | null = null;
  private clock: THREE.Clock;
  private isAnimatingCamera: boolean = false;

  private onNodeClick?: (node: NodeData | null) => void;
  private onNodeHover?: (node: NodeData | null) => void;

  constructor(options: SceneManagerOptions) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      options.container.clientWidth / options.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(options.container.clientWidth, options.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    options.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;
    this.controls.target.set(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.onNodeClick = options.onNodeClick;
    this.onNodeHover = options.onNodeHover;

    this.setupLighting();
    this.setupGrid();
    this.setupEventListeners(options.container);
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6366f1, 0.5, 50);
    pointLight.position.set(-10, 10, -10);
    this.scene.add(pointLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(40, 40, 0x1e293b, 0x1e293b);
    const gridMaterial = gridHelper.material as THREE.Material;
    gridMaterial.opacity = 0.5;
    gridMaterial.transparent = true;
    this.scene.add(gridHelper);
  }

  private setupEventListeners(container: HTMLElement): void {
    container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    container.addEventListener('click', this.handleClick.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.checkHover();
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.checkClick();
  }

  private handleResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.nodeMeshes.values()).filter(m => m.visible)
    );

    if (intersects.length > 0) {
      const nodeMesh = intersects[0].object as NodeMesh;
      if (this.hoveredNodeId !== nodeMesh.userData.nodeData.id) {
        this.setHoveredNode(nodeMesh.userData.nodeData.id);
      }
    } else if (this.hoveredNodeId !== null) {
      this.setHoveredNode(null);
    }
  }

  private checkClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.nodeMeshes.values()).filter(m => m.visible)
    );

    if (intersects.length > 0) {
      const nodeMesh = intersects[0].object as NodeMesh;
      this.setSelectedNode(nodeMesh.userData.nodeData.id);
    } else {
      this.setSelectedNode(null);
    }
  }

  private setHoveredNode(nodeId: string | null): void {
    if (this.hoveredNodeId === nodeId) return;

    if (this.hoveredNodeId !== null) {
      const prevMesh = this.nodeMeshes.get(this.hoveredNodeId);
      if (prevMesh) {
        prevMesh.userData.isHovered = false;
        this.updateNodeVisuals(prevMesh);
      }
    }

    this.hoveredNodeId = nodeId;

    if (nodeId !== null) {
      const mesh = this.nodeMeshes.get(nodeId);
      if (mesh) {
        mesh.userData.isHovered = true;
        this.updateNodeVisuals(mesh);
      }
    }

    const nodeData = nodeId ? this.nodes.find(n => n.id === nodeId) || null : null;
    this.onNodeHover?.(nodeData);
  }

  private setSelectedNode(nodeId: string | null): void {
    if (this.selectedNodeId === nodeId) return;

    if (this.selectedNodeId !== null) {
      const prevMesh = this.nodeMeshes.get(this.selectedNodeId);
      if (prevMesh) {
        prevMesh.userData.isSelected = false;
        this.updateNodeVisuals(prevMesh);
      }
    }

    this.selectedNodeId = nodeId;

    if (nodeId !== null) {
      const mesh = this.nodeMeshes.get(nodeId);
      if (mesh) {
        mesh.userData.isSelected = true;
        this.updateNodeVisuals(mesh);
      }
    }

    this.updateEdgeVisuals();

    const nodeData = nodeId ? this.nodes.find(n => n.id === nodeId) || null : null;
    this.onNodeClick?.(nodeData);
  }

  private updateNodeVisuals(mesh: NodeMesh): void {
    let targetScale = mesh.userData.baseScale;

    if (mesh.userData.isSelected) {
      targetScale *= 1.5;
    } else if (mesh.userData.isHovered) {
      targetScale *= 1.3;
    }

    mesh.scale.setScalar(targetScale);

    if (mesh.userData.halo) {
      mesh.userData.halo.visible = mesh.userData.isHovered || mesh.userData.isSelected;
    }
  }

  private updateEdgeVisuals(): void {
    const selectedNode = this.selectedNodeId
      ? this.nodes.find(n => n.id === this.selectedNodeId)
      : null;

    const connectedEdgeIds = new Set<string>();
    if (selectedNode) {
      this.edges.forEach(edge => {
        if (edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id) {
          connectedEdgeIds.add(edge.id);
        }
      });
    }

    this.edgeMeshes.forEach((edgeMesh, edgeId) => {
      const material = edgeMesh.material as THREE.MeshStandardMaterial;

      if (this.hiddenTypes.size > 0) {
        const sourceType = edgeMesh.userData.sourceNode.type;
        const targetType = edgeMesh.userData.targetNode.type;
        if (this.hiddenTypes.has(sourceType) || this.hiddenTypes.has(targetType)) {
          edgeMesh.visible = false;
          return;
        }
      }

      edgeMesh.visible = true;

      if (selectedNode) {
        if (connectedEdgeIds.has(edgeId)) {
          material.opacity = 1;
          material.emissiveIntensity = 0.5;
        } else {
          material.opacity = 0.15;
          material.emissiveIntensity = 0;
        }
      } else {
        material.opacity = 0.8;
        material.emissiveIntensity = 0;
      }
    });
  }

  setData(nodes: NodeData[], edges: EdgeData[]): void {
    this.nodes = nodes;
    this.edges = edges;
    this.clearScene();
    this.createNodes();
    this.createEdges();
    this.applyFilters();
  }

  private clearScene(): void {
    this.nodeMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      if (mesh.userData.halo) {
        this.scene.remove(mesh.userData.halo);
      }
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.edgeMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.nodeMeshes.clear();
    this.edgeMeshes.clear();
    this.selectedNodeId = null;
    this.hoveredNodeId = null;
  }

  private createNodes(): void {
    this.nodes.forEach(node => {
      const geometry = new THREE.SphereGeometry(node.radius, 32, 32);
      const color = new THREE.Color(NODE_COLORS[node.type]);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.3,
        roughness: 0.4,
        emissive: color,
        emissiveIntensity: 0.1
      });

      const mesh = new THREE.Mesh(geometry, material) as NodeMesh;
      mesh.position.set(node.position.x, node.position.y, node.position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        nodeData: node,
        baseScale: 1,
        isHovered: false,
        isSelected: false
      };

      const haloGeometry = new THREE.SphereGeometry(node.radius * 1.5, 32, 32);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      mesh.add(halo);
      mesh.userData.halo = halo;
      halo.visible = false;

      this.scene.add(mesh);
      this.nodeMeshes.set(node.id, mesh);
    });
  }

  private createEdges(): void {
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.find(n => n.id === edge.sourceId);
      const targetNode = this.nodes.find(n => n.id === edge.targetId);

      if (!sourceNode || !targetNode) return;

      const start = new THREE.Vector3(
        sourceNode.position.x,
        sourceNode.position.y,
        sourceNode.position.z
      );
      const end = new THREE.Vector3(
        targetNode.position.x,
        targetNode.position.y,
        targetNode.position.z
      );

      const direction = end.clone().sub(start).normalize();
      const length = start.distanceTo(end);
      const midpoint = start.clone().add(end).multiplyScalar(0.5);

      const geometry = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
      geometry.rotateX(Math.PI / 2);

      const sourceColor = new THREE.Color(NODE_COLORS[sourceNode.type]);
      const targetColor = new THREE.Color(NODE_COLORS[targetNode.type]);
      const gradientColor = sourceColor.clone().lerp(targetColor, 0.5);

      const material = new THREE.MeshStandardMaterial({
        color: gradientColor,
        transparent: true,
        opacity: 0.8,
        emissive: gradientColor,
        emissiveIntensity: 0
      });

      const mesh = new THREE.Mesh(geometry, material) as EdgeMesh;
      mesh.position.copy(midpoint);
      mesh.lookAt(end);
      mesh.userData = {
        edgeData: edge,
        sourceNode,
        targetNode,
        isHighlighted: false
      };

      this.scene.add(mesh);
      this.edgeMeshes.set(edge.id, mesh);
    });
  }

  setHiddenTypes(types: NodeType[]): void {
    this.hiddenTypes = new Set(types);
    this.applyFilters();
  }

  setSearchFilter(filter: string): void {
    this.searchFilter = filter.toLowerCase();
    this.applyFilters();
  }

  private applyFilters(): void {
    this.nodeMeshes.forEach((mesh, nodeId) => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;

      const isTypeHidden = this.hiddenTypes.has(node.type);
      const matchesSearch = this.searchFilter === '' ||
        node.name.toLowerCase().includes(this.searchFilter);

      mesh.visible = !isTypeHidden && matchesSearch;
    });

    this.updateEdgeVisuals();
  }

  resetLayout(): void {
    this.nodeMeshes.forEach((mesh, nodeId) => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;

      mesh.position.set(
        node.initialPosition.x,
        node.initialPosition.y,
        node.initialPosition.z
      );
    });

    this.edgeMeshes.forEach(mesh => {
      const { sourceNode, targetNode } = mesh.userData;
      const start = new THREE.Vector3(
        sourceNode.initialPosition.x,
        sourceNode.initialPosition.y,
        sourceNode.initialPosition.z
      );
      const end = new THREE.Vector3(
        targetNode.initialPosition.x,
        targetNode.initialPosition.y,
        targetNode.initialPosition.z
      );

      const length = start.distanceTo(end);
      const midpoint = start.clone().add(end).multiplyScalar(0.5);

      mesh.position.copy(midpoint);
      mesh.lookAt(end);
      mesh.scale.z = length / ((mesh.geometry as THREE.CylinderGeometry).parameters.height || 1);
    });
  }

  focusOnNode(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    const mesh = this.nodeMeshes.get(nodeId);

    if (!node || !mesh) return;

    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();

    const targetPosition = new THREE.Vector3()
      .copy(mesh.position)
      .add(direction.multiplyScalar(3));

    this.animateCamera(targetPosition, mesh.position.clone(), 1500);
  }

  private animateCamera(
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    duration: number
  ): void {
    if (this.isAnimatingCamera) return;

    this.isAnimatingCamera = true;
    this.controls.enabled = false;

    const startPosition = this.camera.position.clone();
    const startLookAt = this.controls.target.clone();
    const startTime = performance.now();

    const animateStep = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      const newPosition = lerpVector3(
        { x: startPosition.x, y: startPosition.y, z: startPosition.z },
        { x: targetPosition.x, y: targetPosition.y, z: targetPosition.z },
        easedProgress
      );

      const newLookAt = lerpVector3(
        { x: startLookAt.x, y: startLookAt.y, z: startLookAt.z },
        { x: targetLookAt.x, y: targetLookAt.y, z: targetLookAt.z },
        easedProgress
      );

      this.camera.position.set(newPosition.x, newPosition.y, newPosition.z);
      this.controls.target.set(newLookAt.x, newLookAt.y, newLookAt.z);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateStep);
      } else {
        this.isAnimatingCamera = false;
        this.controls.enabled = true;
      }
    };

    animateStep();
  }

  getSelectedNode(): NodeData | null {
    return this.selectedNodeId
      ? this.nodes.find(n => n.id === this.selectedNodeId) || null
      : null;
  }

  getNodeConnections(nodeId: string): number {
    return this.edges.filter(
      e => e.sourceId === nodeId || e.targetId === nodeId
    ).length;
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const elapsed = this.clock.getElapsedTime();

    this.nodeMeshes.forEach(mesh => {
      if (mesh.userData.halo && mesh.userData.halo.visible) {
        const pulse = 1 + Math.sin(elapsed * Math.PI * 2) * 0.1;
        mesh.userData.halo.scale.setScalar(pulse);
        const haloMaterial = mesh.userData.halo.material as THREE.MeshBasicMaterial;
        haloMaterial.opacity = 0.2 + Math.sin(elapsed * Math.PI * 2) * 0.1;
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize.bind(this));

    this.clearScene();
    this.renderer.dispose();
    this.controls.dispose();
  }
}
