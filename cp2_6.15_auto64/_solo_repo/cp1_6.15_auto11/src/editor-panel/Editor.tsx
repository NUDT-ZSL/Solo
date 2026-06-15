import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import './Editor.css';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  visible?: boolean;
}

export interface EditorRef {
  getSelection: () => { start: number; end: number };
  setSelection: (start: number, end: number) => void;
  getValue: () => string;
  focus: () => void;
}

const STORAGE_KEY_START = 'markdown-editor-selection-start';
const STORAGE_KEY_END = 'markdown-editor-selection-end';

const Editor = forwardRef<EditorRef, EditorProps>(({ value, onChange, visible = true }, ref) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const isInternalUpdateRef = useRef(false);
  const externalValueRef = useRef(value);
  const savedSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const lastVisibleRef = useRef(visible);
  const wasFocusedRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    externalValueRef.current = value;
  }, [value]);

  const saveSelection = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return;
    try {
      const main = view.state.selection.main;
      savedSelectionRef.current = { start: main.from, end: main.to };
      try {
        sessionStorage.setItem(STORAGE_KEY_START, String(main.from));
        sessionStorage.setItem(STORAGE_KEY_END, String(main.to));
      } catch {
      }
    } catch {
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return;

    let start = savedSelectionRef.current.start;
    let end = savedSelectionRef.current.end;

    try {
      const storedStart = sessionStorage.getItem(STORAGE_KEY_START);
      const storedEnd = sessionStorage.getItem(STORAGE_KEY_END);
      if (storedStart !== null) {
        const parsedStart = parseInt(storedStart, 10);
        const parsedEnd = storedEnd !== null ? parseInt(storedEnd, 10) : parsedStart;
        if (!isNaN(parsedStart)) {
          start = parsedStart;
          end = isNaN(parsedEnd) ? parsedStart : parsedEnd;
        }
      }
    } catch {
    }

    const docLength = view.state.doc.length;
    start = Math.min(Math.max(0, start), docLength);
    end = Math.min(Math.max(0, end), docLength);

    try {
      view.dispatch({
        selection: { anchor: start, head: end },
        scrollIntoView: true,
      });

      if (wasFocusedRef.current) {
        view.focus();
      }
    } catch (restoreErr) {
      console.warn('Failed to restore selection:', restoreErr);
    }
  }, []);

  useEffect(() => {
    if (!editorContainerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
      if (!update.selectionSet) {
        saveSelection();
      }
      isInternalUpdateRef.current = true;
      const newValue = update.state.doc.toString();
      externalValueRef.current = newValue;
      onChange(newValue);
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 0);
    }
    if (update.selectionSet) {
      saveSelection();
    }
    });

    const focusListener = EditorView.domEventHandlers({
      focus() {
        wasFocusedRef.current = true;
        saveSelection();
      },
      blur() {
        wasFocusedRef.current = false;
        saveSelection();
      },
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
        focusListener,
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

    restoreSelection();

    const container = editorContainerRef.current;
    try {
      observerRef.current = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes') {
            if (
              mutation.attributeName === 'style' ||
              mutation.attributeName === 'class'
            ) {
              if (container) {
                const display = window.getComputedStyle(container).display;
                if (display !== 'none') {
                  if (view.requestMeasure) {
                    view.requestMeasure();
                  }
                }
              }
            }
          }
        }
      });
      observerRef.current.observe(container, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    } catch (obsErr) {
      console.warn('Failed to setup MutationObserver:', obsErr);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      saveSelection();
      view.destroy();
      editorViewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const wasVisible = lastVisibleRef.current;
    lastVisibleRef.current = visible;

    if (!wasVisible && visible) {
      const view = editorViewRef.current;
      if (view) {
        const timer = setTimeout(() => {
          try {
            if (view.requestMeasure) {
              view.requestMeasure();
            }
          } catch {
          }
          restoreSelection();
        }, 50);
        return () => clearTimeout(timer);
      }
    } else if (!visible && wasVisible) {
      saveSelection();
    }
  }, [visible, restoreSelection, saveSelection]);

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
      if (!view) return savedSelectionRef.current;
      try {
        const main = view.state.selection.main;
        return { start: main.from, end: main.to };
      } catch {
        return savedSelectionRef.current;
      }
    },
    setSelection: (start: number, end: number) => {
      savedSelectionRef.current = { start, end };
      const view = editorViewRef.current;
      if (!view) return;
      try {
        const docLength = view.state.doc.length;
        const safeStart = Math.min(Math.max(0, start), docLength);
        const safeEnd = Math.min(Math.max(0, end), docLength);
        view.dispatch({
          selection: { anchor: safeStart, head: safeEnd },
          scrollIntoView: true,
        });
        try {
          sessionStorage.setItem(STORAGE_KEY_START, String(safeStart));
          sessionStorage.setItem(STORAGE_KEY_END, String(safeEnd));
        } catch {
        }
      } catch (setErr) {
        console.warn('Failed to set selection:', setErr);
      }
    },
    getValue: () => {
      const view = editorViewRef.current;
      if (!view) return externalValueRef.current;
      try {
        return view.state.doc.toString();
      } catch {
        return externalValueRef.current;
      }
    },
    focus: () => {
      wasFocusedRef.current = true;
      const view = editorViewRef.current;
      if (view) {
        try {
          view.focus();
        } catch (focusErr) {
          console.warn('Failed to focus editor:', focusErr);
        }
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
