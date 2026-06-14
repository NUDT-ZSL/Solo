import { EditorState, StateField } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { v4 as uuidv4 } from 'uuid';

export interface Change {
  id: string;
  from: number;
  to: number;
  insert: string;
  userId: string;
  timestamp: number;
}

export interface Position {
  userId: string;
  userName: string;
  pos: number;
  color: string;
}

type ChangeListener = (change: Change) => void;
type ContentListener = (content: string) => void;
type PositionListener = (position: Position) => void;

export class EditorCore {
  private view: EditorView | null = null;
  private changeListeners: ChangeListener[] = [];
  private contentListeners: ContentListener[] = [];
  private positionListeners: PositionListener[] = [];
  private userId: string;
  private userName: string;
  private userColor: string;
  private isApplyingRemoteChange = false;
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

    const changeHandler = StateField.define<boolean>({
      create: () => false,
      update: (_value, tr) => {
        if (this.isApplyingRemoteChange) return false;
        if (tr.docChanged && !this.isApplyingRemoteChange) {
          tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
            const change: Change = {
              id: uuidv4(),
              from: fromA,
              to: toA,
              insert: inserted.toString(),
              userId: this.userId,
              timestamp: Date.now()
            };
            this.notifyChangeListeners(change);
          });
          const content = tr.state.doc.toString();
          this.notifyContentListeners(content);
        }
        return tr.docChanged;
      }
    });

    const positionHandler = EditorView.updateListener.of((update) => {
      if (update.selectionSet && !this.ignoreNextSelectionChange && !this.isApplyingRemoteChange) {
        const pos = update.state.selection.main.head;
        const position: Position = {
          userId: this.userId,
          userName: this.userName,
          pos,
          color: this.userColor
        };
        this.notifyPositionListeners(position);
      }
      this.ignoreNextSelectionChange = false;
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
        changeHandler,
        positionHandler,
        darkTheme,
        EditorView.lineWrapping
      ]
    });

    this.view = new EditorView({
      state,
      parent: container
    });
  }

  destroy(): void {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }

  getContent(): string {
    if (!this.view) return '';
    return this.view.state.doc.toString();
  }

  setContent(content: string): void {
    if (!this.view) return;
    this.isApplyingRemoteChange = true;
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      }
    });
    this.isApplyingRemoteChange = false;
  }

  applyRemoteChange(change: Change): void {
    if (!this.view) return;
    this.isApplyingRemoteChange = true;
    this.ignoreNextSelectionChange = true;
    
    this.view.dispatch({
      changes: {
        from: change.from,
        to: change.to,
        insert: change.insert
      }
    });
    
    this.isApplyingRemoteChange = false;
    const content = this.view.state.doc.toString();
    this.notifyContentListeners(content);
  }

  insertAtCursor(text: string, wrapSelection: boolean = false): void {
    if (!this.view) return;
    
    const { from, to } = this.view.state.selection.main;
    const selected = this.view.state.sliceDoc(from, to);
    
    if (wrapSelection && selected) {
      const wrapped = text + selected + text;
      this.view.dispatch({
        changes: { from, to, insert: wrapped },
        selection: { anchor: from + text.length, head: to + text.length }
      });
    } else {
      this.view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length, head: from + text.length }
      });
    }
    
    this.view.focus();
  }

  getScrollContainer(): HTMLElement | null {
    if (!this.view) return null;
    return this.view.scrollDOM;
  }

  getEditorView(): EditorView | null {
    return this.view;
  }

  posToCoords(pos: number): { top: number; left: number } | null {
    if (!this.view) return null;
    const coords = this.view.coordsAtPos(pos);
    if (!coords) return null;
    const scrollRect = this.view.scrollDOM.getBoundingClientRect();
    return {
      top: coords.top - scrollRect.top + this.view.scrollDOM.scrollTop,
      left: coords.left - scrollRect.left + this.view.scrollDOM.scrollLeft
    };
  }

  onContentChange(listener: ContentListener): () => void {
    this.contentListeners.push(listener);
    return () => {
      this.contentListeners = this.contentListeners.filter(l => l !== listener);
    };
  }

  onLocalChange(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  onPositionChange(listener: PositionListener): () => void {
    this.positionListeners.push(listener);
    return () => {
      this.positionListeners = this.positionListeners.filter(l => l !== listener);
    };
  }

  private notifyChangeListeners(change: Change): void {
    this.changeListeners.forEach(listener => listener(change));
  }

  private notifyContentListeners(content: string): void {
    this.contentListeners.forEach(listener => listener(content));
  }

  private notifyPositionListeners(position: Position): void {
    this.positionListeners.forEach(listener => listener(position));
  }
}
