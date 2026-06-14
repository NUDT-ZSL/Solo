import React, { useCallback, useState } from 'react';
import { TagType, highlightEngine } from './highlight-engine';
import ArticlePanel from './ArticlePanel';
import BookmarkPanel from './BookmarkPanel';

const SAMPLE_ARTICLE = `阅读是一种深度的思维活动，它不仅是信息的获取，更是心灵的对话。

在数字化时代，我们面临着前所未有的阅读挑战。信息过载使得深度阅读变得越来越稀缺，人们习惯了快速浏览和碎片化阅读。然而，真正的理解和思考需要沉浸式的阅读体验。

纸质书籍有其不可替代的触感。翻页的声音、墨水的气味、纸张的纹理，这些感官体验构成了阅读仪式感的重要部分。电子阅读器虽然便捷，但往往缺少这种仪式感，使得阅读变得更为功利。

批注是深度阅读的灵魂。当我们在文字旁写下思考、画下重点，我们与文本之间建立了更深层的连接。然而，纸质批注容易混乱，电子批注又常常不便整理和分享。

如何让批注既保持个人思考的温度，又具备数字化的便利？这是值得每个阅读者思考的问题。

好的阅读工具应该像一把钥匙，帮助我们打开文本深处的宝藏，而不是成为阅读本身的负担。高亮标注让我们聚焦关键信息，笔记记录让我们捕捉灵感，而书签摘要则让我们随时回顾与分享。

技术的意义在于服务人，而非束缚人。当我们用更高效的方式整理阅读成果，我们便有了更多时间去做真正的思考。`;

const App: React.FC = () => {
  const [articleText, setArticleText] = useState(SAMPLE_ARTICLE);
  const [activeFilter, setActiveFilter] = useState<TagType | null>(null);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<Set<string>>(new Set());
  const [articleTitle] = useState('深度阅读的艺术');

  React.useEffect(() => {
    highlightEngine.setArticle(articleText);
  }, []);

  const handleArticleChange = useCallback((text: string) => {
    setArticleText(text);
  }, []);

  const handleFilterChange = useCallback((tag: TagType | null) => {
    setActiveFilter(tag);
  }, []);

  const handleHighlightClick = useCallback((id: string) => {
    setSelectedHighlightIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        padding: '16px',
        height: '100vh',
        background: '#f0f4f8',
        overflow: 'hidden',
      }}
    >
      <ArticlePanel
        articleText={articleText}
        onArticleChange={handleArticleChange}
        activeFilter={activeFilter}
        onHighlightClick={handleHighlightClick}
        selectedHighlightIds={selectedHighlightIds}
      />
      <BookmarkPanel
        articleTitle={articleTitle}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        onHighlightClick={handleHighlightClick}
        selectedHighlightIds={selectedHighlightIds}
      />
    </div>
  );
};

export default App;
