import {
  PixelEngine,
  ToolType,
  MirrorMode,
  PALETTE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PencilSize,
  EraserSize,
  MAX_FRAMES,
} from './core';

export interface EditorOptions {
  container: HTMLElement;
  engine: PixelEngine;
  pixelScale?: number;
}

export class PixelEditor {
  private engine: PixelEngine;
  private container: HTMLElement;
  private pixelScale: number = 20;

  private mainCanvas!: HTMLCanvasElement;
  private mainCtx!: CanvasRenderingContext2D;
  private gridCanvas!: HTMLCanvasElement;

  private toolbarEl!: HTMLElement;
  private colorPaletteEl!: HTMLElement;
  private toolButtons: Map<ToolType, HTMLElement> = new Map();
  private sizeSelectEl!: HTMLElement;

  private framesListEl!: HTMLElement;
  private frameThumbnails: HTMLCanvasElement[] = [];

  private timelineEl!: HTMLElement;
  private timelineFramesEl!: HTMLElement;
  private progressBarEl!: HTMLElement;

  private infoPanelEl!: HTMLElement;
  private pixelCountEl!: HTMLElement;
  private historyCountEl!: HTMLElement;
  private mirrorSelectEl!: HTMLElement;
  private fpsSelectEl!: HTMLElement;

  private undoBtn!: HTMLElement;
  private redoBtn!: HTMLElement;
  private playBtn!: HTMLElement;

  private magnifierEl!: HTMLElement;
  private isEyedropperHover: boolean = false;

  private rafPending: boolean = false;

  private dragFromIndex: number = -1;

  constructor(options: EditorOptions) {
    this.engine = options.engine;
    this.container = options.container;
    if (options.pixelScale) this.pixelScale = options.pixelScale;

    this.buildLayout();
    this.bindEvents();
    this.updateAll();
  }

  private buildLayout(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.height = '100%';
    this.container.style.width = '100%';
    this.container.style.boxSizing = 'border-box';
    this.container.style.overflow = 'hidden';

    this.buildToolbar();
    this.buildMainArea();
    this.buildInfoPanel();
  }

