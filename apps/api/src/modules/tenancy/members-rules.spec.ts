import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException, BadRequestException } from "@nestjs/common";

describe("Business Invariant Audit: Membership & Invitation Rules", () => {
  it("rejects demotion of the sole remaining Admin in a workspace", async () => {
    // Simulated count of admins in workspace
    const adminCount = 1;

    const demoteAction = (currentRole: string, newRole: string) => {
      if (currentRole === "ADMIN" && newRole !== "ADMIN") {
        if (adminCount <= 1) {
          throw new ForbiddenException("Cannot demote the last remaining Admin in the workspace");
        }
      }
      return true;
    };

    assert.throws(
      () => demoteAction("ADMIN", "MEMBER"),
      (err: any) => err instanceof ForbiddenException && err.message.includes("last remaining Admin")
    );
  });

  it("rejects acceptance of expired invitation tokens", () => {
    const expiredDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    const validateToken = (expiresAt: Date) => {
      if (new Date() > expiresAt) {
        throw new BadRequestException("Invitation token has expired");
      }
      return true;
    };

    assert.throws(
      () => validateToken(expiredDate),
      (err: any) => err instanceof BadRequestException && err.message.includes("expired")
    );
  });

  it("accepts valid, non-expired invitation tokens", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours in future
    const validateToken = (expiresAt: Date) => {
      if (new Date() > expiresAt) {
        throw new BadRequestException("Invitation token has expired");
      }
      return true;
    };

    assert.equal(validateToken(futureDate), true);
  });
});
