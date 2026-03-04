"use client";

import { Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Type, Link2, Phone, Scale, Plus, Trash2 } from "lucide-react";
import type { FooterContent } from "@/types/content";

interface FooterEditorProps {
  content: FooterContent;
  onChange: (content: FooterContent) => void;
}

export function FooterEditor({ content, onChange }: FooterEditorProps) {
  return (
    <div className="space-y-3">
      <SectionCard title="מידע על המשרד" icon={Type} defaultOpen>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="שם המשרד"
              value={content.firmName}
              onChange={(e) => onChange({ ...content, firmName: e.target.value })}
              dir="rtl"
            />
            <Input
              label="תת-כותרת"
              value={content.firmSubtext}
              onChange={(e) => onChange({ ...content, firmSubtext: e.target.value })}
              dir="rtl"
            />
          </div>
          <Textarea
            label="תיאור המשרד"
            value={content.firmDescription}
            onChange={(e) => onChange({ ...content, firmDescription: e.target.value })}
            rows={3}
            dir="rtl"
          />
          <Input
            label="טקסט זכויות יוצרים"
            value={content.copyright}
            onChange={(e) => onChange({ ...content, copyright: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>

      <SectionCard title="קישורים מהירים" icon={Link2}>
        <div className="space-y-3">
          <Input
            label="כותרת העמודה"
            value={content.quickLinksTitle}
            onChange={(e) => onChange({ ...content, quickLinksTitle: e.target.value })}
            dir="rtl"
          />
          {content.quickLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <Input
                label="תווית"
                value={link.label}
                onChange={(e) => {
                  const quickLinks = [...content.quickLinks];
                  quickLinks[idx] = { ...quickLinks[idx], label: e.target.value };
                  onChange({ ...content, quickLinks });
                }}
                dir="rtl"
                className="flex-1"
              />
              <Input
                label="קישור"
                value={link.href}
                onChange={(e) => {
                  const quickLinks = [...content.quickLinks];
                  quickLinks[idx] = { ...quickLinks[idx], href: e.target.value };
                  onChange({ ...content, quickLinks });
                }}
                dir="ltr"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  const quickLinks = content.quickLinks.filter((_, i) => i !== idx);
                  onChange({ ...content, quickLinks });
                }}
                className="mb-1 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              onChange({ ...content, quickLinks: [...content.quickLinks, { label: "", href: "/" }] });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף קישור
          </button>
        </div>
      </SectionCard>

      <SectionCard title="פרטי קשר" icon={Phone}>
        <div className="space-y-3">
          <Input
            label="כותרת העמודה"
            value={content.contactTitle}
            onChange={(e) => onChange({ ...content, contactTitle: e.target.value })}
            dir="rtl"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טלפון"
              value={content.contactInfo.phone}
              onChange={(e) => onChange({ ...content, contactInfo: { ...content.contactInfo, phone: e.target.value } })}
              dir="ltr"
            />
            <Input
              label="קישור טלפון"
              value={content.contactInfo.phoneHref}
              onChange={(e) => onChange({ ...content, contactInfo: { ...content.contactInfo, phoneHref: e.target.value } })}
              dir="ltr"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="אימייל"
              value={content.contactInfo.email}
              onChange={(e) => onChange({ ...content, contactInfo: { ...content.contactInfo, email: e.target.value } })}
              dir="ltr"
            />
            <Input
              label="קישור אימייל"
              value={content.contactInfo.emailHref}
              onChange={(e) => onChange({ ...content, contactInfo: { ...content.contactInfo, emailHref: e.target.value } })}
              dir="ltr"
            />
          </div>
          <Input
            label="כתובת"
            value={content.contactInfo.address}
            onChange={(e) => onChange({ ...content, contactInfo: { ...content.contactInfo, address: e.target.value } })}
            dir="rtl"
          />
        </div>
      </SectionCard>

      <SectionCard title="קישורים משפטיים" icon={Scale}>
        <div className="space-y-3">
          {content.legalLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <Input
                label="תווית"
                value={link.label}
                onChange={(e) => {
                  const legalLinks = [...content.legalLinks];
                  legalLinks[idx] = { ...legalLinks[idx], label: e.target.value };
                  onChange({ ...content, legalLinks });
                }}
                dir="rtl"
                className="flex-1"
              />
              <Input
                label="קישור"
                value={link.href}
                onChange={(e) => {
                  const legalLinks = [...content.legalLinks];
                  legalLinks[idx] = { ...legalLinks[idx], href: e.target.value };
                  onChange({ ...content, legalLinks });
                }}
                dir="ltr"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  const legalLinks = content.legalLinks.filter((_, i) => i !== idx);
                  onChange({ ...content, legalLinks });
                }}
                className="mb-1 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              onChange({ ...content, legalLinks: [...content.legalLinks, { label: "", href: "/" }] });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף קישור
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
