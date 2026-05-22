import type { Metadata } from "next";
import Script from "next/script";
import { Heebo } from "next/font/google";
import { AttorneySchema, OrganizationSchema, WebSiteSchema } from "@/components/seo/json-ld";
import { Providers } from "@/components/providers";
import "./globals.css";

const GA_ID = "G-W3B12VYHCK";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://z-g.co.il"),
  title: {
    default: "עו\"ד גיא זומר — עורך דין פלילי וחופש מידע",
    template: "%s | עו\"ד גיא זומר",
  },
  description:
    "עו\"ד גיא זומר — עורך דין פלילי וחופש מידע. ייצוג חשודים, נאשמים ונפגעי עבירה, עתירות חופש מידע, ולשון הרע. מפעיל את מאגר ההנחיות הציבורי, מאגר פסקי דין בלשון הרע ומאגר פסקי דין בחופש מידע.",
  applicationName: "עו\"ד גיא זומר",
  authors: [{ name: "עו\"ד גיא זומר", url: "https://z-g.co.il/about" }],
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
    canonical: "/",
    languages: {
      he: "/",
      "he-IL": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://z-g.co.il",
    siteName: "עו\"ד גיא זומר",
    title: "עו\"ד גיא זומר — עורך דין פלילי וחופש מידע",
    description:
      "עו\"ד גיא זומר — עורך דין פלילי וחופש מידע. מפעיל את מאגר ההנחיות הציבורי הגדול בישראל, מאגר פסקי דין בלשון הרע ומאגר פסקי דין בחופש מידע.",
    images: [
      {
        url: "/images/guy-zomer.jpg",
        width: 1200,
        height: 1600,
        alt: "עו\"ד גיא זומר",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "עו\"ד גיא זומר — עורך דין פלילי וחופש מידע",
    description:
      "ייצוג בפלילי וחופש מידע. מפעיל את מאגר ההנחיות הציבורי, מאגר פסקי דין בלשון הרע ומאגר פסקי דין בחופש מידע.",
    images: ["/images/guy-zomer.jpg"],
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
