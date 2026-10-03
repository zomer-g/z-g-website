import nodemailer from "nodemailer";

/**
 * Emails each contact-form submission to the office, so a message is seen
 * without opening /admin/submissions. Reply-To is the sender, so answering
 * the email answers them directly.
 *
 * Sent through Gmail SMTP with an app password (not the account password —
 * revocable at myaccount.google.com/apppasswords). Env:
 *   SMTP_USER           the Gmail address that sends (zomerg@gmail.com)
 *   SMTP_APP_PASSWORD   its 16-character app password (secret)
 *   SUBMISSION_NOTIFY_TO  where submissions go (guy@z-g.co.il)
 * If any is missing the email is skipped and the submission is still saved —
 * a mail failure must never lose a message or fail the form.
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

let transporter: nodemailer.Transporter | null = null;

function getTransporter(user: string, pass: string) {
  transporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Header values must stay on one line; the form fields are free text.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export async function emailSubmission(s: Submission): Promise<void> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  const to = process.env.SUBMISSION_NOTIFY_TO;
  if (!user || !pass || !to) {
    console.warn("[submission-email] SMTP_USER / SMTP_APP_PASSWORD / SUBMISSION_NOTIFY_TO not set; skipped");
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
    await getTransporter(user, pass).sendMail({
      from: { name: "פנייה מהאתר z-g.co.il", address: user },
      to,
      replyTo: { name, address: s.email },
      subject: `פנייה חדשה מהאתר: ${subjectLine} (${name})`,
      text,
      html,
    });
  } catch (err) {
    console.error(`[submission-email] failed for submission ${s.id}:`, err);
  }
}
