import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, History, Settings, BookOpen, ShieldCheck,
  Briefcase, Sparkles,
} from 'lucide-react';
import type { Subject } from '../types';

const iconMap: Record<string, React.ReactNode> = {
  'java-basic': <BookOpen style={{ width: 32, height: 32 }} />,
  'project-management': <Briefcase style={{ width: 32, height: 32 }} />,
  'network-security': <ShieldCheck style={{ width: 32, height: 32 }} />,
};

const iconColors: Record<string, string> = {
  'java-basic': 'linear-gradient(135deg, #f6ad55, #ed8936)',
  'project-management': 'linear-gradient(135deg, #4fd1c5, #38b2ac)',
  'network-security': 'linear-gradient(135deg, #63b3ed, #4299e1)',
};

export function HomePage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/subjects');
        if (res.ok) {
          const data: Subject[] = await res.json();
          setSubjects(data);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ background: '#f7fafc' }}
    >
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <header className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 mb-5 rounded-full"
            style={{
              background: '#ebf8ff',
              color: '#2c5282',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Sparkles style={{ width: 14, height: 14 }} />
            职业资格模拟考试平台
          </div>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: '#2d3748',
              marginBottom: 12,
              letterSpacing: -0.5,
            }}
          >
            让每一次练习，都更接近<span style={{ color: '#3182ce' }}>通过</span>
          </h1>
          <p
            style={{
              fontSize: 16,
              color: '#718096',
              maxWidth: 560,
              margin: '0 auto',
              lineHeight: 1.7,
            }}
          >
            精选多科目真题，限时模拟真实考场环境。智能评分、错题解析、知识点分析报告，
            帮助您高效备考。
          </p>
        </header>

        <div
          className="flex items-center justify-between mb-6"
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#2d3748',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: '#3182ce',
                borderRadius: 2,
              }}
            />
            选择考试科目
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/history')}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
              className="flex items-center gap-2 px-4 py-2.5"
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                color: '#4a5568',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'transform 0.1s, box-shadow 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <History style={{ width: 16, height: 16 }} />
              历史成绩
            </button>
            <button
              onClick={() => navigate('/admin')}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
              className="flex items-center gap-2 px-4 py-2.5"
              style={{
                background: '#3182ce',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'transform 0.1s, background 0.2s',
              }}
            >
              <Settings style={{ width: 16, height: 16 }} />
              管理后台
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 200,
                  background: 'white',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
            }}
          >
            {subjects.map((s) => (
              <div
                key={s.id}
                onClick={() =>
                  navigate(
                    `/exam/${s.id}/${encodeURIComponent(s.name)}`
                  )
                }
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0