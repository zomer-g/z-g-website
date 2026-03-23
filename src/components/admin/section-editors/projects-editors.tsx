"use client";

import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./section-card";
import { Sparkles, FolderOpen, Megaphone, Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectsPageContent, ProjectItem } from "@/types/content";

interface ProjectsEditorsProps {
  content: ProjectsPageContent;
  onChange: (content: ProjectsPageContent) => void;
}

export function ProjectsEditors({ content, onChange }: ProjectsEditorsProps) {
  const update = <K extends keyof ProjectsPageContent>(
    section: K,
    data: Partial<ProjectsPageContent[K]>,
  ) => {
    onChange({
      ...content,
      [section]: { ...content[section], ...data },
    });
  };

  const updateProject = (index: number, data: Partial<ProjectItem>) => {
    const updated = [...content.projects];
    updated[index] = { ...updated[index], ...data };
    onChange({ ...content, projects: updated });
  };

  const addProject = () => {
    onChange({
      ...content,
      projects: [
        ...content.projects,
        {
          title: "פרויקט חדש",
          subtitle: "תיאור קצר",
          description: "תיאור מפורט של הפרויקט.",
          url: "https://",
          icon: "Code2",
          tags: [],
        },
      ],
    });
  };

  const removeProject = (index: number) => {
    const updated = content.projects.filter((_, i) => i !== index);
    onChange({ ...content, projects: updated });
  };

  const updateTags = (index: number, tagString: string) => {
    const tags = tagString
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateProject(index, { tags });
  };

  return (
    <div className="space-y-3">
      {/* ── Hero Section ── */}
      <SectionCard title="באנר עליון (Hero)" icon={Sparkles} defaultOpen>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.hero.title}
            onChange={(e) => update("hero", { title: e.target.value })}
            dir="rtl"
          />
          <Textarea
            label="תת-כותרת"
            value={content.hero.subtitle}
            onChange={(e) => update("hero", { subtitle: e.target.value })}
            dir="rtl"
            rows={3}
          />
        </div>
      </SectionCard>

      {/* ── Projects ── */}
      <SectionCard title="מיזמים" icon={FolderOpen} defaultOpen>
        <div className="space-y-4">
          {content.projects.map((project, index) => (
            <div
              key={index}
              className={cn(
                "rounded-lg border border-border bg-muted-bg/30 p-4",
                "space-y-3",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-muted" />
                  <span className="text-sm font-semibold text-foreground">
                    {project.title || `פרויקט ${index + 1}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProject(index)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="שם הפרויקט"
                  value={project.title}
                  onChange={(e) => updateProject(index, { title: e.target.value })}
                  dir="rtl"
                />
                <Input
                  label="כותרת משנה"
                  value={project.subtitle}
                  onChange={(e) => updateProject(index, { subtitle: e.target.value })}
                  dir="rtl"
                />
              </div>

              <Textarea
                label="תיאור"
                value={project.description}
                onChange={(e) => updateProject(index, { description: e.target.value })}
                dir="rtl"
                rows={4}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="קישור לאתר"
                  value={project.url}
                  onChange={(e) => updateProject(index, { url: e.target.value })}
                  dir="ltr"
                  placeholder="https://..."
                />
                <Input
                  label="אייקון (Lucide)"
                  value={project.icon}
                  onChange={(e) => updateProject(index, { icon: e.target.value })}
                  dir="ltr"
                  placeholder="Database, Calendar, Search..."
                />
              </div>

              <Input
                label="תגיות (מופרדות בפסיק)"
                value={project.tags.join(", ")}
                onChange={(e) => updateTags(index, e.target.value)}
                dir="rtl"
                placeholder="מידע פתוח, שקיפות, טכנולוגיה"
              />
            </div>
          ))}

          <Button
            variant="ghost"
            onClick={addProject}
            className="w-full border border-dashed border-border text-sm text-muted hover:bg-muted-bg/50"
          >
            <Plus size={16} />
            הוסף מיזם
          </Button>
        </div>
      </SectionCard>

      {/* ── CTA Section ── */}
      <SectionCard title="קריאה לפעולה (CTA)" icon={Megaphone}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.cta.title}
            onChange={(e) => update("cta", { title: e.target.value })}
            dir="rtl"
          />
          <Textarea
            label="תיאור"
            value={content.cta.description}
            onChange={(e) => update("cta", { description: e.target.value })}
            dir="rtl"
            rows={2}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט כפתור"
              value={content.cta.ctaText}
              onChange={(e) => update("cta", { ctaText: e.target.value })}
              dir="rtl"
            />
            <Input
              label="קישור כפתור"
              value={content.cta.ctaLink}
              onChange={(e) => update("cta", { ctaLink: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
