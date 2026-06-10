import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Event } from './types';

interface TimelineProps {
  events: Event[];
  filteredEventIds: Set<string>;
  onEventClick: (event: Event) => void;
}

interface EventNodeProps {
  event: Event;
  position: [number, number, number];
  index: number;
  total: number;
  isVisible: boolean;
  isRelated: boolean;
  onClick: () => void;
}

const EventNode: React.FC<EventNodeProps> = ({ 
  event, 
  position, 
  index, 
  total,
  isVisible,
  isRelated,
  onClick 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setScale(isVisible ? 1 : 0);
    }, index * 20);
    return () => clearTimeout(timer);
  }, [isVisible, index]);

  useFrame((state) => {
    if (meshRef.current) {
      const targetScale = hovered ? 1.3 : (isVisible ? 1 : 0);
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      
      const pulse = Math.sin(state.clock.elapsedTime * 2 + index * 0.5) * 0.1 + 1;
      meshRef.current.scale.multiplyScalar(pulse);
    }
  });

  const color = isRelated ? '#7b2ff7' : '#00d4ff';
  const opacity = isVisible ? 1 : 0.1;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          transparent
          opacity={opacity}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      
      <pointLight
        color={color}
        intensity={isVisible ? (hovered ? 2 : 1) : 0.1}
        distance={2}
      />
      
      {isVisible && (
        <Html
          position={[0, 0.3, 0]}
          center
          distanceFactor={8}
          zIndexRange={[100, 0]}
          style={{
            transition: 'opacity 0.5s ease',
            opacity: opacity,
            pointerEvents: 'none'
          }}
        >
          <div style={{
            background: 'rgba(10, 10, 46, 0.9)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(0, 212, 255, 0.5)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: '#ffffff',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)'
          }}>
            <div style={{ fontWeight: '600', color: '#00d4ff', marginBottom: '2px' }}>
              {event.name.length > 15 ? event.name.substring(0, 15) + '...' : event.name}
            </div>
            <div style={{ fontSize: '10px', color: '#a0a0c0' }}>{event.date}</div>
          </div>
        </Html>
      )}
    </group>
  );
};

interface ConnectionLinesProps {
  events: Event[];
  positions: [number, number, number][];
  filteredEventIds: Set<string>;
}

const ConnectionLines: React.FC<ConnectionLinesProps> = ({ events, positions, filteredEventIds }) => {
  const connections = useMemo(() => {
    const conn: { start: [number, number, number]; end: [number, number, number]; opacity: number }[] = [];
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const sharedKeywords = events[i].keywords.filter(k => events[j].keywords.includes(k));
        if (sharedKeywords.length > 0) {
          const isVisible = filteredEventIds.has(events[i].id) && filteredEventIds.has(events[j].id);
          conn.push({
            start: positions[i],
            end: positions[j],
            opacity: isVisible ? Math.min(sharedKeywords.length * 0.2, 0.6) : 0.05
          });
        }
      }
    }
    return conn;
  }, [events, positions, filteredEventIds]);

  return (
    <>
      {connections.map((conn, idx) => (
        <Line
          key={idx}
          points={[conn.start, conn.end]}
          color="#00d4ff"
          lineWidth={1}
          transparent
          opacity={conn.opacity}
        >
          <meshBasicMaterial
            color="#00d4ff"
            transparent
            opacity={conn.opacity}
            side={THREE.DoubleSide}
          />
        </Line>
      ))}
    </>
  );
};

interface OrbitRingProps {
  radius: number;
}

const OrbitRing: React.FC<OrbitRingProps> = ({ radius }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const points = useMemo(() => {
    const p: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
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
        lineWidth={2}
        transparent
        opacity={0.3}
      />
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.01, 16, 100]} />
        <meshBasicMaterial 
          color="#00d4ff" 
          transparent 
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {[0, 1, 2, 3].map(i => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          ]}>
            <ringGeometry args={[0.05, 0.08, 32]} />
            <meshBasicMaterial 
              color="#7b2ff7" 
              transparent 
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
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
  const relatedEventIds = useRef<Set<string>>(new Set());

  const positions = useMemo(() => {
    const radius = 6;
    return events.map((event, index) => {
      const angle = (index / events.length) * Math.PI * 2 - Math.PI / 2;
      return [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ] as [number, number, number];
    });
  }, [events]);

  useEffect(() => {
    relatedEventIds.current = new Set();
    events.forEach(event => {
      if (filteredEventIds.has(event.id)) {
        events.forEach(otherEvent => {
          if (event.id !== otherEvent.id && 
              event.keywords.some(k => otherEvent.keywords.includes(k))) {
            relatedEventIds.current.add(otherEvent.id);
          }
        });
      }
    });
  }, [events, filteredEventIds]);

  useEffect(() => {
    if (events.length > 0) {
      const radius = 6;
      const distance = radius * 2;
      camera.position.set(0, distance * 0.6, distance);
      camera.lookAt(0, 0, 0);
    }
  }, [events.length, camera]);

  if (events.length === 0) {
    return null;
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#7b2ff7" />
      
      <OrbitRing radius={6} />
      <OrbitRing radius={7} />
      
      <ConnectionLines 
        events={events} 
        positions={positions} 
        filteredEventIds={filteredEventIds}
      />
      
      {events.map((event, index) => (
        <EventNode
          key={event.id}
          event={event}
          position={positions[index]}
          index={index}
          total={events.length}
          isVisible={filteredEventIds.has(event.id)}
          isRelated={relatedEventIds.current.has(event.id) && !filteredEventIds.has(event.id)}
          onClick={() => onEventClick(event)}
        />
      ))}
      
      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.5, 6.5, 64]} />
        <meshBasicMaterial 
          color="#00d4ff" 
          transparent 
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={5}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        enableDamping
        dampingFactor={0.05}
        autoRotate={false}
      />
    </>
  );
};

const Timeline: React.FC<TimelineProps> = ({ events, filteredEventIds, onEventClick }) => {
  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      dpr={[1, 2]}
      frameloop="always"
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
