import type { Metadata } from "next";
import {
  StaticPolicyShell,
  PolicyHeading,
  PolicyList,
  He,
} from "@/components/extension-pages/static-policy-shell";
import { ContactEmail } from "../contact";

// English twin of ../page.tsx: the text submitted with the Chrome Web Store
// listing. Change the two together.

export const metadata: Metadata = {
  title: "Privacy policy: the Magna Clipper browser extension",
  description:
    "Privacy policy of the Magna Clipper browser extension: what it sends, where, what it stores in the browser and what it does not collect.",
  alternates: {
    canonical: "/magna-clipper/privacy/en",
    languages: {
      he: "/magna-clipper/privacy",
      en: "/magna-clipper/privacy/en",
    },
  },
  robots: { index: true, follow: true },
};

const MAGNA = "https://www.magna.isa.gov.il";

export default function MagnaClipperPrivacyEnPage() {
  return (
    <StaticPolicyShell
      lang="en"
      title="Privacy policy: the Magna Clipper browser extension"
      updated="Last updated: 21 November 2026"
      otherLanguage={{ href: "/magna-clipper/privacy", label: "עברית", lang: "he" }}
    >
      <p>
        {`Magna Clipper is a browser extension that adds a "`}
        <He>שליחה לארכיון</He>
        {`" (send to archive) button to Magna, the public filings site of the Israel Securities Authority (`}
        <a href={MAGNA}>www.magna.isa.gov.il</a>
        {`). Clicking the button sends the filing or the search results on screen to the archive tool the user has been given access to. The extension runs on Magna only.`}
      </p>

      <PolicyHeading>What the extension sends, and when</PolicyHeading>
      <p>Only when the user clicks the button, and only what Magna is showing on that page:</p>
      <PolicyList>
        <li>On a filing page: the page&apos;s content (HTML) and its reference number.</li>
        <li>
          On search results: the result rows Magna displayed (reference, date, form, reporting
          entity, subject, file links).
        </li>
        <li>
          On a reporting entity&apos;s page: the entity&apos;s details and its list of latest
          filings, as Magna displayed them.
        </li>
      </PolicyList>
      <p>
        All of these are public filings published by Magna. Nothing is sent without a click,
        nothing is collected from other websites, and the extension never sends requests to Magna
        itself.
      </p>

      <PolicyHeading>Where it is sent</PolicyHeading>
      <p>
        Only to the archive tool whose address is set in the extension
        (https://ben-naftali-zomerg.xhostd.app), with the user&apos;s access token. The data is not
        sold, not transferred to third parties, and not used for advertising or creditworthiness.
        In the tool, every send is recorded in the activity log (who, when, what).
      </p>

      <PolicyHeading>What is stored in the browser</PolicyHeading>
      <p>
        {`Two values only, in the extension's local storage (chrome.storage.local) on the user's computer: the tool's address and an access token that the tool's administrator issued to the user. The token is sent only to that tool and only allows sending Magna filings to it; it cannot read anything from the tool. To delete it: "`}
        <He>מחיקת הטוקן</He>
        {`" (delete token) on the extension's settings page, or remove the extension.`}
      </p>

      <PolicyHeading>What the extension does not collect</PolicyHeading>
      <PolicyList>
        <li>
          browsing history, addresses of pages the user did not click on, or pages on other
          websites;
        </li>
        <li>personal details, passwords, cookies or payment information;</li>
        <li>usage data, analytics or tracking of any kind;</li>
        <li>reCAPTCHA tokens or any other part of the requests Magna&apos;s site sends.</li>
      </PolicyList>

      <PolicyHeading>Permissions</PolicyHeading>
      <PolicyList>
        <li>storage: keeps the tool&apos;s address and the token.</li>
        <li>
          Access to <a href={MAGNA}>www.magna.isa.gov.il</a>: shows the button and reads the
          filing on screen.
        </li>
        <li>Access to the tool&apos;s address: sends what the user clicked to send.</li>
      </PolicyList>

      <PolicyHeading>Contact</PolicyHeading>
      <p>
        Questions about the extension or privacy: <ContactEmail />
      </p>
    </StaticPolicyShell>
  );
}
