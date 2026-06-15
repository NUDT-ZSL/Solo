export type Tag = "技术" | "设计" | "生活" | "其他"

export interface Inspiration {
  id: string
  title: string
  content: string
  tag: Tag
  priority: 1 | 2 | 3 | 4 | 5
  createdAt: string
}

export interface CreateInspirationPayload {
  title: string
  content: string
  tag: Tag
  priority: 1 | 2 | 3 | 4 | 5
}

export const TAG_COLORS: Record<Tag, string> = {
  "技术": "#4a9eff",
  "设计": "#a855f7",
  "生活": "#34d399",
  "其他": "#fb923c"
}

export const TAGS: Tag[] = ["技术", "设计", "生活", "其他"]
