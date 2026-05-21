import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { TipTapRenderer } from "@/components/tiptap-renderer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { EditableSection } from "@/components/admin/editable-section";

/**
 * Shared layout shell for browser-extension support pages
 * (e.g. /ocal, /ocal-privacy, /ocal-terms, /ocoi-extension, ...).
 *
 * Renders the same hero + prose body as the existing /legal-tools and
 * /case-tracker pages, so every support page on z-g.co.il feels like a
 * single integrated set rather than a collection of one-offs.
 *
 * Body content is fetched from the Page table by slug and edited via
 * /admin/pages/[slug]. Pages with status=DRAFT are 404 to the public,
 * but render normally for an authenticated admin so drafts are previewable.
 */
interface ExtensionPageShellProps {
  slug: string;
  title: string;
  subtitle?: string;
  englishLabel?: string;
}

export async function ExtensionPageShell({
  slug,
  title,
  subtitle,
  englishLabel,
}: ExtensionPageShellProps) {
  const [page, session] = await Promise.all([
    prisma.page
      .findUnique({
        where: { slug },
        select: { content: true, status: true },
      })
      .catch(() => null),
    auth(),
  ]);

  const isAdmin = session?.user?.role === "ADMIN";
  // Hide drafts from the public; admins still see them so they can preview.
  if (page && page.status !== "PUBLISHED" && !isAdmin) {
    notFound();
  }

  const content =
    page?.content &&
    typeof page.content === "object" &&
    (page.content as Record<string, unknown>).type === "doc"
      ? (page.content as Record<string, unknown>)
      : null;

  return (
    <PublicLayout>
      <EditableSection
        editHref={`/admin/pages/${slug}`}
        editLabel="עריכת העמוד"
      >
        <section className="bg-primary py-16 sm:py-20 text-center">
          <Container>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
                {subtitle}
              </p>
            ) : null}
            {englishLabel ? (
              <p className="mt-2 text-sm text-white/50">{englishLabel}</p>
            ) : null}
            {isAdmin && page && page.status !== "PUBLISHED" ? (
              <p className="mt-6 inline-block rounded-full bg-amber-400/90 px-4 py-1.5 text-sm font-semibold text-amber-950">
                טיוטה — מוסתר מהציבור
              </p>
            ) : null}
          </Container>
        </section>
      </EditableSection>

      <section className="py-16">
        <Container narrow>
          {content ? (
            <div className="prose-rtl">
              <TipTapRenderer content={content} />
            </div>
          ) : (
            <p className="text-muted">תוכן בטעינה...</p>
          )}
        </Container>
      </section>
    </PublicLayout>
  );
}
