export type TagType = '技术' | '设计' | '商业' | '生活' | '其他';

export interface Inspiration {
  id: string;
  title: string;
  description: string;
  tags: TagType[];
  votes: number;
  createdAt: number;
}

export const ALL_TAGS: TagType[] = ['技术', '设计', '商业', '生活', '其他'];

export const TAG_STYLES: Record<TagType, { background: string; color: string }> = {
  技术: { background: 'var(--tag-tech)', color: '#2b6cb0' },
  设计: { background: 'var(--tag-design)', color: '#6b46c1' },
  商业: { background: 'var(--tag-business)', color: '#8a6d1b' },
  生活: { background: 'var(--tag-life)', color: '#b83280' },
  其他: { background: 'var(--tag-other)', color: '#555' },
};
