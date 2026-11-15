import * as crypto from "node:crypto";

/**
 * Constant-time HMAC-SHA256 verification for GitHub webhook signatures (x-hub-signature-256).
 * Mitigates timing side-channel attacks (OWASP A08).
 */
export function verifyGitHubSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!rawBody || !signatureHeader || !secret) {
    return false;
  }

  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) {
    return false;
  }

  const providedHashHex = signatureHeader.slice(expectedPrefix.length).trim();
  const calculatedHashHex = crypto
    .createHmac("sha256", secret)
    .update(typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody)
    .digest("hex");

  const providedBuffer = Buffer.from(providedHashHex, "hex");
  const calculatedBuffer = Buffer.from(calculatedHashHex, "hex");

  if (providedBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, calculatedBuffer);
}

/**
 * Constant-time token verification for GitLab webhook tokens (x-gitlab-token).
 */
export function verifyGitLabToken(
  tokenHeader: string | undefined,
  secret: string
): boolean {
  if (!tokenHeader || !secret) {
    return false;
  }

  const providedBuffer = Buffer.from(tokenHeader, "utf8");
  const secretBuffer = Buffer.from(secret, "utf8");

  if (providedBuffer.length !== secretBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, secretBuffer);
}

/**
 * Generates a cryptographically strong Webhook secret.
 */
export function generateIntegrationSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Masks a webhook secret for secure display in API responses.
 */
export function maskSecret(secret: string): string {
  if (!secret) return "whsec_****";
  const suffix = secret.slice(-4);
  return `whsec_****${suffix}`;
}
