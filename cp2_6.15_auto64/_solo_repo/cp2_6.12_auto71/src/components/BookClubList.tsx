import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Calendar, MapPin } from 'lucide-react';
import axios from 'axios';
import type { BookClub } from '../types';

export default function BookClubList() {
  const [bookClubs, setBookClubs] = useState<BookClub[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/bookclubs')
      .then(res => setBookClubs(res.data))
      .catch(err => console.error('获取书会列表失败:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-violet-theme border-t-transparent rounded-full loader" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 pt-6 pb-12">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl md:text-3xl font-bold text-coffee mb-8"
      >
        本月书会
      </motion.h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookClubs.map((club, index) => (
          <motion.div
            key={club.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            onClick={() => navigate(`/bookclub/${club.id}`)}
            className="cursor-pointer rounded-xl overflow-hidden bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <div 
              className="h-40 flex items-center justify-center text-6xl relative overflow-hidden"
              style={{ background: club.coverBg }}
            >
              <span className="group-hover:scale-110 transition-transform duration-300">
                {club.coverIcon}
              </span>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-coffee mb-3 group-hover:text-violet-theme transition-colors duration-200">
                {club.name}
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-theme flex-shrink-0" />
                  <span>{club.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-violet-theme flex-shrink-0" />
                  <span className="truncate">{club.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-theme flex-shrink-0" />
                  <span>{club.registeredCount} 人已报名</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
