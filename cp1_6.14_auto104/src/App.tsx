import React, { useState, useMemo, useCallback } from 'react';
import CardBoard from './CardBoard';
import FolderPanel from './FolderPanel';
import { Card, Folder, CardType, CARD_TYPE_CONFIG } from './types';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import axios from 'axios';
import './App.css';

const generateId = () => Math.random().toString(36).substr(2, 9);

const initialFolders: Folder[] = [
  { id: 'folder-1', name: '设计', cardCount: 0 },
  { id: 'folder-2', name: '技术', cardCount: 0 },
  { id: 'folder-3', name: '产品', cardCount: 0 },
];

const initialCards: Card[] = [
  {
    id: 'card-1',
    type: CardType.LINK,
    title: 'Dribbble - 设计灵感社区',
    description: '全球顶尖设计师分享作品的平台，适合寻找UI/UX设计灵感',
    url: 'https://dribbble.com',
    likes: 12,
    liked: false,
    order: 0,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'card-2',
    type: CardType.IMAGE,
    title: '渐变色彩参考',
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400',
    likes: 25,
    liked: true,
    order: 1,
    createdAt: Date.now() - 72000000,
  },
  {
    id: 'card-3',
    type: CardType.TEXT,
    content: '## 产品创意\n\n1. **极简主义设计** - 简约不简单\n2. **微交互** - 细节决定体验\n3. **情感化设计** - 让产品有温度',
    likes: 8,
    liked: false,
    folderId: 'folder-3',
    order: 0,
    createdAt: Date.now() - 36000000,
  },
  {
    id: 'card-4',
    type: CardType.LINK,
    title: 'React 官方文档',
    description: 'React 最新官方文档，学习 React 的最佳资源',
    url: 'https://react.dev',
    likes: 15,
    liked: false,
    folderId: 'folder-2',
    order: 0,
    createdAt: Date.now() - 24000000,
  },
  {
    id: 'card-5',
    type: CardType.IMAGE,
    title: '极简建筑摄影',
    imageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400',
    likes: 30,
    liked: true,
    folderId: 'folder-1',
    order: 0,
    createdAt: Date.now() - 12000000,
  },
];

const loadImageAsBlob = (url: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          },
          'image/jpeg',
          0.92
        );
      } catch (canvasError) {
        reject(canvasError);
      }
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
};

const fetchImageWithProxyFallback = async (url: string): Promise<Blob> => {
  try {
    return await loadImageAsBlob(url);
  } catch (_imgError) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { responseType: 'blob' });
      return response.data;
    } catch (proxyError) {
      throw proxyError;
    }
  }
};

type CreateCardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (type: CardType, data: Partial<Card>) => void;
};

