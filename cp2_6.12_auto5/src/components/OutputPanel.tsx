import { Play, Save, Share2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutputPanelProps {
  output: string;
  outputType: "success" | "error" | "timeout" | "idle";
  isRunning: boolean;
  onRun: () => void;
  onSave?: () => void;
  onShare?: () => void;
  snippetId?: string;
}

export default function OutputPanel({ output, outputType, isRunning, onRun, onSave, onShare, snippetId }: OutputPanelProps) {
  const outputColor = {
    success: "text-success",
    error: "text-error",
    timeout: "text-warning",
    idle: "dark:text-gray-500 text-gray-400",
  }[outputType];

  return (
    <div className={cn("flex flex-col h-full rounded-lg overflow-hidden shadow-lg", "dark:bg-dark-output bg-light-output")}>
      <div className={cn("flex items-center justify-between px-4 py-2 border-b", "dark:border-gray-700 border-gray-200")}>
        <span className={cn("text-sm font-medium", "dark:text-gray-300 text-gray-600")}>Output</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            disabled={isRunning}
            className={cn(
              "btn-scale flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
              "bg-success text-white hover:bg-green-600",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Running..." : "Run"}
          </button>
          {onSave && (
            <button
              onClick={onSave}
              className={cn(
                "btn-scale flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
                "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
                "bg-gray-200 text-gray-700 hover:bg-gray-300"
              )}
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
          {onShare && snippetId && (
            <button
              onClick={onShare}
              className={cn(
                "btn-scale flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium",
                "bg-accent text-white hover:bg-blue-500"
              )}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          )}
        </div>
      </div>
      <div className={cn("flex-1 p-4 overflow-auto font-mono text-sm", outputColor)}>
        {isRunning ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="dark:text-gray-400 text-gray-500">Executing code...</span>
          </div>
        ) : outputType === "idle" ? (
          <span>Ready to run</span>
        ) : (
          <pre className="whitespace-pre-wrap break-words">{output}</pre>
        )}
      </div>
    </div>
  );
}
