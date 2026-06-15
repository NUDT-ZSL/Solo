import { useState, useCallback } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CodeEditor from "@/components/Editor";
import OutputPanel from "@/components/OutputPanel";
import Resizer from "@/components/Resizer";
import MetaPanel from "@/components/MetaPanel";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

function extractErrorMessage(err: any): string {
  if (!err) return "Unknown error";
  if (err.response?.data) {
    if (typeof err.response.data === "string") {
      return err.response.data;
    }
    if (err.response.data.error) {
      if (typeof err.response.data.error === "string") {
        return err.response.data.error;
      }
      if (err.response.data.error?.message) {
        return err.response.data.error.message;
      }
      return JSON.stringify(err.response.data.error).slice(0, 500);
    }
    if (err.response.data.message) {
      return err.response.data.message;
    }
  }
  if (err.response?.statusText) {
    return `${err.response.status} ${err.response.statusText}`;
  }
  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
    return "Request timed out. Please try again.";
  }
  if (err.message) {
    return err.message;
  }
  return "Unknown error occurred";
}

export default function Home() {
  const {
    code, language, theme, title, description, output, outputType,
    isRunning, leftWidth, setCode, setLanguage, setOutput, setIsRunning,
  } = useStore();
  const [snippetId, setSnippetId] = useState<string | undefined>();

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    try {
      const res = await axios.post("/api/run", { code, language });
      const { output, error, timedOut } = res.data;
      if (timedOut) {
        setOutput("Execution timed out: code exceeded the 10-second limit", "timeout");
      } else if (error) {
        setOutput(error, "error");
      } else {
        setOutput(output || "(no output)", "success");
      }
    } catch (err: any) {
      setIsRunning(false);
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        setOutput("Request timed out. Please check your connection and try again.", "timeout");
      } else if (err.response?.status === 429) {
        setOutput("Rate limit exceeded: maximum 5 runs per minute", "error");
      } else {
        const message = extractErrorMessage(err);
        setOutput(`Error: ${message}`, "error");
      }
    }
  }, [code, language, setIsRunning, setOutput]);

  const handleSave = useCallback(async () => {
    try {
      const res = await axios.post("/api/snippets", {
        title: title || "Untitled Snippet",
        description,
        code,
        language,
      });
      setSnippetId(res.data.id);
      setOutput("Snippet saved! Click Share to copy the link.", "success");
    } catch (err: any) {
      const message = extractErrorMessage(err);
      setOutput(`Failed to save snippet: ${message}`, "error");
    }
  }, [title, description, code, language, setOutput]);

  const handleShare = useCallback(async () => {
    if (!snippetId) return;
    const url = `${window.location.origin}/snippet/${snippetId}`;
    try {
      await navigator.clipboard.writeText(url);
      setOutput(`Share link copied to clipboard!\n${url}`, "success");
    } catch {
      setOutput(`Share link: ${url}`, "success");
    }
  }, [snippetId, setOutput]);

  return (
    <div className="flex flex-col h-screen dark:bg-dark-bg bg-light-bg">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={cn(
          "flex items-center gap-3 px-4 py-2 border-b",
          "dark:border-gray-700 dark:bg-dark-editor",
          "border-gray-200 bg-light-editor"
        )}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "javascript" | "python")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium outline-none cursor-pointer",
              "dark:bg-gray-700 dark:text-gray-200",
              "bg-gray-100 text-gray-700"
            )}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
          <span className={cn("text-xs", "dark:text-gray-500 text-gray-400")}>
            {language === "javascript" ? "Node.js 20" : "Python 3.12"}
          </span>
        </div>
        <div id="main-content" className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div
            className="flex flex-col overflow-hidden"
            style={{ width: `${leftWidth}%` }}
          >
            <div className="flex-1 overflow-hidden dark:bg-dark-editor bg-light-editor">
              <CodeEditor
                code={code}
                language={language}
                theme={theme}
                onChange={setCode}
              />
            </div>
            <MetaPanel />
          </div>
          <Resizer />
          <div
            className="flex flex-col overflow-hidden p-3"
            style={{ width: `calc(${100 - leftWidth}% - 4px)` }}
          >
            <OutputPanel
              output={output}
              outputType={outputType}
              isRunning={isRunning}
              onRun={handleRun}
              onSave={handleSave}
              onShare={handleShare}
              snippetId={snippetId}
              readOnly={false}
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
