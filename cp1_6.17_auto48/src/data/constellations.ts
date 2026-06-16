export interface StarData {
  name: string;
  x: number;
  y: number;
  z: number;
  magnitude: number;
  spectralType: string;
}

export interface ConstellationData {
  id: string;
  nameCN: string;
  nameEN: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  eclipticAngle: number;
  stars: StarData[];
  lines: [number, number][];
  brightestStar: {
    nameCN: string;
    nameEN: string;
    spectralType: string;
    magnitude: number;
  };
  mythology: {
    greek: string;
    chinese: string;
  };
  sketchPath: string;
}

function sphericalPos(angle: number, lat: number, radius: number): [number, number, number] {
  const x = radius * Math.cos(lat) * Math.cos(angle);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.sin(angle);
  return [x, y, z];
}

const R = 12;

const constellations: ConstellationData[] = [
  {
    id: 'aries',
    nameCN: '白羊座',
    nameEN: 'Aries',
    season: 'spring',
    eclipticAngle: 0,
    stars: (() => {
      const c = sphericalPos(0, 0.1, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.3,  0.0,  '娄宿三',   2.0, 'K2III'],
        [ 0.5,  0.15,  0.1,  '娄宿一',   2.6, 'A5V'  ],
        [ 0.9,  0.0,  0.15, '胃宿一',   3.6, 'B8V'  ],
        [ 1.3, -0.15, 0.2,  '胃宿三',   4.0, 'A0V'  ],
        [ 1.7, -0.35, 0.25, '白羊41',   3.6, 'B8Vn' ],
        [ 0.2,  0.55, -0.1,  '白羊π',    5.3, 'B7V'  ],
        [ 0.65, 0.4,  0.0,  '白羊ε',    4.6, 'A2V'  ],
        [ 1.05, 0.1,  0.1,  '白羊δ',    4.4, 'A3V'  ],
        [ 1.45,-0.2,  0.2,  '白羊ν',    5.5, 'A7V'  ],
        [ 0.4,  0.2,  0.05, '白羊ο',    5.6, 'F5V'  ],
        [ 0.75, 0.25, 0.1,  '白羊σ',    5.5, 'B8V'  ],
        [ 1.15,-0.05, 0.15, '白羊τ',    5.3, 'B5V'  ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[1,2],[2,3],[3,4],[1,5],[2,6],[3,7],[3,8],[0,9],[1,10],[2,11]],
    brightestStar: { nameCN: '娄宿三', nameEN: 'Hamal', spectralType: 'K2III', magnitude: 2.0 },
    mythology: {
      greek: 'In Greek mythology, Aries represents the golden-fleeced ram that rescued Phrixus and Helle from their evil stepmother Ino. Hermes sent the magical flying ram to save them. As the ram carried them across the sea, Helle fell into the Hellespont. Phrixus reached Colchis and sacrificed the ram to Zeus, presenting its golden fleece to King Aeetes, who hung it in a sacred grove guarded by a sleepless dragon. The Golden Fleece later became the quest of Jason and the Argonauts.',
      chinese: '在希腊神话中，白羊座代表着一只拥有金色羊毛的神奇公羊。国王阿塔玛斯的两个孩子弗里克索斯和赫勒遭到继母伊诺的迫害，赫尔墨斯派出一只会飞的金毛公羊前来营救。公羊载着两个孩子飞越大海，但赫勒不幸坠入海中，那片海域因此被称为赫勒海峡。弗里克索斯最终抵达科尔基斯，将金羊毛献给了国王埃厄忒斯，羊毛被挂在圣林中由巨龙看守。后来，金羊毛成为了伊阿宋和阿尔戈英雄们远征的目标。',
    },
    sketchPath: 'M20 60 L40 50 L70 45 L100 40 L130 35 M40 50 L50 25 M70 45 L80 28 M100 40 L110 28 M130 35 L115 55 M20 60 L30 45 M40 50 L55 40 M70 45 L85 42',
  },
  {
    id: 'taurus',
    nameCN: '金牛座',
    nameEN: 'Taurus',
    season: 'spring',
    eclipticAngle: Math.PI / 6,
    stars: (() => {
      const c = sphericalPos(Math.PI / 6, 0.15, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.2,  0.0,   '毕宿五',   0.85, 'K5III'],
        [ 0.4,  0.35, -0.1,  '毕宿一',   3.4,  'A7V'  ],
        [-0.3,  0.2,   0.12, '毕宿二',   3.8,  'A0V'  ],
        [ 0.2,  0.05,  0.08, '毕宿三',   3.6,  'G8III'],
        [-0.15, 0.0,   0.0,   '毕宿四',   3.8,  'B3V'  ],
        [ 0.9,  0.7,  -0.35, '五车五',   1.65, 'B7III'],
        [-0.85, 0.6,  -0.2,  '天关',     3.0,  'B3V'  ],
        [ 0.6,  0.5,  -0.18, '金牛θ',    3.4,  'A7V'  ],
        [-0.5,  0.45, -0.12, '金牛λ',    3.5,  'B3V'  ],
        [ 1.1,  0.8,  -0.45, '金牛ζ',    3.0,  'B7III'],
        [-1.05, 0.72, -0.28, '金牛ε',    3.5,  'B3V'  ],
        [ 0.75, 0.62, -0.25, '金牛γ',    3.6,  'A0V'  ],
        [-0.65, 0.52, -0.16, '金牛δ',    3.8,  'A0V'  ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[0,3],[0,4],[1,5],[2,6],[5,7],[6,8],[5,9],[6,10],[7,11],[8,12]],
    brightestStar: { nameCN: '毕宿五', nameEN: 'Aldebaran', spectralType: 'K5III', magnitude: 0.85 },
    mythology: {
      greek: 'Taurus represents Zeus transformed into a magnificent white bull. The Phoenician princess Europa was playing by the sea when Zeus, captivated by her beauty, assumed the form of a gentle white bull and approached her. Europa climbed upon its back, and the bull plunged into the sea, carrying her to Crete. There Zeus revealed his identity, and Europa bore him three sons including Minos, who became king of Crete. The continent of Europe was named after Europa.',
      chinese: '金牛座在希腊神话中代表宙斯化身的一头白色公牛。腓尼基公主欧罗巴在海边玩耍时，宙斯被她的美貌所吸引，化身为一头温顺华美的白牛靠近她。欧罗巴被白牛的美丽吸引，骑上了它的背。白牛随即跃入大海，载着欧罗巴游向克里特岛。在克里特岛上，宙斯恢复真身，与欧罗巴生下了米诺斯等三个儿子。米诺斯后来成为克里特国王，欧洲大陆也因此以欧罗巴的名字命名。',
    },
    sketchPath: 'M60 70 L80 55 L100 50 L120 60 M60 70 L45 50 L30 35 L20 65 M100 50 L90 30 M80 55 L115 25 L135 35 M30 35 L55 28 L45 50 M80 55 L65 35 M120 60 L105 35',
  },
  {
    id: 'gemini',
    nameCN: '双子座',
    nameEN: 'Gemini',
    season: 'spring',
    eclipticAngle: Math.PI / 3,
    stars: (() => {
      const c = sphericalPos(Math.PI / 3, 0.03, R);
      const pts: [number, number, number, string, number, string][] = [
        [-0.2,  0.55,  0.0,   '北河三',   1.14, 'K0III'],
        [ 0.3,  0.65,  0.12,  '北河二',   1.58, 'A2V'  ],
        [-0.3,  0.2,  -0.06,  '双子μ',    2.9,  'M3III'],
        [ 0.4,  0.3,   0.08,  '双子ε',    3.0,  'G8III'],
        [-0.4,  0.0,   0.0,   '双子ζ',    3.4,  'F5V'  ],
        [ 0.3,  0.05,  0.0,   '双子η',    3.3,  'F0V'  ],
        [-0.5, -0.25,  0.08,  '双子λ',    3.6,  'A3V'  ],
        [ 0.2, -0.18, -0.06,  '双子ξ',    3.4,  'F5V'  ],
        [-0.6, -0.45,  0.12,  '双子δ',    3.5,  'F0IV' ],
        [ 0.1, -0.4,  -0.1,   '双子ν',    4.1,  'F0V'  ],
        [-0.35,-0.1,   0.02,  '双子ι',    3.8,  'G9III'],
        [ 0.45, 0.1,   0.04,  '双子κ',    3.6,  'G8III'],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,2],[2,4],[4,6],[6,8],[1,3],[3,5],[5,7],[7,9],[2,10],[3,11],[4,10],[5,11]],
    brightestStar: { nameCN: '北河三', nameEN: 'Pollux', spectralType: 'K0III', magnitude: 1.14 },
    mythology: {
      greek: 'Gemini represents the twin brothers Castor and Pollux, sons of Queen Leda of Sparta. Pollux was fathered by Zeus and immortal, while Castor was mortal. The brothers were inseparable and joined the Argonauts and the Calydonian Boar hunt together. When Castor was killed in battle, Pollux begged Zeus to let him share his immortality. Moved by their brotherly love, Zeus placed them both in the heavens as the constellation Gemini.',
      chinese: '双子座代表希腊神话中的孪生兄弟卡斯托尔和波吕丢刻斯。他们是斯巴达王后丽达的儿子，但波吕丢刻斯是宙斯之子，拥有不死之身，而卡斯托尔则是凡人。兄弟二人感情深厚，共同参与了阿尔戈英雄的远征和卡吕冬狩猎。在一次战斗中，卡斯托尔不幸阵亡。波吕丢刻斯悲痛万分，请求宙斯让他与兄弟共享不朽。宙斯被他们的兄弟之情所感动，将二人一起升上天空，成为永远在一起的双子星座。',
    },
    sketchPath: 'M40 20 L35 50 L30 80 L25 110 M90 20 L95 50 L100 80 L105 110 M35 50 L95 50 M30 80 L100 80 M25 110 L50 95 L105 110 M40 20 L65 35 L90 20 M30 80 L65 70 L100 80',
  },
  {
    id: 'cancer',
    nameCN: '巨蟹座',
    nameEN: 'Cancer',
    season: 'spring',
    eclipticAngle: Math.PI / 2,
    stars: (() => {
      const c = sphericalPos(Math.PI / 2, -0.05, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.12, 0.0,   '柳宿增十', 3.5, 'A5V'  ],
        [ 0.35, 0.22, -0.06, '鬼宿四',   3.9, 'A0V'  ],
        [-0.25, 0.18,  0.08, '鬼宿三',   4.2, 'A0V'  ],
        [ 0.1,  0.35, 0.0,   '巨蟹ι',    4.0, 'G8II' ],
        [-0.15,-0.12, 0.06,  '鬼宿一',   4.3, 'K4III'],
        [ 0.25,-0.08, -0.06, '鬼宿二',   4.7, 'A3V'  ],
        [-0.4,  0.0,   0.12, '巨蟹λ',    5.0, 'B9V'  ],
        [ 0.5,  0.12, -0.12, '巨蟹κ',    5.0, 'B8Vn' ],
        [ 0.2,  0.18, 0.0,   '巨蟹α',    4.3, 'A5m'  ],
        [-0.2,  0.06, 0.04,  '巨蟹β',    3.5, 'K4III'],
        [ 0.05,-0.25, 0.03,  '巨蟹δ',    3.9, 'K5III'],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[1,3],[2,4],[0,5],[4,6],[1,7],[2,8],[0,9],[5,10]],
    brightestStar: { nameCN: '柳宿增十', nameEN: 'Altarf', spectralType: 'A5V', magnitude: 3.5 },
    mythology: {
      greek: 'Cancer is connected to the labors of Heracles. While Heracles battled the Lernaean Hydra, Hera sent a giant crab from the swamp to pinch his foot and aid the Hydra. Heracles easily crushed the crab beneath his heel. In recognition of the crab\'s loyalty, Hera placed it in the sky as the constellation Cancer. Though faint, its story reminds us that even the smallest creatures can show bravery and loyalty.',
      chinese: '巨蟹座与赫拉克勒斯的十二功业有关。当赫拉克勒斯与勒拿沼泽的九头蛇海德拉搏斗时，天后赫拉派出一只巨大的螃蟹从沼泽中爬出，夹住赫拉克勒斯的脚以帮助海德拉。然而赫拉克勒斯轻松地将螃蟹踩碎。赫拉为了纪念螃蟹的忠诚，将它升上天空成为巨蟹座。虽然巨蟹座是最暗淡的黄道星座之一，但它的故事提醒人们，即使是最微小的生灵，也有其勇敢和忠诚的时刻。',
    },
    sketchPath: 'M40 60 L60 50 L80 60 L100 50 L120 60 M60 50 L50 30 M80 60 L75 30 M100 50 L110 30 M40 60 L25 45 L30 75 M120 60 L135 45 L130 75 M50 30 L75 20 L100 30 M75 30 L85 15',
  },
  {
    id: 'leo',
    nameCN: '狮子座',
    nameEN: 'Leo',
    season: 'summer',
    eclipticAngle: (2 * Math.PI) / 3,
    stars: (() => {
      const c = sphericalPos((2 * Math.PI) / 3, 0.1, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.2,   0.0,   '轩辕十四',   1.35, 'B7V'  ],
        [-0.35, 0.38, -0.12, '轩辕十二',   2.0,  'A0V'  ],
        [-0.6,  0.55, -0.18, '轩辕十一',   2.6,  'K2III'],
        [-0.25, 0.1,  -0.06, '轩辕九',     3.0,  'G7III'],
        [ 0.5,  0.35, -0.12, '五帝座一',   2.1,  'A4V'  ],
        [ 0.85, 0.18, -0.06, '太微右垣一', 2.6,  'G0II' ],
        [ 0.6,  0.5,  -0.18, '西上相',     3.3,  'A0V'  ],
        [ 0.25, 0.05,  0.0,   '轩辕十三',   3.4,  'K5III'],
        [ 0.95, 0.05,  0.0,   '太微右垣五', 3.3,  'B7V'  ],
        [ 0.7,  0.4,  -0.12, '五帝座四',   3.5,  'F6III'],
        [-0.48, 0.46, -0.15, '轩辕十',     3.5,  'B7V'  ],
        [-0.12, 0.32, -0.1,  '轩辕八',     3.9,  'G5III'],
        [ 0.38, 0.18, -0.04, '狮子χ',     4.6,  'F8V'  ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[1,2],[2,10],[0,3],[0,7],[7,4],[4,5],[4,6],[5,8],[4,9],[1,11],[7,12]],
    brightestStar: { nameCN: '轩辕十四', nameEN: 'Regulus', spectralType: 'B7V', magnitude: 1.35 },
    mythology: {
      greek: 'Leo represents the Nemean Lion, a fearsome beast with impenetrable golden hide, offspring of Typhon. For his first labor, Heracles traveled to Nemea and discovered no weapon could pierce the lion\'s skin. He grappled with the beast and strangled it with his bare hands, then used its own claws to skin it, creating an impenetrable cloak. Zeus placed the Nemean Lion among the stars to commemorate this great victory.',
      chinese: '狮子座代表希腊神话中的涅墨亚雄狮。这头巨狮有着刀枪不入的金色毛皮，是怪物提丰的后裔。赫拉克勒斯在完成十二功业的第一项任务时，来到了涅墨亚山谷。他发现任何武器都无法伤害这头雄狮，于是用双手将其扼死。赫拉克勒斯用狮子自己的爪子剥下它的皮，制成了一件刀枪不入的披风。宙斯将涅墨亚雄狮升上天空，成为狮子座，纪念这一伟大的功绩。',
    },
    sketchPath: 'M20 40 L45 30 L35 55 L60 45 L85 25 L55 70 L80 60 L110 70 L130 60 M20 40 L30 25 L15 55 M45 30 L60 15 M85 25 L70 10 M60 45 L50 20 M110 70 L135 85 L120 95 M80 60 L95 90 L110 70 M35 55 L50 80 L55 70',
  },
  {
    id: 'virgo',
    nameCN: '室女座',
    nameEN: 'Virgo',
    season: 'summer',
    eclipticAngle: (5 * Math.PI) / 6,
    stars: (() => {
      const c = sphericalPos((5 * Math.PI) / 6, -0.03, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.32, 0.0,   '角宿一',     0.98, 'A0V'  ],
        [ 0.4,  0.12, 0.06,  '角宿二',     2.7,  'A3V'  ],
        [-0.25, 0.18, -0.06, '亢宿一',     2.8,  'G8III'],
        [ 0.65,-0.12, 0.12,  '太微左垣一', 3.4,  'G9III'],
        [-0.5,  0.35, -0.12, '室女ε',      2.8,  'G8III'],
        [ 0.15,-0.25, 0.06,  '室女δ',      3.4,  'F0V'  ],
        [-0.7,  0.55, -0.18, '室女η',      3.9,  'A2V'  ],
        [ 0.75, 0.25, 0.1,   '室女γ',      2.7,  'F0V'  ],
        [-0.35, 0.06, 0.0,   '室女ζ',      3.4,  'F2V'  ],
        [ 0.25,-0.45, 0.12,  '室女θ',      4.4,  'A1V'  ],
        [-0.6,  0.45, -0.15, '室女ι',      4.1,  'F7V'  ],
        [ 0.5,-0.35, 0.1,    '室女λ',      4.5,  'A1V'  ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[1,3],[2,4],[1,5],[4,6],[3,7],[2,8],[5,9],[4,10],[3,11],[5,8]],
    brightestStar: { nameCN: '角宿一', nameEN: 'Spica', spectralType: 'A0V', magnitude: 0.98 },
    mythology: {
      greek: 'Virgo represents either Demeter, goddess of agriculture, or her daughter Persephone. When Persephone was abducted by Hades while picking flowers, Demeter\'s grief made the earth barren. Zeus ruled that Persephone would spend six months with her mother and six months in the underworld each year. When Persephone returns, spring comes; when she descends, winter arrives. Spica, the brightest star, represents the ear of wheat in Demeter\'s hand.',
      chinese: '室女座在希腊神话中最著名的身份是农业女神得墨忒尔或她的女儿珀耳塞福涅。传说珀耳塞福涅在采花时被冥王哈迪斯掳入地府，得墨忒尔悲痛欲绝，大地因此寸草不生。宙斯最终裁定珀耳塞福涅每年六个月回到母亲身边，六个月留在冥界。当珀耳塞福涅回到人间时春天降临，当她返回冥界时冬天笼罩世界。角宿一象征着得墨忒尔手中的麦穗，是室女座最亮的星。',
    },
    sketchPath: 'M70 15 L60 40 L80 60 L65 85 L50 110 M60 40 L35 35 L20 55 M80 60 L110 55 L130 75 M65 85 L90 90 L110 105 M35 35 L50 15 L70 15 M70 15 L90 30 L80 60 M50 110 L75 110 L90 90 M110 55 L120 35 L90 30',
  },
  {
    id: 'libra',
    nameCN: '天秤座',
    nameEN: 'Libra',
    season: 'summer',
    eclipticAngle: Math.PI,
    stars: (() => {
      const c = sphericalPos(Math.PI, -0.06, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.12, 0.0,   '氐宿一',     2.7,  'B8V'   ],
        [ 0.38, 0.25, -0.06, '氐宿四',     2.6,  'K3III' ],
        [-0.28, 0.2,  0.08,  '氐宿三',     3.9,  'B9V'   ],
        [ 0.65, 0.45, -0.12, '天秤σ',      3.3,  'A3V'   ],
        [-0.55, 0.32, 0.14,  '天秤ι',      4.5,  'B9V'   ],
        [ 0.2, -0.12, 0.0,   '天秤δ',      3.9,  'B9.5V' ],
        [-0.15,-0.08, 0.04,  '天秤β',      2.6,  'K3III' ],
        [ 0.5,  0.08, -0.04, '天秤θ',      4.1,  'F0V'   ],
        [-0.4, -0.02, 0.1,   '天秤γ',      3.9,  'K0III' ],
        [ 0.28, 0.38, -0.1,  '天秤υ',      3.6,  'F8V'   ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[1,3],[2,4],[0,5],[0,6],[5,7],[6,8],[1,9]],
    brightestStar: { nameCN: '氐宿四', nameEN: 'Zubeneschamali', spectralType: 'B8V', magnitude: 2.6 },
    mythology: {
      greek: 'Libra represents the scales held by Astraea, goddess of justice and daughter of Zeus and Themis. During the Golden Age she lived among mortals. As humanity degraded through successive ages, Astraea grew disillusioned and left earth to become Virgo. Her scales became Libra, suspended in the night sky as an eternal symbol of justice and balance. Libra is the only zodiac constellation named after an inanimate object.',
      chinese: '天秤座在希腊神话中代表正义女神阿斯特赖亚手中的天平。阿斯特赖亚是宙斯和忒弥斯的女儿，掌管正义与美德。在人类的黄金时代，她与人类和平共处。随着人类逐渐堕落，从白银时代到青铜时代再到黑铁时代，阿斯特赖亚对人间越来越失望，最终离开地球升上天空化为室女座。她手中的天平则成为天秤座，永远悬挂在夜空中，象征着公正与平衡。天秤座也是黄道十二星座中唯一以无生命物体命名的星座。',
    },
    sketchPath: 'M70 10 L55 25 L50 50 L30 75 L50 100 L90 100 L110 75 L90 50 L85 25 L70 10 M40 60 L65 60 L65 75 M95 60 L75 60 L75 75 M70 10 L55 25 L85 25 L70 10 M30 75 L10 95 L50 100 M110 75 L130 95 L90 100 M40 75 L35 90 L55 90 L60 75',
  },
  {
    id: 'scorpius',
    nameCN: '天蝎座',
    nameEN: 'Scorpius',
    season: 'summer',
    eclipticAngle: (7 * Math.PI) / 6,
    stars: (() => {
      const c = sphericalPos((7 * Math.PI) / 6, -0.15, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.45,  0.0,   '心宿二',     0.96, 'M1Ib'  ],
        [-0.28, 0.58, -0.06, '心宿一',     2.9,  'B1V'   ],
        [ 0.28, 0.35,  0.08,  '心宿三',     2.8,  'B2V'   ],
        [ 0.55, 0.15,  0.14,  '房宿三',     2.6,  'B1V'   ],
        [-0.55, 0.68, -0.12, '房宿一',     2.3,  'B0V'   ],
        [ 0.82,-0.12,  0.2,   '尾宿一',     2.7,  'B2V'   ],
        [ 1.1, -0.35,  0.26,  '尾宿二',     3.0,  'F1II'  ],
        [ 1.4, -0.58,  0.32,  '尾宿五',     2.7,  'K2III' ],
        [ 1.65,-0.7,   0.38,  '尾宿六',     3.3,  'B2V'   ],
        [ 1.88,-0.58,  0.44,  '尾宿八',     1.6,  'B1V'   ],
        [ 2.0, -0.4,   0.48,  '尾宿九',     2.7,  'B2V'   ],
        [ 0.15, 0.4,   0.02,  '天蝎τ',      2.8,  'B0V'   ],
        [-0.15, 0.5,  -0.04, '天蝎σ',      2.9,  'B1V'   ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[2,3],[1,4],[3,5],[5,6],[6,7],[7,8],[8,9],[9,10],[0,11],[0,12]],
    brightestStar: { nameCN: '心宿二', nameEN: 'Antares', spectralType: 'M1Ib', magnitude: 0.96 },
    mythology: {
      greek: 'Scorpius is linked to Orion the Hunter. Orion, son of Poseidon, arrogantly boasted he would slay every beast on earth. Gaia sent a giant scorpion to punish his hubris. The scorpion stung Orion fatally. Zeus placed both in the sky but at opposite ends—when Scorpius rises, Orion sets, and they never appear together. Antares, the scorpion\'s red heart, is known as the "rival of Mars" for its fiery glow.',
      chinese: '天蝎座与猎户座俄里翁有着紧密的关联。传说俄里翁是海神波塞冬之子，是一位伟大的猎手，他傲慢地宣称要杀尽世间所有猛兽。大地女神盖亚为此派出一只巨蝎来惩罚他的狂妄。巨蝎与俄里翁展开了激烈的战斗，最终巨蝎的毒刺刺中了俄里翁。宙斯将他们都升上天空，但安排在天空的对角——当天蝎座升起时，猎户座便会落下，两者永远不会同时出现在夜空中。心宿二因其红色光芒被称为"火星的对手"。',
    },
    sketchPath: 'M15 55 L35 40 L55 35 L75 45 L95 60 L110 80 L130 85 L125 105 L105 115 M35 40 L20 25 M55 35 L70 15 M75 45 L90 25 M15 55 L5 40 L5 70 M35 40 L25 55 M55 35 L45 55 M110 80 L135 95 M130 85 L140 65 M105 115 L125 125 L125 105',
  },
  {
    id: 'ophiuchus',
    nameCN: '蛇夫座',
    nameEN: 'Ophiuchus',
    season: 'summer',
    eclipticAngle: (17 * Math.PI) / 12,
    stars: (() => {
      const c = sphericalPos((17 * Math.PI) / 12, 0.08, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.4,   0.0,   '侯',        2.1,  'A5IV'   ],
        [ 0.35, 0.55,  0.1,   '蛇夫α',     2.6,  'B9.5V'  ],
        [-0.3,  0.55, -0.1,   '蛇夫β',     2.7,  'K2III'  ],
        [ 0.15, 0.18,  0.04,  '蛇夫γ',     3.2,  'K0III'  ],
        [-0.15, 0.18, -0.04, '蛇夫δ',     2.7,  'M1III'  ],
        [ 0.5,  0.0,   0.08,  '蛇夫ε',     3.3,  'G8III'  ],
        [-0.45, 0.0,  -0.08, '蛇夫ζ',     2.8,  'A4V'    ],
        [ 0.7, -0.25,  0.14,  '蛇夫η',     3.0,  'B5Vn'   ],
        [-0.65,-0.25, -0.14, '蛇夫θ',     3.3,  'B9IV'   ],
        [ 0.25,-0.4,   0.08,  '蛇夫κ',     3.2,  'K5III'  ],
        [-0.25,-0.4,  -0.08, '蛇夫ν',     3.4,  'B9V'    ],
        [ 0.0,  0.7,   0.0,   '蛇夫λ',     3.8,  'B9V'    ],
        [ 0.45,-0.1,   0.06,  '蛇夫ι',     4.5,  'B5V'    ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[0,3],[0,4],[3,5],[4,6],[5,7],[6,8],[5,9],[6,10],[0,11],[3,12],[4,12]],
    brightestStar: { nameCN: '侯', nameEN: 'Rasalhague', spectralType: 'A5IV', magnitude: 2.1 },
    mythology: {
      greek: 'Ophiuchus represents Asclepius, the son of Apollo and mortal Coronis, who became the greatest healer in Greek mythology. Chiron the centaur taught him medicine, and Asclepius grew so skilled he could raise the dead. This angered Hades, who complained to Zeus. Fearing mankind would escape death, Zeus struck Asclepius down with a thunderbolt. In remorse, Zeus placed him among the stars holding a serpent (constellation Serpens), symbolizing healing and rebirth.',
      chinese: '蛇夫座代表医学之神阿斯克勒庇俄斯，他是阿波罗与凡人科洛尼斯之子，成为希腊神话中最伟大的治疗师。半人马喀戎教给他医术，阿斯克勒庇俄斯的技艺日益精湛，甚至能够起死回生。这激怒了冥王哈迪斯，他向宙斯申诉。宙斯担心人类会因此逃脱死亡，便用雷电将阿斯克勒庇俄斯击死。出于懊悔，宙斯将他升上天空，手持一条蛇（巨蛇座），象征着治愈与重生。蛇与权杖的结合至今仍是医学的象征。',
    },
    sketchPath: 'M70 10 L55 35 L40 60 L50 85 L65 110 M70 10 L85 35 L100 60 L90 85 L75 110 M55 35 L85 35 M40 60 L30 75 M100 60 L110 75 M65 110 L75 110 M20 50 L40 35 L30 75 L10 90 M120 50 L100 35 L110 75 L130 90 M50 85 L70 75 L90 85',
  },
  {
    id: 'sagittarius',
    nameCN: '人马座',
    nameEN: 'Sagittarius',
    season: 'autumn',
    eclipticAngle: (4 * Math.PI) / 3,
    stars: (() => {
      const c = sphericalPos((4 * Math.PI) / 3, -0.1, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.15,  0.0,   '箕宿一',     2.0,  'A0V'   ],
        [ 0.4,  0.28, -0.06, '箕宿二',     2.7,  'K2III' ],
        [-0.28, 0.22,  0.08, '箕宿三',     2.8,  'B9V'   ],
        [ 0.65, 0.4,  -0.12, '斗宿二',     2.0,  'B9.5III'],
        [-0.52, 0.35,  0.14, '斗宿四',     2.8,  'B2V'   ],
        [ 0.25,-0.12,  0.0,   '斗宿一',     3.9,  'K3III' ],
        [-0.15,-0.25,  0.1,   '斗宿三',     3.1,  'F7II'  ],
        [ 0.55, 0.08, -0.04, '斗宿六',     2.8,  'F2II'  ],
        [-0.45, 0.02,  0.08,  '斗宿五',     3.3,  'K1III' ],
        [ 0.85, 0.52, -0.16, '人马ε',      1.8,  'B9.5III'],
        [-0.72, 0.48,  0.18, '人马δ',      2.7,  'K3III' ],
        [ 0.12, 0.4,  -0.06, '人马γ',      3.0,  'K0III' ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[1,3],[2,4],[0,5],[5,6],[1,7],[6,8],[3,9],[4,10],[0,11],[3,7]],
    brightestStar: { nameCN: '箕宿一', nameEN: 'Kaus Australis', spectralType: 'A0V', magnitude: 2.0 },
    mythology: {
      greek: 'Sagittarius represents Chiron, the wisest centaur and tutor to heroes. Unlike the savage centaurs, Chiron was skilled in medicine, music, and archery. He taught Achilles, Jason, and Asclepius among others. During a battle between Heracles and the centaurs, Chiron was accidentally wounded by an arrow dipped in Hydra venom. Being immortal he could not die but suffered eternally. Chiron surrendered his immortality to free Prometheus, and Zeus placed him among the stars.',
      chinese: '人马座代表半人马喀戎，他是诸神的导师，也是最睿智和善良的半人马。喀戎是克洛诺斯之子，与野蛮的半人马不同，他精通医术、音乐和射箭。他曾教导过阿喀琉斯、伊阿宋和阿斯克勒庇俄斯等众多英雄。在赫拉克勒斯与半人马族的战斗中，喀戎被涂有海德拉毒血的箭误伤。作为不死之身，他无法死去却要承受无尽的痛苦。最终，喀戎自愿放弃永生，将不死之身让给普罗米修斯，宙斯感其高尚将他升上天空成为人马座。',
    },
    sketchPath: 'M20 70 L45 65 L65 50 L75 30 L95 20 L110 40 L85 55 M95 20 L115 35 L130 20 L125 55 L105 70 L85 55 M65 50 L55 75 L30 95 L15 115 M75 30 L85 15 M20 70 L35 90 L55 75 M105 70 L95 90 L75 85 L65 50',
  },
  {
    id: 'capricornus',
    nameCN: '摩羯座',
    nameEN: 'Capricornus',
    season: 'autumn',
    eclipticAngle: (3 * Math.PI) / 2,
    stars: (() => {
      const c = sphericalPos((3 * Math.PI) / 2, -0.02, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.12,  0.0,   '牛宿一',     3.6,  'G3II'  ],
        [ 0.38, 0.25, -0.06, '牛宿二',     3.1,  'K0II'  ],
        [-0.28, 0.18,  0.08, '摩羯ε',      4.5,  'B9.5V' ],
        [ 0.65, 0.38, -0.12, '摩羯δ',      2.9,  'A7III' ],
        [-0.52, 0.32,  0.14, '摩羯γ',      3.7,  'F0V'   ],
        [ 0.88, 0.2,  -0.08, '摩羯ω',      4.1,  'B9.5V' ],
        [-0.75, 0.45,  0.18, '摩羯ι',      4.3,  'G8III' ],
        [ 0.55, 0.08,  0.0,   '摩羯ψ',      4.1,  'F5V'   ],
        [-0.42, 0.38,  0.12, '摩羯φ',      5.2,  'B9V'   ],
        [ 0.25,-0.1,   0.04,  '摩羯β',      3.1,  'K0II'  ],
        [-0.15, 0.25,  0.05, '摩羯α',      3.6,  'G3II'  ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[1,3],[2,4],[3,5],[4,6],[1,7],[4,8],[0,9],[0,10]],
    brightestStar: { nameCN: '牛宿二', nameEN: 'Deneb Algedi', spectralType: 'A7III', magnitude: 2.9 },
    mythology: {
      greek: 'Capricornus represents the transformed god Pan. During a feast of the gods, the monster Typhon attacked, and the gods transformed to escape. Pan leapt into the Nile to become a fish, but in his panic only his lower half transformed while his upper half remained a goat. This half-goat, half-fish form was placed in the sky as Capricornus. Pan, protector of shepherds and inventor of the pan flute, gave this constellation its unique and entertaining form.',
      chinese: '摩羯座代表牧神潘的化身。在一次诸神聚会中，怪物提丰突然袭击，众神纷纷变形逃命。潘本想变成一条鱼跳入尼罗河，但因恐慌过度，只有下半身变成了鱼，上半身仍保持了山羊的形态。这种半羊半鱼的奇异形象被升上天空，成为摩羯座。潘是牧羊人和羊群的保护神，他发明了排箫，常在山林中吹奏。虽然摩羯座中缺少亮星，但它独特的形象和有趣的故事使它在黄道星座中独树一帜。',
    },
    sketchPath: 'M20 85 L45 75 L60 55 L45 35 L70 25 L90 40 L105 65 L130 75 L110 105 L70 100 L45 115 M45 35 L55 20 M70 25 L80 10 M60 55 L75 45 M105 65 L115 90 M20 85 L5 70 L5 95 M70 100 L50 115 M130 75 L145 60 L140 90 L110 105',
  },
  {
    id: 'aquarius',
    nameCN: '宝瓶座',
    nameEN: 'Aquarius',
    season: 'autumn',
    eclipticAngle: (5 * Math.PI) / 3,
    stars: (() => {
      const c = sphericalPos((5 * Math.PI) / 3, 0.05, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.2,   0.0,   '虚宿一',     2.9,  'F0III' ],
        [ 0.38, 0.12, -0.06, '虚宿二',     3.8,  'A0V'   ],
        [-0.28, 0.35,  0.08, '宝瓶β',      2.9,  'G0Ib'  ],
        [ 0.65, 0.02, -0.12, '危宿一',     3.3,  'B8V'   ],
        [-0.55, 0.48,  0.14, '宝瓶λ',      3.7,  'G8III' ],
        [ 0.25, 0.42, -0.08, '宝瓶δ',      3.3,  'A3V'   ],
        [-0.15, 0.12,  0.04, '宝瓶γ',      3.8,  'F0V'   ],
        [ 0.5,  0.28, -0.1,  '宝瓶ε',      3.8,  'A1V'   ],
        [-0.42, 0.22,  0.1,  '宝瓶ζ',      3.6,  'F3V'   ],
        [ 0.78, 0.15, -0.14, '宝瓶π',      4.5,  'B1V'   ],
        [-0.68, 0.58,  0.18, '宝瓶φ',      4.2,  'A3V'   ],
        [ 0.15, 0.5,  -0.05, '宝瓶τ',      4.0,  'A8V'   ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[1,3],[2,4],[0,5],[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]],
    brightestStar: { nameCN: '虚宿一', nameEN: 'Sadalmelik', spectralType: 'F0III', magnitude: 2.9 },
    mythology: {
      greek: 'Aquarius represents the beautiful Trojan youth Ganymede. Zeus, captivated by his beauty, transformed into an eagle and carried Ganymede from Mount Ida to Olympus, where he became cupbearer to the gods. Ganymede poured nectar from his golden jug for the divine assembly. To comfort Ganymede\'s father King Tros, Zeus sent Hermes with divine horses and the promise of immortality. The image of Ganymede pouring became Aquarius, its eternal stream symbolizing Zeus\'s devotion.',
      chinese: '宝瓶座代表特洛伊美少年伽倪墨得斯。宙斯被他的美貌所吸引，化身为一只雄鹰将他从特洛伊山上掠走，带到奥林匹斯山成为众神的侍酒者。伽倪墨得斯手持金壶，为众神斟酒。为了安慰伽倪墨得斯的父亲特罗斯国王，宙斯派赫尔墨斯送去两匹神马，并告知其子已获得永生。伽倪墨得斯倒酒的形象被升上天空，成为宝瓶座，那永不停息的水流象征着宙斯不朽的爱意。',
    },
    sketchPath: 'M30 15 L55 25 L50 50 L75 55 L100 45 L100 75 L80 95 L60 120 L45 105 M50 50 L30 65 M75 55 L85 75 L105 65 M30 15 L15 30 L5 10 M100 45 L125 30 L135 50 M60 120 L35 110 L25 130 L60 135 L75 120 M55 25 L80 20 M45 105 L65 95 L80 95',
  },
  {
    id: 'pisces',
    nameCN: '双鱼座',
    nameEN: 'Pisces',
    season: 'winter',
    eclipticAngle: (11 * Math.PI) / 6,
    stars: (() => {
      const c = sphericalPos((11 * Math.PI) / 6, 0.08, R);
      const pts: [number, number, number, string, number, string][] = [
        [ 0.0,  0.18,  0.0,   '外屏七',     3.6,  'A0V'   ],
        [ 0.4,  0.3,  -0.06, '外屏一',     4.5,  'K5III' ],
        [-0.28, 0.25,  0.08, '外屏二',     4.4,  'A0V'   ],
        [ 0.65, 0.45, -0.12, '双鱼η',      3.6,  'G7III' ],
        [-0.55, 0.4,   0.14, '双鱼γ',      3.7,  'G9III' ],
        [ 0.25, 0.06, -0.04, '双鱼α',      3.8,  'A0p'   ],
        [-0.15, 0.12,  0.05, '双鱼β',      4.5,  'B6V'   ],
        [ 0.85, 0.25, -0.12, '双鱼ο',      4.3,  'K2III' ],
        [-0.72, 0.52,  0.18, '双鱼ε',      4.3,  'K3III' ],
        [ 0.55, 0.12, -0.04, '双鱼δ',      4.4,  'K4III' ],
        [-0.42, 0.2,   0.1,  '双鱼ζ',      5.2,  'A7V'   ],
        [ 0.15,-0.15,  0.0,   '双鱼ι',      4.1,  'F0V'   ],
        [ 0.48, 0.35, -0.1,  '双鱼ν',      4.5,  'K3III' ],
      ];
      return pts.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0,1],[0,2],[1,3],[2,4],[0,5],[0,6],[3,7],[4,8],[5,9],[6,10],[5,11],[3,12]],
    brightestStar: { nameCN: '外屏七', nameEN: 'Eta Piscium', spectralType: 'G7III', magnitude: 3.6 },
    mythology: {
      greek: 'Pisces is associated with Aphrodite and her son Eros. When the monster Typhon attacked Olympus, the gods transformed to escape. Aphrodite and Eros were cornered at the Euphrates River by Typhon. They leapt into the water and transformed into two fish, tying their tails together with a ribbon so they would not be separated in the current. Zeus placed the mother-son pair in the sky as Pisces, their ribbon-bound forms symbolizing the unbreakable bond of family love.',
      chinese: '双鱼座与爱神阿佛洛狄忒和她的儿子厄洛斯有关。当怪物提丰向奥林匹斯山进攻时，众神纷纷变形逃命。阿佛洛狄忒和厄洛斯在幼发拉底河边被提丰截住，母子二人急中生智，跳入河中变成两条鱼，用丝带将尾巴绑在一起，以免在湍急的河流中走散。宙斯将这对母子鱼的形象升上天空，成为双鱼座。两条鱼由一条丝带相连的图案，象征着亲情与爱的纽带永不断裂。',
    },
    sketchPath: 'M10 20 L40 30 L35 55 L55 65 L75 50 L85 65 L70 85 L45 80 L25 100 L35 125 L60 130 L85 115 L110 105 L130 85 L110 60 L95 40 L120 25 L140 35 M55 65 L85 35 L70 55 M35 55 L15 75 M25 100 L5 115 M120 25 L130 10 L140 35 M110 60 L135 75 L140 55 M70 85 L85 100 M45 80 L55 100 L60 130 M75 50 L95 55 M110 105 L95 120',
  },
];

export default constellations;
