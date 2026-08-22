import Link from "next/link";
import DomainSearch from "@/components/DomainSearch";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand" aria-label="WHOIS CHOICE">
            <img
              src="/whoischoice-logo.png"
              alt="Whois Choice"
              className="brand-logo"
            />
          </div>
          <Link href="/seo-audit" className="header-tool-link">SEO Audit Tool ↗</Link>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <h1>Domain Checker</h1>
          <p>Find your perfect domain name</p>
          <DomainSearch />
        </section>
      </main>

      <footer className="site-footer">
        Copyright 2026 <span>Whois Choice</span>. All Right Reserved.
      </footer>
    </div>
  );
}
