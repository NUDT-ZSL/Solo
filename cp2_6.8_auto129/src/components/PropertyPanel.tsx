import type {
  Block,
  LayoutConfig,
  DisplayValue,
  PositionValue,
  FlexDirectionValue,
  JustifyContentValue,
  AlignItemsValue,
} from '../types';

interface PropertyPanelProps {
  layoutConfig: LayoutConfig;
  selectedBlock: Block | null;
  onLayoutChange: (updates: Partial<LayoutConfig>) => void;
  onBlockChange: (updates: Partial<Block>) => void;
}

const displayOptions: DisplayValue[] = ['flex', 'grid', 'block', 'inline-block'];
const positionOptions: PositionValue[] = ['static', 'relative', 'absolute', 'fixed'];
const flexDirectionOptions: FlexDirectionValue[] = ['row', 'column', 'row-reverse', 'column-reverse'];
const justifyContentOptions: JustifyContentValue[] = [
  'flex-start',
  'center',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
];
const alignItemsOptions: AlignItemsValue[] = ['stretch', 'center', 'flex-start', 'flex-end', 'baseline'];

function Label({ children }: { children: React.ReactNode }) {
  return <label className="panel-label">{children}</label>;
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      className="panel-select"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      className="panel-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      className="panel-input"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export default function PropertyPanel({
  layoutConfig,
  selectedBlock,
  onLayoutChange,
  onBlockChange,
}: PropertyPanelProps) {
  return (
    <aside className="property-panel">
      <div className="panel-section">
        <h3 className="panel-title">全局布局属性</h3>

        <div className="panel-field">
          <Label>display</Label>
          <Select
            value={layoutConfig.display}
            options={displayOptions}
            onChange={(v) => onLayoutChange({ display: v })}
          />
        </div>

        <div className="panel-field">
          <Label>position</Label>
          <Select
            value={layoutConfig.position}
            options={positionOptions}
            onChange={(v) => onLayoutChange({ position: v })}
          />
        </div>

        {layoutConfig.display === 'flex' && (
          <>
            <div className="panel-field">
              <Label>flex-direction</Label>
              <Select
                value={layoutConfig.flexDirection ?? 'row'}
                options={flexDirectionOptions}
                onChange={(v) => onLayoutChange({ flexDirection: v })}
              />
            </div>
            <div className="panel-field">
              <Label>justify-content</Label>
              <Select
                value={layoutConfig.justifyContent ?? 'center'}
                options={justifyContentOptions}
                onChange={(v) => onLayoutChange({ justifyContent: v })}
              />
            </div>
            <div className="panel-field">
              <Label>align-items</Label>
              <Select
                value={layoutConfig.alignItems ?? 'stretch'}
                options={alignItemsOptions}
                onChange={(v) => onLayoutChange({ alignItems: v })}
              />
            </div>
          </>
        )}

        {layoutConfig.display === 'grid' && (
          <>
            <div className="panel-field">
              <Label>grid-template-columns</Label>
              <TextInput
                value={layoutConfig.gridTemplateColumns ?? ''}
                onChange={(v) => onLayoutChange({ gridTemplateColumns: v })}
                placeholder="repeat(3, 1fr)"
              />
            </div>
            <div className="panel-field">
              <Label>grid-template-rows</Label>
              <TextInput
                value={layoutConfig.gridTemplateRows ?? ''}
                onChange={(v) => onLayoutChange({ gridTemplateRows: v })}
                placeholder="repeat(2, 1fr)"
              />
            </div>
          </>
        )}
      </div>

      {selectedBlock && (
        <div className="panel-section">
          <h3 className="panel-title">方块属性</h3>

          <div className="panel-field">
            <Label>width (px)</Label>
            <NumberInput
              value={selectedBlock.width}
              onChange={(v) => onBlockChange({ width: v })}
              min={20}
              max={600}
            />
          </div>

          <div className="panel-field">
            <Label>height (px)</Label>
            <NumberInput
              value={selectedBlock.height}
              onChange={(v) => onBlockChange({ height: v })}
              min={20}
              max={600}
            />
          </div>

          <div className="panel-field">
            <Label>background-color</Label>
            <input
              type="color"
              className="panel-color"
              value={selectedBlock.backgroundColor}
              onChange={(e) => onBlockChange({ backgroundColor: e.target.value })}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
