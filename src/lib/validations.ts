import { z } from "zod";

export const submissionSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, "הודעה חייבת להכיל לפחות 10 תווים"),
});

export const postSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  slug: z.string().min(1, "slug נדרש"),
  content: z.any(),
  excerpt: z.string().optional(),
  coverImage: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
});

export const serviceSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  slug: z.string().min(1, "slug נדרש"),
  description: z.string().min(1, "תיאור נדרש"),
  content: z.any(),
  icon: z.string().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
});

export const pageSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  content: z.any(),
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type PageInput = z.infer<typeof pageSchema>;
