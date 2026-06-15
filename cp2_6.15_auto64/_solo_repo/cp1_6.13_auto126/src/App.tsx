import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  AudioEngine,
  PRESET_COLORS,
  midiToFreq,
  SoundSource,
  WaveformType,
} from './audio/AudioEngine';
import { SceneManager } from './scene/SceneManager';
import SoundSphere from './components/SoundSphere';
import {
  saveSoundscape,
  loadSoundscapes,
  loadSoundscapeById,
  deleteSoundscape,
  SavedSoundscape,
} from './api/storageApi';
import './App.css';

const DEFAULT_MIDI = 69;

function randomColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

let __idCounter = 0;
function genId(): string {
  __idCounter += 1;
  return `sph_${__idCounter}_${Date.now().toString(36)}`;
}

interface GlobalSettings {
  volume: number;
  pitchOffset: number;
  playing: boolean;
}

interface PresetSphere {
  x: number;
  z: number;
  freq: number;
  vol: number;
  wave: WaveformType;
}

const PRESET_GRADIENT: PresetSphere[] = [
  { x: -4, z: -2, freq: 60, vol: 65, wave: 'sine' },
  { x: -2, z: 1, freq: 64, vol: 60, wave: 'sine' },
  { x: 0, z: -1, freq: 67, vol: 55, wave: 'sine' },
  { x: 2, z: 2, freq: 71, vol: 60, wave: 'sine' },
  { x: 4, z: 0, freq: 76, vol: 65, wave: 'sine' },
];

const PRESET_PULSE: PresetSphere[] = [
  { x: -4, z: -4, freq: 57, vol: 85, wave: 'square' },
  { x: 4, z: -4, freq: 57, vol: 85, wave: 'square' },
  { x: 0, z: 4, freq: 57, vol: 85, wave: 'square' },
  { x: -3, z: 0, freq: 69, vol: 70, wave: 'sawtooth' },
  { x: 3, z: 0, freq: 69, vol: 70, wave: 'sawtooth' },
];

const PRESET_HARMONY: PresetSphere[] = [
  { x: -4, z: 0, freq: 57, vol: 50, wave: 'triangle' },
  { x: -2, z: 3, freq: 61, vol: 45, wave: 'triangle' },
  { x: 0, z: -3, freq: 64, vol: 50, wave: 'triangle' },
  { x: 2, z: 2, freq: 67, vol: 45, wave: 'triangle' },
  { x: 4, z: -2, freq: 71, vol: 45, wave: 'sine' },
  { x: 0, z: 0, freq: 76, vol: 40, wave: 'sine' },
];

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

