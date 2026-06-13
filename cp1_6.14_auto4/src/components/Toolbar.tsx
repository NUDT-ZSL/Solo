import { useCallback, useState } from 'react';
import { useStore } from '../store';
import {
  Monitor,
  Circle,
  Square,
  FileDown,
  ScanSearch,
  Loader,
} from 'lucide-react';

interface ToolbarProps {
  onRecord: () => void;
  onDetect: () => void;
  onExport: () => void;
  isRecording: boolean;
  isDiffMode: boolean;
  isLoading: boolean;
}

export default function Toolbar({
  onRecord,
  onDetect,
  onExport,
  isRecording,
  isDiffMode,
  isLoading,
}: ToolbarProps) {
  const { targetUrl, setTargetUrl } = useStore();
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      let url = inputValue.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      setTargetUrl(url);
      setInputValue(url);
    },
    [inputValue, setTargetUrl]
  );

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="toolbar-logo">
          <Monitor size={24} />
          <div>
            <span className="toolbar-logo-text">
              ViewportScope
            </span>
            <span className="toolbar-logo-sub">
              响应式验证
            </span>
          </div>
        </div>
      </div>

      <div className="toolbar-right">
        <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
          <input
            className="url-input"
            type="text"
            placeholder="输入URL，如 example.com"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </form>

        <button
          className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
          onClick={onRecord}
        >
          {isRecording ? (
            <>
              <Square size={14} />
              停止录制
            </>
          ) : (
            <>
              <Circle size={14} />
              开始录制
            </>
          )}
        </button>

        <button
          className={`btn ${isDiffMode ? 'btn-primary' : ''}`}
          onClick={onDetect}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner" />
              检测中...
            </>
          ) : (
            <>
              <ScanSearch size={14} />
              {isDiffMode ? '退出检测' : '检测布局差异'}
            </>
          )}
        </button>

        <button className="btn" onClick={onExport} disabled={isLoading}>
          {isLoading ? (
            <Loader size={14} />
          ) : (
            <FileDown size={14} />
          )}
          导出报告
        </button>
      </div>
    </div>
  );
}
