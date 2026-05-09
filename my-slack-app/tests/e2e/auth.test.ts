import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiUrl, uniqueSuffix, registerUser } from "./helpers";
import { cleanupUsers } from "./test-db";

const SUFFIX = uniqueSuffix();
const EMAIL_PREFIX = `e2e-auth-${SUFFIX}`;

// このファイルで使うテストユーザー
const testUser = {
  name: "Auth Test User",
  email: `${EMAIL_PREFIX}@example.com`,
  password: "password123",
};

// ファイル全体で作成したテストデータを afterAll でまとめて削除
afterAll(async () => {
  await cleanupUsers(EMAIL_PREFIX);
});

// ─────────────────────────────────────────────
// POST /api/register
// ─────────────────────────────────────────────
describe("POST /api/register", () => {
  it("バリデーション: name が未指定の場合 400 を返す", async () => {
    const res = await fetch(apiUrl("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `${EMAIL_PREFIX}-no-name@example.com`,
        password: "pass",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("バリデーション: email が未指定の場合 400 を返す", async () => {
    const res = await fetch(apiUrl("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", password: "pass" }),
    });
    expect(res.status).toBe(400);
  });

  it("バリデーション: password が未指定の場合 400 を返す", async () => {
    const res = await fetch(apiUrl("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        email: `${EMAIL_PREFIX}-no-pass@example.com`,
      }),
    });
    expect(res.status).toBe(400);
  });

  it("正常: 新規ユーザーを登録できる", async () => {
    const res = await fetch(apiUrl("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe(testUser.name);
    expect(body.email).toBe(testUser.email);
    expect(body.createdAt).toBeDefined();
    // パスワードはレスポンスに含まれない
    expect(body.password).toBeUndefined();
  });

  it("メール重複: 同一メールで再登録すると 500 を返す", async () => {
    // 上のテストで testUser はすでに登録済み
    const res = await fetch(apiUrl("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────
// POST /api/login
// ─────────────────────────────────────────────
describe("POST /api/login", () => {
  // login テスト用ユーザーを事前登録
  const loginUser = {
    name: "Login Test User",
    email: `${EMAIL_PREFIX}-login@example.com`,
    password: "password456",
  };

  beforeAll(async () => {
    await registerUser(loginUser);
  });

  it("バリデーション: email が未指定の場合 400 を返す", async () => {
    const res = await fetch(apiUrl("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "pass" }),
    });
    expect(res.status).toBe(400);
  });

  it("バリデーション: password が未指定の場合 400 を返す", async () => {
    const res = await fetch(apiUrl("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginUser.email }),
    });
    expect(res.status).toBe(400);
  });

  it("認証: 存在しないメールアドレスの場合 401 を返す", async () => {
    const res = await fetch(apiUrl("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "notexist@example.com",
        password: "pass",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("認証: パスワードが間違っている場合 401 を返す", async () => {
    const res = await fetch(apiUrl("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginUser.email, password: "wrongpass" }),
    });
    expect(res.status).toBe(401);
  });

  it("正常: ログインに成功してユーザー情報と HttpOnly Cookie を返す", async () => {
    const res = await fetch(apiUrl("/api/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginUser.email, password: loginUser.password }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe(loginUser.name);
    expect(body.email).toBe(loginUser.email);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("token=");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });
});

// ─────────────────────────────────────────────
// POST /api/logout
// ─────────────────────────────────────────────
describe("POST /api/logout", () => {
  it("正常: ログアウトに成功して Cookie をクリアする", async () => {
    const res = await fetch(apiUrl("/api/logout"), { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("ok");

    const setCookie = res.headers.get("set-cookie") ?? "";
    // Cookie が無効化されていること (Max-Age=0 または空の token)
    expect(setCookie).toMatch(/token=;|Max-Age=0/i);
  });
});
