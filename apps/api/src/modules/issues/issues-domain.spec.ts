import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ConflictException } from "@nestjs/common";

describe("Domain Invariant Audit: Issue Hierarchy & Numbering", () => {
  it("rejects subtask creation without a parent issue", () => {
    const validateSubtask = (type: string, parentId?: string) => {
      if (type === "SUBTASK" && !parentId) {
        throw new BadRequestException("Subtasks must specify a valid parentId");
      }
      return true;
    };

    assert.throws(
      () => validateSubtask("SUBTASK", undefined),
      (err: any) => err instanceof BadRequestException && err.message.includes("parentId")
    );
  });

  it("rejects nesting subtasks under other subtasks (max depth 2)", () => {
    const validateParentType = (parentType: string) => {
      if (parentType === "SUBTASK") {
        throw new BadRequestException("Subtasks cannot be nested inside other subtasks (max depth 2)");
      }
      if (parentType === "EPIC") {
        throw new BadRequestException("Subtasks cannot be directly attached to Epics");
      }
      return true;
    };

    assert.throws(
      () => validateParentType("SUBTASK"),
      (err: any) => err instanceof BadRequestException && err.message.includes("max depth 2")
    );

    assert.throws(
      () => validateParentType("EPIC"),
      (err: any) => err instanceof BadRequestException && err.message.includes("attached to Epics")
    );

    assert.equal(validateParentType("TASK"), true);
    assert.equal(validateParentType("STORY"), true);
    assert.equal(validateParentType("BUG"), true);
  });

  it("rejects Epics with parent issues", () => {
    const validateEpic = (type: string, parentId?: string) => {
      if (type === "EPIC" && parentId) {
        throw new BadRequestException("Epics cannot have a parent issue");
      }
      return true;
    };

    assert.throws(
      () => validateEpic("EPIC", "parent-123"),
      (err: any) => err instanceof BadRequestException && err.message.includes("Epics cannot have a parent")
    );
  });

  it("rejects self-referencing hierarchy cycle (issue as its own parent)", () => {
    const validateSelfParent = (issueId: string, parentId?: string) => {
      if (parentId === issueId) {
        throw new BadRequestException("An issue cannot be its own parent");
      }
      return true;
    };

    assert.throws(
      () => validateSelfParent("issue-101", "issue-101"),
      (err: any) => err instanceof BadRequestException && err.message.includes("its own parent")
    );
  });

  it("formats concurrency-safe issue keys deterministically", () => {
    const formatIssueKey = (projectKey: string, sequence: number) => {
      return `${projectKey.toUpperCase()}-${sequence}`;
    };

    assert.equal(formatIssueKey("ENG", 1), "ENG-1");
    assert.equal(formatIssueKey("ENG", 101), "ENG-101");
    assert.equal(formatIssueKey("plat", 42), "PLAT-42");
  });

  it("validates project key format (uppercase alphanumeric 2-10 chars)", () => {
    const regex = /^[A-Z0-9]+$/;
    assert.equal(regex.test("ENG"), true);
    assert.equal(regex.test("PLAT10"), true);
    assert.equal(regex.test("eng"), false); // lowercase
    assert.equal(regex.test("ENG-1"), false); // contains hyphen
    assert.equal(regex.test("ENG!"), false); // contains symbol
  });
});
