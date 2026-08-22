import type { Metadata } from "next";
import Script from "next/script";
import { Heebo } from "next/font/google";
import { AttorneySchema, OrganizationSchema, WebSiteSchema } from "@/components/seo/json-ld";
import { Providers } from "@/components/providers";
import { SITE_ORIGIN, absoluteUrl } from "@/lib/site";
import ConsoleGreeting from "@/components/console-greeting";
import "./globals.css";

const GA_ID = "G-W3B12VYHCK";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  // Not process.env.SITE_URL — that was set to the Render host and made every
  // canonical on the site point at z-g-website.onrender.com. See lib/site.ts.
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "עו\"ד גיא זומר — עורך דין פלילי וחופש מידע",
    template: "%s | עו\"ד גיא זומר",
  },
  description:
    "עו\"ד גיא זומר — עורך דין פלילי וחופש מידע. ייצוג חשודים, נאשמים ונפגעי עבירה, עתירות חופש מידע, ולשון הרע. מפעיל את מאגר ההנחיות הציבורי, מאגר פסקי דין בלשון הרע ומאגר פסקי דין בחופש מידע.",
  applicationName: "עו\"ד גיא זומר",
  authors: [{ name: "עו\"ד גיא זומר", url: absoluteUrl("/about") }],
  creator: "עו\"ד גיא זומר",
  publisher: "עו\"ד גיא זומר",
  keywords: [
    "גיא זומר",
    "עו\"ד גיא זומר",
    "עורך דין גיא זומר",
    "זומר עורך דין",
    "עורך דין פלילי",
    "עו\"ד פלילי",
    "חופש מידע",
    "עתירת חופש מידע",
    "מאגר הנחיות",
    "הנחיות יועמ\"ש",
    "הנחיות פרקליט המדינה",
    "לשון הרע",
    "פסקי דין לשון הרע",
    "ייעוץ לפני חקירה",
    "ייצוג נפגעי עבירה",
    "Guy Zomer",
    "Zomer Law",
  ],
  alternates: {
    // "./" — relative, NOT "/". This is the whole fix. An absolute "/" here is
    // inherited verbatim by every page that does not override it, and 45 of the
    // 67 public pages did not: /about, /articles, /contact and the rest each
    // declared itself a duplicate of the homepage and asked Google not to rank
    // it. Next resolves a RELATIVE canonical against the current page, so the
    // same one line now gives every page a correct self-canonical, and pages
    // that set their own still win.
    canonical: "./",
  },
  // No title/description/url here on purpose: whatever this block sets is
  // inherited verbatim by every page that doesn't define its own openGraph,
  // which is how each URL ended up sharing as the generic site blurb. Left
  // unset, Next fills og:/twitter: title and description from the page's own
  // `title` + `description`.
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "עו\"ד גיא זומר",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "law",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <head>
        {/*
          Site-wide ?view=clean detector. Runs synchronously in <head>
          BEFORE any DOM paints so we avoid a flash of the header/footer
          before they're hidden. Adds `view-clean` to <html>; the CSS
          rule in globals.css then hides chrome on every page.
          Recognised values mirror the per-page check in /whatsapp/[slug]
          and /timeline/[slug]: clean, 0, embed, raw.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var v=new URLSearchParams(location.search).get('view');if(v&&/^(clean|0|embed|raw)$/i.test(v)){document.documentElement.classList.add('view-clean');}}catch(e){}})();",
          }}
        />
        {/*
          afterInteractive, deliberately — do not move this to lazyOnload.
          It was tried: gtag.js is 166 KB and starting it the moment hydration
          ends does compete for the main thread, but deferring it to browser
          idle bought only ~60 ms of desktop blocking time and nothing at all
          on mobile, where it still burned ~1,090 ms inside the measurement
          window. What it did buy was a window in which a reader on a slow
          connection can leave before the tag has loaded, and that pageview is
          simply never recorded. Analytics completeness is worth more than
          60 ms; the blocking time is being paid down by shipping less of our
          own JavaScript instead.
        */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body className="font-heebo antialiased min-h-screen flex flex-col">
        <OrganizationSchema />
        <WebSiteSchema />
        <AttorneySchema />
        <a
          href="#main-content"
          className="skip-link"
          aria-label="מעבר לתוכן הראשי"
        >
          מעבר לתוכן הראשי
        </a>
        <ConsoleGreeting />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
