import test from "node:test";
import assert from "node:assert/strict";
import {
  DuplicateDetectionRequestSchema,
  SemanticSearchQuerySchema,
} from "@workflow-ai/contracts";
import {
  EmbeddingService,
  computeContentHash,
  cosineSimilarity,
} from "./embedding.service";
import { SemanticSearchService } from "./semantic-search.service";

test("Semantic Search & Duplicate Detection Domain Audit (Phase 9)", async (t) => {
  const embeddingService = new EmbeddingService();

  await t.test("Embedding Service & Mathematical Invariants", async (t2) => {
    await t2.test("computes deterministic SHA-256 content hash normalized for whitespace and case", () => {
      const hash1 = computeContentHash("Fix Login Bug", "Occurs on Firefox");
      const hash2 = computeContentHash("  fix login bug  ", "occurs on firefox\n");
      const hash3 = computeContentHash("Different title", "Occurs on Firefox");

      assert.equal(hash1, hash2);
      assert.notEqual(hash1, hash3);
      assert.equal(typeof hash1, "string");
      assert.equal(hash1.length, 64);
    });

    await t2.test("generates unit-normalized 768-dimensional vectors", () => {
      const vector = embeddingService.generateDeterministicVector("Postgres database connection timeout");
      assert.equal(vector.length, 768);

      let sumSq = 0;
      for (const val of vector) {
        sumSq += val * val;
      }
      assert.ok(Math.abs(sumSq - 1.0) < 1e-4, "Vector must be unit normalized");
    });

    await t2.test("evaluates high cosine similarity for semantically close phrases", () => {
      const v1 = embeddingService.generateDeterministicVector("Postgres database connection pool timeout");
      const v2 = embeddingService.generateDeterministicVector("Postgres DB connection pool timeout failure");
      const v3 = embeddingService.generateDeterministicVector("Update navbar logo and branding colors");

      const sim12 = cosineSimilarity(v1, v2);
      const sim13 = cosineSimilarity(v1, v3);

      assert.ok(sim12 >= 0.70, `Expected near-duplicate similarity >= 0.70, got ${sim12}`);
      assert.ok(sim13 < 0.60, `Expected unrelated similarity < 0.60, got ${sim13}`);
    });

    await t2.test("guards against division by zero on degenerate vectors", () => {
      const zeroVec = new Array(768).fill(0);
      const normalVec = embeddingService.generateDeterministicVector("normal query");

      const sim = cosineSimilarity(zeroVec, normalVec);
      assert.equal(sim, 0);
      assert.equal(embeddingService.isValidVector(zeroVec), false);
    });

    await t2.test("truncates excessive inputs to 1500 chars (OWASP LLM04)", () => {
      const hugeString = "a".repeat(10000);
      const truncated = embeddingService.sanitizeAndTruncate(hugeString);
      assert.equal(truncated.length, 1500);
    });
  });

  await t.test("Zod Contract & Payload Validation", async (t2) => {
    await t2.test("rejects search query under 2 characters", () => {
      const result = SemanticSearchQuerySchema.safeParse({
        query: "a",
        projectId: "11111111-1111-4111-8111-111111111111",
      });
      assert.equal(result.success, false);
    });

    await t2.test("rejects search query over 500 characters", () => {
      const result = SemanticSearchQuerySchema.safeParse({
        query: "a".repeat(501),
        projectId: "11111111-1111-4111-8111-111111111111",
      });
      assert.equal(result.success, false);
    });

    await t2.test("rejects duplicate check with invalid project UUID", () => {
      const result = DuplicateDetectionRequestSchema.safeParse({
        title: "Test title for ticket",
        projectId: "not-a-valid-uuid",
      });
      assert.equal(result.success, false);
    });

    await t2.test("accepts valid duplicate detection payload", () => {
      const result = DuplicateDetectionRequestSchema.safeParse({
        title: "Database connection pool exhausted",
        description: "Occurs under 200 concurrent users",
        projectId: "11111111-1111-4111-8111-111111111111",
        excludeIssueId: "22222222-2222-4222-8222-222222222222",
      });
      assert.equal(result.success, true);
    });
  });

  await t.test("Multi-Tenant Scoping & Security Rules (OWASP LLM06 / BOLA)", async (t2) => {
    const mockDb = {
      project: {
        findUnique: async ({ where }: any) => {
          if (where.id === "proj-alpha") {
            return { id: "proj-alpha", workspaceId: "ws-authorized" };
          }
          if (where.id === "proj-foreign") {
            return { id: "proj-foreign", workspaceId: "ws-other-tenant" };
          }
          return null;
        },
      },
      issueEmbedding: {
        findMany: async ({ where }: any) => {
          // Assert that query strictly filters by workspaceId and projectId in database
          assert.equal(where.workspaceId, "ws-authorized");
          assert.equal(where.projectId, "proj-alpha");

          return [
            {
              id: "emb-1",
              issueId: "issue-1",
              workspaceId: "ws-authorized",
              projectId: "proj-alpha",
              vectorData: embeddingService.generateDeterministicVector("Postgres database pool timeout error"),
              issue: {
                id: "issue-1",
                key: "ENG-101",
                title: "Postgres database pool timeout error",
                priority: "P0",
                status: { id: "s-1", name: "In Progress", category: "STARTED", color: "#3B82F6" },
              },
            },
          ];
        },
      },
    };

    const searchService = new SemanticSearchService(mockDb as any, embeddingService);

    await t2.test("rejects duplicate check when projectId does not belong to authorized workspace (IDOR)", async () => {
      await assert.rejects(
        async () => {
          await searchService.detectDuplicates("ws-authorized", {
            projectId: "proj-foreign",
            title: "Security test title",
          });
        },
        { name: "NotFoundException", message: "Project not found in this workspace" }
      );
    });

    await t2.test("rejects semantic search when projectId does not belong to authorized workspace (IDOR)", async () => {
      await assert.rejects(
        async () => {
          await searchService.searchSemantic("ws-authorized", {
            projectId: "proj-foreign",
            query: "Security test query",
            threshold: 0.6,
            limit: 10,
            includeCompleted: false,
          });
        },
        { name: "NotFoundException", message: "Project not found in this workspace" }
      );
    });

    await t2.test("detects HIGH confidence duplicate in authorized project", async () => {
      const result = await searchService.detectDuplicates("ws-authorized", {
        projectId: "proj-alpha",
        title: "Postgres database pool timeout error",
      });

      assert.equal(result.hasDuplicates, true);
      assert.equal(result.highestConfidence, "HIGH");
      assert.equal(result.matches.length, 1);
      assert.equal(result.matches[0].key, "ENG-101");
      assert.ok(result.matches[0].similarity >= 0.85);
    });

    await t2.test("returns no duplicates for ultra-short or single-word inputs", async () => {
      const result = await searchService.detectDuplicates("ws-authorized", {
        projectId: "proj-alpha",
        title: "Bug",
      });

      assert.equal(result.hasDuplicates, false);
      assert.equal(result.highestConfidence, "NONE");
      assert.equal(result.matches.length, 0);
    });

    await t2.test("excludes specified issueId from candidate matches (self-exclusion)", async () => {
      const mockDbWithExclusion = {
        project: {
          findUnique: async () => ({ id: "proj-alpha", workspaceId: "ws-authorized" }),
        },
        issueEmbedding: {
          findMany: async ({ where }: any) => {
            assert.deepEqual(where.issueId, { not: "issue-1" });
            return [];
          },
        },
      };

      const customService = new SemanticSearchService(mockDbWithExclusion as any, embeddingService);
      const result = await customService.detectDuplicates("ws-authorized", {
        projectId: "proj-alpha",
        title: "Postgres database pool timeout error",
        excludeIssueId: "issue-1",
      });

      assert.equal(result.hasDuplicates, false);
      assert.equal(result.matches.length, 0);
    });
  });

  await t.test("Content-Hash Change Detection & Optimistic Skipping", async (t2) => {
    let upsertCalled = false;
    const initialHash = computeContentHash("Original Title", "Original Description");

    const mockDbForUpsert = {
      issueEmbedding: {
        findUnique: async () => ({ id: "emb-1", contentHash: initialHash }),
        upsert: async () => {
          upsertCalled = true;
          return {};
        },
      },
    };

    const upsertService = new SemanticSearchService(mockDbForUpsert as any, embeddingService);

    // Call with identical content
    await upsertService.upsertIssueEmbedding(
      "issue-1",
      "ws-1",
      "proj-1",
      "Original Title",
      "Original Description"
    );

    assert.equal(upsertCalled, false, "Must skip embedding generation if contentHash matches");

    // Call with modified content
    await upsertService.upsertIssueEmbedding(
      "issue-1",
      "ws-1",
      "proj-1",
      "Updated Title Changed",
      "Original Description"
    );

    assert.equal(upsertCalled, true, "Must generate and upsert embedding when content changed");
  });
});
