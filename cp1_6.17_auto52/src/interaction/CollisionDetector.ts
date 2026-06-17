import * as THREE from 'three';
import { ActiveSite, DockingResult, DockingState } from '../types';

export interface CollisionDetectorOptions {
  dockingThreshold: number;
  minBindingEnergy: number;
  maxBindingEnergy: number;
}

const DEFAULT_OPTIONS: CollisionDetectorOptions = {
  dockingThreshold: 2.5,
  minBindingEnergy: -15,
  maxBindingEnergy: -5
};

export class CollisionDetector {
  private options: CollisionDetectorOptions;
  private activeSite: ActiveSite | null = null;
  private state: DockingState = {
    isDocked: false,
    isDocking: false,
    distance: Infinity,
    result: null
  };
  
  private onDockingStart?: () => void;
  private onDockingComplete?: (result: DockingResult) => void;
  private onDistanceUpdate?: (distance: number) => void;
  private onApproaching?: (approaching: boolean) => void;
  
  private lastDistanceUpdate: number = 0;
  private readonly updateInterval: number = 50;
  
  constructor(options: Partial<CollisionDetectorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  public setActiveSite(activeSite: ActiveSite): void {
    this.activeSite = activeSite;
  }
  
  public resetState(): void {
    this.state = {
      isDocked: false,
      isDocking: false,
      distance: Infinity,
      result: null
    };
  }
  
  public setOnDockingStart(callback: () => void): void {
    this.onDockingStart = callback;
  }
  
  public setOnDockingComplete(callback: (result: DockingResult) => void): void {
    this.onDockingComplete = callback;
  }
  
  public setOnDistanceUpdate(callback: (distance: number) => void): void {
    this.onDistanceUpdate = callback;
  }
  
  public setOnApproaching(callback: (approaching: boolean) => void): void {
    this.onApproaching = callback;
  }
  
  public update(
    ligandPosition: THREE.Vector3,
    timestamp: number
  ): DockingState {
    if (!this.activeSite || this.state.isDocked || this.state.isDocking) {
      return this.state;
    }
    
    const activeSiteCenter = new THREE.Vector3(
      this.activeSite.center.x,
      this.activeSite.center.y,
      this.activeSite.center.z
    );
    
    const distance = this.calculateDistance(ligandPosition, activeSiteCenter);
    this.state.distance = distance;
    
    if (timestamp - this.lastDistanceUpdate >= this.updateInterval) {
      this.lastDistanceUpdate = timestamp;
      if (this.onDistanceUpdate) {
        this.onDistanceUpdate(distance);
      }
    }
    
    const approachingThreshold = this.options.dockingThreshold * 3;
    if (distance < approachingThreshold && !this.state.isDocking) {
      if (this.onApproaching) {
        this.onApproaching(true);
      }
    } else if (distance >= approachingThreshold) {
      if (this.onApproaching) {
        this.onApproaching(false);
      }
    }
    
    if (distance < this.options.dockingThreshold && !this.state.isDocking) {
      this.triggerDocking(distance);
    }
    
    return this.state;
  }
  
  private calculateDistance(pos1: THREE.Vector3, pos2: THREE.Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  private triggerDocking(distance: number): void {
    this.state.isDocking = true;
    
    if (this.onDockingStart) {
      this.onDockingStart();
    }
    
    const result = this.generateDockingResult(distance);
    this.state.result = result;
    this.state.isDocked = true;
    this.state.isDocking = false;
    
    if (this.onDockingComplete) {
      setTimeout(() => {
        this.onDockingComplete!(result);
      }, 500);
    }
  }
  
  private generateDockingResult(distance: number): DockingResult {
    const normalizedDistance = distance / this.options.dockingThreshold;
    
    const energyRange = this.options.maxBindingEnergy - this.options.minBindingEnergy;
    const baseEnergy = this.options.minBindingEnergy + normalizedDistance * energyRange * 0.5;
    const randomVariation = (Math.random() - 0.5) * 2;
    const bindingEnergy = Math.max(
      this.options.minBindingEnergy,
      Math.min(this.options.maxBindingEnergy, baseEnergy + randomVariation)
    );
    
    const keyResidues = this.selectKeyResidues();
    
    return {
      success: true,
      bindingEnergy: Math.round(bindingEnergy * 10) / 10,
      keyResidues,
      distance: Math.round(distance * 100) / 100,
      timestamp: Date.now()
    };
  }
  
  private selectKeyResidues(): string[] {
    if (!this.activeSite) return [];
    
    const allResidues = this.activeSite.keyResidues;
    const count = Math.min(5, Math.max(3, Math.floor(Math.random() * 3) + 3));
    const shuffled = [...allResidues].sort(() => Math.random() - 0.5);
    
    return shuffled.slice(0, count);
  }
  
  public forceDocking(): DockingResult | null {
    if (!this.activeSite) return null;
    
    const distance = this.options.dockingThreshold * 0.5;
    this.triggerDocking(distance);
    
    return this.state.result;
  }
  
  public getState(): DockingState {
    return { ...this.state };
  }
  
  public getDockingTargetPosition(): THREE.Vector3 | null {
    if (!this.activeSite) return null;
    return new THREE.Vector3(
      this.activeSite.center.x,
      this.activeSite.center.y,
      this.activeSite.center.z
    );
  }
  
  public getActiveSite(): ActiveSite | null {
    return this.activeSite;
  }
  
  public setDockingThreshold(threshold: number): void {
    this.options.dockingThreshold = threshold;
  }
  
  public isDocked(): boolean {
    return this.state.isDocked;
  }
  
  public isDocking(): boolean {
    return this.state.isDocking;
  }
}
