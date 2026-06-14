export type DiffLineType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffLine {
  id: string;
  type: DiffLineType;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  oldContent: string;
  newContent: string;
  charDiffs?: CharDiff[];
}

export interface CharDiff {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export type CommentTagColor = 'red' | 'blue' | 'green';

export interface CommentReply {
  id: string;
  content: string;
  author: string;
  timestamp: number;
}

export interface Comment {
  id: string;
  diffLineId: string;
  content: string;
  author: string;
  timestamp: number;
  tagColor: CommentTagColor;
  resolved: boolean;
  position: { x: number; y: number };
  replies: CommentReply[];
  expanded: boolean;
  version: 'old' | 'new' | 'both';
}

export interface DocumentContent {
  oldDoc: string;
  newDoc: string;
  oldFileName: string;
  newFileName: string;
}

export type FilterStatus = 'all' | 'unresolved' | 'resolved';
export type FilterVersion = 'all' | 'old' | 'new';
