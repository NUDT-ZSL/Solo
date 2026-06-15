import React, { useCallback, useMemo, useRef, useState } from 'react';
import Timeline from './Timeline';
import FilterPanel from './FilterPanel';
import { processData, getMonthlyStats, sentimentToColor } from './utils/dataProcessor';
import type { ProcessedEntry, RawEntry } from './utils/dataProcessor';

const SAMPLE_DATA: RawEntry[] = [
  { date: '2025-01-05', text: '新年伊始，满怀期待和希望，写下新一年的愿望清单，愿一切顺遂。' },
  { date: '2025-01-18', text: '寒冬腊月，窗外大雪纷飞，围炉读书，内心安宁而满足。' },
  { date: '2025-02-14', text: '情人节快乐！收到一束温暖的玫瑰，幸福感满满。' },
  { date: '2025-02-28', text: '月末忙碌，工作堆积如山，疲惫不堪，但依然坚持。' },
  { date: '2025-03-08', text: '春暖花开，散步在樱花树下，生活真美好。' },
  { date: '2025-03-22', text: '和老朋友久别重逢，畅聊到深夜，感动和欣喜交织。' },
  { date: '2025-04-05', text: '清明时节雨纷纷，思念故人，有些悲伤和惆怅。' },
  { date: '2025-04-20', text: '项目终于上线了！团队庆祝，满满的骄傲和自豪。' },
  { date: '2025-05-01', text: '假期出游，阳光明媚，登上山顶，感觉无比自由。' },
  { date: '2025-05-15', text: '焦虑的事情终于有了结果，虽然不尽如人意，但至少尘埃落定。' },
  { date: '2025-06-01', text: '儿童节陪侄子玩耍，欢笑声中仿佛回到童年。' },
  { date: '2025-06-18', text: '连续加班两周，身心俱疲，但想到目标又咬牙坚持。' },
  { date: '2025-07-07', text: '小暑，夏日炎炎，一杯冰镇绿豆汤沁人心脾。' },
  { date: '2025-07-20', text: '夜跑五公里，大汗淋漓后心情格外舒畅，快乐就是这么简单。' },
  { date: '2025-08-15', text: '中秋月圆，家人团聚，吃月饼赏月，幸福温馨。' },
  { date: '2025-08-28', text: '暴雨连绵，心情低落，有些孤独和无奈。' },
  { date: '2025-09-10', text: '教师节感怀师恩，回忆求学时光，温馨而感动。' },
  { date: '2025-09-25', text: '秋天来了，天气转凉，落叶纷飞中有一丝惆怅。' },
  { date: '2025-10-01', text: '国庆阅兵壮观，为祖国骄傲自豪！烟花灿烂，精彩绝伦。' },
  { date: '2025-10-20', text: '深秋登高，层林尽染，美不胜收，心灵被治愈。' },
  { date: '2025-11-11', text: '独自过双十一，有点寂寞，但给自己买了喜欢的东西，也算小确幸。' },
  { date: '2025-11-25', text: '感恩节，感谢生命中所有温暖的相遇，心存感恩。' },
  { date: '2025-12-15', text: '年底总结，回顾这一年的得与失，有遗憾也有收获。' },
  { date: '2025-12-31', text: '跨年夜，和朋友们一起倒数，烟花绽放，满怀希望迎接新年！' },
];

