declare module 'svg-path-parser' {
  export interface SVGCommand {
    command: string;
    relative?: boolean;
    x?: number;
    y?: number;
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }

  export function parseSVG(d: string): SVGCommand[];
  export function makeAbsolute(commands: SVGCommand[]): SVGCommand[];
  export function normalize(commands: SVGCommand[]): SVGCommand[];
}
