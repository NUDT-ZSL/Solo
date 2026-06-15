import { v4 as uuidv4 } from 'uuid'

export interface Work {
  id: string
  title: string
  tags: string[]
  description: string
  dimensions: string
  material: string
}

export interface YearNode {
  year: string
  title: string
  works: Work[]
}

export const timelineData: YearNode[] = [
  {
    year: '2019',
    title: '匠心初萌',
    works: [
      {
        id: uuidv4(),
        title: '山间晨雾·陶瓷杯',
        tags: ['陶瓷', '手拉坯'],
        description: '以清晨山间薄雾为灵感，杯身施以渐变青白釉，釉面流淌如雾气缭绕。手拉坯成型，每一只都独一无二。',
        dimensions: '直径8cm × 高10cm',
        material: '高温瓷土、青白釉',
      },
      {
        id: uuidv4(),
        title: '枯木逢春·木雕摆件',
        tags: ['木雕', '摆件'],
        description: '取材于老槐木，保留天然裂纹与虫蛀痕迹，雕以新芽破木而出之态，寓意枯木逢春。',
        dimensions: '12cm × 6cm × 15cm',
        material: '老槐木、桐油',
      },
      {
        id: uuidv4(),
        title: '墨染流云·扎染围巾',
        tags: ['扎染', '织物'],
        description: '传统扎染工艺，以板蓝根为染料，在棉麻围巾上呈现流云般的墨色晕染，古朴而灵动。',
        dimensions: '180cm × 45cm',
        material: '棉麻混纺、植物染料',
      },
    ],
  },
  {
    year: '2020',
    title: '深耕细作',
    works: [
      {
        id: uuidv4(),
        title: '雨打芭蕉·青瓷盘',
        tags: ['青瓷', '刻花'],
        description: '盘面刻芭蕉叶脉，施梅子青釉，釉色温润如玉，叶脉纹理若隐若现，如雨后芭蕉。',
        dimensions: '直径25cm × 高3cm',
        material: '龙泉瓷土、梅子青釉',
      },
      {
        id: uuidv4(),
        title: '松风听涛·竹编篮',
        tags: ['竹编', '日用'],
        description: '取山间毛竹，劈丝编织，篮身以松针纹为底，篮沿饰以波浪纹，盛物之余亦可为室内添一份山林气息。',
        dimensions: '直径20cm × 高12cm',
        material: '毛竹、藤条',
      },
      {
        id: uuidv4(),
        title: '月照松林·漆器碗',
        tags: ['漆器', '食器'],
        description: '木胎漆碗，内施朱漆，外以黑漆为底，洒金月与松林剪影，触感温润光滑。',
        dimensions: '直径14cm × 高7cm',
        material: '榉木胎、大漆、金箔',
      },
      {
        id: uuidv4(),
        title: '霜叶红于·手织围巾',
        tags: ['手织', '织物'],
        description: '手摇纺车纺线，以茜草染出层次丰富的秋红色调，经纬交织形成枫叶般的纹理。',
        dimensions: '200cm × 35cm',
        material: '羊毛、茜草染料',
      },
    ],
  },
  {
    year: '2021',
    title: '融汇出新',
    works: [
      {
        id: uuidv4(),
        title: '溪山行旅·陶板画',
        tags: ['陶板', '壁画'],
        description: '以传统山水画构图，在陶板上刻绘溪山行旅之景，施以多种釉色，经高温烧制后呈现层次分明的山水意境。',
        dimensions: '40cm × 60cm × 2cm',
        material: '陶板、多色釉',
      },
      {
        id: uuidv4(),
        title: '云破日出·金缮修复碗',
        tags: ['金缮', '修复'],
        description: '以传统金缮工艺修复破碎瓷碗，生漆调金粉填补裂纹，破碎处化为金色闪电，破而复美。',
        dimensions: '直径16cm × 高8cm',
        material: '瓷碗、生漆、金粉',
      },
      {
        id: uuidv4(),
        title: '荷塘清趣·银质胸针',
        tags: ['银饰', '胸针'],
        description: '925纯银手工锻造，以荷叶与蜻蜓为主题，荷叶做旧处理，蜻蜓翅膀薄如蝉翼，细节精致。',
        dimensions: '5cm × 3.5cm',
        material: '925纯银、做旧处理',
      },
    ],
  },
  {
    year: '2022',
    title: '匠心独运',
    works: [
      {
        id: uuidv4(),
        title: '四时风物·漆器套盒',
        tags: ['漆器', '套盒'],
        description: '四季主题漆器套盒，春樱、夏荷、秋枫、冬梅分别以不同漆艺手法呈现，螺钿点缀，精巧绝伦。',
        dimensions: '单盒10cm × 10cm × 5cm',
        material: '木胎、大漆、螺钿',
      },
      {
        id: uuidv4(),
        title: '千里江山·织锦挂毯',
        tags: ['织锦', '挂毯'],
        description: '以千里江山图为蓝本，手工织锦重现青绿山水，经线过万，色彩层次丰富，耗时半年完成。',
        dimensions: '80cm × 120cm',
        material: '丝线、金线',
      },
      {
        id: uuidv4(),
        title: '石上清泉·紫砂壶',
        tags: ['紫砂', '茶器'],
        description: '宜兴紫砂泥手制成型，壶身刻石纹与泉流，壶嘴如泉口出水，壶把似山石棱角，实用与赏玩兼具。',
        dimensions: '长15cm × 宽9cm × 高8cm',
        material: '紫砂泥',
      },
      {
        id: uuidv4(),
        title: '烟雨江南·手绘瓷瓶',
        tags: ['手绘', '瓷瓶'],
        description: '白瓷瓶上以釉下彩绘江南水乡，粉墙黛瓦、小桥流水，朦胧如烟雨中。高温烧制后色彩永不褪去。',
        dimensions: '直径18cm × 高35cm',
        material: '高温瓷、釉下彩',
      },
    ],
  },
  {
    year: '2023',
    title: '承前启后',
    works: [
      {
        id: uuidv4(),
        title: '鹿鸣呦呦·木雕香薰',
        tags: ['木雕', '香薰'],
        description: '檀木雕刻小鹿造型香薰座，鹿身中空可放置线香，烟雾从鹿口缓缓溢出，意境悠远。',
        dimensions: '10cm × 5cm × 12cm',
        material: '檀木、铜件',
      },
      {
        id: uuidv4(),
        title: '碧波万顷·琉璃花器',
        tags: ['琉璃', '花器'],
        description: '手工吹制琉璃花器，海蓝色渐变如碧波万顷，器壁内含气泡似浪花翻涌，光影流转间美不胜收。',
        dimensions: '直径12cm × 高25cm',
        material: '手工琉璃',
      },
      {
        id: uuidv4(),
        title: '凤穿牡丹·刺绣屏风',
        tags: ['刺绣', '屏风'],
        description: '双面绣工艺，丝线绣凤穿牡丹于真丝屏面，配色艳而不俗，针脚细密如画，可用于空间隔断。',
        dimensions: '单扇40cm × 150cm',
        material: '真丝、丝线、木框',
      },
    ],
  },
  {
    year: '2024',
    title: '再攀高峰',
    works: [
      {
        id: uuidv4(),
        title: '天地玄黄·大漆画',
        tags: ['大漆', '画作'],
        description: '以大漆、蛋壳、螺钿为材，在木板创作抽象画作。天地玄黄之色，层层髹漆打磨，呈现宇宙洪荒之境。',
        dimensions: '100cm × 80cm × 3cm',
        material: '大漆、蛋壳、螺钿、木板',
      },
      {
        id: uuidv4(),
        title: '听泉·复合茶席',
        tags: ['茶席', '综合'],
        description: '集紫砂壶、青瓷杯、竹茶则、漆器茶托于一体，各器呼应泉石主题，配手工织茶巾，一席之间尽得山野之趣。',
        dimensions: '壶15cm / 杯6cm / 席120cm×60cm',
        material: '紫砂、青瓷、竹、大漆、棉麻',
      },
      {
        id: uuidv4(),
        title: '鹤舞九天·玉雕摆件',
        tags: ['玉雕', '摆件'],
        description: '和田白玉精雕仙鹤展翅，羽翼层叠清晰可辨，底座以青玉雕祥云纹，鹤足金丝镶嵌固定，气韵灵动。',
        dimensions: '8cm × 6cm × 18cm',
        material: '和田白玉、青玉、金丝',
      },
      {
        id: uuidv4(),
        title: '春山可望·釉里红瓶',
        tags: ['釉里红', '瓷瓶'],
        description: '釉里红工艺烧制，瓶身绘春山叠翠、桃花灼灼，铜红釉在高温下呈现丰富的浓淡变化，每一件都是孤品。',
        dimensions: '直径20cm × 高42cm',
        material: '高温瓷、铜红釉',
      },
    ],
  },
]