const MonthlyChart: React.FC<{ entries: ProcessedEntry[] }> = ({ entries }) => {
  const stats = useMemo(() => getMonthlyStats(entries), [entries]);
  const maxCount = Math.max(...stats.map((s) => s.count), 1);
  const chartWidth = 200;
  const chartHeight = 280;
  const barWidth = 12;
  const barGap = (chartWidth - 24) / 12;

  return (
    <div
      style={{
        width: 240,
        height: '100%',
        padding: '20px 16px',
        background: 'rgba(245, 239, 224, 0.3)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(180, 165, 140, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <h3
        style={{
          fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
          fontSize: 16,
          color: '#5a4a3a',
          margin: 0,
          paddingBottom: 8,
          borderBottom: '2px solid rgba(90, 74, 58, 0.2)',
          letterSpacing: 4,
          textAlign: 'center',
        }}
      >
        月 度 统 计
      </h3>
      <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <defs>
          <filter id="chart-ink-blur">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>
        {stats.map((s, i) => {
          const barHeight = (s.count / maxCount) * (chartHeight - 60);
          const x = 12 + i * barGap;
          const y = chartHeight - 30 - barHeight;
          const color = sentimentToColor(s.avgSentiment);
          return (
            <g key={s.month}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                opacity={0.2}
                filter="url(#chart-ink-blur)"
                rx={2}
              />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                opacity={0.7}
                rx={2}
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight - 14}
                textAnchor="middle"
                fontSize={9}
                fill="#8a7a6a"
                fontFamily="'KaiTi', 'STKaiti', '楷体', serif"
              >
                {s.month}
              </text>
              {s.count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#7a6a5a"
                  fontFamily="'KaiTi', 'STKaiti', '楷体', serif"
                >
                  {s.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div
        style={{
          fontSize: 11,
          color: '#a09888',
          fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
          textAlign: 'center',
          marginTop: 'auto',
          lineHeight: 1.6,
        }}
      >
        共 {entries.length} 条记录
        <br />
        墨迹颜色冷暖映射情感
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [rawData, setRawData] = useState<RawEntry[]>(SAMPLE_DATA);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(() => new Set([1,2,3,4,5,6,7,8,9,10,11,12]));
  const [sentimentRange, setSentimentRange] = useState<[number, number]>([0, 1]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allProcessed = useMemo(() => processData(rawData), [rawData]);

  const filteredEntries = useMemo(() => {
    return allProcessed.filter((e) => {
      if (!selectedMonths.has(e.month)) return false;
      if (e.sentiment < sentimentRange[0] || e.sentiment > sentimentRange[1]) return false;
      return true;
    });
  }, [allProcessed, selectedMonths, sentimentRange]);

  const handleMonthToggle = useCallback((month: number) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  }, []);

  const handleFileImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (Array.isArray(json)) {
          setRawData(json);
          setSelectedMonths(new Set([1,2,3,4,5,6,7,8,9,10,11,12]));
          setSentimentRange([0, 1]);
        }
      } catch {
        alert('JSON 解析失败，请检查格式。');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedMonths(new Set([1,2,3,4,5,6,7,8,9,10,11,12]));
    setSentimentRange([0, 1]);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f5efe0 0%, #e8e0d0 40%, #ddd8cc 100%)',
        overflow: 'hidden',
        fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }}
      />

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid rgba(180, 165, 140, 0.3)',
          position: 'relative',
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
            fontSize: 28,
            color: '#3a2a1a',
            margin: 0,
            letterSpacing: 8,
            textShadow: '2px 2px 4px rgba(90, 74, 58, 0.15)',
          }}
        >
          墨 迹 年 鉴
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={handleFileImport}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '2.5px solid #8a3a2a',
              background: 'rgba(140, 58, 42, 0.06)',
              color: '#8a3a2a',
              fontSize: 13,
              fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: 2,
              lineHeight: 1.4,
              boxShadow: '0 2px 8px rgba(140, 58, 42, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(140, 58, 42, 0.15)';
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(140, 58, 42, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(140, 58, 42, 0.06)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(140, 58, 42, 0.1)';
            }}
          >
            <span style={{ fontSize: 18 }}>印</span>
            <span style={{ fontSize: 10 }}>导入</span>
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <FilterPanel
          selectedMonths={selectedMonths}
          sentimentRange={sentimentRange}
          onMonthToggle={handleMonthToggle}
          onSentimentChange={setSentimentRange}
          onReset={handleReset}
        />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Timeline entries={filteredEntries} />
          {filteredEntries.length === 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b0a898',
                fontSize: 16,
                fontFamily: "'KaiTi', 'STKaiti', '楷体', serif",
                letterSpacing: 4,
              }}
            >
              暂无匹配记录，请调整筛选条件
            </div>
          )}
        </div>

        <MonthlyChart entries={filteredEntries} />
      </div>
    </div>
  );
};

export default App;
