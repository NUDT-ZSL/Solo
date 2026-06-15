import type { Bookmark, Tag, ChromeBookmarksRoot, ChromeBookmarkNode } from '../types';

export const TAG_COLOR_SCHEMES = [
  { color: '#ff6b6b', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)' },
  { color: '#4ecdc4', gradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)' },
  { color: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { color: '#f093fb', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { color: '#4facfe', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { color: '#43e97b', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
];

export function getRandomColorScheme() {
  const index = Math.floor(Math.random() * TAG_COLOR_SCHEMES.length);
  return TAG_COLOR_SCHEMES[index];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return '';
  }
}

function flattenBookmarks(node: ChromeBookmarkNode, defaultTag: string = '未分类'): Bookmark[] {
  const bookmarks: Bookmark[] = [];

  if (node.url && node.name) {
    bookmarks.push({
      id: generateId(),
      title: node.name,
      url: node.url,
      icon: getFaviconUrl(node.url),
      tags: [defaultTag],
      group: defaultTag,
      dateAdded: node.date_added ? parseInt(node.date_added, 10) : undefined,
    });
  }

  if (node.children && node.children.length > 0) {
    const folderName = node.name || defaultTag;
    for (const child of node.children) {
      if (child.url && child.name) {
        bookmarks.push({
          id: generateId(),
          title: child.name,
          url: child.url,
          icon: getFaviconUrl(child.url),
          tags: [folderName],
          group: folderName,
          dateAdded: child.date_added ? parseInt(child.date_added, 10) : undefined,
        });
      }
      if (child.children && child.children.length > 0) {
        bookmarks.push(...flattenBookmarks(child, folderName));
      }
    }
  }

  return bookmarks;
}

export function parseChromeBookmarks(jsonString: string): Bookmark[] {
  try {
    const data = JSON.parse(jsonString) as ChromeBookmarksRoot;
    const bookmarks: Bookmark[] = [];

    if (data.roots) {
      if (data.roots.bookmark_bar) {
        bookmarks.push(...flattenBookmarks(data.roots.bookmark_bar, '书签栏'));
      }
      if (data.roots.other) {
        bookmarks.push(...flattenBookmarks(data.roots.other, '其他书签'));
      }
      if (data.roots.synced) {
        bookmarks.push(...flattenBookmarks(data.roots.synced, '同步书签'));
      }
    }

    return bookmarks;
  } catch (error) {
    console.error('解析Chrome书签失败:', error);
    return [];
  }
}

export function parseManualBookmark(title: string, url: string, tags: string[] = []): Bookmark | null {
  if (!title || !url) return null;

  try {
    new URL(url);
  } catch {
    return null;
  }

  const tagList = tags.length > 0 ? tags : ['未分类'];

  return {
    id: generateId(),
    title,
    url,
    icon: getFaviconUrl(url),
    tags: tagList,
    group: tagList[0],
  };
}

export const MAX_FILE_SIZE = 1 * 1024 * 1024;

export async function parseBookmarkFile(file: File): Promise<Bookmark[]> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('文件大小超过1MB限制'));
      return;
    }

    if (!file.name.endsWith('.json')) {
      reject(new Error('只支持JSON格式文件'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      const bookmarks = parseChromeBookmarks(content);
      resolve(bookmarks);
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsText(file);
  });
}

export function extractUniqueTags(bookmarks: Bookmark[]): Tag[] {
  const tagMap = new Map<string, Tag>();

  for (const bookmark of bookmarks) {
    for (const tagName of bookmark.tags) {
      if (!tagMap.has(tagName)) {
        const colorScheme = getRandomColorScheme();
        tagMap.set(tagName, {
          id: generateId(),
          name: tagName,
          color: colorScheme.color,
          gradient: colorScheme.gradient,
        });
      }
    }
  }

  return Array.from(tagMap.values());
}
