import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainGenerator, TerrainConfig } from './terrain';
import {
  AnnotationParser,
  AnnotationRenderer,
  ParsedAnnotations,
  AnnotationData,
  AnnotationStyle,
  COLOR_PALETTE
} from './annotation';
import { MeasureTool, MeasureRecord } from './measure';

interface AppState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  terrainGenerator: TerrainGenerator;
  terrainGroup: THREE.Group | null;
  terrainMesh: THREE.Mesh | null;
  annotationParser: AnnotationParser;
  annotationRenderer: AnnotationRenderer | null;
  annotationGroups: Map<string, THREE.Group>;
  parsedFiles: ParsedAnnotations[];
  measureTool: MeasureTool;
  selectedAnnotationId: string | null;
  clock: THREE.Clock;
}

let state: AppState;

init();

function init(): void {
  const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  state = createAppState(canvas);
  setupLights(state.scene);
  setupTerrain();
  setupMeasureTool();
  setupEventListeners(canvas);
  setupUI();
  animate();
}

function createAppState(canvas: HTMLCanvasElement): AppState {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0F172A');

  const camera = new THREE.PerspectiveCamera(
    60,
    1,
    0.1,
    1000
  );
  camera.position.set(12, 14, 12);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  };
  controls.keys = {
    LEFT: 'ShiftLeft',
    UP: 'ArrowUp',
    RIGHT: 'ArrowRight',
    BOTTOM: 'ArrowDown'
  };
  controls.minDistance = 2;
  controls.maxDistance = 30;
  controls.target.set(0, 1, 0);
  controls.update();

  const terrainGenerator = new TerrainGenerator({
    size: 16,
    segments: 64,
    amplitude: 3,
    enableLOD: true
  });

  const annotationParser = new AnnotationParser();

  const measureTool = new MeasureTool(scene, camera, (x, z) => terrainGenerator.getHeightAt(x, z));

  return {
    scene,
    camera,
    renderer,
    controls,
    terrainGenerator,
    terrainGroup: null,
    terrainMesh: null,
    annotationParser,
    annotationRenderer: null,
    annotationGroups: new Map(),
    parsedFiles: [],
    measureTool,
    selectedAnnotationId: null,
    clock: new THREE.Clock()
  };
}

function setupLights(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(10, 18, 8);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 60;
  directionalLight.shadow.camera.left = -16;
  directionalLight.shadow.camera.right = 16;
  directionalLight.shadow.camera.top = 16;
  directionalLight.shadow.camera.bottom = -16;
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0x8899ff, 0.25);
  fillLight.position.set(-8, 12, -10);
  scene.add(fillLight);

  const hemiLight = new THREE.HemisphereLight(0x6699ff, 0x446644, 0.3);
  scene.add(hemiLight);
}

function setupTerrain(): void {
  if (state.terrainGroup) {
    state.scene.remove(state.terrainGroup);
    state.terrainGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat?.dispose();
        }
      }
    });
  }

  state.terrainGroup = state.terrainGenerator.createMesh();
  state.scene.add(state.terrainGroup);

  let terrainMesh: THREE.Mesh | null = null;
  const terrainLOD = (state.terrainGroup as any).terrainLOD as THREE.LOD | undefined;
  if (terrainLOD && terrainLOD.levels.length > 0) {
    terrainMesh = terrainLOD.levels[0].object as THREE.Mesh;
  } else {
    const found = state.terrainGroup.children.find(
      (c) => (c as THREE.Mesh).userData?.type === 'terrain'
    ) as THREE.Mesh | undefined;
    terrainMesh = found || null;
  }
  state.terrainMesh = terrainMesh;
  state.measureTool.setTerrainMesh(state.terrainMesh || state.terrainGroup);

  setupAnnotationRenderer();
}

