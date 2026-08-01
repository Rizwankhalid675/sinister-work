import { useEffect, useState } from "react";
import { Gate } from "../lib/useRole";
import { PERMISSIONS } from "../lib/rbac";
import { usePagedResource } from "../lib/usePagedResource";
import { ListToolbar, PageNavigation, PageStatus } from "../components/OperationalPage";
import "./dashboard.css";

const FIELD_TYPES = ["text", "textarea", "select", "checkbox", "file"];

function emptyField() {
  return { id: `f_${Math.random().toString(36).slice(2, 9)}`, label: "", type: "text", required: false, options: [] };
}

export function ClaimFormsPage() {
  return (
    <Gate
      permission={PERMISSIONS.EDIT_CLIENTS}
      fallback={<div role="status" className="esd-empty">You don’t have permission to manage claim forms.</div>}
    >
      <ClaimFormsInner />
    </Gate>
  );
}

function ClaimFormsInner() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const data = usePagedResource("/api/claim-forms", { search: search.trim(), status });

  return (
    <section aria-label="Claim intake forms" aria-live="polite">
      <div className="esd-client-actions">
        <div>
          <strong>Public claim-intake forms</strong>
          <span>Create and publish client-specific forms for customers to submit protection claims.</span>
        </div>
        <div className="esd-row-actions">
          <button type="button" className="esd-btn esd-btn-sm" disabled={data.loading} onClick={data.retry}>
            {data.loading ? "Fetching…" : "Fetch"}
          </button>
          <button type="button" className="esd-btn esd-btn-sm esd-btn-primary" onClick={() => setShowCreate(true)}>
            New form
          </button>
        </div>
      </div>
      {showCreate ? (
        <CreateFormModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); data.retry(); }} />
      ) : null}
      {editing ? (
        <EditFormModal
          form={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); data.retry(); }}
        />
      ) : null}
      <ListToolbar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        statuses={["draft", "published", "unpublished", "archived"]}
      />
      <PageStatus loading={data.loading} error={data.error} empty={!data.rows.length} noun="claim forms" onRetry={data.retry} />
      {!data.loading && !data.error && data.rows.length ? (
        <div className="esd-table-wrap">
          <table className="esd-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Client</th>
                <th>Status</th>
                <th>Public link</th>
                <th>Published</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((form) => (
                <tr key={form.id}>
                  <td data-label="Name"><strong>{form.name}</strong></td>
                  <td data-label="Client">{form.client?.storeName || "—"}</td>
                  <td data-label="Status"><span className={`esd-badge esd-badge-${form.status}`}>{form.status}</span></td>
                  <td data-label="Public link">
                    {form.status === "published" ? (
                      <a href={`/forms/${form.publicSlug}`} target="_blank" rel="noreferrer">
                        /forms/{form.publicSlug}
                      </a>
                    ) : (
                      <span className="esd-mono">{form.publicSlug}</span>
                    )}
                  </td>
                  <td data-label="Published">{form.publishedAt ? new Date(form.publishedAt).toLocaleDateString() : "—"}</td>
                  <td data-label="Actions">
                    <button type="button" className="esd-btn esd-btn-sm" onClick={() => setEditing(form)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <PageNavigation hasPrevious={data.hasPreviousPage} hasNext={data.hasNextPage} onPrevious={data.previous} onNext={data.next} />
    </section>
  );
}

function FieldEditor({ fields, onChange }) {
  const update = (index, patch) => {
    const next = fields.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const remove = (index) => onChange(fields.filter((_, i) => i !== index));
  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = fields.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="esd-field-editor">
      {fields.map((field, index) => (
        <div key={field.id} className="esd-field-editor-row">
          <input
            type="text"
            placeholder="Field label"
            value={field.label}
            onChange={(e) => update(index, { label: e.target.value })}
          />
          <select value={field.type} onChange={(e) => update(index, { type: e.target.value })}>
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <label className="esd-inline-checkbox">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => update(index, { required: e.target.checked })}
            />
            Required
          </label>
          {field.type === "select" ? (
            <input
              type="text"
              placeholder="Options (comma-separated)"
              value={(field.options || []).join(", ")}
              onChange={(e) => update(index, { options: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
            />
          ) : null}
          <div className="esd-row-actions">
            <button type="button" className="esd-btn esd-btn-sm" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
            <button type="button" className="esd-btn esd-btn-sm" onClick={() => move(index, 1)} disabled={index === fields.length - 1}>↓</button>
            <button type="button" className="esd-btn esd-btn-sm" onClick={() => remove(index)}>Remove</button>
          </div>
        </div>
      ))}
      <button type="button" className="esd-btn esd-btn-sm" onClick={() => onChange([...fields, emptyField()])}>
        Add field
      </button>
    </div>
  );
}

function CreateFormModal({ onClose, onCreated }) {
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState("");
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [fields, setFields] = useState([emptyField()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/clients?first=100", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || "Failed to load clients");
        return body;
      })
      .then((body) => setClients(body.clients || []))
      .catch((reason) => { if (reason.name !== "AbortError") setClientsError(reason.message); })
      .finally(() => setClientsLoading(false));
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!clientId) { setError("Select a client."); return; }
    if (!name.trim()) { setError("Form name is required."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/claim-forms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name: name.trim(),
          instructions: instructions.trim() || undefined,
          fields: fields.filter((f) => f.label.trim()),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || "Failed to create form");
      onCreated();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="esd-modal-overlay" role="presentation" onClick={onClose}>
      <div className="esd-modal" role="dialog" aria-modal="true" aria-label="New claim form" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>New claim form</h2>
        {clientsError ? <p role="alert" className="esd-error">{clientsError}</p> : null}
        <form onSubmit={handleSubmit}>
          <label htmlFor="esd-form-client">Client</label>
          <select id="esd-form-client" value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={clientsLoading} required>
            <option value="">{clientsLoading ? "Loading clients…" : "Select a client"}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.storeName}</option>
            ))}
          </select>

          <label htmlFor="esd-form-name">Form name</label>
          <input id="esd-form-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />

          <label htmlFor="esd-form-instructions">Instructions</label>
          <textarea id="esd-form-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />

          <label>Fields</label>
          <FieldEditor fields={fields} onChange={setFields} />

          {error ? <p role="alert" className="esd-error">{error}</p> : null}

          <div className="esd-row-actions" style={{ marginTop: 16 }}>
            <button type="button" className="esd-btn esd-btn-sm" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="esd-btn esd-btn-sm esd-btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create form"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditFormModal({ form, onClose, onSaved }) {
  const [name, setName] = useState(form.name || "");
  const [instructions, setInstructions] = useState(form.instructions || "");
  const [fields, setFields] = useState(() => (Array.isArray(form.fields) && form.fields.length ? form.fields : [emptyField()]));
  const [status, setStatus] = useState(form.status || "draft");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/claim-forms/${form.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          instructions,
          fields: fields.filter((f) => f.label.trim()),
          status,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || "Failed to update form");
      onSaved();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="esd-modal-overlay" role="presentation" onClick={onClose}>
      <div className="esd-modal" role="dialog" aria-modal="true" aria-label={`Edit ${form.name}`} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Edit form</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="esd-edit-form-name">Form name</label>
          <input id="esd-edit-form-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />

          <label htmlFor="esd-edit-form-instructions">Instructions</label>
          <textarea id="esd-edit-form-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />

          <label htmlFor="esd-edit-form-status">Status</label>
          <select id="esd-edit-form-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {["draft", "published", "unpublished", "archived"].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <label>Fields</label>
          <FieldEditor fields={fields} onChange={setFields} />

          {error ? <p role="alert" className="esd-error">{error}</p> : null}

          <div className="esd-row-actions" style={{ marginTop: 16 }}>
            <button type="button" className="esd-btn esd-btn-sm" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="esd-btn esd-btn-sm esd-btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
