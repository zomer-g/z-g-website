/**
 * JSON-LD Structured Data Components
 *
 * Server components that render Schema.org structured data
 * for SEO and LLM optimization. Designed for a Hebrew RTL
 * corporate law firm website.
 */

const SITE_URL = "https://z-g.co.il";
const FIRM_NAME_HE = "משרד עורכי דין זומר";
const FIRM_NAME_EN = "Zomer Law Office";
const ATTORNEY_NAME_HE = "עו\"ד גיא זומר";
const ATTORNEY_NAME_EN = "Guy Zomer";
const PHONE = "+972-3-000-0000";
const EMAIL = "info@zomer-law.co.il";
const ADDRESS_STREET = "רחוב הברזל 30";
const ADDRESS_CITY = "תל אביב";
const ADDRESS_COUNTRY = "IL";
const LOGO_URL = `${SITE_URL}/images/logo.png`;

/* ─── Base Component ─── */

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 0) }}
    />
  );
}

/* ─── Organization / LegalService Schema ─── */

export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": `${SITE_URL}/#organization`,
    name: FIRM_NAME_HE,
    alternateName: FIRM_NAME_EN,
    url: SITE_URL,
    logo: LOGO_URL,
    image: LOGO_URL,
    description:
      "משרד עורכי דין זומר - ייצוג משפטי מקצועי, ליווי עסקי ומשפטי מקיף. מומחיות בדיני חברות, מסחרי, נדל\"ן ועוד.",
    telephone: PHONE,
    email: EMAIL,
    foundingDate: "2020",
    founder: {
      "@type": "Person",
      name: ATTORNEY_NAME_HE,
      alternateName: ATTORNEY_NAME_EN,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS_STREET,
      addressLocality: ADDRESS_CITY,
      addressCountry: ADDRESS_COUNTRY,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 32.0853,
      longitude: 34.7818,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
      opens: "08:30",
      closes: "18:00",
    },
    priceRange: "$$",
    areaServed: {
      "@type": "Country",
      name: "Israel",
    },
    serviceType: [
      "דיני חברות",
      "נדל\"ן ומקרקעין",
      "ליטיגציה ויישוב סכסוכים",
      "דיני עבודה",
      "קניין רוחני",
      "דיני מסים",
      "Corporate Law",
      "Real Estate Law",
      "Litigation",
      "Labor Law",
      "Intellectual Property",
      "Tax Law",
    ],
    knowsLanguage: ["he", "en"],
    sameAs: [],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "שירותים משפטיים",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "דיני חברות",
            description:
              "ייעוץ וליווי משפטי מקיף לחברות בכל שלבי החיים העסקיים — הקמה, מיזוגים ורכישות, ממשל תאגידי, הסכמי מייסדים והסכמי השקעה.",
            url: `${SITE_URL}/services/corporate-law`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "נדל\"ן",
            description:
              "ליווי עסקאות נדל\"ן מורכבות, ייצוג בפני רשויות התכנון, הסכמי שכירות מסחריים, פרויקטים של התחדשות עירונית ותמ\"א 38.",
            url: `${SITE_URL}/services/real-estate`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "ליטיגציה",
            description:
              "ייצוג בהליכים משפטיים בבתי המשפט בכל הערכאות, גישור ובוררות, סכסוכים מסחריים, תביעות נגזרות ותובענות ייצוגיות.",
            url: `${SITE_URL}/services/litigation`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "דיני עבודה",
            description:
              "ייעוץ למעסיקים ועובדים בכל היבטי דיני העבודה — חוזי העסקה, סיום יחסי עבודה, הסכמים קיבוציים ומשא ומתן מול ועדי עובדים.",
            url: `${SITE_URL}/services/labor-law`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "קניין רוחני",
            description:
              "הגנה על פטנטים, סימני מסחר, זכויות יוצרים וסודות מסחריים. ליווי בהסכמי רישיון, הפרות קניין רוחני והגנה על מותגים.",
            url: `${SITE_URL}/services/intellectual-property`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "דיני מסים",
            description:
              "תכנון מס אסטרטגי, ייצוג בהליכי שומה, חוות דעת מיסוייות, מיסוי בינלאומי, מיסוי מקרקעין ומיסוי עסקאות מורכבות.",
            url: `${SITE_URL}/services/tax-law`,
          },
        },
      ],
    },
  };

  return <JsonLd data={data} />;
}

