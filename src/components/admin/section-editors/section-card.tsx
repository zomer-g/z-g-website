"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface SectionCardProps {
  title: string;
  icon?: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function SectionCard({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between p-4 text-right",
          "hover:bg-muted-bg/50 transition-colors duration-150 rounded-t-xl",
          !isOpen && "rounded-b-xl"
        )}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon size={16} className="text-primary" />
            </div>
          )}
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp size={18} className="text-muted" />
        ) : (
          <ChevronDown size={18} className="text-muted" />
        )}
      </button>

      {isOpen && (
        <CardContent className="border-t border-border p-4 pt-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
