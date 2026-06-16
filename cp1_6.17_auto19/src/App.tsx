import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Header, { ALL_TAGS_OPTION } from './components/Header';
import { fetchTags } from './business/DataFetcher';
import type { Tag } from './business/types';

const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const GameDetailPage = lazy(() => import('./pages/GameDetailPage'));
const RankingPage = lazy(() => import('./pages/RankingPage'));

function LoadingFallback() {
  return (
    <div className="page-container">
      <div className="loading-spinner">
        <div className="spinner"></div>
        加载中...
      </div>
    </div>
  );
}

export default function App() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(ALL_TAGS_OPTION);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'rating-desc' | 'rating-asc'>('default');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchTags().then(setTags).catch(() => setTags([]));
  }, []);

  const handleTagFilterFromDetail = (tag: Tag) => {
    setSelectedTag(tag);
    setSearchQuery('');
    setSortBy('default');
    navigate('/');
  };

  return (
    <>
      <Header
        tags={tags}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <Suspense fallback={<LoadingFallback />}>
        <Routes location={location}>
          <Route
            path="/"
            element={
              <div className="page-enter">
                <GalleryPage
                  selectedTag={selectedTag}
                  searchQuery={searchQuery}
                  sortBy={sortBy}
                />
              </div>
            }
          />
          <Route
            path="/game/:id"
            element={
              <div className="page-enter">
                <GameDetailPage onTagClick={handleTagFilterFromDetail} />
              </div>
            }
          />
          <Route
            path="/ranking"
            element={
              <div className="page-enter">
                <RankingPage />
              </div>
            }
          />
          <Route path="*" element={<LoadingFallback />} />
        </Routes>
      </Suspense>
    </>
  );
}
