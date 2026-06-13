export type Platform = 'weibo' | 'xiaohongshu' | 'zhihu';

export interface PlatformConfig {
  id: Platform;
  name: string;
  color: string;
  maxChars: number;
  supportsEmoji: boolean;
  supportsLatex: boolean;
  supportsMarkdown: boolean;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  weibo: {
    id: 'weibo',
    name: '微博',
    color: '#ff6600',
    maxChars: 140,
    supportsEmoji: true,
    supportsLatex: false,
    supportsMarkdown: false,
  },
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    color: '#ff2442',
    maxChars: 1000,
    supportsEmoji: true,
    supportsLatex: false,
    supportsMarkdown: false,
  },
  zhihu: {
    id: 'zhihu',
    name: '知乎',
    color: '#056de8',
    maxChars: Infinity,
    supportsEmoji: true,
    supportsLatex: true,
    supportsMarkdown: true,
  },
};

function stripMarkdown(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*{1,3}|_{1,3})(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function addEmojis(text: string): string {
  return text
    .replace(/重点/g, '🔴 重点')
    .replace(/注意/g, '⚠️ 注意')
    .replace(/推荐/g, '👍 推荐')
    .replace(/技巧/g, '💡 技巧')
    .replace(/总结/g, '📝 总结')
    .replace(/步骤/g, '📌 步骤');
}

function addHashtags(text: string): string {
  const lines = text.split('\n');
  const hashtags = ['#分享', '#干货', '#教程'];
  return lines.join('\n') + '\n\n' + hashtags.join(' ');
}

export function convertForWeibo(rawMarkdown: string): string {
  let text = stripMarkdown(rawMarkdown);
  text = addEmojis(text);
  if (text.length > 140) {
    text = text.substring(0, 137) + '...';
  }
  return text;
}

export function convertForXiaohongshu(rawMarkdown: string): string {
  let text = stripMarkdown(rawMarkdown);
  text = addEmojis(text);
  text = addHashtags(text);
  if (text.length > 1000) {
    text = text.substring(0, 997) + '...';
  }
  return text;
}

export function convertForZhihu(rawMarkdown: string): string {
  return rawMarkdown;
}

export function convertText(rawMarkdown: string, platform: Platform): string {
  switch (platform) {
    case 'weibo':
      return convertForWeibo(rawMarkdown);
    case 'xiaohongshu':
      return convertForXiaohongshu(rawMarkdown);
    case 'zhihu':
      return convertForZhihu(rawMarkdown);
    default:
      return rawMarkdown;
  }
}

export function getCharCount(text: string): number {
  return text.replace(/\s/g, '').length;
}
