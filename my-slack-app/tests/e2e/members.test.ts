import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiUrl, uniqueSuffix, registerUser, login, authHeaders } from "./helpers";
import { cleanupUsers, cleanupChannels } from "./test-db";

const SUFFIX = uniqueSuffix();
const EMAIL_PREFIX = `e2e-members-${SUFFIX}`;

const adminUser = {
  name: "Members Admin",
  email: `${EMAIL_PREFIX}-admin@example.com`,
  password: "password123",
};
const guestUser = {
  name: "Members Guest",
  email: `${EMAIL_PREFIX}-guest@example.com`,
  password: "password123",
};
const inviteeUser = {
  name: "Members Invitee",
  email: `${EMAIL_PREFIX}-invitee@example.com`,
  password: "password123",
};

let adminCookie: string;
let guestCookie: string;
let adminUserId: string;
let guestUserId: string;
let channelId: string;
const createdChannelIds: string[] = [];

beforeAll(async () => {
  // ユーザー作成
  const a = await registerUser(adminUser);
  const g = await registerUser(guestUser);
  await registerUser(inviteeUser);

  const aLogin = await login(adminUser.email, adminUser.password);
  const gLogin = await login(guestUser.email, guestUser.password);
  adminCookie = aLogin.cookie;
  guestCookie = gLogin.cookie;
  adminUserId = a.id;
  guestUserId = g.id;

  // チャンネル作成
  const chRes = await fetch(apiUrl("/api/channels"), {
    method: "POST",
    headers: authHeaders(adminCookie),
    body: JSON.stringify({ name: `members-channel-${SUFFIX}` }),
  });
  const ch = await chRes.json();
  channelId = ch.id;
  createdChannelIds.push(channelId);

  // guestUser を GUEST として招待
  await fetch(apiUrl(`/api/channels/${channelId}/members`), {
    method: "POST",
    headers: authHeaders(adminCookie),
    body: JSON.stringify({ email: guestUser.email }),
  });
});

afterAll(async () => {
  await cleanupChannels(createdChannelIds);
  await cleanupUsers(EMAIL_PREFIX);
});

// ─────────────────────────────────────────────
// GET /api/channels/[channelId]/members
// ─────────────────────────────────────────────
describe("GET /api/channels/[channelId]/members", () => {
  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`));
    expect(res.status).toBe(401);
  });

  it("権限なし (GUEST): 403 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      headers: authHeaders(guestCookie),
    });
    expect(res.status).toBe(403);
  });

  it("正常 (ADMIN): メンバー一覧を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      headers: authHeaders(adminCookie),
    });

    expect(res.status).toBe(200);
    const body: { id: string; role: string; user: { id: string; email: string } }[] =
      await res.json();
    expect(Array.isArray(body)).toBe(true);

    const userIds = body.map((m) => m.user.id);
    expect(userIds).toContain(adminUserId);
    expect(userIds).toContain(guestUserId);

    for (const member of body) {
      expect(member.id).toBeDefined();
      expect(member.role).toBeDefined();
      expect(member.user.id).toBeDefined();
      expect(member.user.email).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────
// POST /api/channels/[channelId]/members (招待)
// ─────────────────────────────────────────────
describe("POST /api/channels/[channelId]/members", () => {
  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteeUser.email }),
    });
    expect(res.status).toBe(401);
  });

  it("権限なし (GUEST): 403 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      method: "POST",
      headers: authHeaders(guestCookie),
      body: JSON.stringify({ email: inviteeUser.email }),
    });
    expect(res.status).toBe(403);
  });

  it("存在しないユーザー: 404 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      method: "POST",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({ email: "notexist@example.com" }),
    });
    expect(res.status).toBe(404);
  });

  it("正常 (ADMIN): ユーザーを招待して GUEST ロールで返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      method: "POST",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({ email: inviteeUser.email }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.role).toBe("GUEST");
    expect(body.user.email).toBe(inviteeUser.email);
  });

  it("重複招待: 既にメンバーのユーザーを招待すると 409 を返す", async () => {
    // inviteeUser は上のテストで既にメンバー
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      method: "POST",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({ email: inviteeUser.email }),
    });
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/channels/[channelId]/members (除名)
// ─────────────────────────────────────────────
describe("DELETE /api/channels/[channelId]/members", () => {
  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: guestUserId }),
    });
    expect(res.status).toBe(401);
  });

  it("権限なし (GUEST): 403 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      method: "DELETE",
      headers: authHeaders(guestCookie),
      body: JSON.stringify({ userId: guestUserId }),
    });
    expect(res.status).toBe(403);
  });

  it("ADMIN 自身の削除: 400 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      method: "DELETE",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({ userId: adminUserId }),
    });
    expect(res.status).toBe(400);
  });

  it("正常 (ADMIN): メンバーを除名して 204 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/members`), {
      method: "DELETE",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({ userId: guestUserId }),
    });
    expect(res.status).toBe(204);

    // 除名後はメンバー一覧に含まれないことを確認
    const membersRes = await fetch(
      apiUrl(`/api/channels/${channelId}/members`),
      { headers: authHeaders(adminCookie) }
    );
    const members = await membersRes.json();
    const userIds = members.map((m: { user: { id: string } }) => m.user.id);
    expect(userIds).not.toContain(guestUserId);
  });
});
