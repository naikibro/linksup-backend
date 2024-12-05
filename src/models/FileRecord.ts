export interface FileRecord {
  id: string;
  fileName: string;
  url: string;
  uploadedAt: string;
  size: number;
  type: string;
  author: string;
  authorId: string;
  isPublished?: boolean;
}