function setupAnnotationRenderer(): void {
  const oldGroups = state.annotationGroups;
  oldGroups.forEach((g) => state.scene.remove(g));

  state.annotationRenderer = new AnnotationRenderer({
    getTerrainHeight: (x, z) => state.terrainGenerator.getHeightAt(x, z),
    terrainSize: state.terrainGenerator['config'].size
  });

  state.parsedFiles.forEach((parsed) => {
    const group = state.annotationRenderer!.createAnnotationGroup(parsed);
    state.annotationGroups.set(parsed.fileName, group);
    state.scene.add(group);
  });
}

function setupMeasureTool(): void {
  state.measureTool.setOnRecordUpdate((records: MeasureRecord[]) => {
    renderMeasureResults(records);
  });
}

function setupEventListeners(canvas: HTMLCanvasElement): void {
  window.addEventListener('resize', () => handleResize(canvas));
  handleResize(canvas);

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      const dragHandled = state.measureTool.handleMouseDown(e, canvas);
      if (dragHandled) {
        state.controls.enabled = false;
      } else if (state.measureTool.getIsActive()) {
        state.controls.enabled = false;
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const moveHandled = state.measureTool.handleMouseMove(e, canvas);
    if (moveHandled && state.measureTool.getIsDragging()) {
      state.controls.enabled = false;
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      const upHandled = state.measureTool.handleMouseUp();
      state.controls.enabled = true;
    }
  });

  canvas.addEventListener('click', (e) => {
    if (e.button !== 0) return;
    if (state.measureTool.getIsActive() && !state.measureTool.getIsDragging()) {
      const placed = state.measureTool.handleClick(e, canvas);
      if (placed && state.measureTool.getPlaceCount() === 2) {
        state.measureTool.updateLabel();
      }
    } else if (!state.measureTool.getIsActive()) {
      handleAnnotationClick(e, canvas);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && state.measureTool.getIsActive()) {
      state.measureTool.recordMeasurement();
    }
    if (e.key === 'Escape' && state.measureTool.getIsActive()) {
      toggleMeasureMode(false);
    }
  });
}

function handleResize(canvas: HTMLCanvasElement): void {
  const container = document.getElementById('scene-container')!;
  const width = container.clientWidth;
  const height = container.clientHeight;

  state.renderer.setSize(width, height, false);
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
}

function handleAnnotationClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, state.camera);

  const annotationMeshes: THREE.Object3D[] = [];
  state.annotationGroups.forEach((g) => {
    g.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        annotationMeshes.push(obj);
      }
    });
  });

  const intersects = raycaster.intersectObjects(annotationMeshes, false);
  if (intersects.length > 0) {
    let obj: THREE.Object3D | null = intersects[0].object;
    let annotationId: string | null = null;
    while (obj) {
      if (obj.userData?.annotationId) {
        annotationId = obj.userData.annotationId;
        break;
      }
      obj = obj.parent;
    }
    if (annotationId) {
      selectAnnotation(annotationId);
    }
  } else {
    selectAnnotation(null);
  }
}

function setupUI(): void {
  setupFileUpload();
  setupTerrainControls();
  setupMeasureButtons();
}

function setupFileUpload(): void {
  const dropZone = document.getElementById('drop-zone')!;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer?.files || []);
    handleFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    handleFiles(files);
    fileInput.value = '';
  });
}

async function handleFiles(files: File[]): Promise<void> {
  const validFiles = files.filter((f) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    return ext === 'kml' || ext === 'kmz';
  });

  for (const file of validFiles) {
    try {
      const parsed = await state.annotationParser.parseFile(file);
      addParsedAnnotations(parsed);
    } catch (err) {
      alert(`解析文件 ${file.name} 失败: ${(err as Error).message}`);
    }
  }
}

