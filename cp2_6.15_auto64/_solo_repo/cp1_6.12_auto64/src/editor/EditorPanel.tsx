import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import './EditorPanel.css';

export interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
  reverseCode?: string;
  onGenerateReverse: () => void;
}

const customTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#282a36',
      height: '100%',
      fontSize: '14px',
    },
    '.cm-scroller': {
      fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: '12px 0',
      caretColor: '#50fa7b',
    },
    '.cm-line': {
      padding: '0 12px',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(99, 102, 241, 0.08)',
    },
    '.cm-gutters': {
      backgroundColor: '#21222c',
      borderRight: '1px solid #44475a',
      color: '#6272a4',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      color: '#f8f8f2',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#44475a',
      color: '#f8f8f2',
      border: 'none',
    },
  },
  { dark: true },
);

export function EditorPanel({ value, onChange, reverseCode, onGenerateReverse }: EditorPanelProps) {
  const editorHostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorHostRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newValue = update.state.doc.toString();
        onChange(newValue);
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        foldGutter(),
        history(),
        bracketMatching(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab,
        ]),
        css(),
        customTheme,
        oneDark,
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorHostRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div className="editor-panel">
      <div className="editor-header">
      <h3 className="panel-title">CSS @keyframes 编辑器</h3>
      <button
        className="generate-btn"
        onClick={onGenerateReverse}
        type="button"
      >
          生成反向动画
      </button>
      </div>
      <div className="editor-wrapper">
        <div ref={editorHostRef} className="codemirror-container" />
      </div>
      {reverseCode && (
        <div className="reverse-output">
          <h4 className="reverse-title">反向动画</h4>
          <pre className="reverse-code">{reverseCode}</pre>
        </div>
      )}
    </div>
  );
}

export default EditorPanel;
