import { prisma } from "@/lib/prisma";

/**
 * Filenames an admin has marked non-public (file_settings.is_public = false).
 *
 * proxy.ts consults this on every /uploads request, so the set is cached in
 * memory. The proxy is bundled apart from the API routes and keeps its own
 * copy, which setFileVisibility() cannot reach, so the short TTL is what
 * bounds how long a newly hidden file stays reachable.
 */

const TTL_MS = 5_000;
let cache: { set: Set<string>; at: number } | null = null;
let inflight: Promise<Set<string>> | null = null;

export async function getPrivateFiles(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.set;
  if (!inflight) {
    inflight = prisma.fileSetting
      .findMany({ where: { isPublic: false }, select: { filename: true } })
      .then((rows) => {
        cache = { set: new Set(rows.map((r) => r.filename)), at: Date.now() };
        return cache.set;
      })
      .catch((err) => {
        // Fail open to the last known set rather than blocking every file.
        console.error("getPrivateFiles failed:", err);
        return cache?.set ?? new Set<string>();
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function setFileVisibility(filename: string, isPublic: boolean) {
  await prisma.fileSetting.upsert({
    where: { filename },
    create: { filename, isPublic },
    update: { isPublic },
  });
  cache = null;
  await getPrivateFiles();
}

/** The file name a /uploads/... or /seed-uploads/... path points at, or null. */
export function uploadNameFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/(?:seed-)?uploads\/([^/]+)$/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}