function addParsedAnnotations(parsed: ParsedAnnotations): void {
  if (parsed.points.length === 0 && parsed.lines.length === 0 && parsed.polygons.length === 0) {
    alert(`文件 ${parsed.fileName} 中未找到有效的地理要素`);
    return;
  }

  const existing = state.parsedFiles.findIndex((p) => p.fileName === parsed.fileName);
  if (existing !== -1) {
    state.parsedFiles.splice(existing, 1);
    const oldGroup = state.annotationGroups.get(parsed.fileName);
    if (oldGroup) {
      state.scene.remove(oldGroup);
      state.annotationGroups.delete(parsed.fileName);
    }
  }

  state.parsedFiles.push(parsed);

  if (!state.annotationRenderer) {
    setupAnnotationRenderer();
  }

  const group = state.annotationRenderer!.createAnnotationGroup(parsed);
  state.annotationGroups.set(parsed.fileName, group);
  state.scene.add(group);

  renderAnnotationTree();
}

function renderAnnotationTree(): void {
  const tree = document.getElementById('annotation-tree')!;
  tree.innerHTML = '';

  if (state.parsedFiles.length === 0) {
    tree.innerHTML = '<p class="empty-hint">暂无要素，请加载KML/KMZ文件</p>';
    return;
  }

  state.parsedFiles.forEach((parsed, fileIdx) => {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const parent = document.createElement('div');
    parent.className = 'tree-parent';
    parent.innerHTML = `
      <span class="tree-toggle">▼</span>
      <span class="tree-icon">📄</span>
      <span class="tree-label" title="${parsed.fileName}">${parsed.fileName}</span>
    `;
    node.appendChild(parent);

    const children = document.createElement('div');
    children.className = 'tree-children';

    if (parsed.points.length > 0) {
      const pointGroup = createFeatureGroup('📍 地标点', parsed.points, 'point');
      children.appendChild(pointGroup);
    }
    if (parsed.lines.length > 0) {
      const lineGroup = createFeatureGroup('📏 路径线', parsed.lines, 'line');
      children.appendChild(lineGroup);
    }
    if (parsed.polygons.length > 0) {
      const polyGroup = createFeatureGroup('📐 区域面', parsed.polygons, 'polygon');
      children.appendChild(polyGroup);
    }

    node.appendChild(children);
    tree.appendChild(node);

    parent.addEventListener('click', () => {
      const toggle = parent.querySelector('.tree-toggle')!;
      const isCollapsed = children.classList.toggle('collapsed');
      toggle.classList.toggle('collapsed', isCollapsed);
    });
  });
}

function createFeatureGroup(
  title: string,
  items: AnnotationData[],
  type: 'point' | 'line' | 'polygon'
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '4px';

  const header = document.createElement('div');
  header.className = 'tree-parent';
  header.style.paddingLeft = '8px';
  header.innerHTML = `
    <span class="tree-toggle">▼</span>
    <span class="tree-label" style="font-weight: bold;">${title} (${items.length})</span>
  `;
  wrapper.appendChild(header);

  const list = document.createElement('div');
  list.className = 'tree-children';
  list.style.paddingLeft = '16px';

  items.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'tree-child';
    el.dataset.id = item.id;
    if (item.id === state.selectedAnnotationId) {
      el.classList.add('selected');
    }
    const icon = type === 'point' ? '●' : type === 'line' ? '━' : '■';
    el.innerHTML = `
      <span class="tree-icon" style="color: ${item.style.color}">${icon}</span>
      <span class="tree-label" title="${item.name}">${item.name}</span>
    `;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectAnnotation(item.id);
    });
    list.appendChild(el);
  });

  wrapper.appendChild(list);

  header.addEventListener('click', (e) => {
    e.stopPropagation();
    const toggle = header.querySelector('.tree-toggle')!;
    const isCollapsed = list.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed', isCollapsed);
  });

  return wrapper;
}

function selectAnnotation(id: string | null): void {
  state.selectedAnnotationId = id;

  document.querySelectorAll('.tree-child').forEach((el) => {
    const childEl = el as HTMLElement;
    if (childEl.dataset.id === id) {
      childEl.classList.add('selected');
      childEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      childEl.classList.remove('selected');
    }
  });

  renderPropertiesPanel();
}

