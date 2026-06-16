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
    cn: string;
    en: string;
  };
}

function eclipticPos(angle: number, lat: number, radius: number): [number, number, number] {
  const x = radius * Math.cos(angle) * Math.cos(lat);
  const y = radius * Math.sin(lat);
  const z = radius * Math.sin(angle) * Math.cos(lat);
  return [x, y, z];
}

const R = 20;

const constellations: ConstellationData[] = [
  {
    id: 'aries',
    nameCN: '白羊座',
    nameEN: 'Aries',
    season: 'spring',
    eclipticAngle: 0,
    stars: (() => {
      const c = eclipticPos(0, 0.05, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.3, 0, '娄宿三', 2.0, 'K2III'],
        [0.4, 0.15, 0.1, '娄宿一', 2.6, 'A5V'],
        [0.7, 0, 0.15, '胃宿一', 3.6, 'B8V'],
        [1.0, -0.15, 0.2, '胃宿三', 4.0, 'A0V'],
        [1.3, -0.3, 0.25, '白羊座41', 3.6, 'B8Vn'],
        [0.2, 0.5, -0.1, '白羊座π', 5.3, 'B7V'],
        [0.5, 0.35, 0, '白羊座ε', 4.6, 'A2V'],
        [0.8, 0.1, 0.1, '白羊座δ', 4.4, 'A3V'],
        [1.1, -0.2, 0.2, '白羊座ν', 5.5, 'A7V'],
        [0.35, 0.2, 0.05, '白羊座ο', 5.6, 'F5V'],
        [0.6, 0.2, 0.1, '白羊座σ', 5.5, 'B8V'],
        [0.9, -0.05, 0.15, '白羊座τ', 5.3, 'B5V'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [2, 6], [3, 7], [3, 8], [0, 9], [1, 10], [2, 11]],
    brightestStar: { nameCN: '娄宿三', nameEN: 'Hamal', spectralType: 'K2III', magnitude: 2.0 },
    mythology: {
      cn: '在希腊神话中，白羊座代表着一只拥有金色羊毛的神奇公羊。传说中，国王阿塔玛斯的两个孩子弗里克索斯和赫勒遭到继母伊诺的迫害，赫尔墨斯派出一只会飞的金毛公羊前来营救。公羊载着两个孩子飞越大海，但赫勒不幸坠入海中，那片海域因此被称为赫勒海峡。弗里克索斯最终抵达科尔基斯，将金羊毛献给了国王埃厄忒斯，羊毛被挂在圣林中由巨龙看守。后来，金羊毛成为了伊阿宋和阿尔戈英雄们远征的目标，这一壮举成为了希腊神话中最著名的冒险故事之一。',
      en: 'In Greek mythology, Aries represents the golden-fleeced ram that rescued Phrixus and Helle, children of King Athamas, from their evil stepmother Ino. Hermes sent the magical flying ram to save them. As the ram carried them across the sea, Helle fell to her death, and the strait was named the Hellespont in her honor. Phrixus reached Colchis safely and sacrificed the ram to Zeus, presenting its golden fleece to King Aeetes, who hung it in a sacred grove guarded by a sleepless dragon. The Golden Fleece later became the quest of Jason and the Argonauts, one of the most celebrated adventures in Greek mythology.',
    },
  },
  {
    id: 'taurus',
    nameCN: '金牛座',
    nameEN: 'Taurus',
    season: 'spring',
    eclipticAngle: Math.PI / 6,
    stars: (() => {
      const c = eclipticPos(Math.PI / 6, 0.08, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.2, 0, '毕宿五', 0.85, 'K5III'],
        [0.3, 0.3, -0.1, '毕宿一', 3.4, 'A7V'],
        [-0.2, 0.15, 0.1, '毕宿二', 3.8, 'A0V'],
        [0.15, 0.1, 0.05, '毕宿三', 3.6, 'G8III'],
        [-0.1, 0.05, 0, '毕宿四', 3.8, 'B3V'],
        [0.8, 0.6, -0.3, '五车五', 1.65, 'B7III'],
        [-0.7, 0.5, -0.2, '天关', 3.0, 'B3V'],
        [0.5, 0.4, -0.15, '金牛座θ', 3.4, 'A7V'],
        [-0.4, 0.35, -0.1, '金牛座λ', 3.5, 'B3V'],
        [1.0, 0.7, -0.4, '金牛座ζ', 3.0, 'B7III'],
        [-0.9, 0.6, -0.25, '金牛座ε', 3.5, 'B3V'],
        [0.6, 0.5, -0.2, '金牛座γ', 3.6, 'A0V'],
        [-0.5, 0.4, -0.15, '金牛座δ', 3.8, 'A0V'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6], [5, 7], [6, 8], [5, 9], [6, 10], [7, 11], [8, 12]],
    brightestStar: { nameCN: '毕宿五', nameEN: 'Aldebaran', spectralType: 'K5III', magnitude: 0.85 },
    mythology: {
      cn: '金牛座在希腊神话中代表宙斯化身的一头白色公牛。传说腓尼基公主欧罗巴在海边玩耍时，宙斯被她的美貌所吸引，化身为一头温顺华美的白牛靠近她。欧罗巴被白牛的美丽所吸引，骑上了它的背。白牛随即跃入大海，载着欧罗巴游向克里特岛。在克里特岛上，宙斯恢复真身，与欧罗巴生下了米诺斯等三个儿子。米诺斯后来成为克里特国王，欧洲大陆也因此以欧罗巴的名字命名。这是古希腊神话中最浪漫的故事之一。',
      en: 'In Greek mythology, Taurus represents Zeus transformed into a magnificent white bull. The Phoenician princess Europa was playing by the sea when Zeus, captivated by her beauty, assumed the form of a gentle, beautiful white bull and approached her. Drawn to the creature, Europa climbed upon its back, and the bull immediately plunged into the sea, carrying her across the waters to Crete. There, Zeus revealed his true identity, and Europa bore him three sons, including Minos, who became the king of Crete. The continent of Europe was named after Europa, making this one of the most romantic tales in Greek mythology.',
    },
  },
  {
    id: 'gemini',
    nameCN: '双子座',
    nameEN: 'Gemini',
    season: 'spring',
    eclipticAngle: Math.PI / 3,
    stars: (() => {
      const c = eclipticPos(Math.PI / 3, 0.02, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.5, 0, '北河三', 1.14, 'K0III'],
        [0.5, 0.6, 0.1, '北河二', 1.58, 'A2V'],
        [-0.1, 0.2, -0.05, '双子座μ', 2.9, 'M3III'],
        [0.4, 0.3, 0.05, '双子座ε', 3.0, 'G8III'],
        [-0.2, 0, 0, '双子座ζ', 3.4, 'F5V'],
        [0.3, 0.05, 0, '双子座η', 3.3, 'F0V'],
        [-0.3, -0.2, 0.05, '双子座λ', 3.6, 'A3V'],
        [0.2, -0.15, -0.05, '双子座ξ', 3.4, 'F5V'],
        [-0.4, -0.4, 0.1, '双子座δ', 3.5, 'F0IV'],
        [0.1, -0.35, -0.1, '双子座ν', 4.1, 'F0V'],
        [-0.15, -0.1, 0, '双子座ι', 3.8, 'G9III'],
        [0.35, 0.1, 0.02, '双子座κ', 3.6, 'G8III'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 2], [2, 4], [4, 6], [6, 8], [1, 3], [3, 5], [5, 7], [7, 9], [2, 10], [3, 11], [4, 10], [5, 11]],
    brightestStar: { nameCN: '北河三', nameEN: 'Pollux', spectralType: 'K0III', magnitude: 1.14 },
    mythology: {
      cn: '双子座代表希腊神话中的孪生兄弟卡斯托尔和波吕丢刻斯。他们是斯巴达王后丽达的儿子，但波吕丢刻斯是宙斯之子，拥有不死之身，而卡斯托尔则是凡人。兄弟二人感情深厚，共同参与了阿尔戈英雄的远征和卡吕冬狩猎。在一次战斗中，卡斯托尔不幸阵亡。波吕丢刻斯悲痛万分，请求宙斯让他与兄弟共享不朽。宙斯被他们的兄弟之情所感动，将二人一起升上天空，成为永远在一起的双子星座。',
      en: 'Gemini represents the twin brothers Castor and Pollux from Greek mythology. They were sons of Leda, Queen of Sparta, but while Pollux was fathered by Zeus and thus immortal, Castor was mortal. The brothers were inseparable and joined the Argonauts and the Calydonian Boar hunt together. When Castor was killed in battle, Pollux was devastated and begged Zeus to let him share his immortality with his brother. Moved by their brotherly love, Zeus placed them both in the heavens as the constellation Gemini, where they would remain together for eternity.',
    },
  },
  {
    id: 'cancer',
    nameCN: '巨蟹座',
    nameEN: 'Cancer',
    season: 'spring',
    eclipticAngle: Math.PI / 2,
    stars: (() => {
      const c = eclipticPos(Math.PI / 2, -0.03, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.1, 0, '柳宿增十', 3.5, 'A5V'],
        [0.3, 0.2, -0.05, '鬼宿四', 3.9, 'A0V'],
        [-0.2, 0.15, 0.05, '鬼宿三', 4.2, 'A0V'],
        [0.1, 0.3, 0, '巨蟹座ι', 4.0, 'G8II'],
        [-0.1, -0.1, 0.05, '鬼宿一', 4.3, 'K4III'],
        [0.2, -0.05, -0.05, '鬼宿二', 4.7, 'A3V'],
        [-0.3, 0, 0.1, '巨蟹座λ', 5.0, 'B9V'],
        [0.4, 0.1, -0.1, '巨蟹座κ', 5.0, 'B8Vn'],
        [0.15, 0.15, 0, '巨蟹座α', 4.3, 'A5m'],
        [-0.15, 0.05, 0.03, '巨蟹座β', 3.5, 'K4III'],
        [0.05, -0.2, 0.02, '巨蟹座δ', 3.9, 'K5III'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [0, 5], [4, 6], [1, 7], [2, 8], [0, 9], [5, 10]],
    brightestStar: { nameCN: '柳宿增十', nameEN: 'Altarf', spectralType: 'A5V', magnitude: 3.5 },
    mythology: {
      cn: '巨蟹座在希腊神话中与赫拉克勒斯的十二功业有关。当赫拉克勒斯与勒拿沼泽的九头蛇海德拉搏斗时，天后赫拉派出一只巨大的螃蟹从沼泽中爬出，夹住赫拉克勒斯的脚以帮助海德拉。然而赫拉克勒斯轻松地将螃蟹踩碎。赫拉为了纪念螃蟹的忠诚，将它升上天空成为巨蟹座。虽然巨蟹座是最暗淡的黄道星座之一，但它的故事提醒人们，即使是最微小的生灵，也有其勇敢和忠诚的时刻。',
      en: 'In Greek mythology, Cancer is connected to the labors of Heracles. While Heracles battled the Lernaean Hydra, Hera sent a giant crab from the swamp to pinch his foot and aid the Hydra. Heracles easily crushed the crab beneath his heel. In recognition of the crab\'s loyalty, Hera placed it in the sky as the constellation Cancer. Though Cancer is one of the faintest zodiac constellations, its story reminds us that even the smallest creatures can show bravery and loyalty.',
    },
  },
  {
    id: 'leo',
    nameCN: '狮子座',
    nameEN: 'Leo',
    season: 'summer',
    eclipticAngle: (2 * Math.PI) / 3,
    stars: (() => {
      const c = eclipticPos((2 * Math.PI) / 3, 0.06, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.2, 0, '轩辕十四', 1.35, 'B7V'],
        [-0.3, 0.35, -0.1, '轩辕十二', 2.0, 'A0V'],
        [-0.5, 0.5, -0.15, '轩辕十一', 2.6, 'K2III'],
        [-0.2, 0.1, -0.05, '轩辕九', 3.0, 'G7III'],
        [0.4, 0.3, -0.1, '五帝座一', 2.1, 'A4V'],
        [0.7, 0.15, -0.05, '太微右垣一', 2.6, 'G0II'],
        [0.5, 0.45, -0.15, '西上相', 3.3, 'A0V'],
        [0.2, 0.05, 0, '轩辕十三', 3.4, 'K5III'],
        [0.8, 0.05, 0, '太微右垣五', 3.3, 'B7V'],
        [0.6, 0.35, -0.1, '五帝座四', 3.5, 'F6III'],
        [-0.4, 0.4, -0.12, '轩辕十', 3.5, 'B7V'],
        [-0.1, 0.3, -0.08, '轩辕八', 3.9, 'G5III'],
        [0.3, 0.15, -0.03, '狮子座χ', 4.6, 'F8V'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [1, 2], [2, 10], [0, 3], [0, 7], [7, 4], [4, 5], [4, 6], [5, 8], [4, 9], [1, 11], [7, 12]],
    brightestStar: { nameCN: '轩辕十四', nameEN: 'Regulus', spectralType: 'B7V', magnitude: 1.35 },
    mythology: {
      cn: '狮子座代表希腊神话中的涅墨亚雄狮。这头巨狮有着刀枪不入的金色毛皮，是怪物提丰的后裔。赫拉克勒斯在完成十二功业中的第一项任务时，来到了涅墨亚山谷。他发现任何武器都无法伤害这头雄狮，于是用双手将其扼死。赫拉克勒斯用狮子自己的爪子剥下它的皮，制成了一件刀枪不入的披风。宙斯将涅墨亚雄狮升上天空，成为狮子座，纪念赫拉克勒斯最伟大的功绩之一。轩辕十四是狮子的心脏，闪烁着王者之星的光芒。',
      en: 'Leo represents the Nemean Lion from Greek mythology. This fearsome beast had an impenetrable golden hide and was the offspring of the monster Typhon. When Heracles was tasked with his first labor, he traveled to the valley of Nemea and discovered that no weapon could pierce the lion\'s skin. He grappled with the beast and strangled it with his bare hands. Heracles then used the lion\'s own claws to skin it, creating an impenetrable cloak. Zeus placed the Nemean Lion among the stars as Leo, commemorating one of Heracles\' greatest achievements. Regulus, the lion\'s heart, shines with the radiance of a king star.',
    },
  },
  {
    id: 'virgo',
    nameCN: '处女座',
    nameEN: 'Virgo',
    season: 'summer',
    eclipticAngle: (5 * Math.PI) / 6,
    stars: (() => {
      const c = eclipticPos((5 * Math.PI) / 6, -0.02, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.3, 0, '角宿一', 0.98, 'A0V'],
        [0.3, 0.1, 0.05, '角宿二', 2.7, 'A3V'],
        [-0.2, 0.15, -0.05, '亢宿一', 2.8, 'G8III'],
        [0.5, -0.1, 0.1, '太微左垣一', 3.4, 'G9III'],
        [-0.4, 0.3, -0.1, '处女座ε', 2.8, 'G8III'],
        [0.1, -0.2, 0.05, '处女座δ', 3.4, 'F0V'],
        [-0.6, 0.5, -0.15, '处女座η', 3.9, 'A2V'],
        [0.6, 0.2, 0.08, '处女座γ', 2.7, 'F0V'],
        [-0.3, 0.05, 0, '处女座ζ', 3.4, 'F2V'],
        [0.2, -0.4, 0.1, '处女座θ', 4.4, 'A1V'],
        [-0.5, 0.4, -0.12, '处女座ι', 4.1, 'F7V'],
        [0.4, -0.3, 0.08, '处女座λ', 4.5, 'A1V'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [4, 6], [3, 7], [2, 8], [5, 9], [4, 10], [3, 11], [5, 8]],
    brightestStar: { nameCN: '角宿一', nameEN: 'Spica', spectralType: 'A0V', magnitude: 0.98 },
    mythology: {
      cn: '处女座在希腊神话中有多个身份，最著名的是农业与丰收女神得墨忒尔，或是她的女儿珀耳塞福涅。传说珀耳塞福涅在采花时被冥王哈迪斯掳入地府，得墨忒尔悲痛欲绝，大地因此寸草不生。宙斯最终裁定珀耳塞福涅每年有六个月回到母亲身边，另外六个月留在冥界。当珀耳塞福涅回到人间时，春天便降临大地；当她返回冥界时，冬天便笼罩世界。角宿一象征着得墨忒尔手中的麦穗，是处女座最亮的星。',
      en: 'In Greek mythology, Virgo has multiple identities, most notably Demeter, the goddess of agriculture and harvest, or her daughter Persephone. When Persephone was abducted by Hades while picking flowers, Demeter\'s grief caused the earth to become barren. Zeus eventually ruled that Persephone would spend six months with her mother and six months in the underworld. When Persephone returns to the surface, spring arrives; when she descends, winter grips the world. Spica, the brightest star in Virgo, represents the ear of wheat in Demeter\'s hand, symbolizing the eternal cycle of seasons.',
    },
  },
  {
    id: 'libra',
    nameCN: '天秤座',
    nameEN: 'Libra',
    season: 'summer',
    eclipticAngle: Math.PI,
    stars: (() => {
      const c = eclipticPos(Math.PI, -0.04, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.1, 0, '氐宿一', 2.7, 'B8V'],
        [0.3, 0.2, -0.05, '氐宿四', 2.6, 'K3III'],
        [-0.2, 0.15, 0.05, '氐宿三', 3.9, 'B9V'],
        [0.5, 0.35, -0.1, '天秤座σ', 3.3, 'A3V'],
        [-0.4, 0.25, 0.1, '天秤座ι', 4.5, 'B9V'],
        [0.15, -0.1, 0, '天秤座δ', 3.9, 'B9.5V'],
        [-0.1, -0.05, 0.02, '天秤座β', 2.6, 'K3III'],
        [0.4, 0.05, -0.03, '天秤座θ', 4.1, 'F0V'],
        [-0.3, 0, 0.08, '天秤座γ', 3.9, 'K0III'],
        [0.2, 0.3, -0.08, '天秤座υ', 3.6, 'F8V'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [0, 5], [0, 6], [5, 7], [6, 8], [1, 9]],
    brightestStar: { nameCN: '氐宿四', nameEN: 'Zubeneschamali', spectralType: 'B8V', magnitude: 2.6 },
    mythology: {
      cn: '天秤座在希腊神话中代表正义女神阿斯特赖亚手中的天平。阿斯特赖亚是宙斯和忒弥斯的女儿，掌管正义与美德。在人类的黄金时代，她与人类和平共处。随着人类逐渐堕落，从白银时代到青铜时代再到黑铁时代，阿斯特赖亚对人间越来越失望，最终离开地球升上天空，化为处女座。她手中的天平则成为天秤座，永远悬挂在夜空中，象征着公正与平衡。天秤座也是黄道十二星座中唯一以无生命物体命名的星座。',
      en: 'In Greek mythology, Libra represents the scales held by Astraea, the goddess of justice. Astraea, daughter of Zeus and Themis, presided over justice and virtue. During the Golden Age of humanity, she lived among mortals in harmony. As humanity degraded through the Silver and Bronze Ages to the Iron Age, Astraea grew increasingly disillusioned and finally left the earth to become the constellation Virgo. Her scales became Libra, eternally suspended in the night sky, symbolizing justice and balance. Libra is the only zodiac constellation named after an inanimate object.',
    },
  },
  {
    id: 'scorpius',
    nameCN: '天蝎座',
    nameEN: 'Scorpius',
    season: 'summer',
    eclipticAngle: (7 * Math.PI) / 6,
    stars: (() => {
      const c = eclipticPos((7 * Math.PI) / 6, -0.1, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.4, 0, '心宿二', 0.96, 'M1Ib'],
        [-0.2, 0.5, -0.05, '心宿一', 2.9, 'B1V'],
        [0.2, 0.3, 0.05, '心宿三', 2.8, 'B2V'],
        [0.4, 0.1, 0.1, '房宿三', 2.6, 'B1V'],
        [-0.4, 0.6, -0.1, '房宿一', 2.3, 'B0V'],
        [0.6, -0.1, 0.15, '尾宿一', 2.7, 'B2V'],
        [0.8, -0.3, 0.2, '尾宿二', 3.0, 'F1II'],
        [1.0, -0.5, 0.25, '尾宿五', 2.7, 'K2III'],
        [1.2, -0.6, 0.3, '尾宿六', 3.3, 'B2V'],
        [1.4, -0.5, 0.35, '尾宿八', 1.6, 'B1V'],
        [1.5, -0.35, 0.4, '尾宿九', 2.7, 'B2V'],
        [0.1, 0.35, 0.02, '天蝎座τ', 2.8, 'B0V'],
        [-0.1, 0.45, -0.03, '天蝎座σ', 2.9, 'B1V'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [0, 2], [2, 3], [1, 4], [3, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [0, 11], [0, 12]],
    brightestStar: { nameCN: '心宿二', nameEN: 'Antares', spectralType: 'M1Ib', magnitude: 0.96 },
    mythology: {
      cn: '天蝎座与猎户座俄里翁有着紧密的关联。传说俄里翁是海神波塞冬之子，是一位伟大的猎手，他傲慢地宣称要杀尽世间所有猛兽。大地女神盖亚为此派出一只巨蝎来惩罚他的狂妄。巨蝎与俄里翁展开了激烈的战斗，最终巨蝎的毒刺刺中了俄里翁。宙斯将他们都升上天空，但安排在天空的对角——当天蝎座升起时，猎户座便会落下，两者永远不会同时出现在夜空中。心宿二因其红色光芒被称为"火星的对手"。',
      en: 'Scorpius is closely linked to Orion the Hunter. The great hunter Orion, son of Poseidon, arrogantly boasted that he would slay every beast on earth. Gaia, the earth goddess, sent a giant scorpion to punish his hubris. The scorpion battled Orion fiercely and ultimately stung him with its deadly tail. Zeus placed both in the sky, but at opposite ends—when Scorpius rises, Orion sets, and they never appear together in the night sky. Antares, with its reddish glow, is known as "the rival of Mars," a fitting name for the scorpion\'s fiery heart.',
    },
  },
  {
    id: 'sagittarius',
    nameCN: '射手座',
    nameEN: 'Sagittarius',
    season: 'autumn',
    eclipticAngle: (4 * Math.PI) / 3,
    stars: (() => {
      const c = eclipticPos((4 * Math.PI) / 3, -0.08, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.1, 0, '箕宿一', 2.0, 'A0V'],
        [0.3, 0.2, -0.05, '箕宿二', 2.7, 'K2III'],
        [-0.2, 0.15, 0.05, '箕宿三', 2.8, 'B9V'],
        [0.5, 0.3, -0.1, '斗宿二', 2.0, 'B9.5III'],
        [-0.4, 0.25, 0.1, '斗宿四', 2.8, 'B2V'],
        [0.2, -0.1, 0, '斗宿一', 3.9, 'K3III'],
        [-0.1, -0.2, 0.08, '斗宿三', 3.1, 'F7II'],
        [0.4, 0.05, -0.03, '斗宿六', 2.8, 'F2II'],
        [-0.3, 0, 0.06, '斗宿五', 3.3, 'K1III'],
        [0.6, 0.4, -0.12, '射手座ε', 1.8, 'B9.5III'],
        [-0.5, 0.35, 0.12, '射手座δ', 2.7, 'K3III'],
        [0.1, 0.3, -0.05, '射手座γ', 3.0, 'K0III'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [0, 5], [5, 6], [1, 7], [6, 8], [3, 9], [4, 10], [0, 11], [3, 7]],
    brightestStar: { nameCN: '箕宿一', nameEN: 'Kaus Australis', spectralType: 'A0V', magnitude: 2.0 },
    mythology: {
      cn: '射手座代表半人马喀戎，他是诸神的导师，也是最睿智和善良的半人马。喀戎是克洛诺斯之子，与野蛮的半人马不同，他精通医术、音乐和射箭。他曾教导过阿喀琉斯、伊阿宋和阿斯克勒庇俄斯等众多英雄。在赫拉克勒斯与半人马族的战斗中，喀戎被涂有海德拉毒血的箭误伤。作为不死之身，他无法死去却要承受无尽的痛苦。最终，喀戎自愿放弃永生，将不死之身让给普罗米修斯，宙斯感其高尚，将他升上天空成为射手座。',
      en: 'Sagittarius represents Chiron, the wisest and kindest of the centaurs, who served as tutor to the gods. Unlike the wild centaurs, Chiron was skilled in medicine, music, and archery. He taught many heroes including Achilles, Jason, and Asclepius. During a battle between Heracles and the centaurs, Chiron was accidentally wounded by an arrow dipped in Hydra\'s venom. Being immortal, he could not die but suffered eternally. Ultimately, Chiron voluntarily surrendered his immortality to free Prometheus from his torment. Zeus, moved by Chiron\'s nobility, placed him among the stars as Sagittarius.',
    },
  },
  {
    id: 'capricornus',
    nameCN: '摩羯座',
    nameEN: 'Capricornus',
    season: 'autumn',
    eclipticAngle: (3 * Math.PI) / 2,
    stars: (() => {
      const c = eclipticPos((3 * Math.PI) / 2, -0.02, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.1, 0, '牛宿一', 3.6, 'G3II'],
        [0.3, 0.2, -0.05, '牛宿二', 3.1, 'K0II'],
        [-0.2, 0.15, 0.05, '摩羯座ε', 4.5, 'B9.5V'],
        [0.5, 0.3, -0.1, '摩羯座δ', 2.9, 'A7III'],
        [-0.4, 0.25, 0.1, '摩羯座γ', 3.7, 'F0V'],
        [0.7, 0.15, -0.05, '摩羯座ω', 4.1, 'B9.5V'],
        [-0.6, 0.35, 0.12, '摩羯座ι', 4.3, 'G8III'],
        [0.4, 0.05, 0, '摩羯座ψ', 4.1, 'F5V'],
        [-0.3, 0.3, 0.08, '摩羯座φ', 5.2, 'B9V'],
        [0.2, -0.05, 0.02, '摩羯座β', 3.1, 'K0II'],
        [-0.1, 0.2, 0.03, '摩羯座α', 3.6, 'G3II'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [1, 7], [4, 8], [0, 9], [0, 10]],
    brightestStar: { nameCN: '牛宿二', nameEN: 'Deneb Algedi', spectralType: 'A7III', magnitude: 2.9 },
    mythology: {
      cn: '摩羯座代表牧神潘的化身。在一次诸神聚会中，怪物提丰突然袭击，众神纷纷变形逃命。潘本想变成一条鱼跳入尼罗河，但因恐慌过度，只有下半身变成了鱼，上半身仍保持了山羊的形态。这种半羊半鱼的奇异形象被升上天空，成为摩羯座。潘是牧羊人和羊群的保护神，他发明了排箫，常在山林中吹奏。虽然摩羯座中缺少亮星，但它独特的形象和有趣的故事使它在黄道星座中独树一帜。',
      en: 'Capricornus represents the transformed god Pan. During a feast of the gods, the monster Typhon attacked, and the gods transformed to escape. Pan leapt into the Nile River to become a fish, but in his panic, only his lower half transformed while his upper body remained a goat. This half-goat, half-fish form was placed in the sky as Capricornus. Pan was the protector of shepherds and flocks, inventor of the pan flute, and a lover of mountain music. Though Capricornus lacks bright stars, its unique form and entertaining myth make it one of the most distinctive zodiac constellations.',
    },
  },
  {
    id: 'aquarius',
    nameCN: '水瓶座',
    nameEN: 'Aquarius',
    season: 'autumn',
    eclipticAngle: (5 * Math.PI) / 3,
    stars: (() => {
      const c = eclipticPos((5 * Math.PI) / 3, 0.03, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.2, 0, '虚宿一', 2.9, 'F0III'],
        [0.3, 0.1, -0.05, '虚宿二', 3.8, 'A0V'],
        [-0.2, 0.3, 0.05, '水瓶座β', 2.9, 'G0Ib'],
        [0.5, 0, -0.1, '危宿一', 3.3, 'B8V'],
        [-0.4, 0.4, 0.1, '水瓶座λ', 3.7, 'G8III'],
        [0.2, 0.35, -0.05, '水瓶座δ', 3.3, 'A3V'],
        [-0.1, 0.1, 0.02, '水瓶座γ', 3.8, 'F0V'],
        [0.4, 0.2, -0.08, '水瓶座ε', 3.8, 'A1V'],
        [-0.3, 0.2, 0.06, '水瓶座ζ', 3.6, 'F3V'],
        [0.6, 0.1, -0.1, '水瓶座π', 4.5, 'B1V'],
        [-0.5, 0.5, 0.12, '水瓶座φ', 4.2, 'A3V'],
        [0.1, 0.4, -0.03, '水瓶座τ', 4.0, 'A8V'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [0, 5], [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]],
    brightestStar: { nameCN: '虚宿一', nameEN: 'Sadalmelik', spectralType: 'F0III', magnitude: 2.9 },
    mythology: {
      cn: '水瓶座代表特洛伊美少年伽倪墨得斯。他是人间最美的少年，宙斯被他的美貌所吸引，化身为一只雄鹰将他从特洛伊山上掠走，带到奥林匹斯山成为众神的侍酒者。伽倪墨得斯手持金壶，为众神斟酒，他的金壶中流淌的是神酒而非凡水。为了安慰伽倪墨得斯的父亲特罗斯，宙斯派赫尔墨斯送去两匹神马，并告知其子已获得永生。伽倪墨得斯倒酒的形象被升上天空，成为水瓶座，那永不停息的水流象征着宙斯不朽的爱意。',
      en: 'Aquarius represents the beautiful Trojan youth Ganymede. Zeus, captivated by his beauty, transformed into an eagle and carried Ganymede from Mount Ida to Olympus, where he became the cupbearer of the gods. Ganymede held a golden jug pouring nectar rather than water for the divine assembly. To comfort Ganymede\'s father King Tros, Zeus sent Hermes with a pair of divine horses and the assurance that his son had gained immortality. The image of Ganymede pouring was placed in the sky as Aquarius, its never-ending stream of water symbolizing Zeus\'s eternal devotion.',
    },
  },
  {
    id: 'pisces',
    nameCN: '双鱼座',
    nameEN: 'Pisces',
    season: 'winter',
    eclipticAngle: (11 * Math.PI) / 6,
    stars: (() => {
      const c = eclipticPos((11 * Math.PI) / 6, 0.05, R);
      const offsets: [number, number, number, string, number, string][] = [
        [0, 0.15, 0, '外屏七', 3.6, 'A0V'],
        [0.3, 0.25, -0.05, '外屏一', 4.5, 'K5III'],
        [-0.2, 0.2, 0.05, '外屏二', 4.4, 'A0V'],
        [0.5, 0.35, -0.1, '双鱼座η', 3.6, 'G7III'],
        [-0.4, 0.3, 0.1, '双鱼座γ', 3.7, 'G9III'],
        [0.2, 0.05, -0.02, '双鱼座α', 3.8, 'A0p'],
        [-0.1, 0.1, 0.03, '双鱼座β', 4.5, 'B6V'],
        [0.6, 0.2, -0.08, '双鱼座ο', 4.3, 'K2III'],
        [-0.5, 0.4, 0.12, '双鱼座ε', 4.3, 'K3III'],
        [0.4, 0.1, -0.03, '双鱼座δ', 4.4, 'K4III'],
        [-0.3, 0.15, 0.08, '双鱼座ζ', 5.2, 'A7V'],
        [0.1, -0.1, 0, '双鱼座ι', 4.1, 'F0V'],
        [0.35, 0.3, -0.06, '双鱼座ν', 4.5, 'K3III'],
      ];
      return offsets.map(([dx, dy, dz, name, mag, spec]) => ({
        name, x: c[0] + dx, y: c[1] + dy, z: c[2] + dz, magnitude: mag, spectralType: spec,
      }));
    })(),
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [0, 5], [0, 6], [3, 7], [4, 8], [5, 9], [6, 10], [5, 11], [3, 12]],
    brightestStar: { nameCN: '外屏七', nameEN: 'Eta Piscium', spectralType: 'G7III', magnitude: 3.6 },
    mythology: {
      cn: '双鱼座与爱神阿佛洛狄忒和她的儿子厄洛斯有关。当怪物提丰向奥林匹斯山进攻时，众神纷纷变形逃命。阿佛洛狄忒和厄洛斯在幼发拉底河边被提丰截住，母子二人急中生智，跳入河中变成两条鱼，用丝带将尾巴绑在一起，以免在湍急的河流中走散。宙斯将这对母子鱼的形象升上天空，成为双鱼座。两条鱼由一条丝带相连的图案，象征着亲情与爱的纽带永不断裂。双鱼座虽然星光明暗，却蕴含着最温暖动人的神话。',
      en: 'Pisces is associated with Aphrodite and her son Eros. When the monster Typhon attacked Olympus, the gods transformed to escape. Aphrodite and Eros, cornered by Typhon at the Euphrates River, leapt into the water and transformed into two fish. They tied their tails together with a ribbon so they would not be separated in the swift current. Zeus placed the image of the mother and son fish in the sky as Pisces. The two fish connected by a ribbon symbolize the unbreakable bond of familial love. Though its stars are faint, Pisces contains one of the most heartwarming myths in the zodiac.',
    },
  },
];

export default constellations;
