import { LyricsData, LyricLine, DEFAULT_STYLE } from './types';

const TIME_TAG_REGEX = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;
const METADATA_REGEX = /\[(ti|ar|al):([^\]]+)\]/g;

function generateId(): string {
  return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function parseTimeTag(match: RegExpMatchArray): number {
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
  return minutes * 60 + seconds + milliseconds / 1000;
}

export function parseLRC(lrcContent: string): LyricsData {
  const startTime = performance.now();
  
  const metadata: LyricsData['metadata'] = {};
  const timedLines: { time: number; text: string }[] = [];

  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = METADATA_REGEX.exec(lrcContent)) !== null) {
    const [, key, value] = metaMatch;
    if (key === 'ti') metadata.title = value.trim();
    if (key === 'ar') metadata.artist = value.trim();
    if (key === 'al') metadata.album = value.trim();
  }

  const lines = lrcContent.split(/\r?\n/);
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const timeMatches = [...trimmedLine.matchAll(TIME_TAG_REGEX)];
    if (timeMatches.length === 0) continue;

    let text = trimmedLine.replace(TIME_TAG_REGEX, '').trim();
    if (!text) continue;

    for (const match of timeMatches) {
      const time = parseTimeTag(match);
      timedLines.push({ time, text });
    }
  }

  timedLines.sort((a, b) => a.time - b.time);

  const lyricLines: LyricLine[] = timedLines.map((item, index) => {
    const nextItem = timedLines[index + 1];
    const endTime = nextItem ? nextItem.time : item.time + 3;
    
    return {
      id: generateId(),
      startTime: Math.round(item.time * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
      text: item.text,
      style: { ...DEFAULT_STYLE },
    };
  });

  const totalDuration = lyricLines.length > 0
    ? Math.round(lyricLines[lyricLines.length - 1].endTime * 10) / 10
    : 0;

  const endTime = performance.now();
  console.log(`LRC 解析完成，共 ${lyricLines.length} 行，耗时 ${(endTime - startTime).toFixed(2)}ms`);

  return {
    metadata,
    lines: lyricLines,
    totalDuration,
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export function formatTimeLong(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