function renderPropertiesPanel(): void {
  const panel = document.getElementById('properties-panel')!;

  if (!state.selectedAnnotationId || !state.annotationRenderer) {
    panel.innerHTML = '<p class="empty-hint">选择要素以编辑属性</p>';
    return;
  }

  const data = state.annotationRenderer.getDataById(state.selectedAnnotationId);
  if (!data) {
    panel.innerHTML = '<p class="empty-hint">选择要素以编辑属性</p>';
    return;
  }

  const typeLabel =
    (data as any).coordinates && !Array.isArray((data as any).coordinates[0])
      ? '地标点'
      : data.style.fillColor
      ? '区域多边形'
      : '路径折线';

  const coordCount = Array.isArray((data as any).coordinates[0])
    ? (data as any).coordinates.length
    : 1;

  panel.innerHTML = `
    <div class="prop-group">
      <span class="prop-label">名称</span>
      <div class="prop-value">${escapeHtml(data.name) || '(无名称)'}</div>
    </div>
    <div class="prop-group">
      <span class="prop-label">类型</span>
      <div class="prop-value">${typeLabel}</div>
    </div>
    <div class="prop-group">
      <span class="prop-label">坐标数量</span>
      <div class="prop-value">${coordCount}</div>
    </div>
    ${data.description ? `
    <div class="prop-group">
      <span class="prop-label">描述</span>
      <div class="prop-value">${escapeHtml(data.description)}</div>
    </div>` : ''}
    <div class="prop-group">
      <span class="prop-label">透明度 <span class="slider-value" id="opacity-val">${data.style.opacity.toFixed(2)}</span></span>
      <input type="range" id="opacity-slider" class="prop-slider" min="0" max="1" step="0.01" value="${data.style.opacity}" />
    </div>
    ${data.style.lineWidth !== undefined ? `
    <div class="prop-group">
      <span class="prop-label">线宽 <span class="slider-value" id="linewidth-val">${data.style.lineWidth.toFixed(3)}</span></span>
      <input type="range" id="linewidth-slider" class="prop-slider" min="0.02" max="0.2" step="0.005" value="${data.style.lineWidth}" />
    </div>` : ''}
    <div class="prop-group">
      <span class="prop-label">${data.style.fillColor ? '边框颜色' : '颜色'}</span>
      <div class="color-palette" id="color-palette">
        ${COLOR_PALETTE.map((c) => `
          <div class="color-swatch ${c === data.style.color.toUpperCase() ? 'selected' : ''}" 
               style="background: ${c};" 
               data-color="${c}"></div>
        `).join('')}
      </div>
    </div>
    ${data.style.fillColor ? `
    <div class="prop-group">
      <span class="prop-label">填充颜色</span>
      <div class="color-palette" id="fill-palette">
        ${COLOR_PALETTE.map((c) => `
          <div class="color-swatch ${c === (data.style.fillColor || '').toUpperCase() ? 'selected' : ''}" 
               style="background: ${c};" 
               data-color="${c}"></div>
        `).join('')}
      </div>
    </div>` : ''}
  `;

  const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
  const opacityVal = document.getElementById('opacity-val');
  opacitySlider?.addEventListener('input', () => {
    const v = parseFloat(opacitySlider.value);
    opacityVal!.textContent = v.toFixed(2);
    updateAnnotationStyle({ opacity: v });
  });

  const linewidthSlider = document.getElementById('linewidth-slider') as HTMLInputElement;
  const linewidthVal = document.getElementById('linewidth-val');
  linewidthSlider?.addEventListener('input', () => {
    const v = parseFloat(linewidthSlider.value);
    linewidthVal!.textContent = v.toFixed(3);
    updateAnnotationStyle({ lineWidth: v });
  });

  document.querySelectorAll('#color-palette .color-swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      const color = (sw as HTMLElement).dataset.color!;
      updateAnnotationStyle({ color });
      document.querySelectorAll('#color-palette .color-swatch').forEach((s) => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
  });

  document.querySelectorAll('#fill-palette .color-swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      const color = (sw as HTMLElement).dataset.color!;
      updateAnnotationStyle({ fillColor: color });
      document.querySelectorAll('#fill-palette .color-swatch').forEach((s) => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
  });
}

