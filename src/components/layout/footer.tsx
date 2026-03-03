import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterLink {
  readonly label: string;
  readonly href: string;
}

const QUICK_LINKS: readonly FooterLink[] = [
  { label: "אודות המשרד", href: "/about" },
  { label: "תחומי עיסוק", href: "/services" },
  { label: "מאמרים", href: "/articles" },
  { label: "מדיה", href: "/media" },
  { label: "צור קשר", href: "/contact" },
] as const;

const LEGAL_LINKS: readonly FooterLink[] = [
  { label: "הצהרת נגישות", href: "/accessibility" },
  { label: "מדיניות פרטיות", href: "/privacy" },
  { label: "תנאי שימוש", href: "/terms" },
] as const;

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="border-t border-border bg-primary text-white"
    >
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-16">
          {/* Column 1: Firm Info */}
          <div>
            <Link
              href="/"
              className="inline-block transition-colors duration-200 hover:text-accent"
              aria-label="זומר - משרד עורכי דין - עמוד הבית"
            >
              <span className="text-2xl font-bold tracking-tight">זומר</span>
              <span className="ms-2 text-sm font-medium text-white/70">
                משרד עורכי דין
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              משרד עורכי דין זומר מספק ייצוג משפטי מקצועי וליווי עסקי מקיף.
              המשרד מתמחה במגוון תחומי משפט ומציע שירות אישי ומסור לכל לקוח.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h2 className="text-lg font-bold text-accent">קישורים מהירים</h2>
            <nav aria-label="קישורים מהירים" className="mt-4">
              <ul className="space-y-3" role="list">
                {QUICK_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "text-sm text-white/80 transition-colors duration-200",
                        "hover:text-accent focus-visible:text-accent"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Column 3: Contact Info */}
          <div>
            <h2 className="text-lg font-bold text-accent">צור קשר</h2>
            <address className="mt-4 not-italic">
              <ul className="space-y-4" role="list">
                <li>
                  <a
                    href="tel:+972-3-000-0000"
                    className={cn(
                      "flex items-center gap-3 text-sm text-white/80",
                      "transition-colors duration-200",
                      "hover:text-accent focus-visible:text-accent"
                    )}
                    aria-label="התקשרו אלינו: 03-000-0000"
                  >
                    <Phone
                      className="h-5 w-5 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    <span dir="ltr">03-000-0000</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@zomer-law.co.il"
                    className={cn(
                      "flex items-center gap-3 text-sm text-white/80",
                      "transition-colors duration-200",
                      "hover:text-accent focus-visible:text-accent"
                    )}
                    aria-label="שלחו אימייל: info@zomer-law.co.il"
                  >
                    <Mail
                      className="h-5 w-5 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    <span dir="ltr">info@zomer-law.co.il</span>
                  </a>
                </li>
                <li>
                  <div className="flex items-start gap-3 text-sm text-white/80">
                    <MapPin
                      className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    <span>תל אביב, ישראל</span>
                  </div>
                </li>
              </ul>
            </address>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            {/* Copyright */}
            <p className="text-xs text-white/60">
              <span aria-label={`כל הזכויות שמורות ${currentYear}`}>
                &copy; {currentYear} זומר - משרד עורכי דין. כל הזכויות שמורות.
              </span>
            </p>

            {/* Legal Links */}
            <nav aria-label="קישורים משפטיים">
              <ul className="flex items-center gap-6" role="list">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "text-xs text-white/60 transition-colors duration-200",
                        "hover:text-accent focus-visible:text-accent"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
