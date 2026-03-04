"use client";

import { Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Sparkles, Phone, MessageSquare } from "lucide-react";
import { AiWriterButton } from "@/components/admin/ai-writer-button";
import type { ContactPageContent } from "@/types/content";

interface ContactEditorsProps {
  content: ContactPageContent;
  onChange: (content: ContactPageContent) => void;
}

export function ContactEditors({ content, onChange }: ContactEditorsProps) {
  const update = <K extends keyof ContactPageContent>(
    section: K,
    data: Partial<ContactPageContent[K]>
  ) => {
    onChange({
      ...content,
      [section]: { ...content[section], ...data },
    });
  };

  return (
    <div className="space-y-3">
      <SectionCard title="באנר עליון" icon={Sparkles} defaultOpen>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.hero.title}
            onChange={(e) => update("hero", { title: e.target.value })}
            dir="rtl"
          />
          <div className="relative">
            <Textarea
              label="תת-כותרת"
              value={content.hero.subtitle}
              onChange={(e) => update("hero", { subtitle: e.target.value })}
              rows={2}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.hero.subtitle}
                onResult={(text) => update("hero", { subtitle: text })}
                fieldLabel="תת-כותרת דף יצירת קשר"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="טופס יצירת קשר" icon={MessageSquare}>
        <Input
          label="כותרת הטופס"
          value={content.form.title}
          onChange={(e) => update("form", { title: e.target.value })}
          dir="rtl"
        />
      </SectionCard>

      <SectionCard title="פרטי קשר" icon={Phone}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טלפון"
              value={content.contactInfo.phone}
              onChange={(e) => update("contactInfo", { phone: e.target.value })}
              dir="ltr"
            />
            <Input
              label="קישור טלפון"
              value={content.contactInfo.phoneHref}
              onChange={(e) => update("contactInfo", { phoneHref: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="אימייל"
              value={content.contactInfo.email}
              onChange={(e) => update("contactInfo", { email: e.target.value })}
              dir="ltr"
            />
            <Input
              label="קישור אימייל"
              value={content.contactInfo.emailHref}
              onChange={(e) => update("contactInfo", { emailHref: e.target.value })}
              dir="ltr"
            />
          </div>
          <Input
            label="כתובת"
            value={content.contactInfo.address}
            onChange={(e) => update("contactInfo", { address: e.target.value })}
            dir="rtl"
          />
          <Input
            label="שעות פעילות"
            value={content.contactInfo.hours}
            onChange={(e) => update("contactInfo", { hours: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>

      <SectionCard title="הערת ייעוץ ראשוני" icon={MessageSquare}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.consultationNote.title}
            onChange={(e) => update("consultationNote", { title: e.target.value })}
            dir="rtl"
          />
          <div className="relative">
            <Textarea
              label="תיאור"
              value={content.consultationNote.description}
              onChange={(e) => update("consultationNote", { description: e.target.value })}
              rows={3}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.consultationNote.description}
                onResult={(text) => update("consultationNote", { description: text })}
                fieldLabel="תיאור הערת ייעוץ ראשוני"
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
