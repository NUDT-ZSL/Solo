import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";

interface EditorProps {
  code: string;
  language: "javascript" | "python";
  theme: "dark" | "light";
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ code, language, theme, onChange, readOnly = false }: EditorProps) {
  const monacoTheme = theme === "dark" ? "vs-dark" : "light";

  const handleMount: OnMount = (editor, monaco) => {
    editor.focus();
  };

  return (
    <Editor
      height="100%"
      language={language}
      theme={monacoTheme}
      value={code}
      onChange={(value) => onChange(value || "")}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontLigatures: true,
        fontFamily: "JetBrains Mono",
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        padding: { top: 16 },
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        readOnly,
      }}
    />
  );
}
