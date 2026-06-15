import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Contract,
  ContractVersion,
  Annotation,
  getContracts,
  getContractVersions,
  createAnnotation as apiCreateAnnotation,
  updateAnnotation as apiUpdateAnnotation,
  deleteAnnotation as apiDeleteAnnotation,
} from './services/api';
import VersionDiff from './components/VersionDiff';
import ReviewPanel from './components/ReviewPanel';
import jsPDF from 'jspdf';

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function App() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedLine, setSelectedLine] = useState<{ versionId: string; lineNumber: number } | null>(null);
  const [expandedAnnotationId, setExpandedAnnotationId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadContracts = async () => {
      try {
        setLoading(true);
        const data = await getContracts();
        setContracts(data);
        if (data.length > 0) {
          setSelectedContractId(data[0].id);
        }
      } catch (error) {
        console.error('加载合同列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadContracts();
  }, []);

  useEffect(() => {
    if (selectedContractId) {
      const loadVersions = async () => {
        try {
          const data = await getContractVersions(selectedContractId);
          setVersions(data);
          setSelectedVersionIds([]);
          const allAnnotations = data.flatMap((v) => v.annotations);
          setAnnotations(allAnnotations);
        } catch (error) {
          console.error('加载版本列表失败:', error);
        }
      };
      loadVersions();
    }
  }, [selectedContractId]);

  const handleVersionSelect = useCallback((versionId: string) => {
    setSelectedVersionIds((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  }, []);

  const handleCreateAnnotation = useCallback(
    async (content: string) => {
      if (!selectedContractId || !selectedLine) return;
      try {
        const newAnnotation = await apiCreateAnnotation(selectedContractId, {
          versionId: selectedLine.versionId,
          lineNumber: selectedLine.lineNumber,
          content,
        });
        setAnnotations((prev) => [...prev, newAnnotation]);
        setSelectedLine(null);
      } catch (error) {
        console.error('创建批注失败:', error);
      }
    },
    [selectedContractId, selectedLine]
  );

  const handleUpdateAnnotation = useCallback(
    async (id: string, data: { content?: string; status?: Annotation['status'] }) => {
      try {
        const updated = await apiUpdateAnnotation(id, data);
        setAnnotations((prev) => prev.map((a) => (a.id === id ? updated : a)));
      } catch (error) {
        console.error('更新批注失败:', error);
      }
    },
    []
  );

  const handleDeleteAnnotation = useCallback(async (id: string) => {
    try {
      await apiDeleteAnnotation(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      if (expandedAnnotationId === id) {
        setExpandedAnnotationId(null);
      }
    } catch (error) {
      console.error('删除批注失败:', error);
    }
  }, [expandedAnnotationId]);

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId),
    [contracts, selectedContractId]
  );

  const compareVersions = useMemo(() => {
    if (selectedVersionIds.length !== 2) return null;
    const v1 = versions.find((v) => v.id === selectedVersionIds[0]);
    const v2 = versions.find((v) => v.id === selectedVersionIds[1]);
    return v1 && v2 ? [v1, v2] : null;
  }, [versions, selectedVersionIds]);

  const versionAnnotations = useMemo(() => {
    if (!compareVersions) return [];
    return annotations.filter((a) => compareVersions.some((v) => v.id === a.versionId));
  }, [annotations, compareVersions]);

  const handleExportPDF = useCallback(async () => {
    if (!selectedContract || !compareVersions) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportSuccess(false);

    try {
      await new Promise((r) => setTimeout(r, 200));
      setExportProgress(20);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ContractFlow - 合同审核报告', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`合同名称: ${selectedContract.name}`, 20, yPos);
      yPos += 8;
      doc.text(`对比版本: ${compareVersions[0].version} -> ${compareVersions[1].version}`, 20, yPos);
      yPos += 8;
      doc.text(`生成时间: ${formatDate(Date.now())}`, 20, yPos);
      yPos += 15;

      setExportProgress(40);
      await new Promise((r) => setTimeout(r, 200));

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = compareVersions[0].content;
      const lines1 = compareVersions[0].content.split('\n').length;
      const lines2 = compareVersions[1].content.split('\n').length;
      const added = Math.max(0, lines2 - lines1);
      const removed = Math.max(0, lines1 - lines2);
      const modified = Math.min(added, removed);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('差异摘要', 20, yPos);
      yPos += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`新增行数: ${added}`, 25, yPos);
      yPos += 7;
      doc.text(`删除行数: ${removed}`, 25, yPos);
      yPos += 7;
      doc.text(`修改行数: ${modified}`, 25, yPos);
      yPos += 15;

      setExportProgress(60);
      await new Promise((r) => setTimeout(r, 200));

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('批注列表', 20, yPos);
      yPos += 12;

      const sortedAnnotations = [...versionAnnotations].sort((a, b) => a.lineNumber - b.lineNumber);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      for (const ann of sortedAnnotations) {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const version = compareVersions.find((v) => v.id === ann.versionId);
        doc.setFont('helvetica', 'bold');
        doc.text(`[${version?.version || ''}] 行 ${ann.lineNumber} - ${ann.status}`, 25, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(ann.content, pageWidth - 50);
        doc.text(splitText, 25, yPos);
        yPos += splitText.length * 5 + 8;
      }

      setExportProgress(85);
      await new Promise((r) => setTimeout(r, 300));

      doc.save(`ContractFlow_${selectedContract.name}_审核报告.pdf`);

      setExportProgress(100);
      setExportSuccess(true);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (error) {
      console.error('导出PDF失败:', error);
    } finally {
      setIsExporting(false);
      setExportSuccess(false);
      setExportProgress(0);
    }
  }, [selectedContract, compareVersions, versionAnnotations]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Loading遮罩 */}
      {isExporting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              border: '3px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: 24,
            }}
          />
          <div style={{ fontSize: 24, fontWeight: 600, color: '#1a2332', marginBottom: 8 }}>
            {exportSuccess ? '✅ 导出成功' : `正在导出 ${exportProgress}%`}
          </div>
          {!exportSuccess && (
            <div style={{ width: 200, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${exportProgress}%`,
                  height: '100%',
                  background: exportProgress === 100 ? '#22c55e' : '#3b82f6',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 左侧边栏 */}
      <aside
        style={{
          width: isMobile ? '100%' : 240,
          height: isMobile ? 48 : '100%',
          background: '#1a2332',
          color: '#ffffff',
          flexShrink: 0,
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          overflowX: isMobile ? 'auto' : 'hidden',
          overflowY: isMobile ? 'hidden' : 'auto',
        }}
      >
        {!isMobile && (
          <div style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>ContractFlow</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>合同版本审核追踪</div>
          </div>
        )}
        <div style={{ padding: isMobile ? 0 : 12, display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 4 }}>
          {loading && <div style={{ padding: 12, color: 'rgba(255,255,255,0.5)' }}>加载中...</div>}
          {contracts.map((contract) => (
            <div
              key={contract.id}
              onClick={() => setSelectedContractId(contract.id)}
              style={{
                padding: isMobile ? '0 16px' : '12px 16px',
                height: isMobile ? 48 : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'space-between',
                borderRadius: 8,
                cursor: 'pointer',
                position: 'relative',
                whiteSpace: 'nowrap',
                borderLeft: selectedContractId === contract.id ? '3px solid #3b82f6' : '3px solid transparent',
                background:
                  selectedContractId === contract.id
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'transparent',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (selectedContractId !== contract.id) {
                  (e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1))';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedContractId !== contract.id) {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{contract.name}</span>
                {!isMobile && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {contract.latestVersion} · {formatDate(contract.lastModified)}
                  </span>
                )}
              </div>
              {isMobile && contract.latestVersion && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>
                  {contract.latestVersion}
                </span>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* 主内容区 */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#f5f7fa',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* 顶部工具栏 */}
        <div
          style={{
            padding: '16px 24px',
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a2332' }}>
              {selectedContract ? selectedContract.name : '选择合同'}
            </h1>
            {selectedContract && (
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                共 {versions.length} 个版本
                {selectedVersionIds.length > 0 && ` · 已选择 ${selectedVersionIds.length}/2 个版本进行对比`}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {compareVersions && (
              <>
                {isMobile && (
                  <button
                    onClick={() => setIsPanelOpen(true)}
                    style={{
                      padding: '8px 16px',
                      background: '#6b7280',
                      color: '#fff',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      transition: 'transform 0.2s',
                    }}
                  >
                    批注面板
                  </button>
                )}
                <button
                  onClick={handleExportPDF}
                  style={{
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: '#fff',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'transform 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#2563eb')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#3b82f6')}
                >
                  导出PDF报告
                </button>
              </>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, paddingRight: isMobile ? 24 : 340 }}>
          {!selectedContractId && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div>请从左侧选择一个合同开始</div>
              </div>
            </div>
          )}

          {selectedContractId && !compareVersions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>
                选择两个版本进行对比（点击卡片上的对比按钮）
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: 12,
                      padding: 20,
                      border: selectedVersionIds.includes(version.id)
                        ? '2px solid #3b82f6'
                        : '1px solid #e5e7eb',
                      boxShadow: selectedVersionIds.includes(version.id)
                        ? '0 4px 12px rgba(59, 130, 246, 0.15)'
                        : '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease',
                      animation: `slideUp 0.3s ease ${index * 0.05}s both`,
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2332' }}>{version.version}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                          {version.annotations.length} 条批注
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: selectedVersionIds.includes(version.id) ? '#dbeafe' : '#f3f4f6',
                          color: selectedVersionIds.includes(version.id) ? '#2563eb' : '#6b7280',
                          fontWeight: 500,
                        }}
                      >
                        {selectedVersionIds.includes(version.id)
                          ? selectedVersionIds.indexOf(version.id) === 0 ? '旧版本' : '新版本'
                          : '待选择'}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 6 }}>
                      <span style={{ color: '#9ca3af' }}>提交者：</span>{version.submitter}
                    </div>
                    <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 16 }}>
                      <span style={{ color: '#9ca3af' }}>创建时间：</span>{formatDate(version.createdAt)}
                    </div>
                    <button
                      onClick={() => handleVersionSelect(version.id)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: 8,
                        background: selectedVersionIds.includes(version.id)
                          ? '#fef2f2'
                          : '#3b82f6',
                        color: selectedVersionIds.includes(version.id)
                          ? '#dc2626'
                          : '#ffffff',
                        fontSize: 13,
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        if (!selectedVersionIds.includes(version.id)) {
                          btn.style.background = '#2563eb';
                          btn.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        if (!selectedVersionIds.includes(version.id)) {
                          btn.style.background = '#3b82f6';
                          btn.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {selectedVersionIds.includes(version.id) ? '取消选择' : '选择对比'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {compareVersions && (
            <VersionDiff
              oldVersion={compareVersions[0]}
              newVersion={compareVersions[1]}
              annotations={versionAnnotations}
              selectedLine={selectedLine}
              onLineSelect={setSelectedLine}
              expandedAnnotationId={expandedAnnotationId}
              onAnnotationExpand={setExpandedAnnotationId}
            />
          )}
        </div>
      </main>

      {/* 右侧审核面板 - 桌面端 */}
      {!isMobile && compareVersions && (
        <ReviewPanel
          annotations={versionAnnotations}
          selectedLine={selectedLine}
          expandedAnnotationId={expandedAnnotationId}
          onCreateAnnotation={handleCreateAnnotation}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onExpandAnnotation={setExpandedAnnotationId}
          isMobile={false}
          isOpen={true}
          onClose={() => {}}
        />
      )}

      {/* 移动端底部抽屉 */}
      {isMobile && isPanelOpen && compareVersions && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background: '#fff',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.3s ease',
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              background: '#d1d5db',
              borderRadius: 2,
              margin: '12px auto',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ReviewPanel
              annotations={versionAnnotations}
              selectedLine={selectedLine}
              expandedAnnotationId={expandedAnnotationId}
              onCreateAnnotation={handleCreateAnnotation}
              onUpdateAnnotation={handleUpdateAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              onExpandAnnotation={setExpandedAnnotationId}
              isMobile={true}
              isOpen={isPanelOpen}
              onClose={() => setIsPanelOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
