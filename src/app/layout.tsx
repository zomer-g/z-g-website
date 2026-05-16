import type { Metadata } from "next";
import Script from "next/script";
import { Heebo } from "next/font/google";
import { AttorneySchema, OrganizationSchema, WebSiteSchema } from "@/components/seo/json-ld";
import { Providers } from "@/components/providers";
import { getPageContent } from "@/lib/content";
import type { SiteSeoContent } from "@/types/content";
import "./globals.css";

const GA_ID = "G-W3B12VYHCK";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

/* ─── Site-wide metadata (sourced from CMS — editable in /admin/site-editor/site-seo) ─── */

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageContent<SiteSeoContent>("site-seo");
  return {
    metadataBase: new URL(process.env.SITE_URL || "https://z-g.co.il"),
    title: {
      default: seo.defaultTitle,
      template: seo.titleTemplate,
    },
    description: seo.description,
    applicationName: "עו\"ד גיא זומר",
    authors: [{ name: "עו\"ד גיא זומר", url: "https://z-g.co.il/about" }],
    creator: "עו\"ד גיא זומר",
    publisher: "עו\"ד גיא זומר",
    keywords: seo.keywords,
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
      title: seo.defaultTitle,
      description: seo.ogDescription,
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
      title: seo.defaultTitle,
      description: seo.twitterDescription,
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
}

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
