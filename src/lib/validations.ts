import { z } from "zod";

/** Optional free-text field: "" from a form becomes null, not an empty column. */
const emptyToNull = z
  .string()
  .trim()
  .transform((v) => (v.length > 0 ? v : null))
  .nullable()
  .optional();

export const submissionSchema = z.object({
  name: z
    .string()
    .min(2, "שם חייב להכיל לפחות 2 תווים")
    .max(100, "שם ארוך מדי"),
  email: z.string().email("כתובת אימייל לא תקינה").max(254, "כתובת אימייל ארוכה מדי"),
  phone: z.string().max(40, "מספר טלפון ארוך מדי").optional(),
  subject: z.string().max(200, "נושא ארוך מדי").optional(),
  message: z
    .string()
    .min(10, "הודעה חייבת להכיל לפחות 10 תווים")
    .max(5000, "הודעה ארוכה מדי"),
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

export const plilistPostSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  slug: z.string().min(1, "slug נדרש"),
  content: z.any(),
  excerpt: z.string().optional(),
  coverImage: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
  // PDF attachments: [{ name, url }]
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
      }),
    )
    .optional()
    .default([]),
  // Renders the case file (coverage + documents) under the post body.
  caseTag: emptyToNull,
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
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export const mediaAppearanceSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  description: z.string().min(1, "תיאור נדרש"),
  // "academic" was already stored by the seed but never accepted here, so the
  // admin form could load an academic item and fail to save it back.
  type: z.enum(["video", "article", "podcast", "academic"]),
  source: z.string().min(1, "מקור נדרש"),
  date: z.string().min(1, "תאריך נדרש"),
  url: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
  // Empty string from the form means "no case" — normalise it to null so the
  // column stays clean and `caseTag: ""` never matches a case query.
  caseTag: z
    .string()
    .trim()
    .transform((v) => (v.length > 0 ? v : null))
    .nullable()
    .optional(),
});

export const caseDocumentSchema = z.object({
  caseTag: z.string().min(1, "מזהה תיק נדרש"),
  category: z.enum(["letter", "ruling"]),
  title: z.string().min(1, "כותרת נדרשת"),
  description: emptyToNull,
  docDate: emptyToNull,
  citation: emptyToNull,
  authority: emptyToNull,
  fileUrl: emptyToNull,
  sourceUrl: emptyToNull,
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type PlilistPostInput = z.infer<typeof plilistPostSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type PageInput = z.infer<typeof pageSchema>;
export type MediaAppearanceInput = z.infer<typeof mediaAppearanceSchema>;
export type CaseDocumentInput = z.infer<typeof caseDocumentSchema>;
