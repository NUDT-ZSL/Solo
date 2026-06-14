import { EditorState, StateField, ChangeSpec } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { v4 as uuidv4 } from 'uuid';

export interface DocChange {
  id: string;
  from: number;
  to: number;
  insert: string;
  userId: string;
  timestamp: number;
}

export interface CursorPosition {
  line: number;
  column: number;
  pos: number;
}

export interface UserCursor {
  userId: string;
  userName: string;
  position: CursorPosition;
  color: string;
}

export type ContentChangeListener = (content: string) => void;
export type LocalChangeListener = (change: DocChange) => void;
export type PositionChangeListener = (cursor: UserCursor) => void;
export type ScrollListener = (scrollTop: number, scrollLeft: number) => void;

export class EditorCore {
  private view: EditorView | null = null;
  private contentChangeListeners: ContentChangeListener[] = [];
  private localChangeListeners: LocalChangeListener[] = [];
  private positionChangeListeners: PositionChangeListener[] = [];
  private scrollListeners: ScrollListener[] = [];
  private userId: string;
  private userName: string;
  private userColor: string;
  private isApplyingRemoteUpdate = false;
  private ignoreNextSelectionChange = false;

  constructor(userId: string, userName: string) {
    this.userId = userId;
    this.userName = userName;
    this.userColor = this.generateRandomColor();
  }

