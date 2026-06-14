import { useState, useEffect } from 'react';
import { DataSource } from './utils/fetchData';

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (dataSource: DataSource) => void;
  generateId: () => string;
  createInitialDataSource: (id: string, name: string, type: DataSource['type'], refreshInterval?: number) => DataSource;
}

const typeOptions: { value: DataSource['type']; label: string }[] = [
  { value: 'stock', label: '股票价格' },
  { value: 'traffic', label: '网站访问量' },
  { value: 'sensor', label: '传感器读数' },
  { value: 'progress', label: '任务进度' },
  { value: 'revenue', label: '营收数据' },
  { value: 'users', label: '在线用户' }
];

export default function DataSourceModal({ 
  isOpen, 
  onClose, 
  onAdd,
  generateId,
  createInitialDataSource
}: DataSourceModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<DataSource['type']>('stock');
  const [refreshInterval, setRefreshInterval] = useState(2);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType('stock');
      setRefreshInterval(2);
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!name.trim()) return;
    const newDataSource = createInitialDataSource(
      generateId(),
      name.trim(),
      type,
      refreshInterval
    );
    onAdd(newDataSource);
    setIsAnimating(false);
    setTimeout(onClose, 200);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsAnimating(false);
      setTimeout(onClose, 200);
    }
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: isAnimating ? 1 : 0,
        transition: 'opacity 0.2s ease-out'
      }}
    >
      <div
        style={{
          width: 420,
          borderRadius: 16,
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          padding: 24,
          transform: isAnimating ? 'scale(1)' : 'scale(0.9)',
          opacity: isAnimating ? 1 : 0,
          transition: 'all 0.2s ease-out'
        }}
      >
        <h2 style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#f0f6fc',
          marginBottom: 20,
          fontFamily: "'Courier New', monospace"
        }}>
          添加数据源
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            color: '#8b949e',
            marginBottom: 6,
            fontFamily: "'Courier New', monospace"
          }}>
            数据源名称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入数据源名称"
            style={{
              width: '100%',
              height: 36,
              padding: '0 12px',
              borderRadius: 6,
              backgroundColor: '#0d1117',
              border: '1px solid #30363d',
              color: '#f0f6fc',
              fontSize: 14,
              fontFamily: "'Courier New', monospace",
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#58a6ff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#30363d';
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            color: '#8b949e',
            marginBottom: 6,
            fontFamily: "'Courier New', monospace"
          }}>
            数据类型
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DataSource['type'])}
            style={{
              width: '100%',
              height: 36,
              padding: '0 12px',
              borderRadius: 6,
              backgroundColor: '#0d1117',
              border: '1px solid #30363d',
              color: '#f0f6fc',
              fontSize: 14,
              fontFamily: "'Courier New', monospace",
              outline: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#58a6ff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#30363d';
            }}
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            color: '#8b949e',
            marginBottom: 6,
            fontFamily: "'Courier New', monospace"
          }}>
            刷新间隔: {refreshInterval} 秒
          </label>
          <input
            type="range"
            min={1}
            max={60}
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            style={{
              width: '100%',
              height: 4,
              borderRadius: 2,
              backgroundColor: '#21262d',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #58a6ff;
              cursor: pointer;
              box-shadow: 0 0 8px rgba(88, 166, 255, 0.5);
            }
            input[type="range"]::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #58a6ff;
              cursor: pointer;
              border: none;
              box-shadow: 0 0 8px rgba(88, 166, 255, 0.5);
            }
          `}</style>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              setIsAnimating(false);
              setTimeout(onClose, 200);
            }}
            style={{
              height: 36,
              padding: '0 20px',
              borderRadius: 8,
              backgroundColor: 'transparent',
              border: '1px solid #30363d',
              color: '#8b949e',
              fontSize: 14,
              fontFamily: "'Courier New', monospace",
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#21262d';
              e.currentTarget.style.color = '#f0f6fc';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#8b949e';
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            style={{
              height: 36,
              padding: '0 20px',
              borderRadius: 8,
              backgroundColor: name.trim() ? '#238636' : '#21262d',
              border: 'none',
              color: name.trim() ? '#ffffff' : '#6e7681',
              fontSize: 14,
              fontFamily: "'Courier New', monospace",
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (name.trim()) {
                e.currentTarget.style.backgroundColor = '#2ea043';
              }
            }}
            onMouseOut={(e) => {
              if (name.trim()) {
                e.currentTarget.style.backgroundColor = '#238636';
              }
            }}
          >
            确认添加
          </button>
        </div>
      </div>
    </div>
  );
}
