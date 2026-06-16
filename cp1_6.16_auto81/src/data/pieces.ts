export interface Piece {
  id: string
  name: string
  tags: string[]
  category: string
}

export const pieces: Piece[] = [
  { id: 'p1', name: '哈农练指法 No.1', tags: ['练习曲', '初级'], category: '练习曲' },
  { id: 'p2', name: '哈农练指法 No.20', tags: ['练习曲', '初级'], category: '练习曲' },
  { id: 'p3', name: '拜厄钢琴基本教程 No.80', tags: ['练习曲', '初级'], category: '练习曲' },
  { id: 'p4', name: '车尔尼599 第45首', tags: ['练习曲', '初级'], category: '练习曲' },
  { id: 'p5', name: '车尔尼849 第12首', tags: ['练习曲', '中级'], category: '练习曲' },
  { id: 'p6', name: '车尔尼299 第6首', tags: ['练习曲', '高级'], category: '练习曲' },
  { id: 'p7', name: 'C大调音阶练习', tags: ['音阶', '初级'], category: '基础练习' },
  { id: 'p8', name: 'G大调音阶练习', tags: ['音阶', '初级'], category: '基础练习' },
  { id: 'p9', name: '巴赫小前奏曲 BWV 926', tags: ['巴洛克', '中级'], category: '复调作品' },
  { id: 'p10', name: '巴赫创意曲二部 No.1', tags: ['巴洛克', '中级'], category: '复调作品' },
  { id: 'p11', name: '巴赫创意曲二部 No.8', tags: ['巴洛克', '中级'], category: '复调作品' },
  { id: 'p12', name: '克莱门蒂小奏鸣曲 Op.36 No.1', tags: ['古典', '初级'], category: '奏鸣曲' },
  { id: 'p13', name: '莫扎特奏鸣曲 K545 第一乐章', tags: ['古典', '中级'], category: '奏鸣曲' },
  { id: 'p14', name: '贝多芬致爱丽丝', tags: ['古典', '中级'], category: '小品' },
  { id: 'p15', name: '贝多芬月光奏鸣曲 第一乐章', tags: ['古典', '高级'], category: '奏鸣曲' },
  { id: 'p16', name: '舒伯特小夜曲', tags: ['浪漫', '中级'], category: '小品' },
  { id: 'p17', name: '舒曼梦幻曲', tags: ['浪漫', '中级'], category: '小品' },
  { id: 'p18', name: '门德尔松春之歌', tags: ['浪漫', '高级'], category: '小品' },
  { id: 'p19', name: '肖邦夜曲 Op.9 No.2', tags: ['浪漫', '高级'], category: '夜曲' },
  { id: 'p20', name: '肖邦圆舞曲 Op.64 No.1', tags: ['浪漫', '高级'], category: '圆舞曲' },
  { id: 'p21', name: '柴可夫斯基四季-六月船歌', tags: ['浪漫', '高级'], category: '组曲' },
  { id: 'p22', name: '格里格培尔金特组曲-晨曲', tags: ['浪漫', '中级'], category: '组曲' },
  { id: 'p23', name: '德彪西月光', tags: ['印象派', '高级'], category: '小品' },
  { id: 'p24', name: '德彪西阿拉伯风格曲 No.1', tags: ['印象派', '中级'], category: '小品' },
]

export function getPiecesByCategory(): Record<string, Piece[]> {
  return pieces.reduce((acc, piece) => {
    if (!acc[piece.category]) {
      acc[piece.category] = []
    }
    acc[piece.category].push(piece)
    return acc
  }, {} as Record<string, Piece[]>)
}

export function searchPieces(keyword: string): Piece[] {
  const lower = keyword.toLowerCase()
  return pieces.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.tags.some((t) => t.toLowerCase().includes(lower))
  )
}
