import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Event } from './types';

interface TimelineProps {
  events: Event[];
  filteredEventIds: Set<string>;
  onEventClick: (event: Event) => void;
}

interface EventNodeCardProps {
  event: Event;
  position: [number, number, number];
  isVisible: boolean;
  isRelated: boolean;
  onClick: () => void;
}

const EventNodeCard: React.FC<EventNodeCardProps> = React.memo(({
  event,
  position,
  isVisible,
  isRelated,
  onClick
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={isRelated ? '#7b2ff7' : '#00d4ff'}
          emissive={isRelated ? '#7b2ff7' : '#00d4ff'}
          emissiveIntensity={hovered ? 1 : 0.5}
          transparent
          opacity={isVisible ? 1 : 0.12}
        />
      </mesh>
      {isVisible && (
        <pointLight
          color={isRelated ? '#7b2ff7' : '#00d4ff'}
          intensity={hovered ? 3 : 1}
          distance={3}
        />
      )}
      <Html
        position={[0, 0.35, 0]}
        center
        distanceFactor={10}
        zIndexRange={[50, 0]}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      >
        <div
          className={`timeline-node-card ${isVisible ? 'visible' : 'hidden'} ${isRelated ? 'related' : ''} ${hovered ? 'hovered' : ''}`}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="node-card-name">{event.name}</div>
          <div className="node-card-date">{event.date}</div>
          <div className="node-card-keywords">
            {event.keywords.slice(0, 3).map((kw, i) => (
              <span key={i} className="node-card-kw">{kw}</span>
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
});
EventNodeCard.displayName = 'EventNodeCard';

interface InstancedNodesProps {
  count: number;
  positions: [number, number, number][];
  filteredEventIds: Set<string>;
  eventIds: string[];
  onNodeClick: (index: number) => void;
}

const InstancedNodes: React.FC<InstancedNodesProps> = ({
  count,
  positions,
  filteredEventIds,
  eventIds,
  onNodeClick
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArr = useMemo(() => new Float32Array(count * 3), [count]);
  const baseColorCyan = new THREE.Color('#00d4ff');
  const baseColorPurple = new THREE.Color('#7b2ff7');
  const dimColor = new THREE.Color('#1a1a4e');

  const geometry = useMemo(() => new THREE.SphereGeometry(0.08, 12, 12), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.6,
    roughness: 0.3,
    metalness: 0.7,
  }), []);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      dummy.position.set(positions[i][0], positions[i][1], positions[i][2]);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const isVisible = filteredEventIds.has(eventIds[i]);
      const color = isVisible ? baseColorCyan : dimColor;
      color.toArray(colorArr, i * 3);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [count, positions, filteredEventIds, eventIds, dummy, colorArr]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      dummy.position.set(positions[i][0], positions[i][1], positions[i][2]);
      const pulse = Math.sin(t * 1.5 + i * 0.3) * 0.03 + 1;
      dummy.scale.set(pulse, pulse, pulse);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId !== undefined) {
      e.stopPropagation();
      onNodeClick(e.instanceId);
    }
  }, [onNodeClick]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      onClick={handleClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    />
  );
};

interface ConnectionLinesProps {
  events: Event[];
  positions: [number, number, number][];
  filteredEventIds: Set<string>;
}

const ConnectionLines: React.FC<ConnectionLinesProps> = React.memo(({ events, positions, filteredEventIds }) => {
  const connections = useMemo(() => {
    const conn: {
      start: [number, number, number];
      end: [number, number, number];
      sharedCount: number;
      bothVisible: boolean;
      key: string;
    }[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const sharedKeywords = events[i].keywords.filter(k => events[j].keywords.includes(k));
        if (sharedKeywords.length > 0) {
          const bothVisible = filteredEventIds.has(events[i].id) && filteredEventIds.has(events[j].id);
          conn.push({
            start: positions[i],
            end: positions[j],
            sharedCount: sharedKeywords.length,
            bothVisible,
            key: `${events[i].id}-${events[j].id}`
          });
        }
      }
    }
    return conn;
  }, [events, positions, filteredEventIds]);

  const midPoint = useCallback((
    a: [number, number, number],
    b: [number, number, number]
  ): [number, number, number] => {
    return [
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2 + 0.5,
      (a[2] + b[2]) / 2
    ];
  }, []);

  return (
    <>
      {connections.map((conn) => {
        const baseOpacity = conn.bothVisible
          ? Math.min(0.15 + conn.sharedCount * 0.12, 0.6)
          : 0.03;
        const glowOpacity = conn.bothVisible
          ? Math.min(0.05 + conn.sharedCount * 0.04, 0.2)
          : 0.01;
        const mid = midPoint(conn.start, conn.end);

        return (
          <group key={conn.key}>
            <Line
              points={[conn.start, mid, conn.end]}
              color="#00d4ff"
              lineWidth={1.5}
              transparent
              opacity={baseOpacity}
            />
            <Line
              points={[conn.start, mid, conn.end]}
              color="#7b2ff7"
              lineWidth={3}
              transparent
              opacity={glowOpacity}
            />
          </group>
        );
      })}
    </>
  );
});
ConnectionLines.displayName = 'ConnectionLines';

