import { useState, useRef, useCallback, useEffect } from 'react';
import type { EventData, MountainData, SeparationData, Statistics, PlateData } from './plateConfig';
import { v4 as uuidv4 } from 'uuid';

const EARTH_CIRCUMFERENCE_KM = 40075;
const SPHERE_RADIUS_UNITS = 5;
const KM_PER_UNIT = EARTH_CIRCUMFERENCE_KM / (2 * Math.PI * SPHERE_RADIUS_UNITS);

export function useEventEngine() {
  const [currentTime, setCurrentTimeState] = useState(0);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<string>('');
  const [mountains, setMountains] = useState<MountainData[]>([]);
  const [separations, setSeparations] = useState<SeparationData[]>([]);
  const [highlightedPlates, setHighlightedPlates] = useState<string[]>([]);
  const [collisionCount, setCollisionCount] = useState(0);
  const [stats, setStats] = useState<Statistics>({
    collisionCount: 0,
    totalMountainArea: 0,
    averageVelocity: 0,
  });

  const animationRef = useRef<number | null>(null);
  const eventStartTimeRef = useRef<number>(0);
  const eventDurationRef = useRef<number>(0);
  const eventDataRef = useRef<EventData | null>(null);
  const lastVelocityCalcRef = useRef<{ time: number; positions: Map<string, [number, number, number]> }>({
    time: 0,
    positions: new Map(),
  });

  const setCurrentTime = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(300, time));
    setCurrentTimeState(clampedTime);
  }, []);

  const interpolatePlatePosition = useCallback((plate: PlateData, time: number): [number, number, number] => {
    const path = plate.path;
    if (path.length === 0) return [0, 0, 0];
    if (time <= path[0].time) return [...path[0].rotation] as [number, number, number];
    if (time >= path[path.length - 1].time) return [...path[path.length - 1].rotation] as [number, number, number];

    for (let i = 0; i < path.length - 1; i++) {
      const curr = path[i];
      const next = path[i + 1];
      if (time >= curr.time && time <= next.time) {
        const t = (time - curr.time) / (next.time - curr.time);
        return [
          curr.rotation[0] + (next.rotation[0] - curr.rotation[0]) * t,
          curr.rotation[1] + (next.rotation[1] - curr.rotation[1]) * t,
          curr.rotation[2] + (next.rotation[2] - curr.rotation[2]) * t,
        ];
      }
    }
    return [...path[path.length - 1].rotation] as [number, number, number];
  }, []);

  const checkCollisions = useCallback((plates: PlateData[], time: number) => {
    const positions = new Map<string, [number, number, number]>();
    plates.forEach((p) => {
      positions.set(p.id, interpolatePlatePosition(p, time));
    });

    const detectedCollisions: MountainData[] = [];
    const detectedSeparations: SeparationData[] = [];
    let newCollisions = 0;

    for (let i = 0; i < plates.length; i++) {
      for (let j = i + 1; j < plates.length; j++) {
        const pA = plates[i];
        const pB = plates[j];
        const posA = positions.get(pA.id)!;
        const posB = positions.get(pB.id)!;

        const dx = posA[1] - posB[1];
        const distance = Math.abs(dx);

        if (distance < 0.5 && Math.sign(posA[1]) !== Math.sign(posB[1]) || (distance < 0.25 && time > 100)) {
          newCollisions++;
          const collisionKey = `${pA.id}-${pB.id}`;
          const existing = mountains.find(
            (m) => (m.plateA === pA.id && m.plateB === pB.id) || (m.plateA === pB.id && m.plateB === pA.id)
          );

          if (!existing) {
            const midPos: [number, number, number] = [
              (posA[0] + posB[0]) / 2,
              (posA[1] + posB[1]) / 2,
              (posA[2] + posB[2]) / 2,
            ];
            const height = 0.2 + Math.random() * 0.6;
            const width = 0.5 + Math.random() * 1.0;
            const vertexCount = Math.floor(100 + Math.random() * 400);

            detectedCollisions.push({
              id: uuidv4(),
              plateA: pA.id,
              plateB: pB.id,
              position: midPos,
              height,
              width,
              startTime: time,
              peakTime: time + 50,
              vertexCount,
            });
          }
        }

        if (distance > 0.8 && time > 30 && time < 250) {
          const sepKey = `${pA.id}-${pB.id}`;
          const existingSep = separations.find(
            (s) => (s.plateA === pA.id && s.plateB === pB.id) || (s.plateA === pB.id && s.plateB === pA.id)
          );

          if (!existingSep && Math.random() < 0.02) {
            const midPos: [number, number, number] = [
              (posA[0] + posB[0]) / 2,
              (posA[1] + posB[1]) / 2,
              (posA[2] + posB[2]) / 2,
            ];
            detectedSeparations.push({
              id: uuidv4(),
              plateA: pA.id,
              plateB: pB.id,
              position: midPos,
              startTime: time,
              peakTime: time + 30,
            });
          }
        }
      }
    }

    if (detectedCollisions.length > 0) {
      setMountains((prev) => {
        const totalVertices = [...prev, ...detectedCollisions].reduce((sum, m) => sum + m.vertexCount, 0);
        if (totalVertices <= 5000) {
          return [...prev, ...detectedCollisions];
        }
        return prev;
      });
      setCollisionCount((c) => c + newCollisions);
    }

    if (detectedSeparations.length > 0) {
      setSeparations((prev) => [...prev, ...detectedSeparations].slice(-20));
    }

    return { positions };
  }, [interpolatePlatePosition, mountains, separations]);

  const calculateStats = useCallback((plates: PlateData[], time: number, positions: Map<string, [number, number, number]>) => {
    let totalArea = 0;
    mountains.forEach((m) => {
      const progress = Math.min(1, Math.max(0, (time - m.startTime) / Math.max(1, (m.peakTime - m.startTime))));
      const currentHeight = m.height * progress;
      const area = m.width * currentHeight * m.vertexCount * 0.001 * KM_PER_UNIT * KM_PER_UNIT;
      totalArea += area;
    });

    let totalVelocity = 0;
    const lastData = lastVelocityCalcRef.current;
    if (time > lastData.time && lastData.positions.size > 0) {
      const timeDiff = time - lastData.time;
      plates.forEach((p) => {
        const curr = positions.get(p.id);
        const prev = lastData.positions.get(p.id);
        if (curr && prev) {
          const dist = Math.sqrt(
            Math.pow(curr[0] - prev[0], 2) +
            Math.pow(curr[1] - prev[1], 2) +
            Math.pow(curr[2] - prev[2], 2)
          );
          const velocity = (dist * KM_PER_UNIT * 1e6) / (timeDiff * 1e6);
          totalVelocity += velocity;
        }
      });
      totalVelocity = plates.length > 0 ? totalVelocity / plates.length : 0;
    }

    lastVelocityCalcRef.current = { time, positions: new Map(positions) };

    setStats({
      collisionCount,
      totalMountainArea: Math.round(totalArea),
      averageVelocity: Math.round(totalVelocity * 100) / 100,
    });
  }, [mountains, collisionCount]);

  const playEvent = useCallback((eventId: string, events: EventData[]) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    eventDataRef.current = event;
    eventDurationRef.current = event.duration;
    eventStartTimeRef.current = performance.now();
    setActiveEventId(eventId);
    setHighlightedPlates(event.highlightedPlates || []);

    const animate = () => {
      const elapsed = performance.now() - eventStartTimeRef.current;
      const progress = Math.min(elapsed / eventDurationRef.current, 1);
      const time = progress * 300;

      setCurrentTimeState(time);

      if (event.timeStamps) {
        const activeStamp = event.timeStamps.reduce<typeof event.timeStamps[0] | null>((acc, ts) => {
          if (time >= ts.time) return ts;
          return acc;
        }, null);
        setCurrentNote(activeStamp?.note || '');
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setTimeout(() => {
          setActiveEventId(null);
          setCurrentNote('');
          setHighlightedPlates([]);
        }, 1500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    currentTime,
    setCurrentTime,
    activeEventId,
    currentNote,
    mountains,
    separations,
    highlightedPlates,
    collisionCount,
    stats,
    playEvent,
    checkCollisions,
    calculateStats,
    interpolatePlatePosition,
  };
}
