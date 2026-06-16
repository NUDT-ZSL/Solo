import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ArtifactData, ArtifactType, ArtifactEra, ArtifactMaterial } from '../moduleA/artifact';
import { ExcavationRecord, DataLogger } from './dataLogger';

const ARTIFACT_TYPES: ArtifactType[] = ['陶片', '骨器', '青铜器碎片', '石器'];
const ARTIFACT_ERAS: ArtifactEra[] = ['新石器时代', '商周', '汉唐', '宋元'];
const ARTIFACT_MATERIALS: ArtifactMaterial[] = ['陶土', '骨质', '青铜', '石料'];

const TYPE_TO_COLOR: Record<ArtifactType, number> = {
  '陶片': 0xB71C1C,
  '骨器': 0xD7CCC8,
  '青铜器碎片': 0x8D6E63,
  '石器': 0x9E9E9E
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

function lerpColor(hex1: string, hex2: string, t: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export class UIManager {
  private dataLogger: DataLogger;
  private container: HTMLElement;
  private identificationPanel: HTMLDivElement | null = null;
  private achievementPopup: HTMLDivElement | null = null;
  private sidebar: HTMLDivElement | null = null;
  private scoreDisplay: HTMLDivElement | null = null;
  private progressRing: HTMLDivElement | null = null;
  private previewScene: THREE.Scene | null = null;
  private previewCamera: THREE.PerspectiveCamera | null = null;
  private previewRenderer: THREE.WebGLRenderer | null = null;
  private previewControls: OrbitControls | null = null;
  private previewArtifact: THREE.Group | null = null;
  private currentArtifact: ArtifactData | null = null;
  private onSubmitCallback: ((type: ArtifactType, era: ArtifactEra, material: ArtifactMaterial) => void) | null = null;
  private sidebarCollapsed: boolean = false;
  private selectedType: ArtifactType = ARTIFACT_TYPES[0];
  private selectedEra: ArtifactEra = ARTIFACT_ERAS[0];
  private selectedMaterial: ArtifactMaterial = ARTIFACT_MATERIALS[0];
  private digRateDisplay: HTMLSpanElement | null = null;
  private artifactCountDisplay: HTMLSpanElement | null = null;

  constructor(dataLogger: DataLogger, containerId: string) {
    this.dataLogger = dataLogger;
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;

    this.createScoreDisplay();
    this.createSidebar();
    this.createProgressRing();
    this.setupEventListeners();
  }

  private createScoreDisplay(): void {
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
    `;

    const scoreBox = document.createElement('div');
    scoreBox.style.cssText = `
      background: rgba(255, 248, 225, 0.9);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(215, 204, 200, 0.5);
      border-radius: 16px;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    `;

    const scoreLabel = document.createElement('span');
    scoreLabel.textContent = '积分';
    scoreLabel.style.cssText = `
      font-size: 14px;
      color: #2E7D32;
      font-weight: 500;
    `;

    const scoreValue = document.createElement('span');
    scoreValue.id = 'score-value';
    scoreValue.textContent = '0';
    scoreValue.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: #2E7D32;
      font-family: 'Segoe UI', sans-serif;
      min-width: 60px;
      text-align: right;
      transition: transform 0.1s ease;
    `;

    scoreBox.appendChild(scoreLabel);
    scoreBox.appendChild(scoreValue);

    const statsBox = document.createElement('div');
    statsBox.style.cssText = `
      background: rgba(255, 248, 225, 0.9);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(215, 204, 200, 0.5);
      border-radius: 12px;
      padding: 8px 16px;
      display: flex;
      gap: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    `;

    const artifactStat = document.createElement('div');
    artifactStat.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    artifactStat.innerHTML = `
      <span style="font-size: 16px;">🔔</span>
      <span style="font-size: 13px; color: #5D4037;">已发掘: </span>
      <span id="artifact-count" style="font-size: 14px; font-weight: bold; color: #2E7D32;">0</span>
    `;

    const rateStat = document.createElement('div');
    rateStat.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    rateStat.innerHTML = `
      <span style="font-size: 16px;">⛏️</span>
      <span style="font-size: 13px; color: #5D4037;">效率: </span>
      <span id="dig-rate" style="font-size: 14px; font-weight: bold; color: #8D6E63;">0</span>
      <span style="font-size: 12px; color: #8D6E63;">次/分</span>
    `;

    statsBox.appendChild(artifactStat);
    statsBox.appendChild(rateStat);

    this.scoreDisplay.appendChild(scoreBox);
    this.scoreDisplay.appendChild(statsBox);
    this.container.appendChild(this.scoreDisplay);

    this.artifactCountDisplay = document.getElementById('artifact-count') as HTMLSpanElement;
    this.digRateDisplay = document.getElementById('dig-rate') as HTMLSpanElement;

    this.dataLogger.onScoreUpdate((score, animated) => {
      scoreValue.textContent = String(animated);
      scoreValue.style.transform = 'scale(1.2)';
      setTimeout(() => {
        scoreValue.style.transform = 'scale(1)';
      }, 100);
    });
  }

  private createSidebar(): void {
    this.sidebar = document.createElement('div');
    this.sidebar.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      width: 280px;
      background: rgba(245, 245, 245, 0.9);
      backdrop-filter: blur(10px);
      border-right: 1px solid rgba(215, 204, 200, 0.5);
      z-index: 90;
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 20px rgba(0, 0, 0, 0.05);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid #D7CCC8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h3');
    title.textContent = '发掘记录';
    title.style.cssText = `
      font-size: 18px;
      color: #5D4037;
      margin: 0;
      font-weight: 600;
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '◀';
    toggleBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 14px;
      color: #8D6E63;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    toggleBtn.onmouseenter = () => {
      toggleBtn.style.background = 'rgba(141, 110, 99, 0.1)';
    };
    toggleBtn.onmouseleave = () => {
      toggleBtn.style.background = 'none';
    };
    toggleBtn.onclick = () => this.toggleSidebar();

    header.appendChild(title);
    header.appendChild(toggleBtn);

    const timelineContainer = document.createElement('div');
    timelineContainer.id = 'timeline-container';
    timelineContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
    `;

    const expandBtn = document.createElement('button');
    expandBtn.id = 'expand-sidebar-btn';
    expandBtn.innerHTML = '▶ 记录';
    expandBtn.style.cssText = `
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(245, 245, 245, 0.95);
      border: 1px solid #D7CCC8;
      border-left: none;
      border-radius: 0 8px 8px 0;
      padding: 12px 8px;
      cursor: pointer;
      color: #5D4037;
      font-size: 12px;
      writing-mode: vertical-rl;
      display: none;
      z-index: 89;
      transition: background 0.2s;
    `;
    expandBtn.onclick = () => this.toggleSidebar();

    this.sidebar.appendChild(header);
    this.sidebar.appendChild(timelineContainer);
    this.container.appendChild(this.sidebar);
    this.container.appendChild(expandBtn);

    this.dataLogger.onRecordAdded((record) => {
      this.addTimelineNode(record);
    });
  }

  private toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    const expandBtn = document.getElementById('expand-sidebar-btn');
    
    if (this.sidebarCollapsed) {
      if (this.sidebar) {
        this.sidebar.style.transform = 'translateX(-100%)';
      }
      if (expandBtn) {
        expandBtn.style.display = 'block';
      }
    } else {
      if (this.sidebar) {
        this.sidebar.style.transform = 'translateX(0)';
      }
      if (expandBtn) {
        expandBtn.style.display = 'none';
      }
    }
  }

  private addTimelineNode(record: ExcavationRecord): void {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    const node = document.createElement('div');
    node.style.cssText = `
      position: relative;
      padding-left: 24px;
      padding-bottom: 20px;
      cursor: pointer;
      transition: background 0.2s;
      border-radius: 8px;
      padding: 8px 8px 20px 28px;
    `;
    node.onmouseenter = () => {
      node.style.background = 'rgba(215, 204, 200, 0.3)';
    };
    node.onmouseleave = () => {
      node.style.background = 'transparent';
    };
    node.onclick = () => {
      this.showRecordDetail(record);
    };

    const dot = document.createElement('div');
    const dotColor = record.correct ? '#4CAF50' : record.correct === false ? '#E53935' : '#BDBDBD';
    dot.style.cssText = `
      position: absolute;
      left: 6px;
      top: 12px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${dotColor};
      border: 2px solid white;
      box-shadow: 0 0 0 2px ${dotColor};
      z-index: 1;
    `;

    const line = document.createElement('div');
    line.style.cssText = `
      position: absolute;
      left: 11px;
      top: 26px;
      bottom: 0;
      width: 2px;
      background: #BDBDBD;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 10px 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid #EFEBE9;
    `;

    const idLine = document.createElement('div');
    idLine.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      color: #5D4037;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    idLine.innerHTML = `
      <span>${record.artifactId}</span>
      <span style="font-size: 12px; font-weight: normal; color: ${record.correct ? '#4CAF50' : record.correct === false ? '#E53935' : '#9E9E9E'};">
        ${record.score > 0 ? '+' : ''}${record.score}分
      </span>
    `;

    const infoLine = document.createElement('div');
    infoLine.style.cssText = `
      font-size: 12px;
      color: #8D6E63;
      line-height: 1.5;
    `;
    infoLine.innerHTML = `
      ${record.type} · ${record.era} · ${record.material}
    `;

    content.appendChild(idLine);
    content.appendChild(infoLine);
    node.appendChild(dot);
    node.appendChild(line);
    node.appendChild(content);
    container.appendChild(node);
    container.scrollTop = container.scrollHeight;
  }

  private showRecordDetail(record: ExcavationRecord): void {
    alert(`
文物编号: ${record.artifactId}
器物类型: ${record.type}
年代: ${record.era}
材质: ${record.material}
鉴定结果: ${record.correct ? '正确 ✓' : record.correct === false ? '错误 ✗' : '未鉴定'}
得分: ${record.score > 0 ? '+' : ''}${record.score}
时间: ${new Date(record.timestamp).toLocaleString()}
    `);
  }

  private createProgressRing(): void {
    this.progressRing = document.createElement('div');
    this.progressRing.id = 'cleaning-progress';
    this.progressRing.style.cssText = `
      position: fixed;
      left: 20px;
      bottom: 20px;
      width: 80px;
      height: 80px;
      z-index: 100;
      display: none;
    `;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '80');
    svg.setAttribute('height', '80');
    svg.setAttribute('viewBox', '0 0 80 80');

    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '40');
    bgCircle.setAttribute('cy', '40');
    bgCircle.setAttribute('r', '32');
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
    bgCircle.setAttribute('stroke-width', '8');

    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.id = 'progress-ring';
    progressCircle.setAttribute('cx', '40');
    progressCircle.setAttribute('cy', '40');
    progressCircle.setAttribute('r', '32');
    progressCircle.setAttribute('fill', 'none');
    progressCircle.setAttribute('stroke', '#FF8A65');
    progressCircle.setAttribute('stroke-width', '8');
    progressCircle.setAttribute('stroke-linecap', 'round');
    progressCircle.setAttribute('stroke-dasharray', '201');
    progressCircle.setAttribute('stroke-dashoffset', '201');
    progressCircle.setAttribute('transform', 'rotate(-90 40 40)');
    progressCircle.style.transition = 'stroke-dashoffset 0.3s ease, stroke 0.2s ease';

    const label = document.createElement('div');
    label.id = 'progress-label';
    label.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 14px;
      font-weight: bold;
      color: white;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    `;
    label.textContent = '0%';

    const flashStyle = document.createElement('style');
    flashStyle.textContent = `
      @keyframes progress-flash-green {
        0% { filter: drop-shadow(0 0 4px #4CAF50); stroke-width: 8px; }
        25% { filter: drop-shadow(0 0 20px #4CAF50); stroke-width: 12px; }
        50% { filter: drop-shadow(0 0 30px #81C784); stroke-width: 10px; }
        75% { filter: drop-shadow(0 0 15px #4CAF50); stroke-width: 9px; }
        100% { filter: none; stroke-width: 8px; }
      }
      .progress-flash {
        animation: progress-flash-green 0.6s ease-out 2;
        transform-box: fill-box;
        transform-origin: center;
      }
    `;
    document.head.appendChild(flashStyle);

    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);
    this.progressRing.appendChild(svg);
    this.progressRing.appendChild(label);

    this.container.appendChild(this.progressRing);
  }

  public showCleaningProgress(show: boolean): void {
    if (this.progressRing) {
      this.progressRing.style.display = show ? 'block' : 'none';
    }
  }

  public updateCleaningProgress(progress: number): void {
    const ring = document.getElementById('progress-ring');
    const label = document.getElementById('progress-label');
    
    if (ring && label) {
      const circumference = 201;
      const offset = circumference * (1 - progress);
      ring.setAttribute('stroke-dashoffset', String(offset));
      label.textContent = `${Math.round(progress * 100)}%`;

      const currentColor = lerpColor('#FF8A65', '#4CAF50', progress);
      ring.setAttribute('stroke', currentColor);

      if (progress >= 1 && !ring.classList.contains('progress-flash')) {
        ring.classList.add('progress-flash');
        setTimeout(() => {
          if (ring) ring.classList.remove('progress-flash');
        }, 1500);
      }
    }
  }

  public showIdentificationPanel(artifact: ArtifactData): void {
    this.currentArtifact = artifact;
    this.selectedType = ARTIFACT_TYPES[0];
    this.selectedEra = ARTIFACT_ERAS[0];
    this.selectedMaterial = ARTIFACT_MATERIALS[0];

    if (this.identificationPanel) {
      this.identificationPanel.remove();
    }

    this.identificationPanel = document.createElement('div');
    this.identificationPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 420px;
      height: 520px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 24px;
      z-index: 200;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.35s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translate(-50%, calc(-50% + 40px));
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }
    `;
    document.head.appendChild(style);

    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(215, 204, 200, 0.5);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h2');
    title.textContent = '文物鉴定';
    title.style.cssText = `
      font-size: 20px;
      color: #5D4037;
      margin: 0;
      font-weight: 600;
    `;

    const artifactId = document.createElement('span');
    artifactId.textContent = artifact.id;
    artifactId.style.cssText = `
      font-size: 13px;
      color: #8D6E63;
      background: rgba(215, 204, 200, 0.3);
      padding: 4px 10px;
      border-radius: 10px;
    `;

    titleBar.appendChild(title);
    titleBar.appendChild(artifactId);

    const previewContainer = document.createElement('div');
    previewContainer.id = 'preview-container';
    previewContainer.style.cssText = `
      height: 180px;
      background: linear-gradient(135deg, #F5F5F5 0%, #EFEBE9 100%);
      margin: 16px 24px;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
    `;

    const formContainer = document.createElement('div');
    formContainer.style.cssText = `
      padding: 0 24px 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    `;

    formContainer.appendChild(this.createSelectField('器物类型', ARTIFACT_TYPES, 'type-select', (val) => {
      this.selectedType = val as ArtifactType;
    }));

    formContainer.appendChild(this.createSelectField('年代', ARTIFACT_ERAS, 'era-select', (val) => {
      this.selectedEra = val as ArtifactEra;
    }));

    formContainer.appendChild(this.createSelectField('材质', ARTIFACT_MATERIALS, 'material-select', (val) => {
      this.selectedMaterial = val as ArtifactMaterial;
    }));

    const submitBtn = document.createElement('button');
    submitBtn.textContent = '确认鉴定';
    submitBtn.style.cssText = `
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: auto;
    `;
    submitBtn.onmouseenter = () => {
      submitBtn.style.transform = 'translateY(-1px)';
      submitBtn.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.4)';
    };
    submitBtn.onmouseleave = () => {
      submitBtn.style.transform = 'translateY(0)';
      submitBtn.style.boxShadow = 'none';
    };
    submitBtn.onclick = () => this.handleSubmit();

    formContainer.appendChild(submitBtn);

    this.identificationPanel.appendChild(titleBar);
    this.identificationPanel.appendChild(previewContainer);
    this.identificationPanel.appendChild(formContainer);
    this.container.appendChild(this.identificationPanel);

    this.initPreviewScene(artifact);
  }

  private createSelectField(label: string, options: string[], id: string, onChange: (val: string) => void): HTMLDivElement {
    const field = document.createElement('div');
    field.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 13px;
      color: #8D6E63;
      font-weight: 500;
    `;

    const select = document.createElement('select');
    select.id = id;
    select.style.cssText = `
      padding: 10px 14px;
      border: 1px solid #D7CCC8;
      border-radius: 10px;
      font-size: 14px;
      color: #5D4037;
      background: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    `;
    select.onfocus = () => {
      select.style.borderColor = '#4CAF50';
      select.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.15)';
    };
    select.onblur = () => {
      select.style.borderColor = '#D7CCC8';
      select.style.boxShadow = 'none';
    };
    select.onchange = () => onChange(select.value);

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    }

    field.appendChild(labelEl);
    field.appendChild(select);
    return field;
  }

  private initPreviewScene(artifact: ArtifactData): void {
    const container = document.getElementById('preview-container');
    if (!container) return;

    if (this.previewRenderer) {
      this.previewRenderer.dispose();
    }

    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color(0xF5F5F5);

    this.previewCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 100);
    this.previewCamera.position.set(0.06, 0.04, 0.08);
    this.previewCamera.lookAt(0, 0, 0);

    this.previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.previewRenderer.setSize(container.clientWidth, container.clientHeight);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.previewRenderer.domElement);

    this.previewControls = new OrbitControls(this.previewCamera, this.previewRenderer.domElement);
    this.previewControls.enableDamping = true;
    this.previewControls.dampingFactor = 0.08;
    this.previewControls.enablePan = false;
    this.previewControls.minDistance = 0.05;
    this.previewControls.maxDistance = 0.2;

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
    this.previewScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
    dirLight.position.set(0.1, 0.15, 0.1);
    this.previewScene.add(dirLight);

    this.previewArtifact = this.createPreviewArtifact(artifact);
    this.previewScene.add(this.previewArtifact);

    const animate = () => {
      requestAnimationFrame(animate);
      if (this.previewControls) this.previewControls.update();
      if (this.previewRenderer && this.previewScene && this.previewCamera) {
        this.previewRenderer.render(this.previewScene, this.previewCamera);
      }
    };
    animate();
  }

  private createPreviewArtifact(artifact: ArtifactData): THREE.Group {
    const group = new THREE.Group();

    const bodyGeom = new THREE.ConeGeometry(0.025, 0.02, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: TYPE_TO_COLOR[artifact.type],
      roughness: 0.6,
      metalness: artifact.type === '青铜器碎片' ? 0.7 : 0.1
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI;
    body.position.y = 0.01;
    body.castShadow = true;
    group.add(body);

    const linesGeom = new THREE.BufferGeometry();
    const linePositions: number[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const startR = 0.005 + Math.random() * 0.012;
      const endR = startR + 0.003 + Math.random() * 0.008;
      const yPos = 0.004 + Math.random() * 0.01;
      
      linePositions.push(
        Math.cos(angle) * startR, yPos, Math.sin(angle) * startR,
        Math.cos(angle) * endR, yPos + 0.001, Math.sin(angle) * endR
      );
    }
    linesGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const linesMat = new THREE.LineBasicMaterial({ color: 0x3E2723, transparent: true, opacity: 0.5 });
    const lines = new THREE.LineSegments(linesGeom, linesMat);
    lines.rotation.x = Math.PI;
    lines.position.y = 0.01;
    group.add(lines);

    return group;
  }

  private handleSubmit(): void {
    if (!this.currentArtifact || !this.onSubmitCallback) return;
    
    this.onSubmitCallback(this.selectedType, this.selectedEra, this.selectedMaterial);
    this.closeIdentificationPanel();
  }

  public closeIdentificationPanel(): void {
    if (this.identificationPanel) {
      this.identificationPanel.style.animation = 'slideUp 0.25s ease-in reverse';
      setTimeout(() => {
        if (this.identificationPanel) {
          this.identificationPanel.remove();
          this.identificationPanel = null;
        }
      }, 200);
    }

    if (this.previewRenderer) {
      this.previewRenderer.dispose();
      this.previewRenderer = null;
    }
  }

  public showAchievementPopup(): void {
    if (this.achievementPopup) {
      this.achievementPopup.remove();
    }

    this.achievementPopup = document.createElement('div');
    this.achievementPopup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 360px;
      height: 200px;
      background: #E8F5E9;
      border-radius: 20px;
      z-index: 300;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      box-shadow: 0 20px 60px rgba(76, 175, 80, 0.3);
      animation: popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes popIn {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.5);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
    `;
    document.head.appendChild(style);

    const checkIcon = document.createElement('div');
    checkIcon.innerHTML = '✓';
    checkIcon.style.cssText = `
      width: 60px;
      height: 60px;
      background: #4CAF50;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
    `;

    const message = document.createElement('div');
    message.textContent = '发掘记录已保存';
    message.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      color: #2E7D32;
    `;

    const subMessage = document.createElement('div');
    subMessage.textContent = '+10 积分';
    subMessage.style.cssText = `
      font-size: 14px;
      color: #4CAF50;
      background: rgba(76, 175, 80, 0.15);
      padding: 4px 12px;
      border-radius: 12px;
    `;

    this.achievementPopup.appendChild(checkIcon);
    this.achievementPopup.appendChild(message);
    this.achievementPopup.appendChild(subMessage);
    this.container.appendChild(this.achievementPopup);

    setTimeout(() => {
      if (this.achievementPopup) {
        this.achievementPopup.style.animation = 'popIn 0.3s ease-in reverse';
        setTimeout(() => {
          if (this.achievementPopup) {
            this.achievementPopup.remove();
            this.achievementPopup = null;
          }
        }, 250);
      }
    }, 2500);
  }

  public onSubmit(callback: (type: ArtifactType, era: ArtifactEra, material: ArtifactMaterial) => void): void {
    this.onSubmitCallback = callback;
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.identificationPanel) {
          this.closeIdentificationPanel();
        }
      }
    });
  }

  public updateArtifactCount(count: number): void {
    if (this.artifactCountDisplay) {
      this.artifactCountDisplay.textContent = String(count);
    }
  }

  public updateDigRate(rate: number): void {
    if (this.digRateDisplay) {
      this.digRateDisplay.textContent = String(rate);
    }
  }
}