/* ─── Attorney / Person Schema ─── */

export function AttorneySchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#attorney`,
    name: ATTORNEY_NAME_HE,
    alternateName: ATTORNEY_NAME_EN,
    jobTitle: "עורך דין, מייסד ומנהל המשרד",
    description:
      "עורך הדין גיא זומר הוא מייסד ומנהל משרד עורכי דין זומר. בעל ניסיון עשיר בתחומי המשפט המסחרי, דיני חברות ונדל\"ן.",
    url: `${SITE_URL}/about`,
    image: `${SITE_URL}/images/attorney-guy-zomer.jpg`,
    telephone: PHONE,
    email: EMAIL,
    alumniOf: {
      "@type": "EducationalOrganization",
      name: "אוניברסיטת תל אביב",
      alternateName: "Tel Aviv University",
      department: "הפקולטה למשפטים",
    },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "LL.B",
      recognizedBy: {
        "@type": "Organization",
        name: "לשכת עורכי הדין בישראל",
        alternateName: "Israel Bar Association",
      },
    },
    memberOf: {
      "@type": "Organization",
      name: "לשכת עורכי הדין בישראל",
      alternateName: "Israel Bar Association",
    },
    worksFor: {
      "@type": "LegalService",
      "@id": `${SITE_URL}/#organization`,
      name: FIRM_NAME_HE,
    },
    knowsAbout: [
      "דיני חברות",
      "נדל\"ן ומקרקעין",
      "ליטיגציה ויישוב סכסוכים",
      "ממשל תאגידי",
      "מיזוגים ורכישות",
      "Corporate Law",
      "Real Estate Law",
      "Litigation",
      "M&A",
    ],
    knowsLanguage: ["he", "en"],
  };

  return <JsonLd data={data} />;
}

/* ─── Article Schema ─── */

interface ArticleSchemaProps {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  url: string;
  authorName?: string;
  category?: string;
}

export function ArticleSchema({
  title,
  description,
  datePublished,
  dateModified,
  url,
  authorName = ATTORNEY_NAME_HE,
  category,
}: ArticleSchemaProps) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished,
    dateModified: dateModified ?? datePublished,
    url: url.startsWith("http") ? url : `${SITE_URL}${url}`,
    inLanguage: "he",
    author: {
      "@type": "Person",
      name: authorName,
      url: `${SITE_URL}/about`,
    },
    publisher: {
      "@type": "LegalService",
      "@id": `${SITE_URL}/#organization`,
      name: FIRM_NAME_HE,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url.startsWith("http") ? url : `${SITE_URL}${url}`,
    },
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
    },
  };

  if (category) {
    data.articleSection = category;
  }

  return <JsonLd data={data} />;
}

/* ─── Breadcrumb Schema ─── */

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };

  return <JsonLd data={data} />;
}

/* ─── FAQ Schema ─── */

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSchema({ items }: { items: FAQItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return <JsonLd data={data} />;
}

/* ─── WebSite Schema with SearchAction ─── */

export function WebSiteSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: FIRM_NAME_HE,
    alternateName: FIRM_NAME_EN,
    url: SITE_URL,
    inLanguage: "he",
    description:
      "משרד עורכי דין זומר - ייצוג משפטי מקצועי, ליווי עסקי ומשפטי מקיף. מומחיות בדיני חברות, מסחרי, נדל\"ן ועוד.",
    publisher: {
      "@type": "LegalService",
      "@id": `${SITE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/articles?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd data={data} />;
}
