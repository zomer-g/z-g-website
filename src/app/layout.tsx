import type { Metadata } from "next";
import Script from "next/script";
import { Heebo } from "next/font/google";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/json-ld";
import { Providers } from "@/components/providers";
import "./globals.css";

const GA_ID = "G-W3B12VYHCK";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: {
    default: "עו\"ד גיא זומר - Zomer",
    template: "%s | עו\"ד גיא זומר",
  },
  description:
    "עו\"ד גיא זומר - עורך דין פלילי. ייצוג משפטי מקצועי, ליווי חשודים ונאשמים בכל הערכאות. משפט פלילי, שקיפות ציבורית וטכנולוגיה.",
  keywords: ["גיא זומר", "עורך דין גיא זומר", "עורך דין פלילי", "עו\"ד זומר", "ייעוץ משפטי", "זומר", "Guy Zomer"],
  authors: [{ name: "עו\"ד גיא זומר" }],
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "עו\"ד גיא זומר",
    title: "עו\"ד גיא זומר - Zomer",
    description: "עו\"ד גיא זומר - עורך דין פלילי. ייצוג משפטי מקצועי עם גישה שמשלבת מקצועיות, טכנולוגיה ואנושיות.",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <head>
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
        <a
          href="#main-content"
          className="skip-link"
          aria-label="דלג לתוכן הראשי"
        >
          דלג לתוכן הראשי
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
