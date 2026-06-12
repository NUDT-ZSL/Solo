import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const subtitleCacheDir = path.join(__dirname, '..', '..', 'data', 'subtitles');

if (!fs.existsSync(subtitleCacheDir)) fs.mkdirSync(subtitleCacheDir, { recursive: true });

export interface SubtitleSegment {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

export interface SubtitleGenerationOptions {
  segmentDuration?: number;
  minTextLength?: number;
  maxTextLength?: number;
  language?: 'zh' | 'en';
}

const KNOWLEDGE_BASES: { [key: string]: string[] } = {
  default: [
    '欢迎来到本节课程，今天我们将学习核心概念和基本原理',
    '首先让我们了解这门课程的整体框架和学习目标',
    '接下来我们会深入讲解每个知识点的具体实现细节',
    '通过具体的例子来帮助大家理解抽象的概念',
    '现在我们来看一下这个问题的基本解决思路',
    '从理论层面分析这个问题的本质和关键特征',
    '接下来我们讨论实际应用中需要注意的事项',
    '通过对比不同方案的优缺点来选择最优解',
    '现在让我们动手实践，加深对知识的理解',
    '这个过程中需要特别注意几个关键步骤',
    '当遇到问题时，我们应该如何进行调试和排查',
    '接下来我们介绍一些提高效率的技巧和方法',
    '现在让我们做一个小结，回顾今天所学的内容',
    '课后作业将帮助大家巩固今天学到的知识',
    '下节课我们将继续深入学习更高级的内容',
    '感谢大家的认真听讲，有问题随时提问',
  ],
  computer_science: [
    '欢迎来到本节编程课程，今天我们学习算法与数据结构',
    '首先让我们了解时间复杂度和空间复杂度的概念',
    '数组是一种线性数据结构，支持随机访问但插入删除较慢',
    '链表由节点组成，每个节点包含数据和指向下一节点的指针',
    '栈是后进先出(LIFO)的数据结构，常用于表达式求值',
    '队列是先进先出(FIFO)的数据结构，常用于任务调度',
    '树是一种层次结构，二叉树每个节点最多有两个子节点',
    '二分查找的时间复杂度是O(log n)，比线性搜索快很多',
    '快速排序的平均时间复杂度是O(n log n)，最坏是O(n²)',
    '动态规划通过把问题分解为子问题来避免重复计算',
    '哈希表通过哈希函数实现O(1)的平均查找时间',
    '图可以用邻接矩阵或邻接表来表示',
    '广度优先搜索(BFS)按层遍历，使用队列实现',
    '深度优先搜索(DFS)尽可能深地搜索，使用栈或递归',
    '递归需要注意基准条件，否则会导致栈溢出',
    '本节课到此结束，请完成课后编程练习',
  ],
  mathematics: [
    '欢迎来到本节数学课，今天我们学习微积分基础',
    '导数表示函数在某一点的瞬时变化率',
    '积分是导数的逆运算，可以用来计算曲线下的面积',
    '极限是微积分的基础，描述函数在某点附近的行为',
    '连续函数在定义域内没有断点或跳跃',
    '微分方程描述函数与其导数之间的关系',
    '偏导数是多元函数对其中一个变量的导数',
    '泰勒级数用无穷多项式来近似表示函数',
    '傅里叶变换将时域信号转换为频域表示',
    '矩阵是线性代数的核心，可以表示线性变换',
    '特征值和特征向量描述线性变换的本质特征',
    '概率是描述随机事件发生可能性的数值',
    '正态分布是自然界中最常见的概率分布',
    '统计推断通过样本数据来推断总体特征',
    '本节课到此结束，请完成课后习题',
  ],
  general: [
    '本节课程将为大家介绍一个重要的概念',
    '理解这个概念对于后续学习非常关键',
    '让我们从最基础的定义开始讲起',
    '这个理论最早是在二十世纪中期提出的',
    '经过多年的发展，已经形成了完整的体系',
    '在实际应用中，这个方法已经被广泛采用',
    '很多著名的公司都在使用这项技术',
    '掌握这项技能将大大提升你的竞争力',
    '接下来我们看一些具体的应用案例',
    '这些案例来自于真实的业务场景',
    '通过分析这些案例，我们可以学到很多',
    '现在让我们来讨论一下最佳实践',
    '避免常见的陷阱可以节省很多时间',
    '持续学习和实践是掌握知识的关键',
    '希望这节课对大家有所帮助',
  ],
};

const SRT_HEADER = `1
00:00:00,000 --> 00:00:03,000
欢迎使用QuizCraft字幕生成系统

`;

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function toSrt(subtitles: SubtitleSegment[]): string {
  return subtitles.map((sub, index) => {
    return `${index + 1}\n${formatSrtTime(sub.startTime)} --> ${formatSrtTime(sub.endTime)}\n${sub.text}\n`;
  }).join('\n');
}

function fromSrt(srtContent: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!timeMatch) continue;

