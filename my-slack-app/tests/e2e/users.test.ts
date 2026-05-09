import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiUrl, uniqueSuffix, registerUser, login, authHeaders } from "./helpers";
import { cleanupUsers } from "./test-db";

const SUFFIX = uniqueSuffix();
const EMAIL_PREFIX = `e2e-users-${SUFFIX}`;

const userA = {
  name: "Users Test A",
  email: `${EMAIL_PREFIX}-a@example.com`,
  password: "password123",
};
const userB = {
  name: "Users Test B",
  email: `${EMAIL_PREFIX}-b@example.com`,
  password: "password123",
};

let authCookie: string;

beforeAll(async () => {
  await registerUser(userA);
  await registerUser(userB);
  const result = await login(userA.email, userA.password);
  authCookie = result.cookie;
});

afterAll(async () => {
  await cleanupUsers(EMAIL_PREFIX);
});

// ─────────────────────────────────────────────
// GET /api/users
// ─────────────────────────────────────────────
describe("GET /api/users", () => {
  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl("/api/users"));
    expect(res.status).toBe(401);
  });

  it("正常: 自分以外のユーザー一覧を返す", async () => {
    const res = await fetch(apiUrl("/api/users"), {
      headers: authHeaders(authCookie),
    });

    expect(res.status).toBe(200);
    const body: { id: string; name: string; email: string }[] = await res.json();

    // 自分 (userA) は含まれない
    const emails = body.map((u) => u.email);
    expect(emails).not.toContain(userA.email);

    // 他のユーザー (userB) は含まれる
    expect(emails).toContain(userB.email);

    // 各要素の形式チェック
    for (const user of body) {
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.email).toBeDefined();
    }
  });
});
