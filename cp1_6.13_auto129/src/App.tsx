import { useState, useMemo, useCallback } from 'react'
import GlobeScene from './GlobeScene'
import ControlPanel from './ControlPanel'
import StoryCard from './StoryCard'

export interface Story {
  id: string
  title: string
  summary: string
  imageUrl: string
  latitude: number
  longitude: number
  region: 'asia' | 'europe' | 'northAmerica' | 'southAmerica' | 'africa' | 'oceania'
  date: string
  dotColor: string
}

export interface FilterState {
  region: string
  dateRange: 'week' | 'month' | 'all'
}

const DOT_COLORS = ['#f97316', '#6366f1', '#22c55e', '#ec4899', '#f59e0b']

const MOCK_STORIES: Story[] = [
  { id: '1', title: '东京霓虹漫步', summary: '在涩谷十字路口感受世界最繁忙的人流，夜晚的霓虹灯将整条街道染成赛博朋克般的梦幻色彩。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Tokyo%20Shibuya%20crossing%20at%20night%20neon%20lights%20rainy%20street%20cyberpunk&image_size=landscape_16_9', latitude: 35.6762, longitude: 139.6503, region: 'asia', date: '2026-06-10', dotColor: DOT_COLORS[0] },
  { id: '2', title: '巴黎塞纳河黄昏', summary: '夕阳下的埃菲尔铁塔倒映在塞纳河中，河畔的旧书摊和咖啡馆弥漫着法式浪漫。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Paris%20Seine%20river%20sunset%20Eiffel%20tower%20reflection%20romantic&image_size=landscape_16_9', latitude: 48.8566, longitude: 2.3522, region: 'europe', date: '2026-06-08', dotColor: DOT_COLORS[1] },
  { id: '3', title: '纽约不夜城', summary: '时代广场的巨幕广告和百老汇的灯火交织，这座从不入睡的城市永远充满能量。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=New%20York%20Times%20Square%20night%20broadway%20lights%20cityscape&image_size=landscape_16_9', latitude: 40.7128, longitude: -74.006, region: 'northAmerica', date: '2026-05-28', dotColor: DOT_COLORS[2] },
  { id: '4', title: '里约热内卢嘉年华', summary: '色彩斑斓的桑巴舞步和热情的节拍，在科帕卡巴纳海滩上尽情释放灵魂。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Rio%20de%20Janeiro%20carnival%20samba%20dancers%20colorful%20Copacabana%20beach&image_size=landscape_16_9', latitude: -22.9068, longitude: -43.1729, region: 'southAmerica', date: '2026-06-01', dotColor: DOT_COLORS[3] },
  { id: '5', title: '开罗金字塔日落', summary: '吉萨金字塔在撒哈拉沙漠的落日余晖中投下悠长的影子，四千年的文明静静诉说。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Cairo%20Giza%20pyramids%20sunset%20desert%20silhouette%20ancient&image_size=landscape_16_9', latitude: 30.0444, longitude: 31.2357, region: 'africa', date: '2026-06-05', dotColor: DOT_COLORS[4] },
  { id: '6', title: '悉尼歌剧院晨曦', summary: '清晨的港湾微风轻拂，歌剧院如白色风帆般矗立在碧蓝海水之上，壮丽而宁静。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Sydney%20Opera%20House%20harbor%20sunrise%20blue%20water%20morning&image_size=landscape_16_9', latitude: -33.8688, longitude: 151.2093, region: 'oceania', date: '2026-05-20', dotColor: DOT_COLORS[0] },
  { id: '7', title: '京都竹林幽径', summary: '岚山竹林中光影斑驳，风吹竹叶沙沙作响，仿佛走入千年前的时间缝隙。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Kyoto%20Arashiyama%20bamboo%20grove%20forest%20path%20serene&image_size=landscape_16_9', latitude: 35.0116, longitude: 135.7681, region: 'asia', date: '2026-06-11', dotColor: DOT_COLORS[2] },
  { id: '8', title: '冰岛极光奇观', summary: '在黑沙滩上仰望天空，翡翠绿色的极光如丝带般舞动，大自然最震撼的灯光秀。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Iceland%20northern%20lights%20aurora%20borealis%20black%20sand%20beach%20night&image_size=landscape_16_9', latitude: 64.1466, longitude: -21.9426, region: 'europe', date: '2026-06-09', dotColor: DOT_COLORS[1] },
  { id: '9', title: '马丘比丘云端之城', summary: '雾气缭绕的安第斯山脉中，印加古城遗址若隐若现，恍若天空之城降临人间。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Machu%20Picchu%20Andes%20mountains%20mist%20ancient%20Inca%20citadel&image_size=landscape_16_9', latitude: -13.1631, longitude: -72.545, region: 'southAmerica', date: '2026-05-15', dotColor: DOT_COLORS[3] },
  { id: '10', title: '马拉喀什集市色彩', summary: '德吉玛广场的香料摊位堆满金黄色的姜黄和深红的番红花，空气中弥漫着异域芬芳。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Marrakech%20souk%20market%20spices%20colorful%20Morocco&image_size=landscape_16_9', latitude: 31.6295, longitude: -7.9811, region: 'africa', date: '2026-04-20', dotColor: DOT_COLORS[4] },
  { id: '11', title: '大堡礁潜水奇遇', summary: '潜入世界最大的珊瑚礁群，万千热带鱼在绚丽的珊瑚间穿梭，海底世界的调色盘。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Great%20Barrier%20Reef%20underwater%20coral%20tropical%20fish%20diving&image_size=landscape_16_9', latitude: -18.2871, longitude: 147.6992, region: 'oceania', date: '2026-06-07', dotColor: DOT_COLORS[2] },
  { id: '12', title: '圣托里尼蓝白之梦', summary: '爱琴海上的蓝顶白墙教堂，夕阳将整座岛屿染成金色，地中海最动人的明信片。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Santorini%20blue%20dome%20church%20white%20buildings%20sunset%20Aegean%20sea&image_size=landscape_16_9', latitude: 36.3932, longitude: 25.4615, region: 'europe', date: '2026-06-12', dotColor: DOT_COLORS[1] },
  { id: '13', title: '清迈水灯节', summary: '千盏天灯缓缓升空，河面上飘满水灯，整个清迈沉浸在温柔的光芒与祈愿之中。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chiang%20Mai%20Loy%20Krathong%20sky%20lanterns%20night%20festival&image_size=landscape_16_9', latitude: 18.7883, longitude: 98.9853, region: 'asia', date: '2026-05-25', dotColor: DOT_COLORS[4] },
  { id: '14', title: '旧金山金门晨雾', summary: '金门大桥在浓雾中若隐若现，橙红色的桥身与灰白的雾气形成强烈的视觉冲击。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=San%20Francisco%20Golden%20Gate%20Bridge%20morning%20fog%20orange%20bridge&image_size=landscape_16_9', latitude: 37.7749, longitude: -122.4194, region: 'northAmerica', date: '2026-06-02', dotColor: DOT_COLORS[0] },
  { id: '15', title: '塞伦盖蒂大迁徙', summary: '数百万角马和斑马横跨东非大草原，尘土飞扬中生命的力量震撼人心。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Serengeti%20wildebeest%20migration%20African%20savanna%20sunset&image_size=landscape_16_9', latitude: -2.3333, longitude: 34.8333, region: 'africa', date: '2026-03-10', dotColor: DOT_COLORS[0] },
  { id: '16', title: '巴厘岛梯田日出', summary: '德格拉朗梯田在晨光中层叠如绿宝石阶梯，远处的棕榈树为这片田园诗画增添热带风情。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Bali%20Tegallalang%20rice%20terraces%20sunrise%20palm%20trees%20tropical&image_size=landscape_16_9', latitude: -8.4095, longitude: 115.1889, region: 'asia', date: '2026-06-06', dotColor: DOT_COLORS[2] },
  { id: '17', title: '布拉格查理大桥', summary: '暮色中的查理大桥上，30尊圣像的剪影与远处城堡构成波西米亚最经典的画面。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Prague%20Charles%20Bridge%20twilight%20statues%20castle%20silhouette&image_size=landscape_16_9', latitude: 50.0755, longitude: 14.4378, region: 'europe', date: '2026-05-30', dotColor: DOT_COLORS[3] },
  { id: '18', title: '温哥华翡翠森林', summary: '卡皮拉诺吊桥悬挂在古老雨林之上，脚下是碧绿的峡谷和苍翠的千年雪松。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Vancouver%20Capilano%20suspension%20bridge%20rainforest%20green%20canyon&image_size=landscape_16_9', latitude: 49.2827, longitude: -123.1207, region: 'northAmerica', date: '2026-04-15', dotColor: DOT_COLORS[2] },
  { id: '19', title: '布宜诺斯艾利斯探戈', summary: '博卡区的彩色铁皮房屋前，街头探戈舞者的脚步铿锵有力，南美的热情在空气中燃烧。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Buenos%20Aires%20La%20Boca%20colorful%20houses%20tango%20dancers%20street&image_size=landscape_16_9', latitude: -34.6037, longitude: -58.3816, region: 'southAmerica', date: '2026-05-18', dotColor: DOT_COLORS[0] },
  { id: '20', title: '新西兰米尔福德峡湾', summary: '瀑布从千米峭壁倾泻而下，峡湾水面如镜映出壮丽山峰，世界第八大奇观名不虚传。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=New%20Zealand%20Milford%20Sound%20fiord%20waterfall%20mountains%20mirror&image_size=landscape_16_9', latitude: -44.6718, longitude: 167.9265, region: 'oceania', date: '2026-06-04', dotColor: DOT_COLORS[1] },
]

