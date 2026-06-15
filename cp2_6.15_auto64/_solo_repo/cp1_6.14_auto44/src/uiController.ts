import { AudioAnalyzer } from './audioAnalyzer';
import { WaveCore, WaveformConfig } from './waveCore';
import { ThreeScene, SceneConfig } from './threeScene';

export interface UIControls {
  fileInput: HTMLInputElement;
  fileLabel: HTMLLabelElement;
  dropZone: HTMLDivElement;
  playPauseBtn: HTMLButtonElement;
  progressContainer: HTMLDivElement;
  progressTrack: HTMLDivElement;
  progressBuffered: HTMLDivElement;
  progressPlayed: HTMLDivElement;
  progressThumb: HTMLDivElement;
  timeDisplay: HTMLDivElement;
  playerControls: HTMLDivElement;
  controlPanel: HTMLDivElement;
  heightSlider: HTMLInputElement;
  heightValue: HTMLSpanElement;
  thicknessSlider: HTMLInputElement;
  thicknessValue: HTMLSpanElement;
  spacingSlider: HTMLInputElement;
  spacingValue: HTMLSpanElement;
  particlesToggle: HTMLInputElement;
  autorotateToggle: HTMLInputElement;
  exportBtn: HTMLButtonElement;
  resetViewBtn: HTMLButtonElement;
  togglePanelBtn: HTMLButtonElement;
  spectrumCanvas: HTMLCanvasElement;
}

export class UIController {
  private controls: UIControls;
  private audioAnalyzer: AudioAnalyzer;
  private waveCore: WaveCore;
  private threeScene: ThreeScene;
  private isDraggingProgress = false;
  private panelExpanded = false;
  private spectrumUpdateInterval: number | null = null;
  private spectrumContext: CanvasRenderingContext2D;
  private frequencyHistory: Uint8Array[] = [];
  private historyLength = 50;

  constructor(
    audioAnalyzer: AudioAnalyzer,
    waveCore: WaveCore,
    threeScene: ThreeScene
  ) {
    this.audioAnalyzer = audioAnalyzer;
    this.waveCore = waveCore;
    this.threeScene = threeScene;
    this.controls = this.getControls();
    this.spectrumContext = this.controls.spectrumCanvas.getContext('2d')!;

    this.setupEventListeners();
    this.setupAudioCallbacks();
    this.startSpectrumUpdate();
  }

  private getControls(): UIControls {
    return {
      fileInput: document.getElementById('file-input') as HTMLInputElement,
      fileLabel: document.getElementById('file-label') as HTMLLabelElement,
      dropZone: document.getElementById('drop-zone') as HTMLDivElement,
      playPauseBtn: document.getElementById('play-pause-btn') as HTMLButtonElement,
      progressContainer: document.getElementById('progress-container') as HTMLDivElement,
      progressTrack: document.getElementById('progress-track') as HTMLDivElement,
      progressBuffered: document.getElementById('progress-buffered') as HTMLDivElement,
      progressPlayed: document.getElementById('progress-played') as HTMLDivElement,
      progressThumb: document.getElementById('progress-thumb') as HTMLDivElement,
      timeDisplay: document.getElementById('time-display') as HTMLDivElement,
      playerControls: document.getElementById('player-controls') as HTMLDivElement,
      controlPanel: document.getElementById('control-panel') as HTMLDivElement,
      heightSlider: document.getElementById('height-slider') as HTMLInputElement,
      heightValue: document.getElementById('height-value') as HTMLSpanElement,
      thicknessSlider: document.getElementById('thickness-slider') as HTMLInputElement,
      thicknessValue: document.getElementById('thickness-value') as HTMLSpanElement,
      spacingSlider: document.getElementById('spacing-slider') as HTMLInputElement,
      spacingValue: document.getElementById('spacing-value') as HTMLSpanElement,
      particlesToggle: document.getElementById('particles-toggle') as HTMLInputElement,
      autorotateToggle: document.getElementById('autorotate-toggle') as HTMLInputElement,
      exportBtn: document.getElementById('export-btn') as HTMLButtonElement,
      resetViewBtn: document.getElementById('reset-view-btn') as HTMLButtonElement,
      togglePanelBtn: document.getElementById('toggle-panel-btn') as HTMLButtonElement,
      spectrumCanvas: document.getElementById('spectrum-canvas') as HTMLCanvasElement
    };
  }

