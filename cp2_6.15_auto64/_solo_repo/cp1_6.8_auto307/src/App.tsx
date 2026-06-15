import { useState, useCallback } from 'react';
import SandCanvas from './SandCanvas';
import ControlPanel from './ControlPanel';

export default function App() {
  const [text, setText] = useState('字影流沙');
  const [inputText, setInputText] = useState('字影流沙');
  const [speed, setSpeed] = useState(1.0);
  const [dispersalIntensity, setDispersalIntensity] = useState(1.0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleGenerate = useCallback(() => {
    if (!inputText.trim()) return;
    setText(inputText.trim());
    setIsAnimating(true);
  }, [inputText]);

  const handleReset = useCallback(() => {
    setIsAnimating(false);
  }, []);

  return (
    <>
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .app-container {
          width: 100%;
          height: 100vh;
          background: linear-gradient(135deg, #1a0a00 0%, #3d1500 25%, #6b2a00 50%, #8b4000 75%, #c46000 100%);
          position: relative;
          overflow: hidden;
        }
        .app-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(ellipse at 30% 20%, rgba(255, 140, 0, 0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 80%, rgba(200, 80, 0, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(255, 180, 60, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .canvas-area {
          width: 100%;
          height: 100%;
          position: relative;
        }
        .app-title {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255, 200, 100, 0.6);
          font-size: 14px;
          letter-spacing: 4px;
          font-weight: 300;
          text-transform: uppercase;
          pointer-events: none;
          z-index: 10;
        }
        .hint-text {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: rgba(255, 200, 120, 0.3);
          font-size: 16px;
          text-align: center;
          pointer-events: none;
          z-index: 5;
          line-height: 1.8;
        }
      `}</style>

      <div className="app-container">
        <div className="app-title">字影流沙</div>

        {!isAnimating && !text && (
          <div className="hint-text">
            输入文字，点击「生成」<br />
            看文字化为流沙
          </div>
        )}

        <div className="canvas-area">
          <SandCanvas
            text={text}
            speed={speed}
            dispersalIntensity={dispersalIntensity}
            isAnimating={isAnimating}
          />
        </div>

        <ControlPanel
          text={inputText}
          speed={speed}
          dispersalIntensity={dispersalIntensity}
          isAnimating={isAnimating}
          onTextChange={setInputText}
          onSpeedChange={setSpeed}
          onDispersalChange={setDispersalIntensity}
          onGenerate={handleGenerate}
          onReset={handleReset}
        />
      </div>
    </>
  );
}