const CreateCardModal: React.FC<CreateCardModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [cardType, setCardType] = useState<CardType>(CardType.TEXT);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const typeLabels: Record<CardType, string> = {
    [CardType.LINK]: `${CARD_TYPE_CONFIG[CardType.LINK].icon} ${CARD_TYPE_CONFIG[CardType.LINK].label}`,
    [CardType.IMAGE]: `${CARD_TYPE_CONFIG[CardType.IMAGE].icon} ${CARD_TYPE_CONFIG[CardType.IMAGE].label}`,
    [CardType.TEXT]: `${CARD_TYPE_CONFIG[CardType.TEXT].icon} ${CARD_TYPE_CONFIG[CardType.TEXT].label}`,
  };

  const handleFetchLink = async () => {
    if (!linkUrl) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent(linkUrl)}`);
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data.contents, 'text/html');
      const pageTitle = doc.querySelector('title')?.textContent || '';
      const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      setTitle(pageTitle);
      if (description && !textContent) {
        setTextContent(description);
      }
    } catch (error) {
      console.error('Failed to fetch link metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    const cardData: Partial<Card> = {
      title: title || undefined,
    };

    switch (cardType) {
      case CardType.LINK:
        cardData.url = linkUrl;
        cardData.description = textContent || undefined;
        break;
      case CardType.IMAGE:
        cardData.imageUrl = imageUrl;
        break;
      case CardType.TEXT:
        cardData.content = textContent;
        break;
    }

    onCreate(cardType, cardData);
    onClose();
    setLinkUrl('');
    setImageUrl('');
    setTextContent('');
    setTitle('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>创建灵感卡片</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="type-selector">
            {Object.values(CardType).map((type) => {
              const config = CARD_TYPE_CONFIG[type];
              const isActive = cardType === type;
              return (
                <button
                  key={type}
                  className={`type-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setCardType(type)}
                  style={{
                    borderColor: isActive ? config.color : '#dee2e6',
                    background: isActive ? `${config.color}1A` : 'white',
                    color: isActive ? config.color : '#495057',
                  }}
                >
                  {typeLabels[type]}
                </button>
              );
            })}
          </div>

          {cardType === CardType.LINK && (
            <div className="form-group">
              <label>链接地址</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onBlur={handleFetchLink}
              />
              {isLoading && <span className="loading-text">正在抓取页面信息...</span>}
            </div>
          )}

          {cardType === CardType.IMAGE && (
            <div className="form-group">
              <label>图片 URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              {imageUrl && (
                <div className="image-preview">
                  <img src={imageUrl} alt="预览" />
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>{cardType === CardType.TEXT ? '内容 (支持 Markdown)' : '标题'}</label>
            {cardType === CardType.TEXT ? (
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="输入你的灵感..."
                rows={6}
              />
            ) : (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="卡片标题"
              />
            )}
          </div>

          {cardType !== CardType.TEXT && (
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="简短描述..."
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            创建
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isGalleryMode, setIsGalleryMode] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCards = useMemo(() => {
    let result = cards;

    if (selectedFolderId !== null) {
      result = result.filter((card) => card.folderId === selectedFolderId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (card) =>
          card.title?.toLowerCase().includes(query) ||
          card.description?.toLowerCase().includes(query) ||
          card.content?.toLowerCase().includes(query) ||
          card.url?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [cards, selectedFolderId, searchQuery]);

  const foldersWithCounts = useMemo(() => {
    return folders.map((folder) => ({
      ...folder,
      cardCount: cards.filter((card) => card.folderId === folder.id).length,
    }));
  }, [folders, cards]);

  const handleLike = useCallback((cardId: string) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          return {
            ...card,
            liked: !card.liked,
            likes: card.liked ? card.likes - 1 : card.likes + 1,
          };
        }
        return card;
      })
    );
  }, []);

  const handleSort = useCallback((sortedCards: Card[]) => {
    setCards((prev) => {
      const otherCards = prev.filter(
        (c) => !sortedCards.some((sc) => sc.id === c.id)
      );
      return [...sortedCards, ...otherCards];
    });
  }, []);

  const handleCreateFolder = useCallback((name: string) => {
    const newFolder: Folder = {
      id: generateId(),
      name,
      cardCount: 0,
    };
    setFolders((prev) => [...prev, newFolder]);
  }, []);

  const handleCardDrop = useCallback((cardId: string, folderId: string | null) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          return { ...card, folderId: folderId || undefined };
        }
        return card;
      })
    );
  }, []);

  const handleCreateCard = useCallback(
    (type: CardType, data: Partial<Card>) => {
      const newCard: Card = {
        id: generateId(),
        type,
        title: data.title,
        description: data.description,
        url: data.url,
        imageUrl: data.imageUrl,
        content: data.content,
        likes: 0,
        liked: false,
        folderId: selectedFolderId || undefined,
        order: filteredCards.length,
        createdAt: Date.now(),
      };
      setCards((prev) => [...prev, newCard]);
    },
    [selectedFolderId, filteredCards.length]
  );

  const handleExportJSON = useCallback(() => {
    const exportData = {
      cards,
      folders,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, `inspiration-board-${Date.now()}.json`);
  }, [cards, folders]);

  const handleExportZIP = useCallback(async () => {
    const zip = new JSZip();
    const imgFolder = zip.folder('images');

    const imageCards = cards.filter((card) => card.type === CardType.IMAGE && card.imageUrl);

    for (const card of imageCards) {
      try {
        const blob = await fetchImageWithProxyFallback(card.imageUrl!);
        const fileName = `card-${card.id}.jpg`;
        imgFolder?.file(fileName, blob);
      } catch (error) {
        console.error(`Failed to download image for card ${card.id}:`, error);
        const fallbackData = {
          cardId: card.id,
          originalUrl: card.imageUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        imgFolder?.file(`card-${card.id}-failed.json`, JSON.stringify(fallbackData, null, 2));
      }
    }

    const jsonData = {
      cards,
      folders,
      exportedAt: new Date().toISOString(),
    };
    zip.file('data.json', JSON.stringify(jsonData, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `inspiration-board-${Date.now()}.zip`);
  }, [cards, folders]);

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-left">
          <h1 className="app-title">✨ 灵感收集板</h1>
        </div>
        <div className="navbar-center">
          <input
            type="text"
            className="search-input"
            placeholder="搜索灵感..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="navbar-right">
          <button className="add-btn" onClick={() => setIsCreateModalOpen(true)}>
            +
          </button>
        </div>
      </header>

      <div className="main-content">
        <FolderPanel
          folders={foldersWithCounts}
          cards={cards}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onCardDrop={handleCardDrop}
          onExportJSON={handleExportJSON}
          onExportZIP={handleExportZIP}
        />

        <CardBoard
          cards={filteredCards}
          onLike={handleLike}
          onSort={handleSort}
          isGalleryMode={isGalleryMode}
          onGalleryModeChange={setIsGalleryMode}
        />
      </div>

      <CreateCardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCard}
      />
    </div>
  );
};

export default App;
