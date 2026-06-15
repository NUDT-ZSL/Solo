import { useState, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { YearlyReport, TopSong, Platform } from '../types';

interface ReportGeneratorProps {
  report: YearlyReport | null;
  platforms: Platform[];
}

function DonutChart({ data }: { data: YearlyReport['genreDistribution'] }) {
  const radius = 80;
  const strokeWidth = 40;
  const cx = 100;
  const cy = 100;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="donut-chart-wrapper">
      <svg width={200} height={200} viewBox="0 0 200 200">
        {data.map((item, i) => {
          const segmentLength = (item.percentage / 100) * circumference;
          const currentOffset = offset;
          offset += segmentLength;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          className="donut-center-text"
          fill="#1a1a2e"
        >
          曲风
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="donut-center-sub"
          fill="#666"
        >
          {data.length}种
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((item, i) => (
          <div key={i} className="donut-legend-item">
            <div
              className="donut-legend-dot"
              style={{ background: item.color }}
            />
            <span className="donut-legend-label">{item.genre}</span>
            <span className="donut-legend-value">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SongCard({
  song,
  platforms,
  isSelected,
  onClick,
}: {
  song: TopSong;
  platforms: Platform[];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`song-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div
        className="song-card-cover"
        style={{ background: song.coverColor }}
      />
      <div className="song-card-info">
        <div className="song-card-title">{song.title}</div>
        <div className="song-card-artist">{song.artist}</div>
        <div className="song-card-plays">
          <span style={{ color: '#ff6b6b', fontWeight: 700 }}>+</span>
          {song.playCount}次
        </div>
      </div>
    </div>
  );
}

function SongBubble({
  song,
  platforms,
  onClose,
}: {
  song: TopSong;
  platforms: Platform[];
  onClose: () => void;
}) {
  const maxCount = Math.max(...Object.values(song.platformDistribution), 1);

  return (
    <div className="song-bubble-overlay" onClick={onClose}>
      <div className="song-bubble" onClick={(e) => e.stopPropagation()}>
        <div className="bubble-header">
          <div className="bubble-title">{song.title}</div>
          <div className="bubble-artist">{song.artist}</div>
        </div>
        <div className="bubble-stat-row">
          <span className="bubble-stat-label">总播放次数</span>
          <span className="bubble-stat-value" style={{ color: '#ff6b6b' }}>
            {song.playCount}
          </span>
        </div>
        <div className="bubble-stat-row">
          <span className="bubble-stat-label">首次收听</span>
          <span className="bubble-stat-value">{song.firstPlayDate}</span>
        </div>
        <div className="bubble-divider" />
        <div className="bubble-chart-title">平台分布</div>
        <div className="bubble-chart">
          {platforms.map((p) => {
            const count = song.platformDistribution[p.id] || 0;
            if (count === 0) return null;
            const width = (count / maxCount) * 100;
            return (
              <div key={p.id} className="bubble-bar-row">
                <span className="bubble-bar-label">{p.name}</span>
                <div className="bubble-bar-track">
                  <div
                    className="bubble-bar-fill"
                    style={{ width: `${width}%`, background: p.color }}
                  />
                </div>
                <span className="bubble-bar-value">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ReportGenerator({ report, platforms }: ReportGeneratorProps) {
  const [selectedSong, setSelectedSong] = useState<TopSong | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f5f5f5',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('年度音乐报告.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  if (!report) {
    return (
      <div className="report-empty">
        <div className="report-empty-text">请先配置平台Token以生成报告</div>
      </div>
    );
  }

  return (
    <div className="report-wrapper">
      <div className="report-content" ref={reportRef} id="report-content">
        <div className="rainbow-bar" />

        <div className="report-section total-plays-section">
          <div className="total-plays-label">年度总播放量</div>
          <div className="total-plays-number">
            <span style={{ color: '#ff6b6b' }}>+</span>
            {report.totalPlays.toLocaleString()}
          </div>
        </div>

        <div className="report-section">
          <h2 className="section-title">最爱歌曲</h2>
          <div className="song-cards-grid">
            {report.topSongs.slice(0, 6).map((song) => (
              <SongCard
                key={song.id}
                song={song}
                platforms={platforms}
                isSelected={selectedSong?.id === song.id}
                onClick={() =>
                  setSelectedSong(
                    selectedSong?.id === song.id ? null : song
                  )
                }
              />
            ))}
          </div>
        </div>

        <div className="report-section">
          <h2 className="section-title">最爱歌手</h2>
          <div className="artist-list">
            {report.topArtists.map((artist, i) => (
              <div key={i} className="artist-item">
                <div
                  className="artist-avatar"
                  style={{ background: artist.avatarColor }}
                >
                  {artist.name[0]}
                </div>
                <div className="artist-info">
                  <div className="artist-name">{artist.name}</div>
                  <div className="artist-plays">
                    {artist.playCount}次播放
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="report-section">
          <h2 className="section-title">曲风比例</h2>
          <DonutChart data={report.genreDistribution} />
        </div>
      </div>

      {selectedSong && (
        <SongBubble
          song={selectedSong}
          platforms={platforms}
          onClose={() => setSelectedSong(null)}
        />
      )}

      <button
        className={`export-btn ${exporting ? 'exporting' : ''}`}
        onClick={handleExportPDF}
        disabled={exporting}
        aria-label="导出PDF"
      >
        <Download size={24} color="#fff" />
      </button>
    </div>
  );
}
