import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

interface Version {
  version: number;
  timestamp: string;
  editorName: string;
  content: string;
}

interface VersionHistoryProps {
  proposalId: string;
  onRestore: (versionNumber: number) => void;
}

const ITEM_HEIGHT = 60;
const BATCH_SIZE = 50;
const MAX_VERSIONS = 200;
const BUFFER_ITEMS = 10;

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function VersionHistory({ proposalId, onRestore }: VersionHistoryProps) {
  const [allVersions, setAllVersions] = useState<Version[]>([]);
  const [displayCount, setDisplayCount] = useState(BATCH_SIZE);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const isRecalculatingRef = useRef(false);

  const visibleVersions = allVersions.slice(0, Math.min(displayCount, MAX_VERSIONS));
  const hasMore = allVersions.length > displayCount && displayCount < MAX_VERSIONS;

  const calculateVisibleRange = useCallback(() => {
    if (isRecalculatingRef.current) return;
    isRecalculatingRef.current = true;

    requestAnimationFrame(() => {
      if (!scrollRef.current || visibleVersions.length === 0) {
        setStartIndex(0);
        setEndIndex(0);
        isRecalculatingRef.current = false;
        return;
      }
      const viewportHeight = scrollRef.current.clientHeight || 400;
      const scrollTop = scrollRef.current.scrollTop;
      const visibleCount = Math.ceil(viewportHeight / ITEM_HEIGHT);
      const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS);
      const end = Math.min(visibleVersions.length, start + visibleCount + BUFFER_ITEMS * 2);
      setStartIndex(start);
      setEndIndex(end);
      isRecalculatingRef.current = false;
    });
  }, [visibleVersions.length]);

  useEffect(() => {
    axios.get(`/api/proposals/${proposalId}`).then((res) => {
      const versions: Version[] = (res.data.versions || []).map((v: Version) => ({
        version: v.version,
        timestamp: v.timestamp,
        editorName: v.editorName,
        content: v.content,
      }));
      setAllVersions(versions.reverse());
    });
  }, [proposalId]);

  useEffect(() => {
    calculateVisibleRange();
  }, [calculateVisibleRange]);

  useEffect(() => {
    if (!scrollRef.current) return;

    const options: IntersectionObserverInit = {
      root: scrollRef.current,
      rootMargin: '0px',
      threshold: 0,
    };

    const topObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && scrollRef.current && scrollRef.current.scrollTop > 0) {
          calculateVisibleRange();
        }
      });
    }, options);

    const bottomObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          calculateVisibleRange();
        }
      });
    }, options);

    if (topSentinelRef.current) {
      topObserver.observe(topSentinelRef.current);
    }
    if (bottomSentinelRef.current) {
      bottomObserver.observe(bottomSentinelRef.current);
    }

    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, [visibleVersions.length, calculateVisibleRange]);

  useEffect(() => {
    const handleResize = () => {
      calculateVisibleRange();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateVisibleRange]);

  const handleSelectVersion = (versionNumber: number) => {
    setSelectedVersion(selectedVersion === versionNumber ? null : versionNumber);
  };

  const handleRestoreClick = (versionNumber: number) => {
    setRestoreVersion(versionNumber);
    setShowConfirmDialog(true);
  };

  const handleConfirmRestore = () => {
    if (restoreVersion !== null) {
      onRestore(restoreVersion);
    }
    setShowConfirmDialog(false);
    setRestoreVersion(null);
  };

  const handleCancelRestore = () => {
    setShowConfirmDialog(false);
    setRestoreVersion(null);
  };

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + BATCH_SIZE, MAX_VERSIONS));
  };

  const paddingTop = startIndex * ITEM_HEIGHT;
  const paddingBottom = Math.max(0, (visibleVersions.length - endIndex) * ITEM_HEIGHT);
  const renderedVersions = visibleVersions.slice(startIndex, endIndex);

  return (
    <div style={{ background: '#ECF0F1', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
          minHeight: 0,
        }}
      >
        <div style={{ paddingTop, paddingBottom }}>
          <div ref={topSentinelRef} style={{ height: 1 }} />
          {renderedVersions.map((v) => {
            const isSelected = selectedVersion === v.version;

            return (
              <div
                key={v.version}
                style={{
                  position: 'relative',
                  height: ITEM_HEIGHT,
                }}
              >
                <div
                  onClick={() => handleSelectVersion(v.version)}
                  style={{
                    height: ITEM_HEIGHT,
                    padding: '8px 12px',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    background: isSelected ? '#d5dbdb' : '#ECF0F1',
                    borderBottom: '1px solid #BDC3C7',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ color: '#2C3E50', fontWeight: 600, fontSize: 13 }}>
                    版本 {v.version}
                  </div>
                  <div style={{ color: '#7f8c8d', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatTime(v.timestamp)}</span>
                    <span>{v.editorName}</span>
                  </div>
                </div>

                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: ITEM_HEIGHT,
                      left: 0,
                      right: 0,
                      background: '#fff',
                      padding: 16,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 10,
                      animation: 'slideIn 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        maxHeight: 150,
                        overflowY: 'auto',
                        fontSize: 13,
                        color: '#2C3E50',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                      }}
                    >
                      {v.content || '(空内容)'}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreClick(v.version);
                      }}
                      style={{
                        marginTop: 12,
                        padding: '6px 16px',
                        background: '#2C3E50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      恢复此版本
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomSentinelRef} style={{ height: 1 }} />
        </div>
      </div>

      {hasMore && (
        <div style={{ padding: 12, textAlign: 'center', borderTop: '1px solid #BDC3C7', background: '#ECF0F1' }}>
          <button
            onClick={handleLoadMore}
            style={{
              padding: '8px 24px',
              border: '1px solid #BDC3C7',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              color: '#2C3E50',
            }}
          >
            加载更多
          </button>
        </div>
      )}

      {showConfirmDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: 28,
              width: 380,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <p style={{ color: '#2C3E50', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px 0' }}>
              确定要恢复到版本 {restoreVersion} 吗？当前内容将被替换。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={handleCancelRestore}
                style={{
                  padding: '8px 20px',
                  border: '1px solid #BDC3C7',
                  borderRadius: 6,
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#2C3E50',
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmRestore}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: 6,
                  background: '#2C3E50',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default VersionHistory;