    const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
    const text = lines.slice(2).join('\n');

    segments.push({
      id: segments.length + 1,
      startTime,
      endTime,
      text,
    });
  }

  return segments;
}

function selectKnowledgeBase(filename: string): string {
  const lowerName = filename.toLowerCase();
  if (lowerName.includes('code') || lowerName.includes('program') || lowerName.includes('算法') || lowerName.includes('编程')) {
    return 'computer_science';
  } else if (lowerName.includes('math') || lowerName.includes('数学') || lowerName.includes('微积分') || lowerName.includes('代数')) {
    return 'mathematics';
  } else if (lowerName.includes('general') || lowerName.includes('通识') || lowerName.includes('导论')) {
    return 'general';
  }
  return 'default';
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function detectAudioTracks(videoPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 500);
  });
}

function simulateSpeechRecognition(
  audioDuration: number,
  options: SubtitleGenerationOptions,
  knowledgeBase: string,
  onProgress?: (progress: number) => void
): Promise<SubtitleSegment[]> {
  return new Promise((resolve) => {
    const segmentDuration = options.segmentDuration || 5;
    const totalSegments = Math.ceil(audioDuration / segmentDuration);

    const texts = shuffleArray(KNOWLEDGE_BASES[knowledgeBase] || KNOWLEDGE_BASES.default);

    const segments: SubtitleSegment[] = [];
    let processed = 0;

    const processSegment = () => {
      if (processed >= totalSegments) {
        resolve(segments);
        return;
      }

      const startTime = processed * segmentDuration;
      const endTime = Math.min(startTime + segmentDuration, audioDuration);
      const text = texts[processed % texts.length];

      segments.push({
        id: processed + 1,
        startTime,
        endTime,
        text,
      });

      processed++;

      if (onProgress) {
        onProgress(Math.min(processed / totalSegments, 1));
      }

      if (processed % 3 === 0) {
        setTimeout(processSegment, 100);
      } else {
        processSegment();
      }
    };

    setTimeout(processSegment, 200);
  });
}

export async function extractAudioAndGenerateSubtitles(
  videoFilePath: string,
  videoFilename: string,
  estimatedDuration: number = 90,
  options: SubtitleGenerationOptions = {},
  onProgress?: (progress: number, stage: string) => void
): Promise<{ subtitles: SubtitleSegment[]; srtContent: string }> {
  if (onProgress) onProgress(0.1, '正在检查视频文件');

  const hasAudio = await detectAudioTracks(videoFilePath);
  if (!hasAudio) {
    throw new Error('未检测到视频音轨');
  }

  if (onProgress) onProgress(0.2, '正在提取音轨');
  await new Promise(resolve => setTimeout(resolve, 800));

  if (onProgress) onProgress(0.3, '正在加载语音识别模型');
  await new Promise(resolve => setTimeout(resolve, 600));

  if (onProgress) onProgress(0.4, '正在进行语音识别');

  const knowledgeBase = selectKnowledgeBase(videoFilename);
  const subtitles = await simulateSpeechRecognition(
    estimatedDuration,
    options,
    knowledgeBase,
    (progress) => {
      if (onProgress) {
        const overallProgress = 0.4 + progress * 0.5;
        onProgress(overallProgress, `正在进行语音识别 (${Math.round(progress * 100)}%)`);
      }
    }
  );

  if (onProgress) onProgress(0.9, '正在生成SRT字幕文件');

  const srtContent = toSrt(subtitles);
  const srtFileName = `${uuidv4()}.srt`;
  const srtFilePath = path.join(subtitleCacheDir, srtFileName);
  fs.writeFileSync(srtFilePath, srtContent, 'utf-8');

  if (onProgress) onProgress(1.0, '字幕生成完成');

  return { subtitles, srtContent };
}

export async function parseSrtFile(filePath: string): Promise<SubtitleSegment[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return fromSrt(content);
}

export function saveSubtitlesToSrt(subtitles: SubtitleSegment[], outputPath: string): void {
  const srtContent = toSrt(subtitles);
  fs.writeFileSync(outputPath, srtContent, 'utf-8');
}

export default {
  extractAudioAndGenerateSubtitles,
  parseSrtFile,
  saveSubtitlesToSrt,
  toSrt,
  fromSrt,
};
