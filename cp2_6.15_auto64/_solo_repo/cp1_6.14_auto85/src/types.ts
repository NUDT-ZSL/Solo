export interface StackFrame {
  id: string;
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  isError: boolean;
  children: StackFrame[];
  variables: Record<string, string>;
  sourceCode?: string;
  originalLineNumber?: number;
  originalColumnNumber?: number;
}

export interface ParseResult {
  callTree: StackFrame[];
  errorFrameId?: string;
  variables: Record<string, Record<string, string>>;
  sourceCode?: string;
}

export interface TreeNodeProps {
  node: StackFrame;
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  errorFrameId?: string;
  onToggle: (id: string) => void;
  onSelect: (node: StackFrame) => void;
}
