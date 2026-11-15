import test from "node:test";
import assert from "node:assert/strict";
import * as crypto from "crypto";
import {
  CreateChannelMappingSchema,
  PlatformEnum,
  PriorityEnum,
} from "@workflow-ai/contracts";
import { SignatureVerificationService } from "./signature-verification.service";
import { ChannelRoutingService } from "./channel-routing.service";
import { ExternalIngestionService } from "./external-ingestion.service";

test("External Ingestion Domain & Invariants Audit (Phase 11)", async (t) => {
  const signatureService = new SignatureVerificationService();

  await t.test("Slack & Discord Cryptographic Signature Verification", async (t2) => {
    await t2.test("Slack HMAC-SHA256: verifies valid signature within 5-minute replay window", () => {
      const secret = "test-slack-signing-secret-key-12345";
      const now = Math.floor(Date.now() / 1000).toString();
      const body = "command=%2Fissue&text=Test+Bug&user_name=alice";
      const basestring = `v0:${now}:${body}`;
      const hmac = crypto.createHmac("sha256", secret).update(basestring, "utf8").digest("hex");
      const signature = `v0=${hmac}`;

      const isValid = signatureService.verifySlackSignature(secret, signature, now, body);
      assert.equal(isValid, true, "Expected valid Slack signature to verify successfully");
    });

    await t2.test("Slack HMAC-SHA256: rejects expired timestamp (> 300 seconds delta)", () => {
      const secret = "test-slack-signing-secret-key-12345";
      const expiredTime = (Math.floor(Date.now() / 1000) - 305).toString();
      const body = "command=%2Fissue&text=Replayed";
      const basestring = `v0:${expiredTime}:${body}`;
      const hmac = crypto.createHmac("sha256", secret).update(basestring, "utf8").digest("hex");
      const signature = `v0=${hmac}`;

      const isValid = signatureService.verifySlackSignature(secret, signature, expiredTime, body);
      assert.equal(isValid, false, "Expected expired timestamp to be rejected to prevent replay attacks");
    });

    await t2.test("Slack HMAC-SHA256: rejects forged signature or altered body", () => {
      const secret = "test-slack-signing-secret-key-12345";
      const now = Math.floor(Date.now() / 1000).toString();
      const body = "command=%2Fissue&text=Legit";
      const basestring = `v0:${now}:${body}`;
      const hmac = crypto.createHmac("sha256", secret).update(basestring, "utf8").digest("hex");
      const signature = `v0=${hmac}`;

      const altered = signatureService.verifySlackSignature(
        secret,
        signature,
        now,
        body + "&malicious=true"
      );
      assert.equal(altered, false, "Altered payload body must fail signature check");

      const wrongSecret = signatureService.verifySlackSignature(
        "wrong-secret",
        signature,
        now,
        body
      );
      assert.equal(wrongSecret, false, "Wrong signing secret must fail signature check");
    });

    await t2.test("Slack HMAC-SHA256: handles missing or non-numeric headers safely", () => {
      assert.equal(signatureService.verifySlackSignature("", "v0=abc", "123", "body"), false);
      assert.equal(signatureService.verifySlackSignature("secret", undefined, "123", "body"), false);
      assert.equal(signatureService.verifySlackSignature("secret", "v0=abc", "not-a-number", "body"), false);
    });

    await t2.test("Discord Ed25519: verifies authentic signature with SPKI wrapping", () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
      const rawPub = publicKey.export({ type: "spki", format: "der" }).slice(-32).toString("hex");

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({ type: 1 });
      const message = Buffer.from(timestamp + body);
      const signature = crypto.sign(null, message, privateKey).toString("hex");

      const isValid = signatureService.verifyDiscordSignature(rawPub, signature, timestamp, body);
      assert.equal(isValid, true, "Authentic Discord Ed25519 signature must pass");
    });

    await t2.test("Discord Ed25519: rejects forged signature and invalid key format safely", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({ type: 1 });
      const fakeSig = "deadbeef".repeat(8);

      const isForged = signatureService.verifyDiscordSignature("00".repeat(32), fakeSig, timestamp, body);
      assert.equal(isForged, false, "Forged signature must return false without crash");

      const invalidKey = signatureService.verifyDiscordSignature("short-key", fakeSig, timestamp, body);
      assert.equal(invalidKey, false, "Key not 32 bytes must return false");
    });
  });

  await t.test("Command Input Parsing & Slack Mrkdwn Sanitization", async (t2) => {
    const ingestion = new ExternalIngestionService({} as any, {} as any);

    await t2.test("extracts priority flags and separates title and description", () => {
      const parsed = ingestion.parseCommandInput(
        "Fix payment webhook race condition --p0\nWe are losing customer payments during peak load."
      );
      assert.equal(parsed.priority, "P0");
      assert.equal(parsed.title, "Fix payment webhook race condition");
      assert.equal(parsed.description, "We are losing customer payments during peak load.");
    });

    await t2.test("defaults to P2 priority when no flag is supplied", () => {
      const parsed = ingestion.parseCommandInput("Add dark mode toggle to navigation");
      assert.equal(parsed.priority, "P2");
      assert.equal(parsed.title, "Add dark mode toggle to navigation");
      assert.equal(parsed.description, "");
    });

    await t2.test("sanitizes Slack mrkdwn formatting into standard Markdown", () => {
      const raw = "Issue reported by <@U12345|vikash> in <#C9876|general>. See <https://docs.example.com|Documentation>.";
      const clean = ingestion.sanitizeSlackText(raw);

      assert.equal(
        clean,
        "Issue reported by @vikash in #general. See [Documentation](https://docs.example.com)."
      );
    });

    await t2.test("handles plain Slack user links without labels safely", () => {
      const clean = ingestion.sanitizeSlackText("Assigned to <@U12345>");
      assert.equal(clean, "Assigned to @user");
    });
  });

  await t.test("Channel Routing Multi-Tenancy & IDOR Authorization", async (t2) => {
    const mockDb: any = {
      project: {
        findUnique: async ({ where }: any) => {
          if (where.id === "proj-alpha") {
            return { id: "proj-alpha", workspaceId: "ws-auth", name: "Alpha", key: "ALP" };
          }
          if (where.id === "proj-other") {
            return { id: "proj-other", workspaceId: "ws-foreign", name: "Foreign", key: "FOR" };
          }
          return null;
        },
      },
      workflowStatus: {
        findUnique: async ({ where }: any) => {
          if (where.id === "status-auth") {
            return { id: "status-auth", workspaceId: "ws-auth", name: "Backlog" };
          }
          return null;
        },
      },
      channelMapping: {
        upsert: async ({ create }: any) => ({
          ...create,
          id: "mapping-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findUnique: async ({ where }: any) => {
          if (where.id === "map-auth") {
            return { id: "map-auth", workspaceId: "ws-auth" };
          }
          if (where.id === "map-foreign") {
            return { id: "map-foreign", workspaceId: "ws-foreign" };
          }
          return null;
        },
        delete: async ({ where }: any) => ({ id: where.id }),
      },
    };

    const routing = new ChannelRoutingService(mockDb);

    await t2.test("rejects mapping project belonging to another workspace (IDOR protection)", async () => {
      await assert.rejects(
        async () => {
          await routing.createChannelMapping("ws-auth", {
            projectId: "proj-other",
            platform: "SLACK",
            channelId: "C12345",
          });
        },
        /Project not found in this workspace/
      );
    });

    await t2.test("rejects mapping workflow status belonging to another workspace", async () => {
      await assert.rejects(
        async () => {
          await routing.createChannelMapping("ws-auth", {
            projectId: "proj-alpha",
            platform: "SLACK",
            channelId: "C12345",
            defaultStatusId: "status-foreign",
          });
        },
        /Workflow status not found in this workspace/
      );
    });

    await t2.test("successfully creates mapping for authorized project and status", async () => {
      const created = await routing.createChannelMapping("ws-auth", {
        projectId: "proj-alpha",
        platform: "SLACK",
        channelId: "C12345",
        channelName: "eng-alerts",
        defaultStatusId: "status-auth",
        defaultPriority: "P1",
      });
      assert.equal(created.workspaceId, "ws-auth");
      assert.equal(created.projectId, "proj-alpha");
      assert.equal(created.platform, "SLACK");
      assert.equal(created.defaultPriority, "P1");
    });

    await t2.test("rejects deletion of channel mapping belonging to another workspace (BOLA check)", async () => {
      await assert.rejects(
        async () => {
          await routing.deleteChannelMapping("ws-auth", "map-foreign");
        },
        /Channel mapping not found in this workspace/
      );
    });
  });

  await t.test("External Ingestion Orchestration, Deduplication & Attribution", async (t2) => {
    let transactionExecuted = false;
    let activityLogged = false;

    const mockRoutingService: any = {
      findMapping: async (platform: string, channelId: string) => {
        if (channelId === "mapped-channel") {
          return {
            id: "map-1",
            workspaceId: "ws-1",
            projectId: "proj-1",
            platform,
            channelId,
            defaultStatusId: "status-backlog",
            defaultPriority: "P2",
            project: { id: "proj-1", name: "Alpha", key: "PROJ" },
          };
        }
        return null;
      },
    };

    const mockDb: any = {
      project: {
        findUnique: async () => ({
          id: "proj-1",
          workspaceId: "ws-1",
          key: "PROJ",
          issueCounter: 41,
        }),
      },
      workflowStatus: {
        findUnique: async () => ({ id: "status-backlog", name: "Backlog" }),
        findFirst: async () => ({ id: "status-backlog", name: "Backlog" }),
      },
      user: {
        findFirst: async () => ({ id: "user-alice", name: "Alice", email: "alice@example.com" }),
      },
      workspaceMember: {
        findFirst: async () => ({
          id: "member-1",
          userId: "admin-user",
          workspaceId: "ws-1",
          user: { name: "Workspace Admin" },
        }),
      },
      $transaction: async (cb: any) => {
        transactionExecuted = true;
        const tx = {
          project: {
            update: async () => ({ issueCounter: 42 }),
          },
          issue: {
            create: async ({ data }: any) => ({
              id: "new-issue-id",
              key: "PROJ-42",
              title: data.title,
              description: data.description,
              priority: data.priority,
            }),
          },
          activityLog: {
            create: async () => {
              activityLogged = true;
              return { id: "act-1" };
            },
          },
        };
        return cb(tx);
      },
    };

    const ingestionService = new ExternalIngestionService(mockDb, mockRoutingService);

    await t2.test("returns ephemeral guidance when Slack command sent in unmapped channel", async () => {
      const response = await ingestionService.handleSlackCommand({
        command: "/issue",
        text: "Some unrouted issue",
        user_id: "U999",
        user_name: "bob",
        channel_id: "unmapped-channel",
        trigger_id: "trig-1",
      });

      assert.equal(response.response_type, "ephemeral");
      assert.match(response.text, /not linked to any Workflow AI project/);
    });

    await t2.test("creates issue atomically with attribution and activity logging on mapped channel", async () => {
      transactionExecuted = false;
      activityLogged = false;

      const response = await ingestionService.handleSlackCommand({
        command: "/issue",
        text: "Resolve database memory pressure --p1",
        user_id: "U123",
        user_name: "alice",
        channel_id: "mapped-channel",
        trigger_id: "trig-unique-101",
      });

      assert.equal(response.response_type, "in_channel");
      assert.match(response.text, /PROJ-42/);
      assert.match(response.text, /Resolve database memory pressure/);
      assert.equal(transactionExecuted, true, "Transaction must execute");
      assert.equal(activityLogged, true, "Activity log must be created");
    });

    await t2.test("idempotency deduplication: repeated payload returns cached response without second issue creation", async () => {
      transactionExecuted = false;

      const repeatedResponse = await ingestionService.handleSlackCommand({
        command: "/issue",
        text: "Resolve database memory pressure --p1",
        user_id: "U123",
        user_name: "alice",
        channel_id: "mapped-channel",
        trigger_id: "trig-unique-101", // same trigger ID
      });

      assert.equal(repeatedResponse.response_type, "in_channel");
      assert.match(repeatedResponse.text, /PROJ-42/);
      assert.equal(transactionExecuted, false, "Duplicate trigger must not execute transaction again");
    });

    await t2.test("Discord PING interaction (Type 1) responds with PONG (Type 1) handshake", async () => {
      const pingResponse = await ingestionService.handleDiscordInteraction({
        type: 1,
      });

      assert.deepEqual(pingResponse, { type: 1 });
    });
  });

  await t.test("Zod Contract Schema Boundary Validation", async (t2) => {
    await t2.test("accepts valid Slack channel mapping payload", () => {
      const valid = CreateChannelMappingSchema.safeParse({
        projectId: "11111111-1111-1111-1111-111111111111",
        platform: "SLACK",
        channelId: "C0123456789",
        channelName: "proj-discussion",
        defaultPriority: "P1",
      });
      assert.equal(valid.success, true);
    });

    await t2.test("accepts valid Discord channel mapping payload", () => {
      const valid = CreateChannelMappingSchema.safeParse({
        projectId: "22222222-2222-2222-2222-222222222222",
        platform: "DISCORD",
        channelId: "987654321098765432",
        defaultPriority: "P0",
      });
      assert.equal(valid.success, true);
    });

    await t2.test("rejects unsupported platforms and invalid UUIDs", () => {
      const invalidPlatform = CreateChannelMappingSchema.safeParse({
        projectId: "11111111-1111-1111-1111-111111111111",
        platform: "TELEGRAM",
        channelId: "123",
      });
      assert.equal(invalidPlatform.success, false);

      const invalidUuid = CreateChannelMappingSchema.safeParse({
        projectId: "not-a-valid-uuid",
        platform: "SLACK",
        channelId: "C123",
      });
      assert.equal(invalidUuid.success, false);
    });
  });
});
