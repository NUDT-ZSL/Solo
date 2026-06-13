import { useRef } from 'react';
import { presetDatasets } from './data/presets';

interface ControlPanelProps {
  datasetId: string;
  onPresetChange: (id: string) => void;
  onFileUpload: (file: File) => void;
}

function ControlPanel({ datasetId, onPresetChange, onFileUpload }: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h3 className="panel-title">数据</h3>
        <button className="upload-btn" onClick={handleUploadClick}>
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>上传数据</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="panel-section">
        <h3 className="panel-title">预设数据</h3>
        <div className="preset-buttons">
          {presetDatasets.map((ds) => (
            <button
              key={ds.id}
              className={`preset-btn ${datasetId === ds.id ? 'active' : ''}`}
              onClick={() => onPresetChange(ds.id)}
            >
              <span className="preset-full">{ds.name}</span>
              <span className="preset-short">{ds.shortName}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section panel-tip">
        <p>支持 CSV 和 JSON 格式</p>
        <p className="tip-small">CSV: time,value 两列</p>
      </div>
    </div>
  );
}

export default ControlPanel;
