/**
 * Shared renderer for the site's OpenGraph / Twitter share banners.
 *
 * Every public page owns an `opengraph-image.tsx` next to its `page.tsx`;
 * those files are thin wrappers that hand a title (and usually a subtitle
 * and a kicker) to `renderOgBanner`. Next.js picks them up by convention,
 * so whatever URL is pasted into WhatsApp / X / Facebook gets the banner
 * belonging to that exact page instead of the site-wide default.
 *
 * Text is pre-wrapped and bidi-reordered here (see ./text) because satori
 * renders glyphs in logical order — everything below is already visual, so
 * no `direction: rtl` is used anywhere in the tree.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { toVisual, wrapVisual } from "./text";

/* ─── Route exports shared by every opengraph-image.tsx ─── */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT = 'עו"ד גיא זומר';

/* ─── Brand palette (mirrors globals.css) ─── */

const PRIMARY = "#1a365d";
const PRIMARY_DARK = "#0f2440";
const ACCENT = "#c9a84c";

const SITE_NAME = 'עו"ד גיא זומר';
const SITE_HOST = "z-g.co.il";

/* ─── Fonts ─── */

const FONT_DIR = join(process.cwd(), "assets", "og");

type LoadedFonts = { regular: Buffer; bold: Buffer; black: Buffer };

let fontsPromise: Promise<LoadedFonts> | null = null;

/** Heebo — read from disk once per process and reused for every banner. */
function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(join(FONT_DIR, "Heebo-Regular.ttf")),
    readFile(join(FONT_DIR, "Heebo-Bold.ttf")),
    readFile(join(FONT_DIR, "Heebo-Black.ttf")),
  ]).then(([regular, bold, black]) => ({ regular, bold, black }));
  return fontsPromise;
}

function toArrayBuffer(buf: Buffer) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/* ─── Layout constants ─── */

const CONTENT_WIDTH = 1010; // canvas minus padding and the gold spine

/* ─── Banner ─── */

export type OgBanner = {
  /** Big headline — normally the page's own <h1>. */
  title: string;
  /** One supporting line. Keep it short: this is a thumbnail. */
  subtitle?: string;
  /** Small gold label above the title (section / content type). */
  kicker?: string;
  /** Up to three short chips along the bottom (counts, courts, dates). */
  tags?: string[];
};

/** Long titles step down in size rather than break the layout. */
function titleSize(text: string) {
  if (text.length <= 26) return 84;
  if (text.length <= 44) return 72;
  if (text.length <= 70) return 60;
  if (text.length <= 100) return 50;
  return 42;
}

export async function renderOgBanner({ title, subtitle, kicker, tags }: OgBanner) {
  const fonts = await loadFonts();

  const fontSize = titleSize(title.trim());
  // The home/about banners use the name itself as the headline; repeating it
  // in the masthead just reads as a stutter.
  const showMasthead = title.trim() !== SITE_NAME;
  const titleLines = wrapVisual(title, {
    font: fonts.black,
    fontSize,
    maxWidth: CONTENT_WIDTH,
    maxLines: 3,
  });
  const subtitleLines = subtitle
    ? wrapVisual(subtitle, { font: fonts.regular, fontSize: 30, maxWidth: CONTENT_WIDTH, maxLines: 2 })
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "58px 78px 58px 72px",
          backgroundColor: PRIMARY,
          backgroundImage: `linear-gradient(135deg, ${PRIMARY_DARK} 0%, ${PRIMARY} 55%, ${PRIMARY_DARK} 100%)`,
          fontFamily: "Heebo",
          position: "relative",
        }}
      >
        {/* gold spine along the right edge — the RTL reading edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: OG_SIZE.width - 14,
            width: 14,
            height: OG_SIZE.height,
            backgroundColor: ACCENT,
            display: "flex",
          }}
        />
        {/* soft accent glow, bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: -190,
            left: -150,
            width: 470,
            height: 470,
            borderRadius: 470,
            backgroundColor: "rgba(201,168,76,0.12)",
            display: "flex",
          }}
        />

        {/* ── masthead (right-aligned) — dropped when the name is the headline ── */}
        <div
          style={{
            display: showMasthead ? "flex" : "none",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 44,
              height: 6,
              borderRadius: 6,
              marginRight: 18,
              backgroundColor: ACCENT,
            }}
          />
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#ffffff" }}>
            {toVisual(SITE_NAME)}
          </div>
        </div>

        {/* ── headline block — centred in whatever space is left ── */}
        <div
          style={{
            display: "flex",
            flexGrow: 1,
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {kicker ? (
            <div style={{ display: "flex", fontSize: 27, fontWeight: 700, color: ACCENT, marginBottom: 16 }}>
              {toVisual(kicker)}
            </div>
          ) : null}
          {titleLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize,
                lineHeight: 1.22,
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: -0.5,
              }}
            >
              {line}
            </div>
          ))}
          {subtitleLines.length ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: 20 }}>
              {subtitleLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    fontSize: 30,
                    lineHeight: 1.42,
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* ── footer: chips on the left, domain on the right ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {(tags ?? []).slice(0, 3).map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.85)",
                  padding: "8px 20px",
                  marginRight: 12,
                  borderRadius: 999,
                  border: "2px solid rgba(201,168,76,0.55)",
                }}
              >
                {toVisual(tag)}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: ACCENT }}>{SITE_HOST}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Heebo", data: toArrayBuffer(fonts.regular), weight: 400, style: "normal" },
        { name: "Heebo", data: toArrayBuffer(fonts.bold), weight: 700, style: "normal" },
        { name: "Heebo", data: toArrayBuffer(fonts.black), weight: 900, style: "normal" },
      ],
    },
  );
}
