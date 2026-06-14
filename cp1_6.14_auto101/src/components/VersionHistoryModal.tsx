import { useState, useMemo, useEffect } from 'react';
import type { Article, ArticleVersion } from '../types';
import { formatFullTime, computeLineDiff, DiffResult } from '../utils';

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

  useEffect(() => {
    if (versions.length >= 2) {
      setCompareFromId(versions[versions.length - 1].id);
      setCompareToId(versions[0].id);
    }
  }, [versions]);

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

  const renderDiff = (diff: DiffResult[]) => {
    return diff.map((part, idx) => {
      const lines = part.value.split('\n');
      const isLastLineEmpty = lines[lines.length - 1] === '';
      if (isLastLineEmpty) lines.pop();
      
      return lines.map((line, lineIdx) => {
        const lineNum = idx + '-' + lineIdx;
        let className = 'diff-line';
        let prefix = '  ';
        
        if (part.added) {
          className = 'diff-line diff-added';
          prefix = '+ ';
        } else if (part.removed) {
          className = 'diff-line diff-removed';
          prefix = '- ';
        }
        
        return (
          <div key={lineNum} className={className}>
            <span className="diff-line-prefix">{prefix}</span>
            <span className="diff-line-content">{line || ' '}</span>
          </div>
        );
      });
    });
  };

  const stats = useMemo(() => {
    if (!diffResult) return null;
    let added = 0;
    let removed = 0;
    [...diffResult.titleDiff, ...diffResult.bodyDiff].forEach(part => {
      const lineCount = part.value.split('\n').filter(l => l !== '').length;
      if (part.added) added += lineCount;
      if (part.removed) removed += lineCount;
    });
    return { added, removed };
  }, [diffResult]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ width: 720, maxHeight: '85vh' }}
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
                  marginBottom: 16,
                  padding: '6px 14px',
                  border: '1px solid #dee2e6',
                  borderRadius: 6,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#495057'
                }}
              >
                ← 返回列表
              </button>
              
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#212529' }}>
                  {selectedVersion.title || '无标题'}
                </div>
                <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 12 }}>
                  创建时间：{formatFullTime(selectedVersion.createdAt)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    className="btn-restore"
                    onClick={() => handleRestore(selectedVersion)}
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    ↩ 恢复此版本
                  </button>
                </div>
              </div>
              
              <div style={{ 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#495057',
                marginBottom: 8
              }}>
                标题
              </div>
              <div className="preview-content" style={{ marginBottom: 20, padding: 14 }}>
                {selectedVersion.title}
              </div>
              
              <div style={{ 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#495057',
                marginBottom: 8
              }}>
                正文
              </div>
              <div className="preview-content" style={{ padding: 14, minHeight: 100 }}>
                {selectedVersion.body || '(空内容)'}
              </div>
            </div>
          ) : (
            <div>
              <div className="version-diff-section">
                <div className="diff-header">
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#212529' }}>
                    🔍 版本对比
                  </span>
                  {stats && (
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      <span style={{ color: '#0f5132', fontWeight: 500 }}>
                        +{stats.added} 行新增
                      </span>
                      <span style={{ color: '#842029', fontWeight: 500 }}>
                        -{stats.removed} 行删除
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="version-compare" style={{ marginTop: 12 }}>
                  <select
                    value={compareFromId}
                    onChange={(e) => setCompareFromId(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6 }}
                  >
                    <option value="">选择旧版本...</option>
                    {versions.map((v, idx) => (
                      <option key={v.id} value={v.id}>
                        #{versions.length - idx} {v.title || '无标题'}
                      </option>
                    ))}
                  </select>
                  <span style={{ alignSelf: 'center', color: '#adb5bd', fontSize: 18 }}>→</span>
                  <select
                    value={compareToId}
                    onChange={(e) => setCompareToId(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6 }}
                  >
                    <option value="">选择新版本...</option>
                    {versions.map((v, idx) => (
                      <option key={v.id} value={v.id}>
                        #{versions.length - idx} {v.title || '无标题'}
                      </option>
                    ))}
                  </select>
                </div>
                
                {diffResult && (
                  <div style={{ marginTop: 16 }}>
                    <div className="diff-meta">
                      {formatFullTime(diffResult.fromVersion.createdAt)} 
                      → {formatFullTime(diffResult.toVersion.createdAt)}
                    </div>
                    
                    <div className="diff-block">
                      <div className="diff-block-title">标题差异</div>
                      <div className="diff-viewer">
                        {renderDiff(diffResult.titleDiff)}
                      </div>
                    </div>
                    
                    <div className="diff-block">
                      <div className="diff-block-title">正文差异</div>
                      <div className="diff-viewer">
                        {renderDiff(diffResult.bodyDiff)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#212529' }}>
                  📋 所有版本
                </div>
                
                {versions.map((version, idx) => (
                  <div key={version.id} className="version-item">
                    <div className="version-info" style={{ flex: 1 }}>
                      <div className="version-title" style={{ fontSize: 14, color: '#343a40', fontWeight: 500 }}>
                        {idx === 0 && (
                          <span style={{ 
                            fontSize: 10, 
                            backgroundColor: '#0d6efd', 
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 4,
                            marginRight: 8,
                            fontWeight: 600
                          }}>
                            当前
                          </span>
                        )}
                        {version.title || '无标题'}
                      </div>
                      <div className="version-time" style={{ marginTop: 4 }}>
                        #{versions.length - idx} · {formatFullTime(version.createdAt)} · {version.body?.length || 0}字
                      </div>
                    </div>
                    <div className="version-actions" style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setSelectedVersion(version)}
                        style={{
                          padding: '6px 14px',
                          border: '1px solid #dee2e6',
                          borderRadius: 6,
                          backgroundColor: 'transparent',
                          color: '#495057',
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = '#f8f9fa';
                          (e.currentTarget as HTMLElement).style.borderColor = '#ced4da';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          (e.currentTarget as HTMLElement).style.borderColor = '#dee2e6';
                        }}
                      >
                        查看
                      </button>
                      {idx !== 0 && (
                        <button 
                          className="btn-restore"
                          onClick={() => handleRestore(version)}
                          style={{ padding: '6px 14px', fontSize: 13 }}
                        >
                          恢复
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VersionHistoryModal;
