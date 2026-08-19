import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://www.whoischoice.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WHOIS CHOICE - Domain Checker | Check Domain Availability",
    template: "%s | WHOIS CHOICE",
  },
  description:
    "Check domain name availability instantly with WHOIS CHOICE. Search domains and view registration information with our fast domain checker.",
  keywords: [
    "domain checker",
    "domain availability checker",
    "domain search",
    "WHOIS lookup",
    "domain lookup",
    "check domain availability",
    "available domain",
    "domain registration",
    "WHOIS Choice",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "WHOIS CHOICE",
    title: "WHOIS CHOICE - Domain Checker | Check Domain Availability",
    description:
      "Check domain name availability instantly with WHOIS CHOICE. Search domains and view registration information with our fast domain checker.",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "WHOIS CHOICE - Domain Checker",
    description:
      "Check domain availability instantly and view domain registration information.",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070c12",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WHOIS CHOICE Domain Checker",
  url: siteUrl,
  description:
    "A domain availability checker for searching domain names and viewing registration information.",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  provider: {
    "@type": "Organization",
    name: "WHOIS CHOICE",
    url: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
