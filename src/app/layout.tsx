import type { Metadata } from "next";
import Script from "next/script";
import { Heebo } from "next/font/google";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/json-ld";
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
    default: "עו\"ד זומר",
    template: "%s | עו\"ד זומר",
  },
  description:
    "עו\"ד זומר - ייצוג משפטי מקצועי, ליווי משפטי מקיף. התמחות בדין פלילי, ליווי חשודים ונאשמים בכל הערכאות.",
  keywords: ["עורך דין", "עורך דין פלילי", "ייעוץ משפטי", "זומר"],
  authors: [{ name: "עו\"ד גיא זומר" }],
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "עו\"ד זומר",
    title: "עו\"ד זומר",
    description: "עו\"ד זומר - ייצוג משפטי מקצועי",
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
        {children}
      </body>
    </html>
  );
}
