import { createContext, useState, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MaterialLibrary from '@/pages/MaterialLibrary';
import BoardDetail from '@/pages/BoardDetail';
import Navbar from '@/components/Navbar';
import '@/index.css';

interface ThemeContextType {
  theme: 'light';
}

interface FilterContextType {
  keyword: string;
  setKeyword: (value: string) => void;
  selectedTag: string | null;
  setSelectedTag: (value: string | null) => void;
}

export const ThemeContext = createContext<ThemeContextType>({ theme: 'light' });
export const FilterContext = createContext<FilterContextType>({
  keyword: '',
  setKeyword: () => {},
  selectedTag: null,
  setSelectedTag: () => {},
});

interface AppProviderProps {
  children: ReactNode;
}

function AppProvider({ children }: AppProviderProps) {
  const [keyword, setKeyword] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  return (
    <ThemeContext.Provider value={{ theme: 'light' }}>
      <FilterContext.Provider
        value={{
          keyword,
          setKeyword,
          selectedTag,
          setSelectedTag,
        }}
      >
        {children}
      </FilterContext.Provider>
    </ThemeContext.Provider>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-bg">
          <Navbar />
          <Routes>
            <Route path="/" element={<MaterialLibrary />} />
            <Route path="/board" element={<BoardDetail />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}
