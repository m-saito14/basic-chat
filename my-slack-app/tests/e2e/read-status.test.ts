import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiUrl, uniqueSuffix, registerUser, login, authHeaders } from "./helpers";
import { cleanupUsers, cleanupChannels } from "./test-db";

const SUFFIX = uniqueSuffix();
const EMAIL_PREFIX = `e2e-readstatus-${SUFFIX}`;

const adminUser = {
  name: "ReadStatus Admin",
  email: `${EMAIL_PREFIX}-admin@example.com`,
  password: "password123",
};
const memberUser = {
  name: "ReadStatus Member",
  email: `${EMAIL_PREFIX}-member@example.com`,
  password: "password123",
};
const outsiderUser = {
  name: "ReadStatus Outsider",
  email: `${EMAIL_PREFIX}-outsider@example.com`,
  password: "password123",
};

let adminCookie: string;
let memberCookie: string;
let outsiderCookie: string;
let adminUserId: string;
let memberUserId: string;
let channelId: string;
const createdChannelIds: string[] = [];

beforeAll(async () => {
  const a = await registerUser(adminUser);
  const m = await registerUser(memberUser);
  await registerUser(outsiderUser);

  const aLogin = await login(adminUser.email, adminUser.password);
  const mLogin = await login(memberUser.email, memberUser.password);
  const oLogin = await login(outsiderUser.email, outsiderUser.password);
  adminCookie = aLogin.cookie;
  memberCookie = mLogin.cookie;
  outsiderCookie = oLogin.cookie;
  adminUserId = a.id;
  memberUserId = m.id;

  // チャンネル作成
  const chRes = await fetch(apiUrl("/api/channels"), {
    method: "POST",
    headers: authHeaders(adminCookie),
    body: JSON.stringify({ name: `readstatus-channel-${SUFFIX}` }),
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
});

afterAll(async () => {
  await cleanupChannels(createdChannelIds);
  await cleanupUsers(EMAIL_PREFIX);
});

// ─────────────────────────────────────────────
// GET /api/channels/[channelId]/read-status
// ─────────────────────────────────────────────
describe("GET /api/channels/[channelId]/read-status", () => {
  it("認証なし: 401 を返す", async () => {
    const res = await fetch(apiUrl(`/api/channels/${channelId}/read-status`));
    expect(res.status).toBe(401);
  });

  it("非メンバー: 403 を返す", async () => {
    const res = await fetch(
      apiUrl(`/api/channels/${channelId}/read-status`),
      { headers: authHeaders(outsiderCookie) }
    );
    expect(res.status).toBe(403);
  });

  it("正常 (ADMIN): 全メンバーの既読状態を返す", async () => {
    const res = await fetch(
      apiUrl(`/api/channels/${channelId}/read-status`),
      { headers: authHeaders(adminCookie) }
    );

    expect(res.status).toBe(200);
    const body: Record<string, string | null> = await res.json();

    // admin と member の userId がキーとして含まれる
    expect(Object.keys(body)).toContain(adminUserId);
    expect(Object.keys(body)).toContain(memberUserId);

    // 値は ISO 8601 文字列または null
    for (const value of Object.values(body)) {
      if (value !== null) {
        expect(() => new Date(value)).not.toThrow();
      }
    }
  });

  it("正常 (GUEST メンバー): 全メンバーの既読状態を返す", async () => {
    const res = await fetch(
      apiUrl(`/api/channels/${channelId}/read-status`),
      { headers: authHeaders(memberCookie) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body).toBe("object");
  });
});
