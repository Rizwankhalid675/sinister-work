// Idempotent claim-status-change notification email.
// This must NEVER cause a claim update/transition to fail — mail delivery
// problems are logged and swallowed, not thrown, because the claim mutation
// itself has already committed by the time this is called.
//
// Idempotency: every logical notification attempt is backed by a
// notificationEvent row keyed on a unique `idempotencyKey`. Callers must
// derive the key deterministically from (claim, transition, target status)
// so that retried/duplicate calls (e.g. a retried action, a re-run backfill)
// can never send the same email twice. We create the row first (in
// "sending" state) using the unique constraint as a distributed lock: if the
// create fails with a uniqueness violation, another attempt already owns
// this notification and we skip silently.

import { sendMail as sendRawMail } from "./mailer.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTrackingUrl(trackingToken) {
  const base = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/claims/track?token=${encodeURIComponent(trackingToken)}`;
}

const EVENT_TYPE_BY_STATUS = {
  Submitted: "claim_created",
  "Under Review": "under_review",
  "Awaiting Customer": "additional_info_required",
  Approved: "approved",
  "Partially Approved": "approved",
  Denied: "declined",
  Paid: "resolved",
  Closed: "closed",
  Reopened: "status_changed_generic",
  Cancelled: "status_changed_generic",
};

/** Deterministic idempotency key for a single logical notification attempt. */
export function buildNotificationIdempotencyKey({ claimId, fromStatus, toStatus }) {
  return `claim:${claimId}:transition:${fromStatus || "none"}->${toStatus}`;
}

/**
 * Send an idempotent, best-effort status-change notification to the claim's
 * client. Never throws — all failures (including duplicate-detection) result
 * in a `{ skipped, reason }` return so callers can log without special-casing.
 *
 * @param {object} opts
 * @param {object} opts.api
 * @param {object} opts.logger
 * @param {string} opts.shopId
 * @param {string} opts.toEmail
 * @param {string} [opts.clientName]
 * @param {string} opts.claimId
 * @param {string} [opts.trackingToken]
 * @param {string} [opts.fromStatus]
 * @param {string} opts.toStatus
 * @param {string} [opts.note]
 * @param {boolean} [opts.testMode]
 */
export async function sendClaimStatusChangedEmail({
  api,
  logger,
  shopId,
  toEmail,
  clientName,
  claimId,
  trackingToken,
  fromStatus,
  toStatus,
  note,
  testMode = false,
}) {
  if (!toEmail) return { skipped: true, reason: "no-recipient" };
  if (!api || !shopId || !claimId) {
    // Callers that can't provide durable-record context fall back to a
    // one-off send rather than silently dropping the notification.
    return sendRawEmailOnly({ logger, toEmail, clientName, claimId, trackingToken, fromStatus, toStatus, note });
  }

  const idempotencyKey = buildNotificationIdempotencyKey({ claimId, fromStatus, toStatus });
  const eventType = EVENT_TYPE_BY_STATUS[toStatus] || "status_changed_generic";

  let event;
  try {
    event = await api.internal.notificationEvent.create({
      claim: { _link: String(claimId) },
      shop: { _link: String(shopId) },
      eventType,
      fromStatus: fromStatus || null,
      toStatus,
      recipientEmail: toEmail,
      idempotencyKey,
      deliveryState: "sending",
      attemptCount: 1,
      lastAttemptAt: new Date(),
      testMode,
    });
  } catch (error) {
    // Unique constraint hit (or any create failure): another attempt already
    // owns this notification, or we can't safely record one. Either way, do
    // not send — avoids duplicate emails, and avoids un-tracked sends.
    logger?.warn?.(
      { error: error?.message, claimId, toStatus, idempotencyKey },
      "notificationEvent create failed or already exists; skipping duplicate send"
    );
    return { skipped: true, reason: "duplicate-or-record-failed" };
  }

  const trackingUrl = trackingToken ? buildTrackingUrl(trackingToken) : null;
  const subject = `Your Enshield claim is now "${toStatus}"`;
  const html = renderHtml({ clientName, fromStatus, toStatus, note, trackingUrl });

  try {
    const result = await sendRawMail({ to: toEmail, subject, html });
    await api.internal.notificationEvent.update(event.id, {
      deliveryState: "sent",
      providerMessageId: result?.messageId || result?.id || null,
      lastAttemptAt: new Date(),
    });
    return result;
  } catch (error) {
    // Non-fatal: log and continue. The claim mutation already committed.
    logger?.warn?.(
      { error: error?.message, claimId, toStatus },
      "claim status-change notification email failed to send"
    );
    try {
      await api.internal.notificationEvent.update(event.id, {
        deliveryState: "failed",
        failureReason: String(error?.message || error).slice(0, 500),
        lastAttemptAt: new Date(),
      });
    } catch (updateError) {
      logger?.warn?.(
        { error: updateError?.message, claimId },
        "failed to record notificationEvent failure state (non-fatal)"
      );
    }
    return { skipped: true, reason: "send-failed" };
  }
}

function renderHtml({ clientName, fromStatus, toStatus, note, trackingUrl }) {
  return `
    <p>Hi ${escapeHtml(clientName || "")},</p>
    <p>The status of your protection claim has changed${
      fromStatus ? ` from <strong>${escapeHtml(fromStatus)}</strong>` : ""
    } to <strong>${escapeHtml(toStatus)}</strong>.</p>
    ${note ? `<p><em>${escapeHtml(note)}</em></p>` : ""}
    ${
      trackingUrl
        ? `<p>You can check the latest status and history of your claim here:</p>
    <p><a href="${trackingUrl}">${trackingUrl}</a></p>`
        : ""
    }
    <p>If you have questions, please contact our support team.</p>
  `;
}

/** Fallback path used only when durable idempotency context isn't available. */
async function sendRawEmailOnly({ logger, toEmail, clientName, claimId, trackingToken, fromStatus, toStatus, note }) {
  const trackingUrl = trackingToken ? buildTrackingUrl(trackingToken) : null;
  const subject = `Your Enshield claim is now "${toStatus}"`;
  const html = renderHtml({ clientName, fromStatus, toStatus, note, trackingUrl });
  try {
    return await sendRawMail({ to: toEmail, subject, html });
  } catch (error) {
    logger?.warn?.(
      { error: error?.message, claimId, toStatus },
      "claim status-change notification email failed to send"
    );
    return { skipped: true, reason: "send-failed" };
  }
}
