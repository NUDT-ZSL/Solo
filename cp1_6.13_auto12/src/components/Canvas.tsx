import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { AircraftState, WindNode, updateFlight, degToRad } from '../utils/physics';
import { getWindForceAtPoint, getWindColorRgba } from '../utils/windField';

interface CanvasProps {
  width: number;
  height: number;
  nodes: WindNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  aircraftState: AircraftState;
  onAircraftStateChange: (state: AircraftState) => void;
  onWindForceChange: (force: { x: number; y: number }) => void;
}

export interface CanvasHandle {
  resetAircraft: () => void;
  setAircraftState: (position: { x: number; y: number }, angle: number) => void;
}

interface Particle {
  nodeId: string;
  x: number;
  y: number;
  step: number;
  trail: { x: number; y: number }[];
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  ({ width, height, nodes, selectedNodeId, onSelectNode, aircraftState, onAircraftStateChange, onWindForceChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const aircraftRef = useRef<AircraftState>(aircraftState);
    const keysRef = useRef<Set<string>>(new Set());
    const particlesRef = useRef<Particle[]>([]);
    const lastTimeRef = useRef<number>(0);
    const particleFrameCounterRef = useRef<number>(0);
    const animationFrameRef = useRef<number>(0);

    useImperativeHandle(ref, () => ({
      resetAircraft: () => {
        aircraftRef.current = {
          position: { x: width / 2, y: height / 2 },
          velocity: { x: 0, y: 0 },
          angle: 0,
          thrust: 0,
        };
        onAircraftStateChange(aircraftRef.current);
      },
      setAircraftState: (position: { x: number; y: number }, angle: number) => {
        aircraftRef.current = {
          position: { ...position },
          velocity: { x: 0, y: 0 },
          angle: angle,
          thrust: 0,
        };
        onAircraftStateChange(aircraftRef.current);
      },
    }));

    useEffect(() => {
      aircraftRef.current = aircraftState;
    }, [aircraftState]);

    useEffect(() => {
      const particles: Particle[] = [];
      for (const node of nodes) {
        const count = Math.floor((node.radius / 120) * 25);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * node.radius * 0.9;
          particles.push({
            nodeId: node.id,
            x: node.position.x + Math.cos(angle) * dist,
            y: node.position.y + Math.sin(angle) * dist,
            step: Math.floor(Math.random() * 8),
            trail: [],
          });
        }
      }
      particlesRef.current = particles;
    }, [nodes]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    }, []);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    }, []);

    useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }, [handleKeyDown, handleKeyUp]);

    const handleCanvasClick = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * width;
        const y = ((e.clientY - rect.top) / rect.height) * height;

        let clickedId: string | null = null;
        for (const node of nodes) {
          const dx = x - node.position.x;
          const dy = y - node.position.y;
          if (Math.sqrt(dx * dx + dy * dy) <= node.radius) {
            clickedId = node.id;
            break;
          }
        }
        onSelectNode(clickedId);
      },
      [nodes, onSelectNode, width]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = (timestamp: number) => {
        const deltaTime = lastTimeRef.current ? timestamp - lastTimeRef.current : 16.67;
        lastTimeRef.current = timestamp;

        const dt = deltaTime / 16.67;
        const keys = keysRef.current;
        const aircraft = aircraftRef.current;

        if (keys.has('a')) {
          aircraft.angle -= degToRad(90) * dt / 60;
        }
        if (keys.has('d')) {
          aircraft.angle += degToRad(90) * dt / 60;
        }
        if (keys.has('w')) {
          aircraft.thrust = Math.min(100, aircraft.thrust + 50 * dt / 60);
        }
        if (keys.has('s')) {
          aircraft.thrust = Math.max(0, aircraft.thrust - 80 * dt / 60);
        }

        const wf = getWindForceAtPoint(aircraft.position, nodes);
        onWindForceChange(wf);

        const newState = updateFlight(aircraft, wf, deltaTime);
        newState.position.x = Math.max(0, Math.min(width, newState.position.x));
        newState.position.y = Math.max(0, Math.min(height, newState.position.y));

        aircraftRef.current = newState;
        onAircraftStateChange(newState);

        particleFrameCounterRef.current++;
        if (particleFrameCounterRef.current >= 2) {
          particleFrameCounterRef.current = 0;

          const particles = particlesRef.current;
          const nodesMap = new Map(nodes.map((n) => [n.id, n]));

          for (const p of particles) {
            const node = nodesMap.get(p.nodeId);
            if (!node) continue;

            const dx = p.x - node.position.x;
            const dy = p.y - node.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > node.radius || p.step >= 8) {
              const angle = Math.random() * Math.PI * 2;
              const newDist = Math.random() * node.radius * 0.3;
              p.x = node.position.x + Math.cos(angle) * newDist;
              p.y = node.position.y + Math.sin(angle) * newDist;
              p.step = 0;
              p.trail = [];
            } else {
              p.trail.push({ x: p.x, y: p.y });
              if (p.trail.length > 8) p.trail.shift();

              const localWind = getWindForceAtPoint({ x: p.x, y: p.y }, [node]);
              const speed = Math.sqrt(localWind.x * localWind.x + localWind.y * localWind.y);
              const moveSpeed = Math.max(0.5, speed * 2);
              
              const windAngle = Math.atan2(localWind.y, localWind.x);
              p.x += Math.cos(windAngle) * moveSpeed;
              p.y += Math.sin(windAngle) * moveSpeed;
              p.step++;
            }
          }
        }

        ctx.fillStyle = '#0a1628';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x <= width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y <= height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        for (const node of nodes) {
          const isSelected = node.id === selectedNodeId;

          const gradient = ctx.createRadialGradient(
            node.position.x, node.position.y, 0,
            node.position.x, node.position.y, node.radius
          );
          gradient.addColorStop(0, getWindColorRgba(node.strength, 0.5));
          gradient.addColorStop(0.5, getWindColorRgba(node.strength, 0.25));
          gradient.addColorStop(1, getWindColorRgba(node.strength, 0));

          ctx.beginPath();
          ctx.arc(node.position.x, node.position.y, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          if (isSelected) {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
          } else {
            ctx.strokeStyle = getWindColorRgba(node.strength, 0.4);
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
          }
          ctx.beginPath();
          ctx.arc(node.position.x, node.position.y, node.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          const arrowLen = Math.min(node.radius * 0.5, 40);
          const startX = node.position.x;
          const startY = node.position.y;
          const endX = startX + Math.cos(node.direction) * arrowLen;
          const endY = startY + Math.sin(node.direction) * arrowLen;

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          const headLen = 6;
          const headAngle = Math.PI / 6;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLen * Math.cos(node.direction - headAngle),
            endY - headLen * Math.sin(node.direction - headAngle)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLen * Math.cos(node.direction + headAngle),
            endY - headLen * Math.sin(node.direction + headAngle)
          );
          ctx.stroke();
        }

        for (const p of particlesRef.current) {
          if (p.trail.length > 1) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
              const alpha = i / p.trail.length;
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
              ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            ctx.stroke();
          }
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        const ac = aircraftRef.current;
        ctx.save();
        ctx.translate(ac.position.x, ac.position.y);
        ctx.rotate(ac.angle);

        ctx.fillStyle = '#ff6b35';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-12, -8);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (ac.thrust > 5) {
          const flameLen = 4 + (ac.thrust / 100) * 10;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(-6, -3);
          ctx.lineTo(-6 - flameLen, 0);
          ctx.lineTo(-6, 3);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      animationFrameRef.current = requestAnimationFrame(draw);

      return () => {
        cancelAnimationFrame(animationFrameRef.current);
      };
    }, [nodes, selectedNodeId, width, height, onAircraftStateChange, onWindForceChange]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: width,
          cursor: 'crosshair',
          borderRadius: '8px',
        }}
      />
    );
  }
);

Canvas.displayName = 'Canvas';

export default Canvas;
