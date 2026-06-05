// Browser-only print utility for the conversation shells.
// Generates a clean Hebrew RTL print document from selected messages
// and opens it in a new window, triggering the print dialog.
//
// Call only from browser context (never in SSR/server components).

export interface PrintableMessage {
  id: string;
  timestamp: string;
  sender: string;
  text: string | null;
  title?: string | null;
  tags?: { name: string }[];
  sourceContact?: string; // present in merged/search views
  category?: string | null;
}

export interface PrintOptions {
  // Document heading
  title?: string;
  // Secondary line under the heading (e.g. case number)
  subtitle?: string;
  // Source description shown in the metadata line (e.g. "שיחה עם יוסי ברק")
  source?: string;
}

// Formats an ISO timestamp to a human-readable Hebrew date + time.
function fmtTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(messages: PrintableMessage[], opts: PrintOptions): string {
  const title    = opts.title    ?? "הודעות נבחרות";
  const subtitle = opts.subtitle ?? "";
  const source   = opts.source   ?? "";
  const printDate = new Date().toLocaleString("he-IL");

  const rows = messages.map((m, i) => {
    const ts      = fmtTs(m.timestamp);
    const tags    = (m.tags ?? []).map((t) => esc(t.name)).join(" · ");
    const srcLabel = m.sourceContact ? `<span class="src">[${esc(m.sourceContact)}]</span> ` : "";
    const titleHtml = m.title ? `<div class="msg-title">${esc(m.title)}</div>` : "";
    const bodyHtml  = m.text
      ? `<div class="msg-body">${esc(m.text).replace(/\n/g, "<br>")}</div>`
      : "";
    const tagsHtml  = tags ? `<div class="msg-tags">${tags}</div>` : "";

    return `
      <div class="msg" data-index="${i + 1}">
        <div class="msg-header">
          <span class="msg-sender">${srcLabel}${esc(m.sender)}</span>
          <span class="msg-time">${ts}</span>
        </div>
        ${titleHtml}${bodyHtml}${tagsHtml}
      </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 11pt; }
    body {
      font-family: "David", "Arial", "Helvetica Neue", sans-serif;
      line-height: 1.55;
      color: #111;
      direction: rtl;
      padding: 2cm 2.5cm;
      background: #fff;
    }
    h1 { font-size: 15pt; font-weight: bold; margin-bottom: 3pt; }
    .doc-sub  { font-size: 10.5pt; color: #444; margin-bottom: 3pt; }
    .doc-meta {
      font-size: 9pt; color: #777; padding-bottom: 10pt;
      border-bottom: 1.5px solid #bbb; margin-bottom: 16pt;
    }
    .msg {
      border: 1px solid #ccc;
      border-radius: 5pt;
      padding: 8pt 12pt;
      margin-bottom: 10pt;
      page-break-inside: avoid;
      position: relative;
    }
    .msg-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8pt;
      margin-bottom: 4pt;
    }
    .msg-sender { font-weight: bold; font-size: 10pt; }
    .msg-time   { font-size: 9pt; color: #666; white-space: nowrap; }
    .src        { color: #666; font-weight: normal; font-size: 9pt; }
    .msg-title  { font-weight: bold; font-size: 10.5pt; margin-bottom: 3pt; }
    .msg-body   { font-size: 10.5pt; white-space: pre-wrap; word-break: break-word; }
    .msg-tags   {
      margin-top: 6pt; font-size: 9pt; color: #555;
      border-top: 1px dashed #ddd; padding-top: 4pt;
    }
    .msg::before {
      content: attr(data-index);
      position: absolute;
      top: 6pt;
      left: 8pt;
      font-size: 8pt;
      color: #aaa;
    }
    @media print {
      body { padding: 1cm 1.5cm; }
      .msg { break-inside: avoid; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  ${subtitle ? `<div class="doc-sub">${esc(subtitle)}</div>` : ""}
  <div class="doc-meta">
    ${source ? `${esc(source)} · ` : ""}${messages.length} הודעות · הודפס: ${printDate}
  </div>
  ${rows}
</body>
</html>`;
}

/**
 * Opens a new browser window with a formatted print document and
 * triggers the print dialog after a short render delay.
 *
 * Gracefully no-ops when called server-side (window undefined) or
 * when the browser blocks the popup.
 */
export function printMessages(
  messages: PrintableMessage[],
  opts: PrintOptions = {},
): void {
  if (typeof window === "undefined") return;
  if (messages.length === 0) return;

  const html = buildHtml(messages, opts);
  const win  = window.open("", "_blank", "width=900,height=720,noopener");
  if (!win) {
    // Popup blocked — surface a brief alert so the user knows.
    alert("כדי להדפיס, יש לאפשר חלונות קופצים לאתר זה.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the browser a moment to render before opening the dialog.
  setTimeout(() => win.print(), 350);
}
