export interface Photo {
  id: string;
  imageUrl: string;
  title: string;
  smellDescription: string;
  smellTags: string[];
  createdAt: string;
}

export interface UpdateSmellRequest {
  smellDescription: string;
  smellTags: string[];
}
