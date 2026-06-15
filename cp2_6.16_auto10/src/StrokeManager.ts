export type StrokeType = 'pen' | 'brush' | 'highlighter';

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface Stroke {
  id: number;
  type: StrokeType;
  color: string;
  thickness: number;
  points: Point[];
}

export class StrokeManager {
  private strokes: Stroke[] = [];
  private maxUndoSteps: number = 30;
  private currentId: number = 0;

  addStroke(stroke: Omit<Stroke, 'id'>): Stroke {
    const newStroke: Stroke = {
      ...stroke,
      id: ++this.currentId
    };
    this.strokes.push(newStroke);
    if (this.strokes.length > this.maxUndoSteps) {
      this.strokes.shift();
    }
    return newStroke;
  }

  undo(): Stroke | null {
    const removed = this.strokes.pop();
    return removed || null;
  }

  clear(): void {
    this.strokes = [];
  }

  getStrokes(): Stroke[] {
    return [...this.strokes];
  }

  getStrokeCount(): number {
    return this.strokes.length;
  }

  canUndo(): boolean {
    return this.strokes.length > 0;
  }
}
