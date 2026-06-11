import { LyricsData, LyricLine, DEFAULT_STYLE } from './types';

export interface ParseProgressEvent {
  progress: number;
  phase: 'metadata' | 'lines' | 'sorting' | 'building';
  processed: number;
  total: number;
  result?: LyricsData;
}

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

export async function parseLRCStreaming(
  lrcContent: string,
  onProgress: (event: ParseProgressEvent) => void
): Promise<LyricsData> {
  const lines = lrcContent.split(/\r?\n/);
  const totalLines = lines.length;
  const metadata: LyricsData['metadata'] = {};
  const timedLines: { time: number; text: string }[] = [];

  onProgress({
    progress: 0,
    phase: 'metadata',
    processed: 0,
    total: totalLines,
  });

  let metaMatch: RegExpExecArray | null;
  const metaCopy = new RegExp(METADATA_REGEX.source, METADATA_REGEX.flags);
  while ((metaMatch = metaCopy.exec(lrcContent)) !== null) {
    const [, key, value] = metaMatch;
    if (key === 'ti') metadata.title = value.trim();
    if (key === 'ar') metadata.artist = value.trim();
    if (key === 'al') metadata.album = value.trim();
  }

  onProgress({
    progress: 10,
    phase: 'lines',
    processed: 0,
    total: totalLines,
  });

  const timeRegexCopy = new RegExp(TIME_TAG_REGEX.source, TIME_TAG_REGEX.flags);

  const batchSize = Math.max(1, Math.floor(totalLines / 20));
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (trimmedLine) {
      const timeMatches = [...trimmedLine.matchAll(timeRegexCopy)];
      timeRegexCopy.lastIndex = 0;
      
      if (timeMatches.length > 0) {
        const text = trimmedLine.replace(timeRegexCopy, '').trim();
        timeRegexCopy.lastIndex = 0;
        
        if (text) {
          for (const match of timeMatches) {
            const time = parseTimeTag(match);
            timedLines.push({ time, text });
          }
        }
      }
    }

    if ((i + 1) % batchSize === 0 || i === lines.length - 1) {
      const progress = 10 + ((i + 1) / totalLines) * 70;
      onProgress({
        progress: Math.round(progress * 10) / 10,
        phase: 'lines',
        processed: i + 1,
        total: totalLines,
      });
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  onProgress({
    progress: 82,
    phase: 'sorting',
    processed: timedLines.length,
    total: timedLines.length,
  });

  timedLines.sort((a, b) => a.time - b.time);

  await new Promise(resolve => setTimeout(resolve, 0));

  onProgress({
    progress: 88,
    phase: 'building',
    processed: 0,
    total: timedLines.length,
  });

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

  const result: LyricsData = {
    metadata,
    lines: lyricLines,
    totalDuration,
  };

  onProgress({
    progress: 100,
    phase: 'building',
    processed: timedLines.length,
    total: timedLines.length,
    result,
  });

  return result;
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
