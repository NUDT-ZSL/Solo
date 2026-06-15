import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Download, Loader2 } from 'lucide-react';

type ExportFormat = 'epub' | 'pdf';

export default function ExportButton() {
  const {
    text,
    selectedTemplate,
    paragraphSpacing,
    customFontSize,
    pageMargin,
    exportProgress,
    isExporting,
    setExportProgress,
    setIsExporting,
  } = useStore();

  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (!text.trim()) {
      alert('请先输入或粘贴小说文本');
      return;
    }

    if (!selectedTemplate) {
      alert('请选择一个排版模板');
      return;
    }

    setActiveFormat(format);
    setIsExporting(true);
    setExportProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setExportProgress((prev: number) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: text,
          template: {
            ...selectedTemplate,
            fontSize: `${customFontSize}px`,
            paragraphSpacing,
            pageMargin,
          },
          title: '未命名小说',
        }),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `小说.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportProgress(100);

      setTimeout(() => {
        clearInterval(progressInterval);
        setIsExporting(false);
        setExportProgress(0);
        setActiveFormat(null);
      }, 500);
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出失败，请稍后重试');
      setIsExporting(false);
      setExportProgress(0);
      setActiveFormat(null);
    }
  };

  const progressColor = exportProgress < 50 ? '#f97316' : '#22c55e';

  return (
    <div className="p-4 bg-[#fff8e1] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
        <Download size={20} />
        导出文件
      </h3>

      {isExporting && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-amber-700">
              正在导出{activeFormat?.toUpperCase()}...
            </span>
            <span style={{ color: progressColor }} className="font-semibold">
              {exportProgress}%
            </span>
          </div>
          <div className="w-full h-3 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${exportProgress}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleExport('epub')}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-600 text-white font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting && activeFormat === 'epub' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          EPUB
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-700 text-white font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting && activeFormat === 'pdf' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          PDF
        </button>
      </div>

      <p className="mt-3 text-xs text-amber-600 text-center">
        EPUB适合Kindle阅读 · PDF适合印刷
      </p>
    </div>
  );
}
