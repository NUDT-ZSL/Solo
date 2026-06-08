import { Dimension } from './GameEngine';

export interface ObjectMapping {
  id: string;
  realityState: string;
  mirrorState: string;
  realityColor: string;
  mirrorColor: string;
  realitySolid: boolean;
  mirrorSolid: boolean;
}

export interface DimensionState {
  dimension: Dimension;
  objectMappings: Map<string, ObjectMapping>;
  switchHistory: Dimension[];
}

const TRANSITION_DURATION = 500;

export class MirrorSystem {
  private currentDimension: Dimension = Dimension.Reality;
  private objectMappings: Map<string, ObjectMapping> = new Map();
  private switchHistory: Dimension[] = [];
  private transitionTimer: number = 0;
  private isTransitioning: boolean = false;

  reset() {
    this.currentDimension = Dimension.Reality;
    this.objectMappings.clear();
    this.switchHistory = [];
    this.transitionTimer = 0;
    this.isTransitioning = false;
  }

  getCurrentDimension(): Dimension {
    return this.currentDimension;
  }

  isTransitioningDimension(): boolean {
    return this.isTransitioning;
  }

  getTransitionProgress(): number {
    if (!this.isTransitioning) return 0;
    return Math.min(1, this.transitionTimer / TRANSITION_DURATION);
  }

  registerObject(mapping: ObjectMapping) {
    this.objectMappings.set(mapping.id, mapping);
  }

  registerObjects(mappings: ObjectMapping[]) {
    for (const m of mappings) {
      this.objectMappings.set(m.id, m);
    }
  }

  getObjectState(objectId: string): { state: string; color: string; solid: boolean } | null {
    const mapping = this.objectMappings.get(objectId);
    if (!mapping) return null;
    if (this.currentDimension === Dimension.Reality) {
      return {
        state: mapping.realityState,
        color: mapping.realityColor,
        solid: mapping.realitySolid,
      };
    }
    return {
      state: mapping.mirrorState,
      color: mapping.mirrorColor,
      solid: mapping.mirrorSolid,
    };
  }

  switchDimension(): Dimension {
    const prev = this.currentDimension;
    this.currentDimension =
      this.currentDimension === Dimension.Reality ? Dimension.Mirror : Dimension.Reality;
    this.switchHistory.push(prev);
    return this.currentDimension;
  }

  getObjectStateInDimension(objectId: string, dimension: Dimension): { state: string; color: string; solid: boolean } | null {
    const mapping = this.objectMappings.get(objectId);
    if (!mapping) return null;
    if (dimension === Dimension.Reality) {
      return { state: mapping.realityState, color: mapping.realityColor, solid: mapping.realitySolid };
    }
    return { state: mapping.mirrorState, color: mapping.mirrorColor, solid: mapping.mirrorSolid };
  }

  getSwitchCount(): number {
    return this.switchHistory.length;
  }

  getLastDimension(): Dimension | null {
    if (this.switchHistory.length === 0) return null;
    return this.switchHistory[this.switchHistory.length - 1];
  }

  getTransformationRules(): { type: string; realityForm: string; mirrorForm: string }[] {
    return [
      { type: 'bridge', realityForm: '木桥(易断)', mirrorForm: '石板桥(坚固)' },
      { type: 'chest', realityForm: '关闭的宝箱', mirrorForm: '打开的宝箱' },
      { type: 'door', realityForm: '锁闭的石门', mirrorForm: '开启的石门' },
      { type: 'lantern', realityForm: '红色灯笼(发光)', mirrorForm: '蓝色灯笼(暗淡)' },
      { type: 'water', realityForm: '深水(危险)', mirrorForm: '浅滩(可通过)' },
      { type: 'vine', realityForm: '枯藤(不可攀)', mirrorForm: '绿藤(可攀爬)' },
      { type: 'platform_floating', realityForm: '隐形浮台', mirrorForm: '显现浮台' },
    ];
  }

  applyTransformation<T extends { id: string; type: string; solid: boolean }>(
    objects: T[],
    dimension: Dimension
  ): T[] {
    return objects.map(obj => {
      const mapping = this.objectMappings.get(obj.id);
      if (!mapping) return obj;
      const stateInfo = this.getObjectStateInDimension(obj.id, dimension);
      if (!stateInfo) return obj;
      return {
        ...obj,
        solid: stateInfo.solid,
      };
    });
  }
}
