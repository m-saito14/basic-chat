import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiUrl, uniqueSuffix, registerUser, login, authHeaders } from "./helpers";
import { cleanupUsers } from "./test-db";

const SUFFIX = uniqueSuffix();
const EMAIL_PREFIX = `e2e-me-${SUFFIX}`;

const testUser = {
  name: "Me Test User",
  email: `${EMAIL_PREFIX}@example.com`,
  password: "password123",
};

let authCookie: string;

beforeAll(async () => {
  await registerUser(testUser);
  const result = await login(testUser.email, testUser.password);
  authCookie = result.cookie;
});

afterAll(async () => {
  await cleanupUsers(EMAIL_PREFIX);
});

// ─────────────────────────────────────────────
// GET /api/me
// ─────────────────────────────────────────────
describe("GET /api/me", () => {
  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl("/api/me"));
    expect(res.status).toBe(401);
  });

  it("正常: セッション情報と Socket.IO 用トークンを返す", async () => {
    const res = await fetch(apiUrl("/api/me"), {
      headers: authHeaders(authCookie),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBeDefined();
    expect(body.name).toBe(testUser.name);
    expect(body.email).toBe(testUser.email);
    // Socket.IO 用の JWT トークンが含まれること
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe("string");
  });
});
