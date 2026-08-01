import { useEffect, useState } from "react";

const STATUS_STEPS = [
  "Submitted",
  "Under Review",
  "Approved",
  "Payment Pending",
  "Paid",
  "Closed",
];

function money(minor, currency = "USD") {
  if (minor == null) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      Number(minor) / 100
    );
  } catch {
    return `${(Number(minor) / 100).toFixed(2)} ${currency}`;
  }
}

function useQueryParam(name) {
  const [value] = useState(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get(name);
  });
  return value;
}

const MAX_EVIDENCE_FILES = 5;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      // Strip the "data:<mime>;base64," prefix -- the API only wants the
      // raw base64 payload alongside the mimeType field.
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ClaimTrackingPage() {
  const token = useQueryParam("token");
  const [state, setState] = useState({ loading: true, error: null, claim: null });
  const [evidence, setEvidence] = useState({
    submitting: false,
    error: null,
    success: false,
    files: [],
  });

  useEffect(() => {
    if (!token) {
      setState({ loading: false, error: "missing-token", claim: null });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/public-claims/${encodeURIComponent(token)}`);
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !body?.success) {
          setState({
            loading: false,
            error: response.status === 404 ? "not-found" : "error",
            claim: null,
          });
          return;
        }
        setState({ loading: false, error: null, claim: body.claim });
      } catch {
        if (!cancelled) setState({ loading: false, error: "error", claim: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const { loading, error, claim } = state;
  const activeStepIndex = claim ? STATUS_STEPS.indexOf(claim.status) : -1;
  const needsMoreInfo = claim?.status === "Awaiting Customer";

  async function handleEvidenceFilesChange(event) {
    const rawFiles = Array.from(event.target.files || []).slice(0, MAX_EVIDENCE_FILES);
    if (rawFiles.length === 0) return;
    setEvidence((prev) => ({ ...prev, error: null, success: false }));
    try {
      const encoded = await Promise.all(
        rawFiles.map(async (file) => ({
          name: file.name,
          mimeType: file.type,
          data: await fileToBase64(file),
        }))
      );
      setEvidence((prev) => ({ ...prev, files: encoded }));
    } catch {
      setEvidence((prev) => ({ ...prev, error: "Failed to read selected file(s)." }));
    }
  }

  async function handleEvidenceSubmit(event) {
    event.preventDefault();
    if (!token || evidence.files.length === 0) return;
    setEvidence((prev) => ({ ...prev, submitting: true, error: null, success: false }));
    try {
      const response = await fetch(`/api/public-claims/${encodeURIComponent(token)}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: evidence.files }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setEvidence({
          submitting: false,
          error: body?.error || "We couldn't upload your file(s). Please try again.",
          success: false,
          files: [],
        });
        return;
      }
      setEvidence({ submitting: false, error: null, success: true, files: [] });
    } catch {
      setEvidence({
        submitting: false,
        error: "We couldn't upload your file(s). Please try again.",
        success: false,
        files: [],
      });
    }
  }

  return (
    <div className="esd-tracking-page">
      <div className="esd-tracking-card">
        <h1>Enshield Claim Tracking</h1>

        {loading && <p role="status">Loading your claim status…</p>}

        {!loading && error === "missing-token" && (
          <p role="status">
            No tracking link was provided. Please use the link from your claim status email.
          </p>
        )}
        {!loading && error === "not-found" && (
          <p role="status">
            We couldn’t find a claim matching this tracking link. It may have expired — please
            contact support if you believe this is an error.
          </p>
        )}
        {!loading && error === "error" && (
          <p role="status">
            Something went wrong while loading your claim. Please try again in a moment.
          </p>
        )}

        {!loading && claim && (
          <>
            <dl className="esd-tracking-summary">
              {claim.order?.name && (
                <>
                  <dt>Order</dt>
                  <dd>{claim.order.name}</dd>
                </>
              )}
              <dt>Status</dt>
              <dd>{claim.status}</dd>
              {claim.reason && (
                <>
                  <dt>Reason</dt>
                  <dd>{claim.reason}</dd>
                </>
              )}
              {claim.claimValueMinor != null && (
                <>
                  <dt>Claim value</dt>
                  <dd>{money(claim.claimValueMinor, claim.claimCurrency)}</dd>
                </>
              )}
              {claim.trackingNumber && (
                <>
                  <dt>Shipment tracking #</dt>
                  <dd>{claim.trackingNumber}</dd>
                </>
              )}
            </dl>

            {STATUS_STEPS.includes(claim.status) && (
              <ol className="esd-tracking-steps">
                {STATUS_STEPS.map((step, index) => (
                  <li
                    key={step}
                    className={
                      index <= activeStepIndex
                        ? "esd-tracking-step esd-tracking-step-done"
                        : "esd-tracking-step"
                    }
                  >
                    {step}
                  </li>
                ))}
              </ol>
            )}

            {needsMoreInfo && (
              <div className="esd-tracking-info-request" role="alert">
                <h2>We need more information</h2>
                <p>
                  Your claim is currently awaiting additional details or evidence from you.
                  Please upload any relevant photos, receipts, or documents below so we can
                  continue reviewing your claim.
                </p>
              </div>
            )}

            {token && (
              <form className="esd-tracking-evidence-form" onSubmit={handleEvidenceSubmit}>
                <h2>Upload evidence</h2>
                <p className="esd-tracking-evidence-hint">
                  Accepted files: JPEG, PNG, WEBP, HEIC, PDF, MP4, MOV. Up to {MAX_EVIDENCE_FILES}{" "}
                  files, 15MB each.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,video/mp4,video/quicktime"
                  onChange={handleEvidenceFilesChange}
                  disabled={evidence.submitting}
                />
                {evidence.files.length > 0 && (
                  <p className="esd-tracking-evidence-selected">
                    {evidence.files.length} file(s) selected
                  </p>
                )}
                {evidence.error && (
                  <p className="esd-tracking-evidence-error" role="alert">
                    {evidence.error}
                  </p>
                )}
                {evidence.success && (
                  <p className="esd-tracking-evidence-success" role="status">
                    Thanks — your file(s) were uploaded successfully.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={evidence.submitting || evidence.files.length === 0}
                >
                  {evidence.submitting ? "Uploading…" : "Upload"}
                </button>
              </form>
            )}

            <p className="esd-tracking-footer">
              If you have questions about this claim, please contact our support team.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
