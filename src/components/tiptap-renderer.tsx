import Link from "next/link";
import { getIcon } from "@/lib/icons";

/* ─── Types for TipTap / ProseMirror JSON ─── */

interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
}

interface TipTapDoc {
  type: "doc";
  content?: TipTapNode[];
}

/* ─── Props ─── */

interface TipTapRendererProps {
  content: TipTapDoc | Record<string, unknown>;
  className?: string;
}

/* ─── Variant Color Styles ─── */

const VARIANT_STYLES: Record<
  string,
  { card: string; icon: string; titleIcon: string }
> = {
  default: {
    card: "border-border bg-card",
    icon: "bg-primary/10 text-primary",
    titleIcon: "text-primary",
  },
  success: {
    card: "border-green-200 bg-green-50",
    icon: "bg-green-100 text-green-600",
    titleIcon: "text-green-600",
  },
  error: {
    card: "border-red-200 bg-red-50",
    icon: "bg-red-100 text-red-500",
    titleIcon: "text-red-500",
  },
  warning: {
    card: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
    titleIcon: "text-amber-600",
  },
  info: {
    card: "border-blue-200 bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
    titleIcon: "text-blue-600",
  },
};

/* ─── Mark Renderer ─── */

function renderMarks(text: string, marks?: TipTapMark[]): React.ReactNode {
  if (!marks || marks.length === 0) return text;

  return marks.reduce<React.ReactNode>((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "code":
        return (
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono">
            {acc}
          </code>
        );
      case "link": {
        const href = (mark.attrs?.href as string) ?? "#";
        const isExternal =
          href.startsWith("http") && !href.includes(process.env.NEXT_PUBLIC_SITE_URL ?? "");
        return (
          <Link
            href={href}
            className="font-semibold text-primary underline underline-offset-2 hover:text-accent transition-colors duration-200"
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {acc}
          </Link>
        );
      }
      default:
        return acc;
    }
  }, text);
}

/* ─── Extract inline content from a node (renders text without block wrappers) ─── */

function renderInline(node: TipTapNode, index: number): React.ReactNode {
  if (node.type === "text") {
    return <span key={index}>{renderMarks(node.text ?? "", node.marks)}</span>;
  }
  if (node.type === "paragraph") {
    return node.content?.map((child, i) => renderInline(child, i));
  }
  if (node.type === "listItem") {
    // List items contain paragraphs — unwrap them
    return node.content?.map((child, i) => renderInline(child, i));
  }
  if (node.type === "hardBreak") {
    return <br key={index} />;
  }
  if (node.content) {
    return node.content.map((child, i) => renderInline(child, i));
  }
  return null;
}

/* ─── Flatten info block content into individual card rows ─── */
/* Each paragraph and each list item becomes its own card row */

function flattenToCardRows(nodes: TipTapNode[]): TipTapNode[] {
  const rows: TipTapNode[] = [];
  for (const node of nodes) {
    if (node.type === "paragraph") {
      // Only add non-empty paragraphs
      if (node.content && node.content.length > 0) {
        rows.push(node);
      }
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      // Unwrap list → each listItem becomes a row
      if (node.content) {
        for (const item of node.content) {
          if (item.type === "listItem") {
            rows.push(item);
          }
        }
      }
    } else if (node.type === "heading") {
      rows.push(node);
    } else if (node.content) {
      // Recurse for any other wrapper nodes
      rows.push(...flattenToCardRows(node.content));
    }
  }
  return rows;
}

/* ─── Node Renderer ─── */

