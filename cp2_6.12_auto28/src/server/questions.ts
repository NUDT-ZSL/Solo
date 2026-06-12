export interface QuestionData {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
}

export const QUESTION_BANK: { [key: string]: QuestionData[] } = {
  tech: [
    { id: 't1', text: 'JavaScript 中，以下哪个不是原始数据类型？', options: ['Number', 'String', 'Array', 'Boolean'], correctIndex: 2, category: 'tech' },
    { id: 't2', text: 'HTTP 状态码 404 表示什么？', options: ['服务器错误', '页面未找到', '请求成功', '重定向'], correctIndex: 1, category: 'tech' },
    { id: 't3', text: '以下哪个不是编程语言？', options: ['Python', 'Java', 'HTML', 'Ruby'], correctIndex: 2, category: 'tech' },
    { id: 't4', text: 'TCP/IP 协议中，TCP 工作在哪一层？', options: ['网络层', '传输层', '应用层', '数据链路层'], correctIndex: 1, category: 'tech' },
    { id: 't5', text: '2023 年发布的 iPhone 15 系列使用了什么充电接口？', options: ['Lightning', 'Micro USB', 'USB-C', 'MagSafe'], correctIndex: 2, category: 'tech' },
    { id: 't6', text: 'React 是由哪家公司开发的？', options: ['Google', 'Facebook (Meta)', 'Microsoft', 'Amazon'], correctIndex: 1, category: 'tech' },
    { id: 't7', text: 'AI 领域中，GPT 是哪个公司的产品？', options: ['Google', 'Microsoft', 'OpenAI', 'Baidu'], correctIndex: 2, category: 'tech' },
    { id: 't8', text: '数据库中，SQL 的全称是什么？', options: ['Structured Query Language', 'Simple Query Language', 'System Query Language', 'Standard Query Language'], correctIndex: 0, category: 'tech' },
    { id: 't9', text: '以下哪种排序算法的平均时间复杂度最低？', options: ['冒泡排序', '选择排序', '快速排序', '插入排序'], correctIndex: 2, category: 'tech' },
    { id: 't10', text: 'Git 中，哪个命令用于查看提交历史？', options: ['git status', 'git log', 'git diff', 'git show'], correctIndex: 1, category: 'tech' },
    { id: 't11', text: '区块链技术的核心特征不包括？', options: ['去中心化', '不可篡改', '中心化管理', '透明可追溯'], correctIndex: 2, category: 'tech' },
    { id: 't12', text: '5G 网络相比 4G，主要提升了什么？', options: ['信号覆盖范围', '传输速度和延迟', '电池续航', '屏幕分辨率'], correctIndex: 1, category: 'tech' },
    { id: 't13', text: 'TypeScript 是由哪家公司开发的？', options: ['Google', 'Meta', 'Microsoft', 'Apple'], correctIndex: 2, category: 'tech' },
    { id: 't14', text: '以下哪个不是 NoSQL 数据库？', options: ['MongoDB', 'Redis', 'PostgreSQL', 'Cassandra'], correctIndex: 2, category: 'tech' },
    { id: 't15', text: 'CSS 中 flex 布局的主轴默认方向是？', options: ['垂直方向', '水平方向', '对角线方向', '没有默认方向'], correctIndex: 1, category: 'tech' },
    { id: 't16', text: '计算机中 1GB 等于多少 MB？', options: ['100MB', '512MB', '1000MB', '1024MB'], correctIndex: 3, category: 'tech' },
    { id: 't17', text: '以下哪个是前端框架？', options: ['Django', 'Vue.js', 'Laravel', 'Spring Boot'], correctIndex: 1, category: 'tech' },
    { id: 't18', text: 'DNS 的主要作用是什么？', options: ['加密通信', '域名解析', '数据压缩', '负载均衡'], correctIndex: 1, category: 'tech' },
    { id: 't19', text: 'Linux 系统中查看当前目录的命令是？', options: ['cd', 'ls', 'pwd', 'cat'], correctIndex: 1, category: 'tech' },
    { id: 't20', text: 'API 的中文全称是什么？', options: ['应用编程接口', '高级程序接口', '自动化处理接口', '算法处理接口'], correctIndex: 0, category: 'tech' },
  ],
  history: [
    { id: 'h1', text: '中国历史上第一个统一的封建王朝是？', options: ['商朝', '周朝', '秦朝', '汉朝'], correctIndex: 2, category: 'history' },
    { id: 'h2', text: '万里长城最初是哪个朝代修建的？', options: ['秦朝', '汉朝', '明朝', '唐朝'], correctIndex: 0, category: 'history' },
    { id: 'h3', text: '第二次世界大战结束于哪一年？', options: ['1943年', '1944年', '1945年', '1946年'], correctIndex: 2, category: 'history' },
    { id: 'h4', text: '中国四大发明不包括以下哪项？', options: ['造纸术', '印刷术', '指南针', '地动仪'], correctIndex: 3, category: 'history' },
    { id: 'h5', text: '丝绸之路是在哪个朝代开通的？', options: ['秦朝', '汉朝', '唐朝', '宋朝'], correctIndex: 1, category: 'history' },
    { id: 'h6', text: '美国独立宣言签署于哪一年？', options: ['1774年', '1775年', '1776年', '1777年'], correctIndex: 2, category: 'history' },
    { id: 'h7', text: '以下哪位是三国时期蜀汉的丞相？', options: ['曹操', '诸葛亮', '周瑜', '司马懿'], correctIndex: 1, category: 'history' },
    { id: 'h8', text: '人类历史上第一次登月是在哪一年？', options: ['1967年', '1968年', '1969年', '1970年'], correctIndex: 2, category: 'history' },
    { id: 'h9', text: '日本明治维新发生在哪一年代？', options: ['17世纪60年代', '18世纪60年代', '19世纪60年代', '20世纪60年代'], correctIndex: 2, category: 'history' },
    { id: 'h10', text: '中国历史上在位时间最长的皇帝是？', options: ['唐太宗', '汉武帝', '康熙', '乾隆'], correctIndex: 2, category: 'history' },
    { id: 'h11', text: '文艺复兴最早起源于哪个国家？', options: ['法国', '英国', '德国', '意大利'], correctIndex: 3, category: 'history' },
    { id: 'h12', text: '清朝最后一位皇帝是？', options: ['光绪', '宣统', '同治', '咸丰'], correctIndex: 1, category: 'history' },
    { id: 'h13', text: '工业革命最早发生在哪个国家？', options: ['德国', '法国', '英国', '美国'], correctIndex: 2, category: 'history' },
    { id: 'h14', text: '中华人民共和国成立于哪一年？', options: ['1945年', '1947年', '1949年', '1950年'], correctIndex: 2, category: 'history' },
    { id: 'h15', text: '玛雅文明主要分布在哪个地区？', options: ['欧洲', '非洲', '中美洲', '亚洲'], correctIndex: 2, category: 'history' },
    { id: 'h16', text: '以下哪位是《史记》的作者？', options: ['班固', '司马迁', '司马光', '陈寿'], correctIndex: 1, category: 'history' },
    { id: 'h17', text: '冷战期间，北约和华约的对立双方是？', options: ['美英 vs 法德', '资本主义 vs 共产主义阵营', '日本 vs 中国', '欧洲 vs 亚洲'], correctIndex: 1, category: 'history' },
    { id: 'h18', text: '哥伦布发现新大陆是在哪一年？', options: ['1490年', '1491年', '1492年', '1493年'], correctIndex: 2, category: 'history' },
    { id: 'h19', text: '甲骨文是哪个朝代的文字？', options: ['夏朝', '商朝', '周朝', '秦朝'], correctIndex: 1, category: 'history' },
    { id: 'h20', text: '第一次世界大战的导火索是什么事件？', options: ['珍珠港事件', '萨拉热窝事件', '诺曼底登陆', '柏林墙倒塌'], correctIndex: 1, category: 'history' },
  ],
  entertainment: [
    { id: 'e1', text: '《哈利·波特》系列小说的作者是谁？', options: ['J.R.R.托尔金', 'J.K.罗琳', 'C.S.刘易斯', '斯蒂芬·金'], correctIndex: 1, category: 'entertainment' },
    { id: 'e2', text: '奥斯卡金像奖是哪个国家的电影奖项？', options: ['英国', '法国', '美国', '意大利'], correctIndex: 2, category: 'entertainment' },
    { id: 'e3', text: '以下哪部不是宫崎骏的动画作品？', options: ['千与千寻', '龙猫', '你的名字', '天空之城'], correctIndex: 2, category: 'entertainment' },
    { id: 'e4', text: '《王者荣耀》是由哪家公司开发的？', options: ['网易', '腾讯', '米哈游', '莉莉丝'], correctIndex: 1, category: 'entertainment' },
    { id: 'e5', text: '迈克尔·杰克逊被誉为什么之王？', options: ['摇滚之王', '流行之王', '蓝调之王', '说唱之王'], correctIndex: 1, category: 'entertainment' },
    { id: 'e6', text: '电影《泰坦尼克号》的导演是谁？', options: ['斯皮尔伯格', '詹姆斯·卡梅隆', '克里斯托弗·诺兰', '马丁·斯科塞斯'], correctIndex: 1, category: 'entertainment' },
    { id: 'e7', text: '《原神》是由哪家游戏公司开发的？', options: ['腾讯', '网易', '米哈游', '字节跳动'], correctIndex: 2, category: 'entertainment' },
    { id: 'e8', text: '披头士乐队来自哪个国家？', options: ['美国', '英国', '德国', '澳大利亚'], correctIndex: 1, category: 'entertainment' },
    { id: 'e9', text: '《复仇者联盟》系列中，以下哪位不是初代复仇者？', options: ['钢铁侠', '美国队长', '蜘蛛侠', '雷神'], correctIndex: 2, category: 'entertainment' },
    { id: 'e10', text: '中国著名影星成龙的本名是什么？', options: ['陈港生', '房仕龙', '元楼', '以上都是'], correctIndex: 3, category: 'entertainment' },
    { id: 'e11', text: '《星球大战》的创造者是谁？', options: ['乔治·卢卡斯', '史蒂文·斯皮尔伯格', '詹姆斯·卡梅隆', '雷德利·斯科特'], correctIndex: 0, category: 'entertainment' },
    { id: 'e12', text: '以下哪个不是漫威超级英雄？', options: ['蝙蝠侠', '钢铁侠', '美国队长', '雷神'], correctIndex: 0, category: 'entertainment' },
    { id: 'e13', text: '华语乐坛"天王"周杰伦的第一张专辑是？', options: ['范特西', 'Jay', '八度空间', '叶惠美'], correctIndex: 1, category: 'entertainment' },
    { id: 'e14', text: '电视剧《权力的游戏》改编自哪部小说？', options: ['魔戒', '冰与火之歌', '哈利波特', '时光之轮'], correctIndex: 1, category: 'entertainment' },
    { id: 'e15', text: '韩国流行音乐被称为什么？', options: ['J-pop', 'K-pop', 'C-pop', 'T-pop'], correctIndex: 1, category: 'entertainment' },
    { id: 'e16', text: '《阿凡达》是在哪一年首次上映的？', options: ['2007年', '2008年', '2009年', '2010年'], correctIndex: 2, category: 'entertainment' },
    { id: 'e17', text: '以下哪个游戏类型不属于"MOBA"？', options: ['英雄联盟', 'DOTA 2', 'CS:GO', '王者荣耀'], correctIndex: 2, category: 'entertainment' },
    { id: 'e18', text: '电影《肖申克的救赎》改编自哪位作家的小说？', options: ['海明威', '斯蒂芬·金', '马克·吐温', '爱伦·坡'], correctIndex: 1, category: 'entertainment' },
    { id: 'e19', text: '迪士尼的经典动画《狮子王》取材于哪部戏剧？', options: ['罗密欧与朱丽叶', '哈姆雷特', '麦克白', '李尔王'], correctIndex: 1, category: 'entertainment' },
    { id: 'e20', text: '中国的春节联欢晚会始于哪一年？', options: ['1979年', '1983年', '1985年', '1990年'], correctIndex: 1, category: 'entertainment' },
  ],
};

export function getRandomQuestions(category: string, count: number): QuestionData[] {
  const pool = QUESTION_BANK[category] || QUESTION_BANK.tech;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((q, i) => ({
    ...q,
    id: `${q.id}-${Date.now()}-${i}`,
  }));
}
