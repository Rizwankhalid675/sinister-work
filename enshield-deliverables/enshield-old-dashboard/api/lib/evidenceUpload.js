// Shared validation + persistence helpers for claimEvidence uploads, used by
// the staff, customer-token, and public-form upload routes. Kept in one
// place so file-type/size limits and the storage shape are identical across
// all three surfaces.

const MAX_BYTES = 15 * 1024 * 1024; // 15MB per file
const MAX_FILES_PER_REQUEST = 5;

const ALLOWED_MIME_KIND = new Map([
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
  ["image/heic", "image"],
  ["application/pdf", "document"],
  ["video/mp4", "video"],
  ["video/quicktime", "video"],
]);

export function evidenceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Validates the raw `files` array from a request body (base64-encoded
 * uploads) and returns normalized { data, name, mimeType, kind, byteSize }
 * entries. Throws a 400 error on the first invalid entry.
 */
export function validateEvidenceFilesPayload(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw evidenceError("At least one file is required", 400);
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    throw evidenceError(`No more than ${MAX_FILES_PER_REQUEST} files per request`, 400);
  }

  return files.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw evidenceError(`File ${index + 1} is invalid`, 400);
    }
    const { data, name, mimeType } = entry;
    if (typeof data !== "string" || data.length === 0) {
      throw evidenceError(`File ${index + 1} is missing data`, 400);
    }
    if (typeof mimeType !== "string" || !ALLOWED_MIME_KIND.has(mimeType)) {
      throw evidenceError(
        `File ${index + 1} has an unsupported type. Allowed: JPEG, PNG, WEBP, HEIC, PDF, MP4, MOV.`,
        400
      );
    }
    // base64 payload size estimate: 4 chars encode 3 bytes.
    const byteSize = Math.floor((data.length * 3) / 4);
    if (byteSize > MAX_BYTES) {
      throw evidenceError(`File ${index + 1} exceeds the 15MB size limit`, 400);
    }
    if (byteSize === 0) {
      throw evidenceError(`File ${index + 1} is empty`, 400);
    }
    const safeName =
      typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : `upload-${index + 1}`;
    return {
      data,
      name: safeName,
      mimeType,
      kind: ALLOWED_MIME_KIND.get(mimeType),
      byteSize,
    };
  });
}

/**
 * Creates claimEvidence records for each validated file. Uploads are
 * independent -- a failure on one file does not roll back the others that
 * already succeeded, since each is its own create() call; callers get back
 * both the created records and any per-file errors.
 */
export async function createEvidenceRecords(api, { claimId, shopId, uploaderType, uploaderEmail, files }) {
  const created = [];
  const failed = [];
  for (const file of files) {
    try {
      const record = await api.claimEvidence.create({
        claim: { _link: String(claimId) },
        shop: { _link: String(shopId) },
        file: {
          copy: {
            encoding: "base64",
            data: file.data,
            name: file.name,
          },
        },
        originalFilename: file.name,
        mimeType: file.mimeType,
        byteSize: file.byteSize,
        kind: file.kind,
        uploaderType,
        uploaderEmail: uploaderEmail || undefined,
      });
      created.push({ id: record.id, originalFilename: file.name, kind: file.kind });
    } catch (error) {
      failed.push({ name: file.name, error: error?.message || "upload failed" });
    }
  }
  return { created, failed };
}
