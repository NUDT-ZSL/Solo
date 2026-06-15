import type { Book } from '../types';

interface RecommendCardProps {
  book: Book;
}

export default function RecommendCard({ book }: RecommendCardProps) {
  return (
    <div
      className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ease-out hover:-translate-y-1"
      style={{
        width: '200px',
        height: '280px',
        borderRadius: '12px',
        background: book.coverGradient,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
    >
      <div className="px-4 text-center">
        <h3 className="text-lg font-bold text-white drop-shadow-md leading-relaxed">
          {book.title}
        </h3>
      </div>
    </div>
  );
}
