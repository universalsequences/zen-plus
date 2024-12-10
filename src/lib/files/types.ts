import type { Timestamp } from "firebase/firestore";

export interface File {
  id: string;
  name: string;
  patch?: string;
  commit: string;
  screenshot?: string;
  commits?: string[];
  user: string;
  createdAt: Timestamp;
  favorited?: boolean;
  inputs?: string[];
  outputs?: string[];
  moduleType?: string;
  tags?: string[];
  isPublic?: boolean;
}
