import Link from "next/link";
import type { Metadata } from "next";
import SeoAudit from "@/components/SeoAudit";

export const metadata: Metadata = {
  title: "Free SEO Audit Tool",
  description: "Audit a website for on-page SEO, technical SEO, content, social metadata, HTTPS and basic performance signals.",
  alternates: { canonical: "/seo-audit" },
};

export default function SeoAuditPage() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="WHOIS CHOICE home">
            <img src="/whoischoice-logo.png" alt="Whois Choice" className="brand-logo" />
          </Link>
          <Link href="/" className="tool-back">← Domain Checker</Link>
        </div>
      </header>

      <main className="main-content">
        <section className="hero seo-hero">
          <span className="tool-eyebrow">FREE SEO TOOL</span>
          <h1>SEO Audit Tool</h1>
          <p>Check your website's SEO health and find issues worth fixing.</p>
          <SeoAudit />
        </section>
      </main>

      <footer className="site-footer">
        Copyright 2026 <span>Whois Choice</span>. All Right Reserved.
      </footer>
    </div>
  );
}
