import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Droplet, DropletData } from '@/scene/Droplet';

export interface PhysicsParams {
  temperature: number;
  humidity: number;
}

interface UseDropletPhysicsReturn {
  droplets: Droplet[];
  addDroplet: (position: THREE.Vector3, radius: number, color: THREE.Color) => void;
  updateDroplets: (deltaTime: number) => { mergeCount: number; maxRadius: number };
  clearDroplets: () => void;
}

export function useDropletPhysics(params: PhysicsParams): UseDropletPhysicsReturn {
  const dropletsRef = useRef<Droplet[]>([]);
  const idCounterRef = useRef(0);

  const addDroplet = useCallback(
    (position: THREE.Vector3, radius: number, color: THREE.Color) => {
      if (dropletsRef.current.length >= 20) return;
      const id = `droplet-${++idCounterRef.current}`;
      dropletsRef.current.push(new Droplet(id, position, radius, color));
    },
    []
  );

  const clearDroplets = useCallback(() => {
    dropletsRef.current = [];
    idCounterRef.current = 0;
  }, []);

  const checkAndMerge = useCallback((): number => {
    let mergeCount = 0;
    const droplets = dropletsRef.current;
    const toRemove = new Set<string>();

    for (let i = 0; i < droplets.length; i++) {
      if (toRemove.has(droplets[i].data.id)) continue;

      for (let j = i + 1; j < droplets.length; j++) {
        if (toRemove.has(droplets[j].data.id)) continue;

        const d1 = droplets[i].data;
        const d2 = droplets[j].data;

        const dist = d1.position.distanceTo(d2.position);
        const mergeThreshold = (d1.radius + d2.radius) * 1.2;

        if (dist < mergeThreshold) {
          const larger = d1.radius >= d2.radius ? droplets[i] : droplets[j];
          const smaller = larger === droplets[i] ? droplets[j] : droplets[i];

          larger.mergeWith(smaller);
          toRemove.add(smaller.data.id);
          mergeCount++;
        }
      }
    }

    if (toRemove.size > 0) {
      dropletsRef.current = droplets.filter(
        (d) => !toRemove.has(d.data.id)
      );
    }

    return mergeCount;
  }, []);

  const applyEvaporation = useCallback(
    (deltaTime: number) => {
      const droplets = dropletsRef.current;
      const evapRate = (90 - params.humidity) / 60 * 0.5;

      for (const droplet of droplets) {
        const data = droplet.data;
        if (data.targetRadius > 4) {
          const newRadius = Math.max(4, data.targetRadius - evapRate * deltaTime);
          data.targetRadius = newRadius;
          data.volume = (4 / 3) * Math.PI * Math.pow(newRadius, 3);
        }
      }
    },
    [params.humidity]
  );

  const updateDroplets = useCallback(
    (deltaTime: number): { mergeCount: number; maxRadius: number } => {
      const droplets = dropletsRef.current;

      for (const droplet of droplets) {
        droplet.update(deltaTime, params.temperature);
      }

      applyEvaporation(deltaTime);
      const mergeCount = checkAndMerge();

      let maxRadius = 0;
      for (const droplet of dropletsRef.current) {
        if (droplet.data.radius > maxRadius) {
          maxRadius = droplet.data.radius;
        }
      }

      return { mergeCount, maxRadius };
    },
    [params.temperature, applyEvaporation, checkAndMerge]
  );

  return {
    get droplets() {
      return dropletsRef.current;
    },
    addDroplet,
    updateDroplets,
    clearDroplets,
  };
}
