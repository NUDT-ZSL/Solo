interface Props {
  onGenerate: () => void;
  onClear: () => void;
  isGenerating: boolean;
  ratingsCount: number;
}

export default function Toolbar({ onGenerate, onClear, isGenerating, ratingsCount }: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-info">
        <span className="data-count">
          数据条数: <strong>{ratingsCount}</strong>
        </span>
      </div>
      <div className="toolbar-actions">
        <button
          className="primary-btn"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? '生成中...' : '一键生成测试数据'}
        </button>
        <button
          className="danger-btn"
          onClick={onClear}
          disabled={isGenerating || ratingsCount === 0}
        >
          清空数据
        </button>
      </div>
    </div>
  );
}
