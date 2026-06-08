export interface HistoricalEvent {
  id: string
  title: string
  year: number
  century: number
  category: 'technology' | 'war' | 'culture' | 'politics' | 'exploration'
  description: string
  detail: string
  branches?: EventBranch[]
}

export interface EventBranch {
  id: string
  title: string
  year: number
  description: string
}

export const CATEGORY_LABELS: Record<string, string> = {
  technology: '科技',
  war: '战争',
  culture: '文化',
  politics: '政治',
  exploration: '探索',
}

export const CATEGORY_COLORS: Record<string, string> = {
  technology: '#4fc3f7',
  war: '#ef5350',
  culture: '#ab47bc',
  politics: '#ffb347',
  exploration: '#66bb6a',
}

export const historicalEvents: HistoricalEvent[] = [
  {
    id: 'e1',
    title: '古埃及金字塔建造',
    year: -2560,
    century: -26,
    category: 'culture',
    description: '吉萨大金字塔的建造标志着古埃及文明的巅峰',
    detail: '胡夫金字塔是古代世界七大奇迹中唯一现存的建筑，高约146米，由约230万块石灰石砌成，建造历时约20年。它体现了古埃及人在数学、天文学和工程学方面的卓越成就。',
    branches: [
      { id: 'b1-1', title: '设计规划阶段', year: -2570, description: '建筑师设计金字塔结构和地基' },
      { id: 'b1-2', title: '石料开采运输', year: -2568, description: '从采石场开采并运输数百万块巨石' },
      { id: 'b1-3', title: '主体建造', year: -2565, description: '逐层堆叠石块，精确校准角度' },
      { id: 'b1-4', title: '完工与封顶', year: -2560, description: '放置金色顶石，完成神圣仪式' },
    ],
  },
  {
    id: 'e2',
    title: '雅典民主制度建立',
    year: -508,
    century: -6,
    category: 'politics',
    description: '克利斯提尼改革开创了人类历史上第一个民主制度',
    detail: '公元前508年，雅典政治家克利斯提尼推行了一系列改革，打破了贵族对政治权力的垄断，建立了以地区为基础的部落制度，确立了公民大会的最高权力，开创了直接民主的先河。',
    branches: [
      { id: 'b2-1', title: '贵族统治危机', year: -510, description: '僭主被驱逐，贵族争权夺利' },
      { id: 'b2-2', title: '克利斯提尼改革', year: -508, description: '推行部落制度和民主改革' },
      { id: 'b2-3', title: '陶片放逐法', year: -507, description: '防止独裁者出现的民主机制' },
    ],
  },
  {
    id: 'e3',
    title: '丝绸之路开通',
    year: -130,
    century: -2,
    category: 'exploration',
    description: '连接东西方文明的贸易通道正式形成',
    detail: '丝绸之路是古代连接中国与地中海地区的重要贸易路线，全长约6400公里。它不仅是商品贸易的通道，更是文化、宗教和技术交流的桥梁，深刻影响了沿线各文明的发展。',
    branches: [
      { id: 'b3-1', title: '张骞出使西域', year: -138, description: '汉武帝派张骞出使大月氏' },
      { id: 'b3-2', title: '路线贯通', year: -130, description: '东西方贸易路线正式贯通' },
      { id: 'b3-3', title: '贸易繁荣期', year: -100, description: '丝绸、香料、宝石贸易繁盛' },
    ],
  },
  {
    id: 'e4',
    title: '罗马帝国灭亡',
    year: 476,
    century: 5,
    category: 'war',
    description: '西罗马帝国覆灭，欧洲进入中世纪',
    detail: '公元476年，日耳曼人奥多亚克废黜了西罗马帝国最后一位皇帝罗慕路斯·奥古斯都，标志着延续近五百年的西罗马帝国正式灭亡，欧洲自此进入了长达千年的中世纪时期。',
    branches: [
      { id: 'b4-1', title: '帝国分裂', year: 395, description: '罗马帝国正式分裂为东西两部分' },
      { id: 'b4-2', title: '蛮族入侵', year: 410, description: '西哥特人攻陷罗马城' },
      { id: 'b4-3', title: '帝国覆灭', year: 476, description: '奥多亚克废黜末代皇帝' },
    ],
  },
  {
    id: 'e5',
    title: '古腾堡印刷术',
    year: 1440,
    century: 15,
    category: 'technology',
    description: '活字印刷术的革命性发明改变了知识传播方式',
    detail: '约翰内斯·古腾堡发明了金属活字印刷术，使书籍的生产速度和规模得到极大提升。这项技术直接推动了文艺复兴、宗教改革和科学革命，被誉为千年来最重要的发明之一。',
    branches: [
      { id: 'b5-1', title: '印刷机研发', year: 1440, description: '古腾堡研制金属活字印刷机' },
      { id: 'b5-2', title: '圣经印刷', year: 1455, description: '完成古腾堡圣经的印刷' },
      { id: 'b5-3', title: '知识传播革命', year: 1460, description: '印刷术迅速传播至全欧洲' },
    ],
  },
  {
    id: 'e6',
    title: '哥伦布发现新大陆',
    year: 1492,
    century: 15,
    category: 'exploration',
    description: '开启了大航海时代和全球化的序幕',
    detail: '1492年10月12日，克里斯托弗·哥伦布率领船队抵达加勒比海群岛，开启了欧洲与美洲之间持续数百年的联系。这一事件深刻改变了世界的人口、文化和生态格局。',
    branches: [
      { id: 'b6-1', title: '启航远征', year: 1492, description: '从西班牙帕洛斯港出发' },
      { id: 'b6-2', title: '发现陆地', year: 1492, description: '抵达圣萨尔瓦多岛' },
      { id: 'b6-3', title: '后续航行', year: 1493, description: '三次后续航行探索加勒比地区' },
    ],
  },
  {
    id: 'e7',
    title: '法国大革命',
    year: 1789,
    century: 18,
    category: 'politics',
    description: '推翻君主制，确立现代民主与人权理念',
    detail: '法国大革命是人类历史上最深刻的政治变革之一，它推翻了波旁王朝的专制统治，颁布了《人权宣言》，确立了自由、平等、博爱的原则，深刻影响了此后全球的政治发展进程。',
    branches: [
      { id: 'b7-1', title: '三级会议召开', year: 1789, description: '国王被迫召开三级会议解决财政危机' },
      { id: 'b7-2', title: '攻占巴士底狱', year: 1789, description: '7月14日民众攻占巴士底狱' },
      { id: 'b7-3', title: '人权宣言', year: 1789, description: '8月26日制宪会议通过人权宣言' },
    ],
  },
  {
    id: 'e8',
    title: '工业革命',
    year: 1760,
    century: 18,
    category: 'technology',
    description: '蒸汽动力引领人类从农业社会进入工业社会',
    detail: '18世纪中叶起源于英国的工业革命，以蒸汽机的改良和纺织机的发明为标志，彻底改变了人类的生产方式和社会结构，使人类从农业社会迈入工业社会，开创了现代化的进程。',
    branches: [
      { id: 'b8-1', title: '纺织机发明', year: 1764, description: '哈格里夫斯发明珍妮纺纱机' },
      { id: 'b8-2', title: '蒸汽机改良', year: 1769, description: '瓦特改良蒸汽机推动工业化' },
      { id: 'b8-3', title: '铁路时代', year: 1825, description: '史蒂芬森建造第一条公共铁路' },
    ],
  },
  {
    id: 'e9',
    title: '第一次世界大战',
    year: 1914,
    century: 20,
    category: 'war',
    description: '人类历史上第一场全球性战争',
    detail: '第一次世界大战（1914-1918）是人类历史上第一场波及全球的战争，涉及30多个国家，造成约2000万人死亡。战争终结了四个帝国，重新绘制了世界版图，深刻改变了国际政治格局。',
    branches: [
      { id: 'b9-1', title: '萨拉热窝事件', year: 1914, description: '奥匈帝国皇储遇刺成为战争导火索' },
      { id: 'b9-2', title: '堑壕战', year: 1915, description: '西线陷入惨烈的堑壕对峙' },
      { id: 'b9-3', title: '美国参战', year: 1917, description: '美国加入协约国一方作战' },
      { id: 'b9-4', title: '停战协定', year: 1918, description: '1918年11月11日签署停战协定' },
    ],
  },
  {
    id: 'e10',
    title: '相对论发表',
    year: 1905,
    century: 20,
    category: 'technology',
    description: '爱因斯坦提出狭义相对论，颠覆经典物理学',
    detail: '1905年，阿尔伯特·爱因斯坦发表了狭义相对论，提出了质能等价公式E=mc²，彻底改变了人类对时间、空间和物质的认识。1915年他又发表了广义相对论，将引力解释为时空的弯曲。',
    branches: [
      { id: 'b10-1', title: '奇迹年论文', year: 1905, description: '爱因斯坦发表四篇划时代论文' },
      { id: 'b10-2', title: '广义相对论', year: 1915, description: '将引力理论拓展到非惯性系' },
      { id: 'b10-3', title: '实验验证', year: 1919, description: '日食观测证实光线弯曲预言' },
    ],
  },
  {
    id: 'e11',
    title: '人类首次登月',
    year: 1969,
    century: 20,
    category: 'exploration',
    description: '阿波罗11号将人类送上月球表面',
    detail: '1969年7月20日，美国宇航员尼尔·阿姆斯特朗成为第一个踏上月球表面的人，说出了那句名言："这是一个人的一小步，却是人类的一大步。"这是人类太空探索史上最伟大的成就之一。',
    branches: [
      { id: 'b11-1', title: '阿波罗计划启动', year: 1961, description: '肯尼迪总统宣布登月目标' },
      { id: 'b11-2', title: '阿波罗11号发射', year: 1969, description: '7月16日从肯尼迪航天中心升空' },
      { id: 'b11-3', title: '月球行走', year: 1969, description: '7月20日阿姆斯特朗踏上月球' },
    ],
  },
  {
    id: 'e12',
    title: '互联网诞生',
    year: 1969,
    century: 20,
    category: 'technology',
    description: 'ARPANET的建立开创了信息时代',
    detail: '1969年10月29日，加州大学洛杉矶分校与斯坦福研究院之间通过ARPANET实现了第一次数据传输，这标志着互联网的诞生。此后几十年间，互联网从军事科研网络发展为全球信息基础设施。',
    branches: [
      { id: 'b12-1', title: 'ARPANET建立', year: 1969, description: '第一个分组交换网络诞生' },
      { id: 'b12-2', title: 'TCP/IP协议', year: 1983, description: '互联网标准协议正式启用' },
      { id: 'b12-3', title: '万维网发明', year: 1991, description: '蒂姆·伯纳斯-李发明万维网' },
    ],
  },
  {
    id: 'e13',
    title: '第二次世界大战',
    year: 1939,
    century: 20,
    category: 'war',
    description: '人类历史上规模最大、伤亡最惨重的战争',
    detail: '第二次世界大战（1939-1945）是人类历史上规模最大的全球性战争，超过60个国家和地区卷入，造成约7000万人死亡。战争以纳粹德国入侵波兰开始，以轴心国无条件投降告终，深刻重塑了战后世界秩序。',
    branches: [
      { id: 'b13-1', title: '闪电战', year: 1939, description: '德军以闪电战术迅速占领波兰' },
      { id: 'b13-2', title: '珍珠港事件', year: 1941, description: '日本偷袭珍珠港，美国参战' },
      { id: 'b13-3', title: '诺曼底登陆', year: 1944, description: '盟军开辟欧洲第二战场' },
      { id: 'b13-4', title: '日本投降', year: 1945, description: '8月15日日本宣布无条件投降' },
    ],
  },
  {
    id: 'e14',
    title: '文艺复兴运动',
    year: 1400,
    century: 15,
    category: 'culture',
    description: '从意大利开始的文化复兴运动席卷欧洲',
    detail: '文艺复兴是14-17世纪欧洲一场伟大的文化运动，以复兴古希腊罗马文化为名，实则是人文主义思想的觉醒。它催生了无数艺术杰作和科学发现，将人类从宗教束缚中解放，开启了现代文明的序幕。',
    branches: [
      { id: 'b14-1', title: '萌芽期', year: 1350, description: '彼特拉克等人文主义者开启运动' },
      { id: 'b14-2', title: '鼎盛期', year: 1500, description: '达芬奇、米开朗基罗等大师涌现' },
      { id: 'b14-3', title: '北方文艺复兴', year: 1520, description: '运动传播至北欧各国' },
    ],
  },
  {
    id: 'e15',
    title: '中国改革开放',
    year: 1978,
    century: 20,
    category: 'politics',
    description: '中国实行改革开放政策，开启经济腾飞之路',
    detail: '1978年12月，中共十一届三中全会召开，确立了改革开放的基本国策。此后四十余年间，中国从计划经济转向市场经济，GDP增长数百倍，数亿人脱离贫困，创造了人类历史上最壮观的经济奇迹。',
    branches: [
      { id: 'b15-1', title: '十一届三中全会', year: 1978, description: '确立改革开放方针' },
      { id: 'b15-2', title: '经济特区设立', year: 1980, description: '深圳等四个经济特区成立' },
      { id: 'b15-3', title: '加入WTO', year: 2001, description: '中国正式加入世界贸易组织' },
    ],
  },
  {
    id: 'e16',
    title: '人类基因组计划',
    year: 2003,
    century: 21,
    category: 'technology',
    description: '人类基因组测序完成，开启基因组医学时代',
    detail: '2003年4月14日，人类基因组计划宣布完成人类基因组的全部测序工作。这项历时13年、耗资27亿美元的宏伟科学工程，绘制了人类DNA的完整图谱，为疾病治疗、药物开发和生命科学研究奠定了基础。',
    branches: [
      { id: 'b16-1', title: '项目启动', year: 1990, description: '多国科学家联合启动基因组计划' },
      { id: 'b16-2', title: '草图完成', year: 2000, description: '宣布人类基因组工作草图完成' },
      { id: 'b16-3', title: '完整测序', year: 2003, description: '人类基因组全部测序完成' },
    ],
  },
]
