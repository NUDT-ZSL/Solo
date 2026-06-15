export interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
  tags: string[];
  group: string;
  dateAdded?: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  gradient: string;
}

export interface DeleteHistoryItem {
  bookmark: Bookmark;
  index: number;
}

export type ChromeBookmarkNode = {
  id?: string;
  name?: string;
  url?: string;
  type?: string;
  children?: ChromeBookmarkNode[];
  date_added?: string;
  date_modified?: string;
};

export type ChromeBookmarksRoot = {
  roots: {
    bookmark_bar?: ChromeBookmarkNode;
    other?: ChromeBookmarkNode;
    synced?: ChromeBookmarkNode;
  };
  version?: number;
};
