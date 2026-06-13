
import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import Navbar from './components/Navbar';
import GradientCard from './components/GradientCard';
import UploadForm from './components/UploadForm';
import DetailModal from './components/DetailModal';
import { demoGradients, Gradient } from './data/demoGradients';
import { useGradientFilter } from './hooks/useGradientFilter';
import './styles/global.css';

interface AppContextType {
  gradients: Gradient[];
  addGradient: (g: Omit<Gradient, 'id' | 'likes' | 'liked' | 'comments'>) => void;
  toggleLike: (id: string) => void;
  addComment: (gradientId: string, text: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

const generateId = (): string => Math.random().toString(36).substring(2, 11);

function AppProvider({ children }: { children: ReactNode }) {
  const [gradients, setGradients] = useState<Gradient[]>(demoGradients);

  const addGradient = (g: Omit<Gradient, 'id' | 'likes' | 'liked' | 'comments'>) => {
    const newGradient: Gradient = {
      ...g,
      id: generateId(),
      likes: 0,
      liked: false,
      comments: [],
    };
    setGradients((prev) => [newGradient, ...prev]);
  };

  const toggleLike = (id: string) => {
    setGradients((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, liked: !g.liked, likes: g.liked ? g.likes - 1 : g.likes + 1 }
          : g
      )
    );
  };

  const addComment = (gradientId: string, text: string) => {
    setGradients((prev) =>
      prev.map((g) =>
        g.id === gradientId
          ? {
              ...g,
              comments: [
                ...g.comments,
                { id: generateId(), text, createdAt: Date.now() },
              ],
            }
          : g
      )
    );
  };

  return (
    <AppContext.Provider value={{ gradients, addGradient, toggleLike, addComment }}>
      {children}
    </AppContext.Provider>
  );
}

function ContentArea() {
  const { gradients, toggleLike, addComment, addGradient } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedGradientId, setSelectedGradientId] = useState<string | null>(null);

  const filteredGradients = useGradientFilter(gradients, searchTerm);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    gradients.forEach((g) => g.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [gradients]);

  const selectedGradient = useMemo(
    () => gradients.find((g) => g.id === selectedGradientId) || null,
    [gradients, selectedGradientId]
  );

  const handleUploadSubmit = (g: Omit<Gradient, 'id' | 'likes' | 'liked' | 'comments'>) => {
    addGradient(g);
    setShowUpload(false);
  };

  return (
    <>
      <Navbar onUploadClick={() => setShowUpload(true)} onSearch={setSearchTerm} />

      <main
        style={{
          paddingTop: '92px',
          paddingLeft: '32px',
          paddingRight: '32px',
          paddingBottom: '40px',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            justifyContent: 'center',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {filteredGradients.length === 0 ? (
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                padding: '80px 0',
                color: '#9ca3af',
                fontSize: '16px',
              }}
            >
              {searchTerm ? '没有找到匹配的作品，换个关键词试试吧~' : '暂无作品'}
            </div>
          ) : (
            filteredGradients.map((gradient, index) => (
              <GradientCard
                key={gradient.id}
                gradient={gradient}
                index={index}
                onLike={toggleLike}
                onClick={(id) => setSelectedGradientId(id)}
              />
            ))
          )}
        </div>
      </main>

      {showUpload && (
        <UploadForm
          allTags={allTags}
          onSubmit={handleUploadSubmit}
          onClose={() => setShowUpload(false)}
        />
      )}

      {selectedGradient && (
        <DetailModal
          gradient={selectedGradient}
          onClose={() => setSelectedGradientId(null)}
          onAddComment={addComment}
          onLike={toggleLike}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ContentArea />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
