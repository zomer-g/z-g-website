/**
 * JSON-LD Structured Data Components
 *
 * Server components that render Schema.org structured data
 * for SEO and LLM optimization. Designed for a Hebrew RTL
 * criminal law attorney website.
 */

const SITE_URL = "https://z-g.co.il";
const FIRM_NAME_HE = "עו\"ד גיא זומר";
const FIRM_NAME_EN = "Advocate Guy Zomer";
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
      "עו\"ד זומר - ייצוג משפטי מקצועי בתחום הפלילי. התמחות בייעוץ לפני חקירה, ליווי נפגעי עבירה, עבירות אלימות, סמים, רכוש והונאה.",
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
      "ייעוץ לפני חקירה",
      "ליווי נפגעי עבירה",
      "עתירות חופש מידע",
      "ייצוג בחקירות סמים",
      "עבירות אלימות",
      "עבירות רכוש והונאה",
      "תיקים מורכבים",
      "בקשות שינוי עילת סגירת תיק",
      "עבירות צווארון לבן",
      "עבירות מין",
      "Criminal Defense",
      "Pre-Investigation Consultation",
      "Crime Victim Representation",
      "Drug Offenses Defense",
      "Violence Offenses",
      "White Collar Crime",
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
            name: "ייעוץ לפני חקירה",
            description: "הכנה מקצועית וייעוץ משפטי חיוני לפני מפגש עם רשויות החקירה.",
            url: `${SITE_URL}/services/preinvestigationadvice`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "ליווי נפגעי עבירה",
            description: "ליווי נפגעי עבירה לרבות עררים על החלטות לסגירת תיק.",
            url: `${SITE_URL}/services/victims`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "עבירות אלימות",
            description: "הגנה משפטית מקצועית בעבירות אלימות ואלימות במשפחה.",
            url: `${SITE_URL}/services/violenceoffenses`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "חקירת סמים",
            description: "ייצוג מקצועי בחקירות סמים — הגנה על זכויותיכם מהרגע הראשון.",
            url: `${SITE_URL}/services/druginvestigation`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "רכוש והונאה",
            description: "ייצוג בעבירות גניבה, מעילה ועבירות רכוש נוספות.",
            url: `${SITE_URL}/services/propertyoffenses`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "תיקים מורכבים",
            description: "ייעוץ וליווי תיקים מורכבים.",
            url: `${SITE_URL}/services/complexcases`,
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
    jobTitle: "עורך דין פלילי",
    description:
      "עו\"ד גיא זומר, בעל ניסיון עשיר בתחום המשפט הפלילי. מלווה חשודים ונאשמים בכל שלבי ההליך הפלילי.",
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
      "משפט פלילי",
      "ייעוץ לפני חקירה",
      "ליווי נפגעי עבירה",
      "עבירות אלימות",
      "עבירות סמים",
      "עבירות רכוש",
      "חופש מידע",
      "Criminal Defense",
      "Pre-Investigation Consultation",
      "Freedom of Information",
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
      "עו\"ד זומר - ייצוג משפטי מקצועי בתחום הפלילי. התמחות בייעוץ לפני חקירה, ליווי נפגעי עבירה, עבירות אלימות, סמים, רכוש והונאה.",
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
