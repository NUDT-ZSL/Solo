import * as THREE from 'three';
import { ClayModel, VertexData } from './clayModel';

export class TextureRenderer {
  private clayModel: ClayModel;
  private hueShift: number = 0;
  private targetHueShift: number = 0;
  private color: THREE.Color;

  constructor(clayModel: ClayModel) {
    this.clayModel = clayModel;
    this.color = new THREE.Color();
  }

  getHueShift(): number {
    return this.hueShift;
  }

  shiftHue(delta: number = 60): void {
    this.targetHueShift = (this.targetHueShift + delta) % 360;
    if (this.targetHueShift < 0) this.targetHueShift += 360;
  }

  setHueShift(value: number): void {
    this.targetHueShift = ((value % 360) + 360) % 360;
  }

  update(deltaTime: number = 1 / 60): void {
    const hueSpeed = 360;
    const diff = this.targetHueShift - this.hueShift;

    if (Math.abs(diff) > 0.5) {
      const step = Math.sign(diff) * Math.min(Math.abs(diff), hueSpeed * deltaTime);
      this.hueShift += step;
      if (this.hueShift < 0) this.hueShift += 360;
      if (this.hueShift >= 360) this.hueShift -= 360;
    } else {
      this.hueShift = this.targetHueShift;
    }

    this.clayModel.updateColorsByOffset(this.hueShift);
  }

  private offsetToHSL(offset: number): { h: number; s: number; l: number } {
    if (offset <= 0.01) {
      return { h: 0, s: 0, l: 0.5 };
    }

    const clampedOffset = Math.min(8, Math.max(0, offset));
    const baseHue = clampedOffset * 30;
    const shiftedHue = (baseHue + this.hueShift) % 360;

    return { h: shiftedHue, s: 0.8, l: 0.6 };
  }

  getColorForOffset(offset: number): THREE.Color {
    const hsl = this.offsetToHSL(offset);
    return new THREE.Color().setHSL(hsl.h / 360, hsl.s, hsl.l);
  }

  updateVertexColors(vertexData: VertexData[], colors: Float32Array): void {
    const count = vertexData.length;

    for (let i = 0; i < count; i++) {
      const ix4 = i * 4;
      const offset = vertexData[i].currentOffset;
      const hsl = this.offsetToHSL(offset);

      this.color.setHSL(hsl.h / 360, hsl.s, hsl.l);
      colors[ix4] = this.color.r;
      colors[ix4 + 1] = this.color.g;
      colors[ix4 + 2] = this.color.b;
      colors[ix4 + 3] = 0.8;
    }
  }

  applyGradientStep(steps: { offset: number; hue: number; sat: number; light: number }[]): void {
    const vertexData = this.clayModel.getVertexData();
    const colors = this.clayModel.getColors();
    const count = vertexData.length;

    for (let i = 0; i < count; i++) {
      const ix4 = i * 4;
      const offset = vertexData[i].currentOffset;

      let h = 0, s = 0, l = 0.5;

      for (let j = 0; j < steps.length - 1; j++) {
        const step1 = steps[j];
        const step2 = steps[j + 1];

        if (offset >= step1.offset && offset <= step2.offset) {
          const t = (offset - step1.offset) / (step2.offset - step1.offset);
          h = step1.hue + (step2.hue - step1.hue) * t;
          s = step1.sat + (step2.sat - step1.sat) * t;
          l = step1.light + (step2.light - step1.light) * t;
          break;
        }
      }

      if (offset > steps[steps.length - 1].offset) {
        h = steps[steps.length - 1].hue;
        s = steps[steps.length - 1].sat;
        l = steps[steps.length - 1].light;
      }

      const shiftedH = (h + this.hueShift) % 360;
      this.color.setHSL(shiftedH / 360, s, l);

      colors[ix4] = this.color.r;
      colors[ix4 + 1] = this.color.g;
      colors[ix4 + 2] = this.color.b;
      colors[ix4 + 3] = 0.8;
    }
  }

  reset(): void {
    this.hueShift = 0;
    this.targetHueShift = 0;
  }
}
