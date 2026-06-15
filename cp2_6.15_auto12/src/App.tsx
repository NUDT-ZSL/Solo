import React, { useEffect, useRef, useState } from 'react';
import { InputManager, type KeyInputData } from './InputManager';
import { RenderManager, type RenderParams } from './RenderManager';
import ControlPanel from './ControlPanel';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const renderManagerRef = useRef<RenderManager | null>(null);
  const [fps, setFps] = useState(60);
  const [params, setParams] = useState<RenderParams>({
    minRadius: 8,
    maxRadius: 24,
    speedMultiplier: 1,
    hueShift: 0,
  });

  useEffect(() => {
    if (!canvasRef.current || !textareaRef.current) return;

    const renderManager = new RenderManager(canvasRef.current);
    renderManagerRef.current = renderManager;
    renderManager.start();

    const inputManager = new InputManager(
      textareaRef.current,
      (data: KeyInputData) => {
        renderManager.addParticle(data);
      },
      () => {
        const charCount = inputManager.getCharCount();
        renderManager.triggerSpaceBurst(charCount);
      }
    );
    inputManagerRef.current = inputManager;
    inputManager.start();

    const fpsInterval = setInterval(() => {
      setFps(renderManager.getFPS());
    }, 500);

    return () => {
      clearInterval(fpsInterval);
      inputManager.destroy();
      renderManager.destroy();
    };
  }, []);

  const handleParamsChange = (newParams: Partial<RenderParams>) => {
    setParams((prev) => {
      const updated = { ...prev, ...newParams };
      renderManagerRef.current?.setParams(newParams);
      return updated;
    });
  };

  const handleExport = () => {
    if (!renderManagerRef.current) return;
    const dataUrl = renderManagerRef.current.exportPNG();
    const link = document.createElement('a');
    link.download = `typecanvas-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleTextChange = () => {
    if (!textareaRef.current || !inputManagerRef.current) return;
    const text = textareaRef.current.value;
    const letterCount = text.match(/[a-zA-Z]/g)?.length || 0;
    inputManagerRef.current.setCharCount(letterCount);
  };

  return (
    <div className="app-container">
      <div className="left-section">
        <div className="editor-wrapper">
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            placeholder="在这里输入文字，创造你的打字艺术..."
            onChange={handleTextChange}
            spellCheck={false}
          />
        </div>
        <p className="hint-text">提示：双击空格键可触发「空间爆发」特效 ✨</p>
      </div>

      <div className="right-section">
        <div className="canvas-wrapper">
        <div className="fps-counter">{fps} FPS</div>
          <canvas ref={canvasRef} width={500} height={500} />
          <ControlPanel params={params} onParamsChange={handleParamsChange} />
        </div>
        <button className="export-button" onClick={handleExport}>
          导出当前帧
        </button>
      </div>
    </div>
  );
};

export default App;
