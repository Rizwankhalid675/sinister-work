import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Gate } from "../lib/useRole";
import { PERMISSIONS } from "../lib/rbac";
import "./dashboard.css";

const money = (amount, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount || 0));

export function OrderDetailPage() {
  return (
    <Gate permission={PERMISSIONS.VIEW_ORDERS} fallback={<div role="status" className="esd-empty">You don’t have permission to view orders.</div>}>
      <OrderDetailInner />
    </Gate>
  );
}

function OrderDetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", order: null, claims: [] });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    fetch(`/api/orders/${encodeURIComponent(id)}`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success) {
          const reason = new Error(body.error || "Request failed");
          reason.status = response.status;
          throw reason;
        }
        return body;
      })
      .then((body) => setState({ loading: false, error: "", order: body.order, claims: body.claims || [] }))
      .catch((reason) => {
        if (reason.name !== "AbortError") {
          setState({ loading: false, error: reason.status === 403 ? "forbidden" : reason.status === 404 ? "not_found" : reason.message, order: null, claims: [] });
        }
      });
    return () => controller.abort();
  }, [id]);

  if (state.loading) return <div className="esd-loading" role="status" aria-live="polite">Loading order…</div>;
  if (state.error === "forbidden") {
    return <div className="esd-empty" role="status"><p className="esd-empty-title">Access restricted</p><p className="esd-empty-desc">You don’t have permission to view this order.</p></div>;
  }
  if (state.error === "not_found" || !state.order) {
    return <div className="esd-empty" role="status"><p className="esd-empty-title">Order not found</p><button type="button" className="esd-link-button" onClick={() => navigate("/orders")}>Back to orders</button></div>;
  }
  if (state.error) {
    return <div className="esd-error" role="status" aria-live="polite">Couldn’t load order. <button className="esd-link-button" type="button" onClick={() => navigate(0)}>Try again</button></div>;
  }

  const { order, claims } = state;
  return (
    <section aria-label="Order detail">
      <div className="esd-row-actions" style={{ marginBottom: 12 }}>
        <button type="button" className="esd-btn esd-btn-sm" onClick={() => navigate("/orders")}>← Back to orders</button>
      </div>
      <h1>{order.name || order.id}</h1>
      <p className="esd-empty-desc">
        Client: {order.shop?.name || order.shop?.domain || "—"} · Source: {order.source}
      </p>

      <div className="esd-table-wrap">
        <table className="esd-table">
          <tbody>
            <tr><td data-label="Field">Value</td><td data-label="Value">{money(order.value, order.currency)}</td></tr>
            {order.originalValue != null ? <tr><td data-label="Field">Original value</td><td data-label="Value">{money(order.originalValue, order.currency)}</td></tr> : null}
            {order.shippingValue != null ? <tr><td data-label="Field">Shipping</td><td data-label="Value">{money(order.shippingValue, order.currency)}</td></tr> : null}
            {order.refundedValue != null ? <tr><td data-label="Field">Refunded</td><td data-label="Value">{money(order.refundedValue, order.currency)}</td></tr> : null}
            <tr>
              <td data-label="Field">Protection</td>
              <td data-label="Value">
                <span className={`esd-badge ${order.protected ? "esd-badge-active" : ""}`}>
                  {order.protected ? "Protected" : "Not protected"}
                </span>
                {order.protected && order.protectionAmountMinor != null ? ` — ${money(order.protectionAmountMinor / 100, order.protectionCurrency || order.currency)}` : ""}
              </td>
            </tr>
            <tr><td data-label="Field">Financial status</td><td data-label="Value">{order.financialStatus || "—"}</td></tr>
            <tr><td data-label="Field">Fulfillment status</td><td data-label="Value">{order.fulfillmentStatus || "—"}</td></tr>
            {order.trackingNumber ? <tr><td data-label="Field">Tracking number</td><td data-label="Value">{order.trackingNumber}</td></tr> : null}
            {order.email ? <tr><td data-label="Field">Email</td><td data-label="Value">{order.email}</td></tr> : null}
            {order.phone ? <tr><td data-label="Field">Phone</td><td data-label="Value">{order.phone}</td></tr> : null}
            <tr><td data-label="Field">Created</td><td data-label="Value">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</td></tr>
            {order.cancelledAt ? <tr><td data-label="Field">Cancelled</td><td data-label="Value">{new Date(order.cancelledAt).toLocaleString()}</td></tr> : null}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 24 }}>Claims on this order</h2>
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
        <p className="esd-empty-desc">No claims filed on this order.</p>
      )}
    </section>
  );
}
