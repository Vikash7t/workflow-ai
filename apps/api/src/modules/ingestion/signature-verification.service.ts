import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";

@Injectable()
export class SignatureVerificationService {
  private readonly logger = new Logger(SignatureVerificationService.name);

  /**
   * Verifies Slack request signature using v0 HMAC-SHA256 scheme.
   * Includes 5-minute replay attack window check and constant-time equality.
   */
  verifySlackSignature(
    signingSecret: string,
    signature: string | undefined,
    timestamp: string | undefined,
    rawBody: string
  ): boolean {
    if (!signingSecret || !signature || !timestamp || !rawBody) {
      return false;
    }

    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) {
      return false;
    }

    // Replay attack mitigation: reject requests older/newer than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 300) {
      this.logger.warn(`Slack request rejected: timestamp delta ${Math.abs(now - ts)}s exceeds 300s window.`);
      return false;
    }

    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const hmac = crypto.createHmac("sha256", signingSecret);
    const mySignature = "v0=" + hmac.update(sigBasestring, "utf8").digest("hex");

    const sigBuf = Buffer.from(signature);
    const mySigBuf = Buffer.from(mySignature);

    if (sigBuf.length !== mySigBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, mySigBuf);
  }

  /**
   * Verifies Discord interaction Ed25519 signature.
   */
  verifyDiscordSignature(
    publicKeyHex: string,
    signatureHex: string | undefined,
    timestamp: string | undefined,
    rawBody: string
  ): boolean {
    if (!publicKeyHex || !signatureHex || !timestamp || rawBody === undefined) {
      return false;
    }

    try {
      const message = Buffer.from(timestamp + rawBody);
      const signature = Buffer.from(signatureHex, "hex");

      // Construct SPKI DER prefix for raw Ed25519 public key (32 bytes)
      const pubKeyBytes = Buffer.from(publicKeyHex, "hex");
      if (pubKeyBytes.length !== 32) {
        return false;
      }

      // Ed25519 SPKI DER prefix: 302a300506032b6570032100 + 32-byte key
      const spkiHeader = Buffer.from("302a300506032b6570032100", "hex");
      const fullSpki = Buffer.concat([spkiHeader, pubKeyBytes]);

      const keyObject = crypto.createPublicKey({
        key: fullSpki,
        format: "der",
        type: "spki",
      });

      return crypto.verify(null, message, keyObject, signature);
    } catch (err: any) {
      this.logger.warn(`Discord signature verification error: ${err.message}`);
      return false;
    }
  }
}
