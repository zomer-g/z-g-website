import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FooterContent } from "@/types/content";
import { DEFAULT_FOOTER_CONTENT } from "@/lib/content-defaults";

interface FooterProps {
  content?: FooterContent;
}

export default function Footer({ content }: FooterProps) {
  const data = content ?? DEFAULT_FOOTER_CONTENT;
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="border-t border-border bg-primary text-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-16">
          {/* Column 1: Firm Info */}
          <div>
            <Link
              href="/"
              className="inline-block transition-colors duration-200 hover:text-accent"
              aria-label={`${data.firmName} - ${data.firmSubtext} - עמוד הבית`}
            >
              <span className="text-2xl font-bold tracking-tight">{data.firmName}</span>
              <span className="ms-2 text-sm font-medium text-white/70">
                {data.firmSubtext}
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              {data.firmDescription}
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h2 className="text-lg font-bold text-accent">{data.quickLinksTitle}</h2>
            <nav aria-label="קישורים מהירים" className="mt-4">
              <ul className="space-y-3" role="list">
                {data.quickLinks.map((link) => (
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
            <h2 className="text-lg font-bold text-accent">{data.contactTitle}</h2>
            <address className="mt-4 not-italic">
              <ul className="space-y-4" role="list">
                <li>
                  <a
                    href={data.contactInfo.phoneHref}
                    className={cn(
                      "flex items-center gap-3 text-sm text-white/80",
                      "transition-colors duration-200 hover:text-accent focus-visible:text-accent"
                    )}
                    aria-label={`התקשרו אלינו: ${data.contactInfo.phone}`}
                  >
                    <Phone className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    <span dir="ltr">{data.contactInfo.phone}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={data.contactInfo.emailHref}
                    className={cn(
                      "flex items-center gap-3 text-sm text-white/80",
                      "transition-colors duration-200 hover:text-accent focus-visible:text-accent"
                    )}
                    aria-label={`שלחו אימייל: ${data.contactInfo.email}`}
                  >
                    <Mail className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    <span dir="ltr">{data.contactInfo.email}</span>
                  </a>
                </li>
                <li>
                  <div className="flex items-start gap-3 text-sm text-white/80">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    <span>{data.contactInfo.address}</span>
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
            <p className="text-xs text-white/80">
              <span aria-label={`כל הזכויות שמורות ${currentYear}`}>
                &copy; {currentYear} {data.copyright}
              </span>
            </p>
            <nav aria-label="קישורים משפטיים">
              <ul className="flex items-center gap-6" role="list">
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
      </div>
    </footer>
  );
}
