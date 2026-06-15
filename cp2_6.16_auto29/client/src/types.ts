export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  title: string;
  content: string;
  chapter_order: number;
  claimed_by: string | null;
}

export interface ChapterListItem {
  id: string;
  title: string;
  chapter_order: number;
  claimed_by: string | null;
}

export interface Annotation {
  id: string;
  chapter_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  selected_text: string;
  start_offset: number;
  end_offset: number;
  highlight_color: string;
  body: string;
  likes: number;
  created_at: string;
}

export interface Comment {
  id: string;
  annotation_id: string;
  parent_id: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string;
  body: string;
  created_at: string;
}

export interface ChapterDetail extends Chapter {
  annotations: Annotation[];
}
