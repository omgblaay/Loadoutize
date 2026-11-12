import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@/styles/index.css";

const TITLE = "Modern Warfare 4 Loadouts & Best Class Setups | Loadoutize";
const DESCRIPTION =
  "Build, rate, and share the best Modern Warfare 4 loadouts. Browse top class setups, weapon builds, and attachments from the Loadoutize community.";
const SITE_URL = "https://loadoutize.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icon-512.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icon-512.png"],
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Loadoutize",
      url: `${SITE_URL}/`,
      description: "Build, rate, and share elite game loadouts.",
    },
    {
      "@type": "VideoGame",
      name: "Call of Duty: Modern Warfare 4",
      releaseDate: "2026-10-23T04:00:00Z",
      url: `${SITE_URL}/explore`,
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ background: "#0a0909", height: "100%" }}>
      <body style={{ height: "100%", margin: 0 }}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7KF2E0YCGF"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-7KF2E0YCGF');`}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div id="root" style={{ height: "100%" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
