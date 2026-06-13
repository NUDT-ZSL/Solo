export type EventCallback = (data?: unknown) => void;

export enum GameEvent {
  GAME_START = 'game_start',
  GAME_OVER = 'game_over',
  GAME_RESTART = 'game_restart',
  TICK = 'tick',
  RENDER = 'render',

  WAVE_START = 'wave_start',
  WAVE_COMPLETE = 'wave_complete',
  SPAWN_ENEMY = 'spawn_enemy',

  PLANT_PLACED = 'plant_placed',
  PLANT_REMOVE = 'plant_remove',
  PLANT_SELECT = 'plant_select',
  PLANT_DEATH = 'plant_death',

  ENEMY_DEATH = 'enemy_death',
  ENEMY_REACHED_END = 'enemy_reached_end',

  BULLET_FIRE = 'bullet_fire',
  BULLET_HIT = 'bullet_hit',

  SUN_GENERATED = 'sun_generated',
  SUN_COLLECTED = 'sun_collected',

  SCORE_UPDATE = 'score_update',
  HEALTH_UPDATE = 'health_update',
  SUNLIGHT_UPDATE = 'sunlight_update',

  EXPLOSION = 'explosion',
  PARTICLE = 'particle',

  UI_SELECT_PLANT = 'ui_select_plant',
  CANVAS_CLICK = 'canvas_click',
  CANVAS_MOUSE_MOVE = 'canvas_mouse_move',
}

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: GameEvent | string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => this.off(event, callback);
  }

  off(event: GameEvent | string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  emit(event: GameEvent | string, data?: unknown): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  clearEvent(event: GameEvent | string): void {
    this.listeners.delete(event);
  }
}

export const eventBus = new EventBus();
export default eventBus;