function updateAnnotationStyle(updates: Partial<AnnotationStyle>): void {
  if (!state.selectedAnnotationId || !state.annotationRenderer) return;
  state.annotationRenderer.updateStyle(state.selectedAnnotationId, updates);
  renderAnnotationTree();
}

function renderMeasureResults(records: MeasureRecord[]): void {
  const list = document.getElementById('results-list')!;
  const count = document.getElementById('results-count')!;
  count.textContent = `${records.length}/50`;

  list.innerHTML = '';
  if (records.length === 0) {
    list.innerHTML = '<p class="empty-hint" style="font-size: 11px; padding: 8px;">暂无测量记录</p>';
    return;
  }

  records.slice().reverse().forEach((r, idx) => {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `
      <span><span class="result-idx">#${records.length - idx}</span><span>${new Date(r.timestamp).toLocaleTimeString()}</span></span>
      <span class="result-distance">${r.distance.toFixed(2)} 单位</span>
      <button class="result-delete" title="删除">×</button>
    `;
    item.querySelector('.result-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.measureTool.deleteRecord(r.id);
    });
    list.appendChild(item);
  });
}

function setupTerrainControls(): void {
  const amplitudeSlider = document.getElementById('amplitude-slider') as HTMLInputElement;
  const amplitudeValue = document.getElementById('amplitude-value')!;
  const subdivisionSlider = document.getElementById('subdivision-slider') as HTMLInputElement;
  const subdivisionValue = document.getElementById('subdivision-value')!;

  let amplitudeTimer: ReturnType<typeof setTimeout> | null = null;
  let subdivisionTimer: ReturnType<typeof setTimeout> | null = null;

  amplitudeSlider.addEventListener('input', () => {
    const v = parseFloat(amplitudeSlider.value);
    amplitudeValue.textContent = v.toFixed(1);
    if (amplitudeTimer) clearTimeout(amplitudeTimer);
    amplitudeTimer = setTimeout(() => {
      state.terrainGenerator.updateConfig({ amplitude: v });
      setupTerrain();
    }, 50);
  });

  subdivisionSlider.addEventListener('input', () => {
    const v = parseInt(subdivisionSlider.value);
    subdivisionValue.textContent = v.toString();
    if (subdivisionTimer) clearTimeout(subdivisionTimer);
    subdivisionTimer = setTimeout(() => {
      state.terrainGenerator.updateConfig({ segments: v });
      setupTerrain();
    }, 100);
  });
}

function setupMeasureButtons(): void {
  const measureBtn = document.getElementById('measure-btn')!;
  const resetMeasureBtn = document.getElementById('reset-measure-btn')!;

  measureBtn.addEventListener('click', () => {
    const active = state.measureTool.getIsActive();
    toggleMeasureMode(!active);
  });

  resetMeasureBtn.addEventListener('click', () => {
    state.measureTool.clearMarkers();
    state.measureTool.clearAllRecords();
    if (state.measureTool.getIsActive()) {
      state.measureTool.activate();
    }
  });
}

function toggleMeasureMode(active: boolean): void {
  const measureBtn = document.getElementById('measure-btn')!;
  if (active) {
    state.measureTool.activate();
    measureBtn.classList.add('active');
    selectAnnotation(null);
    document.body.style.cursor = 'crosshair';
  } else {
    state.measureTool.deactivate();
    state.measureTool.clearMarkers();
    measureBtn.classList.remove('active');
    document.body.style.cursor = '';
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = state.clock.getDelta();

  state.controls.update();
  state.measureTool.update();

  if (state.terrainGroup) {
    const terrainLOD = (state.terrainGroup as any).terrainLOD as THREE.LOD | undefined;
    if (terrainLOD) {
      terrainLOD.update(state.camera);
    }
  }

  state.renderer.render(state.scene, state.camera);
}
