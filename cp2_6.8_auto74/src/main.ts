import { Editor, Shape, PhysicsType } from './editor';
import { Playback } from './playback';

type Mode = 'edit' | 'play';

class App {
  editor: Editor;
  playback: Playback;
  canvas: HTMLCanvasElement;
  mode: Mode = 'edit';
  flashTimeout: number | null = null;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.editor = new Editor(this.canvas);
    this.playback = new Playback(this.canvas);
    this.bindUI();
    this.bindEditor();
    this.loop();
  }

  private bindUI() {
    const btnEdit = document.getElementById('btn-edit')!;
    const btnPlay = document.getElementById('btn-play')!;
    const btnRect = document.getElementById('tool-rect')!;
    const btnCircle = document.getElementById('tool-circle')!;
    const btnTriangle = document.getElementById('tool-triangle')!;
    const btnDelete = document.getElementById('btn-delete')!;
    const propType = document.getElementById('prop-type') as HTMLSelectElement;

    btnEdit.addEventListener('click', () => this.setMode('edit'));
    btnPlay.addEventListener('click', () => this.setMode('play'));

    btnRect.addEventListener('click', () => {
      this.editor.setTool('rect');
      this.updateToolButtons('rect');
    });
    btnCircle.addEventListener('click', () => {
      this.editor.setTool('circle');
      this.updateToolButtons('circle');
    });
    btnTriangle.addEventListener('click', () => {
      this.editor.setTool('triangle');
      this.updateToolButtons('triangle');
    });

    btnDelete.addEventListener('click', () => {
      this.editor.deleteSelected();
    });

    propType.addEventListener('change', (e) => {
      const shape = this.editor.getSelectedShape();
      if (shape) {
        this.editor.setShapePhysics(shape.id, (e.target as HTMLSelectElement).value as PhysicsType);
      }
    });

    window.addEventListener('resize', () => {
      this.editor.resize();
      if (this.mode === 'edit') this.editor.render();
    });

    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'edit') return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.editor.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        this.editor.redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'SELECT') {
          this.editor.deleteSelected();
        }
      }
    });

    this.playback.onFlash = (color) => this.flashScreen(color);
  }

  private flashScreen(color: 'red' | 'blue') {
    const overlay = document.getElementById('flash-overlay')!;
    overlay.classList.remove('red', 'blue');
    void overlay.offsetWidth;
    overlay.classList.add(color);
    if (this.flashTimeout) clearTimeout(this.flashTimeout);
    this.flashTimeout = window.setTimeout(() => {
      overlay.classList.remove('red', 'blue');
    }, 300);
  }

  private updateToolButtons(active: string) {
    (['rect', 'circle', 'triangle'] as const).forEach(t => {
      const btn = document.getElementById('tool-' + t)!;
      btn.classList.toggle('active', t === active);
    });
  }

  private bindEditor() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.mode === 'edit') this.editor.onMouseDown(e);
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.mode === 'edit') this.editor.onMouseMove(e);
    });
    this.canvas.addEventListener('mouseup', (e) => {
      if (this.mode === 'edit') this.editor.onMouseUp(e);
    });
    this.canvas.addEventListener('mouseleave', (e) => {
      if (this.mode === 'edit') this.editor.onMouseUp(e);
    });

    this.editor.onSelectionChange = (shape) => this.updateProperties(shape);
    this.editor.onShapesChange = () => {};
  }

  private updateProperties(shape: Shape | null) {
    const panel = document.getElementById('properties')!;
    const title = document.getElementById('prop-title')!;
    const propType = document.getElementById('prop-type') as HTMLSelectElement;

    if (!shape) {
      panel.classList.remove('visible');
      return;
    }

    panel.classList.add('visible');
    const typeNames: Record<string, string> = {
      rect: '矩形',
      circle: '圆形',
      triangle: '三角形'
    };
    title.textContent = `${typeNames[shape.type]}属性`;
    propType.value = shape.physics;
  }

  private setMode(mode: Mode) {
    this.mode = mode;
    const btnEdit = document.getElementById('btn-edit')!;
    const btnPlay = document.getElementById('btn-play')!;
    const sidebar = document.getElementById('sidebar')!;
    const props = document.getElementById('properties')!;
    const hint = document.getElementById('hint')!;
    const topbarRight = document.querySelector('#topbar > div:last-child') as HTMLElement;

    btnEdit.classList.toggle('active', mode === 'edit');
    btnPlay.classList.toggle('active', mode === 'play');

    if (mode === 'edit') {
      sidebar.classList.remove('hidden');
      hint.classList.remove('hidden');
      if (topbarRight) topbarRight.style.display = '';
      this.playback.stop();
      this.editor.resize();
      this.editor.render();
      this.updateProperties(this.editor.getSelectedShape());
    } else {
      sidebar.classList.add('hidden');
      props.classList.remove('visible');
      hint.classList.add('hidden');
      if (topbarRight) topbarRight.style.display = 'none';
      this.editor.resize();
      this.playback.setShapes(this.editor.state.shapes);
      this.playback.start();
    }
  }

  private loop() {
    let lastTime = performance.now();
    const targetDT = 1000 / 60;

    const tick = (now: number) => {
      const dt = now - lastTime;
      if (dt >= targetDT) {
        lastTime = now;
        if (this.mode === 'play') {
          this.playback.step();
          this.playback.render();
        } else {
          this.editor.tick();
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
