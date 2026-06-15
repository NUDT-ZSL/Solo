export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  backgroundMusic?: string;
}

export interface Photo {
  id: string;
  projectId: string;
  filename: string;
  filepath: string;
  thumbnail?: string;
  location: string;
  city: string;
  timestamp: string;
  orderIndex: number;
  exifData?: Record<string, any>;
}

export interface Narrative {
  id: string;
  projectId: string;
  title: string;
  content: string;
  orderIndex: number;
  afterPhotoId?: string;
}

export interface TimelineNode {
  type: 'photo' | 'narrative';
  data: Photo | Narrative;
  orderIndex: number;
}

export interface LocationPoint {
  city: string;
  orderIndex: number;
  photoId: string;
  x: number;
  y: number;
}

export interface ProjectData {
  project: Project;
  photos: Photo[];
  narratives: Narrative[];
}
