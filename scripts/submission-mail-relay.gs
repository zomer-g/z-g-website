/**
 * Google Apps Script mail relay for the z-g.co.il contact form.
 * Lives in the site owner's Google account (script.google.com), deployed as a
 * Web app: Execute as = Me, Who has access = Anyone. The site
 * (src/lib/submission-email.ts) POSTs each submission here over HTTPS,
 * because the host blocks outbound SMTP.
 *
 * Safety: the recipient is fixed below, so even a leaked secret can only send
 * mail to the office. The secret is a Script Property named SECRET
 * (Project Settings → Script properties), never written in this file.
 */

const TO = "guy@z-g.co.il";
const FROM_NAME = "פנייה מהאתר z-g.co.il";

function doPost(e) {
  const reply = (obj) =>
    ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  try {
    const secret = PropertiesService.getScriptProperties().getProperty("SECRET");
    const body = JSON.parse(e.postData.contents);
    if (!secret || body.secret !== secret) return reply({ ok: false, error: "unauthorized" });

    const replyTo = String(body.replyTo || "");
    if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(replyTo)) return reply({ ok: false, error: "bad replyTo" });

    MailApp.sendEmail({
      to: TO,
      replyTo: replyTo,
      name: FROM_NAME,
      subject: String(body.subject || "פנייה חדשה מהאתר").replace(/[\r\n]+/g, " ").slice(0, 250),
      body: String(body.text || ""),
      htmlBody: String(body.html || ""),
    });
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}
