import { UploadSchema } from "@/lib/zod";
import z from "zod";

// ============================================
// DATABASE MODELS
// ============================================

export interface BookCardProps {
  title: string;
  author: string;
  coverURL: string;
  slug: string;
}

export interface IBook extends Document {
  _id: string;
  clerkId: string;
  title: string;
  slug: string;
  author: string;
  persona?: string;
  fileURL: string;
  fileBlobKey: string;
  coverURL: string;
  coverBlobKey?: string;
  fileSize: number;
  totalSegments: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookSegment extends Document {
  clerkId: string;
  bookId: Types.ObjectId;
  content: string;
  segmentIndex: number;
  pageNumber?: number;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVoiceSession extends Document {
  _id: string;
  clerkId: string;
  bookId: Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  billingPeriodStart: Date;
  createdAt: Date;
  updatedAt: Date;
}
// ============================================
// FORM & INPUT TYPES
// ============================================

export type BookUploadFormValues = z.infer<typeof UploadSchema>;

export interface CreateBook {
  clerkId: string;
  title: string;
  author: string;
  persona?: string;
  fileURL: string;
  fileBlobKey: string;
  coverURL?: string;
  coverBlobKey?: string;
  fileSize: number;
}

export interface TextSegment {
  text: string;
  segmentIndex: number;
  pageNumber?: number;
  wordCount: number;
}
