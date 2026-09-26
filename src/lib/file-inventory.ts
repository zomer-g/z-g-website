import { readdir, stat } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

/**
 * Every file served under /uploads, and every place on the site that points
 * at it. Feeds /admin/files.
 *
 * Files come from three places: the uploaded_files table (all uploads since
 * the move to xhostd), public/seed-uploads (committed to git, copied into
 * public/uploads on start) and anything left in public/uploads from the
 * Render disk. References are found by scanning each content table for
 * /uploads/<name> or /seed-uploads/<name>.
 */

export type FileStorage = "db" | "seed" | "disk";

export interface FileReference {
  kind: string; // e.g. "מאמר", "מסמך תיק"
  label: string;
  href: string | null; // public page where it shows
  adminHref: string | null;
  live: boolean; // the referencing item is itself published/active
}

export interface InventoryFile {
  filename: string;
  url: string;
  ext: string;
  mimeType: string;
  size: number;
  createdAt: string | null;
  storage: FileStorage[];
  isPublic: boolean;
  note: string | null;
  references: FileReference[];
  inLibrary: boolean; // has a row in the admin media library
}

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

// Page rows whose public path is not simply /<slug>.
const PAGE_PATHS: Record<string, string> = {
  home: "/",
  leam: "/o",
  "article-detail": "/articles",
  "service-detail": "/services",
};

