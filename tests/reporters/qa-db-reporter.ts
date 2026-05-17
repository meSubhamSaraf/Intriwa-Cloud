/**
 * Playwright reporter — posts test run results to /api/qa/test-runs after every run.
 * Requires QA_REPORTER_KEY and DEFAULT_GARAGE_ID in .env.test.local.
 * If those aren't set it silently skips (never throws).
 */
import type {
  Reporter, FullConfig, Suite, TestCase, TestResult, FullResult,
} from "@playwright/test/reporter";
import https from "https";
import http  from "http";
import dotenv from "dotenv";
import path   from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test.local") });

interface RunResult {
  total:    number;
  passed:   number;
  failed:   number;
  skipped:  number;
  duration: number;
  results:  Record<string, string>;
}

class QADbReporter implements Reporter {
  private startTime = 0;
  private data: RunResult = { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0, results: {} };

  onBegin(_config: FullConfig, _suite: Suite) {
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.data.total++;
    const status = result.status; // "passed" | "failed" | "skipped" | "timedOut" | "interrupted"
    if (status === "passed")  this.data.passed++;
    else if (status === "skipped" || status === "interrupted") this.data.skipped++;
    else this.data.failed++;

    // Key by test title (suite › title)
    const key = test.titlePath().slice(1).join(" › ");
    this.data.results[key] = status === "passed" ? "passed" : status === "skipped" ? "skipped" : "failed";
  }

  async onEnd(result: FullResult) {
    this.data.duration = Date.now() - this.startTime;

    const apiKey   = process.env.QA_REPORTER_KEY;
    const garageId = process.env.DEFAULT_GARAGE_ID;
    const baseUrl  = process.env.TEST_BASE_URL ?? "http://localhost:3000";

    if (!apiKey || !garageId) return; // not configured — skip silently

    const body = JSON.stringify(this.data);
    const url  = new URL(`/api/qa/test-runs?apikey=${encodeURIComponent(apiKey)}&garageId=${encodeURIComponent(garageId)}`, baseUrl);

    await new Promise<void>((resolve) => {
      const mod     = url.protocol === "https:" ? https : http;
      const options = {
        hostname: url.hostname,
        port:     url.port || (url.protocol === "https:" ? 443 : 80),
        path:     url.pathname + url.search,
        method:   "POST",
        headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      };
      const req = mod.request(options, res => {
        res.resume();
        res.on("end", resolve);
      });
      req.on("error", () => resolve()); // never throw
      req.write(body);
      req.end();
    });

    const icon = result.status === "passed" ? "✓" : "✗";
    console.log(`\n[QA Portal] ${icon} Run saved — ${this.data.passed}/${this.data.total} passed`);
  }
}

export default QADbReporter;
