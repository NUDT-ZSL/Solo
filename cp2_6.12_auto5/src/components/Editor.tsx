import { useState, useEffect, useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (workerId: string, label: string) => Worker;
    };
  }
}

if (!window.MonacoEnvironment) {
  self.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === "json") {
        return new jsonWorker();
      }
      if (label === "css" || label === "scss" || label === "less") {
        return new cssWorker();
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        return new htmlWorker();
      }
      if (label === "typescript" || label === "javascript") {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };
}

loader.config({ monaco });

interface EditorProps {
  code: string;
  language: "javascript" | "python";
  theme: "dark" | "light";
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ code, language, theme, onChange, readOnly = false }: EditorProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoTheme = theme === "dark" ? "vs-dark" : "light";

  useEffect(() => {
    let cancelled = false;

    loader
      .init()
      .then(() => {
        if (!cancelled) {
          setIsLoading(false);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const err = error as { type?: string; message?: string };
          if (err.type !== "cancelation") {
            setIsLoading(false);
            setLoadError(err.message || "Unknown error");
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMount: OnMount = () => {
    setIsLoading(false);
    setLoadError(null);
  };

  const handleRetry = () => {
    setLoadError(null);
    setIsLoading(true);
    window.location.reload();
  };

  return (
    <div ref={containerRef} className="h-full w-full relative">
      {isLoading && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 dark:bg-dark-editor bg-light-editor">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin dark:text-gray-400 text-gray-500" />
            <span className="text-xs dark:text-gray-500 text-gray-400">Loading editor...</span>
          </div>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 dark:bg-dark-editor bg-light-editor">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <AlertTriangle className="w-10 h-10 text-warning" />
            <div>
              <p className="text-sm font-medium dark:text-gray-300 text-gray-700">Editor failed to load</p>
              <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">{loadError}</p>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent text-white hover:bg-blue-500 btn-scale"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
      )}
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme={monacoTheme}
        value={code}
        onChange={(value) => onChange(value || "")}
        onMount={handleMount}
        loading={null}
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
