"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

/* ─── Types ─── */

interface Post {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  category: string | null;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
}

interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/* ─── Status Badge Config ─── */

const STATUS_CONFIG: Record<
  Post["status"],
  { label: string; variant: "muted" | "success" | "error" }
> = {
  DRAFT: { label: "טיוטה", variant: "muted" },
  PUBLISHED: { label: "פורסם", variant: "success" },
  ARCHIVED: { label: "בארכיון", variant: "error" },
};

/* ─── Page Component ─── */

export default function AdminPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ── Fetch Posts ── */

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/posts?limit=100");
        if (!res.ok) throw new Error("שגיאה בטעינת המאמרים");
        const data: PostsResponse = await res.json();
        setPosts(data.posts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  /* ── Delete Post ── */

  async function handleDelete(id: string, title: string) {
    const confirmed = window.confirm(`למחוק את המאמר "${title}"?`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאה במחיקת המאמר");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה במחיקה");
    } finally {
      setDeletingId(null);
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

  /* ── Error State ── */

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  /* ── Render ── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">מאמרים</h1>
        <Button
          size="sm"
          onClick={() => router.push("/admin/posts/new")}
        >
          <Plus size={18} />
          מאמר חדש
        </Button>
      </div>

      {/* Empty State */}
      {posts.length === 0 ? (
        <div className="rounded-lg border border-border bg-background p-12 text-center">
          <p className="text-muted">לא נמצאו מאמרים</p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => router.push("/admin/posts/new")}
          >
            <Plus size={18} />
            צרו מאמר ראשון
          </Button>
        </div>
      ) : (
        /* Posts Table */
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">
                    כותרת
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">
                    סטטוס
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">
                    קטגוריה
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">
                    תאריך
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const statusCfg = STATUS_CONFIG[post.status];
                  return (
                    <tr
                      key={post.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {post.title}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusCfg.variant}>
                          {statusCfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {post.category || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {formatDate(post.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/admin/posts/${post.id}`)
                            }
                            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-primary"
                            aria-label={`עריכת ${post.title}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id, post.title)}
                            disabled={deletingId === post.id}
                            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                            aria-label={`מחיקת ${post.title}`}
                          >
                            {deletingId === post.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
