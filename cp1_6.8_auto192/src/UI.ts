import * as THREE from 'three';
import { InkParticleSystem } from './InkParticleSystem';

const PRESET_COLORS = [
  new THREE.Color(0xff6b35),
  new THREE.Color(0x7b68ee),
  new THREE.Color(0x00d4aa),
];

export class UI {
  private inkSystem: InkParticleSystem;
  private camera: THREE.OrthographicCamera;
  private canvas: HTMLElement;
  private currentColorIndex: number = 0;
  private isPointerDown: boolean = false;
  private lastDropTime: number = 0;
  private dropInterval: number = 50;

  private colorBtns: NodeListOf<HTMLElement>;
  private clearBtn: HTMLElement;

  constructor(
    inkSystem: InkParticleSystem,
    camera: THREE.OrthographicCamera,
    canvas: HTMLElement
  ) {
    this.inkSystem = inkSystem;
    this.camera = camera;
    this.canvas = canvas;

    this.colorBtns = document.querySelectorAll('.color-btn');
    this.clearBtn = document.getElementById('clear-btn')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));

    this.colorBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => this.selectColor(idx));
    });

    this.clearBtn.addEventListener('click', () => {
      this.inkSystem.clear();
    });
  }

  private selectColor(index: number): void {
    this.currentColorIndex = index;
    this.colorBtns.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
  }

  private onPointerDown(e: PointerEvent): void {
    this.isPointerDown = true;
    this.dropInkAt(e.clientX, e.clientY);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isPointerDown) return;
    const now = performance.now();
    if (now - this.lastDropTime < this.dropInterval) return;
    this.lastDropTime = now;
    this.dropInkAt(e.clientX, e.clientY);
  }

  private onPointerUp(): void {
    this.isPointerDown = false;
  }

  private dropInkAt(clientX: number, clientY: number): void {
    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;

    const worldPos = new THREE.Vector3(ndcX, ndcY, 0).unproject(this.camera);

    this.inkSystem.addInkDrop(worldPos.x, worldPos.y, PRESET_COLORS[this.currentColorIndex]);
  }

  getCurrentColor(): THREE.Color {
    return PRESET_COLORS[this.currentColorIndex];
  }
}
