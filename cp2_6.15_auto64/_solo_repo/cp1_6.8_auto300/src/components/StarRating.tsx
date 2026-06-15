import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  readOnly?: boolean;
  onChange?: (value: number) => void;
}

export default function StarRating({ value, readOnly = false, onChange }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform disabled:pointer-events-none`}
        >
          <Star
            size={18}
            className={
              star <= value
                ? 'fill-warm-gold text-warm-gold'
                : 'fill-transparent text-tea-300'
            }
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
