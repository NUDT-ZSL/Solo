import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import type { Language } from '@/shared/types';

interface CodeEditorProps {
  code: string;
  language: Language;
  onCodeChange: (code: string) => void;
}

const languageMap: Record<Language, string> = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
};

const languageLabels: Record<Language, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  cpp: 'C++',
};

export default function CodeEditor({ code, language, onCodeChange }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const subscriptionRef = useRef<monaco.IDisposable | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    monaco.editor.defineTheme('codejudge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'cba6f7' },
        { token: 'string', foreground: 'a6e3a1' },
        { token: 'number', foreground: 'fab387' },
        { token: 'type', foreground: 'f9e2af' },
        { token: 'function', foreground: '89b4fa' },
        { token: 'variable', foreground: 'cdd6f4' },
        { token: 'operator', foreground: '89dceb' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.lineHighlightBackground': '#313244',
        'editor.selectionBackground': '#45475a',
        'editorLineNumber.foreground': '#6c7086',
        'editorLineNumber.activeForeground': '#cdd6f4',
        'editor.inactiveSelectionBackground': '#313244',
        'editorIndentGuide.background': '#313244',
        'editorIndentGuide.activeBackground': '#45475a',
        'editorBracketMatch.background': '#45475a',
        'editorBracketMatch.border': '#585b70',
        'editorOverviewRuler.border': '#313244',
        'scrollbar.shadow': '#1e1e2e',
        'scrollbarSlider.background': '#45475a80',
        'scrollbarSlider.hoverBackground': '#585b70',
        'scrollbarSlider.activeBackground': '#6c7086',
      },
    });

    const editor = monaco.editor.create(editorRef.current, {
      value: code,
      language: languageMap[language],
      theme: 'codejudge-dark',
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontLigatures: true,
      lineHeight: 22,
      minimap: { enabled: false },
      lineNumbers: 'on',
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      bracketPairColorization: { enabled: true },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      padding: { top: 16, bottom: 16 },
      renderLineHighlight: 'all',
      renderWhitespace: 'selection',
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
      tabSize: 2,
      wordWrap: 'on',
    });

    monacoRef.current = editor;

    subscriptionRef.current = editor.onDidChangeModelContent(() => {
      onCodeChange(editor.getValue());
    });

    return () => {
      subscriptionRef.current?.dispose();
      editor.dispose();
      monacoRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = monacoRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const currentValue = editor.getValue();
    if (currentValue !== code) {
      editor.setValue(code);
    }

    monaco.editor.setModelLanguage(model, languageMap[language]);
  }, [code, language]);

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-[#313244]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#f38ba8]" />
            <div className="w-3 h-3 rounded-full bg-[#f9e2af]" />
            <div className="w-3 h-3 rounded-full bg-[#a6e3a1]" />
          </div>
          <span className="ml-3 text-xs font-mono text-base-subtext">
            {languageLabels[language]}
          </span>
        </div>
      </div>
      <div ref={editorRef} className="flex-1 min-h-0" />
    </div>
  );
}