const REF_RE = /\/(?:seed-)?uploads\/([^"'\s)<>?#\\]+)/g;

/** All file names referenced anywhere inside a value (string or JSON). */
function namesIn(value: unknown): Set<string> {
  const out = new Set<string>();
  if (value == null) return out;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  for (const m of text.matchAll(REF_RE)) {
    let name = m[1];
    try {
      name = decodeURIComponent(name);
    } catch {
      /* keep raw */
    }
    out.add(name);
  }
  return out;
}

async function listDir(dir: string) {
  try {
    const names = await readdir(dir);
    const rows = await Promise.all(
      names.map(async (name) => {
        const s = await stat(path.join(dir, name));
        return s.isFile() ? { name, size: s.size, mtime: s.mtime } : null;
      }),
    );
    return rows.filter((r): r is NonNullable<typeof r> => r !== null);
  } catch {
    return [];
  }
}

export async function getFileInventory(): Promise<InventoryFile[]> {
  const publicDir = path.join(process.cwd(), "public");
  const [dbFiles, seedFiles, diskFiles, settings] = await Promise.all([
    prisma.uploadedFile.findMany({
      select: { filename: true, mimeType: true, size: true, createdAt: true },
    }),
    listDir(path.join(publicDir, "seed-uploads")),
    listDir(path.join(publicDir, "uploads")),
    prisma.fileSetting.findMany(),
  ]);

  const files = new Map<string, InventoryFile>();
  const upsert = (
    filename: string,
    storage: FileStorage,
    size: number,
    createdAt: Date | null,
    mimeType?: string,
  ) => {
    const ext = path.extname(filename).toLowerCase();
    const existing = files.get(filename);
    if (existing) {
      if (!existing.storage.includes(storage)) existing.storage.push(storage);
      return;
    }
    files.set(filename, {
      filename,
      url: `/uploads/${encodeURIComponent(filename)}`,
      ext: ext.replace(".", "") || "?",
      mimeType: mimeType ?? MIME_BY_EXT[ext] ?? "application/octet-stream",
      size,
      createdAt: createdAt ? createdAt.toISOString() : null,
      storage: [storage],
      isPublic: true,
      note: null,
      references: [],
      inLibrary: false,
    });
  };
  for (const f of dbFiles) upsert(f.filename, "db", f.size, f.createdAt, f.mimeType);
  for (const f of seedFiles) upsert(f.name, "seed", f.size, f.mtime);
  for (const f of diskFiles) upsert(f.name, "disk", f.size, f.mtime);

  for (const s of settings) {
    const f = files.get(s.filename);
    if (f) {
      f.isPublic = s.isPublic;
      f.note = s.note;
    }
  }

  const addRef = (value: unknown, ref: FileReference) => {
    for (const name of namesIn(value)) {
      const f = files.get(name);
      if (f && !f.references.some((r) => r.label === ref.label && r.kind === ref.kind)) {
        f.references.push(ref);
      }
    }
  };

  const [posts, plilist, pages, services, caseDocs, appearances, pachMessages, settingsRows, media] =
    await Promise.all([
      prisma.post.findMany({ select: { id: true, title: true, slug: true, status: true, content: true, coverImage: true } }),
      prisma.plilistPost.findMany({
        select: { id: true, title: true, slug: true, status: true, content: true, coverImage: true, attachments: true, caseTag: true },
      }),
      prisma.page.findMany({ select: { slug: true, title: true, status: true, content: true, draftContent: true } }),
      prisma.service.findMany({ select: { id: true, title: true, slug: true, isActive: true, content: true } }),
      prisma.caseDocument.findMany({ select: { title: true, caseTag: true, fileUrl: true, isActive: true } }),
      prisma.mediaAppearance.findMany({ select: { title: true, url: true, thumbnailUrl: true, isActive: true, caseTag: true } }),
      prisma.pachSystemMessage.findMany({ select: { id: true, title: true, imageUrl: true, isArchived: true } }),
      prisma.siteSettings.findMany(),
      prisma.media.findMany({ select: { url: true } }),
    ]);

  // A case tag shows on every published הפליליסט post that carries it.
  const casePosts = new Map<string, { slug: string; live: boolean }[]>();
  for (const p of plilist) {
    if (!p.caseTag) continue;
    const list = casePosts.get(p.caseTag) ?? [];
    list.push({ slug: p.slug, live: p.status === "PUBLISHED" });
    casePosts.set(p.caseTag, list);
  }
  const casePostHref = (tag: string | null) => {
    const list = tag ? casePosts.get(tag) : undefined;
    const pick = list?.find((p) => p.live) ?? list?.[0];
    return pick ? { href: `/haplilist/${pick.slug}`, live: !!list?.some((p) => p.live) } : null;
  };

  for (const p of posts) {
    addRef([p.content, p.coverImage], {
      kind: "מאמר",
      label: p.title,
      href: `/articles/${p.slug}`,
      adminHref: `/admin/posts/${p.id}`,
      live: p.status === "PUBLISHED",
    });
  }
  for (const p of plilist) {
    addRef([p.content, p.coverImage, p.attachments], {
      kind: "הפליליסט",
      label: p.title,
      href: `/haplilist/${p.slug}`,
      adminHref: `/admin/plilist/${p.id}`,
      live: p.status === "PUBLISHED",
    });
  }
  for (const p of pages) {
    addRef(p.content, {
      kind: "עמוד באתר",
      label: p.title,
      href: PAGE_PATHS[p.slug] ?? `/${p.slug}`,
      adminHref: `/admin/site-editor/${p.slug}`,
      live: p.status === "PUBLISHED",
    });
    addRef(p.draftContent, {
      kind: "טיוטת עמוד",
      label: p.title,
      href: null,
      adminHref: `/admin/site-editor/${p.slug}`,
      live: false,
    });
  }
  for (const s of services) {
    addRef(s.content, {
      kind: "תחום עיסוק",
      label: s.title,
      href: `/services/${s.slug}`,
      adminHref: "/admin/services",
      live: s.isActive,
    });
  }
  for (const d of caseDocs) {
    const target = casePostHref(d.caseTag);
    addRef(d.fileUrl, {
      kind: "מסמך תיק",
      label: `${d.title} (${d.caseTag})`,
      href: target?.href ?? null,
      adminHref: "/admin/case-documents",
      live: d.isActive && !!target?.live,
    });
  }
  for (const a of appearances) {
    addRef([a.url, a.thumbnailUrl], {
      kind: "הופעה בתקשורת",
      label: a.title,
      href: "/media",
      adminHref: "/admin/media-appearances",
      live: a.isActive,
    });
  }
  for (const m of pachMessages) {
    addRef(m.imageUrl, {
      kind: "פח המשפט",
      label: m.title || `הודעת מערכת #${m.id}`,
      href: "/pach-hamishpat",
      adminHref: "/admin/pach-hamishpat",
      live: !m.isArchived,
    });
  }
  for (const s of settingsRows) {
    addRef(s.data, {
      kind: "הגדרות האתר",
      label: "הגדרות כלליות",
      href: "/",
      adminHref: "/admin/settings",
      live: true,
    });
  }
  for (const m of media) {
    for (const name of namesIn(m.url)) {
      const f = files.get(name);
      if (f) f.inLibrary = true;
    }
  }

  return [...files.values()].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}
