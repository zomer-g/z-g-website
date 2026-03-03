import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/json-ld";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: {
    default: "זומר - משרד עורכי דין",
    template: "%s | זומר - משרד עורכי דין",
  },
  description:
    "משרד עורכי דין זומר - ייצוג משפטי מקצועי, ליווי עסקי ומשפטי מקיף. מומחיות בדיני חברות, מסחרי, נדל\"ן ועוד.",
  keywords: ["עורך דין", "משרד עורכי דין", "ייעוץ משפטי", "זומר"],
  authors: [{ name: "משרד עורכי דין זומר" }],
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "זומר - משרד עורכי דין",
    title: "זומר - משרד עורכי דין",
    description: "משרד עורכי דין זומר - ייצוג משפטי מקצועי",
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
