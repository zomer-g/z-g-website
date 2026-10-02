import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Bearer-key auth for the write API (/api/v1).
 *
 * - Keys are 32 random bytes, shown once at creation; only SHA-256 is stored.
 *   A hash lookup is safe here (unlike a password) because the key has 256
 *   bits of entropy — there is nothing to brute-force offline.
 * - Every key has explicit scopes; a route asks for exactly one.
 * - Keys expire (max 365 days) and can be revoked from /admin/api-keys.
 * - Failed attempts are rate-limited per IP before the DB is touched, and
 *   each key has its own request budget.
 * - Every authenticated call is written to api_key_logs.
 */

export const API_SCOPES = {
  "plilist:draft": "יצירה ועריכה של טיוטות בהפליליסט (לא פרסום, לא נגיעה בפוסט שפורסם)",
  "media:write": "הוספה ועדכון של פריטים ברשימת הפרסומים",
  "articles:edit":
    "עריכת התוכן של מאמר קיים, גם אם פורסם (בלי שינוי סטטוס, כתובת או מחיקה; כל עריכה שומרת את הגרסה הקודמת)",
  "plilist:edit":
    "עריכת התוכן של פוסט קיים בהפליליסט, גם אם פורסם (בלי שינוי סטטוס, כתובת או מחיקה; כל עריכה שומרת את הגרסה הקודמת)",
  "milon:write": "הוספה ועדכון של ערכים במילון, כולל פרסום (בלי מחיקה)",
} as const;

export type ApiScope = keyof typeof API_SCOPES;

export const MAX_KEY_DAYS = 365;

const KEY_PREFIX = "zg_";

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateKey(): { key: string; prefix: string; keyHash: string } {
  const key = KEY_PREFIX + randomBytes(32).toString("base64url");
  return { key, prefix: key.slice(0, 10), keyHash: hashKey(key) };
}

export function isApiScope(s: string): s is ApiScope {
  return Object.prototype.hasOwnProperty.call(API_SCOPES, s);
}

export interface ApiCaller {
  keyId: string;
  createdBy: string | null;
  ip: string;
}

const unauthorized = () =>
  NextResponse.json(
    { error: "unauthorized" },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="z-g"', "Cache-Control": "no-store" } },
  );

/**
 * Authenticates the request and checks the scope. Returns the caller, or a
 * response to send back as-is.
 */
export async function requireApiKey(
  req: Request,
  scope: ApiScope,
): Promise<{ ok: true; caller: ApiCaller } | { ok: false; response: NextResponse }> {
  const ip = getClientIp(req);

  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const key = match?.[1];

  if (!key || !key.startsWith(KEY_PREFIX) || key.length > 100) {
    const limited = rateLimit(`api-key-fail:${ip}`, { limit: 10, windowMs: 60_000 });
    return { ok: false, response: limited ?? unauthorized() };
  }

  // Cap guesses per IP before a lookup, whether or not this one turns out valid.
  const probe = rateLimit(`api-key-ip:${ip}`, { limit: 120, windowMs: 60_000 });
  if (probe) return { ok: false, response: probe };

  const row = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(key) } });
  const now = new Date();
  if (!row || row.revokedAt || (row.expiresAt && row.expiresAt <= now)) {
    const limited = rateLimit(`api-key-fail:${ip}`, { limit: 10, windowMs: 60_000 });
    return { ok: false, response: limited ?? unauthorized() };
  }

  if (!row.scopes.includes(scope)) {
    return {
      ok: false,
      response: NextResponse.json({ error: `missing scope: ${scope}` }, { status: 403 }),
    };
  }

  const limited = rateLimit(`api-key:${row.id}`, { limit: 60, windowMs: 60_000 });
  if (limited) return { ok: false, response: limited };

  await prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: now, lastUsedIp: ip } })
    .catch((err) => console.error("[api-keys] lastUsed update failed:", err));

  return { ok: true, caller: { keyId: row.id, createdBy: row.createdBy, ip } };
}

