import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiUrl, uniqueSuffix, registerUser, login, authHeaders } from "./helpers";
import { cleanupUsers, cleanupChannels, getTestDb } from "./test-db";

const SUFFIX = uniqueSuffix();
const EMAIL_PREFIX = `e2e-messages-${SUFFIX}`;

const adminUser = {
  name: "Messages Admin",
  email: `${EMAIL_PREFIX}-admin@example.com`,
  password: "password123",
};
const memberUser = {
  name: "Messages Member",
  email: `${EMAIL_PREFIX}-member@example.com`,
  password: "password123",
};
const outsiderUser = {
  name: "Messages Outsider",
  email: `${EMAIL_PREFIX}-outsider@example.com`,
  password: "password123",
};

let adminCookie: string;
let outsiderCookie: string;
let adminUserId: string;
let channelId: string;
const createdChannelIds: string[] = [];

beforeAll(async () => {
  const a = await registerUser(adminUser);
  await registerUser(memberUser);
  await registerUser(outsiderUser);

  const aLogin = await login(adminUser.email, adminUser.password);
  const oLogin = await login(outsiderUser.email, outsiderUser.password);
  adminCookie = aLogin.cookie;
  outsiderCookie = oLogin.cookie;
  adminUserId = a.id;

  // チャンネル作成
  const chRes = await fetch(apiUrl("/api/channels"), {
    method: "POST",
    headers: authHeaders(adminCookie),
    body: JSON.stringify({ name: `messages-channel-${SUFFIX}` }),
  });
  const ch = await chRes.json();
  channelId = ch.id;
  createdChannelIds.push(channelId);

  // memberUser を招待
  await fetch(apiUrl(`/api/channels/${channelId}/members`), {
    method: "POST",
    headers: authHeaders(adminCookie),
    body: JSON.stringify({ email: memberUser.email }),
  });

  // テスト用メッセージを DB に直接作成 (Socket.IO なしで)
  const db = getTestDb();
  await db.message.createMany({
    data: [
      { content: "Hello E2E test 1", userId: adminUserId, channelId },
      { content: "Hello E2E test 2", userId: adminUserId, channelId },
    ],
  });
});

afterAll(async () => {
  await cleanupChannels(createdChannelIds);
  await cleanupUsers(EMAIL_PREFIX);
});

// ─────────────────────────────────────────────
// GET /api/messages
// ─────────────────────────────────────────────
describe("GET /api/messages", () => {
  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl(`/api/messages?channelId=${channelId}`));
    expect(res.status).toBe(401);
  });

  it("channelId が未指定: 400 を返す", async () => {
    const res = await fetch(apiUrl("/api/messages"), {
      headers: authHeaders(adminCookie),
    });
    expect(res.status).toBe(400);
  });

  it("非メンバー: 403 を返す", async () => {
    const res = await fetch(apiUrl(`/api/messages?channelId=${channelId}`), {
      headers: authHeaders(outsiderCookie),
    });
    expect(res.status).toBe(403);
  });

  it("正常 (メンバー): チャンネルのメッセージ一覧を返す", async () => {
    const res = await fetch(apiUrl(`/api/messages?channelId=${channelId}`), {
      headers: authHeaders(adminCookie),
    });

    expect(res.status).toBe(200);
    const body: {
      id: string;
      content: string;
      userId: string;
      channelId: string;
      deleted: boolean;
      createdAt: string;
      user: { id: string; name: string };
    }[] = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2);

    // 古い順に並んでいること
    const timestamps = body.map((m) => new Date(m.createdAt).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }

    // メッセージの形式チェック
    for (const msg of body) {
      expect(msg.id).toBeDefined();
      expect(msg.content).toBeDefined();
      expect(msg.userId).toBeDefined();
      expect(msg.channelId).toBe(channelId);
      expect(typeof msg.deleted).toBe("boolean");
      expect(msg.user.id).toBeDefined();
      expect(msg.user.name).toBeDefined();
    }

    // 作成したメッセージが含まれること
    const contents = body.map((m) => m.content);
    expect(contents).toContain("Hello E2E test 1");
    expect(contents).toContain("Hello E2E test 2");
  });
});
