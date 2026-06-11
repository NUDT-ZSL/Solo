import { useState, useEffect } from "react";
import Editor, { loader } from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";

loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
  },
});

interface EditorProps {
  code: string;
  language: "javascript" | "python";
  theme: "dark" | "light";
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ code, language, theme, onChange, readOnly = false }: EditorProps) {
  const [mounted, setMounted] = useState(false);
  const monacoTheme = theme === "dark" ? "vs-dark" : "light";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMount: OnMount = (editor) => {
    if (!readOnly) {
      editor.focus();
    }
  };

  if (!mounted) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-dark-editor dark:bg-dark-editor">
        <Loader2 className="w-6 h-6 animate-spin dark:text-gray-400 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme={monacoTheme}
        value={code}
        onChange={(value) => onChange(value || "")}
        onMount={handleMount}
        loading={
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin dark:text-gray-400 text-gray-500" />
          </div>
        }
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
          renderLineHighlight: readOnly ? "none" : "all",
          cursorBlinking: readOnly ? "solid" : "blink",
        }}
      />
    </div>
  );
}
