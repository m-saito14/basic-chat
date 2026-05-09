import { spawn, ChildProcess } from "child_process";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

let serverProcess: ChildProcess | null = null;

const TEST_PORT = 3001;
const TEST_BASE_URL = `http://localhost:${TEST_PORT}`;

/**
 * Next.js サーバーが起動済みかチェックする
 * /api/login に POST して応答があればサーバー起動済みと判断
 */
async function isServerRunning(url: string): Promise<boolean> {
  try {
    await fetch(`${url}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * サーバーが ready になるまでポーリングする (最大 timeoutMs ミリ秒)
 */
async function waitForServer(
  url: string,
  timeoutMs = 120_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerRunning(url)) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `[E2E] Test server did not start within ${timeoutMs / 1000}s`
  );
}

export async function setup(): Promise<void> {
  process.env.TEST_BASE_URL = TEST_BASE_URL;

  // 既にサーバーが起動済みであればスキップ
  if (await isServerRunning(TEST_BASE_URL)) {
    console.log(`[E2E] Server already running at ${TEST_BASE_URL}`);
    return;
  }

  console.log(`[E2E] Starting Next.js dev server on port ${TEST_PORT}...`);

  serverProcess = spawn("npx", ["next", "dev", "--port", String(TEST_PORT)], {
    cwd: resolve(process.cwd()),
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.on("data", (data: Buffer) => {
    const text = data.toString().trim();
    if (text) process.stdout.write(`[next] ${text}\n`);
  });

  serverProcess.stderr?.on("data", (data: Buffer) => {
    const text = data.toString().trim();
    if (text) process.stderr.write(`[next] ${text}\n`);
  });

  serverProcess.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`[E2E] Server process exited with code ${code}`);
    }
  });

  await waitForServer(TEST_BASE_URL);
  console.log("[E2E] Server is ready");
}

export async function teardown(): Promise<void> {
  if (serverProcess) {
    console.log("[E2E] Stopping test server...");
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}
