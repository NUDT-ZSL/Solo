export interface ChapterData {
  id: number;
  title: string;
  content: string;
}

export interface ReadingProgress {
  currentChapter: number;
  completedChapters: Set<number>;
}

export interface TrailSegment {
  chapterId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  glowColor: string;
}

const CHAPTERS: ChapterData[] = [
  {
    id: 0,
    title: "序章 · 书卷始开",
    content:
      "天地初开，万物未形。古人以竹简记事，以帛书传情。每一卷书，皆是一段旅程的起点。翻开这卷流光书卷，你将踏上一段穿越文字与光影的奇妙之旅。书页之间，藏着千年智慧；行文之中，流淌着流光溢彩。\n\n这一刻，尘埃在光柱中起舞，仿佛时间的碎片在空中缓缓飘落。书卷的第一页已经展开，等待着你用心去感受每一个字、每一句话所蕴含的力量。",
  },
  {
    id: 1,
    title: "第一章 · 墨痕初现",
    content:
      "墨，是书写之魂。一滴滴墨汁落在宣纸上，如同夜空中初现的星辰。笔锋起落之间，山川河流跃然纸上。古人云：\"墨分五色\"，浓淡干湿之间，尽显天地万象。\n\n初学书法者，必先学磨墨。墨条与砚台相摩擦，发出细微的沙沙声，如同春蚕食叶。墨香渐浓，心亦渐静。这便是书卷世界的第一道门槛——学会在沉静中感受墨的力量。",
  },
  {
    id: 2,
    title: "第二章 · 笔走龙蛇",
    content:
      "笔法有如龙蛇行空，时而婉转流畅，时而气势磅礴。一支毛笔，可写千里江山，可绘万种风情。王羲之的《兰亭集序》，笔笔如行云流水，被后人誉为\"天下第一行书\"。\n\n运笔之道，在于心手合一。心之所向，笔之所至。当书写者进入忘我之境，笔下便自然流淌出灵动的线条。每一笔都带着呼吸，每一划都蕴含着情感。这就是书卷世界的第二重境界——让文字拥有生命。",
  },
  {
    id: 3,
    title: "第三章 · 纸上千秋",
    content:
      "宣纸，千年不腐。一张薄薄的纸，承载着无数先贤的思想与情感。从蔡伦改进造纸术的那一天起，文明的火种便再也不会熄灭。纸张虽轻，其意重如泰山。\n\n每一张纸都有它的纹理，如同人的指纹一般独一无二。光线透过纸面，映出斑驳的影子。古人在这样的纸上书写，仿佛与纸本身进行一场无声的对话。纸是沉默的倾听者，忠实地记录着每一个时代的回响。",
  },
  {
    id: 4,
    title: "第四章 · 卷中天地",
    content:
      "一卷在手，天地尽收。书卷展开，便是一个完整的世界。从《诗经》的温柔敦厚，到《楚辞》的瑰丽奇绝；从《史记》的恢宏大气，到《红楼梦》的悲欢离合。\n\n读者在卷中行走，如同步入一片广袤的原野。有时攀登高山，俯瞰云海；有时漫步溪畔，聆听水声。每翻过一页，便是一次新的发现。书卷之美，不仅在于文字本身，更在于它所开启的那扇通往无限想象的大门。",
  },
  {
    id: 5,
    title: "第五章 · 光影交织",
    content:
      "当光线穿过书页的缝隙，文字便有了光影的层次。晨光中的书卷，泛着温暖的金色；月色下的纸页，披着清冷的银辉。光与影的交错，让静止的文字仿佛在呼吸。\n\n古人读书，讲究\"晨读暮诵\"。清晨的日光中，文字格外清晰；黄昏的暮色里，诗意愈发浓烈。这种与自然节律相伴的阅读方式，让每一次阅读都成为一场与光同行的仪式。流光书卷的光芒，正是从这些无数个晨昏交替中凝聚而来。",
  },
  {
    id: 6,
    title: "第六章 · 轨迹留痕",
    content:
      "阅读是一条轨迹，从起点延伸至远方。每一章的阅读，都在这条轨迹上留下独特的印记。如同旅人在雪地上留下的脚印，每一个印记都诉说着一段独特的故事。\n\n冷蓝色的轨迹是初读时的冷静与好奇，温暖的橙色是深入后的热情与共鸣。从冷到暖，不仅是颜色的渐变，更是阅读深度与情感投入的写照。这些轨迹最终将连成一条完整的路径，讲述着读者与书卷之间那段无法替代的旅程。",
  },
  {
    id: 7,
    title: "第七章 · 画卷终成",
    content:
      "当最后一章合上，所有轨迹汇聚，一幅完整的发光画卷便呈现在眼前。这不是一幅静态的画，而是一段流动的记忆。每一条轨迹都在微微发光，如同星河在夜空中缓缓流淌。\n\n从序章的初启到终章的圆满，你走过了墨痕、笔法、纸张、天地、光影与轨迹。每一个章节都是一块拼图，拼出了属于你的阅读画卷。这幅画卷独一无二，因为每一位读者的旅程都是不可复制的。\n\n流光书卷，至此终卷。但流光不会消逝——它将继续在你心中流淌，照亮你未来的每一段阅读之旅。",
  },
];