interface OrbitRingProps {
  radius: number;
}

const OrbitRing: React.FC<OrbitRingProps> = ({ radius }) => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  const points = useMemo(() => {
    const p: [number, number, number][] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      p.push([
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ]);
    }
    return p;
  }, [radius]);

  return (
    <>
      <Line
        points={points}
        color="#00d4ff"
        lineWidth={1.5}
        transparent
        opacity={0.25}
      />
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.008, 8, 100]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.15}
        />
      </mesh>
    </>
  );
};

interface SceneProps {
  events: Event[];
  filteredEventIds: Set<string>;
  onEventClick: (event: Event) => void;
}

const Scene: React.FC<SceneProps> = ({ events, filteredEventIds, onEventClick }) => {
  const { camera } = useThree();

  const positions = useMemo(() => {
    const radius = 6;
    return events.map((_, index) => {
      const angle = (index / Math.max(events.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ] as [number, number, number];
    });
  }, [events]);

  const eventIds = useMemo(() => events.map(e => e.id), [events]);

  const relatedEventIds = useMemo(() => {
    const related = new Set<string>();
    events.forEach(event => {
      if (filteredEventIds.has(event.id)) {
        events.forEach(other => {
          if (event.id !== other.id &&
            event.keywords.some(k => other.keywords.includes(k))) {
            related.add(other.id);
          }
        });
      }
    });
    return related;
  }, [events, filteredEventIds]);

  useEffect(() => {
    if (events.length > 0) {
      const distance = 12;
      camera.position.set(0, distance * 0.5, distance);
      camera.lookAt(0, 0, 0);
    }
  }, [events.length, camera]);

  const handleInstancedClick = useCallback((index: number) => {
    if (events[index]) {
      onEventClick(events[index]);
    }
  }, [events, onEventClick]);

  if (events.length === 0) return null;

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#ffffff" />
      <pointLight position={[-10, -5, -10]} intensity={0.25} color="#7b2ff7" />
      <pointLight position={[0, 10, 0]} intensity={0.2} color="#00d4ff" />

      <OrbitRing radius={6} />
      <OrbitRing radius={7.2} />

      <InstancedNodes
        count={events.length}
        positions={positions}
        filteredEventIds={filteredEventIds}
        eventIds={eventIds}
        onNodeClick={handleInstancedClick}
      />

      <ConnectionLines
        events={events}
        positions={positions}
        filteredEventIds={filteredEventIds}
      />

      {events.map((event, index) => (
        <EventNodeCard
          key={event.id}
          event={event}
          position={positions[index]}
          isVisible={filteredEventIds.has(event.id)}
          isRelated={relatedEventIds.has(event.id) && !filteredEventIds.has(event.id)}
          onClick={() => onEventClick(event)}
        />
      ))}

      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.8, 6.2, 64]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={4}
        maxDistance={25}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.8}
      />
    </>
  );
};

const Timeline: React.FC<TimelineProps> = ({ events, filteredEventIds, onEventClick }) => {
  return (
    <Canvas
      camera={{ fov: 55, near: 0.1, far: 1000 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
      dpr={[1, 1.5]}
      frameloop="always"
      performance={{ min: 0.5 }}
    >
      <Scene
        events={events}
        filteredEventIds={filteredEventIds}
        onEventClick={onEventClick}
      />
    </Canvas>
  );
};

export default Timeline;
