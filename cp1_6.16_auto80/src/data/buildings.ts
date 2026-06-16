export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Building {
  id: string;
  name: string;
  city: string;
  shadePath: string;
  questions: Question[];
}

export interface CityData {
  name: string;
  gradient: string;
  buildings: Building[];
}

const buildingsData: Building[] = [
  {
    id: 'eiffel-tower',
    name: '埃菲尔铁塔',
    city: '巴黎',
    shadePath: 'M160 20 L140 60 L120 100 L100 160 L80 220 L60 240 L100 240 L100 230 L120 230 L120 240 L200 240 L200 230 L220 230 L220 240 L260 240 L240 220 L220 160 L200 100 L180 60 Z',
    questions: [
      {
        question: '埃菲尔铁塔的设计者是谁？',
        options: ['古斯塔夫·埃菲尔', '勒·柯布西耶', '弗兰克·盖里', '贝聿铭'],
        correctIndex: 0
      },
      {
        question: '埃菲尔铁塔建于哪一年？',
        options: ['1889年', '1900年', '1875年', '1910年'],
        correctIndex: 0
      },
      {
        question: '埃菲尔铁塔最初是为了什么活动建造的？',
        options: ['巴黎世界博览会', '奥运会', '法国大革命纪念', '第一次世界大战胜利'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 'big-ben',
    name: '大本钟',
    city: '伦敦',
    shadePath: 'M140 20 L140 220 L180 220 L180 20 Z M130 60 L190 60 L190 80 L130 80 Z M130 100 L190 100 L190 120 L130 120 Z M120 220 L200 220 L200 240 L120 240 Z',
    questions: [
      {
        question: '大本钟的正式名称是什么？',
        options: ['伊丽莎白塔', '伦敦塔', '威斯敏斯特塔', '皇家钟塔'],
        correctIndex: 0
      },
      {
        question: '大本钟的钟面直径是多少米？',
        options: ['7米', '5米', '10米', '12米'],
        correctIndex: 0
      },
      {
        question: '大本钟是哪座建筑的一部分？',
        options: ['英国议会大厦', '白金汉宫', '唐宁街10号', '伦敦塔桥'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 'tokyo-skytree',
    name: '东京晴空塔',
    city: '东京',
    shadePath: 'M155 20 L145 80 L135 140 L125 200 L115 240 L205 240 L195 200 L185 140 L175 80 L165 20 Z M110 240 L210 240 L210 240 L110 240 Z',
    questions: [
      {
        question: '东京晴空塔的高度是多少？',
        options: ['634米', '555米', '700米', '600米'],
        correctIndex: 0
      },
      {
        question: '晴空塔主要用于什么？',
        options: ['电视广播发射', '观光旅游', '办公大楼', '酒店'],
        correctIndex: 0
      },
      {
        question: '晴空塔建成于哪一年？',
        options: ['2012年', '2008年', '2015年', '2010年'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 'statue-of-liberty',
    name: '自由女神像',
    city: '纽约',
    shadePath: 'M155 20 L155 60 L145 60 L145 80 L135 80 L135 120 L125 120 L125 180 L115 180 L115 240 L195 240 L195 180 L185 180 L185 120 L175 120 L175 80 L165 80 L165 60 L155 60 Z M140 20 Q160 10 175 20 Q180 35 175 50 L140 50 Q135 35 140 20 Z',
    questions: [
      {
        question: '自由女神像是哪个国家赠送给美国的？',
        options: ['法国', '英国', '德国', '意大利'],
        correctIndex: 0
      },
      {
        question: '自由女神像手中高举的是什么？',
        options: ['火炬', '宝剑', '权杖', '橄榄枝'],
        correctIndex: 0
      },
      {
        question: '自由女神像位于纽约的哪个岛屿？',
        options: ['自由岛', '曼哈顿岛', '长岛', '史泰登岛'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 'burj-khalifa',
    name: '哈利法塔',
    city: '迪拜',
    shadePath: 'M155 20 L145 80 L140 140 L135 180 L130 210 L120 240 L190 240 L180 210 L175 180 L170 140 L165 80 Z M115 240 L195 240 L195 240 L115 240 Z',
    questions: [
      {
        question: '哈利法塔的高度是多少？',
        options: ['828米', '750米', '900米', '700米'],
        correctIndex: 0
      },
      {
        question: '哈利法塔是在哪一年正式启用的？',
        options: ['2010年', '2008年', '2012年', '2006年'],
        correctIndex: 0
      },
      {
        question: '哈利法塔拥有世界上最高的什么设施？',
        options: ['观景台', '游泳池', '餐厅', '酒店套房'],
        correctIndex: 0
      }
    ]
  }
];

const cityGradients: Record<string, string> = {
  '巴黎': 'linear-gradient(180deg, #FFE0E6 0%, #FFC0CB 100%)',
  '伦敦': 'linear-gradient(180deg, #D4E6F1 0%, #A9CCE3 100%)',
  '东京': 'linear-gradient(180deg, #E8DAEF 0%, #D7BDE2 100%)',
  '纽约': 'linear-gradient(180deg, #FCF3CF 0%, #F9E79F 100%)',
  '迪拜': 'linear-gradient(180deg, #D5F5E3 0%, #ABEBc6 100%)'
};

const cities = ['巴黎', '伦敦', '东京', '纽约', '迪拜'];

export function getAllBuildings(): Building[] {
  return buildingsData;
}

export function getBuildingsByCity(city: string): Building[] {
  return buildingsData.filter(b => b.city === city);
}

export function getCities(): string[] {
  return cities;
}

export function getCityGradient(city: string): string {
  return cityGradients[city] || 'linear-gradient(180deg, #1E1E2E 0%, #1E1E2E 100%)';
}

export function getBuildingById(id: string): Building | undefined {
  return buildingsData.find(b => b.id === id);
}

export function getCitiesData(): CityData[] {
  return cities.map(city => ({
    name: city,
    gradient: getCityGradient(city),
    buildings: getBuildingsByCity(city)
  }));
}
