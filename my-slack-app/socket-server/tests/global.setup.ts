import { spawn, ChildProcess } from "child_process";
import { resolve } from "path";
import * as net from "net";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), "../.env") });

let serverProcess: ChildProcess | null = null;

const TEST_PORT = 3002;

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = net.createConnection({ port, host: "127.0.0.1" }, () => {
      client.destroy();
      resolve(true);
    });
    client.on("error", () => resolve(false));
  });
}

async function waitForPort(port: number, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `[Socket Test] Server did not start on port ${port} within ${timeoutMs / 1000}s`
  );
}

export async function setup(): Promise<void> {
  process.env.SOCKET_PORT = String(TEST_PORT);

  if (await isPortOpen(TEST_PORT)) {
    console.log(`[Socket Test] Server already running on port ${TEST_PORT}`);
    return;
  }

  console.log(`[Socket Test] Starting socket server on port ${TEST_PORT}...`);

  const serverDir = resolve(process.cwd());

  serverProcess = spawn(
    "node",
    ["--no-warnings=ExperimentalWarning", "--import", "tsx/esm", "index.ts"],
    {
      cwd: serverDir,
      env: {
        ...process.env,
        SOCKET_PORT: String(TEST_PORT),
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  serverProcess.stdout?.on("data", (data: Buffer) => {
    const text = data.toString().trim();
    if (text) process.stdout.write(`[socket] ${text}\n`);
  });

  serverProcess.stderr?.on("data", (data: Buffer) => {
    const text = data.toString().trim();
    if (text) process.stderr.write(`[socket] ${text}\n`);
  });

  serverProcess.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`[Socket Test] Server process exited with code ${code}`);
    }
  });

  await waitForPort(TEST_PORT);
  console.log("[Socket Test] Server is ready");
}

export async function teardown(): Promise<void> {
  if (serverProcess) {
    console.log("[Socket Test] Stopping server...");
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}
