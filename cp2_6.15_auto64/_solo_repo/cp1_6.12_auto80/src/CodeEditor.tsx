import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  acceptCompletion,
} from '@codemirror/autocomplete';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { useAppContext } from './App';

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'HTML/CSS'];

function getExtension(language: string) {
  switch (language) {
    case 'JavaScript': return javascript();
    case 'TypeScript': return javascript({ typescript: true });
    case 'Python': return python();
    case 'HTML/CSS': return html();
    default: return javascript();
  }
}

export default function CodeEditor() {
  const { editingSnippet, saveSnippet, setShowEditor } = useAppContext();
  const [title, setTitle] = useState(editingSnippet?.title || '');
  const [language, setLanguage] = useState(editingSnippet?.language || 'JavaScript');
  const [tags, setTags] = useState(editingSnippet?.tags || '');
  const [description, setDescription] = useState(editingSnippet?.description || '');
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [toastFading, setToastFading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const codeRef = useRef(editingSnippet?.code || '');

  const handleDocChange = useCallback((doc: string) => {
    codeRef.current = doc;
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: editingSnippet?.code || '',
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        closeBrackets(),
        bracketMatching(),
        autocompletion({
          activateOnTyping: true,
          defaultKeymap: true,
          icons: false,
        }),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
          { key: 'Tab', run: acceptCompletion, preventDefault: true },
        ]),
        getExtension(language),
        syntaxHighlighting(defaultHighlightStyle),
        oneDark,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            handleDocChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: '"Fira Code", "Consolas", "Cascadia Code", monospace' },
          '.cm-tooltip': {
            'background-color': '#252526',
            border: '1px solid #3c3c3c',
            'border-radius': '4px',
          },
          '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            'background-color': '#094771',
            color: '#ffffff',
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
      viewRef.current = null;
    };
  }, [handleDocChange]);

  const handleSave = useCallback(() => {
    const currentCode = codeRef.current;
    if (!title.trim() || !currentCode.trim()) return;

    saveSnippet({
      title: title.trim(),
      language,
      tags,
      description,
      code: currentCode,
    });

    setShowSaveToast(true);
    setToastFading(false);

    setTimeout(() => {
      setToastFading(true);
      setTimeout(() => {
        setShowSaveToast(false);
        setToastFading(false);
      }, 500);
    }, 2500);
  }, [title, language, tags, description, saveSnippet]);

  const handleCancel = useCallback(() => {
    setShowEditor(false);
  }, [setShowEditor]);

  return (
    <div className="editor-overlay">
      <div className="editor-modal">
        {showSaveToast && (
          <div className={`save-toast ${toastFading ? 'fading' : ''}`}>
            ✓ 保存成功
          </div>
        )}
        <div className="editor-header">
          <h2>{editingSnippet ? '编辑代码片段' : '新建代码片段'}</h2>
          <button className="btn-close-editor" onClick={handleCancel}>✕</button>
        </div>

        <div className="editor-form">
          <div className="form-row">
            <div className="form-group form-group-title">
              <label>标题</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="输入代码片段标题..."
              />
            </div>
            <div className="form-group form-group-lang">
              <label>语言</label>
              <select
                className="form-select"
                value={language}
                onChange={e => setLanguage(e.target.value)}
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group form-group-tags">
              <label>标签（逗号分隔）</label>
              <input
                type="text"
                className="form-input"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="如：算法, 工具函数"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>描述</label>
              <input
                type="text"
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="简短描述..."
              />
            </div>
          </div>
        </div>

        <div className="editor-codemirror" ref={editorRef} />

        <div className="editor-actions">
          <button className="btn-save" onClick={handleSave} disabled={!title.trim() || !codeRef.current.trim()}>
            ✓ 保存
          </button>
          <button className="btn-cancel" onClick={handleCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
