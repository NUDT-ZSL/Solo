import { useState } from 'react';
import type { PlatformConfig } from '../types';

interface PlatformPanelProps {
  platforms: PlatformConfig[];
  onUpdate: (platformId: string, config: Partial<PlatformConfig>) => void;
}

const thumbnailSizes = [
  '1920x1080',
  '1080x1080',
  '900x383',
  '1080x1920',
  '800x800',
  '1200x675'
];

function PlatformPanel({ platforms, onUpdate }: PlatformPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([platforms[0]?.id]));

  const togglePlatform = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleChange = (platformId: string, key: keyof PlatformConfig, value: unknown) => {
    onUpdate(platformId, { [key]: value });
  };

  return (
    <div className="platform-panel">
      {platforms.map(platform => (
        <div
          key={platform.id}
          className={`platform-card ${expandedIds.has(platform.id) ? 'expanded' : ''}`}
        >
          <div 
            className="platform-card-header"
            onClick={() => togglePlatform(platform.id)}
          >
            <div className="platform-name">
              <span className={`platform-icon ${platform.id}`}>
                {platform.name.charAt(0)}
              </span>
              {platform.name}
            </div>
            <span className="platform-card-toggle">▼</span>
          </div>
          
          <div className="platform-card-body">
            <div className="platform-config-item">
              <label className="config-checkbox">
                <input
                  type="checkbox"
                  checked={platform.includeOriginalLink}
                  onChange={(e) => handleChange(platform.id, 'includeOriginalLink', e.target.checked)}
                />
                <span>包含原文链接</span>
              </label>
            </div>
            
            <div className="platform-config-item">
              <label>话题标签前缀</label>
              <input
                type="text"
                value={platform.hashtagPrefix}
                onChange={(e) => handleChange(platform.id, 'hashtagPrefix', e.target.value)}
                placeholder="如 # 或 空"
              />
            </div>
            
            <div className="platform-config-item">
              <label>缩略图尺寸</label>
              <select
                value={platform.thumbnailSize}
                onChange={(e) => handleChange(platform.id, 'thumbnailSize', e.target.value)}
              >
                {thumbnailSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            
            <div className="platform-config-item">
              <label>格式模板</label>
              <textarea
                value={platform.template}
                onChange={(e) => handleChange(platform.id, 'template', e.target.value)}
              />
              <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 4, lineHeight: 1.5 }}>
                可用变量：{'{{title}}'}、{'{{body}}'}、{'{{hashtags}}'}、{'{{originalLink}}'}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        backgroundColor: '#e7f5ff', 
        borderRadius: 6,
        fontSize: 12,
        color: '#1864ab',
        lineHeight: 1.6
      }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>💡 使用提示</div>
        <div>• 编辑文章后会自动保存</div>
        <div>• 点击"一键分发"发布到所有配置好的平台</div>
        <div>• 可在版本历史中查看和回退旧版本</div>
      </div>
    </div>
  );
}

export default PlatformPanel;
