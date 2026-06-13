import { type FontItem } from './fontData';

interface FontListProps {
  fonts: FontItem[];
  selectedFont: string;
  compareMode: boolean;
  compareFonts: string[];
  onSelectFont: (font: string) => void;
  onToggleCompareMode: () => void;
  onToggleCompareFont: (font: string) => void;
}

export default function FontList({
  fonts,
  selectedFont,
  compareMode,
  compareFonts,
  onSelectFont,
  onToggleCompareMode,
  onToggleCompareFont,
}: FontListProps) {
  return (
    <aside className="font-list-panel">
      <div className="font-list-header">
        <h2>字体列表</h2>
        <label className="compare-toggle">
          <input
            type="checkbox"
            checked={compareMode}
            onChange={onToggleCompareMode}
          />
          <span>对比模式</span>
        </label>
      </div>
      <ul className="font-list">
        {fonts.map((font) => (
          <li
            key={font.name}
            className={`font-list-item${selectedFont === font.name && !compareMode ? ' selected' : ''}${compareFonts.includes(font.name) ? ' compare-selected' : ''}`}
            onClick={() => {
              if (compareMode) {
                onToggleCompareFont(font.name);
              } else {
                onSelectFont(font.name);
              }
            }}
          >
            <span
              className="font-name-preview"
              style={{ fontFamily: `'${font.name}', ${font.type}` }}
            >
              {font.name}
            </span>
            <span className="font-type-badge">{font.type}</span>
            {compareMode && (
              <input
                type="checkbox"
                className="compare-checkbox"
                checked={compareFonts.includes(font.name)}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleCompareFont(font.name);
                }}
                disabled={
                  !compareFonts.includes(font.name) && compareFonts.length >= 4
                }
              />
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
