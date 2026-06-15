import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';

export default function Editor() {
  const { text, setText, setFormattedText, selectedTemplate } = useStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatText = useCallback(
    (rawText: string) => {
      if (!rawText.trim()) return '';

      const chapterRegex = /\/\s*第[一二三四五六七八九十百千万\d]+章\s*\//g;
      const lines = rawText.split(/\r?\n/);
      let formatted = '';
      let inParagraph = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) {
          if (inParagraph) {
            formatted += '</p>\n';
            inParagraph = false;
          }
          continue;
        }

        const chapterMatch = line.match(chapterRegex);
        if (chapterMatch) {
          if (inParagraph) {
            formatted += '</p>\n';
            inParagraph = false;
          }
          const chapterTitle = line.replace(/\/\s*|\s*\//g, '');
          formatted += `<h2 class="chapter-title">${chapterTitle}</h2>\n`;
          continue;
        }

        if (!inParagraph) {
          formatted += '<p class="paragraph">';
          inParagraph = true;
        }

        const processedLine = line.replace(
          /[""]([^""]*)[""]|「([^」]*)」|“([^”]*)”/g,
          (match) => `<span class="dialogue">${match}</span>`
        );

        formatted += processedLine;
      }

      if (inParagraph) {
        formatted += '</p>';
      }

      return formatted;
    },
    []
  );

  const saveToBackend = useCallback(async (content: string) => {
    try {
      await fetch('/api/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          templateId: selectedTemplate?.id || 1,
        }),
      });
    } catch (err) {
      console.error('Failed to save text:', err);
    }
  }, [selectedTemplate]);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const newText = target.innerText;
      setText(newText);
      setWordCount(newText.replace(/\s/g, '').length);

      const formatted = formatText(newText);
      setFormattedText(formatted);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        saveToBackend(newText);
      }, 300);
    },
    [setText, setFormattedText, formatText, saveToBackend]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, pastedText);
    },
    []
  );

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerText && text) {
      editorRef.current.innerText = text;
    }
  }, [text]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-4 py-3 bg-amber-50 rounded-t-lg border-b border-amber-200">
        <h3 className="text-lg font-semibold text-amber-900">
          编辑器
          {selectedTemplate && (
            <span className="ml-2 text-sm font-normal text-amber-700">
              - 当前模板: {selectedTemplate.name}
            </span>
          )}
        </h3>
      </div>
      <div className="relative flex-1 mx-auto w-4/5">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          className="w-full h-full min-h-[400px] p-5 rounded-lg bg-[#f8f8f8] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none whitespace-pre-wrap font-sans text-gray-800 leading-relaxed overflow-auto"
          style={{ caretColor: '#92400e' }}
          data-placeholder="在此粘贴或输入小说文本..."
        />
        <div className="absolute bottom-3 right-4 text-xs text-gray-500">
          字数: {wordCount}
        </div>
      </div>
    </div>
  );
}
