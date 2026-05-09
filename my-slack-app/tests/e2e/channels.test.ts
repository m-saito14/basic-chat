import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiUrl, uniqueSuffix, registerUser, login, authHeaders } from "./helpers";
import { cleanupUsers, cleanupChannels } from "./test-db";

const SUFFIX = uniqueSuffix();
const EMAIL_PREFIX = `e2e-channels-${SUFFIX}`;

const adminUser = {
  name: "Channel Admin",
  email: `${EMAIL_PREFIX}-admin@example.com`,
  password: "password123",
};
const guestUser = {
  name: "Channel Guest",
  email: `${EMAIL_PREFIX}-guest@example.com`,
  password: "password123",
};

let adminCookie: string;
let guestCookie: string;
const createdChannelIds: string[] = [];

beforeAll(async () => {
  await registerUser(adminUser);
  await registerUser(guestUser);
  const a = await login(adminUser.email, adminUser.password);
  const g = await login(guestUser.email, guestUser.password);
  adminCookie = a.cookie;
  guestCookie = g.cookie;
});

afterAll(async () => {
  await cleanupChannels(createdChannelIds);
  await cleanupUsers(EMAIL_PREFIX);
});

// ─────────────────────────────────────────────
// GET /api/channels
// ─────────────────────────────────────────────
describe("GET /api/channels", () => {
  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl("/api/channels"));
    expect(res.status).toBe(401);
  });

  it("正常: 所属チャンネル一覧を返す", async () => {
    const res = await fetch(apiUrl("/api/channels"), {
      headers: authHeaders(adminCookie),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// POST /api/channels
// ─────────────────────────────────────────────
describe("POST /api/channels", () => {
  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl("/api/channels"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "unauthorized-channel" }),
    });
    expect(res.status).toBe(401);
  });

  it("正常: チャンネルを作成して ADMIN ロールで返す", async () => {
    const res = await fetch(apiUrl("/api/channels"), {
      method: "POST",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({ name: `test-channel-${SUFFIX}` }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe(`test-channel-${SUFFIX}`);
    expect(body.myRole).toBe("ADMIN");

    createdChannelIds.push(body.id);
  });

  it("正常: 作成したチャンネルが GET /api/channels に含まれる", async () => {
    // 新しいチャンネルを作成
    const createRes = await fetch(apiUrl("/api/channels"), {
      method: "POST",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({ name: `test-channel-list-${SUFFIX}` }),
    });
    const created = await createRes.json();
    createdChannelIds.push(created.id);

    // 一覧に含まれているか確認
    const listRes = await fetch(apiUrl("/api/channels"), {
      headers: authHeaders(adminCookie),
    });
    const channels = await listRes.json();
    const ids = channels.map((c: { id: string }) => c.id);
    expect(ids).toContain(created.id);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/channels/[channelId]
// ─────────────────────────────────────────────
describe("DELETE /api/channels/[channelId]", () => {
  let channelIdToDelete: string;

  beforeAll(async () => {
    // 削除テスト用のチャンネルを作成
    const res = await fetch(apiUrl("/api/channels"), {
      method: "POST",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({ name: `delete-target-${SUFFIX}` }),
    });
    const body = await res.json();
    channelIdToDelete = body.id;
    // afterAll でも削除を試みるが、DELETE テストで先に削除される可能性がある
    createdChannelIds.push(channelIdToDelete);

    // guestUser をそのチャンネルに招待しておく (GUEST ロール検証用)
    await fetch(apiUrl(`/api/channels/${channelIdToDelete}/members`), {
      method: "POST",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({ email: guestUser.email }),
    });
  });

  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelIdToDelete}`), {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("権限なし (GUEST): 403 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelIdToDelete}`), {
      method: "DELETE",
      headers: authHeaders(guestCookie),
    });
    expect(res.status).toBe(403);
  });

  it("正常 (ADMIN): チャンネルを削除して 204 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelIdToDelete}`), {
      method: "DELETE",
      headers: authHeaders(adminCookie),
    });
    expect(res.status).toBe(204);

    // 削除後は一覧に含まれないことを確認
    const listRes = await fetch(apiUrl("/api/channels"), {
      headers: authHeaders(adminCookie),
    });
    const channels = await listRes.json();
    const ids = channels.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(channelIdToDelete);
  });
});
