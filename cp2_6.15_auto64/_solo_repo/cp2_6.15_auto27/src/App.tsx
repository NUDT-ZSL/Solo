import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimationEngine } from './AnimationEngine';
import type { CharacterConfig, AnimationSequence, AnimationState } from './types';
import { SKIN_COLORS, CLOTHING_COLORS, HAIRSTYLES, EYE_STYLES, EMOTIONS } from './types';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AnimationEngine | null>(null);
  const animationsRef = useRef<AnimationSequence[]>([]);

  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>({
    name: '我的角色',
    skinColor: SKIN_COLORS[0],
    clothingColor: CLOTHING_COLORS[1],
    hairstyle: 0,
    eyeStyle: 0
  });

  const [activeEmotion, setActiveEmotion] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [animationState, setAnimationState] = useState<AnimationState>({
    isPlaying: false,
    currentEmotion: null,
    currentFrame: 0,
    totalFrames: 0,
    progress: 0
  });
  const [savedCharacters, setSavedCharacters] = useState<CharacterConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new AnimationEngine(canvasRef.current);
      engineRef.current.setOnFrameUpdate((state) => {
        setAnimationState(state);
      });
      engineRef.current.renderStatic();
      loadAnimations();
      loadCharacters();
    }

    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setCharacterConfig(characterConfig);
  }, [characterConfig]);

  useEffect(() => {
    engineRef.current?.setSpeed(speed);
  }, [speed]);

  const loadAnimations = async () => {
    try {
      const res = await fetch('/api/animations');
      const data = await res.json();
      animationsRef.current = data;
    } catch (err) {
      console.error('加载动画失败:', err);
    }
  };

  const loadCharacters = async () => {
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      setSavedCharacters(data);
    } catch (err) {
      console.error('加载角色失败:', err);
    }
  };

  const handleEmotionClick = useCallback((emotion: string) => {
    const animation = animationsRef.current.find(a => a.emotion === emotion);
    if (animation && engineRef.current) {
      setActiveEmotion(emotion);
      engineRef.current.startAnimation(emotion, {
        duration: animation.duration,
        keyframes: animation.keyframes
      });
    }
  }, []);

  const handleStopAnimation = useCallback(() => {
    engineRef.current?.stopAnimation();
    engineRef.current?.renderStatic();
    setActiveEmotion(null);
    setAnimationState({
      isPlaying: false,
      currentEmotion: null,
      currentFrame: 0,
      totalFrames: 0,
      progress: 0
    });
  }, []);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);
  }, []);

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(characterConfig)
      });
      const data = await res.json();
      console.log('保存成功，ID:', data.id);
      await loadCharacters();
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadConfig = (config: CharacterConfig) => {
    setCharacterConfig(config);
  };

  const getEmotionName = (key: string | null) => {
    const emotion = EMOTIONS.find(e => e.key === key);
    return emotion ? emotion.name : '无';
  };

  return (
    <div className="app-container">
      <div className="config-panel">
        <h1 className="app-title">像素角色动画工具</h1>

        <div className="config-section">
          <h2 className="section-title">肤色</h2>
          <div className="color-grid">
            {SKIN_COLORS.map((color, index) => (
              <button
                key={`skin-${index}`}
                className={`color-option ${characterConfig.skinColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCharacterConfig({ ...characterConfig, skinColor: color })}
                aria-label={`肤色 ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="config-section">
          <h2 className="section-title">服装颜色</h2>
          <div className="color-grid">
            {CLOTHING_COLORS.map((color, index) => (
              <button
                key={`clothing-${index}`}
                className={`color-option ${characterConfig.clothingColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCharacterConfig({ ...characterConfig, clothingColor: color })}
                aria-label={`服装色 ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="config-section">
          <h2 className="section-title">发型</h2>
          <select
            className="select-control"
            value={characterConfig.hairstyle}
            onChange={(e) => setCharacterConfig({ ...characterConfig, hairstyle: parseInt(e.target.value) })}
          >
            {HAIRSTYLES.map((style, index) => (
              <option key={index} value={index}>{style}</option>
            ))}
          </select>
        </div>

        <div className="config-section">
          <h2 className="section-title">眼睛样式</h2>
          <select
            className="select-control"
            value={characterConfig.eyeStyle}
            onChange={(e) => setCharacterConfig({ ...characterConfig, eyeStyle: parseInt(e.target.value) })}
          >
            {EYE_STYLES.map((style, index) => (
              <option key={index} value={index}>{style}</option>
            ))}
          </select>
        </div>

        <div className="config-section">
          <h2 className="section-title">情绪动画</h2>
          <div className="emotion-buttons">
            {EMOTIONS.map((emotion) => (
              <button
                key={emotion.key}
                className={`emotion-btn ${activeEmotion === emotion.key ? 'active' : ''}`}
                onClick={() => handleEmotionClick(emotion.key)}
              >
                <span className="emoji">{emotion.emoji}</span>
                <span className="emotion-name">{emotion.name}</span>
              </button>
            ))}
          </div>
          {activeEmotion && (
            <button className="stop-btn" onClick={handleStopAnimation}>
              停止动画
            </button>
          )}
        </div>

        <div className="config-section">
          <h2 className="section-title">动画速度</h2>
          <div className="speed-control">
            <div className="speed-label">
              <span>播放速度</span>
              <span className="speed-value">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              className="slider"
              min="0.5"
              max="3"
              step="0.1"
              value={speed}
              onChange={handleSpeedChange}
            />
            <div className="speed-label" style={{ fontSize: '11px' }}>
              <span>0.5x</span>
              <span>3x</span>
            </div>
          </div>
        </div>

        <div className="config-section">
          <h2 className="section-title">配置管理</h2>
          <div className="action-buttons">
            <button
              className="action-btn primary"
              onClick={handleSaveConfig}
              disabled={loading}
            >
              {loading ? '保存中...' : '保存配置'}
            </button>
          </div>
          {savedCharacters.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <select
                className="select-control"
                onChange={(e) => {
                  const config = savedCharacters.find(c => c.id === parseInt(e.target.value));
                  if (config) handleLoadConfig(config);
                }}
                defaultValue=""
              >
                <option value="" disabled>加载已保存配置...</option>
                {savedCharacters.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} ({config.createdAt?.slice(0, 10)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="preview-area">
        <div className="canvas-wrapper">
          <canvas ref={canvasRef} width={600} height={400} />
          <div className="frame-info">
            动画: {getEmotionName(animationState.currentEmotion)} | 
            帧: {animationState.currentFrame}/{animationState.totalFrames}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
