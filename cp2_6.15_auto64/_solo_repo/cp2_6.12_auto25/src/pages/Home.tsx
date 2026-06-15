import { useEffect } from 'react';
import { Play, Loader2, PanelLeftClose, PanelLeft, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import CodeEditor from '@/components/CodeEditor';
import ResultsPanel from '@/components/ResultsPanel';
import HistorySidebar from '@/components/HistorySidebar';
import type { Language } from '@/shared/types';

const languageOptions: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
];

export default function Home() {
  const {
    assignments,
    selectedAssignment,
    currentCode,
    currentLanguage,
    isSubmitting,
    evaluationResults,
    evaluationResponse,
    submissionHistory,
    sidebarOpen,
    fetchAssignments,
    selectAssignment,
    setCode,
    setLanguage,
    submitCode,
    viewHistoryItem,
    toggleSidebar,
  } = useStore();

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return (
    <div className="h-screen w-screen flex bg-base-bg text-base-text overflow-hidden">
      <HistorySidebar
        history={submissionHistory}
        onViewItem={viewHistoryItem}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex-shrink-0 h-14 bg-[#181825] border-b border-[#313244] flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-base-surface transition-colors"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4 text-base-subtext" />
              ) : (
                <PanelLeft className="w-4 h-4 text-base-subtext" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-base-accent animate-pulse" />
              <h1 className="text-base font-bold text-base-text tracking-tight">CodeJudge</h1>
            </div>

            <div className="h-5 w-px bg-base-overlay mx-2" />

            <div className="relative">
              <select
                value={selectedAssignment?.id || ''}
                onChange={(e) => selectAssignment(e.target.value)}
                className="appearance-none bg-base-surface text-sm text-base-text pl-3 pr-8 py-1.5 rounded-lg border border-base-overlay focus:outline-none focus:border-base-accent transition-colors cursor-pointer"
              >
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-base-subtext absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="appearance-none bg-base-surface text-sm text-base-text pl-3 pr-8 py-1.5 rounded-lg border border-base-overlay focus:outline-none focus:border-base-accent transition-colors cursor-pointer"
              >
                {languageOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {selectedAssignment && !selectedAssignment.languages.includes(opt.value) ? `⚠ ${opt.label}` : opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-base-subtext absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={submitCode}
              disabled={isSubmitting || !currentCode.trim() || !selectedAssignment}
              className="btn-submit flex items-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Submit
                </>
              )}
            </button>
          </div>
        </header>

        {selectedAssignment && (
          <div className="flex-shrink-0 px-4 py-2 bg-[#181825]/50 border-b border-[#313244]/50">
            <p className="text-xs text-base-subtext leading-relaxed">
              {selectedAssignment.description}
            </p>
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          <div className="w-[60%] border-r border-[#313244]">
            <CodeEditor
              code={currentCode}
              language={currentLanguage}
              onCodeChange={setCode}
            />
          </div>

          <div className="w-[40%] bg-[#1e1e2e]">
            <ResultsPanel
              results={evaluationResults}
              response={evaluationResponse}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
