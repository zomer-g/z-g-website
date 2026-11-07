import { prisma } from "@/lib/prisma";

/**
 * Filenames an admin has marked non-public (file_settings.is_public = false).
 *
 * proxy.ts consults this on every /uploads request, so the set is cached in
 * memory. The proxy is bundled apart from the API routes and keeps its own
 * copy, which setFileVisibility() cannot reach, so the short TTL is what
 * bounds how long a newly hidden file stays reachable.
 */

export const PRIVATE_FILES_TTL_MS = 5_000;
const TTL_MS = PRIVATE_FILES_TTL_MS;
let cache: { set: Set<string>; at: number } | null = null;

/**
 * Stands in for the private set when it could not be loaded and no earlier
 * copy exists (a cold instance during a database outage). Every name counts
 * as private, so hidden files stay hidden; public files answer 404 until the
 * database is back, which is the lesser failure.
 */
class DenyAllSet extends Set<string> {
  override has(): boolean {
    return true;
  }
}
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
        // Fall back to the last known set. With none, fail closed: an empty
        // set here would have served every hidden file to anyone.
        console.error("getPrivateFiles failed:", err);
        return cache?.set ?? new DenyAllSet();
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

/**
 * The path a server will end up serving for `pathname`: percent-decoding
 * applied until it no longer changes, backslashes read as slashes, empty and
 * "." segments dropped and ".." resolved, query and fragment removed.
 *
 * The private-file check has to match on this form. Matching the raw path let
 * `/%75ploads/x.pdf`, `/uploads%2fx.pdf` or `/seed%2duploads/x.pdf` skip the
 * check while the static file server still decoded them to the hidden file.
 */
export function canonicalPath(pathname: string): string {
  let s = pathname.split(/[?#]/)[0];
  for (let i = 0; i < 5; i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(s);
    } catch {
      break;
    }
    if (decoded === s) break;
    s = decoded;
  }
  s = s.split(/[?#]/)[0].replace(/\\/g, "/");
  const out: string[] = [];
  for (const seg of s.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return "/" + out.join("/");
}

/** The file name a /uploads/... or /seed-uploads/... path points at, or null. */
export function uploadNameFromPath(pathname: string): string | null {
  const m = canonicalPath(pathname).match(/^\/(?:seed-)?uploads\/([^/]+)$/i);
  return m ? m[1] : null;
}
