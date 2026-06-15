import { Book } from '../types';
import BookCard from './BookCard';

interface RecommendBarProps {
  books: Book[];
  onBookClick: (book: Book) => void;
  title?: string;
}

const RecommendBar = ({ books, onBookClick, title = '为你推荐' }: RecommendBarProps) => {
  if (books.length === 0) {
    return null;
  }
  
  return (
    <div className="recommend-bar">
      <h2 className="recommend-bar__title">{title}</h2>
      <div className="recommend-bar__scroll">
        <div className="recommend-bar__track">
          {books.map(book => (
            <div key={book.id} className="recommend-bar__item">
              <BookCard book={book} onClick={onBookClick} size="small" />
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        .recommend-bar {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #E8D8C8;
        }
        
        .recommend-bar__title {
          font-size: 18px;
          font-weight: 600;
          color: #2D3436;
          margin: 0 0 16px 0;
        }
        
        .recommend-bar__scroll {
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: #E8D8C8 transparent;
          padding-bottom: 8px;
        }
        
        .recommend-bar__scroll::-webkit-scrollbar {
          height: 6px;
        }
        
        .recommend-bar__scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .recommend-bar__scroll::-webkit-scrollbar-thumb {
          background: #E8D8C8;
          border-radius: 3px;
        }
        
        .recommend-bar__scroll::-webkit-scrollbar-thumb:hover {
          background: #D8C8B8;
        }
        
        .recommend-bar__track {
          display: flex;
          gap: 16px;
          padding-right: 8px;
        }
        
        .recommend-bar__item {
          flex-shrink: 0;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        
        .recommend-bar__item:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default RecommendBar;
