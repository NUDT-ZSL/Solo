declare module 'tinycolor2' {
  interface ColorInput {
    h: number;
    s: number;
    v: number;
  }

  interface Rgb {
    r: number;
    g: number;
    b: number;
    a?: number;
  }

  interface Hsl {
    h: number;
    s: number;
    l: number;
    a?: number;
  }

  interface Hsv {
    h: number;
    s: number;
    v: number;
    a?: number;
  }

  class TinyColor {
    constructor(color?: string | ColorInput | Rgb | Hsl | Hsv);
    toRgb(): Rgb;
    toHsl(): Hsl;
    toHsv(): Hsv;
    toHslString(): string;
    toHexString(): string;
    toRgbString(): string;
    isDark(): boolean;
    isLight(): boolean;
    clone(): TinyColor;
  }

  function tinycolor(color?: string | ColorInput | Rgb | Hsl | Hsv): TinyColor;

  export = tinycolor;
}
