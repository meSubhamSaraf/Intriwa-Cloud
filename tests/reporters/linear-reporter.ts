/**
 * Playwright reporter: posts test failures as Linear issues.
 *
 * Setup:
 *   1. Set LINEAR_API_KEY and LINEAR_TEAM_ID in .env.test.local
 *   2. Optionally set LINEAR_PROJECT_ID to file issues under a specific project
 *   3. Add to playwright.config.ts:
 *        reporter: [["html"], ["./tests/reporters/linear-reporter.ts"]]
 *
 * Each failed test → one Linear issue with:
 *   - Title:  [E2E Failure] <test title>
 *   - Body:   file + error message + stack trace excerpt
 *   - Label:  "bug" (if your team has that label)
 *   - Priority: 2 (high)
 */

import type {
  Reporter,
  TestCase,
  TestResult,
  FullConfig,
  Suite,
} from "@playwright/test/reporter";

const LINEAR_API = "https://api.linear.app/graphql";

interface LinearIssueInput {
  title: string;
  description: string;
  teamId: string;
  projectId?: string;
  priority: number;
  labelIds?: string[];
}

async function createLinearIssue(input: LinearIssueInput, apiKey: string) {
  const mutation = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url title }
      }
    }
  `;
  const variables = {
    input: {
      title: input.title,
      description: input.description,
      teamId: input.teamId,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      priority: input.priority,
      ...(input.labelIds?.length ? { labelIds: input.labelIds } : {}),
    },
  };

  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!res.ok) throw new Error(`Linear API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Linear GraphQL error: ${JSON.stringify(json.errors)}`);
  return json.data?.issueCreate?.issue;
}

async function getBugLabelId(teamId: string, apiKey: string): Promise<string | null> {
  const query = `
    query Labels($teamId: String!) {
      team(id: $teamId) {
        labels { nodes { id name } }
      }
    }
  `;
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query, variables: { teamId } }),
  });
  const json = await res.json().catch(() => ({}));
  const labels: { id: string; name: string }[] = json.data?.team?.labels?.nodes ?? [];
  return labels.find((l) => /^bug$/i.test(l.name))?.id ?? null;
}

class LinearReporter implements Reporter {
  private apiKey: string;
  private teamId: string;
  private projectId: string | undefined;
  private bugLabelId: string | null = null;
  private failures: { test: TestCase; result: TestResult }[] = [];

  constructor() {
    this.apiKey = process.env.LINEAR_API_KEY ?? "";
    this.teamId = process.env.LINEAR_TEAM_ID ?? "";
    this.projectId = process.env.LINEAR_PROJECT_ID;
  }

  onBegin(_config: FullConfig, _suite: Suite) {
    if (!this.apiKey || !this.teamId) {
      console.log("[LinearReporter] LINEAR_API_KEY or LINEAR_TEAM_ID not set — issues will not be filed.");
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === "failed" || result.status === "timedOut") {
      this.failures.push({ test, result });
    }
  }

  async onEnd() {
    if (!this.apiKey || !this.teamId || this.failures.length === 0) return;

    // Fetch bug label once
    try {
      this.bugLabelId = await getBugLabelId(this.teamId, this.apiKey);
    } catch {
      // non-fatal
    }

    for (const { test, result } of this.failures) {
      try {
        const error = result.errors[0];
        const stackExcerpt = (error?.stack ?? "").split("\n").slice(0, 12).join("\n");
        const filePath = test.location.file.replace(process.cwd() + "/", "");

        const description = [
          `**File:** \`${filePath}\``,
          `**Line:** ${test.location.line}`,
          `**Status:** ${result.status}`,
          `**Duration:** ${(result.duration / 1000).toFixed(1)}s`,
          "",
          "## Error",
          "```",
          (error?.message ?? "No error message").slice(0, 800),
          "```",
          "",
          "## Stack",
          "```",
          stackExcerpt,
          "```",
          "",
          `*Filed automatically by Playwright linear-reporter*`,
        ].join("\n");

        const issue = await createLinearIssue(
          {
            title: `[E2E Failure] ${test.titlePath().slice(1).join(" › ")}`,
            description,
            teamId: this.teamId,
            projectId: this.projectId,
            priority: 2, // high
            ...(this.bugLabelId ? { labelIds: [this.bugLabelId] } : {}),
          },
          this.apiKey,
        );

        console.log(`[LinearReporter] Filed: ${issue?.url ?? "unknown"}`);
      } catch (err) {
        console.error(`[LinearReporter] Failed to create issue for "${test.title}":`, err);
      }
    }
  }
}

export default LinearReporter;
