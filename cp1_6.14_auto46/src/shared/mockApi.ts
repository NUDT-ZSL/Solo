import { v4 as uuidv4 } from 'uuid'

export interface Artwork {
  id: string
  title: string
  description: string
  thumbnail: string
  image: string
  price: number
  style: string
  tags: string[]
  artist: string
  createdAt: string
}

export interface User {
  id: string
  email: string
  nickname: string
  avatar: string
}

export interface CartItem {
  artwork: Artwork
  quantity: number
}

export interface Order {
  id: string
  items: CartItem[]
  total: number
  customer: {
    name: string
    phone: string
    address: string
  }
  createdAt: string
}

const styleMap = [
  '数字水墨',
  '扁平矢量',
  '写实水彩',
  '赛博像素',
]

const titleMap = [
  '梦境花园',
  '城市之光',
  '山海之间',
  '未来都市',
  '水墨山水',
  '像素英雄',
  '森林奇遇',
  '星空漫步',
  '古韵新声',
  '机械心脏',
  '繁花似锦',
  '赛博朋克',
]

const descriptionMap = [
  '这幅作品融合了传统水墨技法与数字艺术的独特魅力，展现出东方美学的现代诠释。',
  '以扁平化的视觉语言描绘都市生活，色彩明快而富有节奏感。',
  '写实水彩风格捕捉了自然的灵动之美，每一笔都充满生命力。',
  '赛博朋克风格的像素艺术，带你进入一个霓虹闪烁的未来世界。',
]

const tagMap = [
  '风景',
  '人物',
  '抽象',
  '梦幻',
  '科技',
  '自然',
  '城市',
  '复古',
]

const generateArtworks = (): Artwork[] => {
  const artworks: Artwork[] = []
  for (let i = 0; i < 12; i++) {
    const style = styleMap[i % styleMap.length]
    const seed = i + 1
    artworks.push({
      id: uuidv4(),
      title: titleMap[i % titleMap.length],
      description: descriptionMap[i % descriptionMap.length],
      thumbnail: `https://picsum.photos/seed/art${seed}/400/300`,
      image: `https://picsum.photos/seed/art${seed}-hd/1200/900`,
      price: Math.floor(Math.random() * 350) + 30,
      style,
      tags: [
        tagMap[i % tagMap.length],
        tagMap[(i + 2) % tagMap.length],
        tagMap[(i + 4) % tagMap.length],
      ],
      artist: '独立插画师',
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    })
  }
  return artworks
}

const mockArtworks = generateArtworks()

let mockFavorites: string[] = []
let mockCart: CartItem[] = []
let mockUser: User | null = null

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockGetWorks = async (): Promise<Artwork[]> => {
  await delay(300)
  return [...mockArtworks]
}

export const mockGetWorkById = async (id: string): Promise<Artwork | null> => {
  await delay(200)
  const artwork = mockArtworks.find((a) => a.id === id)
  return artwork || null
}

export const mockAddToCart = async (artworkId: string): Promise<CartItem[]> => {
  await delay(150)
  const artwork = mockArtworks.find((a) => a.id === artworkId)
  if (!artwork) {
    return mockCart
  }
  const existingItem = mockCart.find((item) => item.artwork.id === artworkId)
  if (existingItem) {
    existingItem.quantity += 1
  } else {
    mockCart.push({ artwork, quantity: 1 })
  }
  return [...mockCart]
}

export const mockRemoveFromCart = async (artworkId: string): Promise<CartItem[]> => {
  await delay(100)
  mockCart = mockCart.filter((item) => item.artwork.id !== artworkId)
  return [...mockCart]
}

export const mockUpdateCartQuantity = async (
  artworkId: string,
  quantity: number
): Promise<CartItem[]> => {
  await delay(100)
  const item = mockCart.find((item) => item.artwork.id === artworkId)
  if (item) {
    item.quantity = Math.max(0, quantity)
    if (item.quantity === 0) {
      mockCart = mockCart.filter((i) => i.artwork.id !== artworkId)
    }
  }
  return [...mockCart]
}

export const mockGetCart = async (): Promise<CartItem[]> => {
  await delay(100)
  return [...mockCart]
}

export const mockLogin = async (
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> => {
  await delay(500)
  if (email && password.length >= 6) {
    mockUser = {
      id: uuidv4(),
      email,
      nickname: email.split('@')[0],
      avatar: `https://picsum.photos/seed/${email}/100/100`,
    }
    return { user: mockUser, token: 'mock-token-' + uuidv4() }
  }
  return null
}

export const mockRegister = async (
  email: string,
  password: string,
  nickname: string
): Promise<{ user: User; token: string } | null> => {
  await delay(600)
  if (email && password.length >= 6 && nickname) {
    mockUser = {
      id: uuidv4(),
      email,
      nickname,
      avatar: `https://picsum.photos/seed/${email}/100/100`,
    }
    return { user: mockUser, token: 'mock-token-' + uuidv4() }
  }
  return null
}

export const mockLogout = async (): Promise<boolean> => {
  await delay(100)
  mockUser = null
  return true
}

export const mockGetCurrentUser = async (): Promise<User | null> => {
  await delay(100)
  return mockUser
}

export const mockGetFavorites = async (): Promise<string[]> => {
  await delay(150)
  return [...mockFavorites]
}

export const mockToggleFavorite = async (artworkId: string): Promise<string[]> => {
  await delay(100)
  const index = mockFavorites.indexOf(artworkId)
  if (index > -1) {
    mockFavorites.splice(index, 1)
  } else {
    mockFavorites.push(artworkId)
  }
  return [...mockFavorites]
}

export const mockPlaceOrder = async (
  customer: { name: string; phone: string; address: string }
): Promise<Order | null> => {
  await delay(800)
  if (mockCart.length === 0) return null
  const total = mockCart.reduce(
    (sum, item) => sum + item.artwork.price * item.quantity,
    0
  )
  const order: Order = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase(),
    items: [...mockCart],
    total,
    customer,
    createdAt: new Date().toISOString(),
  }
  mockCart = []
  return order
}

export const getStyleOptions = (): string[] => [...styleMap]
