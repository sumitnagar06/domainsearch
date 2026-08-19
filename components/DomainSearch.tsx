"use client";

import { FormEvent, useState } from "react";

type Result = {
  domain: string;
  available: boolean;
  source: string;
  rdap?: {
    registrar?: string;
    created?: string;
    updated?: string;
    expires?: string;
    status?: string[];
    nameservers?: string[];
    dnssec?: string;
  } | null;
};

export default function DomainSearch() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!domain.trim()) {
      setError("Please enter a domain name.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/domain/search?domain=${encodeURIComponent(domain)}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="search-area">
      <form className="search-box" onSubmit={search}>
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Enter domain name (e.g. example.com)"
          aria-label="Domain name"
          autoComplete="off"
        />
        <button type="submit" disabled={loading}>
          <span className="search-icon" aria-hidden="true" />
          {loading ? "Checking..." : "Search"}
        </button>
      </form>

      <div className="helper">
        <span className="info-icon">i</span>
        Enter a domain name to check availability and domain information
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result-card">
          <div className="result-heading">
            <div className={`check-circle ${result.available ? "ok" : "taken"}`}>
              {result.available ? "✓" : "!"}
            </div>
            <div>
              <h2>{result.domain}</h2>
              <div className={`availability ${result.available ? "green" : "red"}`}>
                {result.available
                  ? "Domain Available Now!"
                  : "Domain Already Registered"}
              </div>
            </div>
          </div>

          {result.available ? (
            <div className="notice available-notice">
              <div className="notice-icon">♧</div>
              <div>
                <strong>Good news! This domain is available for registration.</strong>
                <p>Register it before someone else does.</p>
              </div>
              <button type="button" className="register-btn">
                Register Domain <span>↗</span>
              </button>
            </div>
          ) : null}

          {!result.available && result.rdap && (
            <div className="info-panel">
              <h3><span className="doc-icon">▤</span> Domain Information</h3>
              <div className="info-grid">
                <Info label="Registrar" value={result.rdap.registrar} />
                <Info label="Status" value={result.rdap.status?.join(", ")} green />
                <Info label="Created Date" value={formatDate(result.rdap.created)} />
                <Info label="Nameservers" value={result.rdap.nameservers?.join(", ")} />
                <Info label="Updated Date" value={formatDate(result.rdap.updated)} />
                <Info label="DNSSEC" value={result.rdap.dnssec} />
                <Info label="Expiry Date" value={formatDate(result.rdap.expires)} />
              </div>
            </div>
          )}

          {result.available && (
            <div className="info-panel">
              <h3><span className="doc-icon">▤</span> Domain Information</h3>
              <div className="info-grid">
                <Info label="Registrar" value="N/A" />
                <Info label="Status" value="available" green />
                <Info label="Created Date" value="N/A" />
                <Info label="Nameservers" value="N/A" />
                <Info label="Updated Date" value="N/A" />
                <Info label="DNSSEC" value="N/A" />
                <Info label="Expiry Date" value="N/A" />
              </div>
              <div className="status-note">
                <span className="info-icon">i</span>
                This domain is currently available for registration.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  green
}: {
  label: string;
  value?: string;
  green?: boolean;
}) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong className={green ? "green-text" : ""}>{value || "N/A"}</strong>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}
