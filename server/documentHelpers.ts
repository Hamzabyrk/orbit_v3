export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function safeDocumentName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "belge";
}

export function decodeDocumentBase64(fileBase64: string) {
  const bytes = Buffer.from(fileBase64, "base64");
  if (!bytes.byteLength || bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("Belge boyutu en fazla 10 MB olabilir.");
  }
  return bytes;
}
