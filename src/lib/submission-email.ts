/**
 * Emails each contact-form submission to the office, so a message is seen
 * without opening /admin/submissions. Reply-To is the sender, so answering
 * the email answers them directly.
 *
 * xhostd blocks outbound SMTP (smtp.gmail.com:465 timed out from prod,
 * 3.10.2026), so mail goes over HTTPS to a Google Apps Script web app in the
 * owner's account, which sends it with MailApp from their Gmail. The script
 * (scripts/submission-mail-relay.gs) hard-codes the recipient, so the shared
 * secret can only ever mail the office, never anyone else. Env:
 *   SUBMISSION_MAIL_RELAY_URL     the web app's /exec URL
 *   SUBMISSION_MAIL_RELAY_SECRET  shared secret, also in the script (secret)
 * If either is missing the email is skipped and the submission is still
 * saved — a mail failure must never lose a message or fail the form.
 */

interface Submission {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  createdAt: Date;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Header values must stay on one line; the form fields are free text.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export async function emailSubmission(s: Submission): Promise<void> {
  const url = process.env.SUBMISSION_MAIL_RELAY_URL;
  const secret = process.env.SUBMISSION_MAIL_RELAY_SECRET;
  if (!url || !secret) {
    console.warn("[submission-email] SUBMISSION_MAIL_RELAY_URL / _SECRET not set; skipped");
    return;
  }

  const name = oneLine(s.name);
  const subjectLine = oneLine(s.subject || "") || "ללא נושא";
  const when = s.createdAt.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  const adminUrl = `${process.env.SITE_URL ?? "https://www.z-g.co.il"}/admin/submissions`;

  const rows: [string, string][] = [
    ["שם", name],
    ["אימייל", s.email],
    ...(s.phone ? ([["טלפון", oneLine(s.phone)]] as [string, string][]) : []),
    ["נושא", subjectLine],
    ["התקבלה", when],
  ];

  const text =
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\n${s.message}\n\n---\nהשיבו למייל הזה כדי לענות ישירות לפונה.\n${adminUrl}`;

  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a202c">
<table style="border-collapse:collapse;margin-bottom:16px">
${rows.map(([k, v]) => `<tr><td style="padding:2px 0 2px 12px;color:#64748b">${esc(k)}</td><td style="padding:2px 0">${esc(v)}</td></tr>`).join("\n")}
</table>
<div style="white-space:pre-wrap;border-right:3px solid #c9a84c;padding-right:12px">${esc(s.message)}</div>
<p style="margin-top:20px;font-size:13px;color:#64748b">השיבו למייל הזה כדי לענות ישירות לפונה. כל הפניות: <a href="${esc(adminUrl)}">${esc(adminUrl)}</a></p>
</div>`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        replyTo: s.email,
        subject: `פנייה חדשה מהאתר: ${subjectLine} (${name})`,
        text,
        html,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const out = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !out?.ok) {
      console.error(`[submission-email] relay refused submission ${s.id}: ${res.status} ${out?.error ?? ""}`);
    }
  } catch (err) {
    console.error(`[submission-email] failed for submission ${s.id}:`, err);
  }
}