  private buildToolbar(): void {
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 'pfw-toolbar';
    Object.assign(this.toolbarEl.style, {
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '12px',
      background: 'rgba(26, 26, 26, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #E0E0E0',
      flexShrink: '0',
      position: 'relative',
      zIndex: '10',
    });

    const title = document.createElement('div');
    title.textContent = '像素帧工坊';
    Object.assign(title.style, {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#D4AF37',
      fontFamily: '"Press Start 2P", "VT323", monospace',
      letterSpacing: '2px',
      marginRight: '24px',
      textShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
    });
    this.toolbarEl.appendChild(title);

    const toolGroup = document.createElement('div');
    toolGroup.className = 'pfw-tool-group';
    Object.assign(toolGroup.style, {
      display: 'flex',
      gap: '4px',
      padding: '4px',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
    });

    const tools: Array<{ type: ToolType; icon: string; label: string }> = [
      { type: 'pencil', icon: '✏️', label: '铅笔' },
      { type: 'eraser', icon: '🧹', label: '橡皮擦' },
      { type: 'fill', icon: '⬛', label: '矩形填充' },
      { type: 'eyedropper', icon: '💧', label: '吸管' },
    ];

    tools.forEach(({ type, icon, label }) => {
      const btn = document.createElement('button');
      btn.className = 'pfw-tool-btn';
      btn.title = label;
      btn.dataset.tool = type;
      btn.textContent = icon;
      Object.assign(btn.style, {
        width: '32px',
        height: '32px',
        border: 'none',
        background: 'transparent',
        color: '#cccccc',
        fontSize: '18px',
        cursor: 'pointer',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 150ms ease',
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.color = '#4ECDC4';
        btn.style.background = 'rgba(78, 205, 196, 0.15)';
      });
      btn.addEventListener('mouseleave', () => {
        if (this.engine.getTool() !== type) {
          btn.style.color = '#cccccc';
          btn.style.background = 'transparent';
        }
      });
      btn.addEventListener('mousedown', () => {
        btn.style.transform = 'scale(0.95)';
      });
      btn.addEventListener('mouseup', () => {
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('click', () => {
        this.engine.setTool(type);
        this.updateToolButtons();
        this.updateCursor();
      });
      this.toolButtons.set(type, btn);
      toolGroup.appendChild(btn);
    });

    this.toolbarEl.appendChild(toolGroup);

    this.sizeSelectEl = document.createElement('div');
    this.sizeSelectEl.className = 'pfw-size-select';
    Object.assign(this.sizeSelectEl.style, {
      display: 'flex',
      gap: '4px',
      marginLeft: '8px',
    });
    this.buildSizeSelect();
    this.toolbarEl.appendChild(this.sizeSelectEl);

    const mirrorLabel = document.createElement('span');
    mirrorLabel.textContent = '镜像:';
    Object.assign(mirrorLabel.style, {
      color: '#aaa',
      fontSize: '12px',
      marginLeft: '16px',
    });
    this.toolbarEl.appendChild(mirrorLabel);

    this.mirrorSelectEl = document.createElement('select');
    this.mirrorSelectEl.className = 'pfw-mirror-select';
    const mirrorOptions: Array<{ value: MirrorMode; label: string }> = [
      { value: 'none', label: '无' },
      { value: 'horizontal', label: '水平' },
      { value: 'vertical', label: '垂直' },
      { value: 'both', label: '双轴' },
    ];
    mirrorOptions.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      this.mirrorSelectEl.appendChild(opt);
    });
    Object.assign(this.mirrorSelectEl.style, {
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      border: '1px solid #444',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '12px',
      cursor: 'pointer',
    });
    this.mirrorSelectEl.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as MirrorMode;
      this.engine.setMirrorMode(mode);
    });
    this.toolbarEl.appendChild(this.mirrorSelectEl);

    const colorPanelWrapper = document.createElement('div');
    colorPanelWrapper.className = 'pfw-color-panel';
    Object.assign(colorPanelWrapper.style, {
      marginLeft: '20px',
      padding: '8px',
      background: 'rgba(42, 42, 42, 0.8)',
      borderRadius: '16px',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      gap: '6px',
    });

    this.colorPaletteEl = colorPanelWrapper;
    PALETTE.forEach((color, idx) => {
      const swatch = document.createElement('button');
      swatch.className = 'pfw-color-swatch';
      swatch.dataset.colorIndex = String(idx);
      Object.assign(swatch.style, {
        width: '20px',
        height: '20px',
        border: '2px solid transparent',
        borderRadius: '4px',
        background: color,
        cursor: 'pointer',
        padding: '0',
        transition: 'transform 150ms ease',
      });
      swatch.addEventListener('mouseenter', () => {
        swatch.style.transform = 'scale(1.15)';
      });
      swatch.addEventListener('mouseleave', () => {
        if (this.engine.getColorIndex() !== idx) {
          swatch.style.transform = 'scale(1)';
        }
      });
      swatch.addEventListener('mousedown', () => {
        swatch.style.transform = 'scale(0.9)';
      });
      swatch.addEventListener('mouseup', () => {
        swatch.style.transform = 'scale(1.1)';
      });
      swatch.addEventListener('click', () => {
        this.engine.setColorIndex(idx);
        this.updateColorSwatches();
      });
      colorPanelWrapper.appendChild(swatch);
    });
    this.toolbarEl.appendChild(colorPanelWrapper);

    const spacer = document.createElement('div');
    spacer.style.flexGrow = '1';
    this.toolbarEl.appendChild(spacer);

    const fpsLabel = document.createElement('span');
    fpsLabel.textContent = 'FPS:';
    Object.assign(fpsLabel.style, {
      color: '#aaa',
      fontSize: '12px',
      marginRight: '4px',
    });
    this.toolbarEl.appendChild(fpsLabel);

    this.fpsSelectEl = document.createElement('select');
    this.fpsSelectEl.className = 'pfw-fps-select';
    [6, 12, 24].forEach(fps => {
      const opt = document.createElement('option');
      opt.value = String(fps);
      opt.textContent = `${fps}fps`;
      this.fpsSelectEl.appendChild(opt);
    });
    (this.fpsSelectEl as HTMLSelectElement).value = '24';
    Object.assign(this.fpsSelectEl.style, {
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      border: '1px solid #444',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '12px',
      cursor: 'pointer',
      marginRight: '12px',
    });
    this.fpsSelectEl.addEventListener('change', (e) => {
      const fps = parseInt((e.target as HTMLSelectElement).value, 10);
      this.engine.setFps(fps);
    });
    this.toolbarEl.appendChild(this.fpsSelectEl);

    this.playBtn = document.createElement('button');
    this.playBtn.className = 'pfw-play-btn';
    this.playBtn.textContent = '▶ 播放';
    Object.assign(this.playBtn.style, {
      padding: '6px 16px',
      border: 'none',
      borderRadius: '6px',
      background: 'linear-gradient(135deg, #4ECDC4, #2EC4B6)',
      color: '#fff',
      fontSize: '13px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 150ms ease',
      marginRight: '8px',
    });
    this.playBtn.addEventListener('mouseenter', () => {
      this.playBtn.style.boxShadow = '0 0 12px rgba(78, 205, 196, 0.6)';
    });
    this.playBtn.addEventListener('mouseleave', () => {
      this.playBtn.style.boxShadow = 'none';
    });
    this.playBtn.addEventListener('mousedown', () => {
      this.playBtn.style.transform = 'scale(0.95)';
    });
    this.playBtn.addEventListener('mouseup', () => {
      this.playBtn.style.transform = 'scale(1)';
    });
    this.playBtn.addEventListener('click', () => {
      this.engine.togglePlay();
      this.updatePlayButton();
    });
    this.toolbarEl.appendChild(this.playBtn);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'pfw-export-btn';
    exportBtn.textContent = '导出精灵图';
    Object.assign(exportBtn.style, {
      padding: '6px 14px',
      border: '1px solid #D4AF37',
      borderRadius: '6px',
      background: 'transparent',
      color: '#D4AF37',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 150ms ease',
      marginRight: '6px',
    });
    exportBtn.addEventListener('mouseenter', () => {
      exportBtn.style.background = 'rgba(212, 175, 55, 0.15)';
    });
    exportBtn.addEventListener('mouseleave', () => {
      exportBtn.style.background = 'transparent';
    });
    exportBtn.addEventListener('mousedown', () => {
      exportBtn.style.transform = 'scale(0.95)';
    });
    exportBtn.addEventListener('mouseup', () => {
      exportBtn.style.transform = 'scale(1)';
    });
    exportBtn.addEventListener('click', () => this.exportSpriteSheet());
    this.toolbarEl.appendChild(exportBtn);

    const exportGifBtn = document.createElement('button');
    exportGifBtn.className = 'pfw-export-gif-btn';
    exportGifBtn.textContent = '导出GIF';
    Object.assign(exportGifBtn.style, {
      padding: '6px 14px',
      border: '1px solid #4ECDC4',
      borderRadius: '6px',
      background: 'transparent',
      color: '#4ECDC4',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 150ms ease',
    });
    exportGifBtn.addEventListener('mouseenter', () => {
      exportGifBtn.style.background = 'rgba(78, 205, 196, 0.15)';
    });
    exportGifBtn.addEventListener('mouseleave', () => {
      exportGifBtn.style.background = 'transparent';
    });
    exportGifBtn.addEventListener('mousedown', () => {
      exportGifBtn.style.transform = 'scale(0.95)';
    });
    exportGifBtn.addEventListener('mouseup', () => {
      exportGifBtn.style.transform = 'scale(1)';
    });
    exportGifBtn.addEventListener('click', () => this.exportGif());
    this.toolbarEl.appendChild(exportGifBtn);

    this.container.appendChild(this.toolbarEl);
  }

  private buildSizeSelect(): void {
    this.sizeSelectEl.innerHTML = '';
    const tool = this.engine.getTool();
    let sizes: number[] = [];
    let currentSize: number = 1;

    if (tool === 'pencil') {
      sizes = [1, 2];
      currentSize = this.engine.getPencilSize();
    } else if (tool === 'eraser') {
      sizes = [2, 4];
      currentSize = this.engine.getEraserSize();
    } else {
      return;
    }

    sizes.forEach(size => {
      const btn = document.createElement('button');
      btn.textContent = `${size}px`;
      btn.dataset.size = String(size);
      const isActive = size === currentSize;
      Object.assign(btn.style, {
        padding: '2px 8px',
        border: isActive ? '1px solid #4ECDC4' : '1px solid #555',
        borderRadius: '4px',
        background: isActive ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255,255,255,0.05)',
        color: isActive ? '#4ECDC4' : '#aaa',
        fontSize: '11px',
        cursor: 'pointer',
        transition: 'all 150ms ease',
      });
      btn.addEventListener('click', () => {
        if (tool === 'pencil') {
          this.engine.setPencilSize(size as PencilSize);
        } else if (tool === 'eraser') {
          this.engine.setEraserSize(size as EraserSize);
        }
        this.buildSizeSelect();
      });
      this.sizeSelectEl.appendChild(btn);
    });
  }

  private buildMainArea(): void {
    const mainArea = document.createElement('div');
    mainArea.className = 'pfw-main-area';
    Object.assign(mainArea.style, {
      display: 'flex',
      flex: '1',
      overflow: 'hidden',
      minHeight: '0',
    });

    this.buildFramesList(mainArea);
    this.buildCanvasArea(mainArea);
    this.buildTimeline(mainArea);

    this.container.appendChild(mainArea);
  }

  private buildFramesList(parent: HTMLElement): void {
    this.framesListEl = document.createElement('div');
    this.framesListEl.className = 'pfw-frames-list';
    Object.assign(this.framesListEl.style, {
      width: '100px',
      background: 'rgba(26, 26, 26, 0.5)',
      padding: '12px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      overflowY: 'auto',
      flexShrink: '0',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    });

    const listTitle = document.createElement('div');
    listTitle.textContent = '帧列表';
    Object.assign(listTitle.style, {
      color: '#aaa',
      fontSize: '12px',
      marginBottom: '8px',
      fontWeight: 'bold',
      textAlign: 'center',
    });
    this.framesListEl.appendChild(listTitle);

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ 新建帧';
    Object.assign(addBtn.style, {
      width: '100%',
      padding: '6px',
      border: '1px dashed #666',
      borderRadius: '6px',
      background: 'transparent',
      color: '#888',
      fontSize: '12px',
      cursor: 'pointer',
      marginBottom: '8px',
      transition: 'all 150ms ease',
    });
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.borderColor = '#D4AF37';
      addBtn.style.color = '#D4AF37';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.borderColor = '#666';
      addBtn.style.color = '#888';
    });
    addBtn.addEventListener('mousedown', () => {
      addBtn.style.transform = 'scale(0.95)';
    });
    addBtn.addEventListener('mouseup', () => {
      addBtn.style.transform = 'scale(1)';
    });
    addBtn.addEventListener('click', () => {
      if (this.engine.getFrameCount() < MAX_FRAMES) {
        this.engine.addFrame(true);
      }
    });
    this.framesListEl.appendChild(addBtn);

    const dupBtn = document.createElement('button');
    dupBtn.textContent = '复制当前帧';
    Object.assign(dupBtn.style, {
      width: '100%',
      padding: '6px',
      border: '1px solid #555',
      borderRadius: '6px',
      background: 'rgba(255,255,255,0.05)',
      color: '#aaa',
      fontSize: '11px',
      cursor: 'pointer',
      marginBottom: '12px',
      transition: 'all 150ms ease',
    });
    dupBtn.addEventListener('mouseenter', () => {
      dupBtn.style.borderColor = '#4ECDC4';
      dupBtn.style.color = '#4ECDC4';
    });
    dupBtn.addEventListener('mouseleave', () => {
      dupBtn.style.borderColor = '#555';
      dupBtn.style.color = '#aaa';
    });
    dupBtn.addEventListener('click', () => {
      this.engine.duplicateFrame(this.engine.getCurrentFrameIndex());
    });
    this.framesListEl.appendChild(dupBtn);

    parent.appendChild(this.framesListEl);
  }

  private buildCanvasArea(parent: HTMLElement): void {
    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'pfw-canvas-wrapper';
    Object.assign(canvasWrapper.style, {
      flex: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      minWidth: '600px',
      overflow: 'auto',
      padding: '24px',
      boxSizing: 'border-box',
    });

    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'pfw-canvas-container';
    Object.assign(canvasContainer.style, {
      position: 'relative',
      borderRadius: '8px',
      padding: '4px',
      background: '#2C2C2C',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    });

    const canvasSize = 32 * this.pixelScale;

    this.gridCanvas = document.createElement('canvas');
    this.gridCanvas.width = canvasSize;
    this.gridCanvas.height = canvasSize;
    Object.assign(this.gridCanvas.style, {
      position: 'absolute',
      top: '4px',
      left: '4px',
      pointerEvents: 'none',
      borderRadius: '4px',
    });
    this.drawGrid();
    canvasContainer.appendChild(this.gridCanvas);

    this.mainCanvas = document.createElement('canvas');
    this.mainCanvas.className = 'pfw-main-canvas';
    this.mainCanvas.width = canvasSize;
    this.mainCanvas.height = canvasSize;
    const ctx = this.mainCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.mainCtx = ctx;
    this.mainCtx.imageSmoothingEnabled = false;
    Object.assign(this.mainCanvas.style, {
      display: 'block',
      borderRadius: '4px',
      imageRendering: 'pixelated',
      cursor: 'crosshair',
    });
    canvasContainer.appendChild(this.mainCanvas);

    this.magnifierEl = document.createElement('div');
    this.magnifierEl.className = 'pfw-magnifier';
    Object.assign(this.magnifierEl.style, {
      position: 'absolute',
      width: '160px',
      height: '160px',
      border: '3px solid rgba(212, 175, 55, 0.8)',
      borderRadius: '50%',
      pointerEvents: 'none',
      display: 'none',
      overflow: 'hidden',
      boxShadow: '0 0 30px rgba(0,0,0,0.7), inset 0 0 20px rgba(255,255,255,0.1)',
      zIndex: '100',
      background: 'rgba(0,0,0,0.9)',
    });
    const magCanvas = document.createElement('canvas');
    magCanvas.width = 160;
    magCanvas.height = 160;
    magCanvas.style.imageRendering = 'pixelated';
    magCanvas.style.width = '100%';
    magCanvas.style.height = '100%';
    this.magnifierEl.appendChild(magCanvas);
    canvasContainer.appendChild(this.magnifierEl);

    const historyBtns = document.createElement('div');
    historyBtns.className = 'pfw-history-btns';
    Object.assign(historyBtns.style, {
      position: 'absolute',
      bottom: '16px',
      right: '16px',
      display: 'flex',
      gap: '8px',
      zIndex: '10',
    });

    this.undoBtn = this.createHistoryButton('↶', '撤销', () => this.engine.undo());
    this.redoBtn = this.createHistoryButton('↷', '重做', () => this.engine.redo());

    historyBtns.appendChild(this.undoBtn);
    historyBtns.appendChild(this.redoBtn);
    canvasContainer.appendChild(historyBtns);

    canvasWrapper.appendChild(canvasContainer);
    parent.appendChild(canvasWrapper);
  }

  private createHistoryButton(symbol: string, title: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.title = title;
    btn.textContent = symbol;
    Object.assign(btn.style, {
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      border: 'none',
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: '#fff',
      fontSize: '16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 150ms ease',
      position: 'relative',
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255,255,255,0.25)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255,255,255,0.1)';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.9)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  private buildTimeline(parent: HTMLElement): void {
    this.timelineEl = document.createElement('div');
    this.timelineEl.className = 'pfw-timeline';
    Object.assign(this.timelineEl.style, {
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(26, 26, 26, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '12px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      minWidth: '400px',
      zIndex: '5',
    });

    const timelineHeader = document.createElement('div');
    timelineHeader.className = 'pfw-timeline-header';
    Object.assign(timelineHeader.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    });

    const timelineLabel = document.createElement('span');
    timelineLabel.textContent = '时间轴';
    Object.assign(timelineLabel.style, {
      color: '#aaa',
      fontSize: '11px',
      fontWeight: 'bold',
    });
    timelineHeader.appendChild(timelineLabel);

    const frameCounter = document.createElement('span');
    frameCounter.className = 'pfw-frame-counter';
    frameCounter.textContent = `0 / ${MAX_FRAMES}`;
    Object.assign(frameCounter.style, {
      color: '#888',
      fontSize: '11px',
    });
    timelineHeader.appendChild(frameCounter);

    this.timelineEl.appendChild(timelineHeader);

    this.timelineFramesEl = document.createElement('div');
    this.timelineFramesEl.className = 'pfw-timeline-frames';
    Object.assign(this.timelineFramesEl.style, {
      display: 'flex',
      gap: '6px',
      overflowX: 'auto',
      padding: '4px 0',
    });
    this.timelineEl.appendChild(this.timelineFramesEl);

    const fpsRow = document.createElement('div');
    fpsRow.className = 'pfw-fps-row';
    Object.assign(fpsRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginTop: '4px',
      padding: '6px 8px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '6px',
    });
    const fpsLabel = document.createElement('span');
    fpsLabel.textContent = '帧率';
    Object.assign(fpsLabel.style, {
      color: '#aaa',
      fontSize: '11px',
      minWidth: '28px',
    });
    const fpsSlider = document.createElement('input');
    fpsSlider.type = 'range';
    fpsSlider.min = '1';
    fpsSlider.max = '30';
    fpsSlider.step = '1';
    fpsSlider.value = '24';
    fpsSlider.className = 'pfw-fps-slider';
    Object.assign(fpsSlider.style, {
      flex: '1',
      accentColor: '#4ECDC4',
      height: '18px',
      cursor: 'pointer',
    });
    const fpsValue = document.createElement('span');
    fpsValue.textContent = '24 fps';
    fpsValue.className = 'pfw-fps-value';
    Object.assign(fpsValue.style, {
      color: '#4ECDC4',
      fontSize: '12px',
      fontWeight: 'bold',
      minWidth: '50px',
      textAlign: 'right',
    });
    fpsSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.engine.setFps(val);
      fpsValue.textContent = `${val} fps`;
    });
    fpsRow.appendChild(fpsLabel);
    fpsRow.appendChild(fpsSlider);
    fpsRow.appendChild(fpsValue);
    this.timelineEl.appendChild(fpsRow);

    this.progressBarEl = document.createElement('div');
    this.progressBarEl.className = 'pfw-progress-bar';
    Object.assign(this.progressBarEl.style, {
      height: '3px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '2px',
      overflow: 'hidden',
      display: 'none',
      marginTop: '2px',
    });
    const progressFill = document.createElement('div');
    progressFill.className = 'pfw-progress-fill';
    progressFill.style.width = '0%';
    Object.assign(progressFill.style, {
      height: '100%',
      background: 'linear-gradient(90deg, #D4AF37, #FFE66D)',
      transition: 'width 50ms linear',
    });
    this.progressBarEl.appendChild(progressFill);
    this.timelineEl.appendChild(this.progressBarEl);

    parent.appendChild(this.timelineEl);
  }

  private buildInfoPanel(): void {
    this.infoPanelEl = document.createElement('div');
    this.infoPanelEl.className = 'pfw-info-panel';
    Object.assign(this.infoPanelEl.style, {
      position: 'absolute',
      right: '16px',
      top: '80px',
      width: '180px',
      background: 'rgba(26, 26, 26, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '10px',
      padding: '14px',
      border: '1px solid rgba(255,255,255,0.08)',
      zIndex: '5',
    });

    const title = document.createElement('div');
    title.textContent = '帧信息';
    Object.assign(title.style, {
      color: '#D4AF37',
      fontSize: '13px',
      fontWeight: 'bold',
      marginBottom: '12px',
      borderBottom: '1px solid rgba(212,175,55,0.3)',
      paddingBottom: '6px',
    });
    this.infoPanelEl.appendChild(title);

    const pixelRow = document.createElement('div');
    pixelRow.className = 'pfw-info-row';
    Object.assign(pixelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      fontSize: '12px',
    });
    const pixelLabel = document.createElement('span');
    pixelLabel.textContent = '已绘像素:';
    pixelLabel.style.color = '#888';
    this.pixelCountEl = document.createElement('span');
    this.pixelCountEl.style.color = '#4ECDC4';
    this.pixelCountEl.style.fontWeight = 'bold';
    pixelRow.appendChild(pixelLabel);
    pixelRow.appendChild(this.pixelCountEl);
    this.infoPanelEl.appendChild(pixelRow);

    const historyRow = document.createElement('div');
    historyRow.className = 'pfw-info-row';
    Object.assign(historyRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      fontSize: '12px',
    });
    const historyLabel = document.createElement('span');
    historyLabel.textContent = '历史步数:';
    historyLabel.style.color = '#888';
    this.historyCountEl = document.createElement('span');
    this.historyCountEl.style.color = '#aaa';
    historyRow.appendChild(historyLabel);
    historyRow.appendChild(this.historyCountEl);
    this.infoPanelEl.appendChild(historyRow);

    const currentRow = document.createElement('div');
    currentRow.className = 'pfw-info-row';
    Object.assign(currentRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
    });
    const currentLabel = document.createElement('span');
    currentLabel.textContent = '当前帧:';
    currentLabel.style.color = '#888';
    const currentValue = document.createElement('span');
    currentValue.textContent = '1';
    currentValue.style.color = '#fff';
    currentValue.id = 'pfw-current-frame-num';
    currentRow.appendChild(currentLabel);
    currentRow.appendChild(currentValue);
    this.infoPanelEl.appendChild(currentRow);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除当前帧';
    Object.assign(deleteBtn.style, {
      width: '100%',
      marginTop: '14px',
      padding: '6px',
      border: '1px solid #E71D36',
      borderRadius: '5px',
      background: 'transparent',
      color: '#E71D36',
      fontSize: '11px',
      cursor: 'pointer',
      transition: 'all 150ms ease',
    });
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = 'rgba(231, 29, 54, 0.15)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = 'transparent';
    });
    deleteBtn.addEventListener('mousedown', () => {
      deleteBtn.style.transform = 'scale(0.95)';
    });
    deleteBtn.addEventListener('mouseup', () => {
      deleteBtn.style.transform = 'scale(1)';
    });
    deleteBtn.addEventListener('click', () => {
      this.engine.deleteFrame(this.engine.getCurrentFrameIndex());
    });
    this.infoPanelEl.appendChild(deleteBtn);
  }

  private bindEvents(): void {
    this.mainCanvas.addEventListener('mousedown', this.onCanvasMouseDown);
    this.mainCanvas.addEventListener('mousemove', this.onCanvasMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
    this.mainCanvas.addEventListener('mouseenter', this.onCanvasMouseEnter);
    this.mainCanvas.addEventListener('mouseleave', this.onCanvasMouseLeave);

    window.addEventListener('keydown', this.onKeyDown);

    this.engine = Object.assign(this.engine, {
      _origCallbacks: (this.engine as any).callbacks || {},
    }) as PixelEngine;
  }

  private onCanvasMouseDown = (e: MouseEvent): void => {
    const { x, y } = this.getPixelCoords(e);
    this.engine.handleMouseDown(x, y);
    this.scheduleRender();
  };

  private onCanvasMouseMove = (e: MouseEvent): void => {
    const { x, y } = this.getPixelCoords(e);
    this.engine.handleMouseMove(x, y);

    if (this.engine.getTool() === 'eyedropper' && this.isEyedropperHover) {
      this.updateMagnifier(x, y, e.clientX, e.clientY);
    }

    this.scheduleRender();
  };

  private onWindowMouseUp = (): void => {
    this.engine.handleMouseUp();
    this.scheduleRender();
  };

  private onCanvasMouseEnter = (e: MouseEvent): void => {
    this.updateCursor();
    if (this.engine.getTool() === 'eyedropper') {
      this.isEyedropperHover = true;
      this.magnifierEl.style.display = 'block';
      const { x, y } = this.getPixelCoords(e);
      this.updateMagnifier(x, y, e.clientX, e.clientY);
    }
  };

  private onCanvasMouseLeave = (): void => {
    this.isEyedropperHover = false;
    this.magnifierEl.style.display = 'none';
    this.engine.handleMouseUp();
    this.scheduleRender();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      this.engine.redo();
    } else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.engine.undo();
    } else if (key === 'y' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.engine.redo();
    } else if (key === ' ') {
      e.preventDefault();
      this.engine.togglePlay();
      this.updatePlayButton();
    } else if (key === 'p') {
      this.engine.setTool('pencil');
      this.updateToolButtons();
      this.updateCursor();
    } else if (key === 'e') {
      this.engine.setTool('eraser');
      this.updateToolButtons();
      this.updateCursor();
      this.buildSizeSelect();
    } else if (key === 'f') {
      this.engine.setTool('fill');
      this.updateToolButtons();
      this.updateCursor();
    } else if (key === 'i') {
      this.engine.setTool('eyedropper');
      this.updateToolButtons();
      this.updateCursor();
    }
  };

  private getPixelCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.mainCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.pixelScale);
    const y = Math.floor((e.clientY - rect.top) / this.pixelScale);
    return { x, y };
  }

  private scheduleRender(): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.render();
      this.updateInfo();
      this.updateTimelineProgress();
    });
  }

  private render(): void {
    this.engine.renderToCanvas(this.mainCanvas, this.pixelScale);
    this.updateThumbnails();
  }

  private drawGrid(): void {
    const ctx = this.gridCanvas.getContext('2d');
    if (!ctx) return;
    const size = 32 * this.pixelScale;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.pixelScale, 0);
      ctx.lineTo(x * this.pixelScale, size);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.pixelScale);
      ctx.lineTo(size, y * this.pixelScale);
      ctx.stroke();
    }
  }

  private updateCursor(): void {
    const tool = this.engine.getTool();
    switch (tool) {
      case 'pencil':
        this.mainCanvas.style.cursor = 'crosshair';
        break;
      case 'eraser':
        this.mainCanvas.style.cursor = 'cell';
        break;
      case 'fill':
        this.mainCanvas.style.cursor = 'nesw-resize';
        break;
      case 'eyedropper':
        this.mainCanvas.style.cursor = 'copy';
        break;
      default:
        this.mainCanvas.style.cursor = 'crosshair';
    }
  }

  private updateMagnifier(px: number, py: number, clientX: number, clientY: number): void {
    const magCanvas = this.magnifierEl.querySelector('canvas') as HTMLCanvasElement;
    const magCtx = magCanvas.getContext('2d');
    if (!magCtx) return;

    const magScale = 10;
    magCtx.clearRect(0, 0, magCanvas.width, magCanvas.height);

    const pixels = this.engine.getCurrentFramePixels();
    if (!pixels) return;

    const viewSize = 16;
    const halfView = Math.floor(viewSize / 2);
    const offsetX = (magCanvas.width - viewSize * magScale) / 2;
    const offsetY = (magCanvas.height - viewSize * magScale) / 2;

    for (let y = 0; y < viewSize; y++) {
      for (let x = 0; x < viewSize; x++) {
        const srcX = px - halfView + x;
        const srcY = py - halfView + y;
        if (srcX >= 0 && srcX < CANVAS_WIDTH && srcY >= 0 && srcY < CANVAS_HEIGHT) {
          const idx = srcY * CANVAS_WIDTH + srcX;
          const colorIdx = pixels[idx];
          const drawX = offsetX + x * magScale;
          const drawY = offsetY + y * magScale;
          if (colorIdx < PALETTE.length) {
            magCtx.fillStyle = PALETTE[colorIdx];
            magCtx.fillRect(drawX, drawY, magScale, magScale);
          } else {
            magCtx.fillStyle = '#1A1A1A';
            magCtx.fillRect(drawX, drawY, magScale, magScale);
          }
          magCtx.strokeStyle = 'rgba(255,255,255,0.1)';
          magCtx.lineWidth = 1;
          magCtx.strokeRect(drawX + 0.5, drawY + 0.5, magScale - 1, magScale - 1);
        }
      }
    }

    magCtx.strokeStyle = '#D4AF37';
    magCtx.lineWidth = 2;
    magCtx.strokeRect(
      offsetX + halfView * magScale + 0.5,
      offsetY + halfView * magScale + 0.5,
      magScale - 1,
      magScale - 1
    );

    const parentRect = this.magnifierEl.parentElement!.getBoundingClientRect();
    this.magnifierEl.style.left = `${clientX - parentRect.left + 30}px`;
    this.magnifierEl.style.top = `${clientY - parentRect.top - 80}px`;
  }

  private updateToolButtons(): void {
    const current = this.engine.getTool();
    this.toolButtons.forEach((btn, type) => {
      if (type === current) {
        btn.style.color = '#4ECDC4';
        btn.style.background = 'rgba(78, 205, 196, 0.2)';
      } else {
        btn.style.color = '#cccccc';
        btn.style.background = 'transparent';
      }
    });
    this.buildSizeSelect();
  }

  private updateColorSwatches(): void {
    const current = this.engine.getColorIndex();
    const swatches = this.colorPaletteEl.querySelectorAll('.pfw-color-swatch');
    swatches.forEach((swatch, idx) => {
      if (idx === current) {
        (swatch as HTMLElement).style.borderColor = '#FFFFFF';
        (swatch as HTMLElement).style.transform = 'scale(1.1)';
      } else {
        (swatch as HTMLElement).style.borderColor = 'transparent';
        (swatch as HTMLElement).style.transform = 'scale(1)';
      }
    });
  }

  private updateThumbnails(): void {
    const frames = this.engine.getFrames();
    const currentIndex = this.engine.getCurrentFrameIndex();

    while (this.frameThumbnails.length < frames.length) {
      const thumb = document.createElement('canvas');
      thumb.width = 48;
      thumb.height = 48;
      thumb.className = 'pfw-frame-thumb';
      this.frameThumbnails.push(thumb);
    }
    while (this.frameThumbnails.length > frames.length) {
      this.frameThumbnails.pop();
    }

    frames.forEach((frame, idx) => {
      const thumb = this.frameThumbnails[idx];
      if (!thumb) return;
      const ctx = thumb.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, thumb.width, thumb.height);
      const scale = 48 / 32;
      for (let y = 0; y < CANVAS_HEIGHT; y++) {
        for (let x = 0; x < CANVAS_WIDTH; x++) {
          const colorIdx = frame.pixels[y * CANVAS_WIDTH + x];
          if (colorIdx < PALETTE.length) {
            ctx.fillStyle = PALETTE[colorIdx];
            ctx.fillRect(Math.floor(x * scale), Math.floor(y * scale), Math.ceil(scale), Math.ceil(scale));
          }
        }
      }
    });

    this.syncFramesUI(frames.length, currentIndex);
  }

  private syncFramesUI(count: number, currentIndex: number): void {
    const listChildren = this.framesListEl.querySelectorAll('.pfw-frame-item');
    listChildren.forEach(el => el.remove());

    const timelineChildren = this.timelineFramesEl.querySelectorAll('.pfw-tl-frame-item');
    timelineChildren.forEach(el => el.remove());

    for (let i = 0; i < count; i++) {
      const thumb = this.frameThumbnails[i];
      if (!thumb) continue;

      const frameItem = document.createElement('div');
      frameItem.className = 'pfw-frame-item';
      frameItem.dataset.frameIndex = String(i);
      frameItem.draggable = true;
      Object.assign(frameItem.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        padding: '4px',
        borderRadius: '6px',
        cursor: 'pointer',
        border: `2px solid ${i === currentIndex ? '#D4AF37' : 'transparent'}`,
        transition: 'all 150ms ease',
        background: i === currentIndex ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
      });

      const thumbClone = thumb.cloneNode() as HTMLCanvasElement;
      const srcCtx = thumb.getContext('2d');
      const dstCtx = thumbClone.getContext('2d');
      if (srcCtx && dstCtx) {
        dstCtx.drawImage(thumb, 0, 0);
      }
      thumbClone.width = 48;
      thumbClone.height = 48;
      Object.assign(thumbClone.style, {
        width: '48px',
        height: '48px',
        borderRadius: '4px',
        background: 'rgba(0,0,0,0.3)',
        imageRendering: 'pixelated',
      });
      frameItem.appendChild(thumbClone);

      const frameNum = document.createElement('span');
      frameNum.textContent = String(i + 1);
      Object.assign(frameNum.style, {
        fontSize: '10px',
        color: i === currentIndex ? '#D4AF37' : '#888',
      });
      frameItem.appendChild(frameNum);

      frameItem.addEventListener('click', () => {
        this.engine.setCurrentFrameIndex(i);
        this.updateAll();
      });

      frameItem.addEventListener('dragstart', (e) => {
        this.dragFromIndex = i;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(i));
        }
        frameItem.style.opacity = '0.5';
      });
      frameItem.addEventListener('dragend', () => {
        frameItem.style.opacity = '1';
        this.dragFromIndex = -1;
      });
      frameItem.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (this.dragFromIndex !== -1 && this.dragFromIndex !== i) {
          frameItem.style.borderColor = '#4ECDC4';
        }
      });
      frameItem.addEventListener('dragleave', () => {
        frameItem.style.borderColor = i === currentIndex ? '#D4AF37' : 'transparent';
      });
      frameItem.addEventListener('drop', (e) => {
        e.preventDefault();
        if (this.dragFromIndex !== -1 && this.dragFromIndex !== i) {
          this.engine.moveFrame(this.dragFromIndex, i);
          this.updateAll();
        }
        frameItem.style.borderColor = i === this.engine.getCurrentFrameIndex() ? '#D4AF37' : 'transparent';
      });

      this.framesListEl.appendChild(frameItem);

      const tlFrameItem = frameItem.cloneNode(true) as HTMLElement;
      tlFrameItem.className = 'pfw-tl-frame-item';
      tlFrameItem.dataset.frameIndex = String(i);
      tlFrameItem.draggable = true;
      Object.assign(tlFrameItem.style, {
        flexShrink: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        padding: '4px',
        borderRadius: '6px',
        cursor: 'pointer',
        border: `2px solid ${i === currentIndex ? '#D4AF37' : 'transparent'}`,
        transition: 'all 150ms ease',
        background: i === currentIndex ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
      });
      tlFrameItem.addEventListener('click', () => {
        this.engine.setCurrentFrameIndex(i);
        this.updateAll();
      });
      tlFrameItem.addEventListener('dragstart', (e) => {
        this.dragFromIndex = i;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(i));
        }
        tlFrameItem.style.opacity = '0.5';
      });
      tlFrameItem.addEventListener('dragend', () => {
        tlFrameItem.style.opacity = '1';
        this.dragFromIndex = -1;
      });
      tlFrameItem.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (this.dragFromIndex !== -1 && this.dragFromIndex !== i) {
          tlFrameItem.style.borderColor = '#4ECDC4';
        }
      });
      tlFrameItem.addEventListener('dragleave', () => {
        tlFrameItem.style.borderColor = i === currentIndex ? '#D4AF37' : 'transparent';
      });
      tlFrameItem.addEventListener('drop', (e) => {
        e.preventDefault();
        if (this.dragFromIndex !== -1 && this.dragFromIndex !== i) {
          this.engine.moveFrame(this.dragFromIndex, i);
          this.updateAll();
        }
      });
      this.timelineFramesEl.appendChild(tlFrameItem);
    }

    const counter = this.timelineEl.querySelector('.pfw-frame-counter') as HTMLElement;
    if (counter) {
      counter.textContent = `${count} / ${MAX_FRAMES}`;
    }
  }

  private updateInfo(): void {
    const { filled, total } = this.engine.countPixels();
    this.pixelCountEl.textContent = `${filled} / ${total}`;
    const undoCount = this.engine.getUndoCount();
    const redoCount = this.engine.getRedoCount();
    this.historyCountEl.textContent = `${undoCount} / 20`;

    const currentNum = document.getElementById('pfw-current-frame-num');
    if (currentNum) {
      currentNum.textContent = String(this.engine.getCurrentFrameIndex() + 1);
    }

    const undoLabel = this.undoBtn.querySelector('.pfw-history-count');
    if (!undoLabel) {
      const span = document.createElement('span');
      span.className = 'pfw-history-count';
      Object.assign(span.style, {
        position: 'absolute',
        bottom: '-2px',
        right: '-2px',
        fontSize: '9px',
        background: '#4ECDC4',
        color: '#fff',
        borderRadius: '50%',
        width: '14px',
        height: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: '1',
      });
      this.undoBtn.appendChild(span);
    }
    const undoCountSpan = this.undoBtn.querySelector('.pfw-history-count');
    if (undoCountSpan) {
      undoCountSpan.textContent = String(undoCount);
      (undoCountSpan as HTMLElement).style.display = undoCount > 0 ? 'flex' : 'none';
    }

    const redoLabel = this.redoBtn.querySelector('.pfw-history-count');
    if (!redoLabel) {
      const span = document.createElement('span');
      span.className = 'pfw-history-count';
      Object.assign(span.style, {
        position: 'absolute',
        bottom: '-2px',
        right: '-2px',
        fontSize: '9px',
        background: '#D4AF37',
        color: '#fff',
        borderRadius: '50%',
        width: '14px',
        height: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: '1',
      });
      this.redoBtn.appendChild(span);
    }
    const redoCountSpan = this.redoBtn.querySelector('.pfw-history-count');
    if (redoCountSpan) {
      redoCountSpan.textContent = String(redoCount);
      (redoCountSpan as HTMLElement).style.display = redoCount > 0 ? 'flex' : 'none';
    }
  }

  private updatePlayButton(): void {
    const playing = this.engine.getIsPlaying();
    this.playBtn.textContent = playing ? '⏸ 暂停' : '▶ 播放';
    if (playing) {
      this.progressBarEl.style.display = 'block';
    } else {
      this.progressBarEl.style.display = 'none';
    }
  }

  private updateTimelineProgress(): void {
    if (!this.engine.getIsPlaying()) return;
    const frameCount = this.engine.getFrameCount();
    const currentFrame = this.engine.getPlayFrameIndex();
    const progress = ((currentFrame + 1) / frameCount) * 100;
    const fill = this.progressBarEl.querySelector('.pfw-progress-fill') as HTMLElement;
    if (fill) {
      fill.style.width = `${progress}%`;
    }
  }

  private updateAll(): void {
    this.scheduleRender();
    this.updateToolButtons();
    this.updateColorSwatches();
    this.updatePlayButton();
    this.updateInfo();
  }

  private exportSpriteSheet(): void {
    const canvas = this.engine.exportSpriteSheet();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `spritesheet_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  private exportGif(): void {
    const blob = this.engine.exportGif();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `animation_${Date.now()}.gif`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  public destroy(): void {
    window.removeEventListener('mouseup', this.onWindowMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
