import React, { useRef, useEffect, useState, useCallback } from 'react';
import './Editor.css';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const Editor: React.FC<EditorProps> = ({ value, onChange, placeholder = '输入内容...' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const [activeStates, setActiveStates] = useState<{
    bold: boolean;
    italic: boolean;
    insertUnorderedList: boolean;
  }>({
    bold: false,
    italic: false,
    insertUnorderedList: false,
  });

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current && editorRef.current) {
      const selection = window.getSelection();
      if (selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(savedSelectionRef.current);
        } catch (e) {
          editorRef.current.focus();
        }
      }
    }
  }, []);

  const updateActiveStates = useCallback(() => {
    try {
      setActiveStates({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      });
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorRef.current && document.activeElement === editorRef.current) {
        updateActiveStates();
        saveSelection();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateActiveStates, saveSelection]);

  const execCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    saveSelection();
    document.execCommand(command, false, commandValue);
    updateActiveStates();
    saveSelection();
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
      updateActiveStates();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    saveSelection();
  };

  const handleMouseUp = () => {
    updateActiveStates();
    saveSelection();
  };

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <button
          type="button"
          className={`toolbar-btn ${activeStates.bold ? 'toolbar-btn-active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('bold')}
          title="粗体 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${activeStates.italic ? 'toolbar-btn-active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('italic')}
          title="斜体 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${activeStates.insertUnorderedList ? 'toolbar-btn-active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('insertUnorderedList')}
          title="无序列表"
        >
          <span className="list-icon">•</span>
        </button>
      </div>
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={handleMouseUp}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default Editor;
