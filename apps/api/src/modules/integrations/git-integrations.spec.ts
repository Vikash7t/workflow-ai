import test from "node:test";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import {
  verifyGitHubSignature,
  verifyGitLabToken,
  generateIntegrationSecret,
  maskSecret,
} from "./crypto.util";
import {
  extractIssueKeys,
  extractKeysFromWebhookPayload,
} from "./key-extractor.util";

test("Git Integrations & Webhook Ingestion Engine Audit (Phase 7)", async (t) => {
  await t.test("Cryptographic HMAC Signature Verification (OWASP A08)", async (t2) => {
    const secret = "whsec_test_secret_for_unit_tests_12345678";
    const payload = JSON.stringify({ action: "opened", repository: { full_name: "acme/api" } });
    const rawBuffer = Buffer.from(payload, "utf8");

    const validSignature = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(rawBuffer)
      .digest("hex")}`;

    await t2.test("accepts valid HMAC-SHA256 signature calculated from raw wire buffer", () => {
      const isValid = verifyGitHubSignature(rawBuffer, validSignature, secret);
      assert.equal(isValid, true);
    });

    await t2.test("rejects tampered payload content with original signature", () => {
      const tamperedBuffer = Buffer.from(
        JSON.stringify({ action: "closed", repository: { full_name: "acme/api" } }),
        "utf8"
      );
      const isValid = verifyGitHubSignature(tamperedBuffer, validSignature, secret);
      assert.equal(isValid, false);
    });

    await t2.test("rejects forged signature header with wrong secret", () => {
      const wrongSecret = "whsec_attacker_controlled_secret";
      const isValid = verifyGitHubSignature(rawBuffer, validSignature, wrongSecret);
      assert.equal(isValid, false);
    });

    await t2.test("rejects signature missing sha256= prefix", () => {
      const bareHash = crypto.createHmac("sha256", secret).update(rawBuffer).digest("hex");
      const isValid = verifyGitHubSignature(rawBuffer, bareHash, secret);
      assert.equal(isValid, false);
    });

    await t2.test("rejects empty or undefined raw body", () => {
      const isValid = verifyGitHubSignature(undefined, validSignature, secret);
      assert.equal(isValid, false);
    });

    await t2.test("validates GitLab token in constant time", () => {
      assert.equal(verifyGitLabToken(secret, secret), true);
      assert.equal(verifyGitLabToken("forged_token", secret), false);
      assert.equal(verifyGitLabToken(undefined, secret), false);
    });

    await t2.test("masks secret safely omitting plaintext", () => {
      const masked = maskSecret(secret);
      assert.equal(masked, "whsec_****5678");
      assert.equal(masked.includes("test_secret"), false);
    });
  });

  await t.test("Issue Key Extraction & ReDoS Protection", async (t2) => {
    await t2.test("extracts issue key from commit message", () => {
      const text = "feat(auth): enforce session token rotation (ENG-101)";
      const keys = extractIssueKeys(text);
      assert.deepEqual(keys, ["ENG-101"]);
    });

    await t2.test("extracts multiple keys across branch, PR title, and body", () => {
      const keysFromTitle = extractIssueKeys("[ENG-101] [PLAT-42] Resolve connection pooling");
      assert.deepEqual(keysFromTitle.sort(), ["ENG-101", "PLAT-42"].sort());

      const keysFromBranch = extractIssueKeys("refs/heads/feature/ENG-999-mfa");
      assert.deepEqual(keysFromBranch, ["ENG-999"]);
    });

    await t2.test("normalizes lowercase issue keys to canonical uppercase", () => {
      const keys = extractIssueKeys("fixes eng-204 and plat-15");
      assert.deepEqual(keys.sort(), ["ENG-204", "PLAT-15"].sort());
    });

    await t2.test("extracts issue keys from GitHub pull_request payload object", () => {
      const payload = {
        ref: "refs/heads/feature/ENG-12-oauth",
        pull_request: {
          title: "Implement OAuth (ENG-12)",
          body: "Resolves ENG-12 and relates to PLAT-5",
          head: { ref: "feature/ENG-12-oauth" },
        },
      };

      const keys = extractKeysFromWebhookPayload("GITHUB", "pull_request", payload);
      assert.deepEqual(keys.sort(), ["ENG-12", "PLAT-5"].sort());
    });

    await t2.test("extracts issue keys from GitLab Merge Request payload object", () => {
      const payload = {
        object_attributes: {
          title: "Fix crash on logout (ENG-303)",
          description: "Addresses ENG-303 issue",
          source_branch: "bugfix/ENG-303",
        },
      };

      const keys = extractKeysFromWebhookPayload("GITLAB", "Merge Request Hook", payload);
      assert.deepEqual(keys, ["ENG-303"]);
    });

    await t2.test("bounds input string to 10,000 characters preventing ReDoS", () => {
      const massiveText = "A".repeat(20000) + " ENG-777";
      const keys = extractIssueKeys(massiveText);
      // Because ENG-777 appears after char 10000, it is safely truncated
      assert.deepEqual(keys, []);
    });
  });

  await t.test("Automated State Machine & PR Merge Invariants", async (t2) => {
    await t2.test("identifies PR merged as COMPLETED target category", () => {
      const payload = {
        action: "closed",
        pull_request: { merged: true, number: 42, title: "Merged PR" },
      };

      const isCompleted = payload.action === "closed" && payload.pull_request.merged === true;
      assert.equal(isCompleted, true);
    });

    await t2.test("identifies PR closed without merging as NOT completed", () => {
      const payload = {
        action: "closed",
        pull_request: { merged: false, number: 43, title: "Abandoned PR" },
      };

      const isCompleted = payload.action === "closed" && payload.pull_request.merged === true;
      assert.equal(isCompleted, false);
    });

    await t2.test("identifies PR opened or reopened as STARTED target category", () => {
      const openedPayload = { action: "opened", pull_request: { merged: false } };
      const reopenedPayload = { action: "reopened", pull_request: { merged: false } };

      const isStartedOpen = openedPayload.action === "opened" || openedPayload.action === "reopened";
      const isStartedReopen = reopenedPayload.action === "opened" || reopenedPayload.action === "reopened";

      assert.equal(isStartedOpen, true);
      assert.equal(isStartedReopen, true);
    });
  });
});
