import React, { useState, useCallback } from 'react';
import { FileUploader } from './FileUploader';
import { TimelineEditor } from './TimelineEditor';
import { AnimationPreview } from './AnimationPreview';
import { StyleEditor } from './StyleEditor';
import { VideoExporter } from './VideoExporter';
import { useLyricsStore } from './store/useLyricsStore';
import { parseLRC } from './LyricsParser';
import './styles/global.css';

const DEMO_LRC = `[ti:示例歌曲]
[ar:演示歌手]
[al:演示专辑]
[00:00.00]欢迎使用歌词编辑器
[00:03.50]这是一个演示歌词
[00:07.00]您可以上传自己的 LRC 文件
[00:11.00]或者直接编辑这个示例
[00:15.00]支持拖拽调整顺序
[00:19.00]拖拽左右边缘调整时间
[00:23.00]为每句歌词设置样式
[00:27.00]选择不同的动画效果
[00:31.00]最后导出 WebM 视频
[00:35.00]尽情发挥创意吧！`;

const App: React.FC = () => {
  const lyricsData = useLyricsStore((state) => state.lyricsData);
  const clearAll = useLyricsStore((state) => state.clearAll);
  const setExportProgress = useLyricsStore((state) => state.setExportProgress);
  const [showDemo, setShowDemo] = useState(false);

  const handleClear = useCallback(() => {
    if (confirm('确定要清空所有数据吗？')) {
      clearAll();
    }
  }, [clearAll]);

  const loadDemoLRC = useCallback(() => {
    const parsed = parseLRC(DEMO_LRC);
    useLyricsStore.getState().setLyricsData(parsed);
    setShowDemo(false);
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <h1>🎵 歌词动画编辑器</h1>
        <div className="toolbar">
          {!lyricsData && !showDemo && (
            <button className="btn" onClick={() => setShowDemo(true)}>
              📝 加载示例
            </button>
          )}
          {lyricsData && (
            <>
              <button className="btn" onClick={handleClear}>
                🗑️ 清空
              </button>
              <VideoExporter
                onExportStart={() => {
                  useLyricsStore.getState().setPlayerState({ isPlaying: false });
                }}
                onExportComplete={() => {
                  setExportProgress({ status: 'idle', progress: 0 });
                }}
              />
            </>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="panel panel-left">
          {!lyricsData ? (
            <div className="timeline-panel">
              {showDemo ? (
                <div style={{ padding: '24px' }}>
                  <h3 style={{ color: 'var(--bg-primary)', marginBottom: '16px' }}>选择示例</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                    加载示例歌词来体验编辑器功能
                  </p>
                  <button className="btn btn-primary" onClick={loadDemoLRC} style={{ width: '100%' }}>
                    加载示例歌词
                  </button>
                  <button className="btn" onClick={() => setShowDemo(false)} style={{ width: '100%', marginTop: '12px' }}>
                    返回上传
                  </button>
                </div>
              ) : (
                <FileUploader />
              )}
            </div>
          ) : (
            <>
              <TimelineEditor />
              <StyleEditor />
            </>
          )}
        </div>

        <div className="panel panel-right">
          <AnimationPreview />
        </div>
      </main>
    </div>
  );
};

export default App;
