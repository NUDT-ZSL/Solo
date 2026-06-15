export interface Comment {
  id: string;
  username: string;
  content: string;
  timestamp: string;
}

export interface Work {
  id: string;
  title: string;
  description: string;
  author: string;
  imageUrl: string;
  tags: string[];
  votes: number;
  comments: Comment[];
}

export const mockWorks: Work[] = [
  {
    id: "1",
    title: "星际迷航：深空探索",
    description: "一款基于WebGL的太空探索游戏，玩家可以驾驶飞船穿越星系，发现未知星球和文明。游戏采用程序化生成技术，每次探索都能带来全新体验。支持多人联机合作模式，与好友一起征服宇宙。",
    author: "张明远",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=deep%20space%20exploration%20spaceship%20nebula%20sci-fi%20digital%20art&image_size=landscape_16_9",
    tags: ["WebGL", "游戏", "3D"],
    votes: 42,
    comments: [
      { id: "c1", username: "星辰大海", content: "画面太震撼了！WebGL能做到这种效果真的厉害", timestamp: "2025-06-15T08:00:00Z" },
      { id: "c2", username: "代码猎人", content: "多人联机是怎么实现的？延迟怎么样？", timestamp: "2025-06-15T10:30:00Z" },
      { id: "c3", username: "像素艺术家", content: "程序化生成的算法很巧妙，每次都有惊喜", timestamp: "2025-06-15T12:15:00Z" }
    ]
  },
  {
    id: "2",
    title: "城市脉搏：数据可视化",
    description: "一个实时城市数据可视化平台，通过动态图表和地图展示城市交通、天气、人口流动等数据。采用D3.js和Mapbox构建交互式界面，支持多维度数据筛选和对比分析，帮助城市规划者做出更明智的决策。",
    author: "李思琪",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=city%20data%20visualization%20dashboard%20modern%20UI%20digital%20art&image_size=landscape_16_9",
    tags: ["D3.js", "数据可视化", "Mapbox"],
    votes: 38,
    comments: [
      { id: "c4", username: "数据控", content: "数据刷新速度很快，交互也很流畅", timestamp: "2025-06-15T09:00:00Z" },
      { id: "c5", username: "城市观察者", content: "这个工具对城市规划太有帮助了", timestamp: "2025-06-15T11:45:00Z" }
    ]
  },
  {
    id: "3",
    title: "墨韵：AI书法生成器",
    description: "利用深度学习模型生成中国书法作品的Web应用。用户输入文字内容，选择书法风格（楷书、行书、草书等），AI即可生成逼真的书法作品。支持笔触调整、纸张纹理选择，并可导出高清图片用于打印。",
    author: "王艺涵",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20calligraphy%20AI%20art%20ink%20brush%20digital%20painting&image_size=landscape_16_9",
    tags: ["AI", "书法", "深度学习"],
    votes: 56,
    comments: [
      { id: "c6", username: "书法爱好者", content: "生成的行书非常自然，笔锋有力！", timestamp: "2025-06-15T07:30:00Z" },
      { id: "c7", username: "AI观察者", content: "模型推理速度怎么样？用的什么框架？", timestamp: "2025-06-15T09:15:00Z" },
      { id: "c8", username: "设计师小陈", content: "纸张纹理的选择很用心，效果很棒", timestamp: "2025-06-15T13:00:00Z" },
      { id: "c9", username: "文化传承者", content: "这种技术与传统文化的结合太有意义了", timestamp: "2025-06-15T14:30:00Z" }
    ]
  },
  {
    id: "4",
    title: "生态链：环保追踪器",
    description: "一款个人碳足迹追踪和环保行为记录应用。用户可以记录日常出行、饮食、能源使用等数据，系统自动计算碳排放量并给出减碳建议。设有社区排行榜和环保挑战活动，鼓励绿色生活方式。",
    author: "陈雨桐",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=eco%20green%20sustainability%20app%20nature%20technology%20digital%20art&image_size=landscape_16_9",
    tags: ["React Native", "环保", "PWA"],
    votes: 31,
    comments: [
      { id: "c10", username: "绿色生活", content: "终于有一个好用的碳足迹追踪工具了", timestamp: "2025-06-15T10:00:00Z" },
      { id: "c11", username: "极简主义者", content: "界面很清爽，数据展示直观易懂", timestamp: "2025-06-15T12:00:00Z" }
    ]
  },
  {
    id: "5",
    title: "音律工坊：在线音乐制作",
    description: "一个浏览器端的音乐创作平台，提供虚拟合成器、鼓机、音序器和效果器。支持MIDI输入和实时录音，内置多种音色预设和节拍模板。用户可以在线协作编曲，作品一键分享到社区。采用Web Audio API实现低延迟音频处理。",
    author: "赵乐天",
    imageUrl: "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=music%20production%20studio%20digital%20audio%20workstation%20modern%20UI&image_size=landscape_16_9",
    tags: ["Web Audio", "音乐", "协作"],
    votes: 45,
    comments: [
      { id: "c12", username: "音乐制作人", content: "Web Audio API的延迟控制做得很好", timestamp: "2025-06-15T08:30:00Z" },
      { id: "c13", username: "独立音乐人", content: "在线协作功能太实用了，终于可以远程编曲了", timestamp: "2025-06-15T11:00:00Z" },
      { id: "c14", username: "节奏大师", content: "鼓机的音色很丰富，节拍模板也很有创意", timestamp: "2025-06-15T13:30:00Z" }
    ]
  }
];
