import React, { useState, useEffect, useCallback } from 'react';
import { SavedConfig } from '../shared/RuneTypes';

interface ConfigManagerProps {
  currentRuneIds: string[];
  onLoadConfig: (runeIds: string[]) => void;
}

export const ConfigManager: React.FC<ConfigManagerProps> = ({ currentRuneIds, onLoadConfig }) => {
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [configName, setConfigName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/configs');
      if (!res.ok) throw new Error('Failed to fetch configs');
      const data = await res.json();
      setConfigs(data);
    } catch (err) {
      console.error('Fetch configs error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSave = async () => {
    const name = configName.trim();
    if (!name) {
      setMessage({ type: 'error', text: '请输入配置名称' });
      return;
    }
    if (name.length > 10) {
      setMessage({ type: 'error', text: '名称最多10个字符' });
      return;
    }
    if (currentRuneIds.length === 0) {
      setMessage({ type: 'error', text: '请先选择至少一个符文' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, runeIds: currentRuneIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      setMessage({ type: 'success', text: '保存成功' });
      setConfigName('');
      await fetchConfigs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '保存失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = (config: SavedConfig) => {
    onLoadConfig(config.runeIds);
    setMessage({ type: 'success', text: `已加载：${config.name}` });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <div className="panel">
      <h2 className="panel-title">配置管理</h2>
      <div className="config-manager">
        <div className="save-row">
          <input
            type="text"
            placeholder="配置名称(最多10字)"
            value={configName}
            onChange={(e) => setConfigName(e.target.value.slice(0, 10))}
            maxLength={10}
          />
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中' : '保存'}
          </button>
        </div>

        {message && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              background: message.type === 'success' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
              color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${message.type === 'success' ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
            }}
          >
            {message.text}
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          当前选择符文：{currentRuneIds.length > 0 ? `${currentRuneIds.length}个` : '无'}
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginBottom: 8,
            marginTop: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>历史记录</span>
          <button
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={fetchConfigs}
            disabled={isLoading}
          >
            {isLoading ? '加载中' : '刷新'}
          </button>
        </div>

        <div className="config-list">
          {isLoading && configs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
              加载中...
            </div>
          ) : configs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
              暂无保存的配置
            </div>
          ) : (
            configs.map((config) => (
              <div
                key={config._id}
                className="config-item"
                onClick={() => handleLoad(config)}
              >
                <div className="config-item-name">{config.name}</div>
                <div className="config-item-time">
                  {formatTime(config.createdAt)} · {config.runeIds.length}个符文
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigManager;
