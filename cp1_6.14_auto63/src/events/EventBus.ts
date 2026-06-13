export type EventCallback = (...args: any[]) => void;

export class EventBus {
  private static instance: EventBus;
  private events: Map<string, Set<EventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  public off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  public emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      });
    }
  }

  public clear(): void {
    this.events.clear();
  }
}

export const eventBus = EventBus.getInstance();

export enum AppEvents {
  PARTICLE_PARAMS_CHANGED = 'particle:paramsChanged',
  SIMULATION_PARAMS_CHANGED = 'simulation:paramsChanged',
  FLUID_TYPE_CHANGED = 'fluid:typeChanged',
  FORCE_FIELD_APPLIED = 'force:applied',
  FORCE_FIELD_RELEASED = 'force:released',
  CAMERA_ORBIT = 'camera:orbit',
  CAMERA_ZOOM = 'camera:zoom',
  CAMERA_PAN = 'camera:pan',
  RENDERER_RESIZE = 'renderer:resize',
  PERFORMANCE_WARNING = 'performance:warning',
  PARTICLE_COUNT_CHANGED = 'particle:countChanged',
}

export interface ForceFieldData {
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  strength: number;
  radius: number;
}

export interface FluidParams {
  particleCount: number;
  particleSize: number;
  gravity: number;
  windX: number;
  windY: number;
  windZ: number;
  windStrength: number;
  vortexRadius: number;
  vortexStrength: number;
}

export type FluidType = 'water' | 'smoke' | 'fire';
