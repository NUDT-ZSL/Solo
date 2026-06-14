import { v4 as uuidv4 } from 'uuid';
import type { SummaryItem, Speaker, VideoMetadata } from '../types';

const DEFAULT_SPEAKERS: Speaker[] = [
  { id: 's1', name: '张经理', color: '#e94560' },
  { id: 's2', name: '李工程师', color: '#0f3460' },
  { id: 's3', name: '王设计师', color: '#533483' },
  { id: 's4', name: '陈产品', color: '#16c79a' }
];

const PRESET_TOPICS = [
  { topic: '项目进度汇报', keywords: ['进度', '里程碑', '完成情况'] },
  { topic: '产品需求讨论', keywords: ['需求', '功能', '用户'] },
  { topic: '技术方案评审', keywords: ['架构', '性能', '技术选型'] },
  { topic: 'UI设计评审', keywords: ['设计稿', '交互', '视觉'] },
  { topic: '风险与问题分析', keywords: ['风险', '问题', '阻塞'] },
  { topic: '下阶段计划', keywords: ['计划', '排期', '目标'] }
];

const KEYWORD_BUCKETS: Record<string, string[]> = {
  report: ['周报', '月报', '汇报', '总结', '进展', '进度', '里程碑', '完成情况', '交付'],
  product: ['需求', '功能', '用户', '产品', '体验', '场景', '流程', '迭代', '优化'],
  tech: ['架构', '性能', '接口', '数据库', '部署', '技术选型', '重构', '测试', 'bug'],
  design: ['设计稿', '交互', '视觉', '原型', 'UI', 'UX', '配色', '布局', '动效'],
  risk: ['风险', '问题', '阻塞', '依赖', '延期', '资源不足', '沟通'],
  plan: ['计划', '排期', '目标', '下周', '下月', '优先级', '里程碑', '任务']
};

function classifyKeywords(filename: string): string[] {
  const lowerName = filename.toLowerCase();
  const found: string[] = [];

  for (const [, keywords] of Object.entries(KEYWORD_BUCKETS)) {
    for (const kw of keywords) {
      if (lowerName.includes(kw)) {
        found.push(kw);
        break;
      }
    }
  }

  return found.length > 0 ? found : ['综合讨论', '事项确认'];
}

export function getDefaultSpeakers(): Speaker[] {
  return DEFAULT_SPEAKERS;
}

