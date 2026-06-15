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
    environment,
    currentStage,
    growthSpeedMultiplier,
    isWilting,
    wiltingProgress,
    plantNodes,
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
    markStatChange,
    plantTime,
    rootNodeId
  } = usePlantStore();

  const animationFrameRef = useRef<number | null>(null);
  const lastStageRef = useRef<Stage>(-1 as unknown as Stage);
  const stageLabelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStatsRef = useRef({ height: 0, leafCount: 0, budCount: 0, fruitCount: 0 });
  const createdBranchesRef = useRef<Set<string>>(new Set());
  const createdLeavesRef = useRef<Set<string>>(new Set());
  const createdBudRef = useRef(false);
  const createdFlowerRef = useRef(false);
  const createdFruitRef = useRef(false);
  const cutHandlersRef = useRef<Map<string, boolean>>(new Map());

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
      [0, 0, 0],
      [0, 0, 0]
    ];
    const rotations: [number, number, number][] = [
      [0, 0, -Math.PI / 3],
      [0, Math.PI, Math.PI / 3]
    ];

    const currentParent = usePlantStore.getState().plantNodes[parentId];
    if (!currentParent) return;
    const existingChildren = [...currentParent.children];

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
        radius: 0.05,
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
      existingChildren.push(id);
    });
    updateNode(parentId, { children: existingChildren });
  }, [addNode, updateNode]);

  const createBranch = useCallback((parentId: string, heightRatio: number, angle: number): string => {
    const id = generateNodeId();
    const state = usePlantStore.getState();
    const parentNode = state.plantNodes[parentId];
    const yPos = parentNode ? parentNode.length * heightRatio : 0.5;
    const existingChildren = parentNode ? [...parentNode.children] : [];

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
    existingChildren.push(id);
    updateNode(parentId, { children: existingChildren });
    return id;
  }, [addNode, updateNode]);

  const createLeaf = useCallback((parentId: string, parentLength: number, nodeIndex: number, yPos: number, angle: number): string => {
    const id = generateNodeId();
    const state = usePlantStore.getState();
    const parentNode = state.plantNodes[parentId];
    const existingChildren = parentNode ? [...parentNode.children] : [];
    
    const node: PlantNode = {
      id,
      type: 'leaf',
      parentId,
      position: [0, yPos, 0],
      rotation: [0, angle, (nodeIndex % 2 === 0 ? 1 : -1) * Math.PI / 3],
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
    existingChildren.push(id);
    updateNode(parentId, { children: existingChildren });
    return id;
  }, [addNode, updateNode]);

  const createBud = useCallback((parentId: string): string => {
    const id = generateNodeId();
    const state = usePlantStore.getState();
    const parentNode = state.plantNodes[parentId];
    const yPos = parentNode ? parentNode.length : 1;
    const existingChildren = parentNode ? [...parentNode.children] : [];
    
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
    existingChildren.push(id);
    updateNode(parentId, { children: existingChildren });
    return id;
  }, [addNode, updateNode]);

  const createFlower = useCallback((budId: string): string => {
    const state = usePlantStore.getState();
    const budNode = state.plantNodes[budId];
    if (!budNode || !budNode.parentId) return '';
    
    const id = generateNodeId();
    const parentId = budNode.parentId;
    const parentNode = state.plantNodes[parentId];
    const parentChildren = parentNode ? [...parentNode.children.filter(c => c !== budId) : [];

    const node: PlantNode = {
      id,
      type: 'flower',
      parentId,
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
    parentChildren.push(id);
    updateNode(parentId, { children: parentChildren });
    
    return id;
  }, [addNode, updateNode]);

  const createFruit = useCallback((flowerId: string): string => {
    const state = usePlantStore.getState();
    const flowerNode = state.plantNodes[flowerId];
    if (!flowerNode || !flowerNode.parentId) return '';
    
    const id = generateNodeId();
    const parentId = flowerNode.parentId;
    const parentNode = state.plantNodes[parentId];
    const parentChildren = parentNode ? [...parentNode.children.filter(c => c !== flowerId)] : [];

    const node: PlantNode = {
      id,
      type: 'fruit',
      parentId,
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
    parentChildren.push(id);
    updateNode(parentId, { children: parentChildren });
    
    return id;
  }, [addNode, updateNode]);

  const createNewGrowthPoint = useCallback((parentId: string, cutPosition: [number, number, number]) => {
    setTimeout(() => {
      const state = usePlantStore.getState();
      const parent = state.plantNodes[parentId];
      if (!parent) return;
      
      const existingChildren = [...parent.children];
      
      for (let i = 0; i < 2; i++) {
        const id = generateNodeId();
        const angle = (i === 0 ? Math.PI / 3 : -Math.PI / 3);
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
          stage: state.currentStage,
          children: [],
          isCut: false,
          isWilting: false,
          wiltingProgress: 0,
          createdAt: performance.now()
        };
        addNode(node);
        existingChildren.push(id);
      }
      updateNode(parentId, { children: existingChildren });
      markStatChange('leafCount');
    }, 1000);
  }, [addNode, updateNode, markStatChange]);

  const handlePruning = useCallback((nodeId: string, cutPosition: [number, number, number]) => {
    if (cutHandlersRef.current.has(nodeId + '-' + cutPosition.join(','))) return;
    cutHandlersRef.current.set(nodeId + '-' + cutPosition.join(','), true);

    const state = usePlantStore.getState();
    const node = state.plantNodes[nodeId];
    if (!node) return;
    
    state.cutNode(nodeId, cutPosition);
    
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
    
    setTimeout(() => {
      cutHandlersRef.current.delete(nodeId + '-' + cutPosition.join(','));
    }, 500);
  }, [addCutEffect, addParticle, createNewGrowthPoint]);

  useEffect(() => {
    (window as unknown as { __handlePruning: typeof handlePruning }).__handlePruning = handlePruning;
  }, [handlePruning]);

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
            const nodeTop = node.position[1] + node.length * (node.growthProgress || 1);
            height = Math.max(height, nodeTop);
          }
          if (node.type === 'leaf' || node.type === 'cotyledon') leafCount++;
          if (node.type === 'bud') budCount++;
          if (node.type === 'flower') budCount++;
          if (node.type === 'fruit') fruitCount++;
        });
        
        if (Math.abs(height - lastStatsRef.current.height) > 0.001) {
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
    let rootId: string | null = null;
    let lastBudId: string | null = null;
    let lastFlowerId: string | null = null;
    
    createdBranchesRef.current = new Set();
    createdLeavesRef.current = new Set();
    createdBudRef.current = false;
    createdFlowerRef.current = false;
    createdFruitRef.current = false;

    const animate = (now: number) => {
      const deltaTime = Math.min(100, now - lastTime);
      lastTime = now;
      
      const state = usePlantStore.getState();
      const basePlantTime = state.plantTime || now;
      const elapsed = now - basePlantTime;
      
      const multiplier = calculateGrowthMultiplier(environment);
      setGrowthSpeedMultiplier(multiplier);
      
      const shouldWilt = checkWilting(environment);
      if (shouldWilt !== state.isWilting) {
        setWilting(shouldWilt);
      }
      
      const currentWP = state.wiltingProgress;
      const newWiltingProgress = shouldWilt
        ? clamp(currentWP + deltaTime / 3000, 0, 1)
        : clamp(currentWP - deltaTime / 5000, 0, 1);
      if (Math.abs(newWiltingProgress - currentWP) > 0.001) {
        setWiltingProgress(newWiltingProgress);
      }
      
      const { stage, progress, totalProgress } = getStageAndProgress(elapsed, multiplier);
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
      
      if (totalProgress > 0.05) {
        const cotProgress = clamp((totalProgress - 0.05) * 4;
        setCotyledonProgress(Math.min(1, cotProgress));
        if (cotProgress > 0) {
          setShowCotyledon(true);
        }
      }
      
      const currentState = usePlantStore.getState();
      if (!currentState.rootNodeId && totalProgress > 0.02) {
        rootId = createMainStem();
      }
      
      const currState2 = usePlantStore.getState();
      if (currState2.rootNodeId && totalProgress > 0.1) {
        const rootId = currState2.rootNodeId;
        const rn = currState2.plantNodes[rootId];
        
        const cots = Object.values(currState2.plantNodes).filter(n => n.type === 'cotyledon');
        if (rn && cots.length === 0) {
          createCotyledons(rootId);
        }
      }
      
      const s3 = usePlantStore.getState();
      if (s3.rootNodeId) {
        const rid = s3.rootNodeId;
        const rootNode = s3.plantNodes[rid];
        if (rootNode) {
          const maxHeight = stage === 0 
            ? 0.5 
            : stage === 1 
              ? 1.0 
              : stage === 2 
                ? 2.0 
                : 2.2;
          const stageOffset = stage === 0 ? 0 : stage === 1 ? 0.5 : stage === 2 ? 1.0 : 2.0;
          const stageFrac = stage === 0 ? progress : 1;
          const targetLength = Math.min(maxHeight, stageOffset + (maxHeight - stageOffset) * stageFrac;
          const actualLength = Math.max(rootNode.length, targetLength);
          
          const nodeColor = lerpColor(COLORS.LIGHT_GREEN, COLORS.DARK_GREEN, totalProgress);
          const wiltColor = lerpColor(nodeColor, COLORS.BROWN, newWiltingProgress);
          
          if (Math.abs(actualLength - rootNode.length) > 0.001 ||
              Math.abs(newWiltingProgress - rootNode.wiltingProgress) > 0.001) {
            updateNode(rid, { 
              length: actualLength,
              growthProgress: totalProgress,
              isWilting: shouldWilt,
              wiltingProgress: newWiltingProgress,
              color: wiltColor
            });
          }
          
          if (stage >= 1 && actualLength > 0.5) {
            const branchKey = rid + '-first-branches';
            if (!createdBranchesRef.current.has(branchKey)) {
              createdBranchesRef.current.add(branchKey);
              setTimeout(() => {
                createBranch(rid, 0.7, 0);
                createBranch(rid, 0.7, Math.PI);
              }, 100);
            }
          }
          
          if (stage >= 2 && actualLength > 0.8) {
            for (let i = 1; i <= 3; i++) {
              const leafKey = `${rid}-leaf-${i}`;
              if (!createdLeavesRef.current.has(leafKey) && actualLength > (i * 0.4) {
                createdLeavesRef.current.add(leafKey);
                const yPos = i * 0.4;
                const angle = (i % 2 === 0 ? 1 : -1) * (i * Math.PI / 3);
                setTimeout(() => {
                  createLeaf(rid, actualLength, i, yPos, angle);
                }, i * 200);
              }
            }
          }
          
          if (stage >= 3 && progress > 0.1 && !createdBudRef.current && actualLength > 1.5) {
            createdBudRef.current = true;
            setTimeout(() => {
              lastBudId = createBud(rid);
            }, 200);
          }
          
          if (stage >= 3 && progress > 0.4 && !createdFlowerRef.current && lastBudId) {
            const bs = usePlantStore.getState();
            if (bs.plantNodes[lastBudId] && !createdFlowerRef.current) {
              createdFlowerRef.current = true;
              setTimeout(() => {
                lastFlowerId = createFlower(lastBudId);
              }, 300);
            }
          }
          
          if (stage >= 3 && progress > 0.8 && !createdFruitRef.current && lastFlowerId) {
            const fs = usePlantStore.getState();
            if (fs.plantNodes[lastFlowerId] && !createdFruitRef.current) {
              createdFruitRef.current = true;
              setTimeout(() => {
                createFruit(lastFlowerId);
              }, 500);
            }
          }
        }
      }
      
      const allNodes = usePlantStore.getState().plantNodes;
      Object.values(allNodes).forEach(node => {
        if (node.type !== 'stem' && node.parentId) {
          const prog = clamp((now - node.createdAt) * multiplier / 2000, 0, 1);
          let col = lerpColor(node.color, node.targetColor, prog);
          if (shouldWilt) {
            col = lerpColor(col, COLORS.BROWN, newWiltingProgress);
          }
          if (Math.abs(prog - node.growthProgress) > 0.001) {
            updateNode(node.id, {
              growthProgress: prog,
              color: col,
              isWilting: shouldWilt,
              wiltingProgress: newWiltingProgress
            });
          }
        }
      });
      
      updateParticles(particles => {
        return particles
          .map(p => {
            const dt = deltaTime / 1000;
            const newLifetime = p.lifetime - deltaTime;
            return {
              ...p,
              lifetime: newLifetime,
              position: [
                p.position[0] + p.velocity[0] * dt,
                Math.max(-0.1, p.position[1] + p.velocity[1] * dt,
                p.position[2] + p.velocity[2] * dt
              ] as [number, number, number],
              velocity: [
                p.velocity[0],
                p.velocity[1] - 2.5 * dt,
                p.velocity[2]
              ] as [number, number, number],
              rotation: [
                p.rotation[0] + p.rotationSpeed[0] * dt,
                p.rotation[1] + p.rotationSpeed[1] * dt,
                p.rotation[2] + p.rotationSpeed[2] * dt
              ] as [number, number, number]
            };
          })
          .filter(p => p.lifetime > 0 && p.position[1] > -0.2);
      });
      
      updateCutEffects(effects => {
        return effects.filter(e => now - e.createdAt < e.duration);
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stageLabelTimeoutRef.current) {
        clearTimeout(stageLabelTimeoutRef.current);
      }
    };
  }, [
    isPlanted,
    environment,
    createMainStem,
    createCotyledons,
    createBranch,
    createLeaf,
    createBud,
    createFlower,
    createFruit,
    updateParticles,
    updateCutEffects,
    setPlantTime,
    setCurrentStage,
    setStageProgress,
    setGrowthSpeedMultiplier,
    setWilting,
    setWiltingProgress,
    setSoilProgress,
    setCotyledonProgress,
    setShowCotyledon,
    showStageLabelWithText,
    hideStageLabel,
    markStatChange
  ]);

  return null;
}