function midiToNoteName(midi: number): string {
  const n = Math.max(0, Math.min(127, Math.round(midi)));
  const octave = Math.floor(n / 12) - 1;
  const note = NOTE_NAMES[n % 12];
  return `${note}${octave}`;
}

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const audioInitedRef = useRef(false);

  const [spheres, setSpheres] = useState<SoundSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    volume: 70,
    pitchOffset: 0,
    playing: false,
  });

  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedList, setSavedList] = useState<SavedSoundscape[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePanelVisible, setMobilePanelVisible] = useState(false);

  const selectedSphere = useMemo(
    () => spheres.find((s) => s.id === selectedId) || null,
    [spheres, selectedId]
  );

  useEffect(() => {
    const engine = new AudioEngine();
    audioEngineRef.current = engine;
    return () => {
      engine.stop();
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getSources = useCallback((): SoundSource[] => spheres, [spheres]);

  const computeAmplitude = useCallback(
    (sources: SoundSource[], x: number, z: number, t: number): number => {
      if (!audioEngineRef.current) return 0;
      return audioEngineRef.current.computeInterference(sources, x, z, t);
    },
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const sm = new SceneManager(
      containerRef.current,
      computeAmplitude,
      getSources
    );
    sceneManagerRef.current = sm;

    sm.setClickHandlers(
      (id: string) => {
        setSelectedId(id);
      },
      (point: THREE.Vector3) => {
        handleAddSphere(point.x, point.z);
      },
      (id: string, pos: THREE.Vector3) => {
        setSpheres((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  position: { x: pos.x, y: pos.y, z: pos.z },
                }
              : s
          )
        );
        audioEngineRef.current?.updateSourcePosition(id, pos.x, pos.y, pos.z);
      }
    );

    sm.startRenderLoop();

    return () => {
      sm.dispose();
    };
  }, []);

  const handleAddSphere = useCallback(
    (x: number, z: number) => {
      const id = genId();
      const sphereHeight = 1.2 + Math.random() * 0.8;
      const newSphere: SoundSource = {
        id,
        position: { x, y: sphereHeight, z },
        color: randomColor(),
        volume: 50,
        frequency: DEFAULT_MIDI,
        waveform: 'sine',
        glideTime: 0.1,
        active: true,
      };
      setSpheres((prev) => [...prev, newSphere]);

      const engine = audioEngineRef.current;
      if (engine) {
        if (!audioInitedRef.current) {
          engine.init();
          audioInitedRef.current = true;
        }
        engine.addSource(newSphere);
        if (globalSettings.playing) {
          engine.play();
        }
      }
    },
    [globalSettings.playing]
  );

  const handleUpdateSphere = useCallback(
    (id: string, updates: Partial<SoundSource>) => {
      setSpheres((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
      const engine = audioEngineRef.current;
      if (engine) {
        const current = spheres.find((s) => s.id === id);
        if (current) {
          const merged: SoundSource = { ...current, ...updates };
          engine.updateSource(merged);
        }
      }
    },
    [spheres]
  );

  const handleRemoveSphere = useCallback(
    (id: string) => {
      setSpheres((prev) => prev.filter((s) => s.id !== id));
      audioEngineRef.current?.removeSource(id);
      sceneManagerRef.current?.removeSphere(id);
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId]
  );

  const handleTogglePlay = useCallback(async () => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    if (!audioInitedRef.current) {
      await engine.init();
      audioInitedRef.current = true;
    }
    const willPlay = !globalSettings.playing;
    if (willPlay) {
      engine.play();
    } else {
      engine.stop();
    }
    setGlobalSettings((prev) => ({ ...prev, playing: willPlay });
  }, [globalSettings.playing]);

  const handleGlobalVolume = useCallback((vol: number) => {
    setGlobalSettings((prev) => ({ ...prev, volume: vol }));
    audioEngineRef.current?.setGlobalVolume(vol);
  }, []);

  const handlePitchOffset = useCallback((offset: number) => {
    setGlobalSettings((prev) => ({ ...prev, pitchOffset: offset }));
    audioEngineRef.current?.setPitchOffset(offset);
  }, []);

  const handleClearAll = useCallback(() => {
    spheres.forEach((s) => {
      audioEngineRef.current?.removeSource(s.id);
      sceneManagerRef.current?.removeSphere(s.id);
    });
    setSpheres([]);
    setSelectedId(null);
  }, [spheres]);

  const handlePreset = useCallback(
    (preset: PresetSphere[]) => {
      spheres.forEach((s) => {
        audioEngineRef.current?.removeSource(s.id);
        sceneManagerRef.current?.removeSphere(s.id);
      });

      const newSpheres: SoundSource[] = preset.map((p, i) => ({
        id: genId(),
        position: { x: p.x, y: 1.2 + (i % 3) * 0.3, z: p.z },
        color: PRESET_COLORS[i % PRESET_COLORS.length],
        volume: p.vol,
        frequency: p.freq,
        waveform: p.wave,
        glideTime: 0.1,
        active: true,
      }));

      setSpheres(newSpheres);
      setSelectedId(null);

      const engine = audioEngineRef.current;
      if (engine) {
        if (!audioInitedRef.current) {
          engine.init();
          audioInitedRef.current = true;
        }
        newSpheres.forEach((s) => engine.addSource(s));
        if (globalSettings.playing) {
          engine.play();
        }
      }
    },
    [spheres, globalSettings.playing]
  );

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return;
    try {
      await saveSoundscape(saveName.trim(), spheres, globalSettings);
      setSaveDialogOpen(false);
      setSaveName('');
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, [saveName, spheres, globalSettings]);

  const handleLoadList = useCallback(async () => {
    try {
      const list = await loadSoundscapes();
      setSavedList(list);
      setLoadDialogOpen(true);
    } catch (err) {
      console.error('Load list failed:', err);
    }
  }, []);

  const handleLoadOne = useCallback(
    async (id: string) => {
      try {
        const doc = await loadSoundscapeById(id);

        spheres.forEach((s) => {
          audioEngineRef.current?.removeSource(s.id);
          sceneManagerRef.current?.removeSphere(s.id);
        });

        const loaded: SoundSource[] = doc.spheres.map((s: any) => ({
          ...s,
          id: s.id || genId(),
        }));

        setSpheres(loaded);
        setSelectedId(null);

        if (doc.globalSettings) {
          const gs = doc.globalSettings as GlobalSettings;
          setGlobalSettings({
            volume: gs.volume ?? 70,
            pitchOffset: gs.pitchOffset ?? 0,
            playing: false,
          });
          audioEngineRef.current?.setGlobalVolume(gs.volume ?? 70);
          audioEngineRef.current?.setPitchOffset(gs.pitchOffset ?? 0);
        }

        const engine = audioEngineRef.current;
        if (engine) {
          if (!audioInitedRef.current) {
            engine.init();
            audioInitedRef.current = true;
          }
          loaded.forEach((s) => engine.addSource(s));
        }

        setLoadDialogOpen(false);
      } catch (err) {
        console.error('Load failed:', err);
      }
    },
    [spheres]
  );

  const handleDeleteSaved = useCallback(async (id: string) => {
    try {
      await deleteSoundscape(id);
      setSavedList((prev) => prev.filter((s) => s._id !== id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, []);

  return (
    <div className="app">
      <div ref={containerRef} className="canvas-container" />

      {spheres.map((sphere) => (
        <SoundSphere
          key={sphere.id}
        source={sphere}
        sceneManager={sceneManagerRef.current}
        isSelected={sphere.id === selectedId}
        onSelect={setSelectedId}
        onUpdate={handleUpdateSphere}
      />
      ))}

      {!isMobile && (
        <div className={`right-panel ${panelCollapsed ? 'collapsed' : ''}`}>
          <button
            className="collapse-btn"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            title={panelCollapsed ? '展开面板' : '收起面板'}
          >
            {panelCollapsed ? '◀' : '▶'}
          </button>
          {!panelCollapsed && (
            <div className="panel-content">
              <h2 className="panel-title">SoundScapes</h2>
              <p className="panel-subtitle">3D Interactive Soundscape Generator</p>

              <div className="panel-section">
                <h3>全局控制</h3>
                <div className="control-row">
                  <button
                    className={`play-btn ${globalSettings.playing ? 'playing' : ''}`}
                    onClick={handleTogglePlay}
                  >
                    {globalSettings.playing ? '⏹ 停止' : '▶ 播放'}
                  </button>
                </div>
                <div className="control-row">
                  <label>音量</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={globalSettings.volume}
                    onChange={(e) => handleGlobalVolume(+e.target.value)}
                  />
                  <span className="value-label">{globalSettings.volume}</span>
                </div>
                <div className="control-row">
                  <label>音高</label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={globalSettings.pitchOffset}
                    onChange={(e) => handlePitchOffset(+e.target.value)}
                  />
                  <span className="value-label">
                    {globalSettings.pitchOffset > 0 ? '+' : ''}
                    {globalSettings.pitchOffset}
                  </span>
                </div>
                <div className="control-row">
                  <button className="clear-btn" onClick={handleClearAll}>
                    清空所有
                  </button>
                </div>
              </div>

              {selectedSphere && (
                <div className="panel-section">
                  <h3>选中声源</h3>
                  <div
                    className="sphere-color-indicator"
                    style={{ backgroundColor: selectedSphere.color }}
                  />
                  <div className="control-row">
                    <label>音量</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedSphere.volume}
                      onChange={(e) =>
                        handleUpdateSphere(selectedSphere.id, {
                          volume: +e.target.value,
                        })
                      }
                    />
                    <span className="value-label">{selectedSphere.volume}</span>
                  </div>
                  <div className="control-row">
                    <label>音高</label>
                    <input
                      type="range"
                      min="48"
                      max="84"
                      value={selectedSphere.frequency}
                      onChange={(e) =>
                        handleUpdateSphere(selectedSphere.id, {
                          frequency: +e.target.value,
                        })
                      }
                    />
                    <span className="value-label">
                      {midiToNoteName(selectedSphere.frequency)}
                    </span>
                  </div>
                  <div className="control-row">
                    <label>波形</label>
                    <select
                      value={selectedSphere.waveform}
                      onChange={(e) =>
                        handleUpdateSphere(selectedSphere.id, {
                          waveform: e.target.value as WaveformType,
                        })
                      }
                    >
                      <option value="sine">正弦波</option>
                      <option value="square">方波</option>
                      <option value="triangle">三角波</option>
                      <option value="sawtooth">锯齿波</option>
                    </select>
                  </div>
                  <div className="control-row">
                    <label>滑音</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={Math.round(selectedSphere.glideTime * 100)}
                      onChange={(e) =>
                        handleUpdateSphere(selectedSphere.id, {
                          glideTime: +e.target.value / 100,
                        })
                      }
                    />
                    <span className="value-label">
                      {(selectedSphere.glideTime * 1000).toFixed(0)}ms
                    </span>
                  </div>
                  <div className="control-row xyz-row">
                    <label>X</label>
                    <input
                      type="number"
                      step="0.1"
                      min="-14"
                      max="14"
                      value={selectedSphere.position.x.toFixed(2)}
                      onChange={(e) =>
                        handleUpdateSphere(selectedSphere.id, {
                          position: {
                            ...selectedSphere.position,
                            x: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                    <label>Y</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="8"
                      value={selectedSphere.position.y.toFixed(2)}
                      onChange={(e) =>
                        handleUpdateSphere(selectedSphere.id, {
                          position: {
                            ...selectedSphere.position,
                            y: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                    <label>Z</label>
                    <input
                      type="number"
                      step="0.1"
                      min="-14"
                      max="14"
                      value={selectedSphere.position.z.toFixed(2)}
                      onChange={(e) =>
                        handleUpdateSphere(selectedSphere.id, {
                          position: {
                            ...selectedSphere.position,
                            z: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleRemoveSphere(selectedSphere.id)}
                  >
                    删除声源
                  </button>
                </div>
              )}

              <div className="panel-section">
                <h3>预设</h3>
                <div className="preset-buttons">
                  <button onClick={() => handlePreset(PRESET_GRADIENT)}>渐变</button>
                  <button onClick={() => handlePreset(PRESET_PULSE)}>脉冲</button>
                  <button onClick={() => handlePreset(PRESET_HARMONY)}>和声</button>
                </div>
              </div>

              <div className="panel-section tips">
                <h3>操作提示</h3>
                <p>🖱 左键拖动: 旋转视角</p>
                <p>🖱 右键拖动: 平移视角</p>
                <p>🖱 滚轮: 缩放</p>
                <p>🖱 点击地面: 放置声源</p>
                <p>🖱 拖动脉冲: 拖拽调整位置</p>
              </div>
            </div>
          )}
        </div>
      )}

      {isMobile && (
        <>
          <div
            className="mobile-swipe-area"
            onTouchStart={() => setMobilePanelVisible(true)}
          />
          {mobilePanelVisible && (
            <div className="mobile-panel-overlay">
              <div
                className="mobile-panel-backdrop"
                onClick={() => setMobilePanelVisible(false)}
              />
              <div className="mobile-panel">
                <div className="panel-content">
                  <h2 className="panel-title">SoundScapes</h2>
                  <div className="panel-section">
                    <h3>全局控制</h3>
                    <div className="control-row">
                      <button
                        className={`play-btn ${globalSettings.playing ? 'playing' : ''}`}
                        onClick={handleTogglePlay}
                      >
                        {globalSettings.playing ? '⏹ 停止' : '▶ 播放'}
                      </button>
                    </div>
                    <div className="control-row">
                      <label>音量</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={globalSettings.volume}
                        onChange={(e) => handleGlobalVolume(+e.target.value)}
                      />
                    </div>
                    <div className="control-row">
                      <label>音高</label>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={globalSettings.pitchOffset}
                        onChange={(e) => handlePitchOffset(+e.target.value)}
                      />
                    </div>
                  </div>

                  {selectedSphere && (
                    <div className="panel-section">
                      <h3>选中声源</h3>
                      <div className="control-row">
                        <label>音量</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={selectedSphere.volume}
                          onChange={(e) =>
                            handleUpdateSphere(selectedSphere.id, {
                              volume: +e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="control-row">
                        <label>音高</label>
                        <input
                          type="range"
                          min="48"
                          max="84"
                          value={selectedSphere.frequency}
                          onChange={(e) =>
                            handleUpdateSphere(selectedSphere.id, {
                              frequency: +e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="control-row">
                        <label>波形</label>
                        <select
                          value={selectedSphere.waveform}
                          onChange={(e) =>
                            handleUpdateSphere(selectedSphere.id, {
                              waveform: e.target.value as WaveformType,
                            })
                          }
                        >
                          <option value="sine">正弦波</option>
                          <option value="square">方波</option>
                          <option value="triangle">三角波</option>
                          <option value="sawtooth">锯齿波</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="panel-section">
                    <h3>预设</h3>
                    <div className="preset-buttons">
                      <button onClick={() => handlePreset(PRESET_GRADIENT)}>渐变</button>
                      <button onClick={() => handlePreset(PRESET_PULSE)}>脉冲</button>
                      <button onClick={() => handlePreset(PRESET_HARMONY)}>和声</button>
                    </div>
                  </div>
                  <button
                    className="close-mobile-panel"
                    onClick={() => setMobilePanelVisible(false)}
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="top-controls">
        <button className="top-btn" onClick={() => setSaveDialogOpen(true)}>
        💾 保存
      </button>
        <button className="top-btn" onClick={handleLoadList}>
        📂 加载
      </button>
      </div>

      <div className="sphere-count">
        {spheres.length} 个声源
      </div>

      {saveDialogOpen && (
        <div
          className="dialog-overlay"
          onClick={() => setSaveDialogOpen(false)}
        >
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>保存音景</h3>
            <input
              type="text"
              placeholder="输入名称..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <div className="dialog-buttons">
              <button className="dialog-btn primary" onClick={handleSave}>
                保存
              </button>
              <button
                className="dialog-btn"
                onClick={() => setSaveDialogOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {loadDialogOpen && (
        <div
          className="dialog-overlay"
          onClick={() => setLoadDialogOpen(false)}
        >
          <div className="dialog dialog-wide" onClick={(e) => e.stopPropagation()}>
            <h3>加载音景</h3>
            <div className="saved-list">
              {savedList.length === 0 && (
                <p className="empty-msg">暂未保存音景</p>
              )}
              {savedList.map((item) => (
                <div key={item._id} className="saved-item">
                  <div className="saved-info">
                    <span className="saved-name">{item.name}</span>
                    <span className="saved-date">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="saved-actions">
                    <button
                      className="dialog-btn primary"
                      onClick={() => handleLoadOne(item._id)}
                    >
                      加载
                    </button>
                    <button
                      className="dialog-btn danger"
                      onClick={() => handleDeleteSaved(item._id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="dialog-buttons">
              <button
                className="dialog-btn"
                onClick={() => setLoadDialogOpen(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
