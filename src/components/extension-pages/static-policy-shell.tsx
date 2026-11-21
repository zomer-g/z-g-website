import Link from "next/link";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";

/**
 * Layout for an extension policy whose text is fixed in code rather than in
 * the Page table (see ExtensionPageShell for the CMS-edited series). Used
 * where the wording is a legal text submitted to a store review, so it must
 * not drift through an admin edit, and where the page comes in two
 * languages: the site's <html> is lang="he" dir="rtl", so an English page
 * sets lang/dir on its own hero and body (WCAG 3.1.2).
 */
interface StaticPolicyShellProps {
  lang: "he" | "en";
  title: string;
  updated: string;
  /** Link to the same policy in the other language, shown above the title. */
  otherLanguage: { href: string; label: string; lang: "he" | "en" };
  children: React.ReactNode;
}

export function StaticPolicyShell({
  lang,
  title,
  updated,
  otherLanguage,
  children,
}: StaticPolicyShellProps) {
  const dir = lang === "he" ? "rtl" : "ltr";
  const otherDir = otherLanguage.lang === "he" ? "rtl" : "ltr";
  return (
    <PublicLayout>
      <section className="bg-primary py-16 sm:py-20 text-center" lang={lang} dir={dir}>
        <Container>
          <p className="mb-6">
            <Link
              href={otherLanguage.href}
              hrefLang={otherLanguage.lang}
              lang={otherLanguage.lang}
              dir={otherDir}
              className="inline-block rounded-full border border-white/60 px-4 py-1.5 text-sm font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {otherLanguage.label}
            </Link>
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {title}
          </h1>
          <p className="mt-4 text-lg text-white/80">{updated}</p>
        </Container>
      </section>

      <section className="py-16" lang={lang} dir={dir}>
        <Container narrow>
          <div className={lang === "he" ? "prose-rtl" : "prose-rtl prose-ltr"}>
            {children}
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}

/* Small building blocks so both language pages share one look. */

export function PolicyHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl font-bold text-primary-dark">{children}</h2>;
}

export function PolicyList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mb-6 list-disc space-y-1.5 ps-6 text-foreground">{children}</ul>
  );
}

/** A Latin-script fragment inside Hebrew text (or the reverse). */
export function Ltr({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" lang="en">
      {children}
    </span>
  );
}

export function He({ children }: { children: React.ReactNode }) {
  return (
    <span dir="rtl" lang="he">
      {children}
    </span>
  );
}
