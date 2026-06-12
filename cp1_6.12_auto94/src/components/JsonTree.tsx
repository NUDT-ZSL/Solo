import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

interface JsonTreeProps {
  data: unknown;
  expanded?: boolean;
}

function getObjectLength(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length;
  return 0;
}

function isExpandable(value: unknown): boolean {
  return (typeof value === 'object' && value !== null);
}

function getValueColor(value: unknown): string {
  if (value === null) return '#888';
  if (typeof value === 'string') return '#6BA8E8';
  if (typeof value === 'number') return '#F0B429';
  if (typeof value === 'boolean') return '#E14B6C';
  return '#E0E0E0';
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

interface JsonNodeProps {
  name: string;
  value: unknown;
  isLast?: boolean;
  defaultExpanded?: boolean;
  depth: number;
}

function JsonNode({ name, value, isLast = false, defaultExpanded = false, depth }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const expandable = isExpandable(value);
  const isArray = Array.isArray(value);
  const length = getObjectLength(value);
  const valueColor = getValueColor(value);
  const comma = isLast ? '' : ',';

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const renderEntries = () => {
    if (Array.isArray(value)) {
      return value.map((item, index) => (
        <JsonNode
          key={index}
          name={String(index)}
          value={item}
          isLast={index === value.length - 1}
          defaultExpanded={false}
          depth={depth + 1}
        />
      ));
    }
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value);
      return entries.map(([key, val], index) => (
        <JsonNode
          key={key}
          name={key}
          value={val}
          isLast={index === entries.length - 1}
          defaultExpanded={false}
          depth={depth + 1}
        />
      ));
    }
    return null;
  };

  return (
    <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
      <div className="flex items-start">
        <div
          className="flex items-center cursor-pointer select-none"
          onClick={expandable ? toggle : undefined}
          style={{ minWidth: 16 }}
        >
          {expandable ? (
            expanded ? (
              <ChevronDown size={14} color="#888" />
            ) : (
              <ChevronRight size={14} color="#888" />
            )
          ) : (
            <span style={{ width: 14, display: 'inline-block' }} />
          )}
        </div>
        <div className="flex flex-wrap">
          {name !== '' && (
            <span style={{ color: '#E0E0E0', fontFamily: 'monospace', fontSize: 12 }}>
              {isArray ? '' : `"${name}"`}
              {isArray ? '' : ': '}
            </span>
          )}
          {expandable ? (
            <>
              <span style={{ color: '#E0E0E0', fontFamily: 'monospace', fontSize: 12 }}>
                {isArray ? '[' : '{'}
              </span>
              {!expanded && (
                <>
                  <span style={{ color: '#888', fontFamily: 'monospace', fontSize: 12, margin: '0 4px' }}>
                    {length} {length === 1 ? (isArray ? 'item' : 'key') : isArray ? 'items' : 'keys'}
                  </span>
                  <span style={{ color: '#E0E0E0', fontFamily: 'monospace', fontSize: 12 }}>
                    {isArray ? ']' : '}'}
                  </span>
                </>
              )}
              <span style={{ color: '#E0E0E0', fontFamily: 'monospace', fontSize: 12 }}>{comma}</span>
            </>
          ) : (
            <span style={{ color: valueColor, fontFamily: 'monospace', fontSize: 12 }}>
              {formatValue(value)}{comma}
            </span>
          )}
        </div>
      </div>
      {expandable && expanded && (
        <div>
          {renderEntries()}
          <div style={{ paddingLeft: 16 }}>
            <span style={{ color: '#E0E0E0', fontFamily: 'monospace', fontSize: 12 }}>
              {isArray ? ']' : '}'}{comma}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JsonTree({ data, expanded: defaultExpanded = true }: JsonTreeProps) {
  const [panelExpanded, setPanelExpanded] = useState(defaultExpanded);

  const handleExport = useCallback(() => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'segment-result.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  const togglePanel = useCallback(() => {
    setPanelExpanded((prev) => !prev);
  }, []);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: '#2A2A3E' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={togglePanel}
      >
        <span className="text-white font-medium text-sm">JSON 结构树</span>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-white hover:bg-white/10 transition-colors"
            style={{ backgroundColor: '#4A90D9' }}
            onClick={(e) => {
              e.stopPropagation();
              handleExport();
            }}
          >
            <Download size={14} />
            导出 JSON
          </button>
          {panelExpanded ? (
            <ChevronDown size={18} color="#E0E0E0" />
          ) : (
            <ChevronRight size={18} color="#E0E0E0" />
          )}
        </div>
      </div>
      <div
        style={{
          maxHeight: panelExpanded ? '2000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 300ms ease-in-out',
        }}
      >
        <div
          className="p-4"
          style={{ backgroundColor: '#1A1A2A' }}
        >
          <JsonNode
            name=""
            value={data}
            isLast={true}
            defaultExpanded={true}
            depth={0}
          />
        </div>
      </div>
    </div>
  );
}
