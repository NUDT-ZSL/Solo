import React, { useState, useEffect, useCallback, useRef } from 'react';
import SearchBar, { FilterType } from './components/SearchBar';
import FeedbackCard from './components/FeedbackCard';
import FeedbackForm from './components/FeedbackForm';
import {
  Feedback,
  Sentiment,
  getFeedbacks,
  addFeedback,
  updateFeedback,
  deleteFeedback,
} from './utils/storage';

const ITEMS_PER_PAGE = 10;

function generateMockData(): void {
  const existing = getFeedbacks();
  if (existing.length > 0) return;

  const mockFeedbacks: Array<{
    title: string;
    description: string;
    sentiment: Sentiment;
    isUrgent: boolean;
  }> = [
    {
      title: '登录页面加载太慢了',
      description: '每次打开登录页面都要等5秒以上才能完全加载，特别是在网络不好的时候更明显。建议优化一下首屏加载速度，可以考虑做懒加载或者代码分割。用户体验很不好，已经有好几个同事抱怨了。',
      sentiment: 'negative',
      isUrgent: true,
    },
    {
      title: '希望支持深色模式',
      description: '现在晚上用产品的时候太亮了，眼睛很不舒服。很多竞品都已经支持深色模式了，希望你们也能尽快跟上。最好是可以跟随系统自动切换，或者有手动切换的开关。',
      sentiment: 'neutral',
      isUrgent: false,
    },
    {
      title: '新版本的搜索功能太好用了！',
      description: '这次更新的搜索功能真的很赞，搜索结果非常准确，而且响应速度很快。特别是支持模糊搜索和拼音搜索，找东西方便多了。给产品团队点个赞，继续加油！',
      sentiment: 'positive',
      isUrgent: false,
    },
    {
      title: '导出报表功能有bug',
      description: '在导出Excel报表的时候，如果数据量超过1000条，导出的文件就会损坏，打不开。已经试了好几次都是这样。这严重影响了我们的日常工作，请尽快修复。',
      sentiment: 'negative',
      isUrgent: true,
    },
    {
      title: '建议增加快捷键支持',
      description: '作为一个重度用户，每天要操作很多次。如果能支持常用的快捷键（比如Ctrl+S保存，Ctrl+N新建），效率会高很多。现在每次都要用鼠标点来点去，有点麻烦。',
      sentiment: 'neutral',
      isUrgent: false,
    },
    {
      title: '移动端适配做得很好',
      description: '最近在手机上用了一下，发现响应式适配做得很不错，各种屏幕尺寸都能正常显示。操作也很流畅，没有卡顿的感觉。看得出来团队在这方面花了心思。',
      sentiment: 'positive',
      isUrgent: false,
    },
    {
      title: '数据可视化图表需要改进',
      description: '现在的图表样式比较单一，只有折线图和柱状图。希望能增加更多图表类型，比如饼图、雷达图、热力图等。另外图表的交互性也可以增强，比如支持点击查看详情。',
      sentiment: 'neutral',
      isUrgent: false,
    },
    {
      title: '消息通知功能太棒了',
      description: '新增的消息通知功能很实用，不会错过重要的更新了。特别是浏览器推送通知，即使不在页面上也能收到提醒。这个功能解决了我们很大的痛点，非常感谢！',
      sentiment: 'positive',
      isUrgent: false,
    },
    {
      title: '文件上传大小限制太小',
      description: '现在文件上传只能传10MB以下的，我们经常需要上传一些大的文档和图片，这个限制太不方便了。建议至少提升到50MB，或者支持分片上传大文件。',
      sentiment: 'negative',
      isUrgent: false,
    },
    {
      title: '协作编辑功能很强大',
      description: '团队协作编辑功能真的很强大，多人同时编辑不会冲突，还能看到每个人的光标位置和编辑历史。这让我们的团队协作效率提升了很多，强烈推荐给其他团队！',
      sentiment: 'positive',
      isUrgent: false,
    },
    {
      title: '希望能增加数据备份功能',
      description: '现在数据都是存在云端，虽然相信你们的技术，但还是希望能有手动导出备份的功能，这样心里更踏实。最好是支持定时自动备份，可以备份到自己的云存储。',
      sentiment: 'neutral',
      isUrgent: false,
    },
    {
      title: '页面偶尔会白屏',
      description: '使用过程中偶尔会出现白屏的情况，刷新一下又好了。特别是在切换页面的时候更容易出现。控制台没有报错，不知道是什么原因。使用的是Chrome最新版。',
      sentiment: 'negative',
      isUrgent: true,
    },
  ];

  mockFeedbacks.forEach((fb) => {
    addFeedback({
      title: fb.title,
      description: fb.description,
      sentiment: fb.sentiment,
      screenshots: [],
      isUrgent: fb.isUrgent,
    });
  });
}

const App: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateMockData();
    setFeedbacks(getFeedbacks());
  }, []);

  const filteredFeedbacks = feedbacks.filter((feedback) => {
    const matchesSearch =
      feedback.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.description.toLowerCase().includes(searchQuery.toLowerCase());

    switch (activeFilter) {
      case 'pending':
        return matchesSearch && !feedback.reply && !feedback.isHandled;
      case 'replied':
        return matchesSearch && !!feedback.reply;
      case 'urgent':
        return matchesSearch && feedback.isUrgent;
      default:
        return matchesSearch;
    }
  });

  const displayedFeedbacks = filteredFeedbacks.slice(0, displayCount);
  const hasMore = displayCount < filteredFeedbacks.length;

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setTimeout(() => {
      setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [searchQuery, activeFilter]);

  const handleAddFeedback = (data: {
    title: string;
    description: string;
    sentiment: Sentiment;
    screenshots: string[];
    isUrgent: boolean;
  }) => {
    const newFeedback = addFeedback(data);
    setFeedbacks((prev) => [newFeedback, ...prev]);
  };

  const handleReply = (id: string, reply: string) => {
    updateFeedback(id, { reply });
    setFeedbacks((prev) =>
      prev.map((fb) => (fb.id === id ? { ...fb, reply } : fb))
    );
  };

  const handleHandle = (id: string) => {
    const feedback = feedbacks.find((fb) => fb.id === id);
    if (feedback) {
      const newIsHandled = !feedback.isHandled;
      updateFeedback(id, { isHandled: newIsHandled });
      setFeedbacks((prev) =>
        prev.map((fb) => (fb.id === id ? { ...fb, isHandled: newIsHandled } : fb))
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteFeedback(id);
    setFeedbacks((prev) => prev.filter((fb) => fb.id !== id));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddClick={() => setIsFormOpen(true)}
      />

      <div ref={listRef} className="feedback-list">
        {displayedFeedbacks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-text">暂无反馈数据</div>
          </div>
        ) : (
          displayedFeedbacks.map((feedback, index) => (
            <FeedbackCard
              key={feedback.id}
              feedback={feedback}
              onReply={handleReply}
              onHandle={handleHandle}
              onDelete={handleDelete}
              animationDelay={index % ITEMS_PER_PAGE * 50}
            />
          ))
        )}

        {hasMore && (
          <>
            <div ref={sentinelRef} />
            {isLoading && <div className="loading-more">加载中...</div>}
          </>
        )}
      </div>

      <button
        className="add-btn"
        onClick={() => setIsFormOpen(true)}
        aria-label="添加反馈"
      >
        +
      </button>

      <button
        className={`back-to-top ${showBackToTop ? '' : 'hidden'}`}
        onClick={scrollToTop}
        aria-label="返回顶部"
      >
        ↑
      </button>

      <FeedbackForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddFeedback}
      />
    </div>
  );
};

export default App;
