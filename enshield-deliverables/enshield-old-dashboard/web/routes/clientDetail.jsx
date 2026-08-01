import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Gate } from "../lib/useRole";
import { PERMISSIONS } from "../lib/rbac";
import "./dashboard.css";

const money = (minor, currency = "USD") => {
  if (minor == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(minor) / 100);
  } catch {
    return `${(Number(minor) / 100).toFixed(2)} ${currency}`;
  }
};

export function ClientDetailPage() {
  return (
    <Gate permission={PERMISSIONS.VIEW_CLIENTS} fallback={<div role="status" className="esd-empty">You don’t have permission to view clients.</div>}>
      <ClientDetailInner />
    </Gate>
  );
}

function ClientDetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", client: null, orders: [], claims: [] });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    fetch(`/api/clients/${encodeURIComponent(id)}`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success) {
          const reason = new Error(body.error || "Request failed");
          reason.status = response.status;
          throw reason;
        }
        return body;
      })
      .then((body) => setState({ loading: false, error: "", client: body.client, orders: body.orders || [], claims: body.claims || [] }))
      .catch((reason) => {
        if (reason.name !== "AbortError") {
          setState({ loading: false, error: reason.status === 403 ? "forbidden" : reason.status === 404 ? "not_found" : reason.message, client: null, orders: [], claims: [] });
        }
      });
    return () => controller.abort();
  }, [id]);

  if (state.loading) return <div className="esd-loading" role="status" aria-live="polite">Loading client…</div>;
  if (state.error === "forbidden") {
    return <div className="esd-empty" role="status"><p className="esd-empty-title">Access restricted</p><p className="esd-empty-desc">You don’t have permission to view this client.</p></div>;
  }
  if (state.error === "not_found" || !state.client) {
    return <div className="esd-empty" role="status"><p className="esd-empty-title">Client not found</p><button type="button" className="esd-link-button" onClick={() => navigate("/clients")}>Back to clients</button></div>;
  }
  if (state.error) {
    return <div className="esd-error" role="status" aria-live="polite">Couldn’t load client. <button className="esd-link-button" type="button" onClick={() => navigate(0)}>Try again</button></div>;
  }

  const { client, orders, claims } = state;
  return (
    <section aria-label="Client detail">
      <div className="esd-row-actions" style={{ marginBottom: 12 }}>
        <button type="button" className="esd-btn esd-btn-sm" onClick={() => navigate("/clients")}>← Back to clients</button>
      </div>
      <h1>{client.storeName}</h1>
      <p className="esd-empty-desc">
        Platform: {client.platform || "—"} · Plan: {client.plan || "—"} ·{" "}
        <span className={`esd-badge ${client.status === "active" ? "esd-badge-active" : ""}`}>{client.status || "unknown"}</span>
      </p>

      <div className="esd-table-wrap">
        <table className="esd-table">
          <tbody>
            <tr><td data-label="Field">Store ID</td><td data-label="Value">{client.storeId || "—"}</td></tr>
            <tr><td data-label="Field">Value in transit</td><td data-label="Value">{money(client.valueInTransitMinor, client.valueInTransitCurrency || "USD")}</td></tr>
            <tr><td data-label="Field">Open claim count</td><td data-label="Value">{client.claimCount ?? 0}</td></tr>
            <tr><td data-label="Field">Created</td><td data-label="Value">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "—"}</td></tr>
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 24 }}>Recent orders</h2>
      {orders.length ? (
        <div className="esd-table-wrap">
          <table className="esd-table">
            <thead><tr><th>Order</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {orders.map((order) => {
                const orderId = order.legacyRecordId ? `legacy:${order.id}` : order.id;
                const label = order.orderNumber || order.name || order.id;
                const status = order.status || order.fulfillmentStatus || "—";
                const created = order.placedAt || order.shopifyCreatedAt;
                return (
                  <tr key={order.id}>
                    <td data-label="Order"><a href={`/orders/${encodeURIComponent(orderId)}`}>{label}</a></td>
                    <td data-label="Status">{status}</td>
                    <td data-label="Created">{created ? new Date(created).toLocaleDateString() : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="esd-empty-desc">No orders on file for this client.</p>
      )}

      <h2 style={{ marginTop: 24 }}>Claims</h2>
      {claims.length ? (
        <div className="esd-table-wrap">
          <table className="esd-table">
            <thead><tr><th>Claim</th><th>Status</th><th>Reason</th><th>Created</th></tr></thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td data-label="Claim"><a href={`/claims?claimId=${encodeURIComponent(claim.id)}`}>{claim.id}</a></td>
                  <td data-label="Status">{claim.status || "—"}</td>
                  <td data-label="Reason">{claim.claimReason || "—"}</td>
                  <td data-label="Created">{claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="esd-empty-desc">No claims filed for this client.</p>
      )}
    </section>
  );
}
