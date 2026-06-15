import * as THREE from 'three';

export interface Star {
  id: string;
  position: THREE.Vector3;
  brightness: number;
}

export interface ConstellationEdge {
  from: string;
  to: string;
}

export interface Constellation {
  id: string;
  name: string;
  symbol: string;
  stars: Star[];
  edges: ConstellationEdge[];
  myth: string;
  center: THREE.Vector3;
}

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'orion',
    name: '猎户座',
    symbol: '🏹',
    stars: [
      { id: 'o1', position: new THREE.Vector3(-30, 25, 0), brightness: 1.0 },
      { id: 'o2', position: new THREE.Vector3(30, 25, 0), brightness: 0.9 },
      { id: 'o3', position: new THREE.Vector3(-20, 0, 0), brightness: 0.85 },
      { id: 'o4', position: new THREE.Vector3(0, 0, 0), brightness: 1.0 },
      { id: 'o5', position: new THREE.Vector3(20, 0, 0), brightness: 0.95 },
      { id: 'o6', position: new THREE.Vector3(-15, -25, 0), brightness: 0.8 },
      { id: 'o7', position: new THREE.Vector3(15, -25, 0), brightness: 0.85 }
    ],
    edges: [
      { from: 'o1', to: 'o3' },
      { from: 'o2', to: 'o5' },
      { from: 'o3', to: 'o4' },
      { from: 'o4', to: 'o5' },
      { from: 'o3', to: 'o6' },
      { from: 'o5', to: 'o7' }
    ],
    myth: '猎户座源于古希腊神话中的巨人猎人俄里翁。他因傲慢宣称能战胜任何野兽，惹怒了大地女神盖亚。盖亚派出一只毒蝎与俄里翁决斗，两者同归于尽。宙斯将他们升上天空，成为猎户座和天蝎座，永远分居天空两端，永不相见。',
    center: new THREE.Vector3(0, 0, 0)
  },
  {
    id: 'ursaMinor',
    name: '小熊座',
    symbol: '🐻',
    stars: [
      { id: 'u1', position: new THREE.Vector3(-25, 40, -10), brightness: 0.9 },
      { id: 'u2', position: new THREE.Vector3(-15, 35, -10), brightness: 0.8 },
      { id: 'u3', position: new THREE.Vector3(-10, 25, -10), brightness: 0.75 },
      { id: 'u4', position: new THREE.Vector3(0, 20, -10), brightness: 0.85 },
      { id: 'u5', position: new THREE.Vector3(10, 15, -10), brightness: 0.7 },
      { id: 'u6', position: new THREE.Vector3(20, 25, -10), brightness: 1.0 },
      { id: 'u7', position: new THREE.Vector3(35, 35, -10), brightness: 0.9 }
    ],
    edges: [
      { from: 'u1', to: 'u2' },
      { from: 'u2', to: 'u3' },
      { from: 'u3', to: 'u4' },
      { from: 'u4', to: 'u5' },
      { from: 'u5', to: 'u6' },
      { from: 'u6', to: 'u7' }
    ],
    myth: '小熊座代表宙斯与卡利斯托之子阿尔卡斯。宙斯将阿尔卡斯变为小熊，以防被赫拉发现。后来阿尔卡斯与母亲（大熊座）一同被升上天空，成为永恒的星座。小熊座尾巴末端的北极星，是航海者永恒的指引明灯。',
    center: new THREE.Vector3(5, 28, -10)
  },
  {
    id: 'andromeda',
    name: '仙女座',
    symbol: '👸',
    stars: [
      { id: 'a1', position: new THREE.Vector3(25, 30, 15), brightness: 0.95 },
      { id: 'a2', position: new THREE.Vector3(15, 20, 15), brightness: 0.85 },
      { id: 'a3', position: new THREE.Vector3(5, 10, 15), brightness: 1.0 },
      { id: 'a4', position: new THREE.Vector3(-5, 0, 15), brightness: 0.8 },
      { id: 'a5', position: new THREE.Vector3(-15, -10, 15), brightness: 0.75 },
      { id: 'a6', position: new THREE.Vector3(-25, -20, 15), brightness: 0.7 }
    ],
    edges: [
      { from: 'a1', to: 'a2' },
      { from: 'a2', to: 'a3' },
      { from: 'a3', to: 'a4' },
      { from: 'a4', to: 'a5' },
      { from: 'a5', to: 'a6' }
    ],
    myth: '仙女座讲述的是埃塞俄比亚公主安德洛墨达的故事。她的母亲因炫耀美貌触怒海神，被要求将女儿献给海怪。安德洛墨达被铁链锁在海边岩石上，等待献祭。英雄珀耳修斯骑着飞马赶来，斩杀海怪，救下公主，两人终成眷属。',
    center: new THREE.Vector3(0, 5, 15)
  },
  {
    id: 'scorpio',
    name: '天蝎座',
    symbol: '🦂',
    stars: [
      { id: 's1', position: new THREE.Vector3(40, -30, 5), brightness: 1.0 },
      { id: 's2', position: new THREE.Vector3(30, -25, 5), brightness: 0.9 },
      { id: 's3', position: new THREE.Vector3(20, -20, 5), brightness: 0.85 },
      { id: 's4', position: new THREE.Vector3(10, -15, 5), brightness: 0.8 },
      { id: 's5', position: new THREE.Vector3(0, -10, 5), brightness: 0.75 },
      { id: 's6', position: new THREE.Vector3(-10, -5, 5), brightness: 0.95 },
      { id: 's7', position: new THREE.Vector3(-5, 5, 5), brightness: 0.7 }
    ],
    edges: [
      { from: 's1', to: 's2' },
      { from: 's2', to: 's3' },
      { from: 's3', to: 's4' },
      { from: 's4', to: 's5' },
      { from: 's5', to: 's6' },
      { from: 's6', to: 's7' }
    ],
    myth: '天蝎座是大地女神盖亚派出的毒蝎，为了惩罚傲慢的猎人俄里翁。毒蝎与俄里翁在大地上展开殊死搏斗，最终两败俱伤同归于尽。宙斯感念它们的壮烈，将二者升上天空。为避免纷争，让它们永远分居天空两端，永不相见。',
    center: new THREE.Vector3(15, -15, 5)
  },
  {
    id: 'cygnus',
    name: '天鹅座',
    symbol: '🦢',
    stars: [
      { id: 'c1', position: new THREE.Vector3(0, 35, 20), brightness: 1.0 },
      { id: 'c2', position: new THREE.Vector3(-15, 20, 20), brightness: 0.85 },
      { id: 'c3', position: new THREE.Vector3(0, 20, 20), brightness: 0.9 },
      { id: 'c4', position: new THREE.Vector3(15, 20, 20), brightness: 0.85 },
      { id: 'c5', position: new THREE.Vector3(0, 5, 20), brightness: 0.8 },
      { id: 'c6', position: new THREE.Vector3(0, -10, 20), brightness: 0.75 }
    ],
    edges: [
      { from: 'c1', to: 'c3' },
      { from: 'c3', to: 'c2' },
      { from: 'c3', to: 'c4' },
      { from: 'c3', to: 'c5' },
      { from: 'c5', to: 'c6' }
    ],
    myth: '天鹅座代表太阳神阿波罗之子法厄同的挚友赛格纳斯。法厄同驾驶太阳车失控被宙斯雷击身亡，赛格纳斯悲痛欲绝，化为天鹅在天空中永恒盘旋，寻找挚友的灵魂。这只优雅的天鹅展开双翼，在银河中缓缓飞翔。',
    center: new THREE.Vector3(0, 15, 20)
  },
  {
    id: 'cassiopeia',
    name: '仙后座',
    symbol: '👑',
    stars: [
      { id: 'ca1', position: new THREE.Vector3(-40, 5, -20), brightness: 0.9 },
      { id: 'ca2', position: new THREE.Vector3(-30, 15, -20), brightness: 0.85 },
      { id: 'ca3', position: new THREE.Vector3(-20, 5, -20), brightness: 0.8 },
      { id: 'ca4', position: new THREE.Vector3(-10, 15, -20), brightness: 0.95 },
      { id: 'ca5', position: new THREE.Vector3(0, 5, -20), brightness: 0.75 }
    ],
    edges: [
      { from: 'ca1', to: 'ca2' },
      { from: 'ca2', to: 'ca3' },
      { from: 'ca3', to: 'ca4' },
      { from: 'ca4', to: 'ca5' }
    ],
    myth: '仙后座是埃塞俄比亚王后卡西欧佩亚，她因炫耀自己和女儿的美貌胜过海中仙女，触怒海神波塞冬。海神派海怪肆虐王国，迫使她献祭女儿。最终她被升上天空，永远坐在椅子上旋转，以示对傲慢的永恒惩罚。',
    center: new THREE.Vector3(-20, 9, -20)
  },
  {
    id: 'auriga',
    name: '御夫座',
    symbol: '🛒',
    stars: [
      { id: 'au1', position: new THREE.Vector3(20, 45, -5), brightness: 1.0 },
      { id: 'au2', position: new THREE.Vector3(10, 35, -5), brightness: 0.85 },
      { id: 'au3', position: new THREE.Vector3(25, 35, -5), brightness: 0.8 },
      { id: 'au4', position: new THREE.Vector3(35, 35, -5), brightness: 0.75 },
      { id: 'au5', position: new THREE.Vector3(15, 25, -5), brightness: 0.7 },
      { id: 'au6', position: new THREE.Vector3(30, 25, -5), brightness: 0.9 }
    ],
    edges: [
      { from: 'au1', to: 'au2' },
      { from: 'au1', to: 'au3' },
      { from: 'au1', to: 'au4' },
      { from: 'au2', to: 'au5' },
      { from: 'au3', to: 'au6' }
    ],
    myth: '御夫座代表雅典国王埃里克托尼俄斯，他是火神赫菲斯托斯之子，天生跛足。为了行动方便，他发明了四马战车，并在赛车比赛中获胜，获得了宙斯的赏识。宙斯将他升上天空，成为御夫座，永远驾驭着战车驰骋天际。',
    center: new THREE.Vector3(23, 35, -5)
  },
  {
    id: 'gemini',
    name: '双子座',
    symbol: '👯',
    stars: [
      { id: 'g1', position: new THREE.Vector3(-50, 15, 10), brightness: 1.0 },
      { id: 'g2', position: new THREE.Vector3(-40, 15, 10), brightness: 0.95 },
      { id: 'g3', position: new THREE.Vector3(-50, 5, 10), brightness: 0.8 },
      { id: 'g4', position: new THREE.Vector3(-40, 5, 10), brightness: 0.85 },
      { id: 'g5', position: new THREE.Vector3(-45, -5, 10), brightness: 0.75 },
      { id: 'g6', position: new THREE.Vector3(-45, -15, 10), brightness: 0.7 }
    ],
    edges: [
      { from: 'g1', to: 'g3' },
      { from: 'g2', to: 'g4' },
      { from: 'g3', to: 'g5' },
      { from: 'g4', to: 'g5' },
      { from: 'g5', to: 'g6' }
    ],
    myth: '双子座代表孪生兄弟卡斯托尔和波吕丢刻斯。哥哥是凡人，弟弟是神。兄弟情深，形影不离。哥哥战死后，弟弟恳求宙斯用自己的生命换回哥哥。宙斯被感动，将二人升上天空，成为双子星座，永远相伴，永不分离。',
    center: new THREE.Vector3(-45, 5, 10)
  },
  {
    id: 'virgo',
    name: '室女座',
    symbol: '🌾',
    stars: [
      { id: 'v1', position: new THREE.Vector3(50, -10, -15), brightness: 1.0 },
      { id: 'v2', position: new THREE.Vector3(40, 0, -15), brightness: 0.85 },
      { id: 'v3', position: new THREE.Vector3(30, 10, -15), brightness: 0.8 },
      { id: 'v4', position: new THREE.Vector3(35, -5, -15), brightness: 0.75 },
      { id: 'v5', position: new THREE.Vector3(25, -10, -15), brightness: 0.9 },
      { id: 'v6', position: new THREE.Vector3(20, -20, -15), brightness: 0.7 }
    ],
    edges: [
      { from: 'v1', to: 'v2' },
      { from: 'v2', to: 'v3' },
      { from: 'v1', to: 'v4' },
      { from: 'v4', to: 'v5' },
      { from: 'v5', to: 'v6' }
    ],
    myth: '室女座是正义女神阿斯特莱亚的化身。在黄金时代，她与人类共同生活，主持公道。后来人类逐渐堕落，众神纷纷离去，只有阿斯特莱亚坚守到最后。最终她也不得不离开，升上天空化为室女座，手持麦穗，守护人间正义与丰收。',
    center: new THREE.Vector3(35, -5, -15)
  },
  {
    id: 'leo',
    name: '狮子座',
    symbol: '🦁',
    stars: [
      { id: 'l1', position: new THREE.Vector3(35, 30, -25), brightness: 1.0 },
      { id: 'l2', position: new THREE.Vector3(25, 35, -25), brightness: 0.85 },
      { id: 'l3', position: new THREE.Vector3(15, 30, -25), brightness: 0.8 },
      { id: 'l4', position: new THREE.Vector3(25, 20, -25), brightness: 0.9 },
      { id: 'l5', position: new THREE.Vector3(20, 10, -25), brightness: 0.75 },
      { id: 'l6', position: new THREE.Vector3(30, 5, -25), brightness: 0.7 }
    ],
    edges: [
      { from: 'l1', to: 'l2' },
      { from: 'l2', to: 'l3' },
      { from: 'l3', to: 'l4' },
      { from: 'l4', to: 'l1' },
      { from: 'l4', to: 'l5' },
      { from: 'l5', to: 'l6' }
    ],
    myth: '狮子座是赫拉克勒斯十二项功绩中的第一项——涅墨亚巨狮。这头巨狮刀枪不入，吞食无数人畜。赫拉克勒斯徒手扼死巨狮，剥下其皮作为铠甲。宙斯为纪念这一壮举，将巨狮升上天空，成为威武的狮子座，永远守护苍穹。',
    center: new THREE.Vector3(25, 22, -25)
  },
  {
    id: 'pegasus',
    name: '飞马座',
    symbol: '🐴',
    stars: [
      { id: 'p1', position: new THREE.Vector3(-25, -15, 25), brightness: 0.95 },
      { id: 'p2', position: new THREE.Vector3(-10, -15, 25), brightness: 0.9 },
      { id: 'p3', position: new THREE.Vector3(-10, 0, 25), brightness: 1.0 },
      { id: 'p4', position: new THREE.Vector3(-25, 0, 25), brightness: 0.85 },
      { id: 'p5', position: new THREE.Vector3(-35, 10, 25), brightness: 0.75 },
      { id: 'p6', position: new THREE.Vector3(-45, 20, 25), brightness: 0.7 }
    ],
    edges: [
      { from: 'p1', to: 'p2' },
      { from: 'p2', to: 'p3' },
      { from: 'p3', to: 'p4' },
      { from: 'p4', to: 'p1' },
      { from: 'p4', to: 'p5' },
      { from: 'p5', to: 'p6' }
    ],
    myth: '飞马座是从美杜莎颈血中诞生的神马珀伽索斯。它被英雄柏勒洛丰驯服，一同击败喷火怪物喀迈拉。后来柏勒洛丰企图骑飞马登天，惹怒宙斯，被摔下凡尘。珀伽索斯独自升天，成为天马座，在银河间自由翱翔。',
    center: new THREE.Vector3(-25, -5, 25)
  },
  {
    id: 'pisces',
    name: '双鱼座',
    symbol: '🐟',
    stars: [
      { id: 'pi1', position: new THREE.Vector3(45, 20, 25), brightness: 0.85 },
      { id: 'pi2', position: new THREE.Vector3(55, 10, 25), brightness: 0.8 },
      { id: 'pi3', position: new THREE.Vector3(50, 0, 25), brightness: 0.9 },
      { id: 'pi4', position: new THREE.Vector3(40, -5, 25), brightness: 0.75 },
      { id: 'pi5', position: new THREE.Vector3(30, 0, 25), brightness: 0.7 },
      { id: 'pi6', position: new THREE.Vector3(25, -10, 25), brightness: 1.0 },
      { id: 'pi7', position: new THREE.Vector3(35, -15, 25), brightness: 0.8 }
    ],
    edges: [
      { from: 'pi1', to: 'pi2' },
      { from: 'pi2', to: 'pi3' },
      { from: 'pi3', to: 'pi4' },
      { from: 'pi4', to: 'pi5' },
      { from: 'pi5', to: 'pi6' },
      { from: 'pi6', to: 'pi7' }
    ],
    myth: '双鱼座是爱神阿芙洛狄忒与儿子厄洛斯的化身。当巨人堤丰袭击众神时，母子俩化作两条鱼，用丝带系住尾巴，一同跳入幼发拉底河逃脱。后来宙斯将这对系在一起的鱼升上天空，成为双鱼座，象征永恒的爱与羁绊。',
    center: new THREE.Vector3(40, 3, 25)
  }
];
