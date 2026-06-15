export type MaterialPreset = 'bronze' | 'porcelain' | 'jade' | 'iron';

export interface Artifact {
  id: string;
  name: string;
  shortName: string;
  dynasty: string;
  location: string;
  description: string;
  modelPath: string;
  scale: number;
  materialPreset: MaterialPreset;
  placeholderType: 'vase' | 'ding' | 'jade' | 'sword';
}

export type ChangeCallback = (artifact: Artifact, index: number) => void;

const ARTIFACTS: Artifact[] = [
  {
    id: 'vase-01',
    name: '青花缠枝莲纹梅瓶',
    shortName: '青花梅瓶',
    dynasty: '明代·永乐年间（1403-1424）',
    location: '江西景德镇御窑遗址',
    description:
      '此瓶为明代永乐朝景德镇官窑所造的青花瓷中之上品，器形端庄典雅，小口丰肩，敛腹圈足，通体以青花描绘缠枝莲纹，枝蔓舒展，花形饱满，线条流畅自然。其青花发色纯正浓艳，色料深入胎骨，乃采用西域进口之"苏麻离青"钴料烧制而成，釉面肥厚莹润，白中泛青，具有典型的永乐青花特征。缠枝莲纹寓意清雅高洁、吉祥连绵，为明清官窑瓷器最常见的装饰题材之一。此梅瓶不仅反映了明代早期景德镇制瓷工艺的极高水平，更承载着永乐朝国力昌盛时期的审美取向与文化精神，是研究明初宫廷用瓷制度与中外文化交流的珍贵实物资料，具有极高的艺术价值与历史研究价值。',
    modelPath: '/models/vase.glb',
    scale: 1.0,
    materialPreset: 'porcelain',
    placeholderType: 'vase'
  },
  {
    id: 'ding-01',
    name: '司母戊青铜方鼎',
    shortName: '司母戊鼎',
    dynasty: '商代晚期（约公元前1300年）',
    location: '河南安阳武官村',
    description:
      '司母戊鼎是迄今为止中国考古发现最大、最重的青铜器，重达832.84公斤，通高133厘米，口长110厘米，宽78厘米，堪称"青铜之王"。器形巨大雄浑，方折沿，立耳，深腹，四柱足，鼎身四面以云雷纹为地，上饰饕餮纹与夔龙纹，纹饰繁缛华美，气势恢宏震撼。鼎腹内壁铸有铭文"司母戊"三字，是商王为祭祀其母戊所铸，由此可窥商代晚期王室祭祀制度之一斑。此鼎铸造工艺极为精湛，采用多范分铸再合铸的复杂技法，代表了商代青铜铸造业的最高成就。其体量之巨、纹饰之精、历史价值之高，在世界青铜文明中亦属罕见，是中华古代青铜文明的巅峰之作与国家一级文物，现珍藏于中国国家博物馆。',
    modelPath: '/models/ding.glb',
    scale: 0.9,
    materialPreset: 'bronze',
    placeholderType: 'ding'
  },
  {
    id: 'jade-01',
    name: '玉镂雕螭龙纹璧',
    shortName: '螭龙纹玉璧',
    dynasty: '西汉（公元前202年-公元8年）',
    location: '河北满城中山靖王墓',
    description:
      '此玉璧为西汉时期玉雕艺术的杰出代表，出土于满城中山靖王刘胜墓，是汉代皇室贵族玉殓葬制度与玉礼器文化的重要实物。玉璧采用新疆和田白玉雕琢而成，玉质温润莹洁，质地细腻致密，通体泛有油脂光泽。璧身设计精巧，分内外两区，内区以浅浮雕技法琢出排列有序的谷纹，粒粒饱满如粟，寓意五谷丰登、江山永固；外区则以镂雕技法雕刻出三组螭龙纹，螭龙身形蜿蜒矫健，鳞爪毕现，穿梭于云气之间，造型灵动飘逸，极具汉代艺术雄浑奔放的浪漫气息。玉璧在古代既是祭天的礼器，也是象征身份地位的瑞器，更是墓葬中引导灵魂升天的重要殓葬用玉。此璧工艺精湛绝伦，设计巧思独具，是研究汉代玉器制作、礼仪制度与审美文化的珍贵文物。',
    modelPath: '/models/jade.glb',
    scale: 1.2,
    materialPreset: 'jade',
    placeholderType: 'jade'
  },
  {
    id: 'sword-01',
    name: '越王勾践青铜剑',
    shortName: '越王勾践剑',
    dynasty: '春秋晚期（约公元前500年）',
    location: '湖北江陵望山楚墓',
    description:
      '越王勾践剑是春秋晚期越国青铜铸造工艺的旷世杰作，出土于湖北江陵望山一号楚墓，虽埋藏地下两千四百余年，出土时依然寒光凛凛、锋利无比，可轻易划破二十余层纸张，被誉为"天下第一剑"。剑身全长55.7厘米，宽4.6厘米，剑格正面以蓝色琉璃镶嵌，背面镶嵌绿松石，纹饰华美异常。剑身通体布满规则的黑色菱形暗格花纹，这是经过特殊的硫化处理而形成的防锈保护层，也是此剑千年不锈的奥秘所在。剑身近格处铸有错金鸟虫篆铭文"越王鸠浅（勾践）自作用剑"八字，字体秀丽典雅，堪称金文中的精品。此剑不仅展现了吴越地区精湛的铸剑技术与金属表面处理工艺，也见证了越王勾践"卧薪尝胆、三千越甲可吞吴"的传奇历史，是集艺术价值、科技价值与历史价值于一身的稀世珍宝。',
    modelPath: '/models/sword.glb',
    scale: 1.1,
    materialPreset: 'bronze',
    placeholderType: 'sword'
  }
];

export class DataStore {
  private readonly artifacts: readonly Artifact[];
  private currentIndex: number;
  private readonly listeners: Set<ChangeCallback>;

  constructor() {
    this.artifacts = ARTIFACTS;
    this.currentIndex = 0;
    this.listeners = new Set();
  }

  getAllArtifacts(): Artifact[] {
    return [...this.artifacts];
  }

  getCurrentArtifact(): Artifact {
    return this.artifacts[this.currentIndex];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getArtifactById(id: string): Artifact | undefined {
    return this.artifacts.find((a) => a.id === id);
  }

  getArtifactCount(): number {
    return this.artifacts.length;
  }

  switchTo(index: number): Artifact {
    if (index < 0 || index >= this.artifacts.length) {
      throw new RangeError(`索引 ${index} 超出文物列表范围 [0, ${this.artifacts.length - 1}]`);
    }
    if (index === this.currentIndex) {
      return this.artifacts[index];
    }
    this.currentIndex = index;
    const artifact = this.artifacts[index];
    this.emit(artifact, index);
    return artifact;
  }

  switchNext(): Artifact {
    const next = (this.currentIndex + 1) % this.artifacts.length;
    return this.switchTo(next);
  }

  switchPrev(): Artifact {
    const prev = (this.currentIndex - 1 + this.artifacts.length) % this.artifacts.length;
    return this.switchTo(prev);
  }

  onChange(callback: ChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(artifact: Artifact, index: number): void {
    for (const cb of this.listeners) {
      try {
        cb(artifact, index);
      } catch (err) {
        console.error('[DataStore] 监听器执行出错:', err);
      }
    }
  }
}
