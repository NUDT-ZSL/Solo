import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeData, EdgeData } from '@/types';
import { SceneManager } from '@/modules/SceneManager';
import { DataService } from '@/modules/DataService';
import ControlPanel from '@/components/ControlPanel';

const App: React.FC = () => {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const handleNodeClick = useCallback((node: NodeData | null) => {
    setSelectedNode(node);
