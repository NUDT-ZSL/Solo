import { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { TestCaseResult, SubmitResponse } from '@/shared/types';

interface ResultsPanelProps {
  results: TestCaseResult[] | null;
  response: SubmitResponse | null;
}

function DiffView({ expected, actual }: { expected: string; actual: string }) {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const maxLen = Math.max(expectedLines.length, actualLines.length);

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
      <div>
        <div className="text-base-subtext mb-1 font-sans text-[11px] font-medium uppercase tracking-wider">Expected</div>
        <div className="bg-[#1e1e2e] rounded-lg p-3 overflow-x-auto">
          {Array.from({ length: maxLen }).map((_, i) => (
            <div
              key={`e-${i}`}
              className={
                expectedLines[i] !== actualLines[i] && i < expectedLines.length
                  ? 'diff-removed px-1 rounded'
                  : 'px-1 text-base-subtext'
              }
            >
              {expectedLines[i] ?? '\u00A0'}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-base-subtext mb-1 font-sans text-[11px] font-medium uppercase tracking-wider">Actual</div>
        <div className="bg-[#1e1e2e] rounded-lg p-3 overflow-x-auto">
          {Array.from({ length: maxLen }).map((_, i) => (
            <div
              key={`a-${i}`}
              className={
                expectedLines[i] !== actualLines[i] && i < actualLines.length
                  ? 'diff-added px-1 rounded'
                  : 'px-1 text-base-subtext'
              }
            >
              {actualLines[i] ?? '\u00A0'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result, index }: { result: TestCaseResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    passed: { icon: CheckCircle, color: 'text-base-green', bg: 'bg-base-green/10', border: 'border-base-green/30', label: 'Passed' },
    failed: { icon: XCircle, color: 'text-base-red', bg: 'bg-base-red/10', border: 'border-base-red/30', label: 'Failed' },
    timeout: { icon: Clock, color: 'text-base-yellow', bg: 'bg-base-yellow/10', border: 'border-base-yellow/30', label: 'Timeout' },
    error: { icon: AlertTriangle, color: 'text-base-peach', bg: 'bg-base-peach/10', border: 'border-base-peach/30', label: 'Error' },
  };

  const config = statusConfig[result.status];
  const Icon = config.icon;

  return (
    <div
      className="animate-slide-in origin-left"
      style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
    >
      <div className={`card-result ${config.border} cursor-pointer`} onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div>
              <div className="text-sm font-medium text-base-text">
                Test Case {result.caseId}
              </div>
              <div className={`text-xs ${config.color} font-medium`}>
                {config.label} &middot; {result.executionTime}ms
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result.status === 'passed' && (
              <span className="text-xs text-base-green bg-base-green/10 px-2 py-1 rounded-full">
                OK
              </span>
            )}
            {result.status !== 'passed' && (
              expanded ? <ChevronUp className="w-4 h-4 text-base-subtext" /> : <ChevronDown className="w-4 h-4 text-base-subtext" />
            )}
          </div>
        </div>

        {expanded && result.status !== 'passed' && (
          <div className="mt-3 animate-fade-in">
            <div className="mb-3">
              <div className="text-base-subtext text-[11px] font-medium uppercase tracking-wider mb-1">Input</div>
              <pre className="bg-[#1e1e2e] rounded-lg p-3 text-xs font-mono text-base-text overflow-x-auto">
                {result.input}
              </pre>
            </div>
            <DiffView expected={result.expectedOutput} actual={result.actualOutput} />
            {result.errorMessage && (
              <div className="mt-2">
                <div className="text-base-subtext text-[11px] font-medium uppercase tracking-wider mb-1">Error</div>
                <pre className="bg-base-red/10 rounded-lg p-3 text-xs font-mono text-base-red overflow-x-auto">
                  {result.errorMessage}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CircularProgress({ percentage, score, maxScore }: { percentage: number; score: number; maxScore: number }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [displayPercent, setDisplayPercent] = useState(0);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();
    const targetScore = score;
    const targetPercent = percentage;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayScore(Math.round(eased * targetScore));
      setDisplayPercent(Math.round(eased * targetPercent));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [score, percentage]);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayPercent / 100) * circumference;

  const color = displayPercent >= 80 ? '#a6e3a1' : displayPercent >= 50 ? '#f9e2af' : '#f38ba8';

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#313244" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-base-text">{displayPercent}%</span>
          <span className="text-[10px] text-base-subtext">{displayScore}/{maxScore}</span>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPanel({ results, response }: ResultsPanelProps) {
  if (!results || !response) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-base-subtext">
        <div className="w-16 h-16 rounded-2xl bg-base-surface flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-base-overlay" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm">Submit your code to see results</p>
        <p className="text-xs mt-1 text-base-overlay">Results will appear here</p>
      </div>
    );
  }

  const passed = results.filter(r => r.status === 'passed').length;
  const percentage = Math.round((passed / results.length) * 100);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#313244]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-base-text">Evaluation Results</h3>
          <span className="text-xs text-base-subtext">
            {passed}/{results.length} passed
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {results.map((result, index) => (
          <ResultCard key={result.caseId} result={result} index={index} />
        ))}
      </div>

      <div className="flex-shrink-0 p-4 border-t border-[#313244] bg-[#181825]">
        <CircularProgress
          percentage={percentage}
          score={response.totalScore}
          maxScore={response.maxScore}
        />
      </div>
    </div>
  );
}
