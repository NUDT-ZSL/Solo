import { useState, useCallback, useEffect } from 'react'
import Gallery from './Gallery'
import ArtDetail from './ArtDetail'
import {
  emotionStore,
  EmotionCount,
  EmotionMap,
  EmotionType,
} from './emotionStore'

export interface Artwork {
  id: string
  artNumber: string
  title: string
  author: string
  year: number
  description: string
  gradientFrom: string
  gradientTo: string
}

const GRADIENTS: Array<[string, string]> = [
  ['#FFE0B2', '#FFCC80'],
  ['#B3E5FC', '#81D4FA'],
  ['#D1C4E9', '#B39DDB'],
  ['#C8E6C9', '#A5D6A7'],
  ['#FFCDD2', '#EF9A9A'],
]

const TITLES = [
  '晨曦微光',
  '月下漫步',
  '海的呢喃',
  '远山如黛',
  '花开时节',
  '星空遐想',
  '雨巷深深',
  '秋日私语',
]

const AUTHORS = [
  '林默白',
  '苏清欢',
  '陈墨轩',
  '王逸之',
  '李慕言',
  '赵景行',
  '周思远',
  '吴砚秋',
]

const DESCRIPTIONS = [
  '这幅作品以细腻的笔触描绘了清晨第一缕阳光穿透薄雾的瞬间，光影交错间流露出对自然之美的无限眷恋。',
  '艺术家通过大胆的色彩对比，展现了夜幕降临时分，月光与地面相互辉映的诗意场景，引人沉入无尽遐思。',
  '作品捕捉了海浪轻拍礁石的温柔一刻，蓝绿色调的渐变运用让人仿佛能听到海的呼吸，感受到海风的轻抚。',
  '以写意的手法勾勒出层峦叠嶂的远山轮廓，墨色浓淡相宜，传达出东方美学中"远山含黛"的悠远意境。',
  '繁花似锦的画面中，每一朵花都拥有独特的姿态与色彩，象征着生命最绚烂的绽放时刻，令人驻足。',
  '深邃的夜空被无数星辰点亮，画家以近乎梦幻的方式呈现宇宙的浩瀚与神秘，唤起观者对未知的向往。',
  '湿漉漉的青石板路延伸向远方，丁香花的芬芳仿佛从画面中溢出，诉说着一段婉约而绵长的江南往事。',
  '金黄与赭红交织的画面，记录了落叶纷飞的秋日，温暖中带着一丝淡淡的离愁，是时光最温柔的注脚。',
]

const generateRandomSuffix = (): string => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const generateArtworks = (): Artwork[] => {
  return TITLES.map((title, i) => {
    const gradientIndex = i % GRADIENTS.length
    return {
      id: `art-${i + 1}`,
      artNumber: `#ART-2024-${generateRandomSuffix()}`,
      title,
      author: AUTHORS[i % AUTHORS.length],
      year: 1900 + Math.floor(Math.random() * 125),
      description: DESCRIPTIONS[i % DESCRIPTIONS.length],
      gradientFrom: GRADIENTS[gradientIndex][0],
      gradientTo: GRADIENTS[gradientIndex][1],
    }
  })
}

const buildEmotionState = (artworks: Artwork[]): EmotionMap => {
  const map: EmotionMap = new Map()
  artworks.forEach((art) => {
    map.set(art.id, emotionStore.getEmotion(art.id))
  })
  return map
}

export default function App() {
  const [artworks] = useState<Artwork[]>(() => generateArtworks())
  const [emotionData, setEmotionData] = useState<EmotionMap>(() =>
    buildEmotionState(generateArtworks()),
  )
  const [selectedArt, setSelectedArt] = useState<Artwork | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)

  useEffect(() => {
    setEmotionData(buildEmotionState(artworks))
  }, [artworks])

  const handleSelectArt = useCallback((art: Artwork) => {
    setSelectedArt(art)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedArt(null)
  }, [])

  const handleAddEmotion = useCallback(
    (artId: string, emotion: EmotionType): EmotionCount => {
      const updated = emotionStore.addEmotion(artId, emotion)
      setEmotionData((prev) => {
        const next = new Map(prev)
        next.set(artId, updated)
        return next
      })
      return updated
    },
    [],
  )

  const handleResetData = useCallback(() => {
    emotionStore.clearAll()
    setEmotionData(buildEmotionState(artworks))
    setShowResetDialog(false)
  }, [artworks])

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <Gallery
        artworks={artworks}
        emotionData={emotionData}
        onSelectArt={handleSelectArt}
        onOpenReset={() => setShowResetDialog(true)}
      />

      {selectedArt && (
        <ArtDetail
          artwork={selectedArt}
          emotionCount={emotionData.get(selectedArt.id)}
          onAddEmotion={handleAddEmotion}
          onClose={handleCloseDetail}
        />
      )}

      {showResetDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#00000080',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowResetDialog(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '4px 4px 12px #00000040',
              minWidth: '320px',
              color: '#333',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>
              确认重置所有数据？
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
              此操作将清除所有画作的情感反馈记录，且无法恢复。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  background: '#E0E0E0',
                  color: '#333',
                  fontSize: '14px',
                  transition: 'all 0.3s ease-in-out',
                }}
                onClick={() => setShowResetDialog(false)}
              >
                取消
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  background: '#FF6B6B',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  transition: 'all 0.3s ease-in-out',
                }}
                onClick={handleResetData}
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
