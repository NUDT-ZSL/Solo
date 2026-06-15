import React, { useMemo, useEffect, useState, useRef } from 'react';
import { FlowchartData } from '../types';
import { generateJsonPreview } from '../jsonExport/JsonExporter';

interface JsonPreviewProps {
  data: FlowchartData;
}

const JsonPreview: React.FC<JsonPreviewProps> = ({ data }) => {
  const [displayedJson, setDisplayedJson] = useState('');
  const [prevNodeIds, setPrevNodeIds] = useState<Set<string>>(new Set());
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const [deletingNodeIds, setDeletingNodeIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const json = generateJsonPreview(data);
      setDisplayedJson(json);

      const currentIds = new Set(data.nodes.map(n => n.id));
      const added = new Set<string>();
      const removed = new Set<string>();

      currentIds.forEach(id => {
        if (!prevNodeIds.has(id)) added.add(id);
      });
      prevNodeIds.forEach(id => {
        if (!currentIds.has(id)) removed.add(id);
      });

      if (added.size > 0) {
        setNewNodeIds(added);
        setTimeout(() => setNewNodeIds(new Set()), 500);
      }

      if (removed.size > 0) {
        setDeletingNodeIds(removed);
        setTimeout(() => setDeletingNodeIds(new Set()), 200);
      }

      setPrevNodeIds(currentIds);
    }, 0);

    return () => clearTimeout(timer);
  }, [data]);

  const syntaxHighlighted = useMemo(() => {
    return highlightedJson(displayedJson, newNodeIds, deletingNodeIds);
  }, [displayedJson, newNodeIds, deletingNodeIds]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: '12px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px',
        lineHeight: '1.6',
        color: '#cdd6f4',
        background: '#181825',
        whiteSpace: 'pre',
        position: 'relative',
      }}
    >
      {syntaxHighlighted}
    </div>
  );
};

function highlightedJson(
  json: string,
  newNodeIds: Set<string>,
  deletingNodeIds: Set<string>
): React.ReactNode[] {
  const lines = json.split('\n');
  return lines.map((line, i) => {
    let className = 'json-line';
    let style: React.CSSProperties = {};

    for (const id of newNodeIds) {
      if (line.includes(id)) {
        style = {
          ...style,
          animation: 'fadeInNode 0.5s ease-out',
          backgroundColor: 'rgba(166, 227, 161, 0.1)',
        };
      }
    }

    for (const id of deletingNodeIds) {
      if (line.includes(id)) {
        style = {
          ...style,
          animation: 'fadeOutNode 0.2s ease-out',
          backgroundColor: 'rgba(243, 139, 168, 0.2)',
        };
      }
    }

    const coloredLine = colorizeLine(line);

    return (
      <div key={i} style={style}>
        {coloredLine}
      </div>
    );
  });
}

function colorizeLine(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = line;

  const patterns: { regex: RegExp; color: string }[] = [
    { regex: /^(\s*"([^"]+)"\s*:)/, color: '#89b4fa' },
    { regex: /"([^"]*)"/, color: '#a6e3a1' },
    { regex: /\b(\d+\.?\d*)\b/, color: '#fab387' },
    { regex: /\b(true|false|null)\b/, color: '#f38ba8' },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; color: string; text: string } | null = null;

    for (const { regex, color } of patterns) {
      const match = remaining.match(regex);
      if (match && match.index !== undefined) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            color,
            text: match[0],
          };
        }
      }
    }

    if (earliestMatch && earliestMatch.index === 0) {
      parts.push(
        <span key={parts.length} style={{ color: earliestMatch.color }}>
          {earliestMatch.text}
        </span>
      );
      remaining = remaining.slice(earliestMatch.length);
    } else if (earliestMatch) {
      parts.push(<span key={parts.length}>{remaining.slice(0, earliestMatch.index)}</span>);
      parts.push(
        <span key={parts.length + 1} style={{ color: earliestMatch.color }}>
          {earliestMatch.text}
        </span>
      );
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      parts.push(<span key={parts.length}>{remaining}</span>);
      break;
    }
  }

  return parts;
}

export default JsonPreview;