export async function logApiCall(
  caller: ApiCaller,
  req: Request,
  status: number,
  target?: string,
): Promise<void> {
  try {
    await prisma.apiKeyLog.create({
      data: {
        keyId: caller.keyId,
        method: req.method,
        path: new URL(req.url).pathname,
        target: target ?? null,
        status,
        ip: caller.ip,
      },
    });
  } catch (err) {
    console.error("[api-keys] log failed:", err);
  }
}

/* ───────────────────── TipTap content validation ───────────────────── */

const NODE_TYPES = new Set([
  "doc", "paragraph", "text", "heading", "blockquote", "bulletList", "orderedList",
  "listItem", "hardBreak", "horizontalRule", "codeBlock", "image", "infoBlock", "lawBlock",
]);
// What src/components/tiptap-renderer.tsx renders — anything else would be
// silently dropped on the page, so it is rejected here instead.
const MARK_TYPES = new Set(["bold", "italic", "underline", "code", "link"]);

const MAX_DEPTH = 20;
const MAX_NODES = 20_000;

/** Absolute http(s), site-relative ("/..."), in-page ("#...") or mailto only. */
function isSafeUrl(url: unknown): boolean {
  if (typeof url !== "string" || url.length > 2048) return false;
  const u = url.replace(/[\u0000- ]+/g, "");
  if (u.startsWith("/") && !u.startsWith("//")) return true;
  if (u.startsWith("#")) return true;
  return /^(https?:\/\/|mailto:)/i.test(u);
}

/**
 * Strict check of a TipTap document from the API: known node/mark types only,
 * bounded size and depth, and every link/image URL on an allowed scheme. The
 * public renderer sanitises too; this keeps bad content out of the DB (and
 * out of the admin editor, which renders drafts) in the first place.
 */
export function validateTiptapDoc(doc: unknown): string | null {
  let count = 0;

  function walk(node: unknown, depth: number, path: string): string | null {
    if (depth > MAX_DEPTH) return `${path}: nesting too deep`;
    if (++count > MAX_NODES) return "document too large";
    if (!node || typeof node !== "object" || Array.isArray(node)) return `${path}: not a node`;
    const n = node as Record<string, unknown>;
    if (typeof n.type !== "string" || !NODE_TYPES.has(n.type)) return `${path}: node type "${String(n.type)}" not allowed`;
    if (depth === 0 && n.type !== "doc") return "root must be {type:\"doc\"}";
    if (n.type === "text" && typeof n.text !== "string") return `${path}: text node without text`;
    if (n.type === "image") {
      const src = (n.attrs as Record<string, unknown> | undefined)?.src;
      if (!isSafeUrl(src) || String(src).startsWith("#")) return `${path}: image src not allowed`;
    }
    if (n.type === "lawBlock") {
      const raw = (n.attrs as Record<string, unknown> | undefined)?.items;
      let items: unknown = raw;
      if (typeof raw === "string") {
        try {
          items = JSON.parse(raw);
        } catch {
          return `${path}: lawBlock items is not JSON`;
        }
      }
      if (Array.isArray(items)) {
        for (const it of items as Record<string, unknown>[]) {
          if (it?.url && !isSafeUrl(it.url)) return `${path}: lawBlock url not allowed`;
        }
      }
    }
    if (n.marks !== undefined) {
      if (!Array.isArray(n.marks)) return `${path}: marks must be an array`;
      for (const m of n.marks as Record<string, unknown>[]) {
        if (!m || typeof m.type !== "string" || !MARK_TYPES.has(m.type)) return `${path}: mark "${String(m?.type)}" not allowed`;
        if (m.type === "link" && !isSafeUrl((m.attrs as Record<string, unknown> | undefined)?.href)) {
          return `${path}: link href not allowed`;
        }
      }
    }
    if (n.content !== undefined) {
      if (!Array.isArray(n.content)) return `${path}: content must be an array`;
      for (let i = 0; i < n.content.length; i++) {
        const err = walk(n.content[i], depth + 1, `${path}.content[${i}]`);
        if (err) return err;
      }
    }
    return null;
  }

  return walk(doc, 0, "content");
}

export { isSafeUrl };
