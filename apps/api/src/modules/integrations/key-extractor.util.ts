/**
 * Bounded, non-backtracking issue key extractor.
 * Defends against Regular Expression Denial of Service (ReDoS).
 */
const ISSUE_KEY_REGEX = /\b([A-Za-z]{2,10})-(\d{1,7})\b/g;
const MAX_SCAN_LENGTH = 10000;

export function extractIssueKeys(text: string | null | undefined): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Bound scan length to prevent ReDoS on massive commit payloads
  const boundedText = text.slice(0, MAX_SCAN_LENGTH);
  const matches = boundedText.match(ISSUE_KEY_REGEX);

  if (!matches) {
    return [];
  }

  // Deduplicate and normalize to uppercase
  return Array.from(new Set(matches.map((k) => k.toUpperCase())));
}

/**
 * Extracts issue keys from various Git provider payload structures (GitHub & GitLab).
 */
export function extractKeysFromWebhookPayload(
  provider: "GITHUB" | "GITLAB",
  eventType: string,
  payload: any
): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const extractedKeys = new Set<string>();

  // 1. Check branch / ref names
  if (typeof payload.ref === "string") {
    extractIssueKeys(payload.ref).forEach((k) => extractedKeys.add(k));
  }

  // 2. GitHub Pull Request structures
  if (payload.pull_request) {
    if (typeof payload.pull_request.title === "string") {
      extractIssueKeys(payload.pull_request.title).forEach((k) => extractedKeys.add(k));
    }
    if (typeof payload.pull_request.body === "string") {
      extractIssueKeys(payload.pull_request.body).forEach((k) => extractedKeys.add(k));
    }
    if (payload.pull_request.head && typeof payload.pull_request.head.ref === "string") {
      extractIssueKeys(payload.pull_request.head.ref).forEach((k) => extractedKeys.add(k));
    }
  }

  // 3. GitLab Merge Request structures
  if (payload.object_attributes) {
    if (typeof payload.object_attributes.title === "string") {
      extractIssueKeys(payload.object_attributes.title).forEach((k) => extractedKeys.add(k));
    }
    if (typeof payload.object_attributes.description === "string") {
      extractIssueKeys(payload.object_attributes.description).forEach((k) => extractedKeys.add(k));
    }
    if (typeof payload.object_attributes.source_branch === "string") {
      extractIssueKeys(payload.object_attributes.source_branch).forEach((k) => extractedKeys.add(k));
    }
  }

  // 4. Commits array (push events)
  if (Array.isArray(payload.commits)) {
    for (const commit of payload.commits) {
      if (commit && typeof commit.message === "string") {
        extractIssueKeys(commit.message).forEach((k) => extractedKeys.add(k));
      }
    }
  }

  // 5. Head commit
  if (payload.head_commit && typeof payload.head_commit.message === "string") {
    extractIssueKeys(payload.head_commit.message).forEach((k) => extractedKeys.add(k));
  }

  return Array.from(extractedKeys);
}
