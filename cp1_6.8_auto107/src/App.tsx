import React, { useState, useCallback } from "react";
import CollectionView from "./CollectionView";

const App: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar__inner">
          <div className="navbar__brand">
            <svg className="navbar__logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="14" r="10" stroke="#c9a96e" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="2" fill="#c9a96e" />
              <circle cx="20" cy="12" r="2" fill="#c9a96e" />
              <path d="M14 17 Q16 19 18 17" stroke="#c9a96e" strokeWidth="1.2" fill="none" />
              <path d="M6 14 L3 20" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M26 14 L29 20" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10 6 L8 2" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M22 6 L24 2" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M13 24 L11 30" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M19 24 L21 30" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="navbar__title">回声书签</span>
          </div>

          <div className="navbar__tagline">数字时代的诗意收藏馆</div>
        </div>
      </nav>

      <main className="main">
        <CollectionView />
      </main>

      <footer className="footer">
        <p>回声书签 · 每一次收藏都是一次回声</p>
      </footer>
    </div>
  );
};

export default App;
