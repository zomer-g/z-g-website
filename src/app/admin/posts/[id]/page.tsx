"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Editor } from "@/components/admin/editor";
import { slugify } from "@/lib/utils";
import { Loader2, Trash2 } from "lucide-react";

/* ─── Types ─── */

interface Post {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown>;
  excerpt: string | null;
  coverImage: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  category: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDesc: string | null;
}

/* ─── Page Component ─── */

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">(
    "DRAFT",
  );
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [initialContent, setInitialContent] = useState<Record<
    string,
    unknown
  > | null>(null);

  /* ── Fetch Post ── */

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${id}`);
        if (!res.ok) throw new Error("שגיאה בטעינת המאמר");

        const post: Post = await res.json();

        setTitle(post.title);
        setSlug(post.slug);
        setCategory(post.category ?? "");
        setTags(post.tags.join(", "));
        setCoverImage(post.coverImage ?? "");
        setExcerpt(post.excerpt ?? "");
        setSeoTitle(post.seoTitle ?? "");
        setSeoDesc(post.seoDesc ?? "");
        setStatus(post.status);
        setContent(post.content);
        setInitialContent(post.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [id]);

  /* ── Auto-generate slug from title ── */

  function handleTitleChange(value: string) {
    setTitle(value);
    setSlug(slugify(value));
  }

  /* ── Update Post ── */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const body = {
        title,
        slug,
        content: content ?? { type: "doc", content: [] },
        category: category || undefined,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        coverImage: coverImage || undefined,
        excerpt: excerpt || undefined,
        seoTitle: seoTitle || undefined,
        seoDesc: seoDesc || undefined,
        status,
      };

      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ?? "שגיאה בעדכון המאמר. נסו שוב.",
        );
      }

      router.push("/admin/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete Post ── */

  async function handleDelete() {
    const confirmed = window.confirm(
      `למחוק את המאמר "${title}"? פעולה זו אינה הפיכה.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאה במחיקת המאמר");
      router.push("/admin/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקה");
      setDeleting(false);
    }
  }

  /* ── Loading State ── */

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Render ── */

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">עריכת מאמר</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          loading={deleting}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 size={16} />
          {deleting ? "מוחק..." : "מחיקה"}
        </Button>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <Input
          label="כותרת"
          required
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="כותרת המאמר"
        />

        {/* Slug */}
        <Input
          label="Slug (כתובת URL)"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="post-url-slug"
          dir="ltr"
          className="text-left"
        />

        {/* Category & Tags */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            label="קטגוריה"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="למשל: משפט מסחרי"
          />
          <Input
            label="תגיות (מופרדות בפסיקים)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="חוזים, ליטיגציה, נדל״ן"
          />
        </div>

        {/* Cover Image */}
        <Input
          label="תמונת שער (URL)"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://example.com/image.jpg"
          dir="ltr"
          className="text-left"
        />

        {/* Excerpt */}
        <Textarea
          label="תקציר"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="תיאור קצר של המאמר..."
          rows={3}
        />

        {/* Content Editor */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            תוכן המאמר
          </label>
          {initialContent && (
            <Editor
              initialContent={initialContent}
              onChange={(json) => setContent(json)}
            />
          )}
        </div>

        {/* SEO Section */}
        <div className="space-y-4 rounded-lg border border-border bg-gray-50/50 p-4">
          <h2 className="text-sm font-semibold text-foreground">
            הגדרות SEO
          </h2>
          <Input
            label="כותרת SEO"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="כותרת לתוצאות חיפוש (אופציונלי)"
          />
          <Textarea
            label="תיאור SEO"
            value={seoDesc}
            onChange={(e) => setSeoDesc(e.target.value)}
            placeholder="תיאור מטא לתוצאות חיפוש (אופציונלי)"
            rows={2}
          />
        </div>

        {/* Status & Submit */}
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="status-select"
              className="text-sm font-semibold text-foreground"
            >
              סטטוס
            </label>
            <select
              id="status-select"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED",
                )
              }
              className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground transition-colors hover:border-primary/40 focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <option value="DRAFT">טיוטה</option>
              <option value="PUBLISHED">פורסם</option>
              <option value="ARCHIVED">בארכיון</option>
            </select>
          </div>

          <Button type="submit" loading={saving}>
            {saving ? "שומר..." : "שמירת שינויים"}
          </Button>
        </div>
      </form>
    </div>
  );
}