  private setupEventListeners(): void {
    this.controls.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

    this.controls.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
    this.controls.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
    this.controls.dropZone.addEventListener('drop', this.handleDrop.bind(this));

    this.controls.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));

    this.controls.progressContainer.addEventListener('mousedown', this.startProgressDrag.bind(this));
    document.addEventListener('mousemove', this.handleProgressDrag.bind(this));
    document.addEventListener('mouseup', this.endProgressDrag.bind(this));

    this.controls.progressContainer.addEventListener('touchstart', this.startProgressDrag.bind(this));
    document.addEventListener('touchmove', this.handleProgressDrag.bind(this));
    document.addEventListener('touchend', this.endProgressDrag.bind(this));

    this.controls.heightSlider.addEventListener('input', this.handleHeightChange.bind(this));
    this.controls.thicknessSlider.addEventListener('input', this.handleThicknessChange.bind(this));
    this.controls.spacingSlider.addEventListener('input', this.handleSpacingChange.bind(this));

    this.controls.particlesToggle.addEventListener('change', this.handleParticlesToggle.bind(this));
    this.controls.autorotateToggle.addEventListener('change', this.handleAutoRotateToggle.bind(this));

    this.controls.exportBtn.addEventListener('click', this.handleExport.bind(this));
    this.controls.resetViewBtn.addEventListener('click', this.handleResetView.bind(this));
    this.controls.togglePanelBtn.addEventListener('click', this.togglePanel.bind(this));

    window.addEventListener('resize', this.handleResize.bind(this));
    this.handleResize();
  }

  private setupAudioCallbacks(): void {
    this.audioAnalyzer.setOnPlaybackEnd(() => {
      this.updatePlayPauseButton(false);
      this.updateProgress(0, this.audioAnalyzer.getDuration());
    });

    this.audioAnalyzer.setOnTimeUpdate((currentTime, duration) => {
      if (!this.isDraggingProgress) {
        this.updateProgress(currentTime, duration);
      }
    });
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    this.controls.dropZone.classList.add('drag-over');
  }

  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.controls.dropZone.classList.remove('drag-over');
  }

  private async handleDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    this.controls.dropZone.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.name.endsWith('.mp3')) {
        await this.loadAudioFile(file);
      } else {
        alert('请选择 MP3 格式的音频文件');
      }
    }
  }

  private async handleFileSelect(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      await this.loadAudioFile(files[0]);
    }
  }

  private async loadAudioFile(file: File): Promise<void> {
    try {
      this.controls.dropZone.style.display = 'none';
      this.controls.playerControls.style.display = 'flex';
      this.controls.controlPanel.style.display = 'block';

      await this.audioAnalyzer.loadAudioFile(file);
      
      const duration = this.audioAnalyzer.getDuration();
      this.updateProgress(0, duration);
      
      this.threeScene.refreshWaveMeshes();
      this.threeScene.startAnimationLoop();
    } catch (error) {
      console.error('加载音频文件失败:', error);
      alert('加载音频文件失败，请检查文件格式');
      this.controls.dropZone.style.display = 'flex';
      this.controls.playerControls.style.display = 'none';
      this.controls.controlPanel.style.display = 'none';
    }
  }

  private togglePlayPause(): void {
    if (this.audioAnalyzer.getIsPlaying()) {
      this.audioAnalyzer.pause();
      this.updatePlayPauseButton(false);
    } else {
      this.audioAnalyzer.play();
      this.updatePlayPauseButton(true);
    }
  }

  private updatePlayPauseButton(isPlaying: boolean): void {
    this.controls.playPauseBtn.textContent = isPlaying ? '❚❚' : '▶';
  }

  private startProgressDrag(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    this.isDraggingProgress = true;
    this.controls.progressThumb.style.background = '#00bfff';
    this.controls.progressThumb.style.transform = 'translate(-50%, -50%) scale(1.2)';
    this.handleProgressDrag(e);
  }

  private handleProgressDrag(e: MouseEvent | TouchEvent): void {
    if (!this.isDraggingProgress) return;

    const rect = this.controls.progressTrack.getBoundingClientRect();
    let clientX: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const duration = this.audioAnalyzer.getDuration();
    const currentTime = percent * duration;

    this.updateProgress(currentTime, duration);
  }

  private endProgressDrag(e: MouseEvent | TouchEvent): void {
    if (!this.isDraggingProgress) return;

    this.isDraggingProgress = false;
    this.controls.progressThumb.style.background = 'white';
    this.controls.progressThumb.style.transform = 'translate(-50%, -50%) scale(1)';

    const rect = this.controls.progressTrack.getBoundingClientRect();
    let clientX: number;

    if ('changedTouches' in e) {
      clientX = e.changedTouches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const duration = this.audioAnalyzer.getDuration();
    const currentTime = percent * duration;

    this.audioAnalyzer.seek(currentTime);
  }

  private updateProgress(currentTime: number, duration: number): void {
    const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    this.controls.progressPlayed.style.width = `${percent}%`;
    this.controls.progressThumb.style.left = `${percent}%`;
    
    this.controls.progressBuffered.style.width = `${Math.min(100, percent + 5)}%`;

    this.controls.timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private handleHeightChange(e: Event): void {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.controls.heightValue.textContent = value.toFixed(1);
    this.waveCore.setConfig('heightMultiplier', value);
  }

  private handleThicknessChange(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value);
    this.controls.thicknessValue.textContent = value.toString();
    this.waveCore.setConfig('barThickness', value);
    this.threeScene.refreshWaveMeshes();
  }

  private handleSpacingChange(e: Event): void {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.controls.spacingValue.textContent = value.toFixed(1);
    this.waveCore.setConfig('barSpacing', value);
    this.threeScene.refreshWaveMeshes();
  }

  private handleParticlesToggle(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.threeScene.setParticlesEnabled(checked);
  }

  private handleAutoRotateToggle(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.threeScene.setAutoRotate(checked);
  }

  private handleResetView(): void {
    this.threeScene.resetView();
    this.controls.autorotateToggle.checked = false;
  }

  private togglePanel(): void {
    this.panelExpanded = !this.panelExpanded;
    
    if (this.panelExpanded) {
      this.controls.controlPanel.classList.add('expanded');
      this.controls.togglePanelBtn.textContent = '▼';
    } else {
      this.controls.controlPanel.classList.remove('expanded');
      this.controls.togglePanelBtn.textContent = '▲';
    }
  }

  private handleResize(): void {
    const canvas = this.controls.spectrumCanvas;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    this.spectrumContext.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  private startSpectrumUpdate(): void {
    this.spectrumUpdateInterval = window.setInterval(() => {
      this.updateSpectrum();
    }, 50);
  }

  private updateSpectrum(): void {
    const canvas = this.controls.spectrumCanvas;
    const ctx = this.spectrumContext;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, width, height);

    const frequencyData = this.audioAnalyzer.getFrequencyData();
    if (frequencyData.length === 0) {
      this.drawPlaceholderSpectrum(width, height);
      return;
    }

    this.frequencyHistory.push(new Uint8Array(frequencyData));
    if (this.frequencyHistory.length > this.historyLength) {
      this.frequencyHistory.shift();
    }

    const barCount = 256;
    const barWidth = 2;
    const barSpacing = 1;
    const totalWidth = barCount * (barWidth + barSpacing) - barSpacing;
    const startX = (width - totalWidth) / 2;

    const freqStep = Math.floor(frequencyData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      let amplitude = 0;
      const start = i * freqStep;
      const end = Math.min(frequencyData.length, start + freqStep);
      
      for (let j = start; j < end; j++) {
        amplitude += frequencyData[j] / 255;
      }
      amplitude = amplitude / (end - start);

      const barHeight = amplitude * height * 0.9;
      const x = startX + i * (barWidth + barSpacing);
      const y = height - barHeight;

      const normalizedFreq = i / barCount;
      const color = this.waveCore.getSpectrumColor(normalizedFreq);

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x, y, barWidth, 2);
    }

    ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let i = 0; i < barCount; i++) {
      let amplitude = 0;
      const start = i * freqStep;
      const end = Math.min(frequencyData.length, start + freqStep);
      
      for (let j = start; j < end; j++) {
        amplitude += frequencyData[j] / 255;
      }
      amplitude = amplitude / (end - start);

      const x = startX + i * (barWidth + barSpacing) + barWidth / 2;
      const y = height - amplitude * height * 0.9;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  private drawPlaceholderSpectrum(width: number, height: number): void {
    const barCount = 256;
    const barWidth = 2;
    const barSpacing = 1;
    const totalWidth = barCount * (barWidth + barSpacing) - barSpacing;
    const startX = (width - totalWidth) / 2;

    for (let i = 0; i < barCount; i++) {
      const amplitude = 0.1 + Math.sin(i * 0.1 + Date.now() * 0.001) * 0.05;
      const barHeight = amplitude * height * 0.9;
      const x = startX + i * (barWidth + barSpacing);
      const y = height - barHeight;

      const normalizedFreq = i / barCount;
      const color = this.waveCore.getSpectrumColor(normalizedFreq);

      this.spectrumContext.fillStyle = color;
      this.spectrumContext.globalAlpha = 0.3;
      this.spectrumContext.fillRect(x, y, barWidth, barHeight);
      this.spectrumContext.globalAlpha = 1;
    }
  }

  private async handleExport(): Promise<void> {
    const sceneState = this.threeScene.getSceneState();
    
    const htmlContent = this.generateExportHTML(sceneState);
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = Date.now();
    const filename = `wave_${timestamp}.html`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private generateExportHTML(sceneState: {
    cameraPosition: { x: number; y: number; z: number };
    cameraTarget: { x: number; y: number; z: number };
    waveConfig: WaveformConfig;
    sceneConfig: SceneConfig;
  }): string {
    const threeJSCDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    const orbitControlsCDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js';
    const serializedState = JSON.stringify(sceneState);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D音乐波形可视化</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0a0a1a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    #info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #00bfff;
      font-size: 14px;
      background: rgba(26, 26, 46, 0.8);
      padding: 12px 20px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 10;
    }
    #config-display {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: #8a2be2;
      font-size: 12px;
      background: rgba(26, 26, 46, 0.7);
      padding: 8px 16px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 10;
      font-family: monospace;
    }
    #controls {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(26, 26, 46, 0.93);
      padding: 16px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 10;
      min-width: 180px;
    }
    .control-btn {
      display: block;
      width: 100%;
      padding: 10px 16px;
      margin-bottom: 8px;
      background: #00bfff;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .control-btn:hover {
      background: #33d9ff;
    }
    .control-btn:last-child {
      margin-bottom: 0;
    }
    @media (max-width: 768px) {
      #controls {
        bottom: 20px;
        top: auto;
        right: 20px;
      }
      #config-display {
        top: 90px;
        font-size: 10px;
      }
    }
  </style>
