import { useState } from "react";
import { useOrigamiStore } from "./store";
import { exportToPDF } from "./PDFExporter";
import type { ExportOptions } from "./PDFExporter";
import { X } from "lucide-react";
import PaperGrid from "./PaperGrid";
import FoldToolbar from "./FoldToolbar";
import HistoryPanel from "./HistoryPanel";

function ExportModal() {
  const { setShowExportModal, paperState } = useOrigamiStore();
  const [paperSize, setPaperSize] = useState<"A4" | "Letter" | "Custom">("A4");
  const [customWidth, setCustomWidth] = useState(210);
  const [customHeight, setCustomHeight] = useState(297);

  const handleExport = () => {
    const options: ExportOptions = {
      paperSize,
      customWidth,
      customHeight,
    };
    exportToPDF(paperState, options);
    setShowExportModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowExportModal(false)}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">导出PDF设置</h3>
          <button
            onClick={() => setShowExportModal(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">纸张尺寸</label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as "A4" | "Letter" | "Custom")}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (215.9 × 279.4 mm)</option>
              <option value="Custom">自定义</option>
            </select>
          </div>

          {paperSize === "Custom" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">宽度 (mm)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">高度 (mm)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            className="mt-2 w-full py-2.5 rounded-md text-sm font-medium text-white"
            style={{ background: "#1abc9c", borderRadius: "6px" }}
          >
            生成PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { showExportModal } = useOrigamiStore();

  return (
    <div className="app-container">
      <div className="desktop-layout">
        <div className="toolbar-container">
          <FoldToolbar />
        </div>
        <div className="canvas-container">
          <PaperGrid />
        </div>
        <div className="panel-container">
          <HistoryPanel />
        </div>
      </div>
      {showExportModal && <ExportModal />}
    </div>
  );
}
