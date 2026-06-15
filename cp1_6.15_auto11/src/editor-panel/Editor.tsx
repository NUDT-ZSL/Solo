import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import './Editor.css';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export interface EditorRef {
  getSelection: () => { start: number; end: number };
  setSelection: (start: number, end: number) => void;
  getValue: () => string;
  focus: () => void;
}

const Editor = forwardRef<EditorRef, EditorProps>(({ value, onChange }, ref) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const isInternalUpdateRef = useRef(false);
  const externalValueRef = useRef(value);

  useEffect(() => {
    externalValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!editorContainerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        isInternalUpdateRef.current = true;
        const newValue = update.state.doc.toString();
        externalValueRef.current = newValue;
        onChange(newValue);
        setTimeout(() => {
          isInternalUpdateRef.current = false;
        }, 0);
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        markdown(),
        oneDark,
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-scroller': {
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            lineHeight: '1.6',
          },
          '.cm-gutters': {
            backgroundColor: '#1a1a2e',
            color: '#6c7086',
            borderRight: '1px solid #3a3a52',
            fontWeight: '300',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'rgba(137, 180, 250, 0.1)',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(137, 180, 250, 0.05)',
          },
          '.cm-content': {
            padding: '16px',
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view || isInternalUpdateRef.current) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  useImperativeHandle(
    ref,
    () => ({
      getSelection: () => {
        const view = editorViewRef.current;
        if (!view) return { start: 0, end: 0 };
        return {
          start: view.state.selection.main.from,
          end: view.state.selection.main.to,
        };
      },
      setSelection: (start: number, end: number) => {
        const view = editorViewRef.current;
        if (!view) return;
        view.dispatch({
          selection: { anchor: start, head: end },
          scrollIntoView: true,
        });
      },
      getValue: () => {
        const view = editorViewRef.current;
        if (!view) return '';
        return view.state.doc.toString();
      },
      focus: () => {
        const view = editorViewRef.current;
        if (view) {
          view.focus();
        }
      },
    }),
    []
  );

  return (
    <div className="editor-container">
      <div className="editor-header">
        <span className="editor-title">Markdown 编辑器</span>
      </div>
      <div className="editor-body">
        <div ref={editorContainerRef} className="codemirror-wrapper" />
      </div>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
