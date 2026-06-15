import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/closebrackets';
import { autocomplete, completionKeymap } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import type { EditorProps } from '../types';
import styles from './Editor.module.css';

export default function Editor({ code, onChange, error, onError, collapsed, onToggleCollapse }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleChange = useCallback((value: string) => {
    onChange(value);
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        handleChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocomplete(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
        ]),
        javascript({ jsx: true, typescript: false }),
        oneDark,
        updateListener,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
            fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
            backgroundColor: '#1e1e1e',
          },
          '.cm-scroller': {
            fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
            overflow: 'auto',
            fontVariantLigatures: 'normal',
          },
          '.cm-content': {
            padding: '16px 0',
          },
          '.cm-gutters': {
            backgroundColor: '#1e1e1e',
            color: '#858585',
            border: 'none',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#2a2d2e',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
          },
          '.cm-selectionBackground, ::selection': {
            backgroundColor: '#264f78 !important',
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== code) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: code,
          },
        });
      }
    }
  }, [code]);

  useEffect(() => {
    if (error) {
      setFadeOut(false);
      setErrorVisible(true);
    } else {
      setFadeOut(true);
      const timer = setTimeout(() => {
        setErrorVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className={`${styles.editorContainer} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <button className={styles.collapseButton} onClick={onToggleCollapse} title="折叠编辑器">
          {collapsed ? '▶' : '◀'}
        </button>
        <span className={styles.title}>代码编辑器</span>
      </div>
      <div ref={editorRef} className={styles.editor} />
      {errorVisible && (
        <div className={`${styles.errorBar} ${fadeOut ? styles.fadeOut : ''}`}>
          <span className={styles.errorIcon}>⚠</span>
          <span className={styles.errorText}>{error}</span>
        </div>
      )}
    </div>
  );
}

function indentOnInput() {
  return EditorView.inputHandler.of((view, from, to, text) => {
    if (text === '\n') {
      const line = view.state.doc.lineAt(from);
      const indent = line.text.match(/^\s*/)?.[0] || '';
      const lastChar = line.text.trim().slice(-1);
      const extraIndent = lastChar === '{' || lastChar === '(' || lastChar === '[' ? '  ' : '';
      view.dispatch({
        changes: { from, to, insert: '\n' + indent + extraIndent },
      });
      return true;
    }
    return false;
  });
}
