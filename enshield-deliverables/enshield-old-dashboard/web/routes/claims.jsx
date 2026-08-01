import { useDeferredValue, useEffect, useState } from "react";
import { Gate, useRole } from "../lib/useRole";
import { PERMISSIONS } from "../lib/rbac";
import { usePagedResource } from "../lib/usePagedResource";
import { ListToolbar, PageNavigation, PageStatus } from "../components/OperationalPage";
import "./dashboard.css";

const STATUSES = ["Draft", "Submitted", "New", "Under Review", "Awaiting Customer", "Awaiting Merchant", "Awaiting Carrier", "Approved", "Partially Approved", "Denied", "Payment Pending", "Paid", "Closed", "Reopened", "Cancelled"];
const money = (minor, amount, currency = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor != null ? Number(minor) / 100 : Number(amount || 0));

// Mirror of api/lib/claimStateMachine.js CLAIM_TRANSITIONS — presentation only.
// The server re-validates every transition; this just avoids offering illegal
// moves in the UI. Payment/approval statuses are further gated by permission.
const CLAIM_TRANSITIONS = {
  Draft: ["Submitted", "Cancelled"],
  Submitted: ["New", "Cancelled"],
  New: ["Under Review", "Cancelled"],
  "Under Review": ["Awaiting Customer", "Awaiting Merchant", "Awaiting Carrier", "Approved", "Partially Approved", "Denied", "Cancelled"],
  "Awaiting Customer": ["Under Review", "Cancelled"],
  "Awaiting Merchant": ["Under Review", "Cancelled"],
  "Awaiting Carrier": ["Under Review", "Cancelled"],
  Approved: ["Payment Pending", "Reopened"],
  "Partially Approved": ["Payment Pending", "Reopened"],
  Denied: ["Reopened", "Closed"],
  "Payment Pending": ["Paid"],
  Paid: ["Closed"],
  Closed: ["Reopened"],
  Reopened: ["Under Review", "Cancelled"],
  Cancelled: [],
};
const APPROVAL_STATUSES = new Set(["Approved", "Partially Approved", "Denied"]);
const PAYMENT_STATUSES = new Set(["Payment Pending", "Paid"]);

function permissionForTransition(toStatus) {
  if (PAYMENT_STATUSES.has(toStatus)) return PERMISSIONS.PAY_CLAIMS;
  if (APPROVAL_STATUSES.has(toStatus)) return PERMISSIONS.APPROVE_CLAIMS;
  return PERMISSIONS.EDIT_CLAIMS;
}

export function ClaimsPage() {
  return <Gate permission={PERMISSIONS.VIEW_CLAIMS} fallback={<div role="status" className="esd-empty">You don’t have permission to view claims.</div>}><ClaimsInner /></Gate>;
}

