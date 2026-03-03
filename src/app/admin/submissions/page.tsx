"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  Mail,
  MailOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  AlertTriangle,
} from "lucide-react";

/* ─── Types ─── */

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

type FilterType = "all" | "unread" | "read";

/* ─── Component ─── */

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ── Fetch Submissions ── */

  const fetchSubmissions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter === "unread") params.set("isRead", "false");
      if (filter === "read") params.set("isRead", "true");

      const res = await fetch(`/api/submissions?${params.toString()}`);
      const data = await res.json();

      setSubmissions(data.submissions ?? []);
      setTotalCount(data.pagination?.total ?? 0);

      // Also fetch unread count separately for the badge
      if (filter !== "unread") {
        const unreadRes = await fetch("/api/submissions?isRead=false&limit=1");
        const unreadData = await unreadRes.json();
        setUnreadCount(unreadData.pagination?.total ?? 0);
      } else {
        setUnreadCount(data.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchSubmissions();
  }, [fetchSubmissions]);

  /* ── Toggle Read Status ── */

  const toggleRead = async (id: string, currentIsRead: boolean) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !currentIsRead }),
      });

      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, isRead: !currentIsRead } : s,
          ),
        );
        setUnreadCount((prev) => (currentIsRead ? prev + 1 : prev - 1));
      }
    } catch (error) {
      console.error("Failed to toggle read status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Delete Submission ── */

  const deleteSubmission = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const deleted = submissions.find((s) => s.id === id);
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        setTotalCount((prev) => prev - 1);
        if (deleted && !deleted.isRead) {
          setUnreadCount((prev) => prev - 1);
        }
        if (expandedId === id) setExpandedId(null);
        setDeleteConfirmId(null);
      }
    } catch (error) {
      console.error("Failed to delete submission:", error);
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Toggle Expand ── */

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setDeleteConfirmId(null);
  };

  /* ── Loading State ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-primary-dark">פניות</h1>
          {unreadCount > 0 && (
            <Badge variant="error">
              {unreadCount} לא נקראו
            </Badge>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1">
          <FilterButton
            label="הכל"
            active={filter === "all"}
            onClick={() => setFilter("all")}
            count={totalCount}
          />
          <FilterButton
            label="לא נקראו"
            active={filter === "unread"}
            onClick={() => setFilter("unread")}
            count={unreadCount}
          />
          <FilterButton
            label="נקראו"
            active={filter === "read"}
            onClick={() => setFilter("read")}
          />
        </div>
      </div>

      {/* ── Submissions List ── */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Inbox size={40} className="text-muted" />
            <p className="text-sm text-muted">
              {filter === "unread"
                ? "אין פניות שלא נקראו"
                : filter === "read"
                  ? "אין פניות שנקראו"
                  : "אין פניות עדיין"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {submissions.map((submission) => {
            const isExpanded = expandedId === submission.id;
            const isDeleting = deleteConfirmId === submission.id;
            const isActionLoading = actionLoading === submission.id;

            return (
              <Card
                key={submission.id}
                className={cn(
                  "transition-colors duration-150",
                  !submission.isRead && "border-primary/20 bg-primary/[0.02]",
                )}
              >
                {/* ── Row Header ── */}
                <button
                  type="button"
                  onClick={() => toggleExpand(submission.id)}
                  className="flex w-full items-center gap-4 p-4 text-right"
                >
                  {/* Read indicator */}
                  <div className="shrink-0">
                    {submission.isRead ? (
                      <MailOpen size={18} className="text-muted" />
                    ) : (
                      <Mail size={18} className="text-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          !submission.isRead ? "font-bold text-foreground" : "font-medium text-foreground",
                        )}
                      >
                        {submission.name}
                      </span>
                      {!submission.isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted">
                      {submission.subject || submission.email}
                    </p>
                  </div>

                  {/* Date */}
                  <span className="shrink-0 text-xs text-muted">
                    {formatDate(submission.createdAt)}
                  </span>

                  {/* Expand icon */}
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-muted" />
                    ) : (
                      <ChevronDown size={16} className="text-muted" />
                    )}
                  </div>
                </button>

                {/* ── Expanded Content ── */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-4">
                    {/* Details Grid */}
                    <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted">שם: </span>
                        <span className="font-medium">{submission.name}</span>
                      </div>
                      <div>
                        <span className="text-muted">אימייל: </span>
                        <a
                          href={`mailto:${submission.email}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {submission.email}
                        </a>
                      </div>
                      {submission.phone && (
                        <div>
                          <span className="text-muted">טלפון: </span>
                          <a
                            href={`tel:${submission.phone}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {submission.phone}
                          </a>
                        </div>
                      )}
                      {submission.subject && (
                        <div>
                          <span className="text-muted">נושא: </span>
                          <span className="font-medium">{submission.subject}</span>
                        </div>
                      )}
                    </div>

                    {/* Message */}
                    <div className="mb-4 rounded-lg bg-muted-bg p-4">
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {submission.message}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Toggle Read */}
                      <button
                        type="button"
                        onClick={() => toggleRead(submission.id, submission.isRead)}
                        disabled={isActionLoading}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                          "border border-border bg-white transition-colors duration-150",
                          "hover:bg-muted-bg disabled:opacity-50",
                        )}
                      >
                        {isActionLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : submission.isRead ? (
                          <Mail size={14} />
                        ) : (
                          <MailOpen size={14} />
                        )}
                        <span>
                          {submission.isRead ? "סמן כלא נקרא" : "סמן כנקרא"}
                        </span>
                      </button>

                      {/* Delete */}
                      {isDeleting ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-sm text-error">
                            <AlertTriangle size={14} />
                            למחוק פנייה זו?
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteSubmission(submission.id)}
                            disabled={isActionLoading}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium",
                              "bg-error text-white transition-colors duration-150",
                              "hover:bg-error/90 disabled:opacity-50",
                            )}
                          >
                            {isActionLoading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              "אישור מחיקה"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className={cn(
                              "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium",
                              "border border-border bg-white transition-colors duration-150",
                              "hover:bg-muted-bg",
                            )}
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(submission.id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                            "border border-border bg-white text-error transition-colors duration-150",
                            "hover:bg-error/5",
                          )}
                        >
                          <Trash2 size={14} />
                          <span>מחיקה</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Filter Button ─── */

function FilterButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-primary text-white"
          : "text-muted hover:bg-muted-bg hover:text-foreground",
      )}
    >
      <Filter size={14} className={active ? "text-white" : "text-muted"} />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs",
            active ? "bg-white/20 text-white" : "bg-muted-bg text-muted",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