</head>
<body>
  <div id="container"></div>
  <div id="info">
    🎵 3D音乐波形可视化<br>
    <small>拖拽旋转 • 滚轮缩放</small>
  </div>
  <div id="config-display"></div>
  <div id="controls">
    <button class="control-btn" id="autoRotateBtn">🔄 自动旋转: ${sceneState.sceneConfig.autoRotate ? '开' : '关'}</button>
    <button class="control-btn" id="particlesBtn">✨ 粒子效果: ${sceneState.sceneConfig.particlesEnabled ? '开' : '关'}</button>
    <button class="control-btn" id="resetBtn">🎯 重置视角</button>
  </div>

  <script src="${threeJSCDN}"></script>
  <script src="${orbitControlsCDN}"></script>
  <script>
    (function() {
      const config = ${serializedState};
      
      let scene, camera, renderer, controls;
      let waveGroup, particleSystem;
      let allParticles = [];
      let autoRotate = config.sceneConfig.autoRotate;
      let particlesEnabled = config.sceneConfig.particlesEnabled;
      let autoRotateSpeed = config.sceneConfig.autoRotateSpeed || 15;
      let particlePool = [];
      let activeParticles = [];
      let maxParticles = 2000;
      let particlesPerSecond = config.sceneConfig.particleCount || 200;
      let particleLifetime = config.sceneConfig.particleLifetime || 0.8;
      let lastParticleTime = 0;
      let animationId;
      let currentSpherical = null;
      let isEasing = false;
      let easeStartTime = 0;
      let easeDuration = 0.3;
      let easeStartTheta = 0;
      let easeTargetTheta = 0;
      let targetRotationY = 0;
      let currentRotationY = 0;

      const heightMultiplier = config.waveConfig.heightMultiplier;
      const barCount = config.waveConfig.barCount;
      const rowsCount = config.waveConfig.rowsCount;
      const barThickness = config.waveConfig.barThickness;
      const barSpacing = config.waveConfig.barSpacing;

      function init() {
        const container = document.getElementById('container');
        
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a1a);
        scene.fog = new THREE.Fog(0x0a0a1a, 50, 150);

        camera = new THREE.PerspectiveCamera(
          60,
          container.clientWidth / container.clientHeight,
          0.1,
          1000
        );
        camera.position.set(
          config.cameraPosition.x,
          config.cameraPosition.y,
          config.cameraPosition.z
        );

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 20;
        controls.maxDistance = 150;
        controls.minPolarAngle = Math.PI / 6;
        controls.maxPolarAngle = Math.PI / 2;
        controls.enablePan = false;
        controls.target.set(
          config.cameraTarget.x,
          config.cameraTarget.y,
          config.cameraTarget.z
        );
        controls.update();

        targetRotationY = getAzimuthalAngle();
        currentRotationY = targetRotationY;

        setupLighting();
        setupGround();
        setupWaveform();
        setupParticles();
        setupEventListeners();
        displayConfig();
        animate();

        if (autoRotate) {
          startAutoRotate();
        }
      }

      function displayConfig() {
        const el = document.getElementById('config-display');
        el.innerHTML = 
          '高度: ' + heightMultiplier.toFixed(1) + 
          ' | 粗细: ' + barThickness + 
          ' | 间距: ' + barSpacing.toFixed(1) +
          ' | 粒子: ' + (particlesEnabled ? '开' : '关');
      }

      function getAzimuthalAngle() {
        const offset = new THREE.Vector3();
        offset.copy(camera.position).sub(controls.target);
        return Math.atan2(offset.x, offset.z);
      }

      function setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
        scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(10, 50, 20);
        mainLight.castShadow = true;
        scene.add(mainLight);

        const blueLight = new THREE.PointLight(0x00bfff, 1, 100);
        blueLight.position.set(-50, 20, -30);
        scene.add(blueLight);

        const purpleLight = new THREE.PointLight(0x8a2be2, 0.8, 100);
        purpleLight.position.set(50, 20, 30);
        scene.add(purpleLight);
      }

      function setupGround() {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a2e,
          metalness: 0.3,
          roughness: 0.8,
          transparent: true,
          opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.5;
        ground.receiveShadow = true;
        scene.add(ground);

        const gridHelper = new THREE.GridHelper(200, 50, 0x2a2a4e, 0x1a1a3e);
        gridHelper.position.y = -0.49;
        scene.add(gridHelper);
      }

      function setupWaveform() {
        waveGroup = new THREE.Group();
        scene.add(waveGroup);

        const totalWidth = barCount * (barThickness + barSpacing);
        const totalDepth = rowsCount * (barThickness + barSpacing);
        const startX = -totalWidth / 2;
        const startZ = -totalDepth / 2;

        for (let row = 0; row < rowsCount; row++) {
          for (let col = 0; col < barCount; col++) {
            const x = startX + col * (barThickness + barSpacing) + barThickness / 2;
            const z = startZ + row * (barThickness + barSpacing) + barThickness / 2;
            const frequency = col / barCount;
            const basePhase = (frequency * 3 + row * 0.5) * Math.PI * 2;
            const baseHeight = 0.2 + (0.3 + 0.7 * Math.abs(Math.sin(basePhase))) * heightMultiplier * 3;
            
            const geometry = new THREE.BoxGeometry(
              barThickness * 0.1,
              1,
              barThickness * 0.1
            );

            const color = getBarColor(0.5, frequency);

            const material = new THREE.MeshStandardMaterial({
              color: color,
              emissive: color,
              emissiveIntensity: 0.3,
              metalness: 0.3,
              roughness: 0.4
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, baseHeight / 2, z);
            mesh.scale.y = baseHeight;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { 
              baseHeight: baseHeight, 
              col: col, 
              row: row,
              frequency: frequency,
              basePhase: basePhase,
              posX: x,
              posZ: z
            };
            waveGroup.add(mesh);
          }
        }
      }

      function getBarColor(normalizedHeight, frequency) {
        const freqLowColor = new THREE.Color(0x1e90ff);
        const freqHighColor = new THREE.Color(0xff4500);
        
        const freqT = Math.max(0, Math.min(1, frequency));
        const baseColor = freqLowColor.clone().lerp(freqHighColor, freqT);
        
        const brightness = 0.4 + Math.max(0, Math.min(1, normalizedHeight)) * 0.6;
        const result = baseColor.clone();
        result.offsetHSL(0, 0, (brightness - 0.5) * 0.5);
        
        return result;
      }

      function setupParticles() {
        for (let i = 0; i < maxParticles; i++) {
          particlePool.push({
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            color: new THREE.Color(),
            life: 0,
            maxLife: particleLifetime,
            size: 0.3
          });
        }

        const geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
          size: 0.3,
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        particleSystem = new THREE.Points(geometry, material);
        particleSystem.name = 'particleSystem';
        particleSystem.visible = particlesEnabled;
        scene.add(particleSystem);
      }

      function emitParticles(time) {
        const interval = 1000 / particlesPerSecond;
        const elapsed = time - lastParticleTime;
        
        if (elapsed < interval) return;
        
        const batches = Math.floor(elapsed / interval);
        lastParticleTime = time - (elapsed % interval);

        const activeBars = waveGroup.children.filter(function(mesh) {
          return mesh.scale.y > 0.3;
        });
        
        if (activeBars.length === 0) return;

        const thickness = barThickness * 0.1;

        for (let batch = 0; batch < batches; batch++) {
          const bar = activeBars[Math.floor(Math.random() * activeBars.length)];
          const userData = bar.userData;
          const particle = particlePool.find(function(p) { return p.life <= 0; });
          
          if (particle) {
            const barHeight = bar.scale.y;
            particle.position.set(
              userData.posX + (Math.random() - 0.5) * thickness * 0.8,
              barHeight,
              userData.posZ + (Math.random() - 0.5) * thickness * 0.8
            );
            
            const heightFactor = Math.min(1, barHeight / 10);
            particle.velocity.set(
              (Math.random() - 0.5) * 0.5,
              0.5 + heightFactor * 2.5 + Math.random() * 1.5,
              (Math.random() - 0.5) * 0.5
            );
            
            const freqColor = getBarColor(heightFactor, userData.frequency);
            particle.color.copy(freqColor);
            particle.life = particleLifetime;
            particle.maxLife = particleLifetime;
            particle.size = 0.15 + Math.random() * 0.2 + heightFactor * 0.1;
            
            if (!activeParticles.includes(particle)) {
              activeParticles.push(particle);
            }
          }
          
          if (activeParticles.length >= maxParticles) break;
        }
      }

      function updateParticles() {
        const positions = [];
        const colors = [];
        const sizes = [];

        const deltaTime = 1 / 60;

        for (let i = activeParticles.length - 1; i >= 0; i--) {
          const particle = activeParticles[i];
          
          if (particle.life <= 0) {
            activeParticles.splice(i, 1);
            continue;
          }

          particle.life -= deltaTime;
          
          particle.velocity.multiplyScalar(0.98);
          particle.velocity.y -= 1.5 * deltaTime;
          particle.position.addScaledVector(particle.velocity, deltaTime);

          const lifeRatio = particle.life / particle.maxLife;
          const easeOutRatio = Math.pow(Math.max(0, lifeRatio), 0.5);

          positions.push(particle.position.x, particle.position.y, particle.position.z);
          colors.push(
            particle.color.r * easeOutRatio,
            particle.color.g * easeOutRatio,
            particle.color.b * easeOutRatio
          );
          sizes.push(particle.size * (0.3 + easeOutRatio * 0.7));
        }

        const geometry = particleSystem.geometry;
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
      }

      function startAutoRotate() {
        targetRotationY = getAzimuthalAngle();
        currentRotationY = targetRotationY;
      }

      function startEasing(targetRotation) {
        isEasing = true;
        easeStartTime = performance.now();
        easeStartTheta = currentRotationY;
        easeTargetTheta = targetRotation;
      }

      function updateEasing(time) {
        if (!isEasing) return;

        const elapsed = (time - easeStartTime) / 1000;
        const progress = Math.min(1, elapsed / easeDuration);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        currentRotationY = easeStartTheta + (easeTargetTheta - easeStartTheta) * easeOut;

        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        spherical.theta = currentRotationY;
        camera.position.setFromSpherical(spherical);
        camera.lookAt(controls.target);

        if (progress >= 1) {
          isEasing = false;
        }
      }

      function setupEventListeners() {
        window.addEventListener('resize', onWindowResize);

        controls.addEventListener('start', function() {
          isEasing = false;
        });

        controls.addEventListener('change', function() {
          if (!autoRotate && !isEasing) {
            targetRotationY = getAzimuthalAngle();
            currentRotationY = targetRotationY;
          }
        });

        document.getElementById('autoRotateBtn').addEventListener('click', function() {
          autoRotate = !autoRotate;
          this.textContent = '🔄 自动旋转: ' + (autoRotate ? '开' : '关');
          if (autoRotate) {
            startAutoRotate();
            startEasing(targetRotationY);
          } else {
            startEasing(currentRotationY);
          }
        });

        document.getElementById('particlesBtn').addEventListener('click', function() {
          particlesEnabled = !particlesEnabled;
          this.textContent = '✨ 粒子效果: ' + (particlesEnabled ? '开' : '关');
          if (particleSystem) {
            particleSystem.visible = particlesEnabled;
          }
        });

        document.getElementById('resetBtn').addEventListener('click', function() {
          camera.position.set(
            config.cameraPosition.x,
            config.cameraPosition.y,
            config.cameraPosition.z
          );
          controls.target.set(
            config.cameraTarget.x,
            config.cameraTarget.y,
            config.cameraTarget.z
          );
          controls.update();
          
          autoRotate = false;
          document.getElementById('autoRotateBtn').textContent = '🔄 自动旋转: 关';
          
          targetRotationY = getAzimuthalAngle();
          currentRotationY = targetRotationY;
          isEasing = false;
        });
      }

      function onWindowResize() {
        const container = document.getElementById('container');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }

      function animate() {
        animationId = requestAnimationFrame(animate);

        const now = performance.now();
        const time = now * 0.001;

        waveGroup.children.forEach(function(mesh) {
          const userData = mesh.userData;
          const wave = Math.sin(time * 2 + userData.basePhase) * 0.5 + 0.5;
          const newHeight = Math.max(0.1, userData.baseHeight * (0.4 + wave * 0.8));
          mesh.scale.y = newHeight;
          mesh.position.y = newHeight / 2;
          
          const normalizedHeight = Math.min(1, newHeight / (heightMultiplier * 10));
          const color = getBarColor(normalizedHeight, userData.frequency);
          mesh.material.color.copy(color);
          mesh.material.emissive.copy(color);
        });

        if (particlesEnabled) {
          emitParticles(now);
          updateParticles();
        }

        if (autoRotate) {
          const delta = 1 / 60;
          targetRotationY += (autoRotateSpeed * Math.PI / 180) * delta;
          startEasing(targetRotationY);
        }

        if (isEasing) {
          updateEasing(now);
        }

        controls.update();
        renderer.render(scene, camera);
      }

      init();
    })();
  </script>
</body>
</html>`;
  }

  cleanup(): void {
    if (this.spectrumUpdateInterval !== null) {
      clearInterval(this.spectrumUpdateInterval);
      this.spectrumUpdateInterval = null;
    }

    window.removeEventListener('resize', this.handleResize.bind(this));
    document.removeEventListener('mousemove', this.handleProgressDrag.bind(this));
    document.removeEventListener('mouseup', this.endProgressDrag.bind(this));
    document.removeEventListener('touchmove', this.handleProgressDrag.bind(this));
    document.removeEventListener('touchend', this.endProgressDrag.bind(this));
  }
}