const TRAIL_START_HUE = 210;
const TRAIL_END_HUE = 28;
const TRAIL_START_SAT = 70;
const TRAIL_END_SAT = 80;
const TRAIL_START_LIGHT = 57;
const TRAIL_END_LIGHT = 60;

export class ScrollEngine {
  private chapters: ChapterData[];
  private progress: ReadingProgress;

  constructor() {
    this.chapters = CHAPTERS;
    this.progress = {
      currentChapter: 0,
      completedChapters: new Set<number>(),
    };
  }

  getChapters(): ChapterData[] {
    return this.chapters;
  }

  getChapterCount(): number {
    return this.chapters.length;
  }

  getCurrentChapter(): ChapterData {
    return this.chapters[this.progress.currentChapter];
  }

  getCurrentChapterIndex(): number {
    return this.progress.currentChapter;
  }

  getCompletedChapters(): Set<number> {
    return this.progress.completedChapters;
  }

  isChapterCompleted(index: number): boolean {
    return this.progress.completedChapters.has(index);
  }

  completeCurrentChapter(): boolean {
    this.progress.completedChapters.add(this.progress.currentChapter);
    if (this.progress.currentChapter < this.chapters.length - 1) {
      this.progress.currentChapter += 1;
      return true;
    }
    return false;
  }

  jumpToChapter(index: number): void {
    if (index >= 0 && index < this.chapters.length) {
      this.progress.currentChapter = index;
    }
  }

  getReadingProgress(): number {
    return this.progress.completedChapters.size / this.chapters.length;
  }

  getRemainingChapters(): number {
    return this.chapters.length - this.progress.completedChapters.size;
  }

  reset(): void {
    this.progress = {
      currentChapter: 0,
      completedChapters: new Set<number>(),
    };
  }

  getColorForChapter(chapterIndex: number): string {
    const depth = chapterIndex / Math.max(1, this.chapters.length - 1);
    return this.mapDepthToColor(depth);
  }

  getGlowColorForChapter(chapterIndex: number): string {
    const depth = chapterIndex / Math.max(1, this.chapters.length - 1);
    const hue = this.lerp(TRAIL_START_HUE, TRAIL_END_HUE, depth);
    const sat = this.lerp(TRAIL_START_SAT, TRAIL_END_SAT, depth);
    const light = this.lerp(TRAIL_START_LIGHT, TRAIL_END_LIGHT, depth);
    return `hsla(${hue}, ${sat}%, ${light}%, 0.4)`;
  }

  computeTrailSegments(
    containerWidth: number,
    containerHeight: number
  ): TrailSegment[] {
    const padding = 16;
    const gap = 6;
    const totalChapters = this.chapters.length;
    const availableWidth = containerWidth - padding * 2;
    const segmentWidth = (availableWidth - gap * (totalChapters - 1)) / totalChapters;
    const segmentHeight = containerHeight - padding * 2;

    const segments: TrailSegment[] = [];

    for (let i = 0; i < totalChapters; i++) {
      if (!this.progress.completedChapters.has(i)) continue;

      const x = padding + i * (segmentWidth + gap);
      const y = padding;

      segments.push({
        chapterId: i,
        x,
        y,
        width: segmentWidth,
        height: segmentHeight,
        color: this.getColorForChapter(i),
        glowColor: this.getGlowColorForChapter(i),
      });
    }

    return segments;
  }

  computeIndicatorPosition(
    containerWidth: number,
    containerHeight: number
  ): { x: number; y: number } {
    const padding = 16;
    const gap = 6;
    const totalChapters = this.chapters.length;
    const availableWidth = containerWidth - padding * 2;
    const segmentWidth = (availableWidth - gap * (totalChapters - 1)) / totalChapters;

    const x =
      padding +
      this.progress.currentChapter * (segmentWidth + gap) +
      segmentWidth / 2;
    const y = containerHeight / 2;

    return { x, y };
  }

  private mapDepthToColor(depth: number): string {
    const hue = this.lerp(TRAIL_START_HUE, TRAIL_END_HUE, depth);
    const sat = this.lerp(TRAIL_START_SAT, TRAIL_END_SAT, depth);
    const light = this.lerp(TRAIL_START_LIGHT, TRAIL_END_LIGHT, depth);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}

let engineInstance: ScrollEngine | null = null;

export function getScrollEngine(): ScrollEngine {
  if (!engineInstance) {
    engineInstance = new ScrollEngine();
  }
  return engineInstance;
}
