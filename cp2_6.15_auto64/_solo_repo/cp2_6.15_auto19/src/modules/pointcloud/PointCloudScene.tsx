import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PointData } from '../../utils/types';
import { MarkerTool } from '../marker/MarkerTool';

interface PointCloudSceneProps {
  pointData: PointData | null;
  brushActive: boolean;
  onPointHover: (pointIndex: number, position: [number, number, number], screenPos: { x: number; y: number }) => void;
  markerTool: MarkerTool;
}

interface PointsProps {
  pointData: PointData;
  brushActive: boolean;
  onPointHover: (pointIndex: number, position: [number, number, number], screenPos: { x: number; y: number }) => void;
  markerTool: MarkerTool;
}

const PointCloudPoints: React.FC<PointsProps> = ({ pointData, brushActive, onPointHover, markerTool }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const { camera, size, gl } = useThree();
  
  const [highlightColors, setHighlightColors] = useState<Float32Array | null>(null);
  const [highlightSizes, setHighlightSizes] = useState<Float32Array | null>(null);
  const animationFrameRef = useRef<number>();
  const lastHoveredPointRef = useRef<number>(-1);
  const colorArrayRef = useRef<Float32Array>(pointData.color);

  const baseColor = useMemo(() => {
    return new Float32Array(pointData.color);
  }, [pointData.color]);

  const baseSize = useMemo(() => {
    const count = pointData.position.length / 3;
    const sizes = new Float32Array(count);
    const baseRadius = 2 + Math.min(2, 200000 / pointData.totalPoints);
    sizes.fill(baseRadius);
    return sizes;
  }, [pointData.position.length, pointData.totalPoints]);

  useEffect(() => {
    colorArrayRef.current = new Float32Array(pointData.color);
  }, [pointData.color]);

  const updateHighlights = useCallback(() => {
    if (!geometryRef.current || !pointsRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateHighlights);
      return;
    }

    const colors = new Float32Array(baseColor);
    const sizes = new Float32Array(baseSize);
    const count = colors.length / 3;
    let hasHighlights = false;

    for (let i = 0; i < count; i++) {
      const intensity = markerTool.getHighlightIntensity(i);
      if (intensity > 0) {
        hasHighlights = true;
        const scale = markerTool.getHighlightScale(i);
        
        colors[i * 3] = colors[i * 3] * (1 - intensity) + 1 * intensity;
        colors[i * 3 + 1] = colors[i * 3 + 1] * (1 - intensity) + 1 * intensity;
        colors[i * 3 + 2] = colors[i * 3 + 2] * (1 - intensity) + 0 * intensity;
        
        sizes[i] = baseSize[i] * scale;
      }
    }

    if (hasHighlights) {
      setHighlightColors(colors);
      setHighlightSizes(sizes);
      geometryRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometryRef.current.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    } else if (highlightColors || highlightSizes) {
      setHighlightColors(null);
      setHighlightSizes(null);
      geometryRef.current.setAttribute('color', new THREE.BufferAttribute(baseColor, 3));
      geometryRef.current.setAttribute('size', new THREE.BufferAttribute(baseSize, 1));
    }

    animationFrameRef.current = requestAnimationFrame(updateHighlights);
  }, [baseColor, baseSize, markerTool, highlightColors, highlightSizes]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateHighlights);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateHighlights]);

  const handlePointerMove = useCallback((event: any) => {
    if (!brushActive || !pointsRef.current || !geometryRef.current) return;

    event.stopPropagation();
    
    const rect = gl.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    
    const intersects = raycasterRef.current.intersectObject(pointsRef.current);
    
    if (intersects.length > 0) {
      const pointIndex = intersects[0].index;
      
      if (pointIndex !== undefined && pointIndex !== lastHoveredPointRef.current) {
        lastHoveredPointRef.current = pointIndex;
        
        const positions = geometryRef.current.attributes.position.array as Float32Array;
        const position: [number, number, number] = [
          positions[pointIndex * 3],
          positions[pointIndex * 3 + 1],
          positions[pointIndex * 3 + 2]
        ];

        const worldPos = new THREE.Vector3(...position);
        worldPos.project(camera);
        
        const screenPos = {
          x: (worldPos.x + 1) / 2 * rect.width + rect.left,
          y: (-worldPos.y + 1) / 2 * rect.height + rect.top
        };

        onPointHover(pointIndex, position, screenPos);
      }
    }
  }, [brushActive, camera, gl, onPointHover]);

  const handlePointerLeave = useCallback(() => {
    lastHoveredPointRef.current = -1;
  }, []);

  const uniforms = useMemo(() => ({
    pointTexture: { value: createCircleTexture() }
  }), []);

  useFrame((state) => {
    if (pointsRef.current) {
      const material = pointsRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime = { value: state.clock.elapsedTime };
    }
  });

  return (
    <points 
      ref={pointsRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={pointData.position.length / 3}
          array={pointData.position}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={baseColor.length / 3}
          array={baseColor}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={baseSize.length}
          array={baseSize}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          varying float vSize;
          void main() {
            vColor = color;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          varying float vSize;
          void main() {
            vec2 uv = gl_PointCoord;
            float dist = distance(uv, vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            gl_FragColor = vec4(vColor, alpha);
          }
        `}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const SceneContent: React.FC<PointCloudSceneProps> = ({ pointData, brushActive, onPointHover, markerTool }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetZoomRef = useRef<number>(1);
  const currentZoomRef = useRef<number>(1);
  const initialCameraSetRef = useRef(false);

  useEffect(() => {
    if (pointData && !initialCameraSetRef.current) {
      const { center, radius } = pointData.boundingBox;
      
      const distance = radius * 2.5;
      const height = radius * 2.5;
      
      camera.position.set(
        center[0] + distance * 0.707,
        center[1] + height,
        center[2] + distance * 0.707
      );
      
      camera.lookAt(center[0], center[1], center[2]);
      
      initialCameraSetRef.current = true;
      
      if (controlsRef.current) {
        controlsRef.current.target.set(center[0], center[1], center[2]);
        controlsRef.current.update();
      }
    }
  }, [pointData, camera]);

  useEffect(() => {
    const handleWheel = (e: any) => {
      if (!pointData || !controlsRef.current) return;
      
      e.preventDefault();
      
      const minDistance = pointData.boundingBox.radius * 0.5;
      const maxDistance = pointData.boundingBox.radius * 5;
      
      const delta = e.deltaY > 0 ? 1.1 : 0.9;
      targetZoomRef.current = Math.min(maxDistance, Math.max(minDistance, targetZoomRef.current * delta));
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
    };
  }, [pointData]);

  useFrame(() => {
    if (controlsRef.current && pointData) {
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * 0.033;
      
      const { center } = pointData.boundingBox;
      const direction = new THREE.Vector3()
        .subVectors(camera.position, new THREE.Vector3(center[0], center[1], center[2]))
        .normalize();
      
      const newPos = new THREE.Vector3()
        .copy(direction)
        .multiplyScalar(currentZoomRef.current)
        .add(new THREE.Vector3(center[0], center[1], center[2]));
      
      camera.position.lerp(newPos, 0.1);
    }
  });

  if (!pointData) {
    return (
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#0f0f2e" wireframe />
      </mesh>
    );
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <PointCloudPoints
        pointData={pointData}
        brushActive={brushActive}
        onPointHover={onPointHover}
        markerTool={markerTool}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.15}
        enablePan={true}
        enableZoom={false}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
};

function createCircleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const PointCloudScene: React.FC<PointCloudSceneProps> = (props) => {
  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 10000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' }}
      dpr={[1, 2]}
    >
      <fog attach="fog" args={['#0a0a1a', 10, 1000]} />
      <SceneContent {...props} />
    </Canvas>
  );
};

export default PointCloudScene;
