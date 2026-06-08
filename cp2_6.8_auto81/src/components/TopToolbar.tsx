import { useRef } from 'react';
import { Upload, Camera, Download, GitCompare, Users, FileText } from 'lucide-react';
import { useAppStore } from '@/store';
import type { Snapshot } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface TopToolbarProps {
  wsSend: (msg: any) => void;
  onExport: () => void;
}

export function TopToolbar({ wsSend, onExport }: TopToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const annotations = useAppStore((s) => s.annotations);
  const snapshots = useAppStore((s) => s.snapshots);
  const onlineCount = useAppStore((s) => s.onlineCount);
  const compareMode = useAppStore((s) => s.compareMode);
  const addSnapshot = useAppStore((s) => s.addSnapshot);
  const setCompareMode = useAppStore((s) => s.setCompareMode);
  const setPdfFile = useAppStore((s) => s.setPdfFile);
  const setIsSamplePDF = useAppStore((s) => s.setIsSamplePDF);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const setScale = useAppStore((s) => s.setScale);
  const setOffsetX = useAppStore((s) => s.setOffsetX);
  const setOffsetY = useAppStore((s) => s.setOffsetY);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('请选择PDF文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      setPdfFile(buffer);
      setIsSamplePDF(false);
      setCurrentPage(1);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUseSample = () => {
    setPdfFile(null);
    setIsSamplePDF(true);
    setCurrentPage(1);
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleCreateSnapshot = () => {
    if (snapshots.length >= 5) {
      alert('最多保存5个版本，最早的版本将被替换');
    }
    const snapshot: Snapshot = {
      id: uuidv4(),
      name: `版本 ${snapshots.length + 1} - ${new Date().toLocaleTimeString()}`,
      createdAt: Date.now(),
      annotations: JSON.parse(JSON.stringify(annotations)),
    };
    addSnapshot(snapshot);
    wsSend({ type: 'snapshot_create', payload: { snapshot } });
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()}>
          <Upload size={18} />
          <span>上传PDF</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <button className="toolbar-btn" onClick={handleUseSample}>
          <FileText size={18} />
          <span>示例PDF</span>
        </button>
        <div className="toolbar-divider" />
        <button className="toolbar-btn" onClick={handleCreateSnapshot}>
          <Camera size={18} />
          <span>快照 ({snapshots.length}/5)</span>
        </button>
        <button
          className={`toolbar-btn ${compareMode ? 'active' : ''}`}
          onClick={() => setCompareMode(!compareMode)}
        >
          <GitCompare size={18} />
          <span>版本对比</span>
        </button>
      </div>

      <div className="toolbar-right">
        <div className="online-badge">
          <Users size={14} />
          <span className="online-count">{onlineCount}</span>
        </div>
        <button className="toolbar-btn" onClick={onExport}>
          <Download size={18} />
          <span>导出PNG</span>
        </button>
      </div>
    </div>
  );
}
