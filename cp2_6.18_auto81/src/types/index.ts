export type ItemStatus = 'published' | 'applied' | 'claimed';

export type Category = '家具' | '电器' | '书籍' | '衣物' | '其他';

export type ApplicationStatus = 'active' | 'expired' | 'claimed';

export interface Application {
  id: string;
  applicant: string;
  applyTime: string;
  status: ApplicationStatus;
}

export interface Item {
  id: string;
  title: string;
  category: Category;
  description: string;
  image: string;
  status: ItemStatus;
  publisher: string;
  publisherAvatar: string;
  publishTime: string;
  applications: Application[];
}
