import React, { useState, useMemo, useRef, useCallback } from 'react';
import { themes, getThemeById, type Theme } from './styles/themes';
import { parseLyrics, type ParsedLyrics } from './components/LyricsParser';
import {
  generatePoster,
  generateCardStyles,
  type PosterRenderData,
  type CardStyleData,
  POSTER_WIDTH,
  POSTER_HEIGHT,
  POSTER_PADDING
} from './components/PosterGenerator';
import CardRenderer from './components/CardRenderer';

type PreviewTab = 'poster' | 'cards';

const DEFAULT_SONG = '';
const DEFAULT_ARTIST = '';
const DEFAULT_LYRICS = `星光洒落在窗台
回忆如潮水涌来
那些年我们唱过的歌
如今只剩下空白

晚风轻轻吹过发梢
带走了最后的拥抱
说好了要一起到远方
却在半路走散了

时间是温柔的杀手
磨灭了多少等候
但我仍相信
在下一个路口
我们还会重逢

阳光总在风雨后
彩虹挂在天空
擦干眼泪继续走
梦想就在前头`;

const App: React.FC = () => {
  const [songName, setSongName] = useState(DEFAULT_SONG);
  const [artistName, setArtistName] = useState(DEFAULT_ARTIST);
  const [lyricsText, setLyricsText] = useState(DEFAULT_LYRICS);
  const [themeId, setThemeId] = useState<string>('scifi');
  const [activeTab, setActiveTab] = useState<PreviewTab>('poster');
  const [posterData, setPosterData] = useState<PosterRenderData | null>(null);
  const [cardStyles, setCardStyles] = useState<CardStyleData[]>([]);
  const [cardsGenerated, setCardsGenerated] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const posterRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<PreviewTab, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const currentTheme: Theme = useMemo(() => getThemeById(themeId), [themeId]);

  const parsedLyrics: ParsedLyrics = useMemo(() => {
    return parseLyrics(lyricsText);
  }, [lyricsText]);

  const updateTabIndicator = useCallback(() => {
    const activeEl = tabRefs.current.get(activeTab);
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth
      });
    }
  }, [activeTab]);

  React.useEffect(() => {
    updateTabIndicator();
    window.addEventListener('resize', updateTabIndicator);
    return () => window.removeEventListener('resize', updateTabIndicator);
  }, [updateTabIndicator]);

  const handleGeneratePoster = () => {
    const data = generatePoster(songName || '未命名歌曲', artistName || '未知歌手', parsedLyrics, themeId);
    setPosterData(data);
    setActiveTab('poster');
  };

  const handleGenerateCards = () => {
    if (parsedLyrics.lines.length === 0) return;
    const styles = generateCardStyles(parsedLyrics.lines, themeId);
    setCardStyles(styles);
    setCardsGenerated(true);
    setActiveTab('cards');
  };

  React.useEffect(() => {
    if (cardsGenerated) {
      const styles = generateCardStyles(parsedLyrics.lines, themeId);
      setCardStyles(styles);
    }
    if (posterData) {
      const data = generatePoster(songName || '未命名歌曲', artistName || '未知歌手', parsedLyrics, themeId);
      setPosterData(data);
    }
  }, [themeId]);

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;

    const node = posterRef.current;
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = POSTER_WIDTH * scale;
    canvas.height = POSTER_HEIGHT * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const rendered = await html2canvas(node, {
        scale: scale,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT
      });

      const link = document.createElement('a');
      const safeName = songName || 'poster';
      link.download = `${safeName}_海报.png`;
      link.href = rendered.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('海报导出失败:', err);
    }
  };

  const handleThemeColorClick = (id: string) => {
    setThemeId(id);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '24px',
        minHeight: 'calc(100vh - 48px)',
        transition: 'all 0.4s ease',
        maxWidth: '1600px',
        margin: '0 auto'
      }}
    >
      {/* 左侧表单区 */}
      <div
        style={{
          width: '380px',
          flexShrink: 0,
          background: '#1E1E2C',
          borderRadius: '16px',
          padding: '28px 24px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.4s ease'
        }}
      >
        {/* 主题选择器 - 固定在左上角 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 32px)',
            gridTemplateRows: 'repeat(2, 32px)',
            gap: '10px',
            marginBottom: '28px'
          }}
        >
          {themes.flatMap(theme => [
            {
              key: `${theme.id}-primary`,
              color: theme.primaryColor,
              onClick: () => handleThemeColorClick(theme.id)
            },
            {
              key: `${theme.id}-secondary`,
              color: theme.secondaryColor,
              onClick: () => handleThemeColorClick(theme.id)
            }
          ]).map(item => (
            <button
              key={item.key}
              onClick={item.onClick}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: item.color,
                border: themeId === item.key.split('-')[0]
                  ? '3px solid #42A5F5'
                  : '2px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
                transform: themeId === item.key.split('-')[0] ? 'scale(1.1)' : 'scale(1)',
                boxShadow: themeId === item.key.split('-')[0]
                  ? `0 0 12px ${item.color}`
                  : 'none',
                padding: 0
              }}
            />
          ))}
        </div>

        {/* 标题 */}
        <div
          style={{
            marginBottom: '28px'
          }}
        >
          <h1
            style={{
              color: '#FFFFFF',
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '2px',
              marginBottom: '6px'
            }}
          >
            曲韵画坊
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              margin: 0,
              letterSpacing: '1px'
            }}
          >
            当前主题：<span style={{ color: currentTheme.secondaryColor, fontWeight: 500 }}>{currentTheme.name}</span>
          </p>
        </div>

        {/* 输入区 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 歌曲名称 */}
          <div style={{ position: 'relative' }}>
            <label
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                marginBottom: '8px',
                letterSpacing: '1px'
              }}
            >
              歌曲名称
            </label>
            <input
              type="text"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              onFocus={() => setFocusedField('song')}
              onBlur={() => setFocusedField(null)}
              placeholder="请输入歌曲名称"
              style={{
                width: '100%',
                background: '#2A2A3E',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '12px',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                transition: 'box-shadow 0.2s ease',
                boxShadow: focusedField === 'song'
                  ? '0 6px 20px rgba(66, 165, 245, 0.25)'
                  : 'none'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: focusedField === 'song' ? '#42A5F5' : '#B0BEC5',
                transition: 'background 0.2s ease',
                borderRadius: '0 0 8px 8px'
              }}
            />
          </div>

          {/* 歌手名 */}
          <div style={{ position: 'relative' }}>
            <label
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                marginBottom: '8px',
                letterSpacing: '1px'
              }}
            >
              歌手名
            </label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              onFocus={() => setFocusedField('artist')}
              onBlur={() => setFocusedField(null)}
              placeholder="请输入歌手名"
              style={{
                width: '100%',
                background: '#2A2A3E',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '12px',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                transition: 'box-shadow 0.2s ease',
                boxShadow: focusedField === 'artist'
                  ? '0 6px 20px rgba(66, 165, 245, 0.25)'
                  : 'none'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: focusedField === 'artist' ? '#42A5F5' : '#B0BEC5',
                transition: 'background 0.2s ease',
                borderRadius: '0 0 8px 8px'
              }}
            />
          </div>

          {/* 歌词文本 */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}
            >
              <label
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '12px',
                  letterSpacing: '1px'
                }}
              >
                歌词文本
              </label>
              <span
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '11px'
                }}
              >
                {lyricsText.length} 字符 · {parsedLyrics.totalLines} 行
              </span>
            </div>
            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              onFocus={() => setFocusedField('lyrics')}
              onBlur={() => setFocusedField(null)}
              placeholder="请输入歌词，每行一句..."
              rows={12}
              style={{
                width: '100%',
                background: '#2A2A3E',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '12px',
                color: '#FFFFFF',
                fontSize: '13px',
                lineHeight: 1.8,
                outline: 'none',
                resize: 'vertical',
                minHeight: '200px',
                maxHeight: '360px',
                transition: 'box-shadow 0.2s ease',
                boxShadow: focusedField === 'lyrics'
                  ? '0 6px 20px rgba(66, 165, 245, 0.25)'
                  : 'none',
                fontFamily: 'inherit'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '2px',
                left: 0,
                right: 0,
                height: '2px',
                background: focusedField === 'lyrics' ? '#42A5F5' : '#B0BEC5',
                transition: 'background 0.2s ease',
                borderRadius: '0 0 8px 8px'
              }}
            />
          </div>

          {/* 操作按钮 */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px'
            }}
          >
            <button
              onClick={handleGeneratePoster}
              style={getButtonStyle(false)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#1E88E5';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#42A5F5';
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              🎨 生成海报
            </button>
            <button
              onClick={handleGenerateCards}
              style={getButtonStyle(false)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#1E88E5';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#42A5F5';
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              🃏 生成卡片
            </button>
          </div>

          {/* 统计信息 */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '16px',
              marginTop: '4px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}
            >
              <StatItem label="总行数" value={parsedLyrics.totalLines.toString()} />
              <StatItem label="总字符" value={parsedLyrics.totalChars.toString()} />
              <StatItem label="平均长度" value={parsedLyrics.averageLength.toString()} />
              <StatItem label="最长句子" value={
                parsedLyrics.lines.length > 0
                  ? Math.max(...parsedLyrics.lines.map(l => l.length)).toString()
                  : '0'
              } />
            </div>
          </div>
        </div>
      </div>

      {/* 右侧预览区 */}
      <div
        style={{
          flex: 1,
          background: '#F5F5F5',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'all 0.4s ease'
        }}
      >
        {/* Tab 标签栏 */}
        <div
          style={{
            height: '48px',
            background: '#FFFFFF',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            position: 'relative',
            alignItems: 'center',
            padding: '0 16px',
            gap: '8px'
          }}
        >
          <button
            ref={(el) => {
              if (el) tabRefs.current.set('poster', el);
            }}
            onClick={() => setActiveTab('poster')}
            style={{
              height: '48px',
              padding: '0 24px',
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'poster' ? 600 : 400,
              color: activeTab === 'poster' ? '#42A5F5' : '#666',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              letterSpacing: '1px'
            }}
          >
            🖼️ 海报预览
          </button>
          <button
            ref={(el) => {
              if (el) tabRefs.current.set('cards', el);
            }}
            onClick={() => setActiveTab('cards')}
            style={{
              height: '48px',
              padding: '0 24px',
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'cards' ? 600 : 400,
              color: activeTab === 'cards' ? '#42A5F5' : '#666',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              letterSpacing: '1px'
            }}
          >
            🎴 歌词卡片 {parsedLyrics.totalLines > 0 && `(${parsedLyrics.totalLines})`}
          </button>

          {/* 滑动指示条 */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              height: '3px',
              background: '#42A5F5',
              transition: 'all 0.3s ease',
              borderRadius: '2px 2px 0 0'
            }}
          />
        </div>

        {/* 预览内容区 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {activeTab === 'poster' && (
            <PosterPreviewSection
              posterData={posterData}
              posterRef={posterRef}
              songName={songName}
              artistName={artistName}
              theme={currentTheme}
              onDownload={handleDownloadPoster}
              onGenerate={handleGeneratePoster}
            />
          )}

          {activeTab === 'cards' && (
            <div
              style={{
                width: '100%',
                maxWidth: '1100px'
              }}
            >
              <CardRenderer
                lyrics={cardsGenerated ? parsedLyrics.lines : []}
                cardStyles={cardStyles}
                songName={songName}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getButtonStyle(_disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '12px 16px',
    background: '#42A5F5',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '1px',
    transition: 'all 0.1s ease',
    whiteSpace: 'nowrap'
  };
}

const StatItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div
      style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: '11px',
        marginBottom: '4px',
        letterSpacing: '1px'
      }}
    >
      {label}
    </div>
    <div
      style={{
        color: '#FFFFFF',
        fontSize: '18px',
        fontWeight: 600
      }}
    >
      {value}
    </div>
  </div>
);

interface PosterPreviewSectionProps {
  posterData: PosterRenderData | null;
  posterRef: React.RefObject<HTMLDivElement>;
  songName: string;
  artistName: string;
  theme: Theme;
  onDownload: () => void;
  onGenerate: () => void;
}

const PosterPreviewSection: React.FC<PosterPreviewSectionProps> = ({
  posterData,
  posterRef,
  songName,
  artistName,
  theme,
  onDownload,
  onGenerate
}) => {
  if (!posterData) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '100px 20px',
          color: '#999'
        }}
      >
        <div style={{ fontSize: '80px', marginBottom: '20px', opacity: 0.3 }}>🎨</div>
        <p style={{ fontSize: '16px', marginBottom: '8px', color: '#666' }}>还没有生成海报</p>
        <p style={{ fontSize: '13px', marginBottom: '24px', color: '#999' }}>请在左侧输入信息后点击"生成海报"</p>
        <button
          onClick={onGenerate}
          style={{
            padding: '12px 32px',
            background: '#42A5F5',
            color: '#fff',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '1px',
            transition: 'all 0.1s ease'
          }}
        >
          立即生成海报
        </button>
      </div>
    );
  }

  const { layout, style, displayLyrics } = posterData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 海报容器 - 用于导出 */}
      <div
        ref={posterRef}
        style={{
          ...style.containerStyle,
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
        }}
      >
        {/* 背景 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: style.background,
            borderRadius: '12px'
          }}
        />
        {/* 纹理叠加 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: theme.texturePattern,
            backgroundRepeat: 'repeat',
            opacity: 1,
            borderRadius: '12px'
          }}
        />
        {/* 装饰元素 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '300px',
            background: `radial-gradient(circle, ${theme.secondaryColor}22 0%, transparent 70%)`,
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '400px',
            height: '400px',
            background: `radial-gradient(circle, ${theme.primaryColor}33 0%, transparent 70%)`,
            pointerEvents: 'none'
          }}
        />

        {/* 歌名 */}
        <div
          style={{
            position: 'absolute',
            top: `${layout.titlePosition.y}px`,
            left: `${layout.titlePosition.x}px`,
            right: `${POSTER_PADDING}px`,
            ...style.titleStyle
          }}
        >
          {songName || '未命名歌曲'}
        </div>

        {/* 装饰线 */}
        <div
          style={{
            position: 'absolute',
            top: `${layout.titlePosition.y + 70}px`,
            left: `${POSTER_PADDING}px`,
            width: '60px',
            height: '3px',
            background: theme.secondaryColor,
            borderRadius: '2px'
          }}
        />

        {/* 歌手名 */}
        <div
          style={{
            position: 'absolute',
            top: `${layout.artistPosition.y + 50}px`,
            left: `${layout.artistPosition.x}px`,
            ...style.artistStyle
          }}
        >
          — {artistName || '未知歌手'}
        </div>

        {/* 歌词区域 - 右下 */}
        <div
          style={{
            position: 'absolute',
            left: `${layout.lyricsArea.x}px`,
            top: `${layout.lyricsArea.y}px`,
            width: `${layout.lyricsArea.width}px`,
            height: `${layout.lyricsArea.height}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            textAlign: 'right'
          }}
        >
          {displayLyrics.map((line, idx) => (
            <div
              key={line.id}
              style={{
                ...style.lyricLineStyle,
                opacity: 0.5 + (idx / displayLyrics.length) * 0.5
              }}
            >
              {line.text}
            </div>
          ))}
        </div>

        {/* 底部装饰 */}
        <div
          style={{
            position: 'absolute',
            bottom: `${POSTER_PADDING - 60}px`,
            left: `${POSTER_PADDING}px`,
            color: 'rgba(255,255,255,0.2)',
            fontSize: '11px',
            letterSpacing: '6px',
            fontFamily: style.artistStyle.fontFamily
          }}
        >
          ♪ 曲韵画坊 · 为音乐而生 ♪
        </div>
      </div>

      {/* 下载按钮 */}
      <button
        onClick={onDownload}
        style={{
          marginTop: '28px',
          padding: '14px 40px',
          background: '#42A5F5',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '10px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '2px',
          boxShadow: '0 8px 24px rgba(66, 165, 245, 0.35)',
          transition: 'all 0.1s ease'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#1E88E5';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#42A5F5';
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
      >
        💾 下载海报
      </button>

      <p
        style={{
          marginTop: '12px',
          color: '#999',
          fontSize: '12px'
        }}
      >
        A4 比例 · {POSTER_WIDTH} × {POSTER_HEIGHT} px
      </p>
    </div>
  );
};

export default App;
