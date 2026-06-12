import { useEffect, useCallback, useRef } from 'react';
import { usePlantStore } from './store';
import type { PlantNode, Stage } from './types';
import { COLORS, STAGE_NAMES } from './types';
import {
  generateNodeId,
  generateParticleId,
  generateEffectId,
  calculateGrowthMultiplier,
  checkWilting,
  getStageAndProgress,
  clamp,
  lerpColor,
  randomRange,
  STAGE_DURATIONS
} from './utils';

export default function PlantGrowth() {
  const {
    isPlanted,
    plantTime,
    currentStage,
    growthSpeedMultiplier,
    isWilting,
    wiltingProgress,
    environment,
    plantNodes,
    rootNodeId,
    setPlantTime,
    setCurrentStage,
    setStageProgress,
    setGrowthSpeedMultiplier,
    setWilting,
    setWiltingProgress,
    addNode,
    updateNode,
    setStats,
    showStageLabelWithText,
    hideStageLabel,
    setSoilProgress,
    setCotyledonProgress,
    setShowCotyledon,
    addParticle,
    updateParticles,
    addCutEffect,
    updateCutEffects,
    markStatChange
  } = usePlantStore();

  const animationFrameRef = useRef<number | null>(null);
  const lastStageRef = useRef<Stage>(-1 as unknown as Stage);
  const stageLabelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStatsRef = useRef({ height: 0, leafCount: 0, budCount: 0, fruitCount: 0 });

  const createMainStem = useCallback((): string => {
    const id = generateNodeId();
    const node: PlantNode = {
      id,
      type: 'stem',
      parentId: null,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      length: 0,
      radius: 0.03,
      color: COLORS.LIGHT_GREEN,
      targetColor: COLORS.DARK_GREEN,
      growthProgress: 0,
      stage: 0,
      children: [],
      isCut: false,
      isWilting: false,
      wiltingProgress: 0,
      createdAt: performance.now()
    };
    addNode(node);
    return id;
  }, [addNode]);

  const createCotyledons = useCallback((parentId: string) => {
    const positions: [number, number, number][] = [
      [0.05, 0, 0],
      [-0.05, 0, 0]
    ];
    const rotations: [number, number, number][] = [
      [0, 0, -Math.PI / 4],
      [0, 0, Math.PI / 4]
    ];

    positions.forEach((pos, i) => {
      const id = generateNodeId();
      const node: PlantNode = {
        id,
        type: 'cotyledon',
        parentId,
        position: pos,
        rotation: rotations[i],
        scale: [1, 1, 1],
        length: 0.2,
        radius: 0.04,
        color: COLORS.LIGHT_GREEN,
        targetColor: COLORS.LIGHT_GREEN,
        growthProgress: 0,
        stage: 0,
        children: [],
        isCut: false,
        isWilting: false,
        wiltingProgress: 0,
        createdAt: performance.now()
      };
      addNode(node);
      updateNode(parentId, { children: [...plantNodes[parentId].children, id] });
    });
  }, [addNode, updateNode, plantNodes]);

  const createBranch = useCallback((parentId: string, heightRatio: number, angle: number): string => {
    const id = generateNodeId();
    const parentNode = plantNodes[parentId];
    const yPos = parentNode ? parentNode.length * heightRatio : 0.5;
    
    const node: PlantNode = {
      id,
      type: 'branch',
      parentId,
      position: [0, yPos, 0],
      rotation: [0, angle, Math.PI / 4],
      scale: [1, 1, 1],
      length: 0.3,
      radius: 0.015,
      color: COLORS.LIGHT_GREEN,
      targetColor: COLORS.DARK_GREEN,
      growthProgress: 0,
      stage: 1,
      children: [],
      isCut: false,
      isWilting: false,
      wiltingProgress: 0,
      createdAt: performance.now()
    };
    addNode(node);
    updateNode(parentId, { children: [...plantNodes[parentId].children, id] });
    return id;
  }, [addNode, updateNode, plantNodes]);

  const createLeaf = useCallback((parentId: string, parentLength: number, nodeIndex: number): string => {
    const id = generateNodeId();
    const angle = (nodeIndex % 2 === 0 ? 1 : -1) * Math.PI / 3;
    const yPos = parentLength * (0.3 + Math.random() * 0.6);
    
    const node: PlantNode = {
      id,
      type: 'leaf',
      parentId,
      position: [0, yPos, 0],
      rotation: [0, angle * (nodeIndex % 2 === 0 ? 1 : -1), angle],
      scale: [1, 1, 1],
      length: 0.15,
      radius: 0.05,
      color: COLORS.LIGHT_GREEN,
      targetColor: COLORS.DARK_GREEN,
      growthProgress: 0,
      stage: 2,
      children: [],
      isCut: false,
      isWilting: false,
      wiltingProgress: 0,
      createdAt: performance.now()
    };
    addNode(node);
    updateNode(parentId, { children: [...plantNodes[parentId].children, id] });
    return id;
  }, [addNode, updateNode, plantNodes]);

  const createBud = useCallback((parentId: string): string => {
    const id = generateNodeId();
    const parentNode = plantNodes[parentId];
    const yPos = parentNode ? parentNode.length : 1;
    
    const node: PlantNode = {
      id,
      type: 'bud',
      parentId,
      position: [0, yPos, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      length: 0,
      radius: 0.08,
      color: COLORS.PINK,
      targetColor: COLORS.PINK,
      growthProgress: 0,
      stage: 3,
      children: [],
      isCut: false,
      isWilting: false,
      wiltingProgress: 0,
      createdAt: performance.now()
    };
    addNode(node);
    updateNode(parentId, { children: [...plantNodes[parentId].children, id] });
    return id;
  }, [addNode, updateNode, plantNodes]);

  const createFlower = useCallback((budId: string): string => {
    const budNode = plantNodes[budId];
    if (!budNode) return '';
    
    const id = generateNodeId();
    const node: PlantNode = {
      id,
      type: 'flower',
      parentId: budNode.parentId,
      position: budNode.position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      length: 0,
      radius: 0.15,
      color: COLORS.PINK,
      targetColor: COLORS.PINK,
      growthProgress: 0,
      stage: 3,
      children: [],
      isCut: false,
      isWilting: false,
      wiltingProgress: 0,
      createdAt: performance.now()
    };
    addNode(node);
    
    if (budNode.parentId) {
      const parent = plantNodes[budNode.parentId];
      if (parent) {
        const newChildren = parent.children.filter(c => c !== budId);
        newChildren.push(id);
        updateNode(budNode.parentId, { children: newChildren });
      }
    }
    
    return id;
  }, [addNode, updateNode, plantNodes]);

  const createFruit = useCallback((flowerId: string): string => {
    const flowerNode = plantNodes[flowerId];
    if (!flowerNode) return '';
    
    const id = generateNodeId();
    const node: PlantNode = {
      id,
      type: 'fruit',
      parentId: flowerNode.parentId,
      position: flowerNode.position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      length: 0,
      radius: 0.1,
      color: COLORS.RED,
      targetColor: COLORS.RED,
      growthProgress: 0,
      stage: 3,
      children: [],
      isCut: false,
      isWilting: false,
      wiltingProgress: 0,
      createdAt: performance.now()
    };
    addNode(node);
    
    if (flowerNode.parentId) {
      const parent = plantNodes[flowerNode.parentId];
      if (parent) {
        const newChildren = parent.children.filter(c => c !== flowerId);
        newChildren.push(id);
        updateNode(flowerNode.parentId, { children: newChildren });
      }
    }
    
    return id;
  }, [addNode, updateNode, plantNodes]);

  const createNewGrowthPoint = useCallback((parentId: string, cutPosition: [number, number, number]) => {
    setTimeout(() => {
      const parent = plantNodes[parentId];
      if (!parent) return;
      
      for (let i = 0; i < 2; i++) {
        const id = generateNodeId();
        const angle = i === 0 ? Math.PI / 3 : -Math.PI / 3;
        const node: PlantNode = {
          id,
          type: 'branch',
          parentId,
          position: cutPosition,
          rotation: [0, angle * (i + 1), angle],
          scale: [1, 1, 1],
          length: 0.2,
          radius: 0.012,
          color: COLORS.LIGHT_GREEN,
          targetColor: COLORS.DARK_GREEN,
          growthProgress: 0,
          stage: currentStage,
          children: [],
          isCut: false,
          isWilting: false,
          wiltingProgress: 0,
          createdAt: performance.now()
        };
        addNode(node);
        updateNode(parentId, { children: [...plantNodes[parentId].children, id] });
      }
      
      markStatChange('leafCount');
    }, 1000);
  }, [addNode, updateNode, plantNodes, currentStage, markStatChange]);

  const handlePruning = useCallback((nodeId: string, cutPosition: [number, number, number]) => {
    const node = plantNodes[nodeId];
    if (!node) return;
    
    usePlantStore.getState().cutNode(nodeId, cutPosition);
    
    addCutEffect({
      id: generateEffectId(),
      position: cutPosition,
      createdAt: performance.now(),
      duration: 400
    });
    
    const particleCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < particleCount; i++) {
      addParticle({
        id: generateParticleId(),
        type: 'leaf',
        position: [...cutPosition] as [number, number, number],
        velocity: [
          randomRange(-0.5, 0.5),
          randomRange(0.3, 0.8),
          randomRange(-0.5, 0.5)
        ],
        rotation: [
          randomRange(0, Math.PI * 2),
          randomRange(0, Math.PI * 2),
          randomRange(0, Math.PI * 2)
        ],
        rotationSpeed: [
          randomRange(-5, 5),
          randomRange(-5, 5),
          randomRange(-5, 5)
        ],
        scale: randomRange(0.3, 0.7),
        color: lerpColor(COLORS.LIGHT_GREEN, COLORS.DARK_GREEN, Math.random()),
        lifetime: 1500,
        maxLifetime: 1500
      });
    }
    
    createNewGrowthPoint(nodeId, cutPosition);
  }, [plantNodes, addCutEffect, addParticle, createNewGrowthPoint]);

  useEffect(() => {
    const unsubscribe = usePlantStore.subscribe(
      (state) => state.plantNodes,
      (nodes) => {
        let height = 0;
        let leafCount = 0;
        let budCount = 0;
        let fruitCount = 0;
        
        Object.values(nodes).forEach(node => {
          if (node.type === 'stem' || node.type === 'branch') {
            const nodeTop = node.position[1] + node.length;
            height = Math.max(height, nodeTop);
          }
          if (node.type === 'leaf' || node.type === 'cotyledon') leafCount++;
          if (node.type === 'bud') budCount++;
          if (node.type === 'flower') budCount++;
          if (node.type === 'fruit') fruitCount++;
        });
        
        if (height !== lastStatsRef.current.height) {
          lastStatsRef.current.height = height;
          markStatChange('height');
        }
        if (leafCount !== lastStatsRef.current.leafCount) {
          lastStatsRef.current.leafCount = leafCount;
          markStatChange('leafCount');
        }
        if (budCount !== lastStatsRef.current.budCount) {
          lastStatsRef.current.budCount = budCount;
          markStatChange('budCount');
        }
        if (fruitCount !== lastStatsRef.current.fruitCount) {
          lastStatsRef.current.fruitCount = fruitCount;
          markStatChange('fruitCount');
        }
        
        setStats({ height, leafCount, budCount, fruitCount });
      }
    );
    
    return unsubscribe;
  }, [setStats, markStatChange]);

  useEffect(() => {
    if (!isPlanted) return;
    
    let lastTime = performance.now();
    
    const animate = (now: number) => {
      const deltaTime = Math.min(100, now - lastTime);
      lastTime = now;
      
      const newElapsed = usePlantStore.getState().plantTime > 0 
        ? now - usePlantStore.getState().plantTime 
        : 0;
      setPlantTime(usePlantStore.getState().plantTime > 0 ? usePlantStore.getState().plantTime : now);
      
      const multiplier = calculateGrowthMultiplier(environment);
      setGrowthSpeedMultiplier(multiplier);
      
      const shouldWilt = checkWilting(environment);
      if (shouldWilt !== isWilting) {
        setWilting(shouldWilt);
      }
      
      const newWiltingProgress = shouldWilt
        ? clamp(wiltingProgress + deltaTime / 3000, 0, 1)
        : clamp(wiltingProgress - deltaTime / 5000, 0, 1);
      setWiltingProgress(newWiltingProgress);
      
      const { stage, progress, totalProgress } = getStageAndProgress(newElapsed, multiplier);
      setStageProgress(progress);
      
      if (stage !== lastStageRef.current) {
        lastStageRef.current = stage;
        setCurrentStage(stage);
        
        if (stageLabelTimeoutRef.current) {
          clearTimeout(stageLabelTimeoutRef.current);
        }
        showStageLabelWithText(STAGE_NAMES[stage]);
        stageLabelTimeoutRef.current = setTimeout(() => {
          hideStageLabel();
        }, 2000);
      }
      
      if (totalProgress > 0 && totalProgress < 0.2) {
        setSoilProgress(Math.min(1, totalProgress * 5));
      }
      
      if (totalProgress > 0.05 && totalProgress < 0.3) {
        const cotProgress = clamp((totalProgress - 0.05) * 4, 0, 1);
        setCotyledonProgress(cotProgress);
        if (cotProgress > 0) {
          setShowCotyledon(true);
        }
      }
      
      const state = usePlantStore.getState();
      if (!state.rootNodeId && totalProgress > 0.02) {
        const stemId = createMainStem();
        if (totalProgress > 0.1) {
          createCotyledons(stemId);
        }
      }
      
      if (state.rootNodeId) {
        const rootNode = state.plantNodes[state.rootNodeId];
        if (rootNode) {
          const maxHeight = stage === 0 
            ? 0.5 
            : stage === 1 
              ? 1.0 
              : stage === 2 
                ? 2.0 
                : 2.2;
          const targetLength = maxHeight * (stage === 0 ? progress : stage < 3 ? progress * 0.5 + 0.5 : 1);
          updateNode(state.rootNodeId, { 
            length: targetLength,
            growthProgress: totalProgress,
            isWilting: shouldWilt,
            wiltingProgress: newWiltingProgress