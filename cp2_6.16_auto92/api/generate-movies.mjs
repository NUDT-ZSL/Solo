import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const moviesData = [
  {
    title: '星际穿越',
    posterEmoji: '🚀',
    posterColor: '#1a365d',
    duration: 169,
    genre: '科幻',
    synopsis: '在不久的将来，地球面临严重的环境危机。一队宇航员穿越虫洞，寻找人类新的家园。'
  },
  {
    title: '盗梦空间',
    posterEmoji: '🌀',
    posterColor: '#2d3748',
    duration: 148,
    genre: '科幻',
    synopsis: '一位专业的盗贼通过进入他人梦境来窃取机密。他被给予一个机会来抹去自己的犯罪记录，但任务却是植入一个想法。'
  },
  {
    title: '让子弹飞',
    posterEmoji: '🎯',
    posterColor: '#742a2a',
    duration: 132,
    genre: '喜剧',
    synopsis: '一群土匪假扮县长来到鹅城，与当地恶霸展开了一场斗智斗勇的较量。'
  },
  {
    title: '无间道',
    posterEmoji: '🕵️',
    posterColor: '#1a202c',
    duration: 101,
    genre: '悬疑',
    synopsis: '警方和黑社会分别在对方阵营安插了卧底，两人在各自的身份危机中寻找真相。'
  },
  {
    title: '千与千寻',
    posterEmoji: '🐉',
    posterColor: '#2c5282',
    duration: 125,
    genre: '动画',
    synopsis: '少女千寻误入神灵世界，为了拯救变成猪的父母，她在汤屋开始了奇幻的冒险。'
  },
  {
    title: '哪吒之魔童降世',
    posterEmoji: '🔥',
    posterColor: '#9b2c2c',
    duration: 110,
    genre: '动画',
    synopsis: '魔丸转世的哪吒从小被世人误解，他与命运抗争，最终证明了自己。'
  },
  {
    title: '战狼2',
    posterEmoji: '🐺',
    posterColor: '#5a3e1b',
    duration: 123,
    genre: '动作',
    synopsis: '退伍军人冷锋在非洲战乱中挺身而出，营救被困同胞和难民。'
  },
  {
    title: '流浪地球',
    posterEmoji: '🌍',
    posterColor: '#1e3a5f',
    duration: 125,
    genre: '科幻',
    synopsis: '太阳即将毁灭，人类启动"流浪地球"计划，带着地球寻找新的恒星系统。'
  },
  {
    title: '你好，李焕英',
    posterEmoji: '👩‍👧',
    posterColor: '#702459',
    duration: 128,
    genre: '喜剧',
    synopsis: '女儿意外穿越回到过去，与年轻时代的母亲相遇，上演了一段温馨感人的故事。'
  },
  {
    title: '唐人街探案',
    posterEmoji: '🔍',
    posterColor: '#b7791f',
    duration: 135,
    genre: '悬疑',
    synopsis: '唐仁和秦风这对奇葩搭档在泰国唐人街卷入一桩离奇的黄金失窃案。'
  },
  {
    title: '我不是药神',
    posterEmoji: '💊',
    posterColor: '#285e61',
    duration: 117,
    genre: '喜剧',
    synopsis: '一位普通商人从印度代购仿制药，成为白血病患者眼中的"药神"。'
  },
  {
    title: '红海行动',
    posterEmoji: '⚓',
    posterColor: '#2a4365',
    duration: 138,
    genre: '动作',
    synopsis: '中国海军蛟龙突击队深入战乱地区，执行人质营救和撤侨任务。'
  },
  {
    title: '龙猫',
    posterEmoji: '🐾',
    posterColor: '#276749',
    duration: 86,
    genre: '动画',
    synopsis: '姐妹俩搬到乡下居住，与森林中的神奇生物龙猫相遇，度过了美好的夏天。'
  },
  {
    title: '功夫',
    posterEmoji: '🥋',
    posterColor: '#744210',
    duration: 99,
    genre: '喜剧',
    synopsis: '小混混星仔梦想成为黑帮老大，却意外卷入斧头帮与猪笼城寨高手的纷争。'
  },
  {
    title: '夏洛特烦恼',
    posterEmoji: '🎸',
    posterColor: '#4a5568',
    duration: 104,
    genre: '喜剧',
    synopsis: '夏洛在中学同学婚礼上意外穿越回高中时代，重新追求自己的音乐梦想。'
  },
  {
    title: '暴裂无声',
    posterEmoji: '⛰️',
    posterColor: '#434343',
    duration: 120,
    genre: '悬疑',
    synopsis: '哑巴矿工张保民在寻找失踪儿子的过程中，逐渐揭开一个惊人的阴谋。'
  },
  {
    title: '姜子牙',
    posterEmoji: '⚔️',
    posterColor: '#1a365d',
    duration: 110,
    genre: '动画',
    synopsis: '封神大战后，姜子牙因一时之过被贬下凡，他在寻找自我的过程中发现了当年的真相。'
  },
  {
    title: '湄公河行动',
    posterEmoji: '🛥️',
    posterColor: '#3d2e1f',
    duration: 124,
    genre: '动作',
    synopsis: '中国缉毒精英潜入金三角，追查湄公河惨案的幕后真凶。'
  },
  {
    title: '寻龙诀',
    posterEmoji: '☯️',
    posterColor: '#5c3317',
    duration: 125,
    genre: '动作',
    synopsis: '三位摸金校尉重出江湖，深入草原千年古墓，寻找传说中的彼岸花。'
  },
  {
    title: '催眠大师',
    posterEmoji: '💫',
    posterColor: '#44337a',
    duration: 102,
    genre: '悬疑',
    synopsis: '著名心理治疗师徐瑞宁遇到一位特殊的女病人，两人在催眠与反催眠中展开较量。'
  },
  {
    title: '疯狂动物城',
    posterEmoji: '🦊',
    posterColor: '#2f855a',
    duration: 108,
    genre: '动画',
    synopsis: '兔子朱迪成为动物城第一位兔子警官，与狐狸尼克搭档破解一起神秘失踪案。'
  }
]

const movies = moviesData.map(m => ({
  id: uuidv4(),
  ...m
}))

const dataPath = path.join(__dirname, 'data', 'movies.json')
await fs.writeFile(dataPath, JSON.stringify(movies, null, 2), 'utf-8')
console.log(`成功生成 ${movies.length} 部电影数据`)
