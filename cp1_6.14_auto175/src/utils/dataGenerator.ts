import type { Piece, VoicePart, DailyProgress, Difficulty } from '@/types';

const voicePartColors: Record<string, string> = {
  '女高音': '#3b82f6',
  '女低音': '#10b981',
  '男高音': '#f59e0b',
  '男低音': '#ef4444',
  '高音萨克斯': '#8b5cf6',
  '小号': '#ec4899',
  '长笛': '#06b6d4',
  '大提琴': '#84cc16',
};

const difficultyLevels: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

const samplePieces = [
  { title: '欢乐颂', composer: '贝多芬', key: 'D大调', parts: ['女高音', '女低音', '男高音', '男低音'] },
  { title: '茉莉花', composer: '江苏民歌', key: 'G大调', parts: ['女高音', '女低音', '男高音', '男低音'] },
  { title: '哈利路亚', composer: '亨德尔', key: 'F大调', parts: ['女高音', '女低音', '男高音', '男低音'] },
  { title: '故乡的云', composer: '谭健常', key: 'C大调', parts: ['女高音', '男高音', '男低音'] },
  { title: '月亮代表我的心', composer: '翁清溪', key: '降E大调', parts: ['女高音', '女低音', '男高音'] },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createVoicePart(name: string, index: number): VoicePart {
  const difficulty = difficultyLevels[index % 3];
  return {
    id: generateId(),
    name,
    difficulty,
    pdfUrl: undefined,
    progress: randomInt(20, 90),
    targetRange: `1-${randomInt(8, 32)}小节`,
    color: voicePartColors[name] || `hsl(${randomInt(0, 360)}, 70%, 50%)`,
  };
}

export function generateInitialData(): { pieces: Piece[]; historyData: DailyProgress[] } {
  const pieces: Piece[] = [];
  const historyData: DailyProgress[] = [];

  samplePieces.forEach((pieceData, index) => {
    const voiceParts = pieceData.parts.map((name, i) => createVoicePart(name, i + index));

    const piece: Piece = {
      id: generateId(),
      title: pieceData.title,
      composer: pieceData.composer,
      key: pieceData.key,
      voiceParts,
      createdAt: new Date(Date.now() - index * 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - index * 86400000).toISOString(),
    };

    pieces.push(piece);

    const today = new Date();
    for (let day = 6; day >= 0; day--) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      const dateStr = date.toISOString().split('T')[0];

      voiceParts.forEach((part) => {
        const baseProgress = Math.max(10, part.progress - (6 - day) * randomInt(3, 8));
        historyData.push({
          date: dateStr,
          voicePartId: part.id,
          pieceId: piece.id,
          progress: Math.min(100, Math.max(0, baseProgress + randomInt(-5, 5))),
        });
      });
    }
  });

  return { pieces, historyData };
}

export function updateProgress(
  historyData: DailyProgress[],
  pieceId: string,
  voicePartId: string,
  increment: number
): DailyProgress[] {
  const today = new Date().toISOString().split('T')[0];
  const todayIndex = historyData.findIndex(
    (d) => d.date === today && d.voicePartId === voicePartId && d.pieceId === pieceId
  );

  if (todayIndex >= 0) {
    const updated = [...historyData];
    updated[todayIndex] = {
      ...updated[todayIndex],
      progress: Math.min(100, Math.max(0, updated[todayIndex].progress + increment)),
    };
    return updated;
  }

  return [
    ...historyData,
    {
      date: today,
      voicePartId,
      pieceId,
      progress: Math.min(100, Math.max(0, increment)),
    },
  ];
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function getDifficultyLabel(difficulty: Difficulty): string {
  const labels: Record<Difficulty, string> = {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级',
  };
  return labels[difficulty];
}

export function getDifficultyColor(difficulty: Difficulty): string {
  const colors: Record<Difficulty, string> = {
    beginner: '#22c55e',
    intermediate: '#3b82f6',
    advanced: '#ef4444',
  };
  return colors[difficulty];
}
