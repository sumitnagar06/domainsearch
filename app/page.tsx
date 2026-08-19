import DomainSearch from "@/components/DomainSearch";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand" aria-label="WHOIS CHOICE">
            <div className="brand-mark" aria-hidden="true">
              <span className="globe">◎</span>
              <span className="magnifier" />
            </div>
            <div className="brand-text">
              <span className="whois">WHOIS</span>
              <span className="choice">CHOICE</span>
            </div>
          </div>
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
