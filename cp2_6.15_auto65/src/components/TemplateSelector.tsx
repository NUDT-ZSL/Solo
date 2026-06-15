import { useEffect } from 'react';
import { useStore, Template } from '@/store/useStore';
import { BookOpen, Sparkles } from 'lucide-react';

export default function TemplateSelector() {
  const {
    templates,
    selectedTemplate,
    setTemplates,
    setSelectedTemplate,
    paragraphSpacing,
    setParagraphSpacing,
    customFontSize,
    setCustomFontSize,
    pageMargin,
    setPageMargin,
    resetToTemplate,
  } = useStore();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates');
        const data: Template[] = await response.json();
        setTemplates(data);
        if (data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        const defaultTemplates: Template[] = [
          {
            id: 1,
            name: '经典文学',
            fontFamily: 'SimSun, serif',
            fontSize: '14px',
            lineHeight: 1.8,
            textIndent: '2em',
            titleFontFamily: 'SimHei, sans-serif',
            titleFontSize: '24px',
            titleAlign: 'center',
            pageBreak: true,
            header: '书名 - 章节',
          },
          {
            id: 2,
            name: '现代畅销',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '11pt',
            lineHeight: 1.5,
            textIndent: '1.5em',
            titleFontFamily: '"Noto Serif SC", serif',
            titleFontSize: '24pt',
            titleAlign: 'left',
            pageBreak: true,
            footer: '页码',
          },
        ];
        setTemplates(defaultTemplates);
        setSelectedTemplate(defaultTemplates[0]);
      }
    };

    fetchTemplates();
  }, [setTemplates, setSelectedTemplate, selectedTemplate]);

  const handleTemplateSelect = (template: Template) => {
    resetToTemplate(template);
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.min(20, Math.max(12, customFontSize + delta));
    setCustomFontSize(newSize);
  };

  return (
    <div className="p-4 bg-[#fff8e1] rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
        <BookOpen size={20} />
        排版模板
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className={`p-4 rounded-lg border-2 transition-all duration-300 text-left hover:brightness-110 active:scale-[0.98] ${
              selectedTemplate?.id === template.id
                ? 'border-amber-500 bg-amber-100 shadow-lg'
                : 'border-amber-200 bg-white hover:border-amber-400'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {template.name === '经典文学' ? (
                <BookOpen size={18} className="text-amber-700" />
              ) : (
                <Sparkles size={18} className="text-amber-700" />
              )}
              <span className="font-semibold text-amber-900">
                {template.name}
              </span>
            </div>
            <p className="text-xs text-amber-700">
              行距 {template.lineHeight} · 缩进 {template.textIndent}
            </p>
          </button>
        ))}
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-2">
            段落间距: {paragraphSpacing.toFixed(1)}em
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={paragraphSpacing}
            onChange={(e) => setParagraphSpacing(parseFloat(e.target.value))}
            className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600 transition-all duration-300"
          />
          <div className="flex justify-between text-xs text-amber-600 mt-1">
            <span>0.5em</span>
            <span>2em</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-2">
            正文字号: {customFontSize}px
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleFontSizeChange(-1)}
              className="w-10 h-10 rounded-lg bg-amber-500 text-white font-bold hover:brightness-110 active:scale-[0.98] transition-all duration-100"
            >
              -
            </button>
            <span className="flex-1 text-center text-lg font-semibold text-amber-900">
              {customFontSize}px
            </span>
            <button
              onClick={() => handleFontSizeChange(1)}
              className="w-10 h-10 rounded-lg bg-amber-500 text-white font-bold hover:brightness-110 active:scale-[0.98] transition-all duration-100"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-2">
            页边距
          </label>
          <select
            value={pageMargin}
            onChange={(e) => setPageMargin(e.target.value)}
            className="w-full p-3 rounded-lg border-2 border-amber-200 bg-white text-amber-900 focus:outline-none focus:border-amber-500 transition-all duration-300"
          >
            <option value="1cm">窄边距 (1cm)</option>
            <option value="2cm">标准边距 (2cm)</option>
            <option value="3cm">宽边距 (3cm)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
