import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ImageProcessor } from './ImageProcessor';
import { SceneBuilder } from './SceneBuilder';
import { ProcessedImageData } from './SharedTypes';

const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedImageData | null>(null);
  const [cameraInfo, setCameraInfo] = useState({ x: 0, y: 0, z: 0, elevation: 0 });
  const [viewTransition, setViewTransition] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const container3DRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneBuilderRef = useRef<SceneBuilder | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  const imageProcessor = useRef(new ImageProcessor());

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setIs3DMode(false);
      setProcessedData(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);

        setTimeout(() => {
          const data = imageProcessor.current.processImage(imageData);
          setProcessedData(data);
          setIsProcessing(false);
        }, 50);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleGenerate3D = useCallback(() => {
    if (!processedData || !container3DRef.current) return;

    setIsProcessing(true);
    setViewTransition(true);

    setTimeout(() => {
      setIs3DMode(true);
      setIsProcessing(false);
      setViewTransition(false);
    }, 300);
  }, [processedData]);

  const handleToggleView = useCallback(() => {
    setViewTransition(true);
    setTimeout(() => {
      setIs3DMode(!is3DMode);
      setViewTransition(false);
    }, 300);
  }, [is3DMode]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.3, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.3, 0.2));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.2, Math.min(10, prev * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      setOffset((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!canvas2DRef.current || !processedData || is3DMode) return;

    const canvas = canvas2DRef.current;
    const ctx = canvas.getContext('2d')!;
    const container = canvas.parentElement!;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    resize();

    const drawGrid = () => {
      const gridSize = 40;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    const drawConnections = () => {
      if (!processedData) return;

      const centerX = canvas.width / 2 + offset.x;
      const centerY = canvas.height / 2 + offset.y;
      const scale = Math.min(canvas.width, canvas.height) * 0.4 * zoom;

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      const nodeMap = new Map();
      for (const node of processedData.nodes) {
        nodeMap.set(node.id, node.position);
      }

      for (const conn of processedData.connections) {
        const from = nodeMap.get(conn.from);
        const to = nodeMap.get(conn.to);
        if (!from || !to) continue;

        ctx.beginPath();
        ctx.moveTo(
          centerX + from.x * scale,
          centerY + from.y * scale
        );
        ctx.lineTo(
          centerX + to.x * scale,
          centerY + to.y * scale
        );
        ctx.stroke();
      }
    };

    const drawNodes = () => {
      if (!processedData) return;

      const centerX = canvas.width / 2 + offset.x;
      const centerY = canvas.height / 2 + offset.y;
      const scale = Math.min(canvas.width, canvas.height) * 0.4 * zoom;
      const nodeRadius = 4 * zoom;

      for (const node of processedData.nodes) {
        const x = centerX + node.position.x * scale;
        const y = centerY + node.position.y * scale;

        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#a78bfa';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, nodeRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(167, 139, 250, 0.2)';
        ctx.fill();
      }
    };

    const drawMinerals = () => {
      if (!processedData) return;

      const centerX = canvas.width / 2 + offset.x;
      const centerY = canvas.height / 2 + offset.y;
      const scale = Math.min(canvas.width, canvas.height) * 0.4 * zoom;
      const mineralSize = 6 * zoom;

      for (const mineral of processedData.minerals) {
        const x = centerX + mineral.position.x * scale;
        const y = centerY + mineral.position.y * scale;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);

        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.fillRect(-mineralSize, -mineralSize, mineralSize * 2, mineralSize * 2);

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-mineralSize * 0.6, -mineralSize * 0.6, mineralSize * 1.2, mineralSize * 1.2);

        ctx.restore();
      }
    };

    const drawDangers = () => {
      if (!processedData) return;

      const centerX = canvas.width / 2 + offset.x;
      const centerY = canvas.height / 2 + offset.y;
      const scale = Math.min(canvas.width, canvas.height) * 0.4 * zoom;
      const dangerSize = 8 * zoom;

      for (const danger of processedData.dangers) {
        const x = centerX + danger.position.x * scale;
        const y = centerY + danger.position.y * scale;

        ctx.beginPath();
        ctx.moveTo(x, y - dangerSize);
        ctx.lineTo(x - dangerSize * 0.7, y + dangerSize * 0.5);
        ctx.lineTo(x + dangerSize * 0.7, y + dangerSize * 0.5);
        ctx.closePath();
        ctx.fillStyle = '#dc2626';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y + dangerSize * 0.8, dangerSize * 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid();
      drawConnections();
      drawMinerals();
      drawDangers();
      drawNodes();
    };

    render();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [processedData, is3DMode, zoom, offset]);

  useEffect(() => {
    if (!container3DRef.current || !is3DMode || !processedData) return;

    const container = container3DRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 100);
    camera.position.set(3, 2, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2 + 0.3;
    controlsRef.current = controls;

    const sceneBuilder = new SceneBuilder();
    sceneBuilderRef.current = sceneBuilder;
    const result = sceneBuilder.build(processedData);

    scene.add(result.scene);

    const ambientLight = new THREE.AmbientLight(0x334155, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const groundGeo = new THREE.PlaneGeometry(10, 10);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
    gridHelper.position.y = -1.49;
    scene.add(gridHelper);

    const updateCameraInfo = () => {
      const pos = camera.position;
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(pos);
      const elevation = (spherical.phi * 180) / Math.PI - 90;

      setCameraInfo({
        x: parseFloat(pos.x.toFixed(2)),
        y: parseFloat(pos.y.toFixed(2)),
        z: parseFloat(pos.z.toFixed(2)),
        elevation: parseFloat(elevation.toFixed(1)),
      });
    };

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();

      const time = Date.now() * 0.001;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Group && obj.name === 'dangerCone') {
          obj.rotation.y += 0.01;
        }
      });

      renderer.render(scene, camera);
      updateCameraInfo();
    };

    animate();
    result.start();

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      result.stop();

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }

      renderer.dispose();
      controls.dispose();
      sceneBuilder.dispose();
    };
  }, [is3DMode, processedData]);

  const depthRange = processedData
    ? { min: processedData.bounds.minDepth.toFixed(2), max: processedData.bounds.maxDepth.toFixed(2) }
    : { min: '0.00', max: '1.00' };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <div className="app-title-icon">⛏️</div>
          <div>
            <div>CaveMapper</div>
            <div className="app-subtitle">矿山地图3D可视化工具</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {processedData && (
            <button
              className={`btn btn-toggle ${is3DMode ? 'active' : ''}`}
              onClick={handleToggleView}
            >
              {is3DMode ? '3D视图' : '2D视图'}
            </button>
          )}
        </div>
      </header>

      <div className="main-content">
        <aside className="left-panel">
          <div className="card">
            <div className="card-header">
              <div className="card-title">上传地图</div>
            </div>
            <div className="card-body">
              <div
                ref={uploadAreaRef}
                className={`upload-area ${isDragging ? 'dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleInputChange}
                />
                {uploadedImage ? (
                  <>
                    <img
                      src={uploadedImage}
                      alt="上传的地图"
                      className="upload-thumbnail"
                    />
                    <div className="upload-filename">{fileName}</div>
                  </>
                ) : (
                  <>
                    <div className="upload-icon">🗺️</div>
                    <div className="upload-text">
                      <strong>拖拽图片到这里</strong>
                      <br />
                      或点击选择文件
                    </div>
                    <div className="upload-hint">
                      支持 PNG、JPG 等格式
                    </div>
                  </>
                )}
              </div>

              <div className="generate-btn-container">
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate3D}
                  disabled={!processedData || isProcessing}
                >
                  {isProcessing ? '处理中...' : '生成3D模型'}
                </button>
              </div>
            </div>
          </div>

          {processedData && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">数据统计</div>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-card">
                    <div className="info-card-value">{processedData.nodes.length}</div>
                    <div className="info-card-label">节点数</div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-value">{processedData.connections.length}</div>
                    <div className="info-card-label">连接数</div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-value">{processedData.minerals.length}</div>
                    <div className="info-card-label">矿藏</div>
                  </div>
                  <div className="info-card">
                    <div className="info-card-value">{processedData.dangers.length}</div>
                    <div className="info-card-label">危险区</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title">图例说明</div>
            </div>
            <div className="card-body">
              <div className="legend-items">
                <div className="legend-item">
                  <div className="legend-icon tube"></div>
                  <span>矿道（深度渐变）</span>
                </div>
                <div className="legend-item">
                  <div className="legend-icon node"></div>
                  <span>节点 / 交汇点</span>
                </div>
                <div className="legend-item">
                  <div className="legend-icon mineral"></div>
                  <span>矿藏分布</span>
                </div>
                <div className="legend-item">
                  <div className="legend-icon danger"></div>
                  <span>危险区域</span>
                </div>
              </div>
            </div>
          </div>

          {!is3DMode && processedData && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">视图控制</div>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleZoomIn}>
                    放大
                  </button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleZoomOut}>
                    缩小
                  </button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleResetView}>
                    重置
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
                  滚轮缩放 · 右键/中键平移
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="right-panel">
          <div className="viewer-container">
            {!processedData && !isProcessing && (
              <div className="empty-state">
                <div className="empty-state-icon">🏔️</div>
                <div className="empty-state-text">
                  上传一张矿山地图图片
                  <br />
                  自动解析并生成3D矿道模型
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="processing-overlay">
                <div className="processing-spinner"></div>
                <div className="processing-text">正在处理图像...</div>
              </div>
            )}

            {processedData && !is3DMode && !isProcessing && (
              <div
                className={`grid-preview ${viewTransition ? 'view-fade-exit' : ''}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
              >
                <canvas ref={canvas2DRef} className="grid-canvas" />
              </div>
            )}

            {is3DMode && !isProcessing && (
              <div
                ref={container3DRef}
                className={`viewer-canvas ${viewTransition ? 'view-fade-enter' : ''}`}
              />
            )}

            {processedData && is3DMode && (
              <>
                <div className="depth-legend">
                  <div className="depth-legend-title">深度图例</div>
                  <div className="depth-gradient-bar"></div>
                  <div className="depth-labels">
                    <div className="depth-label">
                      <span>max</span>
                      <span>{depthRange.max}</span>
                    </div>
                    <div className="depth-label">
                      <span>min</span>
                      <span>{depthRange.min}</span>
                    </div>
                  </div>
                </div>

                <div className="camera-info">
                  <div className="camera-info-label">Camera</div>
                  <div>X: {cameraInfo.x.toFixed(2)}</div>
                  <div>Y: {cameraInfo.y.toFixed(2)}</div>
                  <div>Z: {cameraInfo.z.toFixed(2)}</div>
                  <div style={{ marginTop: '4px', color: 'var(--accent-yellow)' }}>
                    Elev: {cameraInfo.elevation.toFixed(1)}°
                  </div>
                </div>

                <div className="view-toggle">
                  <button
                    className={`btn btn-toggle ${is3DMode ? 'active' : ''}`}
                    onClick={handleToggleView}
                  >
                    {is3DMode ? '2D视图' : '3D视图'}
                  </button>
                </div>
              </>
            )}

            {processedData && !is3DMode && (
              <div className="zoom-controls">
                <button className="zoom-btn" onClick={handleZoomIn}>+</button>
                <button className="zoom-btn" onClick={handleZoomOut}>−</button>
                <button className="zoom-btn" onClick={handleResetView} style={{ fontSize: '14px' }}>
                  ⟲
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
