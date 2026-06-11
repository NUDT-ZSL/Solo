import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CodeEditor from "@/components/Editor";
import OutputPanel from "@/components/OutputPanel";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";

interface SnippetData {
  id: string;
  title: string;
  description: string;
  code: string;
  language: "javascript" | "python";
  createdAt: string;
}

export default function SnippetView() {
  const { id } = useParams<{ id: string }>();
  const [snippet, setSnippet] = useState<SnippetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { theme, output, outputType, isRunning, setOutput, setIsRunning } = useStore();

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/snippets/${id}`)
      .then((res) => {
        setSnippet(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Snippet not found");
        setLoading(false);
      });
  }, [id]);

  const handleRun = useCallback(async () => {
    if (!snippet) return;
    setIsRunning(true);
    try {
      const res = await axios.post("/api/run", {
        code: snippet.code,
        language: snippet.language,
      });
      const { output, error, timedOut } = res.data;
      if (timedOut) {
        setOutput("Execution timed out: code exceeded the 10-second limit", "timeout");
      } else if (error) {
        setOutput(error, "error");
      } else {
        setOutput(output || "(no output)", "success");
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setOutput("Rate limit exceeded: maximum 5 runs per minute", "error");
      } else {
        setOutput("Network error. Is the server running?", "error");
      }
    }
  }, [snippet, setIsRunning, setOutput]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen dark:bg-dark-bg bg-light-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin dark:text-gray-400 text-gray-500" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !snippet) {
    return (
      <div className="flex flex-col h-screen dark:bg-dark-bg bg-light-bg">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="dark:text-gray-300 text-gray-700 text-lg">{error || "Snippet not found"}</p>
          <a href="/" className="text-accent hover:underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to editor
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen dark:bg-dark-bg bg-light-bg">
      <Navbar />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 border-b",
            "dark:border-gray-700 dark:bg-dark-editor",
            "border-gray-200 bg-light-editor"
          )}>
            <a href="/" className={cn(
              "flex items-center gap-1 text-sm",
              "dark:text-gray-400 dark:hover:text-gray-200",
              "text-gray-500 hover:text-gray-700"
            )}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </a>
            <h1 className="dark:text-white text-gray-900 font-semibold text-lg">{snippet.title}</h1>
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              "dark:bg-gray-700 dark:text-gray-300",
              "bg-gray-100 text-gray-600"
            )}>
              {snippet.language === "javascript" ? "JavaScript" : "Python"}
            </span>
          </div>
          <div className="flex-1 overflow-hidden dark:bg-dark-editor bg-light-editor">
            <CodeEditor
              code={snippet.code}
              language={snippet.language}
              theme={theme}
              onChange={() => {}}
              readOnly
            />
          </div>
          {snippet.description && (
            <div className={cn(
              "p-4 border-t text-sm overflow-auto max-h-40",
              "dark:border-gray-700 dark:bg-dark-editor dark:text-gray-300",
              "border-gray-200 bg-light-editor text-gray-700"
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {snippet.description}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="md:w-80 flex flex-col overflow-hidden p-3">
          <OutputPanel
            output={output}
            outputType={outputType}
            isRunning={isRunning}
            onRun={handleRun}
            onSave={() => {}}
            onShare={() => {}}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
