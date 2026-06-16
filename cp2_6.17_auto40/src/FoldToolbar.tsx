import { useEffect, useState } from "react";
import { MousePointer2, Scissors, RotateCw, Download } from "lucide-react";
import { useOrigamiStore, SPECIAL_ANGLES } from "./store";
import type { ToolMode } from "./store";

const tools: { mode: ToolMode; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { mode: "select", icon: <MousePointer2 size={18} />, label: "选择", shortcut: "V" },
  { mode: "fold", icon: <Scissors size={18} />, label: "折叠", shortcut: "F" },
  { mode: "rotate", icon: <RotateCw size={18} />, label: "旋转", shortcut: "R" },
];

function TooltipButton({
  tool,
  isActive,
  onClick,
}: {
  tool: { mode: ToolMode; icon: React.ReactNode; label: string; shortcut: string };
  isActive: boolean;
  onClick: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={onClick}
        className={`tool-btn flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 w-full ${
          isActive
            ? "bg-gray-100 text-gray-900 font-medium shadow-sm"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
        style={{
          transform: isActive ? "scale(1.02)" : "scale(1)",
          transition: "transform 0.15s ease-out",
        }}
      >
        {tool.icon}
        <span>{tool.label}</span>
      </button>
      {showTooltip && (
        <div
          className="absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          style={{ left: "calc(100% + 10px)" }}
        >
          <div className="bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded shadow-lg whitespace-nowrap relative">
            {tool.label} ({tool.shortcut})
            <div
              className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-800 rotate-45"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function FoldToolbar() {
  const {
    toolMode,
    setToolMode,
    rotation,
    setRotation,
    setRotationWithSnap,
    setIsRotating,
    offsetX,
    setOffsetX,
    offsetY,
    setOffsetY,
    setShowExportModal,
  } = useOrigamiStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT")) {
        return;
      }
      const key = e.key.toUpperCase();
      if (key === "V") setToolMode("select");
      else if (key === "F") setToolMode("fold");
      else if (key === "R") setToolMode("rotate");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setToolMode]);

  return (
    <div className="toolbar-card flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-600 tracking-wide uppercase">工具</h2>

      <div className="flex flex-col gap-1">
        {tools.map((t) => (
          <TooltipButton
            key={t.mode}
            tool={t}
            isActive={toolMode === t.mode}
            onClick={() => setToolMode(t.mode)}
          />
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3">
        <label className="text-xs text-gray-500 block mb-1">旋转角度: {Math.round(rotation)}°</label>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={rotation}
          onChange={(e) => {
            const value = Number(e.target.value);
            setRotationWithSnap(value);
            setIsRotating(true);
          }}
          onMouseUp={() => setIsRotating(false)}
          onTouchEnd={() => setIsRotating(false)}
          className="slider-input w-full"
          style={{ transition: "transform 0.15s ease-out" }}
          onMouseDown={(e) => {
            (e.target as HTMLElement).style.transform = "scale(1.02)";
          }}
          onMouseUpCapture={(e) => {
            (e.target as HTMLElement).style.transform = "scale(1)";
          }}
        />
        <div className="mt-2 grid grid-cols-4 gap-1">
          {SPECIAL_ANGLES.map((angle) => (
            <button
              key={angle}
              onClick={() => {
                setRotation(angle);
                setIsRotating(true);
                setTimeout(() => setIsRotating(false), 150);
              }}
              className={`px-1 py-1 text-xs rounded transition-all duration-150 ${
                Math.abs(rotation - angle) < 0.5
                  ? "bg-teal-500 text-white font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={{
                transform: Math.abs(rotation - angle) < 0.5 ? "scale(1.05)" : "scale(1)",
                transition: "all 0.15s ease-out",
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  Math.abs(rotation - angle) < 0.5 ? "scale(1.05)" : "scale(1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  Math.abs(rotation - angle) < 0.5 ? "scale(1.05)" : "scale(1)";
              }}
            >
              {angle}°
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <label className="text-xs text-gray-500 block mb-1">水平偏移: {offsetX}px</label>
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={offsetX}
          onChange={(e) => setOffsetX(Number(e.target.value))}
          className="slider-input w-full"
          style={{ transition: "transform 0.15s ease-out" }}
          onMouseDown={(e) => {
            (e.target as HTMLElement).style.transform = "scale(1.02)";
          }}
          onMouseUpCapture={(e) => {
            (e.target as HTMLElement).style.transform = "scale(1)";
          }}
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">垂直偏移: {offsetY}px</label>
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={offsetY}
          onChange={(e) => setOffsetY(Number(e.target.value))}
          className="slider-input w-full"
          style={{ transition: "transform 0.15s ease-out" }}
          onMouseDown={(e) => {
            (e.target as HTMLElement).style.transform = "scale(1.02)";
          }}
          onMouseUpCapture={(e) => {
            (e.target as HTMLElement).style.transform = "scale(1)";
          }}
        />
      </div>

      <div className="mt-auto pt-3 border-t border-gray-100">
        <button
          onClick={() => setShowExportModal(true)}
          className="export-btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white"
          style={{
            background: "#1abc9c",
            borderRadius: "6px",
            transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
        >
          <Download size={16} />
          导出PDF
        </button>
      </div>
    </div>
  );
}
