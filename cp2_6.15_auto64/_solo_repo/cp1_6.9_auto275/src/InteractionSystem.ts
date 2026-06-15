import * as THREE from 'three';
import { RuneSystem, Rune } from './RuneSystem';

export type SingleRuneCallback = (rune: Rune) => void;
export type MultiRuneCallback = (runes: Rune[]) => void;
export type EmptyClickCallback = () => void;

export class InteractionSystem {
  private container: HTMLElement;
  private camera: THREE.Camera;
  private runeSystem: RuneSystem;
  private onRuneClicked: SingleRuneCallback | null = null;
  onRuneHovered: ((rune: Rune | null) => void) | null = null;
  private onRunesSelected: MultiRuneCallback | null = null;
  private onEmptyClick: EmptyClickCallback | null = null;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragThreshold: number = 5;
  private hasMoved: boolean = false;

  private isBoxSelecting: boolean = false;
  private boxStartX: number = 0;
  private boxStartY: number = 0;
  private boxEndX: number = 0;
  private boxEndY: number = 0;
  private selectionBoxElement: HTMLElement;
  private boxSelectMode: boolean = false;

  private currentHoveredRune: Rune | null = null;
  private raycaster: THREE.Raycaster;

  constructor(
    container: HTMLElement,
    camera: THREE.Camera,
    runeSystem: RuneSystem
  ) {
    this.container = container;
    this.camera = camera;
    this.runeSystem = runeSystem;
    this.raycaster = new THREE.Raycaster();

    this.selectionBoxElement = document.getElementById('selection-box')!;

    this.bindEvents();
  }

  setRuneClickedCallback(callback: SingleRuneCallback): void {
    this.onRuneClicked = callback;
  }

  setRunesSelectedCallback(callback: MultiRuneCallback): void {
    this.onRunesSelected = callback;
  }

  setEmptyClickCallback(callback: EmptyClickCallback): void {
    this.onEmptyClick = callback;
  }

  enableBoxSelectMode(enabled: boolean): void {
    this.boxSelectMode = enabled;
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown);
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('mouseleave', this.onMouseLeave);
    this.container.addEventListener('contextmenu', this.onContextMenu);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 2 || this.boxSelectMode) {
      this.isBoxSelecting = true;
      this.boxStartX = e.clientX;
      this.boxStartY = e.clientY;
      this.boxEndX = e.clientX;
      this.boxEndY = e.clientY;
      this.updateSelectionBox();
      this.selectionBoxElement.style.display = 'block';
      return;
    }

    if (e.button !== 0) return;

    this.isDragging = true;
    this.hasMoved = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isBoxSelecting) {
      this.boxEndX = e.clientX;
      this.boxEndY = e.clientY;
      this.updateSelectionBox();
      return;
    }

    if (this.isDragging) {
      const dx = Math.abs(e.clientX - this.dragStartX);
      const dy = Math.abs(e.clientY - this.dragStartY);
      if (dx > this.dragThreshold || dy > this.dragThreshold) {
        this.hasMoved = true;
      }
    }

    if (!this.isDragging && !this.isBoxSelecting) {
      this.updateHover(e.clientX, e.clientY);
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (this.isBoxSelecting) {
      this.isBoxSelecting = false;
      this.selectionBoxElement.style.display = 'none';

      const width = Math.abs(this.boxEndX - this.boxStartX);
      const height = Math.abs(this.boxEndY - this.boxStartY);

      if (width > 10 && height > 10) {
        const rect = this.container.getBoundingClientRect();
        const x1 = Math.min(this.boxStartX, this.boxEndX) - rect.left;
        const y1 = Math.min(this.boxStartY, this.boxEndY) - rect.top;
        const x2 = Math.max(this.boxStartX, this.boxEndX) - rect.left;
        const y2 = Math.max(this.boxStartY, this.boxEndY) - rect.top;

        const runes = this.runeSystem.pickRunesInRect(
          x1 / rect.width, y1 / rect.height,
          x2 / rect.width, y2 / rect.height,
          this.camera, rect.width, rect.height
        );

        if (runes.length > 0 && this.onRunesSelected) {
          this.onRunesSelected(runes);
        } else if (this.onEmptyClick) {
          this.onEmptyClick();
        }
      } else {
        const rune = this.pickRuneAt(e.clientX, e.clientY);
        if (rune && this.onRuneClicked) {
          this.onRuneClicked(rune);
        } else if (!rune && this.onEmptyClick) {
          this.onEmptyClick();
        }
      }
      return;
    }

    if (!this.isDragging) return;
    this.isDragging = false;

    if (!this.hasMoved) {
      const rune = this.pickRuneAt(e.clientX, e.clientY);
      if (rune) {
        if (this.onRuneClicked) {
          this.onRuneClicked(rune);
        }
      } else {
        if (this.onEmptyClick) {
          this.onEmptyClick();
        }
      }
    }
  };

  private onMouseLeave = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
    }
    if (this.isBoxSelecting) {
      this.isBoxSelecting = false;
      this.selectionBoxElement.style.display = 'none';
    }
    if (this.currentHoveredRune) {
      this.runeSystem.setHovered(this.currentHoveredRune, false);
      this.currentHoveredRune = null;
      if (this.onRuneHovered) {
        this.onRuneHovered(null);
      }
    }
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private updateHover(clientX: number, clientY: number): void {
    const rune = this.pickRuneAt(clientX, clientY);

    if (rune !== this.currentHoveredRune) {
      if (this.currentHoveredRune) {
        this.runeSystem.setHovered(this.currentHoveredRune, false);
      }

      this.currentHoveredRune = rune;

      if (rune) {
        this.runeSystem.setHovered(rune, true);
        this.container.style.cursor = 'pointer';
      } else {
        this.container.style.cursor = 'default';
      }

      if (this.onRuneHovered) {
        this.onRuneHovered(rune);
      }
    }
  }

  private pickRuneAt(clientX: number, clientY: number): Rune | null {
    const rect = this.container.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return this.runeSystem.pickRune(x, y, this.camera);
  }

  private updateSelectionBox(): void {
    const left = Math.min(this.boxStartX, this.boxEndX);
    const top = Math.min(this.boxStartY, this.boxEndY);
    const width = Math.abs(this.boxEndX - this.boxStartX);
    const height = Math.abs(this.boxEndY - this.boxStartY);

    this.selectionBoxElement.style.left = `${left}px`;
    this.selectionBoxElement.style.top = `${top}px`;
    this.selectionBoxElement.style.width = `${width}px`;
    this.selectionBoxElement.style.height = `${height}px`;
  }

  dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('mouseleave', this.onMouseLeave);
    this.container.removeEventListener('contextmenu', this.onContextMenu);
  }
}
