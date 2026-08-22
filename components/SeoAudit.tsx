"use client";

import { FormEvent, useMemo, useState } from "react";

type Status = "pass" | "warning" | "fail";
type Category = "On-Page SEO" | "Technical SEO" | "Content" | "Social" | "Performance" | "Security";

type Check = {
  id: string;
  title: string;
  status: Status;
  message: string;
  details?: string;
  category: Category;
};

type AuditResult = {
  url: string;
  finalUrl: string;
  score: number;
  checkedAt: string;
  responseTimeMs: number;
  statusCode: number;
  contentType: string;
  pageSize: number;
  checks: Check[];
  summary: { pass: number; warning: number; fail: number };
  counts: { words: number; headings: number; images: number; links: number; scripts: number; stylesheets: number };
};

const categories: Category[] = ["On-Page SEO", "Technical SEO", "Content", "Social", "Performance", "Security"];

export default function SeoAudit() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");

  async function audit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    setActiveCategory("All");

    if (!url.trim()) {
      setError("Please enter a website URL.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/seo-audit?url=${encodeURIComponent(url.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to audit this website.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const filteredChecks = useMemo(() => {
    if (!result) return [];
    return activeCategory === "All" ? result.checks : result.checks.filter((check) => check.category === activeCategory);
  }, [activeCategory, result]);

  return (
    <div className="seo-audit-area">
      <form className="seo-audit-search" onSubmit={audit}>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Enter website URL (e.g. https://example.com)"
          aria-label="Website URL"
          autoComplete="url"
          inputMode="url"
        />
        <button type="submit" disabled={loading}>
          <span className="search-icon" aria-hidden="true" />
          {loading ? "Auditing..." : "Audit Website"}
        </button>
      </form>

      <div className="helper seo-helper">
        <span className="info-icon">i</span>
        Get a quick SEO health report covering on-page, technical, content and social signals.
      </div>

      {error && <div className="error seo-error">{error}</div>}

      {result && (
        <div className="seo-results">
          <div className="seo-overview-card">
            <div className="seo-score-wrap">
              <div className={`seo-score ${scoreClass(result.score)}`}>
                <span>{result.score}</span>
                <small>/100</small>
              </div>
              <div>
                <span className="modal-eyebrow">SEO HEALTH SCORE</span>
                <h2>{new URL(result.finalUrl).hostname}</h2>
                <a href={result.finalUrl} target="_blank" rel="noreferrer" className="seo-result-url">
                  {result.finalUrl}
                </a>
              </div>
            </div>

            <div className="seo-summary-grid">
              <SummaryItem value={result.summary.pass} label="Passed" className="pass" />
              <SummaryItem value={result.summary.warning} label="Warnings" className="warning" />
              <SummaryItem value={result.summary.fail} label="Issues" className="fail" />
            </div>
          </div>

          <div className="seo-stats-grid">
            <Stat label="Response" value={`${result.responseTimeMs} ms`} />
            <Stat label="Status" value={String(result.statusCode)} />
            <Stat label="Words" value={result.counts.words.toLocaleString()} />
            <Stat label="Images" value={String(result.counts.images)} />
            <Stat label="Links" value={String(result.counts.links)} />
            <Stat label="Page Size" value={formatBytes(result.pageSize)} />
          </div>

          <div className="seo-category-tabs" role="tablist" aria-label="SEO audit categories">
            <button type="button" className={activeCategory === "All" ? "active" : ""} onClick={() => setActiveCategory("All")}>All Checks</button>
            {categories.map((category) => (
              <button key={category} type="button" className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>
            ))}
          </div>

          <div className="seo-check-list">
            {filteredChecks.map((check) => (
              <div className="seo-check" key={check.id}>
                <div className={`seo-check-icon ${check.status}`}>{check.status === "pass" ? "✓" : check.status === "warning" ? "!" : "×"}</div>
                <div className="seo-check-content">
                  <div className="seo-check-title-row">
                    <h3>{check.title}</h3>
                    <span className={`seo-badge ${check.status}`}>{labelForStatus(check.status)}</span>
                  </div>
                  <p>{check.message}</p>
                  {check.details && <div className="seo-check-details">{check.details}</div>}
                </div>
              </div>
            ))}
          </div>

          <div className="seo-disclaimer">
            <strong>Audit note:</strong> This is a fast technical/on-page audit, not a replacement for Google Search Console, Lighthouse, analytics or a full manual SEO review. Scores are directional and recommendations should be reviewed in context.
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ value, label, className }: { value: number; label: string; className: string }) {
  return <div className={`seo-summary-item ${className}`}><strong>{value}</strong><span>{label}</span></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="seo-stat"><span>{label}</span><strong>{value}</strong></div>;
}

function scoreClass(score: number) {
  if (score >= 80) return "good";
  if (score >= 60) return "average";
  return "poor";
}

function labelForStatus(status: Status) {
  if (status === "pass") return "Passed";
  if (status === "warning") return "Warning";
  return "Issue";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