function filterByDate(story: Story, dateRange: 'week' | 'month' | 'all'): boolean {
  if (dateRange === 'all') return true
  const storyDate = new Date(story.date)
  const now = new Date('2026-06-13')
  const diffDays = (now.getTime() - storyDate.getTime()) / (1000 * 60 * 60 * 24)
  if (dateRange === 'week') return diffDays <= 7
  if (dateRange === 'month') return diffDays <= 30
  return true
}

export default function App() {
  const [filter, setFilter] = useState<FilterState>({ region: 'all', dateRange: 'all' })
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedCount, setLoadedCount] = useState(0)

  const filteredStories = useMemo(() => {
    return MOCK_STORIES.filter(s => {
      const regionMatch = filter.region === 'all' || s.region === filter.region
      const dateMatch = filterByDate(s, filter.dateRange)
      return regionMatch && dateMatch
    })
  }, [filter])

  const selectedStory = useMemo(() => {
    if (!selectedStoryId) return null
    return MOCK_STORIES.find(s => s.id === selectedStoryId) ?? null
  }, [selectedStoryId])

  const handleFilterChange = useCallback((newFilter: Partial<FilterState>) => {
    setFilter(prev => ({ ...prev, ...newFilter }))
  }, [])

  const handleStorySelect = useCallback((id: string) => {
    setSelectedStoryId(id)
  }, [])

  const handleCloseStory = useCallback(() => {
    setSelectedStoryId(null)
  }, [])

  const handleLoadProgress = useCallback((count: number, total: number) => {
    setLoadedCount(count)
    if (count >= total) setLoading(false)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <GlobeScene
        stories={filteredStories}
        onStorySelect={handleStorySelect}
        selectedStoryId={selectedStoryId}
        onLoadProgress={handleLoadProgress}
      />
      <ControlPanel filter={filter} onFilterChange={handleFilterChange} />
      {selectedStory && (
        <StoryCard story={selectedStory} onClose={handleCloseStory} />
      )}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: 'linear-gradient(transparent, rgba(11,17,32,0.8))',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 10,
      }}>
        <span style={{
          fontSize: '13px',
          color: '#94a3b8',
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
        }}>
          {filteredStories.length} STORIES
        </span>
        <div style={{
          flex: 1,
          height: '8px',
          background: 'rgba(30,41,59,0.6)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: loading ? `${(loadedCount / MOCK_STORIES.length) * 100}%` : '100%',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            borderRadius: '4px',
            transition: 'width 0.5s ease-out',
          }} />
        </div>
      </div>
    </div>
  )
}
