export interface ArticleVersion {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

export interface PublishRecord {
  platformId: string;
  platformName: string;
  status: 'success' | 'failed' | 'publishing';
  timestamp: number;
  formattedContent: string;
  errorMessage?: string;
}

export interface Article {
  id: string;
  title: string;
  body: string;
  versions: ArticleVersion[];
  publishHistory: PublishRecord[];
  isDraft: boolean;
  createdAt: number;
  updatedAt: number;
  versionsCount?: number;
  publishHistoryCount?: number;
  latestPublishStatus?: 'success' | 'failed' | 'publishing' | null;
}

export interface PlatformConfig {
  id: string;
  name: string;
  includeOriginalLink: boolean;
  hashtagPrefix: string;
  thumbnailSize: string;
  template: string;
}
