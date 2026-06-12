import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { VisualizationData, NeuronData } from '../types';
import {
  buildNetwork,
  fadeInAnimation,
  highlightNeuron,
  updateLabelsVisibility,
  type NetworkObjects
} from '../utils/networkBuilder';

interface NeuralNetworkProps {
  data: VisualizationData | null;
  showConnectionLabels: boolean;
  showLayerLabels: boolean;
  onNeuronClick: (neuron: NeuronData | null) => void;
  highlightedNeuronId: string | null;
}

export default function NeuralNetwork({
  data,
  showConnectionLabels,
  showLayerLabels,
  onNeuronClick,
  highlightedNeuronId
}: NeuralNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const networkObjectsRef = useRef<NetworkObjects | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fadeInCleanupRef = useRef<(() => void) | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const targetScaleRef = useRef(1);
  const networkGroupRef = useRef<THREE.Group | null>(null);
  const lastClickTimeRef = useRef(0);

  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, -5, 5);
    scene.add(pointLight);

    const animate = () => {
      rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * 0.1;
      rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * 0.1;
      scaleRef.current += (targetScaleRef.current - scaleRef.current) * 0.1;

      if (networkGroupRef.current) {
        networkGroupRef.current.rotation.x = rotationRef.current.x;
        networkGroupRef.current.rotation.y = rotationRef.current.y;
        networkGroupRef.current.scale.setScalar(scaleRef.current);
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const resetCamera = useCallback(() => {
    targetRotationRef.current = { x: 0, y: 0 };
    targetScaleRef.current = 1;
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 15);
    }
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    isDraggingRef.current = true;
    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - previousMouseRef.current.x;
    const deltaY = e.clientY - previousMouseRef.current.y;

    targetRotationRef.current.y += deltaX * 0.003;
    targetRotationRef.current.x += deltaY * 0.003;

    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    targetScaleRef.current = Math.max(0.5, Math.min(3, targetScaleRef.current + delta));
  }, []);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current || !networkObjectsRef.current) return;

    const now = performance.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    if (timeSinceLastClick < 300) {
      resetCamera();
      onNeuronClick(null);
      lastClickTimeRef.current = 0;
      return;
    }

    lastClickTimeRef.current = now;

    if (isDraggingRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const neuronMeshes = Array.from(networkObjectsRef.current.neurons.values());
    const intersects = raycasterRef.current.intersectObjects(neuronMeshes);

    if (intersects.length > 0) {
      const neuronId = intersects[0].object.userData.neuronId;
      const neuronData = networkObjectsRef.current.neuronData.get(neuronId);
      if (neuronData) {
        onNeuronClick(neuronData);
      }
    } else {
      onNeuronClick(null);
    }
  }, [onNeuronClick, resetCamera]);

  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('click', handleClick);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleClick]);

  useEffect(() => {
    if (!sceneRef.current || !data) return;

    if (networkObjectsRef.current) {
      sceneRef.current.remove(networkObjectsRef.current.scene);
      networkObjectsRef.current = null;
    }
    if (fadeInCleanupRef.current) {
      fadeInCleanupRef.current();
      fadeInCleanupRef.current = null;
    }

    const { objects } = buildNetwork(data);
    networkObjectsRef.current = objects;
    networkGroupRef.current = objects.scene;
    sceneRef.current.add(objects.scene);

    targetRotationRef.current = { x: 0, y: 0 };
    targetScaleRef.current = 1;

    fadeInCleanupRef.current = fadeInAnimation(objects, data.layers, () => {
      updateLabelsVisibility(
        objects,
        showConnectionLabels,
        showLayerLabels,
        null
      );
      objects.neurons.forEach((neuron) => {
        const mat = neuron.material as THREE.MeshStandardMaterial;
        mat.opacity = 1;
      });
      objects.connections.forEach((conn) => {
        const mat = conn.material as THREE.LineBasicMaterial;
        mat.opacity = 0.3;
      });
    });
  }, [data, showConnectionLabels, showLayerLabels]);

  useEffect(() => {
    if (networkObjectsRef.current) {
      highlightNeuron(
        networkObjectsRef.current,
        highlightedNeuronId,
        showConnectionLabels,
        showLayerLabels
      );
    }
  }, [highlightedNeuronId, showConnectionLabels, showLayerLabels]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a2e',
        cursor: isDraggingRef.current ? 'grabbing' : 'grab'
      }}
    />
  );
}