  private generateRandomColor(): string {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`;
  }

  getUserColor(): string {
    return this.userColor;
  }

  getUserId(): string {
    return this.userId;
  }

  getUserName(): string {
    return this.userName;
  }

  init(container: HTMLElement, initialContent: string = ''): void {
    const contentChangeHandler = StateField.define<boolean>({
      create: () => false,
      update: (_value, tr) => {
        if (this.isApplyingRemoteUpdate) return false;
        if (tr.docChanged && !this.isApplyingRemoteUpdate) {
          tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
            const change: DocChange = {
              id: uuidv4(),
              from: fromA,
              to: toA,
              insert: inserted.toString(),
              userId: this.userId,
              timestamp: Date.now()
            };
            this.notifyLocalChangeListeners(change);
          });
          const content = tr.state.doc.toString();
          this.notifyContentChangeListeners(content);
        }
        return tr.docChanged;
      }
    });

    const positionHandler = EditorView.updateListener.of((update) => {
      if (update.selectionSet && !this.ignoreNextSelectionChange && !this.isApplyingRemoteUpdate) {
        const pos = update.state.selection.main.head;
        const lineInfo = update.state.doc.lineAt(pos);
        const userCursor: UserCursor = {
          userId: this.userId,
          userName: this.userName,
          position: {
            line: lineInfo.number,
            column: pos - lineInfo.from + 1,
            pos
          },
          color: this.userColor
        };
        this.notifyPositionChangeListeners(userCursor);
      }
      this.ignoreNextSelectionChange = false;

      if (update.viewportChanged) {
        const scrollDom = update.view.scrollDOM;
        this.notifyScrollListeners(scrollDom.scrollTop, scrollDom.scrollLeft);
      }
    });

    const darkTheme = EditorView.theme({
      '&': {
        backgroundColor: '#1e1e2e',
        color: '#d4d4d4',
        height: '100%',
        fontSize: '14px'
      },
      '.cm-content': {
        caretColor: '#ffffff',
        padding: '20px 0'
      },
      '.cm-cursor': {
        borderLeftColor: '#ffffff',
        borderLeftWidth: '2px'
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: '#264f78 !important'
      },
      '.cm-activeLine': {
        backgroundColor: '#2a2a3e'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#2a2a3e'
      },
      '.cm-gutters': {
        backgroundColor: '#1e1e2e',
        color: '#6e7681',
        border: 'none'
      },
      '.cm-lineNumbers .cm-gutterElement': {
        minWidth: '40px'
      },
      '.cm-foldPlaceholder': {
        backgroundColor: '#3a3a4e',
        border: 'none',
        color: '#888'
      },
      '.cm-tooltip': {
        backgroundColor: '#2a2a3e',
        border: '1px solid #3a3a4e'
      },
      '.cm-tooltip-autocomplete': {
        '& > ul > li[aria-selected]': {
          backgroundColor: '#264f78',
          color: '#d4d4d4'
        }
      }
    }, { dark: true });

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        markdown(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap
        ]),
        contentChangeHandler,
        positionHandler,
        darkTheme,
        EditorView.lineWrapping
      ]
    });

    this.view = new EditorView({
      state,
      parent: container
    });

    const scrollContainer = this.view.scrollDOM;
    scrollContainer.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  private handleScroll = () => {
    if (!this.view) return;
    const scrollDom = this.view.scrollDOM;
    this.notifyScrollListeners(scrollDom.scrollTop, scrollDom.scrollLeft);
  };

  destroy(): void {
    const scrollContainer = this.view?.scrollDOM;
    if (scrollContainer) {
      scrollContainer.removeEventListener('scroll', this.handleScroll);
    }
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }

  getContent(): string {
    if (!this.view) return '';
    return this.view.state.doc.toString();
  }

  getCursorPosition(): CursorPosition | null {
    if (!this.view) return null;
    const pos = this.view.state.selection.main.head;
    const lineInfo = this.view.state.doc.lineAt(pos);
    return {
      line: lineInfo.number,
      column: pos - lineInfo.from + 1,
      pos
    };
  }

  posToLineColumn(pos: number): CursorPosition | null {
    if (!this.view) return null;
    if (pos < 0 || pos > this.view.state.doc.length) return null;
    const lineInfo = this.view.state.doc.lineAt(pos);
    return {
      line: lineInfo.number,
      column: pos - lineInfo.from + 1,
      pos
    };
  }

  lineColumnToPos(line: number, column: number): number | null {
    if (!this.view) return null;
    try {
      const lineInfo = this.view.state.doc.line(line);
      const pos = Math.min(lineInfo.from + column - 1, lineInfo.to);
      return pos;
    } catch {
      return null;
    }
  }

  updateContent(change: DocChange): void {
    if (!this.view) return;
    this.isApplyingRemoteUpdate = true;
    this.ignoreNextSelectionChange = true;

    const changeSpec: ChangeSpec = {
      from: change.from,
      to: change.to,
      insert: change.insert
    };

    this.view.dispatch({
      changes: changeSpec
    });

    this.isApplyingRemoteUpdate = false;
    const content = this.view.state.doc.toString();
    this.notifyContentChangeListeners(content);
  }

  setFullContent(content: string): void {
    if (!this.view) return;
    this.isApplyingRemoteUpdate = true;
    this.ignoreNextSelectionChange = true;
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      }
    });
    this.isApplyingRemoteUpdate = false;
    const newContent = this.view.state.doc.toString();
    this.notifyContentChangeListeners(newContent);
  }

  dispatchChanges(spec: ChangeSpec | ChangeSpec[]): void {
    if (!this.view) return;
    this.view.dispatch({
      changes: spec
    });
    this.view.focus();
  }

  insertMarkdownSyntax(prefix: string, suffix: string = prefix): void {
    if (!this.view) return;
    const { from, to } = this.view.state.selection.main;
    const selected = this.view.state.sliceDoc(from, to);

    if (selected && selected.length > 0) {
      this.view.dispatch({
        changes: {
          from,
          to,
          insert: prefix + selected + suffix
        },
        selection: {
          anchor: from + prefix.length,
          head: to + prefix.length
        }
      });
    } else {
      const insertText = prefix + suffix;
      this.view.dispatch({
        changes: {
          from,
          to,
          insert: insertText
        },
        selection: {
          anchor: from + prefix.length,
          head: from + prefix.length
        }
      });
    }
    this.view.focus();
  }

  insertMarkdownPrefix(prefix: string): void {
    if (!this.view) return;
    const state = this.view.state;
    const { from } = state.selection.main;
    const line = state.doc.lineAt(from);
    const lineStart = line.from;

    this.view.dispatch({
      changes: {
        from: lineStart,
        to: lineStart,
        insert: prefix
      },
      selection: {
        anchor: from + prefix.length,
        head: from + prefix.length
      }
    });
    this.view.focus();
  }

  getScrollContainer(): HTMLElement | null {
    if (!this.view) return null;
    return this.view.scrollDOM;
  }

  getEditorView(): EditorView | null {
    return this.view;
  }

  coordsAtLineColumn(line: number, column: number): { top: number; left: number } | null {
    if (!this.view) return null;
    const pos = this.lineColumnToPos(line, column);
    if (pos === null) return null;
    const coords = this.view.coordsAtPos(pos);
    if (!coords) return null;
    const scrollRect = this.view.scrollDOM.getBoundingClientRect();
    return {
      top: coords.top - scrollRect.top + this.view.scrollDOM.scrollTop,
      left: coords.left - scrollRect.left + this.view.scrollDOM.scrollLeft
    };
  }

  coordsAtPos(pos: number): { top: number; left: number } | null {
    if (!this.view) return null;
    const coords = this.view.coordsAtPos(pos);
    if (!coords) return null;
    const scrollRect = this.view.scrollDOM.getBoundingClientRect();
    return {
      top: coords.top - scrollRect.top + this.view.scrollDOM.scrollTop,
      left: coords.left - scrollRect.left + this.view.scrollDOM.scrollLeft
    };
  }

  onContentChange(listener: ContentChangeListener): () => void {
    this.contentChangeListeners.push(listener);
    const currentContent = this.getContent();
    listener(currentContent);
    return () => {
      this.contentChangeListeners = this.contentChangeListeners.filter(l => l !== listener);
    };
  }

  onLocalChange(listener: LocalChangeListener): () => void {
    this.localChangeListeners.push(listener);
    return () => {
      this.localChangeListeners = this.localChangeListeners.filter(l => l !== listener);
    };
  }

  onPositionChange(listener: PositionChangeListener): () => void {
    this.positionChangeListeners.push(listener);
    return () => {
      this.positionChangeListeners = this.positionChangeListeners.filter(l => l !== listener);
    };
  }

  onScroll(listener: ScrollListener): () => void {
    this.scrollListeners.push(listener);
    return () => {
      this.scrollListeners = this.scrollListeners.filter(l => l !== listener);
    };
  }

  private notifyContentChangeListeners(content: string): void {
    this.contentChangeListeners.forEach(listener => listener(content));
  }

  private notifyLocalChangeListeners(change: DocChange): void {
    this.localChangeListeners.forEach(listener => listener(change));
  }

  private notifyPositionChangeListeners(cursor: UserCursor): void {
    this.positionChangeListeners.forEach(listener => listener(cursor));
  }

  private notifyScrollListeners(scrollTop: number, scrollLeft: number): void {
    this.scrollListeners.forEach(listener => listener(scrollTop, scrollLeft));
  }
}
