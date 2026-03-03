"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle,
  Inbox,
  Eye,
  Plus,
  ExternalLink,
  Loader2,
} from "lucide-react";

/* ─── Types ─── */

interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  totalSubmissions: number;
  unreadSubmissions: number;
}

interface RecentPost {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  slug: string;
}

interface RecentSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  isRead: boolean;
  createdAt: string;
}

/* ─── Stat Card ─── */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
            color,
          )}
        >
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="text-2xl font-bold text-primary-dark">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Dashboard Page ─── */

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [postsRes, publishedRes, submissionsRes, unreadRes] =
          await Promise.all([
            fetch("/api/posts?limit=5"),
            fetch("/api/posts?status=PUBLISHED&limit=1"),
            fetch("/api/submissions?limit=5"),
            fetch("/api/submissions?isRead=false&limit=1"),
          ]);

        const postsData = await postsRes.json();
        const publishedData = await publishedRes.json();
        const submissionsData = await submissionsRes.json();
        const unreadData = await unreadRes.json();

        setStats({
          totalPosts: postsData.pagination?.total ?? 0,
          publishedPosts: publishedData.pagination?.total ?? 0,
          totalSubmissions: submissionsData.pagination?.total ?? 0,
          unreadSubmissions: unreadData.pagination?.total ?? 0,
        });

        setRecentPosts(postsData.posts ?? []);
        setRecentSubmissions(submissionsData.submissions ?? []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary-dark">לוח בקרה</h1>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/posts?action=new"
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white",
              "hover:bg-primary-light transition-colors duration-150",
            )}
          >
            <Plus size={16} />
            <span>מאמר חדש</span>
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground",
              "hover:bg-muted-bg transition-colors duration-150",
            )}
          >
            <ExternalLink size={16} />
            <span>צפייה באתר</span>
          </Link>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="סה״כ מאמרים"
          value={stats?.totalPosts ?? 0}
          icon={FileText}
          color="bg-primary"
        />
        <StatCard
          label="מאמרים מפורסמים"
          value={stats?.publishedPosts ?? 0}
          icon={CheckCircle}
          color="bg-success"
        />
        <StatCard
          label="סה״כ פניות"
          value={stats?.totalSubmissions ?? 0}
          icon={Inbox}
          color="bg-accent"
        />
        <StatCard
          label="פניות שלא נקראו"
          value={stats?.unreadSubmissions ?? 0}
          icon={Eye}
          color="bg-error"
        />
      </div>

      {/* ── Recent Content Grid ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">מאמרים אחרונים</CardTitle>
              <Link
                href="/admin/posts"
                className="text-sm font-medium text-primary hover:underline"
              >
                הצג הכל
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPosts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                אין מאמרים עדיין
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentPosts.map((post) => (
                  <li key={post.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={post.status === "PUBLISHED" ? "success" : "muted"}
                      className="mr-3 shrink-0"
                    >
                      {post.status === "PUBLISHED" ? "פורסם" : post.status === "DRAFT" ? "טיוטה" : "בארכיון"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">פניות אחרונות</CardTitle>
              <Link
                href="/admin/submissions"
                className="text-sm font-medium text-primary hover:underline"
              >
                הצג הכל
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentSubmissions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                אין פניות עדיין
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentSubmissions.map((sub) => (
                  <li key={sub.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {sub.name}
                        </p>
                        {!sub.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-error" title="לא נקרא" />
                        )}
                      </div>
                      <p className="truncate text-xs text-muted">
                        {sub.subject || sub.email}
                      </p>
                    </div>
                    <span className="mr-3 shrink-0 text-xs text-muted">
                      {formatDate(sub.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
