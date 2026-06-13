import { useState, useEffect, useRef, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import LayerPanel from './components/LayerPanel';
import SplitView from './components/SplitView';
import CanvasLayer from './components/CanvasLayer';
import { Layer, LAYER_COLORS, BLEND_MODES } from './types';
import { generateSampleImage } from './utils/sampleImages';
import './App.css';

function App() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const initLayers = async () => {
      const sampleTypes: Array<'satellite' | 'terrain' | 'nightlight' | 'roadmap'> = ['satellite', 'terrain', 'nightlight', 'roadmap'];
      const names = ['卫星影像', '地形高程', '夜间灯光', '路网'];
      
      const newLayers: Layer[] = [];

      for (let i = 0; i < sampleTypes.length; i++) {
        const img = await generateSampleImage(sampleTypes[i]);
        newLayers.push({
          id: `layer-${i}`,
          name: names[i],
          image: img,
          opacity: 0.5,
          blendMode: 'source-over',
          color: LAYER_COLORS[i],
          visible: true,
        });
      }

      setLayers(newLayers);
      setSelectedLayerId(newLayers[0]?.id || null);
    };

    initLayers();
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (canvasContainerRef.current) {
        setContainerSize({
          width: canvasContainerRef.current.clientWidth,
          height: canvasContainerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleLayerUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const remainingSlots = 6 - layers.length;
    if (fileArray.length > remainingSlots) {
      alert(`最多只能上传 6 张图片，还能再上传 ${remainingSlots} 张`);
    }

    const filesToProcess = fileArray.slice(0, remainingSlots);
    const sortedFiles = filesToProcess.sort((a, b) => a.name.localeCompare(b.name));

    sortedFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const newLayer: Layer = {
            id: `layer-${Date.now()}-${index}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            image: img,
            opacity: 0.5,
            blendMode: 'source-over',
            color: LAYER_COLORS[(layers.length + index) % LAYER_COLORS.length],
            visible: true,
          };
          setLayers(prev => [...prev, newLayer].sort((a, b) => a.name.localeCompare(b.name)));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, [layers.length]);

  const handleOpacityChange = useCallback((id: string, opacity: number) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, opacity } : layer
    ));
  }, []);

  const handleBlendModeChange = useCallback((id: string, blendMode: GlobalCompositeOperation) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, blendMode } : layer
    ));
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);

  const handleDeleteLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  }, [selectedLayerId]);

  const handleMoveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newLayers = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];
      return newLayers;
    });
  }, []);

  const visibleLayers = layers.filter(l => l.visible && l.image);

  return (
    <div className="app-container">
      <div className="canvas-container" ref={canvasContainerRef}>
        <div className="canvas-wrapper">
          <CanvasLayer
            layers={visibleLayers}
            width={containerSize.width}
            height={containerSize.height}
            clipX={splitPosition}
            clipSide="left"
          />
          <CanvasLayer
            layers={visibleLayers.slice(1)}
            width={containerSize.width}
            height={containerSize.height}
            clipX={splitPosition}
            clipSide="right"
          />
        </div>

        <SplitView
          position={splitPosition}
          onPositionChange={setSplitPosition}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
      </div>

      <Toolbar
        layers={layers}
        onOpacityChange={handleOpacityChange}
        selectedLayerId={selectedLayerId}
        onSelectLayer={setSelectedLayerId}
      />

      <LayerPanel
        layers={layers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={setSelectedLayerId}
        onOpacityChange={handleOpacityChange}
        onBlendModeChange={handleBlendModeChange}
        onToggleVisibility={handleToggleVisibility}
        onDeleteLayer={handleDeleteLayer}
        onMoveLayer={handleMoveLayer}
        onUpload={handleLayerUpload}
        blendModes={BLEND_MODES}
      />
    </div>
  );
}

export default App;
