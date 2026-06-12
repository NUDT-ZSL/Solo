import { memo } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Scheme } from './types';
import './SchemeManager.css';

interface SchemeManagerProps {
  schemes: Scheme[];
  onLoad: (scheme: Scheme) => void;
  onDelete: (id: string) => void;
}

function SchemeManager({ schemes, onLoad, onDelete }: SchemeManagerProps) {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="scheme-manager">
      <div className="scheme-header">
        <h3 className="scheme-title">我的方案</h3>
        <span className="scheme-count">{schemes.length} 个方案</span>
      </div>

      <div className="scheme-list">
        {schemes.length === 0 ? (
          <div className="scheme-empty">
            <Plus size={24} color="#9ca3af" />
            <p>暂无保存的方案</p>
            <span>点击上方"保存布局"按钮保存第一个方案</span>
          </div>
        ) : (
          schemes.map((scheme) => (
            <div key={scheme.id} className="scheme-item">
              <div
                className="scheme-thumbnail" onClick={() => onLoad(scheme)} title={`加载 ${scheme.name}`}>
                <img src={scheme.thumbnail} alt={scheme.name} />
              </div>
              <div className="scheme-info">
                <span className="scheme-name" title={scheme.name}>
                  {scheme.name}
                </span>
                <span className="scheme-meta">
                  {formatDate(scheme.createdAt)} · {scheme.blocks.length} 个组件
                </span>
              </div>
              <button
                className="scheme-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(scheme.id);
                }}
                title="删除方案"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(SchemeManager);
