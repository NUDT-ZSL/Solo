import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import TemplateSelector from '@/components/TemplateSelector';
import ExportButton from '@/components/ExportButton';
import { BookMarked } from 'lucide-react';
import '@/index.css';

function App() {
  return (
    <div className="min-h-screen bg-[#faf3e0]">
      <header className="bg-gradient-to-r from-amber-700 to-amber-600 text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <BookMarked size={32} />
          <div>
            <h1 className="text-2xl font-bold">小说排版助手</h1>
            <p className="text-amber-200 text-sm">自动排版 · 多格式导出</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-3/5 space-y-6">
            <div className="bg-[#fff8e1] rounded-lg shadow-lg overflow-hidden min-h-[500px]">
              <Editor />
            </div>
          </div>

          <div className="w-full lg:w-2/5 space-y-6">
            <div className="bg-[#fff8e1] rounded-lg shadow-lg overflow-hidden min-h-[500px]">
              <Preview />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              <TemplateSelector />
              <ExportButton />
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-[#fff8e1] rounded-lg shadow-md">
          <h3 className="text-amber-900 font-semibold mb-2">使用说明</h3>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li>
              粘贴纯文本小说到左侧编辑器，系统会自动识别段落和章节
            </li>
            <li>
              使用 <code className="bg-amber-200 px-1 rounded">/ 第X章 /</code>{' '}
              格式手动标记章节分隔，预览中会自动分页
            </li>
            <li>选择排版模板后可自定义调整段落间距、字号和页边距</li>
            <li>
              导出EPUB格式适合在Kindle等电子阅读器上阅读，PDF格式适合印刷
            </li>
          </ul>
        </div>
      </main>

      <footer className="mt-8 py-4 text-center text-amber-600 text-sm">
        <p>在线小说排版与导出工具 © 2024</p>
      </footer>
    </div>
  );
}

export default App;
