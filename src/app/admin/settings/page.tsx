"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Linkedin,
  Facebook,
} from "lucide-react";

/* ─── Types ─── */

interface SiteSettingsData {
  phone: string;
  email: string;
  address: string;
  linkedinUrl: string;
  facebookUrl: string;
}

const DEFAULT_SETTINGS: SiteSettingsData = {
  phone: "",
  email: "",
  address: "",
  linkedinUrl: "",
  facebookUrl: "",
};

const STORAGE_KEY = "zg-site-settings";

/* ─── Settings Page ─── */

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /* ── Load settings ── */

  useEffect(() => {
    async function loadSettings() {
      try {
        // Try to fetch from API first (SiteSettings model)
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data?.data) {
            setSettings({ ...DEFAULT_SETTINGS, ...data.data });
            setLoading(false);
            return;
          }
        }
      } catch {
        // API not available, fall through to localStorage
      }

      // Fallback: load from localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<SiteSettingsData>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {
        // ignore parse errors
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  /* ── Update field helper ── */

  const updateField = (field: keyof SiteSettingsData, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  /* ── Save settings ── */

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      // Try to save to API first
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settings }),
      });

      if (res.ok) {
        setFeedback({ type: "success", message: "ההגדרות נשמרו בהצלחה" });
      } else {
        throw new Error("API save failed");
      }
    } catch {
      // Fallback: save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setFeedback({ type: "success", message: "ההגדרות נשמרו בהצלחה (מקומית)" });
      } catch {
        setFeedback({ type: "error", message: "שגיאה בשמירת ההגדרות" });
      }
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  /* ── Loading ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary-dark">הגדרות אתר</h1>

        <Button onClick={handleSave} loading={saving} disabled={saving}>
          <Save size={16} />
          שמירה
        </Button>
      </div>

      {/* ── Feedback ── */}
      {feedback && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border p-4 text-sm",
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700",
          )}
          role="alert"
        >
          {feedback.type === "success" ? (
            <CheckCircle size={18} className="shrink-0" />
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      {/* ── Contact Information ── */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-lg font-semibold text-foreground">פרטי קשר</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="relative">
              <Input
                label="טלפון"
                value={settings.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="03-1234567"
                type="tel"
                dir="ltr"
              />
              <Phone
                size={16}
                className="absolute left-3 top-[38px] text-muted pointer-events-none"
              />
            </div>

            <div className="relative">
              <Input
                label="אימייל"
                value={settings.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="info@example.co.il"
                type="email"
                dir="ltr"
              />
              <Mail
                size={16}
                className="absolute left-3 top-[38px] text-muted pointer-events-none"
              />
            </div>
          </div>

          <div className="relative">
            <Input
              label="כתובת"
              value={settings.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="רחוב הרצל 1, תל אביב"
              dir="rtl"
            />
            <MapPin
              size={16}
              className="absolute left-3 top-[38px] text-muted pointer-events-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Social Media ── */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-lg font-semibold text-foreground">רשתות חברתיות</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="relative">
              <Input
                label="LinkedIn"
                value={settings.linkedinUrl}
                onChange={(e) => updateField("linkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/company/..."
                type="url"
                dir="ltr"
              />
              <Linkedin
                size={16}
                className="absolute left-3 top-[38px] text-muted pointer-events-none"
              />
            </div>

            <div className="relative">
              <Input
                label="Facebook"
                value={settings.facebookUrl}
                onChange={(e) => updateField("facebookUrl", e.target.value)}
                placeholder="https://facebook.com/..."
                type="url"
                dir="ltr"
              />
              <Facebook
                size={16}
                className="absolute left-3 top-[38px] text-muted pointer-events-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Bottom Save Button ── */}
      <div className="flex justify-start">
        <Button onClick={handleSave} loading={saving} disabled={saving}>
          <Save size={16} />
          שמירה
        </Button>
      </div>
    </div>
  );
}
