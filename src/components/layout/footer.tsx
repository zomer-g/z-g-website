import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FooterContent } from "@/types/content";
import { DEFAULT_FOOTER_CONTENT } from "@/lib/content-defaults";

interface FooterProps {
  content?: FooterContent;
}

export default function Footer({ content }: FooterProps) {
  const data = content ?? DEFAULT_FOOTER_CONTENT;

  return (
    <footer
      role="contentinfo"
      className="border-t border-border bg-primary text-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Contact */}
          <address className="not-italic">
            <ul className="flex flex-wrap items-center justify-center gap-6 sm:gap-8" role="list">
              <li>
                <a
                  href={data.contactInfo.phoneHref}
                  className={cn(
                    "flex items-center gap-2 text-sm text-white/80",
                    "transition-colors duration-200 hover:text-accent focus-visible:text-accent"
                  )}
                  aria-label={`התקשרו: ${data.contactInfo.phone}`}
                >
                  <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span dir="ltr">{data.contactInfo.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={data.contactInfo.emailHref}
                  className={cn(
                    "flex items-center gap-2 text-sm text-white/80",
                    "transition-colors duration-200 hover:text-accent focus-visible:text-accent"
                  )}
                  aria-label={`שלחו אימייל: ${data.contactInfo.email}`}
                >
                  <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span dir="ltr">{data.contactInfo.email}</span>
                </a>
              </li>
            </ul>
          </address>

          {/* Legal Links */}
          <nav aria-label="קישורים משפטיים">
            <ul className="flex flex-wrap items-center justify-center gap-4 sm:gap-6" role="list">
              {data.legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-xs text-white/80 transition-colors duration-200",
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
    </footer>
  );
}
