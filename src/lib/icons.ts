import {
  Scale,
  Building2,
  Gavel,
  FileText,
  Shield,
  ShieldAlert,
  Briefcase,
  Award,
  Heart,
  ShieldCheck,
  Lightbulb,
  GraduationCap,
  BookOpen,
  Users,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  CircleDot,
  Star,
  Zap,
  Target,
  ThumbsUp,
  ThumbsDown,
  type LucideIcon,
} from "lucide-react";

/* ─── Icon name → component map for dynamic rendering ─── */

const ICON_MAP: Record<string, LucideIcon> = {
  Scale,
  Building2,
  Gavel,
  FileText,
  Shield,
  ShieldAlert,
  Briefcase,
  Award,
  Heart,
  ShieldCheck,
  Lightbulb,
  GraduationCap,
  BookOpen,
  Users,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  CircleDot,
  Star,
  Zap,
  Target,
  ThumbsUp,
  ThumbsDown,
};

/**
 * Resolve a lucide icon name string to its component.
 * Falls back to Briefcase if not found.
 */
export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Briefcase;
}
