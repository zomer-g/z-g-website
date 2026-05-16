"use client";

import { Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Globe, Tags, Share2 } from "lucide-react";
import { AiWriterButton } from "@/components/admin/ai-writer-button";
import type { SiteSeoContent } from "@/types/content";

interface SiteSeoEditorProps {
  content: SiteSeoContent;
  onChange: (content: SiteSeoContent) => void;
}

export function SiteSeoEditor({ content, onChange }: SiteSeoEditorProps) {
  return (
    <div className="space-y-3">
      <SectionCard title="כותרת ותיאור גלובליים" icon={Globe} defaultOpen>
        <div className="space-y-3">
          <p className="text-xs text-muted">
            המטא-נתונים שמופיעים בכל עמודי האתר כברירת מחדל (אלא אם עמוד ספציפי מגדיר משלו).
          </p>
          <Input
            label="כותרת ברירת מחדל (default title)"
            value={content.defaultTitle}
            onChange={(e) => onChange({ ...content, defaultTitle: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תבנית כותרת (title template, %s = כותרת העמוד)"
            value={content.titleTemplate}
            onChange={(e) => onChange({ ...content, titleTemplate: e.target.value })}
            dir="rtl"
          />
          <div className="relative">
            <Textarea
              label="תיאור (description)"
              value={content.description}
              onChange={(e) => onChange({ ...content, description: e.target.value })}
              rows={3}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.description}
                onResult={(text) => onChange({ ...content, description: text })}
                fieldLabel="תיאור SEO גלובלי"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="רשתות חברתיות (Open Graph & Twitter)" icon={Share2}>
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              label="תיאור Open Graph (Facebook/LinkedIn/WhatsApp)"
              value={content.ogDescription}
              onChange={(e) => onChange({ ...content, ogDescription: e.target.value })}
              rows={3}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.ogDescription}
                onResult={(text) => onChange({ ...content, ogDescription: text })}
                fieldLabel="תיאור Open Graph"
              />
            </div>
          </div>
          <div className="relative">
            <Textarea
              label="תיאור Twitter"
              value={content.twitterDescription}
              onChange={(e) => onChange({ ...content, twitterDescription: e.target.value })}
              rows={3}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.twitterDescription}
                onResult={(text) => onChange({ ...content, twitterDescription: text })}
                fieldLabel="תיאור Twitter"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="מילות מפתח (keywords)" icon={Tags}>
        <div className="space-y-3">
          <p className="text-xs text-muted">כל מילה/ביטוי בשורה נפרדת.</p>
          <Textarea
            label="מילות מפתח"
            value={content.keywords.join("\n")}
            onChange={(e) =>
              onChange({
                ...content,
                keywords: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={12}
            dir="rtl"
          />
        </div>
      </SectionCard>
    </div>
  );
}
