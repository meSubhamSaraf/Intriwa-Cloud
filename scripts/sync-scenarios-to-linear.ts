#!/usr/bin/env tsx
/**
 * sync-scenarios-to-linear.ts
 *
 * Reads a markdown file of raw test scenarios and creates Linear issues for each.
 *
 * Usage:
 *   LINEAR_API_KEY=lin_api_xxx LINEAR_TEAM_ID=TEAM-ID tsx scripts/sync-scenarios-to-linear.ts scenarios.md
 *
 * Scenario file format (scenarios.md):
 *   # Feature Name
 *
 *   - Add mechanic with percent pay structure and verify in list
 *   - Cannot add mechanic without phone number
 *   - Monthly salary mechanic shows salary in detail page
 *
 *   # Analytics
 *
 *   - Analytics P&L loads for current month
 *   - Package performance section shows when packages exist
 *
 * Each bullet → one Linear issue under the parent feature heading as a label/group.
 * Already-filed issues (matched by title) are skipped — safe to re-run.
 */

import fs from "fs";
import path from "path";

const LINEAR_API = "https://api.linear.app/graphql";
const API_KEY = process.env.LINEAR_API_KEY ?? "";
const TEAM_ID = process.env.LINEAR_TEAM_ID ?? "";
const PROJECT_ID = process.env.LINEAR_PROJECT_ID;

if (!API_KEY || !TEAM_ID) {
  console.error("Set LINEAR_API_KEY and LINEAR_TEAM_ID environment variables.");
  process.exit(1);
}

const scenarioFile = process.argv[2];
if (!scenarioFile) {
  console.error("Usage: tsx scripts/sync-scenarios-to-linear.ts <scenarios.md>");
  process.exit(1);
}

const filePath = path.resolve(scenarioFile);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// ── Linear helpers ────────────────────────────────────────────────

async function gql(query: string, variables: Record<string, unknown>) {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: API_KEY },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function getExistingIssues(): Promise<Set<string>> {
  const data = await gql(
    `query Issues($teamId: String!) {
      team(id: $teamId) {
        issues(first: 250) { nodes { title } }
      }
    }`,
    { teamId: TEAM_ID },
  );
  const titles: string[] = data.team?.issues?.nodes?.map((i: { title: string }) => i.title) ?? [];
  return new Set(titles);
}

async function createIssue(title: string, description: string, labelId?: string) {
  const data = await gql(
    `mutation Create($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { identifier url }
      }
    }`,
    {
      input: {
        title,
        description,
        teamId: TEAM_ID,
        priority: 3, // medium
        ...(PROJECT_ID ? { projectId: PROJECT_ID } : {}),
        ...(labelId ? { labelIds: [labelId] } : {}),
      },
    },
  );
  return data.issueCreate?.issue;
}

async function getLabelId(name: string): Promise<string | null> {
  const data = await gql(
    `query Labels($teamId: String!) {
      team(id: $teamId) { labels { nodes { id name } } }
    }`,
    { teamId: TEAM_ID },
  );
  const labels: { id: string; name: string }[] = data.team?.labels?.nodes ?? [];
  const existing = labels.find((l) => l.name.toLowerCase() === name.toLowerCase());
  return existing?.id ?? null;
}

// ── Parse scenarios file ──────────────────────────────────────────

interface ParsedScenario {
  feature: string;
  scenario: string;
}

function parseScenarios(content: string): ParsedScenario[] {
  const lines = content.split("\n");
  const results: ParsedScenario[] = [];
  let currentFeature = "General";

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      currentFeature = heading[1].trim();
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      results.push({ feature: currentFeature, scenario: bullet[1].trim() });
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  const content = fs.readFileSync(filePath, "utf8");
  const scenarios = parseScenarios(content);

  if (scenarios.length === 0) {
    console.log("No scenarios found in file. Use '- scenario description' bullet format.");
    return;
  }

  console.log(`Found ${scenarios.length} scenarios across ${new Set(scenarios.map((s) => s.feature)).size} features.`);
  console.log("Fetching existing issues to avoid duplicates…");

  const existing = await getExistingIssues();
  const testLabelId = await getLabelId("test").catch(() => null);

  let created = 0;
  let skipped = 0;

  for (const { feature, scenario } of scenarios) {
    const title = `[Test Scenario] ${scenario}`;
    if (existing.has(title)) {
      console.log(`  SKIP (exists): ${scenario}`);
      skipped++;
      continue;
    }

    const description = [
      `**Feature:** ${feature}`,
      "",
      "## Scenario",
      scenario,
      "",
      "## Acceptance Criteria",
      "- [ ] Test case written in Playwright",
      "- [ ] Test passes in CI",
      "- [ ] Edge cases covered",
      "",
      "*Created by sync-scenarios-to-linear.ts*",
    ].join("\n");

    const issue = await createIssue(title, description, testLabelId ?? undefined);
    console.log(`  CREATED: ${issue?.identifier} — ${scenario}`);
    console.log(`           ${issue?.url}`);
    created++;

    // Rate limit: Linear allows ~50 req/min
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