function renderNode(node: TipTapNode, index: number): React.ReactNode {
  switch (node.type) {
    case "text":
      return (
        <span key={index}>{renderMarks(node.text ?? "", node.marks)}</span>
      );

    case "paragraph":
      return (
        <p key={index} className="mb-4 leading-relaxed text-foreground">
          {node.content?.map((child, i) => renderNode(child, i))}
        </p>
      );

    case "heading": {
      const level = (node.attrs?.level as number) ?? 2;
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      const sizes: Record<number, string> = {
        1: "text-3xl font-bold mt-10 mb-4",
        2: "text-2xl font-bold mt-8 mb-3",
        3: "text-xl font-bold mt-6 mb-2",
        4: "text-lg font-semibold mt-4 mb-2",
        5: "text-base font-semibold mt-3 mb-1",
        6: "text-sm font-semibold mt-3 mb-1",
      };
      return (
        <Tag
          key={index}
          className={`${sizes[level] ?? sizes[2]} text-primary-dark`}
        >
          {node.content?.map((child, i) => renderNode(child, i))}
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul
          key={index}
          className="mb-4 list-disc space-y-1.5 ps-6 text-foreground"
        >
          {node.content?.map((child, i) => renderNode(child, i))}
        </ul>
      );

    case "orderedList":
      return (
        <ol
          key={index}
          className="mb-4 list-decimal space-y-1.5 ps-6 text-foreground"
        >
          {node.content?.map((child, i) => renderNode(child, i))}
        </ol>
      );

    case "listItem":
      return (
        <li key={index} className="leading-relaxed">
          {node.content?.map((child, i) => {
            // List items wrap content in paragraphs — strip the <p> for cleaner rendering
            if (child.type === "paragraph") {
              return child.content?.map((grandchild, j) =>
                renderNode(grandchild, j),
              );
            }
            return renderNode(child, i);
          })}
        </li>
      );

    case "blockquote":
      return (
        <blockquote
          key={index}
          className="mb-4 border-r-4 border-accent pr-4 italic text-muted"
        >
          {node.content?.map((child, i) => renderNode(child, i))}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre
          key={index}
          className="mb-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100"
          dir="ltr"
        >
          <code>
            {node.content?.map((child) => child.text).join("") ?? ""}
          </code>
        </pre>
      );

    case "horizontalRule":
      return <hr key={index} className="my-8 border-border" />;

    case "image": {
      const src = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      return (
        <figure key={index} className="my-6">
          <img
            src={src}
            alt={alt}
            className="max-w-full rounded-lg"
            loading="lazy"
          />
          {alt && (
            <figcaption className="mt-2 text-center text-sm text-muted">
              {alt}
            </figcaption>
          )}
        </figure>
      );
    }

    case "hardBreak":
      return <br key={index} />;

    /* ── Info Block (Custom Node) ── */
    case "infoBlock": {
      const iconName = (node.attrs?.icon as string) ?? "Briefcase";
      const title = (node.attrs?.title as string) ?? "";
      const variant = (node.attrs?.variant as string) ?? "default";
      const IconComponent = getIcon(iconName);
      const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

      // Flatten all content (paragraphs + list items) into card rows
      const cardRows = node.content ? flattenToCardRows(node.content) : [];

      return (
        <div key={index} className="my-6">
          {/* Block title */}
          {title && (
            <div className="mb-3 flex items-center gap-2">
              <IconComponent className={`h-5 w-5 ${styles.titleIcon}`} />
              <h3 className="text-lg font-bold text-primary-dark">{title}</h3>
            </div>
          )}

          {/* Each row as its own colored card */}
          {cardRows.length > 0 && (
            <div className="space-y-2">
              {cardRows.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${styles.card}`}
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <span className="text-sm leading-relaxed text-foreground">
                    {renderInline(row, i)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    default:
      // Fallback: render children if they exist
      if (node.content) {
        return (
          <div key={index}>
            {node.content.map((child, i) => renderNode(child, i))}
          </div>
        );
      }
      return null;
  }
}

/* ─── Main Component ─── */

export function TipTapRenderer({ content, className }: TipTapRendererProps) {
  const doc = content as TipTapDoc;

  if (!doc?.content || doc.content.length === 0) {
    return null;
  }

  return (
    <div className={className} dir="rtl">
      {doc.content.map((node, index) => renderNode(node, index))}
    </div>
  );
}
