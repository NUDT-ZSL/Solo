import React, { useState } from 'react';
import type { SummaryItem, Bookmark, Speaker, VideoMetadata } from '../types';
import {
  formatTime,
  exportToJSON,
  exportToHTML
} from './AISummaryEngine';
import { useAppContext } from '../App';

interface SummaryPanelProps {
  isLoading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
}

type TabType = 'summaries' | 'bookmarks';

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  isLoading,
  isCollapsed,
  onToggleCollapse,
  isMobile
}) => {
  const {
    summaries,
    bookmarks,
    speakers,
    videoMetadata,
    currentTime,
    seekTo,
    removeBookmark
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<TabType>('summaries');
  const [exporting, setExporting] = useState<'json' | 'html' | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const speakerMap = new Map(speakers.map((s) => [s.id, s]));

  const handleExport = async (format: 'json' | 'html') => {
    if (!videoMetadata) return;

    setExporting(format);
    setExportSuccess(null);

    await new Promise((r) => setTimeout(r, 600));

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = exportToJSON(videoMetadata, summaries, bookmarks, speakers);
      filename = `${videoMetadata.name.replace(/\.mp4$/i, '')}_summary.json`;
      mimeType = 'application/json';
    } else {
      content = exportToHTML(videoMetadata, summaries, bookmarks, speakers);
      filename = `${videoMetadata.name.replace(/\.mp4$/i, '')}_report.html`;
      mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExporting(null);
    setExportSuccess(format === 'json' ? 'JSON 导出成功！' : 'HTML 报告导出成功！');
    setTimeout(() => setExportSuccess(null), 2500);
  };

  const isSummaryActive = (s: SummaryItem) =>
    currentTime >= s.startTime && currentTime < s.endTime;

  const sortedBookmarks = [...bookmarks].sort((a, b) => a.timestamp - b.timestamp);

  if (isMobile) {
    return (
      <>
        <button
          className={`mobile-toggle-btn ${exportSuccess ? 'show-success' : ''}`}
          onClick={onToggleCollapse}
        >
          {isCollapsed ? '📋' : '✕'}
        </button>

        <div className={`mobile-drawer ${isCollapsed ? 'closed' : 'open'}`}>
          <div className="drawer-header">
            <h2>会议摘要与备注</h2>
            <button className="drawer-close-btn" onClick={onToggleCollapse}>
              ✕
            </button>
          </div>
          <div className="drawer-content">
            <PanelContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              summaries={summaries}
              bookmarks={sortedBookmarks}
              speakerMap={speakerMap}
              currentTime={currentTime}
              isSummaryActive={isSummaryActive}
              onSeek={seekTo}
              onRemoveBookmark={removeBookmark}
              isLoading={isLoading}
              videoMetadata={videoMetadata}
              exporting={exporting}
              exportSuccess={exportSuccess}
              handleExport={handleExport}
            />
          </div>
        </div>

        <style>{`
          .mobile-toggle-btn {
            position: fixed;
            top: 16px;
            right: 16px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: #e94560;
            color: #fff;
            border: 2px solid #fff;
            font-size: 22px;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 4px 16px rgba(233, 69, 96, 0.4);
            transition: all 0.3s ease;
          }
          .mobile-toggle-btn:hover {
            transform: scale(1.1);
          }
          .mobile-toggle-btn.show-success {
            animation: pulse 0.6s ease;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
          .mobile-drawer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            height: 55vh;
            background: rgba(26, 26, 46, 0.98);
            backdrop-filter: blur(10px);
            border-top: 2px solid rgba(255,255,255,0.15);
            border-radius: 16px 16px 0 0;
            z-index: 999;
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: column;
          }
          .mobile-drawer.closed {
            transform: translateY(100%);
          }
          .mobile-drawer.open {
            transform: translateY(0);
          }
          .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            background: rgba(15, 52, 96, 0.5);
            backdrop-filter: blur(10px);
            border-radius: 16px 16px 0 0;
          }
          .drawer-header h2 {
            font-size: 18px;
            color: #fff;
          }
          .drawer-close-btn {
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.7);
            font-size: 20px;
            cursor: pointer;
            padding: 4px 8px;
          }
          .drawer-content {
            flex: 1;
            overflow-y: auto;
          }
        `}</style>
      </>
    );
  }

  return (
    <div className={`summary-panel ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      <div className={`panel-inner-wrapper ${isCollapsed ? 'hidden' : 'visible'}`}>
        <PanelContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          summaries={summaries}
          bookmarks={sortedBookmarks}
          speakerMap={speakerMap}
          currentTime={currentTime}
          isSummaryActive={isSummaryActive}
          onSeek={seekTo}
          onRemoveBookmark={removeBookmark}
          isLoading={isLoading}
          videoMetadata={videoMetadata}
          exporting={exporting}
          exportSuccess={exportSuccess}
          handleExport={handleExport}
        />
      </div>

      <button
        className="panel-collapse-btn"
        onClick={onToggleCollapse}
        title={isCollapsed ? '展开面板' : '折叠面板'}
      >
        {isCollapsed ? '◀' : '▶'}
      </button>

      <style>{`
        .summary-panel {
          height: 100%;
          background: #0f0f1e;
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          position: relative;
          display: flex;
          flex-direction: row;
          transition: width 0.3s ease;
          overflow: hidden;
          flex-shrink: 0;
        }
        .summary-panel.expanded {
          width: 100%;
        }
        .summary-panel.collapsed {
          width: 32px !important;
          min-width: 32px;
        }
        .panel-inner-wrapper {
          flex: 1;
          min-width: 0;
          transition: opacity 0.25s ease, visibility 0.25s ease;
          display: flex;
          flex-direction: column;
        }
        .panel-inner-wrapper.visible {
          opacity: 1;
          visibility: visible;
        }
        .panel-inner-wrapper.hidden {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        .panel-collapse-btn {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 48px;
          background: #0f3460;
          color: #fff;
          border: 2px solid rgba(255,255,255,0.3);
          border-left: none;
          border-radius: 0 8px 8px 0;
          cursor: pointer;
          font-size: 14px;
          z-index: 10;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .summary-panel.expanded .panel-collapse-btn {
          left: auto;
          right: 0;
          border-left: 2px solid rgba(255,255,255,0.3);
          border-right: none;
          border-radius: 8px 0 0 8px;
        }
        .panel-collapse-btn:hover {
          background: #e94560;
          transform: translateY(-50%) scale(1.05);
        }
      `}</style>
    </div>
  );
};

interface PanelContentProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  summaries: SummaryItem[];
  bookmarks: Bookmark[];
  speakerMap: Map<string, Speaker>;
  currentTime: number;
  isSummaryActive: (s: SummaryItem) => boolean;
  onSeek: (time: number) => void;
  onRemoveBookmark: (id: string) => void;
  isLoading: boolean;
  videoMetadata: VideoMetadata | null;
  exporting: 'json' | 'html' | null;
  exportSuccess: string | null;
  handleExport: (format: 'json' | 'html') => void;
}

const PanelContent: React.FC<PanelContentProps> = ({
  activeTab,
  setActiveTab,
  summaries,
  bookmarks,
  speakerMap,
  currentTime,
  isSummaryActive,
  onSeek,
  onRemoveBookmark,
  isLoading,
  videoMetadata,
  exporting,
  exportSuccess,
  handleExport
}) => {
  return (
    <div className="panel-content">
      <div className="panel-header">
        <h2 className="panel-title">📋 会议智能摘要</h2>
        {videoMetadata && (
          <div className="video-meta">
            <div className="meta-name" title={videoMetadata.name}>
              📁 {videoMetadata.name}
            </div>
            <div className="meta-info">
              ⏱️ {formatTime(videoMetadata.duration)} · {(videoMetadata.size / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>
        )}
      </div>

      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'summaries' ? 'active' : ''}`}
          onClick={() => setActiveTab('summaries')}
        >
          📝 摘要 ({summaries.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          🔖 备注 ({bookmarks.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'summaries' && (
          <div className="summaries-list">
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>AI 正在分析会议内容...</span>
              </div>
            ) : summaries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🤖</div>
                <p>上传视频后自动生成智能摘要</p>
              </div>
            ) : (
              summaries.map((summary) => {
                const speaker = speakerMap.get(summary.speakerId);
                const active = isSummaryActive(summary);
                return (
                  <div
                    key={summary.id}
                    className={`summary-item ${active ? 'active' : ''}`}
                    onClick={() => onSeek(summary.startTime)}
                  >
                    <div
                      className="summary-indicator"
                      style={{ backgroundColor: speaker?.color ?? '#e94560' }}
                    />
                    <div className="summary-body">
                      <div className="summary-header">
                        <span
                          className="speaker-name"
                          style={{ color: speaker?.color }}
                        >
                          🎙️ {speaker?.name ?? '未知'}
                        </span>
                        <span className="summary-time">
                          {formatTime(summary.startTime)}
                        </span>
                      </div>
                      <div className="summary-topic">{summary.topic}</div>
                      <div className="summary-keywords">
                        {summary.keywords.map((k, i) => (
                          <span key={i} className="keyword-tag">
                            #{k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="bookmarks-list">
            {bookmarks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔖</div>
                <p>暂无备注</p>
                <p className="empty-hint">播放时点击 📝 按钮或 Shift+点击进度条添加</p>
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className={`bookmark-item ${
                    Math.abs(currentTime - bookmark.timestamp) < 2 ? 'near' : ''
                  }`}
                >
                  <button
                    className="bookmark-time-btn"
                    onClick={() => onSeek(bookmark.timestamp)}
                  >
                    ⏱️ {formatTime(bookmark.timestamp)}
                  </button>
                  <div className="bookmark-text">{bookmark.text}</div>
                  <button
                    className="bookmark-delete"
                    onClick={() => onRemoveBookmark(bookmark.id)}
                    title="删除备注"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="export-section">
        <div className="export-buttons">
          <button
            className="export-btn json-btn"
            onClick={() => handleExport('json')}
            disabled={!videoMetadata || exporting !== null}
          >
            {exporting === 'json' ? (
              <>
                <span className="btn-spinner" />
                导出中...
              </>
            ) : (
              '📄 导出 JSON'
            )}
          </button>
          <button
            className="export-btn html-btn"
            onClick={() => handleExport('html')}
            disabled={!videoMetadata || exporting !== null}
          >
            {exporting === 'html' ? (
              <>
                <span className="btn-spinner" />
                导出中...
              </>
            ) : (
              '🌐 导出 HTML'
            )}
          </button>
        </div>
        {exportSuccess && <div className="export-success">✓ {exportSuccess}</div>}
      </div>

      <style>{`
        .panel-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 0 12px 12px 12px;
          overflow: hidden;
        }
        .panel-header {
          padding: 16px 4px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .panel-title {
          font-size: 16px;
          color: #e94560;
          margin-bottom: 10px;
        }
        .video-meta {
          font-size: 12px;
        }
        .meta-name {
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        .meta-info {
          color: rgba(255,255,255,0.5);
        }
        .tab-buttons {
          display: flex;
          gap: 6px;
          padding: 12px 0;
        }
        .tab-btn {
          flex: 1;
          padding: 8px 10px;
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.6);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        .tab-btn.active {
          background: rgba(233, 69, 96, 0.2);
          border-color: #e94560;
          color: #fff;
        }
        .tab-content {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
        }
        .summaries-list,
        .bookmarks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .summary-item {
          display: flex;
          gap: 10px;
          padding: 10px;
          background: rgba(255,255,255,0.03);
          border: 2px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .summary-item:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.15);
          transform: translateX(2px);
        }
        .summary-item.active {
          background: rgba(233, 69, 96, 0.15);
          border-color: #e94560;
          box-shadow: 0 0 12px rgba(233, 69, 96, 0.2);
        }
        .summary-indicator {
          width: 4px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .summary-body {
          flex: 1;
          min-width: 0;
        }
        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .speaker-name {
          font-size: 12px;
          font-weight: 600;
        }
        .summary-time {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          font-family: monospace;
        }
        .summary-topic {
          font-size: 14px;
          color: #fff;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .summary-keywords {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .keyword-tag {
          font-size: 11px;
          background: rgba(15, 52, 96, 0.8);
          color: rgba(255,255,255,0.75);
          padding: 2px 8px;
          border-radius: 10px;
        }
        .bookmark-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(255,255,255,0.03);
          border: 2px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .bookmark-item.near {
          border-color: #e94560;
          background: rgba(233, 69, 96, 0.1);
        }
        .bookmark-time-btn {
          background: rgba(15, 52, 96, 0.8);
          color: #fff;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          font-family: monospace;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .bookmark-time-btn:hover {
          background: #e94560;
          border-color: #fff;
        }
        .bookmark-text {
          flex: 1;
          font-size: 13px;
          color: rgba(255,255,255,0.9);
          word-break: break-word;
        }
        .bookmark-delete {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-size: 14px;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .bookmark-delete:hover {
          color: #e94560;
          background: rgba(233, 69, 96, 0.15);
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          gap: 12px;
          color: rgba(255,255,255,0.6);
          font-size: 14px;
        }
        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(233, 69, 96, 0.2);
          border-top-color: #e94560;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255,255,255,0.4);
        }
        .empty-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }
        .empty-state p {
          font-size: 14px;
          margin-bottom: 4px;
        }
        .empty-hint {
          font-size: 12px !important;
          color: rgba(255,255,255,0.3) !important;
        }
        .export-section {
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .export-buttons {
          display: flex;
          gap: 8px;
        }
        .export-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #fff;
        }
        .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .json-btn {
          background: rgba(233, 69, 96, 0.2);
          border-color: #e94560;
        }
        .json-btn:hover:not(:disabled) {
          background: #e94560;
          transform: scale(1.03);
        }
        .html-btn {
          background: rgba(15, 52, 96, 0.6);
          border-color: #0f3460;
        }
        .html-btn:hover:not(:disabled) {
          background: #0f3460;
          transform: scale(1.03);
        }
        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        .export-success {
          margin-top: 8px;
          text-align: center;
          font-size: 12px;
          color: #16c79a;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SummaryPanel;
