import type { PlantDetail } from './types';

const img = (prompt: string) =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square_hd`;

const plantsData: PlantDetail[] = [
  {
    id: '1',
    name: '悬铃木',
    scientificName: 'Platanus acerifolia',
    leafImage: img('悬铃木叶片特写，掌状分裂，自然光照，清晰叶脉'),
    distribution: '中国华东、华中、华南及西南各城市广泛栽培',
    uses: '行道树、庭荫树，木材可用于制作家具',
    description: '悬铃木是悬铃木科悬铃木属的落叶大乔木，树冠广展，叶大荫浓，树皮斑驳呈片状脱落。因其适应性强、生长迅速、耐修剪，是世界著名的行道树和庭荫树，被誉为"行道树之王"。花期4-5月，果期9-10月。',
    featureVector: [0.9, 0.8, 0.3, 0.7, 0.6, 0.2, 0.5, 0.4],
    gallery: {
      leaves: [
        img('悬铃木叶片正面特写，掌状3-5裂，叶缘有齿'),
        img('悬铃木叶片背面，显示清晰的网状叶脉'),
        img('悬铃木枝叶，叶片在枝条上的排列方式'),
      ],
      bark: [
        img('悬铃木树干特写，斑驳的灰白色和褐色树皮'),
        img('悬铃木树皮脱落的纹理细节'),
      ],
      fruits: [
        img('悬铃木球形果序，悬挂在枝条上'),
        img('悬铃木果实特写，表面绒毛状'),
      ],
      flowers: [
        img('悬铃木花簇，黄绿色小花'),
        img('悬铃木雌雄花对比'),
      ],
    },
    comparison: {
      plantId: '1',
      leafShape: img('悬铃木叶片形状示意图，掌状分裂'),
      leafMargin: img('悬铃木叶缘锯齿细节特写'),
      leafVein: img('悬铃木叶脉网状分布特写'),
      fruit: img('悬铃木球形果序形态'),
    },
  },
  {
    id: '2',
    name: '银杏',
    scientificName: 'Ginkgo biloba',
    leafImage: img('银杏叶片特写，扇形叶片，金黄色秋季，自然光照'),
    distribution: '中国特产，广泛栽培于辽宁、广东、四川、云南等地',
    uses: '行道树、观赏树，种子可食用，叶片入药',
    description: '银杏是银杏科银杏属的落叶乔木，为中生代孑遗的稀有树种，被誉为"活化石"。叶片扇形，秋季变为金黄色，十分美观。种子俗称白果，可食用及入药。木材优良，供雕刻、家具等用。',
    featureVector: [0.2, 0.9, 0.7, 0.1, 0.8, 0.5, 0.3, 0.6],
    gallery: {
      leaves: [
        img('银杏扇形叶片正面特写，二叉状叶脉'),
        img('银杏叶片秋季金黄色景观'),
        img('银杏枝叶，叶片簇生在短枝上'),
      ],
      bark: [
        img('银杏树干，灰褐色纵裂树皮'),
        img('银杏树皮纹理细节'),
      ],
      fruits: [
        img('银杏种子，外种皮肉质黄色'),
        img('银杏种子去除肉质层后的白色骨质中种皮'),
      ],
      flowers: [
        img('银杏雄球花，葇荑花序状'),
        img('银杏雌花，具有长柄'),
      ],
    },
    comparison: {
      plantId: '2',
      leafShape: img('银杏叶片扇形形状示意图'),
      leafMargin: img('银杏叶边缘波状细节'),
      leafVein: img('银杏二叉状叶脉特写'),
      fruit: img('银杏种子形态结构'),
    },
  },
  {
    id: '3',
    name: '香樟',
    scientificName: 'Cinnamomum camphora',
    leafImage: img('香樟叶片特写，椭圆形，革质有光泽，深绿色'),
    distribution: '中国南方及西南各省区，越南、朝鲜、日本也有分布',
    uses: '行道树、防风林，木材可制家具，枝叶可提取樟脑',
    description: '香樟是樟科樟属的常绿大乔木，树冠广卵形，枝叶茂密，具樟脑香气。叶片互生，卵形或卵状椭圆形，离基三出脉，脉腋有腺体。是优良的行道树、庭荫树和防风林树种。木材致密美观，有香气。',
    featureVector: [0.6, 0.3, 0.9, 0.8, 0.1, 0.7, 0.4, 0.5],
    gallery: {
      leaves: [
        img('香樟叶片正面，革质深绿色有光泽'),
        img('香樟叶片背面，粉绿色，叶脉清晰'),
        img('香樟枝叶，叶片互生排列'),
      ],
      bark: [
        img('香樟树干，黄褐色不规则纵裂'),
        img('香樟树皮纹理'),
      ],
      fruits: [
        img('香樟核果，球形紫黑色'),
        img('香樟果实特写，着生在杯状果托上'),
      ],
      flowers: [
        img('香樟圆锥花序，绿白色或淡黄色小花'),
        img('香樟花特写，花被片6枚'),
      ],
    },
    comparison: {
      plantId: '3',
      leafShape: img('香樟椭圆形叶片形状'),
      leafMargin: img('香樟全缘叶缘细节'),
      leafVein: img('香樟离基三出脉特写'),
      fruit: img('香樟球形核果形态'),
    },
  },
  {
    id: '4',
    name: '栾树',
    scientificName: 'Koelreuteria paniculata',
    leafImage: img('栾树叶片特写，一回羽状复叶，小叶有齿'),
    distribution: '中国大部分省区均有分布，朝鲜、日本、越南也有',
    uses: '行道树、观赏树，木材可制家具，花可作黄色染料',
    description: '栾树是无患子科栾树属的落叶乔木或灌木。叶片为一回或不完全二回羽状复叶，叶缘有不规则的钝锯齿。夏季开黄色圆锥花序，秋季结粉红色蒴果，观赏价值高。耐寒耐旱，是优良的行道树种。',
    featureVector: [0.4, 0.7, 0.5, 0.9, 0.2, 0.6, 0.8, 0.3],
    gallery: {
      leaves: [
        img('栾树羽状复叶整体形态'),
        img('栾树小叶特写，叶缘锯齿'),
        img('栾树叶片秋季变黄景观'),
      ],
      bark: [
        img('栾树干，灰褐色细纵裂'),
        img('栾树幼枝皮孔'),
      ],
      fruits: [
        img('栾树蒴果，粉红色三棱形'),
        img('栾树果序，果实像小灯笼'),
      ],
      flowers: [
        img('栾树圆锥花序，金黄色小花'),
        img('栾树花特写，花瓣4枚'),
      ],
    },
    comparison: {
      plantId: '4',
      leafShape: img('栾树羽状复叶形状'),
      leafMargin: img('栾树小叶钝锯齿叶缘'),
      leafVein: img('栾树羽状叶脉特写'),
      fruit: img('栾树三棱形蒴果形态'),
    },
  },
  {
    id: '5',
    name: '国槐',
    scientificName: 'Styphnolobium japonicum',
    leafImage: img('国槐叶片特写，奇数羽状复叶，小叶卵形'),
    distribution: '中国南北各地广泛栽培，华北平原尤为常见',
    uses: '行道树、庭荫树，槐花可食，木材供建筑',
    description: '国槐是豆科槐属的落叶乔木，树冠圆形。奇数羽状复叶，小叶7-17片。夏季开白色或淡黄色蝶形花，组成顶生圆锥花序。荚果串珠状，肉质，成熟后不开裂。是中国北方常见的行道树和庭园树种。',
    featureVector: [0.5, 0.4, 0.6, 0.8, 0.9, 0.3, 0.7, 0.2],
    gallery: {
      leaves: [
        img('国槐奇数羽状复叶整体'),
        img('国槐小叶特写，全缘'),
        img('国槐枝叶，小叶对生排列'),
      ],
      bark: [
        img('国槐树干，暗灰色纵裂'),
        img('国槐树皮裂纹'),
      ],
      fruits: [
        img('国槐荚果，串珠状肉质'),
        img('国槐成熟荚果黄褐色'),
      ],
      flowers: [
        img('国槐圆锥花序，白色蝶形花'),
        img('国槐花特写，花瓣5枚'),
      ],
    },
    comparison: {
      plantId: '5',
      leafShape: img('国槐羽状复叶小叶形状'),
      leafMargin: img('国槐小叶全缘叶缘'),
      leafVein: img('国槐羽状侧脉特写'),
      fruit: img('国槐串珠状荚果形态'),
    },
  },
  {
    id: '6',
    name: '水杉',
    scientificName: 'Metasequoia glyptostroboides',
    leafImage: img('水杉叶片特写，线形叶对生，呈羽状排列'),
    distribution: '中国四川、湖北、湖南等地，现全国广泛栽培',
    uses: '行道树、观赏树，木材供建筑、家具',
    description: '水杉是杉科水杉属的落叶乔木，为中国特产的孑遗珍贵树种，被誉为植物界的"活化石"。叶线形，柔软，交互对生，假二列成羽状复叶状。球果下垂，近球形。树姿优美，是著名的观赏树种。',
    featureVector: [0.3, 0.2, 0.4, 0.5, 0.6, 0.9, 0.1, 0.8],
    gallery: {
      leaves: [
        img('水杉叶线形，对生排列'),
        img('水杉小枝，叶羽状排列'),
        img('水杉秋季叶色变黄脱落'),
      ],
      bark: [
        img('水杉树干，灰褐色条状剥落'),
        img('水杉树皮纵裂纹理'),
      ],
      fruits: [
        img('水杉球果下垂，近球形'),
        img('水杉球果木质种鳞'),
      ],
      flowers: [
        img('水杉雄球花单生叶腋'),
        img('水杉雌球花单生或对生'),
      ],
    },
    comparison: {
      plantId: '6',
      leafShape: img('水杉线形叶片形状'),
      leafMargin: img('水杉全缘叶缘细节'),
      leafVein: img('水杉中脉明显叶脉'),
      fruit: img('水杉球形球果形态'),
    },
  },
  {
    id: '7',
    name: '白玉兰',
    scientificName: 'Yulania denudata',
    leafImage: img('白玉兰叶片特写，倒卵形，全缘，薄革质'),
    distribution: '中国江西、浙江、湖南、贵州等地，现全国栽培',
    uses: '行道树、观赏树，花蕾入药，木材供家具',
    description: '白玉兰是木兰科玉兰属的落叶乔木，树冠卵形。叶片倒卵形或倒卵状长圆形。早春先花后叶，花大型，白色，芳香，花瓣9片。是中国著名的观赏花木，也是上海市的市花。花蕾可入药，称为"辛夷"。',
    featureVector: [0.7, 0.6, 0.2, 0.3, 0.5, 0.4, 0.9, 0.8],
    gallery: {
      leaves: [
        img('白玉兰叶片倒卵形正面'),
        img('白玉兰叶背面，柔毛'),
        img('白玉兰枝叶互生'),
      ],
      bark: [
        img('白玉兰树干，灰色光滑'),
        img('白玉兰树皮皮孔'),
      ],
      fruits: [
        img('白玉兰聚合蓇葖果，圆柱形'),
        img('白玉兰果实成熟开裂'),
      ],
      flowers: [
        img('白玉兰大型白花，9枚花被片'),
        img('白玉兰花枝，先花后叶'),
      ],
    },
    comparison: {
      plantId: '7',
      leafShape: img('白玉兰倒卵形叶片形状'),
      leafMargin: img('白玉兰全缘叶缘'),
      leafVein: img('白玉兰网状叶脉特写'),
      fruit: img('白玉兰聚合蓇葖果形态'),
    },
  },
  {
    id: '8',
    name: '鹅掌楸',
    scientificName: 'Liriodendron chinense',
    leafImage: img('鹅掌楸叶片特写，马褂形叶片，独特形状'),
    distribution: '中国长江流域以南各省区，越南北部也有分布',
    uses: '行道树、观赏树，木材供建筑、家具',
    description: '鹅掌楸是木兰科鹅掌楸属的落叶乔木，因叶形似马褂，故又名"马褂木"。叶片顶部平截，两侧各具一裂片。花黄绿色，杯状，形似郁金香。是中国国家二级保护植物，也是优美的观赏树种。',
    featureVector: [0.1, 0.8, 0.3, 0.6, 0.7, 0.2, 0.5, 0.9],
    gallery: {
      leaves: [
        img('鹅掌楸马褂形叶片正面'),
        img('鹅掌楸叶片背面，白粉'),
        img('鹅掌楸枝叶，叶片互生'),
      ],
      bark: [
        img('鹅掌楸树干，灰色纵裂'),
        img('鹅掌楸树皮深裂纹'),
      ],
      fruits: [
        img('鹅掌楸聚合果，纺锤形'),
        img('鹅掌楸果翅，坚果具翅'),
      ],
      flowers: [
        img('鹅掌楸花，黄绿色杯状'),
        img('鹅掌楸花内面，橙色斑纹'),
      ],
    },
    comparison: {
      plantId: '8',
      leafShape: img('鹅掌楸马褂形叶片形状'),
      leafMargin: img('鹅掌楸叶裂片边缘'),
      leafVein: img('鹅掌楸掌状叶脉'),
      fruit: img('鹅掌楸纺锤形聚合果'),
    },
  },
  {
    id: '9',
    name: '朴树',
    scientificName: 'Celtis sinensis',
    leafImage: img('朴树叶片特写，卵形，基部偏斜，三出脉'),
    distribution: '中国黄河流域以南、华南、西南地区',
    uses: '行道树、庭荫树，木材供家具，树皮纤维可造纸',
    description: '朴树是榆科朴属的落叶乔木，树冠扁球形。叶片互生，卵形或卵状椭圆形，基部不对称，三出脉，叶缘中部以上有锯齿。核果近球形，成熟时红褐色。适应性强，是常见的行道树和庭园绿化树种。',
    featureVector: [0.8, 0.5, 0.7, 0.4, 0.3, 0.8, 0.2, 0.6],
    gallery: {
      leaves: [
        img('朴树叶片正面，基部偏斜'),
        img('朴树叶背面，脉腋有毛'),
        img('朴树枝叶，叶片排列'),
      ],
      bark: [
        img('朴树树干，灰色光滑不开裂'),
        img('朴树树皮皮孔'),
      ],
      fruits: [
        img('朴树核果近球形，红褐色'),
        img('朴树果梗较叶柄短'),
      ],
      flowers: [
        img('朴树花小，杂性同株'),
        img('朴树雄花簇生'),
      ],
    },
    comparison: {
      plantId: '9',
      leafShape: img('朴树卵形叶片形状'),
      leafMargin: img('朴树叶中部以上锯齿'),
      leafVein: img('朴树三出脉特写'),
      fruit: img('朴树球形核果形态'),
    },
  },
  {
    id: '10',
    name: '乌桕',
    scientificName: 'Triadica sebifera',
    leafImage: img('乌桕叶片特写，菱形，全缘，秋季变红'),
    distribution: '中国黄河流域以南各省区，日本、越南、印度也有',
    uses: '行道树、观赏树，种子可取蜡和榨油',
    description: '乌桕是大戟科乌桕属的落叶乔木，树冠近球形。叶片互生，菱形或菱状卵形，全缘，秋季叶色变为深红或橙黄，十分美丽。种子外被白色蜡质假种皮，可制蜡烛和肥皂，种仁榨油供工业用。',
    featureVector: [0.2, 0.3, 0.8, 0.5, 0.4, 0.7, 0.6, 0.9],
    gallery: {
      leaves: [
        img('乌桕菱形叶片正面'),
        img('乌桕叶秋季变红'),
        img('乌桕枝叶，叶柄细长'),
      ],
      bark: [
        img('乌桕树干，暗灰色纵裂'),
        img('乌桕树皮裂纹'),
      ],
      fruits: [
        img('乌桕蒴果三棱状球形'),
        img('乌桕种子白色蜡质假种皮'),
      ],
      flowers: [
        img('乌桕穗状花序，黄绿色花'),
        img('乌桕花单性，雌雄同序'),
      ],
    },
    comparison: {
      plantId: '10',
      leafShape: img('乌桕菱形叶片形状'),
      leafMargin: img('乌桕全缘叶缘'),
      leafVein: img('乌桕羽状脉特写'),
      fruit: img('乌桕三棱状蒴果形态'),
    },
  },
  {
    id: '11',
    name: '无患子',
    scientificName: 'Sapindus saponaria',
    leafImage: img('无患子叶片特写，偶数羽状复叶，小叶披针形'),
    distribution: '中国长江流域以南各省区，日本、朝鲜、印度也有',
    uses: '行道树、庭荫树，果皮含皂素可代肥皂',
    description: '无患子是无患子科无患子属的落叶乔木，树冠广卵形。偶数羽状复叶互生，小叶8-16枚，卵状披针形至长椭圆状披针形。圆锥花序顶生，花小，黄绿色。核果球形，成熟时黄色或橙黄色。果皮含有皂素，可代肥皂使用。',
    featureVector: [0.6, 0.9, 0.4, 0.7, 0.8, 0.3, 0.5, 0.2],
    gallery: {
      leaves: [
        img('无患子偶数羽状复叶'),
        img('无患子小叶披针形全缘'),
        img('无患子秋季叶色变黄'),
      ],
      bark: [
        img('无患子树干，灰褐色不裂'),
        img('无患子树皮皮孔'),
      ],
      fruits: [
        img('无患子核果球形，黄色'),
        img('无患子果序'),
      ],
      flowers: [
        img('无患子圆锥花序，小花黄绿色'),
        img('无患子花特写'),
      ],
    },
    comparison: {
      plantId: '11',
      leafShape: img('无患子羽状复叶形状'),
      leafMargin: img('无患子小叶全缘叶缘'),
      leafVein: img('无患子羽状侧脉'),
      fruit: img('无患子球形核果形态'),
    },
  },
  {
    id: '12',
    name: '合欢',
    scientificName: 'Albizia julibrissin',
    leafImage: img('合欢叶片特写，二回偶数羽状复叶，小叶镰刀形'),
    distribution: '中国黄河流域及以南各地，非洲、中亚也有',
    uses: '行道树、观赏树，树皮和花可入药',
    description: '合欢是豆科合欢属的落叶乔木，树冠伞形，开展。二回偶数羽状复叶，小叶镰刀形，夜晚或雨天闭合。头状花序排列成伞房状，花粉红色，形似绒球，故又名"绒花树"。树皮和花均可入药，有安神解郁之效。',
    featureVector: [0.4, 0.1, 0.5, 0.3, 0.6, 0.8, 0.7, 0.9],
    gallery: {
      leaves: [
        img('合欢二回偶数羽状复叶'),
        img('合欢小叶镰刀形'),
        img('合欢叶片夜间闭合状态'),
      ],
      bark: [
        img('合欢树干，灰黑色纵裂'),
        img('合欢树皮纹理'),
      ],
      fruits: [
        img('合欢荚果带状，扁平'),
        img('合欢成熟荚果褐色'),
      ],
      flowers: [
        img('合欢头状花序，粉红色绒球'),
        img('合欢花丝粉红色'),
      ],
    },
    comparison: {
      plantId: '12',
      leafShape: img('合欢二回羽状复叶形状'),
      leafMargin: img('合欢小叶全缘叶缘'),
      leafVein: img('合欢中脉偏斜叶脉'),
      fruit: img('合欢带状扁平荚果形态'),
    },
  },
];

export async function fetchPlants(): Promise<PlantDetail[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(plantsData), 300);
  });
}

export async function fetchPlantById(id: string): Promise<PlantDetail | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(plantsData.find((p) => p.id === id));
    }, 200);
  });
}