function ClaimsInner() {
  const { can } = useRole();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const data = usePagedResource("/api/claims", { search: useDeferredValue(search).trim(), status });
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState({});
  const [openNotesId, setOpenNotesId] = useState(null);

  const transition = async (claim, toStatus) => {
    setRowError((prev) => ({ ...prev, [claim.id]: "" }));
    setBusyId(claim.id);
    try {
      const response = await fetch(`/api/claims/${claim.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || "Transition failed");
      data.retry();
    } catch (reason) {
      setRowError((prev) => ({ ...prev, [claim.id]: reason.message }));
    } finally {
      setBusyId(null);
    }
  };

  return <section aria-label="Claims" aria-live="polite">
    <ListToolbar search={search} onSearch={setSearch} status={status} onStatus={setStatus} statuses={STATUSES} />
    <PageStatus loading={data.loading} error={data.error} empty={!data.rows.length} noun="claims" onRetry={data.retry} />
    {!data.loading && !data.error && data.rows.length ? <div className="esd-table-wrap"><table className="esd-table">
      <thead><tr><th>Order</th><th>Store</th><th>Reason</th><th>Status</th><th>Claim value</th><th>Order value</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>{data.rows.map((claim) => {
        const nextStatuses = (CLAIM_TRANSITIONS[claim.status] || []).filter((toStatus) => can(permissionForTransition(toStatus)));
        return <tr key={claim.id}>
          <td data-label="Order">{claim.order?.name || "—"}</td><td data-label="Store">{claim.client?.storeName || "—"}</td>
          <td data-label="Reason">{claim.reason || "—"}{claim.readOnly ? <span className="esd-badge esd-badge-source">Legacy · read only</span> : null}</td><td data-label="Status"><span className={`esd-badge esd-badge-${(claim.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{claim.status || "—"}</span></td>
          <td data-label="Claim value">{money(claim.claimValueMinor, claim.claimValue, claim.claimCurrency)}</td>
          <td data-label="Order value">{money(claim.orderValueMinor, claim.orderValue, claim.orderCurrency)}</td>
          <td data-label="Created">{claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : "—"}</td>
          <td data-label="Actions">
            {!claim.readOnly && nextStatuses.length ? <div className="esd-row-actions">
              {nextStatuses.map((toStatus) => (
                <button
                  key={toStatus}
                  type="button"
                  className="esd-btn esd-btn-sm"
                  disabled={busyId === claim.id}
                  onClick={() => transition(claim, toStatus)}
                >
                  {busyId === claim.id ? "Working…" : toStatus}
                </button>
              ))}
            </div> : <span className="esd-visually-hidden">No actions available</span>}
            {can(PERMISSIONS.EDIT_CLAIMS) ? <button
              type="button"
              className="esd-btn esd-btn-sm esd-btn-link"
              onClick={() => setOpenNotesId((current) => (current === claim.id ? null : claim.id))}
            >
              {openNotesId === claim.id ? "Hide notes" : "Notes"}
            </button> : null}
            {rowError[claim.id] ? <p className="esd-field-error" role="alert">{rowError[claim.id]}</p> : null}
          </td>
        </tr>;
      })}</tbody></table></div> : null}
    {openNotesId ? <ClaimNotesPanel claimId={openNotesId} onClose={() => setOpenNotesId(null)} /> : null}
    <PageNavigation hasPrevious={data.hasPreviousPage} hasNext={data.hasNextPage} onPrevious={data.previous} onNext={data.next} />
  </section>;
}

function ClaimNotesPanel({ claimId, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("internal");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/claims/${claimId}/notes`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to load notes");
      setNotes(result.notes || []);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/claims/${claimId}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), visibility }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to add note");
      setBody("");
      await load();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="esd-notes-panel" role="region" aria-label="Claim notes">
    <div className="esd-notes-panel-header">
      <strong>Claim notes</strong>
      <button type="button" className="esd-btn esd-btn-sm" onClick={onClose}>Close</button>
    </div>
    {error ? <p className="esd-field-error" role="alert">{error}</p> : null}
    {loading ? <p>Loading notes…</p> : (
      notes.length ? <ul className="esd-notes-list">
        {notes.map((note) => (
          <li key={note.id}>
            <span className={`esd-badge esd-badge-${note.visibility}`}>{note.visibility}</span>
            <span className="esd-note-body">{note.body}</span>
            <span className="esd-note-meta">{note.authorEmail || "—"} · {note.createdAt ? new Date(note.createdAt).toLocaleString() : ""}</span>
          </li>
        ))}
      </ul> : <p>No notes yet.</p>
    )}
    <form onSubmit={submit} className="esd-notes-form">
      <textarea
        aria-label="New note"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        placeholder="Add a note…"
      />
      <div className="esd-notes-form-row">
        <select aria-label="Note visibility" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
          <option value="internal">Internal (staff only)</option>
          <option value="customer">Customer-visible</option>
        </select>
        <button type="submit" className="esd-btn esd-btn-sm esd-btn-primary" disabled={submitting || !body.trim()}>
          {submitting ? "Saving…" : "Add note"}
        </button>
      </div>
    </form>
  </div>;
}