export function generateAISummaries(metadata: VideoMetadata): SummaryItem[] {
  const { duration, name } = metadata;
  const detectedKeywords = classifyKeywords(name);

  const segmentCount = Math.min(5, Math.max(3, Math.floor(duration / 180)));
  const segmentDuration = duration / segmentCount;

  const summaries: SummaryItem[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const startTime = Math.round(i * segmentDuration);
    const endTime = Math.round((i + 1) * segmentDuration);
    const preset = PRESET_TOPICS[i % PRESET_TOPICS.length];

    const extraKeywords: string[] = [];
    if (detectedKeywords.length > 0) {
      extraKeywords.push(detectedKeywords[i % detectedKeywords.length]);
    }

    summaries.push({
      id: uuidv4(),
      topic: preset.topic,
      startTime,
      endTime,
      speakerId: DEFAULT_SPEAKERS[i % DEFAULT_SPEAKERS.length].id,
      keywords: [...preset.keywords, ...extraKeywords].slice(0, 4)
    });
  }

  return summaries;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function exportToJSON(
  metadata: VideoMetadata,
  summaries: SummaryItem[],
  bookmarks: { id: string; timestamp: number; text: string; createdAt: number }[],
  speakers: Speaker[]
): string {
  const data = {
    exportedAt: new Date().toISOString(),
    video: {
      name: metadata.name,
      duration: metadata.duration,
      size: metadata.size
    },
    speakers: speakers.map((s) => ({ id: s.id, name: s.name, color: s.color })),
    summaries: summaries.map((s) => ({
      id: s.id,
      topic: s.topic,
      startTime: s.startTime,
      endTime: s.endTime,
      startTimeFormatted: formatTime(s.startTime),
      endTimeFormatted: formatTime(s.endTime),
      speakerId: s.speakerId,
      speakerName: speakers.find((sp) => sp.id === s.speakerId)?.name ?? '',
      keywords: s.keywords
    })),
    bookmarks: bookmarks.map((b) => ({
      id: b.id,
      timestamp: b.timestamp,
      timestampFormatted: formatTime(b.timestamp),
      text: b.text,
      createdAt: new Date(b.createdAt).toISOString()
    }))
  };

  return JSON.stringify(data, null, 2);
}

export function exportToHTML(
  metadata: VideoMetadata,
  summaries: SummaryItem[],
  bookmarks: { id: string; timestamp: number; text: string; createdAt: number }[],
  speakers: Speaker[]
): string {
  const speakerMap = new Map(speakers.map((s) => [s.id, s]));

  const summaryRows = summaries
    .map(
      (s) => `
        <div class="summary-item" data-time="${s.startTime}">
          <div class="time-badge" style="border-left: 4px solid ${speakerMap.get(s.speakerId)?.color ?? '#e94560'}">
            <span>${formatTime(s.startTime)} - ${formatTime(s.endTime)}</span>
            <span class="speaker">${speakerMap.get(s.speakerId)?.name ?? '未知'}</span>
          </div>
          <h3>${s.topic}</h3>
          <div class="keywords">
            ${s.keywords.map((k) => `<span class="keyword">${k}</span>`).join('')}
          </div>
        </div>
      `
    )
    .join('');

  const bookmarkRows = bookmarks
    .map(
      (b) => `
        <div class="bookmark-item" data-time="${b.timestamp}">
          <span class="bookmark-time">[${formatTime(b.timestamp)}]</span>
          <span class="bookmark-text">${b.text}</span>
        </div>
      `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.name} - 会议摘要报告</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #fff;
      padding: 24px;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #e94560; margin-bottom: 8px; font-size: 28px; }
    .meta { color: #aaa; margin-bottom: 32px; font-size: 14px; }
    h2 { color: #0f3460; margin: 24px 0 16px; font-size: 20px; padding-bottom: 8px; border-bottom: 2px solid #0f3460; }
    .summary-item {
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: background 0.2s;
      border: 2px solid rgba(255,255,255,0.1);
    }
    .summary-item:hover { background: rgba(255,255,255,0.1); }
    .time-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-left: 10px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #ccc;
    }
    .speaker { font-weight: 600; color: #fff; }
    .summary-item h3 { font-size: 16px; margin-bottom: 8px; }
    .keywords { display: flex; flex-wrap: wrap; gap: 6px; }
    .keyword {
      background: #0f3460;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
    }
    .bookmark-item {
      padding: 10px 14px;
      background: rgba(255,255,255,0.03);
      border-radius: 6px;
      margin-bottom: 6px;
      border: 2px solid rgba(255,255,255,0.05);
      cursor: pointer;
    }
    .bookmark-item:hover { background: rgba(255,255,255,0.08); }
    .bookmark-time { color: #e94560; font-weight: 600; margin-right: 10px; font-family: monospace; }
    .tip { color: #888; font-size: 13px; margin-top: 24px; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${metadata.name}</h1>
    <div class="meta">
      视频时长: ${formatTime(metadata.duration)} | 文件大小: ${(metadata.size / 1024 / 1024).toFixed(2)} MB |
      导出时间: ${new Date().toLocaleString('zh-CN')}
    </div>

    <h2>📋 智能摘要 (${summaries.length})</h2>
    ${summaryRows}

    <h2>📝 用户备注 (${bookmarks.length})</h2>
    ${bookmarkRows || '<p style="color:#888;">暂无备注</p>'}

    <p class="tip">💡 提示：请在视频摘要应用中打开此报告，点击条目可跳转至对应时间点。</p>
  </div>
</body>
</html>`;
}
