import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ImageOff } from 'lucide-react';
import StarRating from '@/components/StarRating';
import type { TeaRecord } from '@/types';

interface CardProps {
  record: TeaRecord;
}

export default function Card({ record }: CardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 32px rgba(212,162,78,0.25)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => navigate(`/detail/${record.id}`)}
      className="bg-white/30 backdrop-blur-xl rounded-2xl overflow-hidden cursor-pointer border border-white/40 shadow-tea hover:shadow-tea-glow transition-shadow group"
    >
      <div className="relative h-48 overflow-hidden bg-tea-100">
        {record.imageUrl ? (
          <img
            src={record.imageUrl}
            alt={record.teaName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-tea-400">
            <ImageOff size={48} strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-tea-900/30 to-transparent" />
      </div>

      <div className="p-4 space-y-2.5">
        <h3 className="font-serif text-lg font-semibold text-tea-800 truncate">
          {record.teaName}
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {record.mood.map((m) => (
            <span
              key={m}
              className="px-2.5 py-0.5 bg-warm-gold/15 text-warm-gold text-xs rounded-full font-medium"
            >
              {m}
            </span>
          ))}
        </div>

        <StarRating value={record.rating} readOnly />
      </div>
    </motion.div>
  );
}
