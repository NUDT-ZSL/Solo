import { useState, useMemo } from 'react';
import type { Article, ArticleVersion } from '../types';
import { formatFullTime, computeLineDiff } from '../utils';

interface VersionHistoryModalProps {
  article: Article;
  onClose: () => void;
  onRestore: (versionId: string) => void;
}

function VersionHistoryModal({ article, onClose, onRestore }: VersionHistoryModalProps) {
  const [compareFromId, setCompareFromId] = useState<string>('');
  const [compareToId, setCompareToId] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<ArticleVersion | null>(null);

  const versions = useMemo(() => {
    return [...(article.versions || [])].sort((a, b) => b.createdAt - a.createdAt);
  }, [article.versions]);

  const diffResult = useMemo(() => {
    if (!compareFromId || !compareToId) return null;
    const from = versions.find(v => v.id === compareFromId);
    const to = versions.find(v => v.id === compareToId);
    if (!from || !to) return null;
    
    const titleDiff = computeLineDiff(from.title, to.title);
    const bodyDiff = computeLineDiff(from.body, to.body);
    return { titleDiff, bodyDiff, fromVersion: from, toVersion: to };
  }, [compareFromId, compareToId, versions]);

  const handleRestore = (version: ArticleVersion) => {
    if (confirm(`确定要回退到版本「${version.title || '无标题'}」吗？这将创建一个新版本。`)) {
      onRestore(version.id);
    }
  };

  const renderDiffSegments = (segments: ReturnType<typeof computeLineDiff>) => {
    return segments.map((seg, idx) => {
      if (seg.type === 'unchanged') {
        return <div key={idx}>{seg.content || ' '}</div>;
      }
      const className = seg.type === 'added' ? 'diff-added' : 'diff-removed';
      const prefix = seg.type === 'added' ? '+ ' : '- ';
      return (
        <div key={idx} className={className}>
          {prefix}{seg.content || ' '}
        </div>
      );
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ width: 700 }}
      >
        <div className="modal-header">
          <h3>📜 版本历史 ({versions.length}个版本)</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {selectedVersion ? (
            <div>
              <button
                onClick={() => setSelectedVersion(null)}
                style={{
                  marginBottom: 12,
                  padding: '4px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: 4,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#495057'
                }}
              >
                ← 返回列表
              </button>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                  {selectedVersion.title || '无标题'}
                </div>
                <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 12 }}>
                  创建时间：{formatFullTime(selectedVersion.createdAt)}
                </div>
                <button 
                  className="btn-restore"
                  onClick={() => handleRestore(selectedVersion)}
                >
                  恢复此版本
                </button>
              </div>
              
              <div style={{ 
                fontSize: 13, 
                fontWeight: 500, 
                color: '#495057',
                marginBottom: 8
              }}>
                标题
              </div>
              <div className="preview-content" style={{ marginBottom: 16 }}>
                {selectedVersion.title}
              </div>
              
              <div style={{ 
                fontSize: 13, 
                fontWeight: 500, 
                color: '#495057',
                marginBottom: 8
              }}>
                正文
              </div>
              <div className="preview-content">
                {selectedVersion.body || '(空)'}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: 16, 
                borderRadius: 8,
                marginBottom: 20
              }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                  🔍 版本对比
                </div>
                <div className="version-compare">
                  <select
                    value={compareFromId}
                    onChange={(e) => setCompareFromId(e.target.value)}
                  >
                    <option value="">选择旧版本...</option>
                    {versions.map((v, idx) => (
                      <option key={v.id} value={v.id}>
                        {idx + 1}. {v.title || '无标题'} ({formatFullTime(v.createdAt)})
                      </option>
                    ))}
                  </select>
                  <span style={{ alignSelf: 'center', color: '#adb5bd' }}>→</span>
                  <select
                    value={compareToId}
                    onChange={(e) => setCompareToId(e.target.value)}
                  >
                    <option value="">选择新版本...</option>
                    {versions.map((v, idx) => (
                      <option key={v.id} value={v.id}>
                        {idx + 1}. {v.title || '无标题'} ({formatFullTime(v.createdAt)})
                      </option>
                    ))}
                  </select>
                </div>
                
                {diffResult && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ 
                      fontSize: 12, 
                      color: '#6c757d', 
                      marginBottom: 8,
                      padding: '8px 0',
                      borderBottom: '1px solid #dee2e6'
                    }}>
                      {formatFullTime(diffResult.fromVersion.createdAt)} → {formatFullTime(diffResult.toVersion.createdAt)}
                    </div>
                    
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 500, 
                      color: '#495057',
                      margin: '12px 0 8px'
                    }}>
                      标题差异
                    </div>
                    <div className="diff-viewer" style={{ marginBottom: 16 }}>
                      {renderDiffSegments(diffResult.titleDiff)}
                    </div>
                    
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 500, 
                      color: '#495057',
                      margin: '12px 0 8px'
                    }}>
                      正文差异
                    </div>
                    <div className="diff-viewer">
                      {renderDiffSegments(diffResult.bodyDiff)}
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                📋 所有版本
              </div>
              
              {versions.map((version, idx) => (
                <div key={version.id} className="version-item">
                  <div className="version-info">
                    <div className="version-title" style={{ fontSize: 13, color: '#495057' }}>
                      {idx === 0 && (
                        <span style={{ 
                          fontSize: 11, 
                          backgroundColor: '#0d6efd', 
                          color: 'white',
                          padding: '1px 6px',
                          borderRadius: 4,
                          marginRight: 6
                        }}>
                          当前
                        </span>
                      )}
                      {version.title || '无标题'}
                    </div>
                    <div className="version-time">
                      #{versions.length - idx} · {formatFullTime(version.createdAt)} · {version.body?.length || 0}字
                    </div>
                  </div>
                  <div className="version-actions">
                    <button
                      onClick={() => setSelectedVersion(version)}
                      style={{
                        padding: '4px 12px',
                        border: '1px solid #dee2e6',
                        borderRadius: 4,
                        backgroundColor: 'transparent',
                        color: '#495057',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      查看
                    </button>
                    {idx !== 0 && (
                      <button 
                        className="btn-restore"
                        onClick={() => handleRestore(version)}
                      >
                        恢复
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VersionHistoryModal;
