import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Select, Spin, message } from 'antd';
import { ExportOutlined, FilterOutlined, SoundOutlined, ClockCircleOutlined, MenuOutlined } from '@ant-design/icons';
import AudioEngine, { EffectInstance, EffectType } from './core/AudioEngine';
import WaveformDisplay from './components/WaveformDisplay';
import AudioTrack from './components/AudioTrack';
import EffectRack from './components/EffectRack';
import AudioUploader from './components/AudioUploader';
import { exportAudio, ExportFormat, SampleRate } from './utils/exportUtils';
import {
  saveAudio,
  getSavedAudio,
  saveEffects,
  getSavedEffects,
} from './utils/storage';
import './App.css';

const App: React.FC = () => {
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioName, setAudioName] = useState('');
  const [effects, setEffects] = useState<EffectInstance[]>([]);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('wav');
  const [exportSampleRate, setExportSampleRate] = useState<SampleRate>(44100);
  const [isExporting, setIsExporting] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const animationRef = useRef<number>();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const init = async () => {
      const audioEngine = new AudioEngine();
      await audioEngine.init();
      setEngine(audioEngine);

      audioEngine.on('play', () => setIsPlaying(true));
      audioEngine.on('pause', () => setIsPlaying(false));
      audioEngine.on('stop', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      audioEngine.on('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      audioEngine.on('loaded', (buffer: AudioBuffer) => {
        setDuration(buffer.duration);
        setCurrentTime(0);
      });
      audioEngine.on('recordingStart', () => setIsRecording(true));
      audioEngine.on('recordingStop', () => setIsRecording(false));

      try {
        const savedAudio = await getSavedAudio();
        if (savedAudio && savedAudio.arrayBuffer && savedAudio.name) {
          try {
            const buffer = await audioEngine.loadFromArrayBuffer(
              savedAudio.arrayBuffer,
              savedAudio.name
            );
            audioEngine.setActiveBuffer(buffer, savedAudio.name);
            setAudioName(savedAudio.name);
            setDuration(buffer.duration);
          } catch (e) {
            console.warn('Failed to restore audio:', e);
          }
        }

        const savedEffects = await getSavedEffects();
        if (savedEffects && savedEffects.length > 0) {
          audioEngine.setEffects(savedEffects);
          setEffects(savedEffects);
        }
      } catch (e) {
        console.warn('Failed to restore state:', e);
      }

      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    };

    init();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (engine) {
        engine.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (effects.length > 0) {
      saveTimeoutRef.current = setTimeout(() => {
        saveEffects(effects);
      }, 500);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [effects]);

  useEffect(() => {
    const updateTime = () => {
      if (engine && isPlaying) {
        setCurrentTime(engine.getCurrentTime());
      }
      animationRef.current = requestAnimationFrame(updateTime);
    };
    animationRef.current = requestAnimationFrame(updateTime);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [engine, isPlaying]);

  const handleFileLoaded = useCallback(
    async (file: File) => {
      if (!engine) return;
      try {
        const buffer = await engine.loadAudio(file);
        engine.setActiveBuffer(buffer, file.name);
        setAudioName(file.name);
        setDuration(buffer.duration);

        const arrayBuffer = await file.arrayBuffer();
        saveAudio(file.name, arrayBuffer);

        engine.play();
        message.success(`已加载音频: ${file.name}`);
      } catch (e) {
        message.error('音频加载失败，请检查文件格式');
        console.error(e);
      }
    },
    [engine]
  );

  const handlePlay = useCallback(() => {
    engine?.play();
  }, [engine]);

  const handlePause = useCallback(() => {
    engine?.pause();
  }, [engine]);

  const handleStop = useCallback(() => {
    engine?.stop();
    setCurrentTime(0);
  }, [engine]);

  const handleSeek = useCallback(
    (time: number) => {
      engine?.seek(time);
      setCurrentTime(time);
    },
    [engine]
  );

  const handleRecord = useCallback(async () => {
    if (!engine) return;
    try {
      await engine.startRecording();
    } catch (e) {
      message.error('无法访问麦克风，请检查权限设置');
      console.error(e);
    }
  }, [engine]);

  const handleStopRecording = useCallback(async () => {
    if (!engine) return;
    try {
      const buffer = await engine.stopRecording();
      const name = `录音_${new Date().toLocaleTimeString('zh-CN', { hour12: false }).replace(/:/g, '-')}`;
      engine.setActiveBuffer(buffer, name);
      setAudioName(name);
      setDuration(buffer.duration);
      message.success('录制完成');
    } catch (e) {
      message.error('录制失败');
      console.error(e);
    }
  }, [engine]);

  const handleDropEffect = useCallback(
    (type: EffectType) => {
      if (!engine) return;
      const effect = engine.addEffect(type);
      setEffects(engine.getEffects());
    },
    [engine]
  );

  const handleReorderEffects = useCallback(
    (newOrderIds: string[]) => {
      if (!engine) return;
      engine.reorderEffects(newOrderIds);
      setEffects(engine.getEffects());
    },
    [engine]
  );

  const handleToggleEffect = useCallback(
    (id: string) => {
      if (!engine) return;
      engine.toggleEffect(id);
      setEffects(engine.getEffects());
    },
    [engine]
  );

  const handleRemoveEffect = useCallback(
    (id: string) => {
      if (!engine) return;
      engine.removeEffect(id);
      setEffects(engine.getEffects());
    },
    [engine]
  );

  const handleAdjustEffect = useCallback(
    (id: string, params: any) => {
      if (!engine) return;
      engine.adjustEffect(id, params);
      setEffects(engine.getEffects());
    },
    [engine]
  );

  const handleExport = async () => {
    if (!engine) return;
    const buffer = engine.getAudioBuffer();
    if (!buffer) {
      message.warning('请先加载或录制音频');
      return;
    }

    setIsExporting(true);
    try {
      const exportedBuffer = await engine.getExportBuffer(exportSampleRate);
      const fileName = audioName ? audioName.replace(/\.[^.]+$/, '') : 'soundcanvas-export';
      await exportAudio(exportedBuffer, exportFormat, exportSampleRate, fileName);
      setExportModalVisible(false);
      message.success('导出成功');
    } catch (e) {
      message.error('导出失败');
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleEffectPanelDragStart = (e: React.DragEvent, type: EffectType) => {
    e.dataTransfer.setData('effect-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const effectList: { type: EffectType; name: string; icon: React.ReactNode; desc: string }[] = [
    { type: 'lowpass', name: '低通滤波', icon: <FilterOutlined />, desc: '去除高频，使声音更柔和' },
    { type: 'reverb', name: '混响', icon: <SoundOutlined />, desc: '添加空间感和回响效果' },
    { type: 'delay', name: '延迟', icon: <ClockCircleOutlined />, desc: '回声效果，创造层次感' },
  ];

  if (isLoading) {
    return (
      <div className="app-loading">
        <Spin size="large" className="loading-spinner" />
        <p className="loading-text">SoundCanvas 正在启动...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <SoundOutlined className="title-icon" />
          <span>SoundCanvas</span>
        </div>
        <button className="export-btn" onClick={() => setExportModalVisible(true)}>
          <ExportOutlined />
          导出
        </button>
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
        >
          <MenuOutlined />
        </button>
      </header>

      <div className="app-body">
        <aside className={`left-panel ${mobileDrawerOpen ? 'open' : ''}`}>
          <div className="panel-title">
            <FilterOutlined />
            效果器库
          </div>
          <div className="effect-list">
            {effectList.map((effect) => (
              <div
                key={effect.type}
                className="effect-library-card"
                draggable
                onDragStart={(e) => handleEffectPanelDragStart(e, effect.type)}
              >
                <div className="library-icon">{effect.icon}</div>
                <div className="library-info">
                  <div className="library-name">{effect.name}</div>
                  <div className="library-desc">{effect.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="panel-tip">
            <p>💡 拖拽效果器到右侧音轨上方的效果器架</p>
          </div>
        </aside>

        <main className="main-content">
          <div className="waveform-section">
            <WaveformDisplay
              engine={engine}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
            />
          </div>

          <div className="track-section">
            <EffectRack
              effects={effects}
              engine={engine}
              onReorder={handleReorderEffects}
              onToggle={handleToggleEffect}
              onRemove={handleRemoveEffect}
              onAdjust={handleAdjustEffect}
              onDropEffect={handleDropEffect}
            />

            {audioName ? (
              <AudioTrack
                audioName={audioName}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                isRecording={isRecording}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onSeek={handleSeek}
                onRecord={handleRecord}
                onStopRecording={handleStopRecording}
              />
            ) : (
              <AudioUploader onFileLoaded={handleFileLoaded} />
            )}

            {audioName && (
              <div className="upload-more">
                <AudioUploader onFileLoaded={handleFileLoaded} />
              </div>
            )}
          </div>
        </main>
      </div>

      {mobileDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setMobileDrawerOpen(false)} />
      )}

      <Modal
        title="导出音频"
        open={exportModalVisible}
        onOk={handleExport}
        onCancel={() => setExportModalVisible(false)}
        confirmLoading={isExporting}
        okText="导出"
        cancelText="取消"
      >
        <div className="export-settings">
          <div className="setting-item">
            <label>导出格式</label>
            <Select
              value={exportFormat}
              onChange={(v) => setExportFormat(v)}
              style={{ width: '100%' }}
              options={[
                { value: 'wav', label: 'WAV (无损)' },
                { value: 'mp3', label: 'MP3 (CBR 128kbps)' },
              ]}
            />
          </div>
          <div className="setting-item">
            <label>采样率</label>
            <Select
              value={exportSampleRate}
              onChange={(v) => setExportSampleRate(v)}
              style={{ width: '100%' }}
              options={[
                { value: 44100, label: '44100 Hz (CD音质)' },
                { value: 48000, label: '48000 Hz (专业音质)' },
              ]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
