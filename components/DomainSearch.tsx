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

type RegistrationForm = {
  name: string;
  email: string;
  contactNo: string;
  address: string;
};

export default function DomainSearch() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [form, setForm] = useState<RegistrationForm>({
    name: "",
    email: "",
    contactNo: "",
    address: "",
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

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

  function openRegistration() {
    setSubmitMessage("");
    setShowRegisterModal(true);
  }

  function closeRegistration() {
    if (!submitLoading) setShowRegisterModal(false);
  }

  async function submitRegistration(e: FormEvent) {
    e.preventDefault();
    setSubmitMessage("");

    if (!result?.domain) {
      setSubmitMessage("Domain information is missing. Please search again.");
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await fetch("/api/domain/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          domain: result.domain,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit registration request.");
      }

      setSubmitMessage("success");
      setForm({ name: "", email: "", contactNo: "", address: "" });
    } catch (err) {
      setSubmitMessage(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  function updateForm(field: keyof RegistrationForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
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
              <button
                type="button"
                className="register-btn"
                onClick={openRegistration}
              >
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

      {showRegisterModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeRegistration();
          }}
        >
          <div
            className="register-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-domain-title"
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeRegistration}
              aria-label="Close registration form"
              disabled={submitLoading}
            >
              ×
            </button>

            {submitMessage === "success" ? (
              <div className="success-state">
                <div className="success-icon">✓</div>
                <h2>Registration Request Sent</h2>
                <p>
                  Thank you. Your request for <strong>{result?.domain}</strong>{" "}
                  has been sent to our team. We will contact you shortly.
                </p>
                <button
                  type="button"
                  className="modal-submit"
                  onClick={closeRegistration}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <span className="modal-eyebrow">DOMAIN REGISTRATION</span>
                  <h2 id="register-domain-title">Register Your Domain</h2>
                  <p>
                    Complete the form below and our team will contact you about
                    registering <strong>{result?.domain}</strong>.
                  </p>
                </div>

                <form className="registration-form" onSubmit={submitRegistration}>
                  <div className="form-field">
                    <label htmlFor="register-name">Name *</label>
                    <input
                      id="register-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="register-email">Email *</label>
                    <input
                      id="register-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="register-contact">Contact No. *</label>
                    <input
                      id="register-contact"
                      type="tel"
                      value={form.contactNo}
                      onChange={(e) => updateForm("contactNo", e.target.value)}
                      placeholder="Your contact number"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="register-domain">Domain</label>
                    <input
                      id="register-domain"
                      type="text"
                      value={result?.domain || ""}
                      readOnly
                    />
                  </div>

                  <div className="form-field form-field-full">
                    <label htmlFor="register-address">Address *</label>
                    <textarea
                      id="register-address"
                      value={form.address}
                      onChange={(e) => updateForm("address", e.target.value)}
                      placeholder="Your complete address"
                      rows={4}
                      autoComplete="street-address"
                      required
                    />
                  </div>

                  {submitMessage && submitMessage !== "success" && (
                    <div className="form-error">{submitMessage}</div>
                  )}

                  <button
                    type="submit"
                    className="modal-submit"
                    disabled={submitLoading}
                  >
                    {submitLoading ? "Sending Request..." : "Submit Registration Request"}
                  </button>
                </form>
              </>
            )}
          </div>
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
