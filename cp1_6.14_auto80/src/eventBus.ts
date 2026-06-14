export type VoxelGrid = number[][][];

export interface VoxelsUpdatedData {
  grid: VoxelGrid;
  count: number;
}

export interface MaterialChangedData {
  materialId: number;
}

export interface CameraChangedData {
  azimuth: number;
  pitch: number;
}

export interface ExportSTLReadyData {
  blob: Blob;
  filename: string;
}

export type EventName =
  | 'voxelsUpdated'
  | 'materialChanged'
  | 'undo'
  | 'redo'
  | 'clearAll'
  | 'exportSTL:request'
  | 'exportSTL:ready'
  | 'cameraChanged';

export type EventDataMap = {
  voxelsUpdated: VoxelsUpdatedData;
  materialChanged: MaterialChangedData;
  undo: void;
  redo: void;
  clearAll: void;
  'exportSTL:request': void;
  'exportSTL:ready': ExportSTLReadyData;
  cameraChanged: CameraChangedData;
};

type Handler<T extends EventName> = (data: EventDataMap[T]) => void;

export class EventBus {
  private handlers: Map<EventName, Set<Handler<EventName>>> = new Map();

  public on<T extends EventName>(event: T, handler: Handler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    (this.handlers.get(event) as Set<Handler<T>>).add(handler);
  }

  public off<T extends EventName>(event: T, handler: Handler<T>): void {
    const set = this.handlers.get(event);
    if (set) {
      (set as Set<Handler<T>>).delete(handler);
    }
  }

  public emit<T extends EventName>(event: T, data: EventDataMap[T]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.forEach((h) => {
      try {
        (h as Handler<T>)(data);
      } catch (err) {
        console.error(`[EventBus] Handler for "${event}" threw:`, err);
      }
    });
  }
}
